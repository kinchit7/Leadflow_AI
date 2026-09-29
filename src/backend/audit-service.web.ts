/**
 * Audit Logging Service - PHASE 3F-B
 * Persistent security audit logging for forensic analysis and compliance
 * 
 * Records:
 * - Authorization failures and denials
 * - Sensitive operations (create, update, delete)
 * - Cross-tenant access attempts
 * - Branch authorization violations
 * - Multiple membership detection
 * - Protected field override attempts
 * 
 * Does NOT record:
 * - Passwords, access tokens, secrets
 * - Unnecessary customer PII
 * - Successful read operations (high volume)
 */

import { BaseCrudService } from '@/integrations/cms';
import { AuditLogs } from '@/entities';

export interface AuditEvent {
  action: string;
  memberId?: string;
  businessId?: string;
  resourceType?: string;
  resourceId?: string;
  result: 'success' | 'failure';
  reason?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  correlationId?: string;
}

/**
 * Log audit event to persistent storage
 * PHASE 3F-B IMPLEMENTATION:
 * - Writes to auditlogs collection
 * - Includes timestamp, actor, action, resource, outcome
 * - Logs failures for forensic analysis
 * - Prevents audit failures from bypassing authorization
 * - Does not record sensitive data (passwords, tokens, secrets)
 * 
 * @param event - Audit event to log
 * @returns Promise that resolves when audit is persisted
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const auditLog: AuditLogs = {
      _id: crypto.randomUUID(),
      actionPerformed: event.action,
      userId: event.memberId,
      resourceAffected: event.resourceType && event.resourceId 
        ? `${event.resourceType}:${event.resourceId}`
        : event.resourceType || 'unknown',
      timestamp: new Date(),
      details: JSON.stringify({
        result: event.result,
        reason: event.reason,
        severity: event.severity,
        businessId: event.businessId,
        correlationId: event.correlationId,
      }),
      ipAddress: 'unknown', // TODO: Extract from request context in production
    };

    await BaseCrudService.create('auditlogs', auditLog);
    
    console.debug(
      `logAuditEvent: Logged ${event.action} (${event.result}) for member ${event.memberId} ` +
      `on ${event.resourceType}:${event.resourceId}`
    );
  } catch (error) {
    // CRITICAL: Audit failures must not bypass authorization
    // Log error but do not throw - audit logging is best-effort
    console.error('logAuditEvent: Failed to persist audit log:', error);
    console.error('logAuditEvent: Audit logging failure - security event may not be recorded');
  }
}

/**
 * Log authorization failure
 * @param collectionId - Collection being accessed
 * @param recordId - Record ID
 * @param memberId - Member attempting access
 * @param businessId - Business context
 * @param reason - Denial reason
 * @param severity - Severity level
 */
export async function logAuthorizationFailure(
  collectionId: string,
  recordId: string,
  memberId: string,
  businessId: string,
  reason: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
): Promise<void> {
  await logAuditEvent({
    action: 'authorize_denied',
    memberId,
    businessId,
    resourceType: collectionId,
    resourceId: recordId,
    result: 'failure',
    reason,
    severity,
  });
}

/**
 * Log successful sensitive operation
 * @param action - Action performed (create, update, delete)
 * @param collectionId - Collection
 * @param recordId - Record ID
 * @param memberId - Member performing action
 * @param businessId - Business context
 */
export async function logSensitiveOperation(
  action: string,
  collectionId: string,
  recordId: string,
  memberId: string,
  businessId: string
): Promise<void> {
  await logAuditEvent({
    action: `${action}_success`,
    memberId,
    businessId,
    resourceType: collectionId,
    resourceId: recordId,
    result: 'success',
    severity: 'LOW',
  });
}

/**
 * Log cross-tenant access attempt
 * @param collectionId - Collection
 * @param recordId - Record ID
 * @param recordBusinessId - Business ID of record
 * @param authBusinessId - Business ID of authenticated user
 * @param memberId - Member attempting access
 */
export async function logCrossTenantAccessAttempt(
  collectionId: string,
  recordId: string,
  recordBusinessId: string,
  authBusinessId: string,
  memberId: string
): Promise<void> {
  await logAuditEvent({
    action: 'cross_tenant_access_attempt',
    memberId,
    businessId: authBusinessId,
    resourceType: collectionId,
    resourceId: recordId,
    result: 'failure',
    reason: `Tenant mismatch: record business ${recordBusinessId} != auth business ${authBusinessId}`,
    severity: 'HIGH',
  });
}

/**
 * Log branch authorization violation
 * @param collectionId - Collection
 * @param recordId - Record ID
 * @param recordBranchId - Branch ID of record
 * @param userBranchId - Branch ID of user
 * @param memberId - Member attempting access
 * @param businessId - Business context
 */
export async function logBranchAuthorizationFailure(
  collectionId: string,
  recordId: string,
  recordBranchId: string,
  userBranchId: string | undefined,
  memberId: string,
  businessId: string
): Promise<void> {
  await logAuditEvent({
    action: 'branch_authorization_denied',
    memberId,
    businessId,
    resourceType: collectionId,
    resourceId: recordId,
    result: 'failure',
    reason: `Branch mismatch: record branch ${recordBranchId} != user branch ${userBranchId || 'none'}`,
    severity: 'MEDIUM',
  });
}

/**
 * Log multiple membership detection
 * @param memberId - Member with multiple memberships
 * @param count - Number of active memberships
 */
export async function logMultipleMembershipDetected(
  memberId: string,
  count: number
): Promise<void> {
  await logAuditEvent({
    action: 'multiple_membership_detected',
    memberId,
    result: 'failure',
    reason: `Member has ${count} active memberships - ambiguous context`,
    severity: 'HIGH',
  });
}

/**
 * Log protected field override attempt
 * @param memberId - Member attempting override
 * @param businessId - Business context
 * @param fieldName - Protected field name
 * @param collectionId - Collection being updated
 */
export async function logProtectedFieldOverrideAttempt(
  memberId: string,
  businessId: string,
  fieldName: string,
  collectionId: string
): Promise<void> {
  await logAuditEvent({
    action: 'protected_field_override_attempt',
    memberId,
    businessId,
    resourceType: collectionId,
    result: 'failure',
    reason: `Attempted to override protected field: ${fieldName}`,
    severity: 'MEDIUM',
  });
}
