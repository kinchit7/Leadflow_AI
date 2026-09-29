/**
 * Business Selector & Context Switching Module (.web.ts)
 * PHASE 3D: Secure membership discovery and business context switching
 * 
 * Responsibilities:
 * 1. Discover authorized memberships for authenticated user
 * 2. Validate business context switches
 * 3. Manage secure session state
 * 4. Enforce authorization boundaries
 * 
 * SECURITY PRINCIPLES:
 * - Server-side authority: Never trust client-supplied businessId
 * - Deny by default: Explicit allow only
 * - Audit trail: Log all context switches
 * - Isolation: Clear stale state on switch
 */

import { BaseCrudService } from '@/integrations/cms';
import { BusinessMembers, Businesses } from '@/entities';
import { AuthContext, hasRole, VALID_ROLES } from './auth.web';

/**
 * Membership discovery result
 */
export interface MembershipInfo {
  _id: string;
  businessId: string;
  businessName?: string;
  role?: string;
  branchId?: string;
  status: string;
}

/**
 * Business context switch result
 */
export interface ContextSwitchResult {
  success: boolean;
  authContext?: AuthContext;
  error?: string;
  timestamp: Date;
}

/**
 * PHASE 1: Discover authorized memberships for authenticated user
 * 
 * Returns only:
 * - Active memberships
 * - Necessary fields (businessId, role, branchId)
 * - Excludes inactive/revoked memberships
 * - Excludes pending memberships
 * 
 * @param memberId - Authenticated member ID (from Wix session)
 * @returns Array of authorized memberships or empty array
 */
export async function discoverAuthorizedMemberships(
  memberId: string
): Promise<MembershipInfo[]> {
  try {
    // Validate memberId
    if (!memberId || typeof memberId !== 'string' || memberId.trim() === '') {
      console.warn('discoverAuthorizedMemberships: Invalid memberId');
      return [];
    }

    // Query BusinessMembers collection
    // LIMITATION: No server-side filtering by memberId - must filter in memory
    const membershipResult = await BaseCrudService.getAll<BusinessMembers>(
      'businessmembers',
      [],
      { limit: 100 }
    );

    if (!membershipResult || !Array.isArray(membershipResult.items)) {
      console.error('discoverAuthorizedMemberships: Failed to query BusinessMembers');
      return [];
    }

    // Filter for active memberships only
    const activeMemberships = membershipResult.items.filter(
      (m: BusinessMembers) =>
        m.memberId === memberId &&
        m.status === 'active' &&
        m.businessId &&
        typeof m.businessId === 'string'
    );

    if (activeMemberships.length === 0) {
      console.debug(`discoverAuthorizedMemberships: No active memberships for ${memberId}`);
      return [];
    }

    // Enrich with business names
    const enriched: MembershipInfo[] = [];
    for (const membership of activeMemberships) {
      try {
        const business = await BaseCrudService.getById<Businesses>(
          'businesses',
          membership.businessId!
        );

        enriched.push({
          _id: membership._id!,
          businessId: membership.businessId!,
          businessName: business?.businessName || 'Unknown Business',
          role: membership.role?.toLowerCase(),
          branchId: membership.branchId,
          status: membership.status!,
        });
      } catch (err) {
        console.warn(
          `discoverAuthorizedMemberships: Failed to fetch business ${membership.businessId}`,
          err
        );
        // Include membership even if business fetch fails
        enriched.push({
          _id: membership._id!,
          businessId: membership.businessId!,
          role: membership.role?.toLowerCase(),
          branchId: membership.branchId,
          status: membership.status!,
        });
      }
    }

    console.debug(
      `discoverAuthorizedMemberships: Found ${enriched.length} active memberships for ${memberId}`
    );
    return enriched;
  } catch (error) {
    console.error('discoverAuthorizedMemberships: Unexpected error:', error);
    return [];
  }
}

/**
 * PHASE 3: Server-validated context switching
 * 
 * Validates:
 * 1. Member exists and is authenticated
 * 2. Destination business membership exists and is active
 * 3. Member has permission to access destination business
 * 4. Role and branch assignments are valid
 * 
 * Returns new AuthContext on success, null on failure
 * 
 * @param memberId - Authenticated member ID
 * @param targetBusinessId - Destination business ID
 * @returns ContextSwitchResult with new AuthContext or error
 */
