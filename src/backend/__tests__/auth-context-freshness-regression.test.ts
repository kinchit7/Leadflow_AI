import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateContextFreshness, type AuthContext } from '../auth.web';
import { queryWithPredicates } from '../wix-data-query.web';

vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('../wix-data-query.web', () => ({
  queryWithPredicates: vi.fn(),
}));

vi.mock('../audit-service.web', () => ({
  logAuthorizationFailure: vi.fn(),
  logCrossTenantAccessAttempt: vi.fn(),
  logBranchAuthorizationFailure: vi.fn(),
  logMultipleMembershipDetected: vi.fn(),
  logProtectedFieldOverrideAttempt: vi.fn(),
}));

describe('Auth context freshness regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeContext = (businessId: string): AuthContext => ({
    memberId: 'member-1',
    businessId,
    branchId: 'branch-1',
    role: 'admin',
    _validatedAt: new Date(),
  });

  const mockFreshMembership = (businessId: string) => {
    vi.mocked(queryWithPredicates).mockResolvedValue({
      items: [{
        _id: 'membership-1',
        memberId: 'member-1',
        businessId,
        branchId: 'branch-1',
        role: 'admin',
        status: 'active',
      }],
      totalCount: 1,
      hasNext: false,
      currentPage: 0,
      pageSize: 2,
      nextSkip: null,
    } as any);
  };

  it('rejects a stale context when the member is reassigned to another business', async () => {
    mockFreshMembership('business-B');

    await expect(validateContextFreshness(makeContext('business-A'))).resolves.toBe(false);
  });

  it('accepts an unchanged business context when membership, role, and branch remain valid', async () => {
    mockFreshMembership('business-A');

    await expect(validateContextFreshness(makeContext('business-A'))).resolves.toBe(true);
  });
});
