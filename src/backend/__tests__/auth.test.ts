/**
 * Authentication & Authorization Tests
 * PHASE 3 Security Hardening
 * 
 * Tests for:
 * - AuthContext resolution
 * - Multiple membership detection
 * - Role-based authorization
 * - Branch-level access control
 * - Protected field validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveAuthContext,
  authorizeRead,
  authorizeWrite,
  authorizeDelete,
  hasRole,
  authorizeBranchAccess,
  authorizeRoleAction,
  getTenantFilter,
  sanitizeUpdatePayload,
  AuthContext,
  VALID_ROLES,
  ROLE_PERMISSIONS,
} from '../auth.web';
import { BaseCrudService } from '@/integrations/cms';

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}));

// Mock wix-data-query (uses BaseCrudService internally)
vi.mock('../wix-data-query.web', () => ({
  queryWithPredicates: vi.fn(async (collectionId, predicates, options) => {
    // Delegate to BaseCrudService.getAll and apply predicates
    const result = await BaseCrudService.getAll(collectionId, [], options);
    if (!result || !Array.isArray(result.items)) {
      return {
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: options?.limit ?? 50,
        nextSkip: null,
      };
    }
    
    // Apply predicates in-memory
    const filteredItems = result.items.filter(item => {
      return predicates.every(predicate => {
        const fieldValue = (item as any)[predicate.field];
        switch (predicate.operator) {
          case 'eq':
            return fieldValue === predicate.value;
          case 'ne':
            return fieldValue !== predicate.value;
          case 'gt':
            return fieldValue > predicate.value;
          case 'gte':
            return fieldValue >= predicate.value;
          case 'lt':
            return fieldValue < predicate.value;
          case 'lte':
            return fieldValue <= predicate.value;
          case 'contains':
            return String(fieldValue).includes(String(predicate.value));
          case 'startsWith':
            return String(fieldValue).startsWith(String(predicate.value));
          default:
            return false;
        }
      });
    });
    
    return {
      items: filteredItems,
      totalCount: result.totalCount,
      hasNext: false,
      currentPage: 0,
      pageSize: options?.limit ?? 50,
      nextSkip: null,
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

describe('Authentication & Authorization (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // PHASE A: AuthContext Resolution Tests
  // ============================================================================

  describe('resolveAuthContext', () => {
    it('should reject empty memberId', async () => {
      const result = await resolveAuthContext('');
      expect(result).toBeNull();
    });

    it('should reject null memberId', async () => {
      const result = await resolveAuthContext(null as any);
      expect(result).toBeNull();
    });

    it('should reject undefined memberId', async () => {
      const result = await resolveAuthContext(undefined as any);
      expect(result).toBeNull();
    });

    it('should reject whitespace-only memberId', async () => {
      const result = await resolveAuthContext('   ');
      expect(result).toBeNull();
    });

    it('should resolve valid single active membership', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        branchId: 'branch-789',
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

      const result = await resolveAuthContext('member-123');

      expect(result).not.toBeNull();
      expect(result?.memberId).toBe('member-123');
      expect(result?.businessId).toBe('business-456');
      expect(result?.branchId).toBe('branch-789');
      expect(result?.role).toBe('admin');
    });

    it('should reject membership with missing businessId', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: undefined,
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

      const result = await resolveAuthContext('member-123');
      expect(result).toBeNull();
    });

    it('should reject membership with non-string businessId', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 123,
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

      const result = await resolveAuthContext('member-123');
      expect(result).toBeNull();
    });

    it('should reject non-active membership', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'admin',
        status: 'pending',
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      const result = await resolveAuthContext('member-123');
      expect(result).toBeNull();
    });

    it('should reject multiple active memberships (PHASE 3)', async () => {
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

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: mockMemberships,
        totalCount: 2,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      const result = await resolveAuthContext('member-123');
      expect(result).toBeNull();
    });

    it('should normalize role to lowercase', async () => {
      const mockMembership = {
        _id: 'bm-1',
        memberId: 'member-123',
        businessId: 'business-456',
        role: 'ADMIN',
        status: 'active',
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [mockMembership],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      const result = await resolveAuthContext('member-123');
      expect(result?.role).toBe('admin');
    });

    it('should handle query failure gracefully', async () => {
      vi.mocked(BaseCrudService.getAll).mockRejectedValueOnce(new Error('Query failed'));

      const result = await resolveAuthContext('member-123');
      expect(result).toBeNull();
    });

    it('should handle null items array', async () => {
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: null,
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 100,
      } as any);

      const result = await resolveAuthContext('member-123');
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // PHASE B: Role-Based Authorization Tests
  // ============================================================================

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      expect(hasRole(authContext, ['admin', 'owner'])).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      expect(hasRole(authContext, ['admin', 'owner'])).toBe(false);
    });

    it('should return false for undefined role', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
      };

      expect(hasRole(authContext, ['admin', 'owner'])).toBe(false);
    });

    it('should be case-insensitive', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'ADMIN',
      };

      expect(hasRole(authContext, ['admin'])).toBe(true);
    });
  });

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

  describe('authorizeRoleAction', () => {
    it('should allow Owner to perform admin action', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'owner',
      };

      expect(authorizeRoleAction(authContext, 'delete')).toBe(true);
      expect(authorizeRoleAction(authContext, 'manage_team')).toBe(true);
    });

    it('should deny Sales from performing delete action', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      expect(authorizeRoleAction(authContext, 'delete')).toBe(false);
    });

    it('should allow Sales to perform write action', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      expect(authorizeRoleAction(authContext, 'write')).toBe(true);
    });
  });

  // ============================================================================
  // PHASE C: Tenant Isolation Tests
  // ============================================================================

  describe('authorizeRead', () => {
    it('should allow read of record in same business', async () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      const mockRecord = {
        _id: 'record-1',
        businessId: 'business-1',
        title: 'Test Record',
      };

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockRecord);

      const result = await authorizeRead('leads', 'record-1', authContext);
      expect(result).toBe(true);
    });

    it('should deny read of record in different business', async () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      const mockRecord = {
        _id: 'record-1',
        businessId: 'business-2',
        title: 'Test Record',
      };

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockRecord);

      const result = await authorizeRead('leads', 'record-1', authContext);
      expect(result).toBe(false);
    });

    it('should deny read of non-existent record', async () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(null);

      const result = await authorizeRead('leads', 'record-1', authContext);
      expect(result).toBe(false);
    });
  });

  describe('authorizeWrite', () => {
    it('should allow write of record in same business', async () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      const mockRecord = {
        _id: 'record-1',
        businessId: 'business-1',
        title: 'Test Record',
      };

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockRecord);

      const result = await authorizeWrite('leads', 'record-1', authContext);
      expect(result).toBe(true);
    });

    it('should deny write of record in different business', async () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'sales',
      };

      const mockRecord = {
        _id: 'record-1',
        businessId: 'business-2',
        title: 'Test Record',
      };

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockRecord);

      const result = await authorizeWrite('leads', 'record-1', authContext);
      expect(result).toBe(false);
    });
  });

  describe('authorizeDelete', () => {
    it('should delegate to authorizeWrite', async () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      const mockRecord = {
        _id: 'record-1',
        businessId: 'business-1',
        title: 'Test Record',
      };

      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce(mockRecord);

      const result = await authorizeDelete('leads', 'record-1', authContext);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // PHASE D: Query Filtering Tests
  // ============================================================================

  describe('getTenantFilter', () => {
    it('should return businessId filter for Owner', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'owner',
      };

      const filter = getTenantFilter(authContext);
      expect(filter.businessId).toBe('business-1');
    });

    it('should include branchId filter for Manager', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'manager',
        branchId: 'branch-1',
      };

      const filter = getTenantFilter(authContext);
      expect(filter.businessId).toBe('business-1');
      expect(filter.branchId).toBe('branch-1');
    });

    it('should not include branchId filter for Admin', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
        branchId: 'branch-1',
      };

      const filter = getTenantFilter(authContext);
      expect(filter.businessId).toBe('business-1');
      expect(filter.branchId).toBeUndefined();
    });
  });

  // ============================================================================
  // PHASE E: Protected Field Validation Tests
  // ============================================================================

  describe('sanitizeUpdatePayload', () => {
    it('should remove businessId from updates', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      const updates = {
        title: 'New Title',
        businessId: 'business-2',
      };

      const sanitized = sanitizeUpdatePayload(updates, authContext);
      expect(sanitized.title).toBe('New Title');
      expect(sanitized.businessId).toBeUndefined();
    });

    it('should remove branchId from updates', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      const updates = {
        title: 'New Title',
        branchId: 'branch-2',
      };

      const sanitized = sanitizeUpdatePayload(updates, authContext);
      expect(sanitized.title).toBe('New Title');
      expect(sanitized.branchId).toBeUndefined();
    });

    it('should remove role from updates', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      const updates = {
        title: 'New Title',
        role: 'owner',
      };

      const sanitized = sanitizeUpdatePayload(updates, authContext);
      expect(sanitized.title).toBe('New Title');
      expect(sanitized.role).toBeUndefined();
    });

    it('should allow legitimate field updates', () => {
      const authContext: AuthContext = {
        memberId: 'member-1',
        businessId: 'business-1',
        role: 'admin',
      };

      const updates = {
        title: 'New Title',
        description: 'New Description',
        priority: 'high',
      };

      const sanitized = sanitizeUpdatePayload(updates, authContext);
      expect(sanitized.title).toBe('New Title');
      expect(sanitized.description).toBe('New Description');
      expect(sanitized.priority).toBe('high');
    });
  });

  // ============================================================================
  // PHASE F: Role Permissions Matrix Tests
  // ============================================================================

  describe('ROLE_PERMISSIONS', () => {
    it('should have all valid roles defined', () => {
      for (const role of VALID_ROLES) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Set);
      }
    });

    it('should grant Owner all permissions', () => {
      const ownerPerms = ROLE_PERMISSIONS.owner;
      expect(ownerPerms.has('read')).toBe(true);
      expect(ownerPerms.has('write')).toBe(true);
      expect(ownerPerms.has('delete')).toBe(true);
      expect(ownerPerms.has('manage_team')).toBe(true);
      expect(ownerPerms.has('admin')).toBe(true);
    });

    it('should deny Guest write permissions', () => {
      const guestPerms = ROLE_PERMISSIONS.guest;
      expect(guestPerms.has('read')).toBe(true);
      expect(guestPerms.has('write')).toBe(false);
      expect(guestPerms.has('delete')).toBe(false);
    });

    it('should deny Sales delete permissions', () => {
      const salesPerms = ROLE_PERMISSIONS.sales;
      expect(salesPerms.has('read')).toBe(true);
      expect(salesPerms.has('write')).toBe(true);
      expect(salesPerms.has('delete')).toBe(false);
    });
  });
});
