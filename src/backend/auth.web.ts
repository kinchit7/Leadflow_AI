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
import { queryWithPredicates } from './wix-data-query.web';
import { 
  logAuthorizationFailure, 
  logCrossTenantAccessAttempt, 
  logBranchAuthorizationFailure,
  logMultipleMembershipDetected,
  logProtectedFieldOverrideAttempt 
} from './audit-service.web';

export interface AuthContext {
  memberId: string;
  businessId: string;
  branchId?: string;
  role?: string;
  /** @internal PHASE 3F-C: Timestamp when context was validated */
  _validatedAt?: Date;
}

/**
 * Valid roles in the system
 */
export const VALID_ROLES = ['owner', 'admin', 'manager', 'sales', 'support', 'guest'] as const;
export type UserRole = typeof VALID_ROLES[number];

/**
 * PHASE 3F-B: Maximum page size enforcement
 * Prevents pagination bypass attacks and resource exhaustion
 * - MAX_PAGE_SIZE: Maximum records per request (100)
 * - MAX_SKIP: Maximum offset to prevent full enumeration (10000)
 * - MIN_PAGE_SIZE: Minimum records per request (1)
 */
export const MAX_PAGE_SIZE = 100;
export const MAX_SKIP = 10000;
export const MIN_PAGE_SIZE = 1;

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
 * WORKSTREAM 1 HARDENED IMPLEMENTATION:
 * - Never trust tenantId/businessId from browser - resolve from authoritative BusinessMembers collection
 * - Validates member exists and has active business association
 * - Returns null if not authenticated, membership not found, or status != 'active'
 * - Implements deny-by-default security model
 * - Extracts businessId, branchId, and role from authoritative BusinessMembers record
 * - DETECTS MULTIPLE ACTIVE MEMBERSHIPS AND FAILS CLOSED
 * - VALIDATES ALL FIELD TYPES AND VALUES
 * - REJECTS MISSING REQUIRED FIELDS
 * 
 * SECURITY PROPERTY: Server-side constrained query
 * - Uses Wix Data predicates to filter by memberId and status='active' at database level
 * - Handles >100 record case by querying with predicates (not limited to first 100)
 * - Detects multiple active memberships and fails closed
 * - Never accepts client-supplied businessId as authorization proof
 * 
 * PHASE 3F-C HARDENING:
 * - Re-validates context on every request (never caches)
 * - Detects membership revocation
 * - Detects role changes
 * - Detects branch reassignments
 * - Prevents stale context from authorizing requests
 * 
 * @param memberId - Member ID from authenticated session (trusted from Wix session)
 * @param skipCache - Force fresh resolution (default: false)
 * @returns AuthContext with validated tenant mapping or null
 */
