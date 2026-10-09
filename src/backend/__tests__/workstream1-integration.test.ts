/**
 * PHASE 3F-C WORKSTREAM 1: Context Integrity Integration Tests
 * Tests for validateContextFreshness() integration into authorization path
 * 
 * These tests verify that:
 * 1. authorizeRead() calls validateContextFreshness()
 * 2. authorizeWrite() calls validateContextFreshness()
 * 3. Stale contexts are rejected
 * 4. Membership revocation is detected
 * 5. Role changes are detected
 * 6. Branch reassignments are detected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveAuthContext,
  validateContextFreshness,
  authorizeRead,
  authorizeWrite,
  authorizeDelete,
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

describe('PHASE 3F-C Workstream 1: Context Integrity Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BaseCrudService.getAll).mockResolvedValue({
      items: [{ _id: 'bm-member-123', memberId: 'member-123', businessId: 'business-123', role: 'manager', status: 'active' }],
      totalCount: 1, hasNext: false, currentPage: 0, pageSize: 1, nextSkip: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Integration: validateContextFreshness() in authorizeRead()', () => {
    it('should reject stale context in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a stale context (older than 5 minutes)
      const staleContext: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes old
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution (for validateContextFreshness)
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeRead('customers', recordId, staleContext);

      // Should reject due to stale context
      expect(authorized).toBe(false);
    });

    it('should accept fresh context in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a fresh context (just validated)
      const freshContext: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(), // Just now
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution (for validateContextFreshness)
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeRead('customers', recordId, freshContext);

      // Should allow due to fresh context
      expect(authorized).toBe(true);
    });

    it('should detect membership revocation in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a fresh context
      const context: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock membership revocation (no active memberships found)
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [], // No active memberships
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 0,
        nextSkip: null,
      });

      const authorized = await authorizeRead('customers', recordId, context);

      // Should reject due to membership revocation
      expect(authorized).toBe(false);
    });

    it('should detect role changes in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create context with manager role
      const context: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock role change (fresh context has different role)
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
            role: 'guest', // Role changed from manager to guest
            status: 'active',
          },
        ],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1,
        nextSkip: null,
      });

      const authorized = await authorizeRead('customers', recordId, context);

      // Should reject due to role change
      expect(authorized).toBe(false);
    });

    it('should detect branch reassignments in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create context with branch-1
      const context: AuthContext = {
        memberId,
        businessId,
        branchId: 'branch-1',
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock branch reassignment (fresh context has different branch)
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
            branchId: 'branch-2', // Branch changed from branch-1 to branch-2
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

      const authorized = await authorizeRead('customers', recordId, context);

      // Should reject due to branch reassignment
      expect(authorized).toBe(false);
    });
  });

  describe('Integration: validateContextFreshness() in authorizeWrite()', () => {
    it('should reject stale context in authorizeWrite()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a stale context
      const staleContext: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes old
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeWrite('customers', recordId, staleContext);

      // Should reject due to stale context
      expect(authorized).toBe(false);
    });

    it('should accept fresh context in authorizeWrite()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a fresh context
      const freshContext: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeWrite('customers', recordId, freshContext);

      // Should allow due to fresh context
      expect(authorized).toBe(true);
    });
  });

  describe('Integration: validateContextFreshness() in authorizeDelete()', () => {
    it('should reject stale context in authorizeDelete()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a stale context
      const staleContext: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes old
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeDelete('customers', recordId, staleContext);

      // Should reject due to stale context (delegates to authorizeWrite)
      expect(authorized).toBe(false);
    });

    it('should accept fresh context in authorizeDelete()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a fresh context
      const freshContext: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeDelete('customers', recordId, freshContext);

      // Should allow due to fresh context (delegates to authorizeWrite)
      expect(authorized).toBe(true);
    });
  });

  describe('Regression: Existing authorization logic still works', () => {
    it('should still enforce tenant isolation in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';
      const otherBusinessId = 'business-456';

      // Create a fresh context
      const context: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record from different business
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId: otherBusinessId, // Different business
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeRead('customers', recordId, context);

      // Should reject due to tenant mismatch
      expect(authorized).toBe(false);
    });

    it('should still enforce branch isolation in authorizeRead()', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create context with branch-1
      const context: AuthContext = {
        memberId,
        businessId,
        branchId: 'branch-1',
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record from different branch
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
        branchId: 'branch-2', // Different branch
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      const authorized = await authorizeRead('customers', recordId, context);

      // Should reject due to branch mismatch
      expect(authorized).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing _validatedAt timestamp gracefully', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create context without _validatedAt
      const context: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        // _validatedAt is missing
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      const authorized = await authorizeRead('customers', recordId, context);

      // Should reject due to missing timestamp
      expect(authorized).toBe(false);
    });

    it('should handle concurrent context validation', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      // Create a fresh context
      const context: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record exists
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
      });

      // Mock fresh context resolution
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
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

      // Call authorizeRead multiple times concurrently
      const results = await Promise.all([
        authorizeRead('customers', recordId, context),
        authorizeRead('customers', recordId, context),
        authorizeRead('customers', recordId, context),
      ]);

      // All should succeed
      expect(results).toEqual([true, true, true]);
    });
  });
});
