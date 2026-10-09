/**
 * Context Integrity Tests - PHASE 3F-C
 * Tests for multiple-membership race condition prevention and context validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveAuthContext,
  validateContextFreshness,
  AuthContext,
} from '../auth.web';
import { BaseCrudService } from '@/integrations/cms';
import { BusinessMembers } from '@/entities';

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Test-only adapter: production query semantics are covered by wix-data-query-regression.test.ts.
vi.mock('../wix-data-query.web', () => ({
  queryWithPredicates: vi.fn(async (collectionId: string, predicates: any[], options: any = {}) => {
    const result = await BaseCrudService.getAll(collectionId, [], options);
    if (!result || !Array.isArray(result.items)) {
      throw new Error('Malformed test fixture returned by BaseCrudService.getAll');
    }
    const matches = result.items.filter((item: any) => predicates.every((p: any) => {
      const actual = item?.[p.field];
      switch (p.operator) {
        case 'eq': return actual === p.value;
        case 'ne': return actual !== p.value;
        case 'gt': return actual > p.value;
        case 'gte': return actual >= p.value;
        case 'lt': return actual < p.value;
        case 'lte': return actual <= p.value;
        case 'contains': return String(actual ?? '').includes(String(p.value));
        case 'startsWith': return String(actual ?? '').startsWith(String(p.value));
        default: throw new Error('Unsupported test predicate: ' + p.operator);
      }
    }));
    const skip = options.skip ?? 0;
    const limit = options.limit ?? 2;
    const page = matches.slice(skip, skip + limit);
    return {
      items: page,
      totalCount: matches.length,
      hasNext: skip + page.length < matches.length,
      currentPage: Math.floor(skip / limit),
      pageSize: limit,
      nextSkip: skip + page.length < matches.length ? skip + limit : null,
    };
  }),
}));


// Mock audit service
vi.mock('../audit-service.web', () => ({
  logMultipleMembershipDetected: vi.fn(),
  logAuthorizationFailure: vi.fn(),
  logCrossTenantAccessAttempt: vi.fn(),
  logBranchAuthorizationFailure: vi.fn(),
  logProtectedFieldOverrideAttempt: vi.fn(),
}));

describe('Context Integrity - PHASE 3F-C', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workstream C: Multiple-Membership Race Condition', () => {
    describe('Concurrent Business Switching', () => {
      it('should detect simultaneous membership activation', async () => {
        const memberId = 'member-123';

        // Simulate two active memberships (race condition)
        const memberships: BusinessMembers[] = [
          {
            _id: 'membership-1',
            memberId,
            businessId: 'business-1',
            branchId: 'branch-1',
            role: 'manager',
            status: 'active',
          },
          {
            _id: 'membership-2',
            memberId,
            businessId: 'business-2',
            branchId: 'branch-2',
            role: 'sales',
            status: 'active',
          },
        ];

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: memberships,
          totalCount: 2,
          hasNext: false,
          currentPage: 0,
          pageSize: 2,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        // Should fail closed
        expect(context).toBeNull();
      });

      it('should log multiple membership detection', async () => {
        const memberId = 'member-123';
        const { logMultipleMembershipDetected } = await import('../audit-service.web');

        const memberships: BusinessMembers[] = [
          {
            _id: 'membership-1',
            memberId,
            businessId: 'business-1',
            status: 'active',
          },
          {
            _id: 'membership-2',
            memberId,
            businessId: 'business-2',
            status: 'active',
          },
        ];

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: memberships,
          totalCount: 2,
          hasNext: false,
          currentPage: 0,
          pageSize: 2,
          nextSkip: null,
        });

        await resolveAuthContext(memberId);

        expect(logMultipleMembershipDetected).toHaveBeenCalledWith(memberId, 2);
      });
    });

    describe('Stale Context Detection', () => {
      it('should detect stale context after 5 minutes', async () => {
        const memberId = 'member-123';
        const staleContext: AuthContext & { _validatedAt?: Date } = {
          memberId,
          businessId: 'business-1',
          branchId: 'branch-1',
          role: 'manager',
          _validatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes old
        };

        const isValid = await validateContextFreshness(staleContext);
        expect(isValid).toBe(false);
      });

      it('should accept fresh context within 5 minutes', async () => {
        const memberId = 'member-123';
        const freshContext: AuthContext & { _validatedAt?: Date } = {
          memberId,
          businessId: 'business-1',
          branchId: 'branch-1',
          role: 'manager',
          _validatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes old
        };

        // Mock fresh resolution
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              branchId: 'branch-1',
              role: 'manager',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isValid = await validateContextFreshness(freshContext);
        expect(isValid).toBe(true);
      });

      it('should detect membership revocation', async () => {
        const memberId = 'member-123';
        const context: AuthContext & { _validatedAt?: Date } = {
          memberId,
          businessId: 'business-1',
          branchId: 'branch-1',
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock membership revoked (no active memberships)
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'revoked', // Changed from active
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isValid = await validateContextFreshness(context);
        expect(isValid).toBe(false);
      });

      it('should detect role changes', async () => {
        const memberId = 'member-123';
        const context: AuthContext & { _validatedAt?: Date } = {
          memberId,
          businessId: 'business-1',
          branchId: 'branch-1',
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock role changed
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              branchId: 'branch-1',
              role: 'sales', // Changed from manager
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isValid = await validateContextFreshness(context);
        expect(isValid).toBe(false);
      });

      it('should detect branch reassignments', async () => {
        const memberId = 'member-123';
        const context: AuthContext & { _validatedAt?: Date } = {
          memberId,
          businessId: 'business-1',
          branchId: 'branch-1',
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock branch changed
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              branchId: 'branch-2', // Changed from branch-1
              role: 'manager',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isValid = await validateContextFreshness(context);
        expect(isValid).toBe(false);
      });
    });

    describe('Context Validation Timestamp', () => {
      it('should add validation timestamp to resolved context', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        expect(context).not.toBeNull();
        expect((context as any)?._validatedAt).toBeDefined();
        expect((context as any)?._validatedAt).toBeInstanceOf(Date);
      });

      it('should reject context without validation timestamp', async () => {
        const memberId = 'member-123';
        const contextWithoutTimestamp: AuthContext = {
          memberId,
          businessId: 'business-1',
        };

        const isValid = await validateContextFreshness(contextWithoutTimestamp);
        expect(isValid).toBe(false);
      });
    });

    describe('Re-validation on Every Request', () => {
      it('should re-validate context on every request (never cache)', async () => {
        const memberId = 'member-123';

        // First request
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context1 = await resolveAuthContext(memberId);
        expect(context1).not.toBeNull();

        // Second request (should re-query, not use cache)
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'revoked', // Status changed
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context2 = await resolveAuthContext(memberId);
        expect(context2).toBeNull(); // Should detect revocation

        // Verify getAll was called twice
        expect(BaseCrudService.getAll).toHaveBeenCalledTimes(2);
      });

      it('should support skipCache parameter for forced refresh', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        // Force refresh
        const context = await resolveAuthContext(memberId, true);
        expect(context).not.toBeNull();
        expect(BaseCrudService.getAll).toHaveBeenCalled();
      });
    });

    describe('Membership Status Changes', () => {
      it('should handle pending membership', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'pending', // Not active
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);
        expect(context).toBeNull();
      });

      it('should handle suspended membership', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'suspended', // Not active
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);
        expect(context).toBeNull();
      });

      it('should handle revoked membership', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-1',
              status: 'revoked', // Not active
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);
        expect(context).toBeNull();
      });
    });

    describe('Boundary Tests', () => {
      it('should handle exactly 100 memberships (at limit)', async () => {
        const memberId = 'member-123';
        const memberships = Array.from({ length: 100 }, (_, i) => ({
          _id: `membership-${i}`,
          memberId,
          businessId: `business-${i}`,
          status: i === 0 ? 'active' : 'inactive',
        }));

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: memberships,
          totalCount: 100,
          hasNext: false,
          currentPage: 0,
          pageSize: 100,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);
        expect(context).not.toBeNull();
      });

      it('should handle >100 memberships (over limit)', async () => {
        const memberId = 'member-123';
        const memberships = Array.from({ length: 101 }, (_, i) => ({
          _id: `membership-${i}`,
          memberId,
          businessId: `business-${i}`,
          status: 'active', // All active - but only first 100 fetched
        }));

        // Only first 100 are fetched due to limit
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: memberships.slice(0, 100),
          totalCount: 101,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        });

        const context = await resolveAuthContext(memberId);
        // Should detect multiple active memberships (from first 100)
        expect(context).toBeNull();
      });
    });
  });

  describe('Workstream D: Audit Integration', () => {
    it('should log context validation failures', async () => {
      const memberId = 'member-123';
      const { logMultipleMembershipDetected } = await import('../audit-service.web');

      const memberships: BusinessMembers[] = [
        {
          _id: 'membership-1',
          memberId,
          businessId: 'business-1',
          status: 'active',
        },
        {
          _id: 'membership-2',
          memberId,
          businessId: 'business-2',
          status: 'active',
        },
      ];

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 2,
        nextSkip: null,
      });

      await resolveAuthContext(memberId);

      expect(logMultipleMembershipDetected).toHaveBeenCalled();
    });
  });
});