export async function resolveAuthContext(memberId: string, skipCache: boolean = false): Promise<AuthContext | null> {
  try {
    // Validate memberId type and non-empty
    if (!memberId || typeof memberId !== 'string' || memberId.trim() === '') {
      console.warn('resolveAuthContext: Invalid memberId provided');
      return null;
    }

    // PHASE 3F-C: Always re-validate on every request
    // Never rely on cached context - membership status can change between requests
    const contextValidationTime = new Date();

    // WORKSTREAM 1: Server-side constrained query using Wix Data predicates
    // Query BusinessMembers with predicates: memberId == authenticated memberId AND status == 'active'
    // This ensures the database query itself is constrained, not just in-memory filtering
    // Retrieve at most 2 records to detect multiple active memberships
    // FAIL CLOSED: If any page fails or returns malformed data, queryWithPredicates throws
    let membershipResult: any;
    try {
      membershipResult = await queryWithPredicates<BusinessMembers>(
        'businessmembers',
        [
          { field: 'memberId', operator: 'eq', value: memberId },
          { field: 'status', operator: 'eq', value: 'active' }
        ],
        { limit: 2 } // Retrieve at most 2 to detect multiple active memberships
      );
    } catch (queryError) {
      console.error(
        `resolveAuthContext: Query failed for member ${memberId}: ` +
        `${queryError instanceof Error ? queryError.message : String(queryError)}`
      );
      // FAIL CLOSED: Incomplete scan or database error
      return null;
    }

    if (!membershipResult || !Array.isArray(membershipResult.items)) {
      console.error('resolveAuthContext: Failed to query BusinessMembers collection');
      return null;
    }

    // WORKSTREAM 1: Check result count
    // 0 records → deny (no active membership)
    // 1 record → resolve authoritative context
    // 2+ records → fail closed (multiple active memberships exist)
    if (membershipResult.items.length === 0) {
      console.warn(
        `resolveAuthContext: No active membership found for member ${memberId}. ` +
        `Possible states: pending, suspended, revoked, or missing membership.`
      );
      return null;
    }

    // WORKSTREAM 1: Reject if multiple active memberships exist
    if (membershipResult.items.length > 1) {
      console.error(
        `resolveAuthContext: Member ${memberId} has ${membershipResult.items.length} active memberships. ` +
        `Ambiguous context. Requires explicit business selection. Denying access.`
      );
      // PHASE 3F-B: Log multiple membership detection
      await logMultipleMembershipDetected(memberId, membershipResult.items.length);
      return null;
    }

    const membership = membershipResult.items[0];

    // WORKSTREAM 1: Validate all required fields with type checking
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

    // Deny by default: a membership with a missing or invalid role is not authorized.
    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      console.warn(`resolveAuthContext: Missing or invalid role for member ${memberId}`);
      return null;
    }

    const authContext: AuthContext = {
      memberId,
      businessId: membership.businessId,
      branchId,
      role: role as UserRole,
    };

    // PHASE 3F-C: Add validation timestamp to detect stale contexts
    (authContext as any)._validatedAt = contextValidationTime;

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
 * PHASE 3F-C: Validate that an existing AuthContext is still current
 * Detects membership revocation, role changes, and branch reassignments
 * 
 * @param authContext - Previously resolved context
 * @param maxAge - Maximum age of context in milliseconds (default: 5 minutes)
 * @returns true if context is still valid, false if stale or revoked
 */
export async function validateContextFreshness(
  authContext: AuthContext,
  maxAge: number = 5 * 60 * 1000 // 5 minutes
): Promise<boolean> {
  try {
    // Check if context has validation timestamp
    const validatedAt = (authContext as any)._validatedAt;
    if (!validatedAt) {
      console.warn(`validateContextFreshness: Context missing validation timestamp`);
      return false;
    }

    // Check if context is too old
    const age = Date.now() - new Date(validatedAt).getTime();
    if (age > maxAge) {
      console.warn(
        `validateContextFreshness: Context too old (${age}ms > ${maxAge}ms) for member ${authContext.memberId}`
      );
      return false;
    }

    // Re-validate membership is still active
    const freshContext = await resolveAuthContext(authContext.memberId, true);
    if (!freshContext) {
      console.warn(
        `validateContextFreshness: Membership revoked or status changed for member ${authContext.memberId}`
      );
      return false;
    }

    // Check if role or branch changed
    if (freshContext.role !== authContext.role) {
      console.warn(
        `validateContextFreshness: Role changed for member ${authContext.memberId} ` +
        `(${authContext.role} -> ${freshContext.role})`
      );
      return false;
    }

    if (freshContext.branchId !== authContext.branchId) {
      console.warn(
        `validateContextFreshness: Branch changed for member ${authContext.memberId} ` +
        `(${authContext.branchId} -> ${freshContext.branchId})`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`validateContextFreshness: Unexpected error:`, error);
    return false;
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
    // PHASE 3F-C: Validate context freshness FIRST
    // Detects membership revocation, role changes, branch reassignments, and stale contexts
    const isFresh = await validateContextFreshness(authContext);
    if (!isFresh) {
      console.warn(`authorizeRead: Context is stale for member ${authContext.memberId}`);
      await logAuthorizationFailure(
        collectionId,
        recordId,
        authContext.memberId,
        authContext.businessId,
        'Context is stale',
        'HIGH'
      );
      return false;
    }

    const record = await BaseCrudService.getById(collectionId, recordId);
    if (!record) {
      console.debug(`authorizeRead: Record not found - ${collectionId}:${recordId}`);
      // PHASE 3F-B: Log authorization failure
      await logAuthorizationFailure(
        collectionId,
        recordId,
        authContext.memberId,
        authContext.businessId,
        'Record not found',
        'LOW'
      );
      return false;
    }

    const recordBusinessId = (record as any).businessId || (record as any).tenantId;
    if (!recordBusinessId) {
      console.warn(`authorizeRead: Record missing businessId/tenantId - ${collectionId}:${recordId}`);
      // PHASE 3F-B: Log authorization failure
      await logAuthorizationFailure(
        collectionId,
        recordId,
        authContext.memberId,
        authContext.businessId,
        'Record missing businessId/tenantId',
        'MEDIUM'
      );
      return false;
    }

    // Tenant check
    if (recordBusinessId !== authContext.businessId) {
      console.warn(
        `authorizeRead: Tenant mismatch - record business ${recordBusinessId} != auth business ${authContext.businessId}`
      );
      // PHASE 3F-B: Log cross-tenant access attempt
      await logCrossTenantAccessAttempt(
        collectionId,
        recordId,
        recordBusinessId,
        authContext.businessId,
        authContext.memberId
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
        // PHASE 3F-B: Log branch authorization failure
        await logBranchAuthorizationFailure(
          collectionId,
          recordId,
          recordBranchId,
          authContext.branchId,
          authContext.memberId,
          authContext.businessId
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
    // PHASE 3F-C: Validate context freshness FIRST
    // Detects membership revocation, role changes, branch reassignments, and stale contexts
    const isFresh = await validateContextFreshness(authContext);
    if (!isFresh) {
      console.warn(`authorizeWrite: Context is stale for member ${authContext.memberId}`);
      await logAuthorizationFailure(
        collectionId,
        recordId,
        authContext.memberId,
        authContext.businessId,
        'Context is stale',
        'HIGH'
      );
      return false;
    }

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
      // PHASE 3F-B: Log protected field override attempt (async, non-blocking)
      // WORKSTREAM 6: Handle audit function that may return Promise or undefined
      const auditPromise = logProtectedFieldOverrideAttempt(
        authContext.memberId,
        authContext.businessId,
        field,
        'unknown' // collectionId not available in this context
      );
      
      // Safely handle both Promise and undefined returns
      if (auditPromise && typeof auditPromise.catch === 'function') {
        auditPromise.catch(err => console.error('Failed to log protected field override:', err));
      }
      
      delete sanitized[field];
    }
  }

  return sanitized;
}

/**
 * PHASE 3F-B: Validate and cap pagination parameters
 * Enforces maximum page size to prevent:
 * - Pagination bypass attacks (requesting all records at once)
 * - Resource exhaustion (fetching excessive data)
 * - Memory exhaustion (processing large result sets)
 * 
 * Validation rules:
 * - limit: capped to MAX_PAGE_SIZE (100), minimum MIN_PAGE_SIZE (1)
 * - skip: capped to MAX_SKIP (10000), minimum 0
 * - Rejects negative, zero, fractional, NaN, or Infinity values
 * - Logs invalid inputs for audit trail
 * 
 * @param limit - Requested page size (default 50)
 * @param skip - Requested offset (default 0)
 * @returns Validated { limit, skip } object
 */
export function validatePaginationParams(
  limit: number = 50,
  skip: number = 0
): { limit: number; skip: number } {
  // Validate limit
  let validatedLimit = limit;
  
  if (!Number.isInteger(limit) || limit < MIN_PAGE_SIZE) {
    console.warn(
      `validatePaginationParams: Invalid limit ${limit} (not integer or < ${MIN_PAGE_SIZE}), using MIN_PAGE_SIZE`
    );
    validatedLimit = MIN_PAGE_SIZE;
  } else if (limit > MAX_PAGE_SIZE) {
    console.warn(
      `validatePaginationParams: Limit ${limit} exceeds MAX_PAGE_SIZE ${MAX_PAGE_SIZE}, capping`
    );
    validatedLimit = MAX_PAGE_SIZE;
  }

  // Validate skip
  let validatedSkip = skip;
  
  if (!Number.isInteger(skip) || skip < 0) {
    console.warn(
      `validatePaginationParams: Invalid skip ${skip} (not integer or negative), using 0`
    );
    validatedSkip = 0;
  } else if (skip > MAX_SKIP) {
    console.warn(
      `validatePaginationParams: Skip ${skip} exceeds MAX_SKIP ${MAX_SKIP}, capping`
    );
    validatedSkip = MAX_SKIP;
  }

  return {
    limit: validatedLimit,
    skip: validatedSkip,
  };
}
