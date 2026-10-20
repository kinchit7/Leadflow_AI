/**
 * WORKSTREAM 1: Wix Data Query Service
 *
 * Security contract:
 * - Every predicate is applied by the Wix Data query builder before find().
 * - Never fetch an unrestricted collection and filter authorization rows in memory.
 * - Validate every page's structure and pagination metadata.
 * - Reject any incomplete, inconsistent, or malformed scan.
 */

import { items } from '@wix/data';
import { PaginationOptions, PaginatedResult, WixDataItem } from '@/integrations/cms';

export interface QueryPredicate {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith';
  value: unknown;
}

const MAX_PAGES = 200;
const PAGE_SIZE = 100;

function applyPredicate(query: any, predicate: QueryPredicate): any {
  if (!predicate || typeof predicate.field !== 'string' || predicate.field.trim() === '') {
    throw new Error('queryWithPredicates: Predicate field must be a non-empty string');
  }

  const methodByOperator: Record<QueryPredicate['operator'], string> = {
    eq: 'eq',
    ne: 'ne',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte',
    contains: 'contains',
    startsWith: 'startsWith',
  };
  const method = methodByOperator[predicate.operator];
  if (!method || typeof query[method] !== 'function') {
    throw new Error('queryWithPredicates: Unsupported Wix Data query operator "' + predicate.operator + '"');
  }
  if (predicate.value === undefined) {
    throw new Error('queryWithPredicates: Undefined predicate value for "' + predicate.field + '"');
  }
  return query[method](predicate.field, predicate.value);
}

function validatePage(
  result: any,
  collectionId: string,
  expectedTotalCount: number | undefined,
  pageNumber: number
): { items: WixDataItem[]; totalCount: number; hasNext: boolean } {
  if (!result || typeof result !== 'object') {
    throw new Error('queryWithPredicates: Malformed result on page ' + pageNumber + ' for ' + collectionId);
  }
  if (!Array.isArray(result.items)) {
    throw new Error('queryWithPredicates: Malformed items on page ' + pageNumber + ' for ' + collectionId);
  }
  if (
    typeof result.totalCount !== 'number' ||
    !Number.isFinite(result.totalCount) ||
    !Number.isInteger(result.totalCount) ||
    result.totalCount < 0
  ) {
    throw new Error('queryWithPredicates: Invalid totalCount on page ' + pageNumber + ' for ' + collectionId);
  }
  if (expectedTotalCount !== undefined && result.totalCount !== expectedTotalCount) {
    throw new Error('queryWithPredicates: totalCount changed during scan of ' + collectionId);
  }
  if (typeof result.hasNext !== 'function') {
    throw new Error('queryWithPredicates: Missing hasNext() function on page ' + pageNumber + ' for ' + collectionId);
  }

  let hasNext: unknown;
  try {
    hasNext = result.hasNext();
  } catch {
    throw new Error('queryWithPredicates: hasNext() failed on page ' + pageNumber + ' for ' + collectionId);
  }
  if (typeof hasNext !== 'boolean') {
    throw new Error('queryWithPredicates: Invalid hasNext() value on page ' + pageNumber + ' for ' + collectionId);
  }
  if (result.items.length > PAGE_SIZE) {
    throw new Error('queryWithPredicates: Oversized page ' + pageNumber + ' for ' + collectionId);
  }
  return { items: result.items as WixDataItem[], totalCount: result.totalCount, hasNext };
}

/**
 * Execute a database-filtered query and verify the entire matching result set.
 * options.limit and options.skip control the returned slice only; all matching
 * records are scanned so callers can detect ambiguous authorization state.
 */
export async function queryWithPredicates<T extends WixDataItem>(
  collectionId: string,
  predicates: QueryPredicate[],
  options?: PaginationOptions
): Promise<PaginatedResult<T>> {
  if (typeof collectionId !== 'string' || collectionId.trim() === '') {
    throw new Error('queryWithPredicates: collectionId must be a non-empty string');
  }
  if (!Array.isArray(predicates)) {
    throw new Error('queryWithPredicates: predicates must be an array');
  }

  const resultLimit = options?.limit ?? 2;
  const requestedSkip = options?.skip ?? 0;
  if (!Number.isInteger(resultLimit) || resultLimit < 1 || resultLimit > 1000) {
    throw new Error('queryWithPredicates: limit must be an integer between 1 and 1000');
  }
  if (!Number.isInteger(requestedSkip) || requestedSkip < 0) {
    throw new Error('queryWithPredicates: skip must be a non-negative integer');
  }

  const allMatches: T[] = [];
  const seenIds = new Set<string>();
  let currentSkip = 0;
  let expectedTotalCount: number | undefined;
  let hasMore = true;
  let pagesScanned = 0;

  while (hasMore) {
    if (pagesScanned >= MAX_PAGES) {
      throw new Error('queryWithPredicates: Scan exceeded ' + MAX_PAGES + ' pages for ' + collectionId + '; refusing incomplete results');
    }
    pagesScanned++;

    let query: any = items.query(collectionId);
    for (const predicate of predicates) query = applyPredicate(query, predicate);

    // Predicates are part of the Wix Data query, not client-side post-filtering.
    const rawResult = await query.skip(currentSkip).limit(PAGE_SIZE).find({ returnTotalCount: true });
    const page = validatePage(rawResult, collectionId, expectedTotalCount, pagesScanned);
    if (expectedTotalCount === undefined) expectedTotalCount = page.totalCount;

    for (const item of page.items) {
      if (!item || typeof item !== 'object') {
        throw new Error('queryWithPredicates: Invalid record on page ' + pagesScanned + ' for ' + collectionId);
      }
      const id = (item as any)._id;
      if (typeof id === 'string' && id.length > 0) {
        if (seenIds.has(id)) {
          throw new Error('queryWithPredicates: Duplicate record id across pages for ' + collectionId);
        }
        seenIds.add(id);
      }
      allMatches.push(item as T);
    }

    const nextOffset = currentSkip + page.items.length;
    if (page.hasNext && (page.items.length === 0 || nextOffset >= page.totalCount)) {
      throw new Error('queryWithPredicates: Inconsistent pagination metadata on page ' + pagesScanned + ' for ' + collectionId);
    }
    if (!page.hasNext && nextOffset < page.totalCount) {
      throw new Error('queryWithPredicates: Incomplete pagination on page ' + pagesScanned + ' for ' + collectionId);
    }

    hasMore = page.hasNext;
    currentSkip = nextOffset;
  }

  if (expectedTotalCount === undefined) {
    throw new Error('queryWithPredicates: No query result was obtained for ' + collectionId);
  }
  if (allMatches.length !== expectedTotalCount) {
    throw new Error('queryWithPredicates: Scanned ' + allMatches.length + ' records but Wix reported ' + expectedTotalCount + ' for ' + collectionId);
  }

  const itemsForPage = allMatches.slice(requestedSkip, requestedSkip + resultLimit);
  const hasNext = requestedSkip + itemsForPage.length < allMatches.length;

  return {
    items: itemsForPage as T[],
    totalCount: allMatches.length,
    hasNext,
    currentPage: Math.floor(requestedSkip / resultLimit),
    pageSize: resultLimit,
    nextSkip: hasNext ? requestedSkip + resultLimit : null,
  };
}
