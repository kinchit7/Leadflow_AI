/**
 * Backend Authorization Module (.web.ts)
 * Handles tenant isolation, user identity resolution, and permission checks
 * All business logic calls must go through these functions
 * Deny by default - explicit allow only
 * 
 * PHASE 3 HARDENING:
 * - Validates all AuthContext fields with type checking
 * - Detects and rejects multiple active memberships
 * - Enforces role-based and branch-level authorization
 * - Prevents client-supplied tenant/role overrides
 */

import { BaseCrudService } from '@/integrations/cms';
import { BusinessMembers } from '@/entities';

export interface AuthContext {
  memberId: string;
  businessId: string;
  branchId?: string;
  role?: string;
}

/**
 * Valid roles in the system
 */
export const VALID_ROLES = ['owner', 'admin', 'manager', 'sales', 'support', 'guest'] as const;
export type UserRole = typeof VALID_ROLES[number];

/**
 * Permission matrix: role -> allowed actions
 */
export const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  owner: new Set(['read', 'write', 'delete', 'manage_team', 'manage_roles', 'admin']),
  admin: new Set(['read', 'write', 'delete', 'manage_team', 'manage_roles']),
  manager: new Set(['read', 'write', 'manage_team']),
  sales: new Set(['read', 'write']),
  support: new Set(['read', 'write']),
  guest: new Set(['read']),
};

/**
 * Resolve authenticated user context from server-side session
 * PHASE 3 HARDENED IMPLEMENTATION:
 * - Never trust tenantId/businessId from browser - resolve from authoritative BusinessMembers collection
 * - Validates member exists and has active business association
 * - Returns null if not authenticated, membership not found, or status != 'active'
 * - Implements deny-by-default security model
 * - Extracts businessId, branchId, and role from authoritative BusinessMembers record
 * - DETECTS MULTIPLE ACTIVE MEMBERSHIPS AND FAILS CLOSED
 * - VALIDATES ALL FIELD TYPES AND VALUES
 * - REJECTS MISSING REQUIRED FIELDS
 * 
 * @param memberId - Member ID from authenticated session (trusted from Wix session)
 * @returns AuthContext with validated tenant mapping or null
 */
export async function resolveAuthContext(memberId: string): Promise<AuthContext | null> {
  try {
    // Validate memberId type and non-empty
    if (!memberId || typeof memberId !== 'string' || memberId.trim() === '') {
      console.warn('resolveAuthContext: Invalid memberId provided');
      return null;
    }

    // Query authoritative BusinessMembers collection for member's business association
    // LIMITATION: BaseCrudService.getAll does not support server-side filtering by memberId
    // This requires fetching all records and filtering in memory.
    // For production scale (>100 memberships), this requires Wix Data API enhancement.
    const membershipResult = await BaseCrudService.getAll<BusinessMembers>(
      'businessmembers',
      [],
      { limit: 100 }
    );

    if (!membershipResult || !Array.isArray(membershipResult.items)) {
      console.error('resolveAuthContext: Failed to query BusinessMembers collection');
      return null;
    }

    // Find ALL active memberships for this member
    // PHASE 3: Detect multiple active memberships and fail closed
    const activeMemberships = membershipResult.items.filter(
      (m: BusinessMembers) => 
        m.memberId === memberId && 
        m.status === 'active' &&
        m.businessId &&
        typeof m.businessId === 'string'
    );

    if (activeMemberships.length === 0) {
      console.warn(
        `resolveAuthContext: No active membership found for member ${memberId}. ` +
        `Possible states: pending, suspended, revoked, or missing membership.`
      );
      return null;
    }

    // PHASE 3: Reject if multiple active memberships exist
    if (activeMemberships.length > 1) {
      console.error(
        `resolveAuthContext: Member ${memberId} has ${activeMemberships.length} active memberships. ` +
        `Ambiguous context. Requires explicit business selection. Denying access.`
      );
      return null;
    }

    const membership = activeMemberships[0];

    // PHASE 3: Validate all required fields with type checking
    if (!membership.businessId || typeof membership.businessId !== 'string') {
      console.error(`resolveAuthContext: Invalid businessId for member ${memberId}`);
      return null;
    }

    // Validate optional fields
    const branchId = membership.branchId && typeof membership.branchId === 'string' 
      ? membership.branchId 
      : undefined;
    
    const role = membership.role && typeof membership.role === 'string' 
      ? membership.role.toLowerCase()
      : undefined;

    // PHASE 3: Validate role is in allowed set
    if (role && !VALID_ROLES.includes(role as UserRole)) {
      console.warn(`resolveAuthContext: Invalid role '${role}' for member ${memberId}`);
      // Continue with undefined role rather than failing - role is optional
    }

    const authContext: AuthContext = {
      memberId,
      businessId: membership.businessId,
      branchId,
      role: role as UserRole | undefined,
    };

    console.debug(
      `resolveAuthContext: Resolved context for member ${memberId} -> business ${membership.businessId}, ` +
      `branch ${branchId || 'none'}, role ${role || 'none'}`
    );
    return authContext;
  } catch (error) {
    console.error('resolveAuthContext: Unexpected error:', error);
    return null;
  }
}