export async function switchBusinessContext(
  memberId: string,
  targetBusinessId: string
): Promise<ContextSwitchResult> {
  const timestamp = new Date();

  try {
    // Validate inputs
    if (!memberId || typeof memberId !== 'string' || memberId.trim() === '') {
      console.warn('switchBusinessContext: Invalid memberId');
      return {
        success: false,
        error: 'Invalid member ID',
        timestamp,
      };
    }

    if (!targetBusinessId || typeof targetBusinessId !== 'string' || targetBusinessId.trim() === '') {
      console.warn('switchBusinessContext: Invalid targetBusinessId');
      return {
        success: false,
        error: 'Invalid business ID',
        timestamp,
      };
    }

    // Discover all authorized memberships
    const memberships = await discoverAuthorizedMemberships(memberId);

    if (memberships.length === 0) {
      console.warn(`switchBusinessContext: No authorized memberships for ${memberId}`);
      return {
        success: false,
        error: 'No authorized memberships found',
        timestamp,
      };
    }

    // Find membership for target business
    const targetMembership = memberships.find(
      (m) => m.businessId === targetBusinessId
    );

    if (!targetMembership) {
      console.warn(
        `switchBusinessContext: Member ${memberId} not authorized for business ${targetBusinessId}`
      );
      return {
        success: false,
        error: 'Unauthorized business access',
        timestamp,
      };
    }

    // Validate role
    if (targetMembership.role && !VALID_ROLES.includes(targetMembership.role as any)) {
      console.error(
        `switchBusinessContext: Invalid role '${targetMembership.role}' for member ${memberId}`
      );
      return {
        success: false,
        error: 'Invalid role assignment',
        timestamp,
      };
    }

    // Build new AuthContext
    const newAuthContext: AuthContext = {
      memberId,
      businessId: targetBusinessId,
      branchId: targetMembership.branchId,
      role: targetMembership.role as any,
    };

    // Log context switch for audit trail
    console.info(
      `switchBusinessContext: Member ${memberId} switched to business ${targetBusinessId} ` +
      `(role: ${targetMembership.role || 'none'}, branch: ${targetMembership.branchId || 'none'})`
    );

    return {
      success: true,
      authContext: newAuthContext,
      timestamp,
    };
  } catch (error) {
    console.error('switchBusinessContext: Unexpected error:', error);
    return {
      success: false,
      error: 'Context switch failed',
      timestamp,
    };
  }
}

/**
 * PHASE 4: Clear stale state on successful context switch
 * 
 * Clears:
 * - Cached tenant records
 * - Business-scoped filters
 * - Search state
 * - Pagination state
 * 
 * @param previousBusinessId - Previous business context
 * @param newBusinessId - New business context
 */
export function clearStaleState(
  previousBusinessId: string,
  newBusinessId: string
): void {
  try {
    // Clear localStorage entries scoped to previous business
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`business:${previousBusinessId}`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      localStorage.removeItem(key);
    }

    // Clear sessionStorage entries scoped to previous business
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes(`business:${previousBusinessId}`)) {
        sessionStorage.removeItem(key);
      }
    }

    console.debug(
      `clearStaleState: Cleared ${keysToDelete.length} stale entries for business ${previousBusinessId}`
    );
  } catch (error) {
    console.error('clearStaleState: Error clearing stale state:', error);
  }
}

/**
 * PHASE 5: Enforce branch authorization
 * 
 * Validates that user can access specified branch within their business
 * 
 * @param authContext - Current auth context
 * @param targetBranchId - Branch to access
 * @returns true if authorized, false otherwise
 */
export function authorizeBranchAccess(
  authContext: AuthContext,
  targetBranchId?: string
): boolean {
  // Owner/Admin can access any branch
  if (hasRole(authContext, ['owner', 'admin'])) {
    return true;
  }

  // Other roles can only access their assigned branch
  if (!targetBranchId) {
    return !authContext.branchId;
  }

  return targetBranchId === authContext.branchId;
}

/**
 * PHASE 6: Validate demo operation authorization
 * 
 * Only Owner/Admin can perform demo operations
 * Prevents unauthorized demo access
 * 
 * @param authContext - Current auth context
 * @returns true if authorized for demo operations, false otherwise
 */
export function validateDemoOperationAuthorization(authContext: AuthContext): boolean {
  if (!authContext) {
    return false;
  }

  return hasRole(authContext, ['owner', 'admin']);
}
