/**
 * WORKSTREAM 1: Authorization Query Regression Tests
 * 
 * Tests for corrected database-level filtering in authorization queries.
 * Ensures that:
 * 1. Target membership is found even after 100+ unrelated records
 * 2. First two collection records belonging to other members don't cause false positives
 * 3. Multiple active memberships are detected and fail-closed
 * 4. Zero active memberships are handled correctly
 * 5. Malformed data is rejected
 * 6. Client-supplied IDs cannot override authoritative membership data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveAuthContext, AuthContext } from '../auth.web';
import { BaseCrudService } from '@/integrations/cms';
import { BusinessMembers } from '@/entities';

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}));

// Mock audit service
vi.mock('../audit-service.web', () => ({
  logMultipleMembershipDetected: vi.fn(),
  logAuthorizationFailure: vi.fn(),
  logCrossTenantAccessAttempt: vi.fn(),
  logBranchAuthorizationFailure: vi.fn(),
  logProtectedFieldOverrideAttempt: vi.fn(),
}));

describe('WORKSTREAM 1: Authorization Query Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Regression Test 1: Target membership after 100+ unrelated records', () => {
    it('should find active membership even when it appears after 100 unrelated records', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      // Create 120 unrelated memberships (different memberId)
      const unrelatedMemberships: BusinessMembers[] = [];
      for (let i = 0; i < 120; i++) {
        unrelatedMemberships.push({
          _id: `bm-unrelated-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      // Add target membership at position 115
      const targetMembership: BusinessMembers = {
        _id: 'bm-target',
        memberId: targetMemberId,
        businessId: targetBusinessId,
        role: 'admin',
        status: 'active',
      };
      
      const allMemberships = [
        ...unrelatedMemberships.slice(0, 115),
        targetMembership,
        ...unrelatedMemberships.slice(115),
      ];
      
      // Mock BaseCrudService to return all 121 memberships
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: allMemberships,
        totalCount: 121,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should find the target membership
      expect(result).not.toBeNull();
      expect(result?.memberId).toBe(targetMemberId);
      expect(result?.businessId).toBe(targetBusinessId);
      expect(result?.role).toBe('admin');
    });
  });

  describe('Regression Test 2: First two records belong to other members', () => {
    it('should not match when first two records belong to other members', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-other-1',
          memberId: 'member-other-1',
          businessId: 'business-other-1',
          role: 'manager',
          status: 'active',
        },
        {
          _id: 'bm-other-2',
          memberId: 'member-other-2',
          businessId: 'business-other-2',
          role: 'manager',
          status: 'active',
        },
        {
          _id: 'bm-target',
          memberId: targetMemberId,
          businessId: targetBusinessId,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 3,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should find the target membership (not the first two)
      expect(result).not.toBeNull();
      expect(result?.memberId).toBe(targetMemberId);
      expect(result?.businessId).toBe(targetBusinessId);
    });
  });

  describe('Regression Test 3: Two active memberships for same member', () => {
    it('should fail closed when two active memberships exist for same member', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-2',
          memberId: targetMemberId,
          businessId: 'business-2',
          role: 'manager',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should reject due to multiple active memberships
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 4: Member has no active membership', () => {
    it('should return null when member has no active membership', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'pending',
        },
        {
          _id: 'bm-2',
          memberId: targetMemberId,
          businessId: 'business-2',
          role: 'manager',
          status: 'revoked',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should return null (no active membership)
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 5: Query returns malformed data', () => {
    it('should handle missing businessId gracefully', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: any[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should reject malformed data
      expect(result).toBeNull();
    });

    it('should handle invalid businessId type', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: any[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 123,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should reject invalid type
      expect(result).toBeNull();
    });

    it('should handle null items array', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: null,
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should handle gracefully
      expect(result).toBeNull();
    });

    it('should handle undefined result', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce(undefined as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should handle gracefully
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 6: Client-supplied IDs cannot override authoritative data', () => {
    it('should use authoritative businessId from membership', async () => {
      const targetMemberId = 'member-target';
      const authoritativeBusinessId = 'business-authoritative';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: authoritativeBusinessId,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should use authoritative businessId
      expect(result).not.toBeNull();
      expect(result?.businessId).toBe(authoritativeBusinessId);
    });

    it('should use authoritative role from membership', async () => {
      const targetMemberId = 'member-target';
      const authoritativeRole = 'admin';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: authoritativeRole,
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should use authoritative role
      expect(result).not.toBeNull();
      expect(result?.role).toBe(authoritativeRole);
    });

    it('should reject invalid role from membership', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: any[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'invalid-role',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should still resolve context but with undefined role
      expect(result).not.toBeNull();
      expect(result?.role).toBeUndefined();
    });
  });

  describe('Regression Test 7: Database errors are treated as authorization failures', () => {
    it('should return null on database query error', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockRejectedValueOnce(
        new Error('Database connection failed')
      );
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed
      expect(result).toBeNull();
    });

    it('should return null on unexpected error', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockRejectedValueOnce(
        new Error('Unexpected error')
      );
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 8: Edge cases with pagination', () => {
    it('should handle empty collection', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should return null (no membership)
      expect(result).toBeNull();
    });

    it('should handle single membership correctly', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: targetBusinessId,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should resolve successfully
      expect(result).not.toBeNull();
      expect(result?.memberId).toBe(targetMemberId);
      expect(result?.businessId).toBe(targetBusinessId);
    });
  });

  describe('Regression Test 9: Mixed active and inactive memberships', () => {
    it('should find single active membership among multiple inactive ones', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-active';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-pending',
          role: 'admin',
          status: 'pending',
        },
        {
          _id: 'bm-2',
          memberId: targetMemberId,
          businessId: targetBusinessId,
          role: 'manager',
          status: 'active',
        },
        {
          _id: 'bm-3',
          memberId: targetMemberId,
          businessId: 'business-revoked',
          role: 'guest',
          status: 'revoked',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 3,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should find the single active membership
      expect(result).not.toBeNull();
      expect(result?.businessId).toBe(targetBusinessId);
      expect(result?.role).toBe('manager');
    });
  });

  describe('Regression Test 10: Validation of all required fields', () => {
    it('should validate memberId is string', async () => {
      const result = await resolveAuthContext(null as any);
      expect(result).toBeNull();
    });

    it('should validate memberId is not empty', async () => {
      const result = await resolveAuthContext('');
      expect(result).toBeNull();
    });

    it('should validate memberId is not whitespace-only', async () => {
      const result = await resolveAuthContext('   ');
      expect(result).toBeNull();
    });

    it('should validate businessId is string', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: any[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: null,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1000,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 11: Records beyond first page are found', () => {
    it('should find active membership on second page (skip=100)', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      // First page: 100 unrelated memberships
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      // Second page: target membership at position 5
      const page2: BusinessMembers[] = [];
      for (let i = 0; i < 5; i++) {
        page2.push({
          _id: `bm-page2-other-${i}`,
          memberId: `member-other-page2-${i}`,
          businessId: `business-other-page2-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      const targetMembership: BusinessMembers = {
        _id: 'bm-target',
        memberId: targetMemberId,
        businessId: targetBusinessId,
        role: 'admin',
        status: 'active',
      };
      
      page2.push(targetMembership);
      
      // Mock pagination: first call returns page 1, second call returns page 2
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 206,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: page2,
          totalCount: 206,
          hasNext: false,
          currentPage: 1,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should find the target membership on second page
      expect(result).not.toBeNull();
      expect(result?.memberId).toBe(targetMemberId);
      expect(result?.businessId).toBe(targetBusinessId);
      expect(result?.role).toBe('admin');
    });
  });

  describe('Regression Test 12: Duplicate memberships across pages detected', () => {
    it('should detect multiple active memberships split across pages', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Second page: another target membership
      const page2: BusinessMembers[] = [
        {
          _id: 'bm-target-2',
          memberId: targetMemberId,
          businessId: 'business-2',
          role: 'manager',
          status: 'active',
        },
      ];
      
      // Mock pagination
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: page2,
          totalCount: 202,
          hasNext: false,
          currentPage: 1,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to multiple active memberships
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 13: Cross-tenant access prevention', () => {
    it('should not leak data from other tenants', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      // Collection contains memberships from multiple tenants
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-tenant1-1',
          memberId: 'member-other-1',
          businessId: 'business-tenant1-1',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-tenant2-1',
          memberId: 'member-other-2',
          businessId: 'business-tenant2-1',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-target',
          memberId: targetMemberId,
          businessId: targetBusinessId,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 3,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should find only the target membership, not leak other tenants' data
      expect(result).not.toBeNull();
      expect(result?.businessId).toBe(targetBusinessId);
      expect(result?.memberId).toBe(targetMemberId);
    });
  });

  describe('Regression Test 14: Large collection handling', () => {
    it('should handle collection with 1000+ records', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      // Simulate large collection: 1200 records total
      // Target membership at position 1050
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      const page2: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page2.push({
          _id: `bm-page2-${i}`,
          memberId: `member-other-page2-${i}`,
          businessId: `business-other-page2-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      const page3: BusinessMembers[] = [];
      for (let i = 0; i < 50; i++) {
        page3.push({
          _id: `bm-page3-other-${i}`,
          memberId: `member-other-page3-${i}`,
          businessId: `business-other-page3-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      const targetMembership: BusinessMembers = {
        _id: 'bm-target',
        memberId: targetMemberId,
        businessId: targetBusinessId,
        role: 'admin',
        status: 'active',
      };
      
      page3.push(targetMembership);
      
      // Mock pagination for 3 pages
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 1200,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: page2,
          totalCount: 1200,
          hasNext: true,
          currentPage: 1,
          pageSize: 100,
          nextSkip: 200,
        } as any)
        .mockResolvedValueOnce({
          items: page3,
          totalCount: 1200,
          hasNext: false,
          currentPage: 2,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should find the target membership even in large collection
      expect(result).not.toBeNull();
      expect(result?.memberId).toBe(targetMemberId);
      expect(result?.businessId).toBe(targetBusinessId);
    });
  });

  describe('Regression Test 15: Second-page database failure after one matching membership', () => {
    it('should fail closed when second page fails after finding one match', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Mock: first page succeeds, second page fails
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockRejectedValueOnce(new Error('Database connection lost'));
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed - cannot verify completeness
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 16: Malformed pagination responses', () => {
    it('should fail closed when hasNext is not a boolean', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: 'true' as any, // Invalid: string instead of boolean
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed pagination
      expect(result).toBeNull();
    });

    it('should fail closed when totalCount is negative', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: -1, // Invalid: negative
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed totalCount
      expect(result).toBeNull();
    });

    it('should fail closed when items is not an array', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: { _id: 'bm-1' }, // Invalid: object instead of array
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed items
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 17: Duplicate memberships across pages with failure', () => {
    it('should fail closed when duplicate detected and second page fails', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Mock: first page succeeds with one match, second page fails
      // This tests that we fail closed even when we found one match
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockRejectedValueOnce(new Error('Network timeout'));
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed - cannot verify if there are more matches
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 18: Pagination boundary conditions', () => {
    it('should handle exactly 2 matches correctly', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-2',
          memberId: targetMemberId,
          businessId: 'business-2',
          role: 'manager',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to multiple active memberships
      expect(result).toBeNull();
    });

    it('should handle exactly 1 match correctly', async () => {
      const targetMemberId = 'member-target';
      const targetBusinessId = 'business-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: targetBusinessId,
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should resolve successfully
      expect(result).not.toBeNull();
      expect(result?.memberId).toBe(targetMemberId);
      expect(result?.businessId).toBe(targetBusinessId);
    });
  });

  describe('Regression Test 19: Malformed first-page responses', () => {
    it('should reject when first page has invalid totalCount (string)', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: '1' as any, // Invalid: string instead of number
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed first-page response
      expect(result).toBeNull();
    });

    it('should reject when first page has null totalCount', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: null as any, // Invalid: null
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed first-page response
      expect(result).toBeNull();
    });

    it('should reject when first page has invalid hasNext (null)', async () => {
      const targetMemberId = 'member-target';
      
      const memberships: BusinessMembers[] = [
        {
          _id: 'bm-1',
          memberId: targetMemberId,
          businessId: 'business-1',
          role: 'admin',
          status: 'active',
        },
      ];
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: memberships,
        totalCount: 1,
        hasNext: null as any, // Invalid: null instead of boolean
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed first-page response
      expect(result).toBeNull();
    });

    it('should reject when first page items is null', async () => {
      const targetMemberId = 'member-target';
      
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: null as any, // Invalid: null instead of array
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to malformed first-page response
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 20: Later-page failures with incomplete scan detection', () => {
    it('should fail closed when later page returns malformed totalCount', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Mock: first page succeeds, second page has malformed totalCount
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: [],
          totalCount: 'invalid' as any, // Malformed
          hasNext: false,
          currentPage: 1,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed - incomplete scan with malformed data
      expect(result).toBeNull();
    });

    it('should fail closed when later page returns malformed hasNext', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Mock: first page succeeds, second page has malformed hasNext
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: [],
          totalCount: 202,
          hasNext: 'true' as any, // Malformed: string instead of boolean
          currentPage: 1,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed - incomplete scan with malformed data
      expect(result).toBeNull();
    });

    it('should fail closed when later page returns null items', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Mock: first page succeeds, second page has null items
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: null as any, // Malformed: null instead of array
          totalCount: 202,
          hasNext: false,
          currentPage: 1,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed - incomplete scan with malformed data
      expect(result).toBeNull();
    });
  });

  describe('Regression Test 21: Duplicate membership detection across pages', () => {
    it('should fail closed when duplicate memberships found on different pages', async () => {
      const targetMemberId = 'member-target';
      
      // First page: 100 unrelated + 1 target membership
      const page1: BusinessMembers[] = [];
      for (let i = 0; i < 100; i++) {
        page1.push({
          _id: `bm-page1-other-${i}`,
          memberId: `member-other-${i}`,
          businessId: `business-other-${i}`,
          role: 'manager',
          status: 'active',
        });
      }
      
      page1.push({
        _id: 'bm-target-1',
        memberId: targetMemberId,
        businessId: 'business-1',
        role: 'admin',
        status: 'active',
      });
      
      // Second page: another target membership
      const page2: BusinessMembers[] = [
        {
          _id: 'bm-target-2',
          memberId: targetMemberId,
          businessId: 'business-2',
          role: 'manager',
          status: 'active',
        },
      ];
      
      // Mock pagination
      vi.mocked(BaseCrudService.getAll)
        .mockResolvedValueOnce({
          items: page1,
          totalCount: 202,
          hasNext: true,
          currentPage: 0,
          pageSize: 100,
          nextSkip: 100,
        } as any)
        .mockResolvedValueOnce({
          items: page2,
          totalCount: 202,
          hasNext: false,
          currentPage: 1,
          pageSize: 100,
        } as any);
      
      const result = await resolveAuthContext(targetMemberId);
      
      // Should fail closed due to multiple active memberships
      expect(result).toBeNull();
    });
  });
});
