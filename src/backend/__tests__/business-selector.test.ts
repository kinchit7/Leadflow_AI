/**
 * Business Selector & Context Switching Tests
 * PHASE 3D: Secure membership discovery and business context switching
 * 
 * Tests for:
 * - Membership discovery (zero, one, multiple, inactive)
 * - Context switching (valid, unauthorized, revoked, stale)
 * - Tenant/branch isolation
 * - Demo security boundaries
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  discoverAuthorizedMemberships,
  switchBusinessContext,
  clearStaleState,
  authorizeBranchAccess,
  validateDemoOperationAuthorization,
  MembershipInfo,
  ContextSwitchResult,
} from '../business-selector.web';
import { BaseCrudService } from '@/integrations/cms';
import { AuthContext } from '../auth.web';

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}));

describe('Business Selector & Context Switching (Phase 3D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  // ============================================================================
  // PHASE 1: Membership Discovery Tests
  // ============================================================================

  describe('discoverAuthorizedMemberships', () => {
    it('should return empty array for invalid memberId', async () => {
      const result = await discoverAuthorizedMemberships('');
      expect(result).toEqual([]);
    });

    it('should return empty array when no memberships exist', async () => {
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      const result = await discoverAuthorizedMemberships('member-123');
      expect(result).toEqual([]);
    });

    it('should return single active membership', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'admin',
        branchId: 'branch-789',
        status: 'active',
      };

      const mockBusiness = {
        _id: 'business-456',
        businessName: 'Acme Corp',
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        businessId: 'business-456',
        businessName: 'Acme Corp',
        role: 'admin',
        branchId: 'branch-789',
        status: 'active',
      });
    });

    it('should return multiple active memberships', async () => {
      const mockMemberships = [
        {
          _id: 'bm-1',
          memberId: 'member-123',
          businessId: 'business-456',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-2',
          memberId: 'member-123',
          businessId: 'business-789',
          role: 'owner',
          status: 'active',
        },
      ];

      const mockBusiness1 = { _id: 'business-456', businessName: 'Acme Corp' };
      const mockBusiness2 = { _id: 'business-789', businessName: 'Tech Inc' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: mockMemberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById)
        .mockResolvedValueOnce(mockBusiness1)
        .mockResolvedValueOnce(mockBusiness2);

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result).toHaveLength(2);
      expect(result[0].businessName).toBe('Acme Corp');
      expect(result[1].businessName).toBe('Tech Inc');
    });

    it('should exclude inactive memberships', async () => {
      const mockMemberships = [
        {
          _id: 'bm-1',
          memberId: 'member-123',
          businessId: 'business-456',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-2',
          memberId: 'member-123',
          businessId: 'business-789',
          role: 'owner',
          status: 'suspended',
        },
        {
          _id: 'bm-3',
          memberId: 'member-123',
          businessId: 'business-999',
          role: 'manager',
          status: 'pending',
        },
      ];

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: mockMemberships,
        totalCount: 3,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result).toHaveLength(1);
      expect(result[0].businessId).toBe('business-456');
    });

    it('should exclude memberships with missing businessId', async () => {
      const mockMemberships = [
        {
          _id: 'bm-1',
          memberId: 'member-123',
          businessId: 'business-456',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-2',
          memberId: 'member-123',
          businessId: undefined,
          role: 'owner',
          status: 'active',
        },
      ];

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: mockMemberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result).toHaveLength(1);
      expect(result[0].businessId).toBe('business-456');
    });

    it('should handle business fetch failure gracefully', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'admin',
        status: 'active',
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockRejectedValueOnce(
        new Error('Business not found')
      );

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result).toHaveLength(1);
      expect(result[0].businessId).toBe('business-456');
      expect(result[0].businessName).toBeUndefined();
    });

    it('should normalize role to lowercase', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'ADMIN',
        status: 'active',
      };

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result[0].role).toBe('admin');
    });
  });

  // ============================================================================
  // PHASE 3: Context Switching Tests
  // ============================================================================

  describe('switchBusinessContext', () => {
    it('should reject invalid memberId', async () => {
      const result = await switchBusinessContext('', 'business-456');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid targetBusinessId', async () => {
      const result = await switchBusinessContext('member-123', '');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should succeed for authorized business switch', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'admin',
        branchId: 'branch-789',
        status: 'active',
      };

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await switchBusinessContext('member-123', 'business-456');

      expect(result.success).toBe(true);
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.businessId).toBe('business-456');
      expect(result.authContext?.role).toBe('admin');
      expect(result.authContext?.branchId).toBe('branch-789');
    });

    it('should reject unauthorized business switch', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'admin',
        status: 'active',
      };

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await switchBusinessContext('member-123', 'business-999');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should reject switch when no memberships exist', async () => {
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      const result = await switchBusinessContext('member-123', 'business-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No authorized memberships');
    });

    it('should handle query failure gracefully', async () => {
      vi.mocked(BaseCrudService.getAll).mockRejectedValueOnce(
        new Error('Query failed')
      );

      const result = await switchBusinessContext('member-123', 'business-456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // PHASE 4: Stale State Clearing Tests
  // ============================================================================

  describe('clearStaleState', () => {
    it('should clear localStorage entries for previous business', () => {
      localStorage.setItem('business:business-456:filters', 'value1');
      localStorage.setItem('business:business-456:search', 'value2');
      localStorage.setItem('global:setting', 'value3');

      clearStaleState('business-456', 'business-789');

      expect(localStorage.getItem('business:business-456:filters')).toBeNull();
      expect(localStorage.getItem('business:business-456:search')).toBeNull();
      expect(localStorage.getItem('global:setting')).toBe('value3');
    });

    it('should clear sessionStorage entries for previous business', () => {
      sessionStorage.setItem('business:business-456:pagination', 'value1');
      sessionStorage.setItem('global:session', 'value2');

      clearStaleState('business-456', 'business-789');

      expect(sessionStorage.getItem('business:business-456:pagination')).toBeNull();
      expect(sessionStorage.getItem('global:session')).toBe('value2');
    });

    it('should not clear entries for new business', () => {
      localStorage.setItem('business:business-789:filters', 'value1');

      clearStaleState('business-456', 'business-789');

      expect(localStorage.getItem('business:business-789:filters')).toBe('value1');
    });

    it('should handle errors gracefully', () => {
      // Mock localStorage to throw error
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => clearStaleState('business-456', 'business-789')).not.toThrow();

      getItemSpy.mockRestore();
    });
  });

  // ============================================================================
  // PHASE 5: Branch Authorization Tests
  // ============================================================================

  describe('authorizeBranchAccess', () => {
    it('should allow Owner to access any branch', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'owner',
        branchId: 'branch-1',
      };

      expect(authorizeBranchAccess(authContext, 'branch-2')).toBe(true);
    });

    it('should allow Admin to access any branch', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
        branchId: 'branch-1',
      };

      expect(authorizeBranchAccess(authContext, 'branch-2')).toBe(true);
    });

    it('should allow Manager to access own branch', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'manager',
        branchId: 'branch-1',
      };

      expect(authorizeBranchAccess(authContext, 'branch-1')).toBe(true);
    });

    it('should deny Manager access to other branch', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'manager',
        branchId: 'branch-1',
      };

      expect(authorizeBranchAccess(authContext, 'branch-2')).toBe(false);
    });
  });

  // ============================================================================
  // PHASE 6: Demo Security Tests
  // ============================================================================

  describe('validateDemoOperationAuthorization', () => {
    it('should allow Owner demo operations', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'owner',
      };

      expect(validateDemoOperationAuthorization(authContext)).toBe(true);
    });

    it('should allow Admin demo operations', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      expect(validateDemoOperationAuthorization(authContext)).toBe(true);
    });

    it('should deny Sales demo operations', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      expect(validateDemoOperationAuthorization(authContext)).toBe(false);
    });

    it('should deny null authContext', () => {
      expect(validateDemoOperationAuthorization(null as any)).toBe(false);
    });

    it('should deny undefined authContext', () => {
      expect(validateDemoOperationAuthorization(undefined as any)).toBe(false);
    });
  });

  // ============================================================================
  // PHASE 7: Tenant Isolation Tests
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should not allow cross-tenant membership discovery', async () => {
      const mockMemberships = [
        {
          _id: 'bm-1',
          memberId: 'member-123',
          businessId: 'business-456',
          role: 'admin',
          status: 'active',
        },
        {
          _id: 'bm-2',
          memberId: 'member-456',
          businessId: 'business-789',
          role: 'owner',
          status: 'active',
        },
      ];

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: mockMemberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      const result = await discoverAuthorizedMemberships('member-123');

      expect(result).toHaveLength(1);
      expect(result[0].businessId).toBe('business-456');
    });

    it('should enforce business boundary on context switch', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'admin',
        status: 'active',
      };

      const mockBusiness = { _id: 'business-456', businessName: 'Acme Corp' };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockBusiness);

      // Attempt to switch to unauthorized business
      const result = await switchBusinessContext('member-123', 'business-999');

      expect(result.success).toBe(false);
      expect(result.authContext).toBeUndefined();
    });
  });
});
