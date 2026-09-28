/**
 * Backend Authorization Module (.web.ts)
 * Handles tenant isolation, user identity resolution, and permission checks
 * All business logic calls must go through these functions
 * Deny by default - explicit allow only
 */

import { BaseCrudService } from '@/integrations/cms';

export interface AuthContext {
  memberId: string;
  businessId: string;
  branchId?: string;
  role?: string;
}

/**
 * Resolve authenticated user context from server-side session
 * PRODUCTION-GRADE TENANT MAPPING:
 * - Never trust tenantId/businessId from browser - resolve from authoritative BusinessMembers collection
 * - Validates member exists and has active business association
 * - Returns null if not authenticated, membership not found, or status != 'active'
 * - Implements deny-by-default security model
 * - Extracts businessId, branchId, and role from authoritative BusinessMembers record
 * 
 * @param memberId - Member ID from authenticated session
 * @returns AuthContext with validated tenant mapping or null
 */
export async function resolveAuthContext(memberId: string): Promise<AuthContext | null> {
  try {
    if (!memberId) {
      console.warn('resolveAuthContext: No memberId provided');
      return null;
    }

    // Query authoritative BusinessMembers collection for member's business association
    const membershipResult = await BaseCrudService.getAll<any>(
      'businessmembers',
      {},
      { limit: 100 }
    );

    if (!membershipResult || !membershipResult.items) {
      console.warn(`resolveAuthContext: Failed to query BusinessMembers collection`);
      return null;
    }

    // Find active membership for this member
    // Note: If multiple active memberships exist, this is an architecture gap
    // The application should implement legitimate business/branch selection mechanism
    const activeMembership = membershipResult.items.find(
      (m: any) => m.memberId === memberId && m.status === 'active'
    );

    if (!activeMembership) {
      console.warn(
        `resolveAuthContext: No active membership found for member ${memberId}. ` +
        `Possible states: pending, suspended, revoked, or missing membership.`
      );
      return null;
    }

    // Extract authoritative values from BusinessMembers record
    const businessId = activeMembership.businessId;
    const branchId = activeMembership.branchId;
    const role = activeMembership.role;

    if (!businessId) {
      console.warn(
        `resolveAuthContext: Active membership found but businessId is missing for member ${memberId}`
      );
      return null;
    }

    const authContext: AuthContext = {
      memberId,
      businessId,
      branchId,
      role,
    };

    console.debug(
      `resolveAuthContext: Resolved context for member ${memberId} -> business ${businessId}, ` +
      `branch ${branchId || 'none'}, role ${role || 'none'}`
    );
    return authContext;
  } catch (error) {
    console.error('Failed to resolve auth context:', error);
    return null;
  }
}

/**
 * Enforce tenant ownership for read operations
 * PRODUCTION-GRADE SECURITY:
 * - Deny by default - only allow if record belongs to authenticated business
 * - Validates record exists and has businessId/tenantId field
 * - Compares against authContext.businessId (never trust browser)
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

    const authorized = recordBusinessId === authContext.businessId;
    if (!authorized) {
      console.warn(
        `authorizeRead: Tenant mismatch - record business ${recordBusinessId} != auth business ${authContext.businessId}`
      );
    }

    return authorized;
  } catch (error) {
    console.error('Authorization check failed:', error);
    return false;
  }
}

/**
 * Enforce tenant ownership for write operations
 * PRODUCTION-GRADE SECURITY:
 * - Deny by default - only allow if record belongs to authenticated business
 * - Validates record exists and has businessId/tenantId field
 * - Compares against authContext.businessId (never trust browser)
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

    const authorized = recordBusinessId === authContext.businessId;
    if (!authorized) {
      console.warn(
        `authorizeWrite: Tenant mismatch - record business ${recordBusinessId} != auth business ${authContext.businessId}`
      );
    }

    return authorized;
  } catch (error) {
    console.error('Authorization check failed:', error);
    return false;
  }
}

/**
 * Enforce tenant ownership for delete operations
 * PRODUCTION-GRADE SECURITY:
 * - Delegates to authorizeWrite (same security requirements)
 * - Validates record belongs to authenticated business
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
 * Scope query results to authenticated business
 * PRODUCTION-GRADE TENANT FILTERING:
 * - Returns filter object for CMS queries
 * - Ensures all queries are scoped to authenticated business
 * - Prevents cross-tenant data leakage
 * 
 * @param authContext - Authenticated user context with business ID
 * @returns Filter object for CMS queries
 */
export function getTenantFilter(authContext: AuthContext) {
  return {
    businessId: authContext.businessId,
  };
}
