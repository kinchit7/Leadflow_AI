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
 * Never trust tenantId/businessId from browser - resolve from member
 * Returns null if not authenticated
 */
export async function resolveAuthContext(memberId: string): Promise<AuthContext | null> {
  try {
    if (!memberId) return null;

    // Resolve businessId from member's business association
    // For now, use a default business - this must be replaced with real tenant resolution
    const businessId = memberId ? `business-${memberId}` : 'default-business';
    
    return {
      memberId,
      businessId,
      branchId: undefined,
      role: undefined,
    };
  } catch (error) {
    console.error('Failed to resolve auth context:', error);
    return null;
  }
}

/**
 * Enforce tenant ownership for read operations
 * Deny by default - only allow if record belongs to authenticated business
 */
export async function authorizeRead(
  collectionId: string,
  recordId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const record = await BaseCrudService.getById(collectionId, recordId);
    if (!record) return false;

    const recordBusinessId = (record as any).businessId || (record as any).tenantId;
    if (!recordBusinessId) {
      return false;
    }

    return recordBusinessId === authContext.businessId;
  } catch (error) {
    console.error('Authorization check failed:', error);
    return false;
  }
}

/**
 * Enforce tenant ownership for write operations
 */
export async function authorizeWrite(
  collectionId: string,
  recordId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const record = await BaseCrudService.getById(collectionId, recordId);
    if (!record) return false;

    const recordBusinessId = (record as any).businessId || (record as any).tenantId;
    if (!recordBusinessId) return false;

    return recordBusinessId === authContext.businessId;
  } catch (error) {
    console.error('Authorization check failed:', error);
    return false;
  }
}

/**
 * Enforce tenant ownership for delete operations
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
 */
export function getTenantFilter(authContext: AuthContext) {
  return {
    businessId: authContext.businessId,
  };
}