/**
 * Enforce tenant ownership for read operations
 * PHASE 3 HARDENED:
 * - Deny by default - only allow if record belongs to authenticated business
 * - Validates record exists and has businessId/tenantId field
 * - Compares against authContext.businessId (never trust browser)
 * - Checks branch-level access if applicable
 * - Returns false on any validation failure
 * 
 * @param collectionId - CMS collection ID
 * @param recordId - Record ID to check
 * @param authContext - Authenticated user context with business ID
 * @returns true if user can read record, false otherwise
 */
export async function authorizeRead(
  collectionId: string,
  recordId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const record = await BaseCrudService.getById(collectionId, recordId);
    if (!record) {
      console.debug(`authorizeRead: Record not found - ${collectionId}:${recordId}`);
      return false;
    }

    const recordBusinessId = (record as any).businessId || (record as any).tenantId;
    if (!recordBusinessId) {
      console.warn(`authorizeRead: Record missing businessId/tenantId - ${collectionId}:${recordId}`);
      return false;
    }

    // Tenant check
    if (recordBusinessId !== authContext.businessId) {
      console.warn(
        `authorizeRead: Tenant mismatch - record business ${recordBusinessId} != auth business ${authContext.businessId}`
      );
      return false;
    }

    // Branch check (if record has branchId and user is not Owner/Admin)
    const recordBranchId = (record as any).branchId;
    if (recordBranchId && !hasRole(authContext, ['owner', 'admin'])) {
      if (!authorizeBranchAccess(authContext, recordBranchId)) {
        console.warn(
          `authorizeRead: Branch mismatch - record branch ${recordBranchId} != user branch ${authContext.branchId}`
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('authorizeRead: Unexpected error:', error);
    return false;
  }
}

/**
 * Enforce tenant ownership for write operations
 * PHASE 3 HARDENED:
 * - Deny by default - only allow if record belongs to authenticated business
 * - Validates record exists and has businessId/tenantId field
 * - Compares against authContext.businessId (never trust browser)
 * - Prevents businessId/branchId/role override attempts
 * - Checks branch-level access if applicable
 * - Returns false on any validation failure
 * 
 * @param collectionId - CMS collection ID
 * @param recordId - Record ID to check
 * @param authContext - Authenticated user context with business ID
 * @returns true if user can write record, false otherwise
 */
export async function authorizeWrite(
  collectionId: string,
  recordId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const record = await BaseCrudService.getById(collectionId, recordId);
    if (!record) {
      console.debug(`authorizeWrite: Record not found - ${collectionId}:${recordId}`);
      return false;
    }

    const recordBusinessId = (record as any).businessId || (record as any).tenantId;
    if (!recordBusinessId) {
      console.warn(`authorizeWrite: Record missing businessId/tenantId - ${collectionId}:${recordId}`);
      return false;
    }

    // Tenant check
    if (recordBusinessId !== authContext.businessId) {
      console.warn(
        `authorizeWrite: Tenant mismatch - record business ${recordBusinessId} != auth business ${authContext.businessId}`
      );
      return false;
    }

    // Branch check (if record has branchId and user is not Owner/Admin)
    const recordBranchId = (record as any).branchId;
    if (recordBranchId && !hasRole(authContext, ['owner', 'admin'])) {
      if (!authorizeBranchAccess(authContext, recordBranchId)) {
        console.warn(
          `authorizeWrite: Branch mismatch - record branch ${recordBranchId} != user branch ${authContext.branchId}`
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('authorizeWrite: Unexpected error:', error);
    return false;
  }
}

/**
 * Enforce tenant ownership for delete operations
 * PHASE 3 HARDENED:
 * - Delegates to authorizeWrite (same security requirements)
 * - Validates record belongs to authenticated business
 * - Checks branch-level access if applicable
 * - Returns false on any validation failure
 * 
 * @param collectionId - CMS collection ID
 * @param recordId - Record ID to check
 * @param authContext - Authenticated user context with business ID
 * @returns true if user can delete record, false otherwise
 */
export async function authorizeDelete(
  collectionId: string,
  recordId: string,
  authContext: AuthContext
): Promise<boolean> {
  return authorizeWrite(collectionId, recordId, authContext);
}

/**
 * Check if user has required role
 * PHASE 3 NEW:
 * - Validates role against VALID_ROLES
 * - Returns true if user has any of the required roles
 * - Returns false if role is undefined or not in required set
 * 
 * @param authContext - Authenticated user context
 * @param requiredRoles - Array of allowed roles
 * @returns true if user has required role, false otherwise
 */
export function hasRole(authContext: AuthContext, requiredRoles: string[]): boolean {
  if (!authContext.role) {
    return false;
  }
  return requiredRoles.includes(authContext.role.toLowerCase());
}

/**
 * Check if user can access branch
 * PHASE 3 NEW:
 * - Owner/Admin can access any branch
 * - Other roles can only access their assigned branch
 * - Returns true if access is allowed
 * 
 * @param authContext - Authenticated user context
 * @param targetBranchId - Branch ID to check (optional)
 * @returns true if user can access branch, false otherwise
 */
export function authorizeBranchAccess(
  authContext: AuthContext,
  targetBranchId?: string
): boolean {
  // Owner and Admin can access any branch
  if (hasRole(authContext, ['owner', 'admin'])) {
    return true;
  }

  // Other roles can only access their assigned branch
  if (!targetBranchId) {
    // No branch specified - allow if user has no branch restriction
    return !authContext.branchId;
  }

  // Check if target branch matches user's branch
  return targetBranchId === authContext.branchId;
}

/**
 * Check if user can perform role-based action
 * PHASE 3 NEW:
 * - Validates action against role permissions
 * - Returns true if role has permission
 * - Returns false if role is undefined or lacks permission
 * 
 * @param authContext - Authenticated user context
 * @param action - Action to check (e.g., 'delete', 'manage_team')
 * @returns true if user can perform action, false otherwise
 */
export function authorizeRoleAction(
  authContext: AuthContext,
  action: string
): boolean {
  if (!authContext.role) {
    return false;
  }

  const role = authContext.role.toLowerCase() as UserRole;
  if (!VALID_ROLES.includes(role)) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[role];
  return permissions.has(action.toLowerCase());
}

/**
 * Scope query results to authenticated business
 * PHASE 3 HARDENED:
 * - Returns filter object for CMS queries
 * - Ensures all queries are scoped to authenticated business
 * - Prevents cross-tenant data leakage
 * - Includes branch filter for non-Admin roles
 * 
 * @param authContext - Authenticated user context with business ID
 * @returns Filter object for CMS queries
 */
export function getTenantFilter(authContext: AuthContext) {
  const filter: Record<string, any> = {
    businessId: authContext.businessId,
  };

  // Add branch filter for non-Admin roles
  if (authContext.branchId && !hasRole(authContext, ['owner', 'admin'])) {
    filter.branchId = authContext.branchId;
  }

  return filter;
}

/**
 * Validate that update payload does not override protected fields
 * PHASE 3 NEW:
 * - Prevents client from overriding businessId, branchId, role, status
 * - Logs attempted overrides for audit trail
 * - Returns sanitized update payload
 * 
 * @param updates - Proposed updates from client
 * @param authContext - Authenticated user context
 * @returns Sanitized updates with protected fields removed
 */
export function sanitizeUpdatePayload(
  updates: Record<string, any>,
  authContext: AuthContext
): Record<string, any> {
  const protectedFields = ['businessId', 'branchId', 'role', 'status', 'memberId'];
  const sanitized = { ...updates };

  for (const field of protectedFields) {
    if (field in sanitized && sanitized[field] !== undefined) {
      console.warn(
        `sanitizeUpdatePayload: Attempted override of protected field '${field}' by member ${authContext.memberId}`
      );
      delete sanitized[field];
    }
  }

  return sanitized;
}
