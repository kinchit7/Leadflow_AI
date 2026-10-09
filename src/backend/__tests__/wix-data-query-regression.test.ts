import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryWithPredicates } from '../wix-data-query.web';

const { mockQuery, mockFind } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockFind: vi.fn(),
}));

vi.mock('@wix/data', () => ({
  items: { query: mockQuery },
}));

type QueryArgs = {
  collectionId: string;
  predicates: Array<{ field: string; operator: string; value: unknown }>;
  skip: number;
  limit: number;
  options: unknown;
};

let records: any[] = [];

function matches(record: any, predicate: QueryArgs['predicates'][number]): boolean {
  const value = record?.[predicate.field];
  switch (predicate.operator) {
    case 'eq': return value === predicate.value;
    case 'ne': return value !== predicate.value;
    case 'gt': return value > predicate.value;
    case 'gte': return value >= predicate.value;
    case 'lt': return value < predicate.value;
    case 'lte': return value <= predicate.value;
    case 'contains': return String(value ?? '').includes(String(predicate.value));
    case 'startsWith': return String(value ?? '').startsWith(String(predicate.value));
    default: return false;
  }
}

describe('queryWithPredicates: database query adapter contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    records = [];
    mockQuery.mockImplementation((collectionId: string) => {
      const predicates: QueryArgs['predicates'] = [];
      let skip = 0;
      let limit = 50;
      const builder: any = {};
      for (const operator of ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith']) {
        builder[operator] = (field: string, value: unknown) => {
          predicates.push({ field, operator, value });
          return builder;
        };
      }
      builder.skip = (value: number) => { skip = value; return builder; };
      builder.limit = (value: number) => { limit = value; return builder; };
      builder.find = (options: unknown) => mockFind({ collectionId, predicates: [...predicates], skip, limit, options } satisfies QueryArgs);
      return builder;
    });
    mockFind.mockImplementation(async ({ predicates, skip, limit }: QueryArgs) => {
      const filtered = records.filter(record => predicates.every(predicate => matches(record, predicate)));
      const page = filtered.slice(skip, skip + limit);
      return {
        items: page,
        totalCount: filtered.length,
        hasNext: () => skip + page.length < filtered.length,
      };
    });
  });

  it('applies equality predicates to the Wix Data query before returning results', async () => {
    records = [
      { _id: 'm1', memberId: 'other', status: 'active' },
      { _id: 'm2', memberId: 'target', status: 'pending' },
      { _id: 'm3', memberId: 'target', status: 'active', businessId: 'b1' },
    ];

    const result = await queryWithPredicates('BusinessMembers', [
      { field: 'memberId', operator: 'eq', value: 'target' },
      { field: 'status', operator: 'eq', value: 'active' },
    ], { limit: 2 });

    expect(mockQuery).toHaveBeenCalledWith('BusinessMembers');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
      predicates: [
        { field: 'memberId', operator: 'eq', value: 'target' },
        { field: 'status', operator: 'eq', value: 'active' },
      ],
      skip: 0,
      limit: 100,
      options: { returnTotalCount: true },
    }));
    expect(result.items).toEqual([{ _id: 'm3', memberId: 'target', status: 'active', businessId: 'b1' }]);
    expect(result.totalCount).toBe(1);
  });

  it('scans all matching pages and detects multiple memberships beyond page one', async () => {
    records = Array.from({ length: 101 }, (_, i) => ({
      _id: 'm' + i,
      memberId: 'target',
      status: 'active',
      businessId: 'b' + i,
    }));

    const result = await queryWithPredicates('BusinessMembers', [
      { field: 'memberId', operator: 'eq', value: 'target' },
      { field: 'status', operator: 'eq', value: 'active' },
    ], { limit: 2 });

    expect(mockFind).toHaveBeenCalledTimes(2);
    expect(result.totalCount).toBe(101);
    expect(result.items).toHaveLength(2);
    expect(result.hasNext).toBe(true);
  });

  it('rejects a non-numeric totalCount even when there are no matches', async () => {
    mockFind.mockResolvedValueOnce({ items: [], totalCount: '0', hasNext: () => false });
    await expect(queryWithPredicates('BusinessMembers', [])).rejects.toThrow(/Invalid totalCount/);
  });

  it('rejects null items even when there are no matches', async () => {
    mockFind.mockResolvedValueOnce({ items: null, totalCount: 0, hasNext: () => false });
    await expect(queryWithPredicates('BusinessMembers', [])).rejects.toThrow(/Malformed items/);
  });

  it('rejects a non-boolean hasNext result even when there are no matches', async () => {
    mockFind.mockResolvedValueOnce({ items: [], totalCount: 0, hasNext: () => 'false' });
    await expect(queryWithPredicates('BusinessMembers', [])).rejects.toThrow(/Invalid hasNext/);
  });

  it('rejects missing hasNext function', async () => {
    mockFind.mockResolvedValueOnce({ items: [], totalCount: 0, hasNext: false });
    await expect(queryWithPredicates('BusinessMembers', [])).rejects.toThrow(/Missing hasNext/);
  });

  it('rejects incomplete pagination instead of returning partial matches', async () => {
    mockFind.mockResolvedValueOnce({ items: [], totalCount: 1, hasNext: () => false });
    await expect(queryWithPredicates('BusinessMembers', [])).rejects.toThrow(/Incomplete pagination/);
  });

  it('rejects a database failure on a later page', async () => {
    records = Array.from({ length: 101 }, (_, i) => ({ _id: 'm' + i, memberId: 'target' }));
    mockFind.mockImplementationOnce(async ({ predicates, skip, limit }: QueryArgs) => {
      const filtered = records.filter(record => predicates.every(predicate => matches(record, predicate)));
      const page = filtered.slice(skip, skip + limit);
      return { items: page, totalCount: filtered.length, hasNext: () => true };
    }).mockRejectedValueOnce(new Error('simulated second-page failure'));

    await expect(queryWithPredicates('BusinessMembers', [
      { field: 'memberId', operator: 'eq', value: 'target' },
    ])).rejects.toThrow(/simulated second-page failure/);
  });

  it('rejects duplicate record IDs returned across pages', async () => {
    records = Array.from({ length: 100 }, (_, i) => ({ _id: 'm' + i, memberId: 'target' }));
    records.push({ _id: 'm0', memberId: 'target' });

    await expect(queryWithPredicates('BusinessMembers', [
      { field: 'memberId', operator: 'eq', value: 'target' },
    ])).rejects.toThrow(/Duplicate record id/);
  });
});
