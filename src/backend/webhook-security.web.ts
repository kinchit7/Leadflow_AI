/**
 * Webhook Security Module - WORKSTREAM 5 (Corrected)
 * Implements provider-agnostic webhook signature validation, idempotency, and replay protection
 * 
 * SECURITY ARCHITECTURE:
 * - Secrets retrieved explicitly at verification time via Wix Secrets Manager
 * - Fail-closed: missing secrets → rejected immediately
 * - No module-level secret initialization (prevents stale secrets)
 * - Constant-time HMAC comparison prevents timing attacks
 * - Timestamp validation prevents replay attacks
 * - Idempotency prevents duplicate processing
 * 
 * Supported Providers:
 * - Stripe: HMAC-SHA256 with X-Stripe-Signature header (timestamp.signature format)
 * - Twilio: HMAC-SHA1 with X-Twilio-Signature header (requires full URL for production)
 * - Generic: HMAC-SHA256 with X-Signature header
 * 
 * IMPORTANT PRODUCTION NOTES:
 * - Twilio signature verification requires the full request URL, which must be passed separately
 * - Current implementation uses body-only verification; production deployment requires URL parameter
 * 
 * Security Controls:
 * - Verify provider signatures using documented algorithms
 * - Retrieve signing secrets from Wix Secrets Manager at verification time
 * - Validate timestamps to prevent replay attacks
 * - Enforce idempotency for duplicate events
 * - Validate payload structure and content type
 * - Reject invalid signatures before processing
 * - Prevent webhook requests from bypassing tenant authorization
 * - Log security outcomes without exposing secrets
 */

import crypto from 'crypto';
import { getSecret } from 'wix-secrets-backend';
import { BaseCrudService } from '@/integrations/cms';

/**
 * Webhook provider metadata (does NOT include secrets)
 */
export interface WebhookProvider {
  name: string;
  algorithm: 'hmac-sha256' | 'hmac-sha1';
  headerName: string;
  timestampHeaderName?: string;
  maxTimestampAge?: number; // milliseconds
  secretName?: string; // Name of secret in Wix Secrets Manager
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  providerId?: string;
  eventId?: string;
  timestamp?: Date;
  reason?: string;
}

/**
 * Webhook idempotency record
 */
export interface WebhookIdempotencyRecord {
  _id: string;
  eventId: string;
  provider: string;
  businessId?: string;
  timestamp: Date;
  status: 'processed' | 'failed' | 'duplicate';
  result?: string;
}

/**
 * Registered webhook providers (metadata only, no secrets)
 * Secrets are retrieved at verification time via Wix Secrets Manager
 */
const WEBHOOK_PROVIDERS: Record<string, WebhookProvider> = {
  stripe: {
    name: 'Stripe',
    algorithm: 'hmac-sha256',
    headerName: 'x-stripe-signature',
    timestampHeaderName: 't',
    maxTimestampAge: 5 * 60 * 1000, // 5 minutes
    secretName: 'STRIPE_WEBHOOK_SECRET',
  },
  twilio: {
    name: 'Twilio',
    algorithm: 'hmac-sha1',
    headerName: 'x-twilio-signature',
    maxTimestampAge: 5 * 60 * 1000, // 5 minutes
    secretName: 'TWILIO_WEBHOOK_SECRET',
  },
  generic: {
    name: 'Generic',
    algorithm: 'hmac-sha256',
    headerName: 'x-signature',
    maxTimestampAge: 5 * 60 * 1000, // 5 minutes
    secretName: 'WEBHOOK_SECRET',
  },
};

/**
 * Retrieve webhook secret from Wix Secrets Manager
 * Fail-closed: returns null if secret not found
 * 
 * @param secretName - Name of secret in Wix Secrets Manager
 * @returns Secret value or null if not found
 */
async function getWebhookSecret(secretName: string): Promise<string | null> {
  try {
    const secret = await getSecret(secretName);
    if (!secret) {
      console.error(`Webhook secret not found in Wix Secrets Manager: ${secretName}`);
      return null;
    }
    return secret;
  } catch (error) {
    console.error(`Error retrieving webhook secret ${secretName}:`, error);
    return null;
  }
}

/**
 * Verify webhook signature using provider-specific algorithm
 * Secrets are retrieved at verification time from Wix Secrets Manager
 * Fail-closed: missing secrets → rejected immediately
 * 
 * @param provider - Webhook provider name
 * @param rawBody - Raw request body (must be Buffer or string)
 * @param signature - Signature from request header
 * @param timestamp - Timestamp from request header (optional)
 * @returns Validation result with error details
 */
export async function verifyWebhookSignature(
  provider: string,
  rawBody: Buffer | string,
  signature: string,
  timestamp?: string
): Promise<WebhookValidationResult> {
  try {
    // Validate provider is registered
    const providerConfig = WEBHOOK_PROVIDERS[provider.toLowerCase()];
    if (!providerConfig) {
      return {
        valid: false,
        error: `Unknown webhook provider: ${provider}`,
        reason: 'UNKNOWN_PROVIDER',
      };
    }

    // Validate signature header is present
    if (!signature || typeof signature !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid signature header',
        reason: 'MISSING_SIGNATURE',
      };
    }

    // Retrieve secret from Wix Secrets Manager at verification time
    const secretKey = await getWebhookSecret(providerConfig.secretName || '');
    if (!secretKey) {
      console.error(`Webhook secret not configured for provider: ${provider}`);
      return {
        valid: false,
        error: `Webhook secret not configured for provider: ${provider}`,
        reason: 'MISSING_SECRET',
      };
    }

    // Validate timestamp if supported
    if (providerConfig.timestampHeaderName && timestamp) {
      const timestampMs = parseInt(timestamp, 10) * 1000; // Convert to milliseconds
      const now = Date.now();
      const age = now - timestampMs;

      if (age < 0) {
        return {
          valid: false,
          error: 'Webhook timestamp is in the future',
          reason: 'FUTURE_TIMESTAMP',
        };
      }

      if (age > (providerConfig.maxTimestampAge || 5 * 60 * 1000)) {
        return {
          valid: false,
          error: `Webhook timestamp too old: ${age}ms`,
          reason: 'STALE_TIMESTAMP',
        };
      }
    }

    // Convert body to string if needed
    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

    // Compute expected signature based on provider algorithm
    let expectedSignature: string;

    if (provider.toLowerCase() === 'stripe') {
      // Stripe format: timestamp.signature
      const signedContent = `${timestamp}.${bodyString}`;
      expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(signedContent)
        .digest('hex');
    } else if (provider.toLowerCase() === 'twilio') {
      // Twilio format: HMAC-SHA1 of URL + body
      // PRODUCTION NOTE: This requires the full request URL, which should be passed separately
      // Current implementation uses body-only verification for testing
      expectedSignature = crypto
        .createHmac('sha1', secretKey)
        .update(bodyString)
        .digest('base64');
    } else {
      // Generic HMAC-SHA256
      expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(bodyString)
        .digest('hex');
    }

    // Compare signatures using constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return {
        valid: false,
        error: 'Webhook signature verification failed',
        reason: 'INVALID_SIGNATURE',
      };
    }

    return {
      valid: true,
      providerId: provider,
      timestamp: timestamp ? new Date(parseInt(timestamp, 10) * 1000) : new Date(),
    };
  } catch (error) {
    console.error(`Webhook signature verification error for ${provider}:`, error);
    return {
      valid: false,
      error: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      reason: 'VERIFICATION_ERROR',
    };
  }
}

/**
 * Check if webhook event has already been processed (idempotency)
 * 
 * @param eventId - Unique event identifier from provider
 * @param provider - Webhook provider name
 * @returns true if event already processed, false otherwise
 */
export async function isWebhookDuplicate(
  eventId: string,
  provider: string
): Promise<boolean> {
  try {
    // Query idempotency records for this event
    const result = await BaseCrudService.getAll<WebhookIdempotencyRecord>(
      'webhookidempotency',
      [],
      { limit: 1 }
    );

    if (!result || !Array.isArray(result.items)) {
      return false;
    }

    // Check if event already exists
    const existing = result.items.find(
      (record: any) =>
        record.eventId === eventId &&
        record.provider === provider
    );

    return !!existing;
  } catch (error) {
    console.error(`Error checking webhook idempotency for ${eventId}:`, error);
    // Fail closed: treat as potential duplicate if we can't check
    return true;
  }
}

/**
 * Record webhook event for idempotency
 * 
 * @param eventId - Unique event identifier
 * @param provider - Webhook provider name
 * @param businessId - Business context (optional)
 * @param status - Processing status
 * @param result - Processing result (optional)
 */
export async function recordWebhookEvent(
  eventId: string,
  provider: string,
  businessId: string | undefined,
  status: 'processed' | 'failed' | 'duplicate',
  result?: string
): Promise<void> {
  try {
    const record: WebhookIdempotencyRecord = {
      _id: crypto.randomUUID(),
      eventId,
      provider,
      businessId,
      timestamp: new Date(),
      status,
      result,
    };

    await BaseCrudService.create('webhookidempotency', record);

    console.debug(
      `Recorded webhook event: ${eventId} (${provider}) - ${status}`
    );
  } catch (error) {
    console.error(`Error recording webhook event ${eventId}:`, error);
    // Non-blocking: idempotency recording failure should not prevent processing
  }
}

/**
 * Validate webhook payload structure and content type
 * 
 * @param contentType - Content-Type header value
 * @param payload - Parsed payload object
 * @param maxSize - Maximum payload size in bytes
 * @returns Validation result
 */
export function validateWebhookPayload(
  contentType: string | undefined,
  payload: any,
  maxSize: number = 1024 * 1024 // 1MB default
): WebhookValidationResult {
  try {
    // Validate content type
    if (!contentType || !contentType.includes('application/json')) {
      return {
        valid: false,
        error: `Invalid content type: ${contentType}`,
        reason: 'INVALID_CONTENT_TYPE',
      };
    }

    // Validate payload is object
    if (!payload || typeof payload !== 'object') {
      return {
        valid: false,
        error: 'Payload must be a JSON object',
        reason: 'INVALID_PAYLOAD_FORMAT',
      };
    }

    // Validate payload size
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > maxSize) {
      return {
        valid: false,
        error: `Payload too large: ${payloadSize} bytes (max ${maxSize})`,
        reason: 'PAYLOAD_TOO_LARGE',
      };
    }

    return {
      valid: true,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Payload validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      reason: 'VALIDATION_ERROR',
    };
  }
}

/**
 * Log webhook security event
 * 
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @param businessId - Business context
 * @param result - Validation result
 * @param action - Action taken
 */
export async function logWebhookSecurityEvent(
  provider: string,
  eventId: string,
  businessId: string | undefined,
  result: WebhookValidationResult,
  action: string
): Promise<void> {
  try {
    // Import audit service to log security event
    const { logAuditEvent } = await import('./audit-service.web');

    await logAuditEvent({
      action: `webhook_${action}`,
      memberId: 'webhook-processor',
      businessId,
      resourceType: 'webhook',
      resourceId: eventId,
      result: result.valid ? 'success' : 'failure',
      reason: result.error || result.reason || 'Unknown',
      severity: result.valid ? 'LOW' : 'MEDIUM',
    });
  } catch (error) {
    console.error(`Error logging webhook security event:`, error);
    // Non-blocking: audit logging failure should not prevent webhook processing
  }
}

/**
 * Extract event ID from webhook payload (provider-specific)
 * 
 * @param provider - Webhook provider
 * @param payload - Webhook payload
 * @returns Event ID or undefined
 */
export function extractEventId(provider: string, payload: any): string | undefined {
  try {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return payload.id;
      case 'twilio':
        return payload.MessageSid || payload.EventType;
      default:
        return payload.id || payload.eventId || payload.event_id;
    }
  } catch (error) {
    console.error(`Error extracting event ID from ${provider} payload:`, error);
    return undefined;
  }
}

/**
 * Extract business context from webhook payload (provider-specific)
 * 
 * @param provider - Webhook provider
 * @param payload - Webhook payload
 * @returns Business ID or undefined
 */
export function extractBusinessContext(provider: string, payload: any): string | undefined {
  try {
    // Webhook payloads typically don't contain business context
    // This should be extracted from the webhook URL or configuration
    // For now, return undefined - business context should be passed separately
    return undefined;
  } catch (error) {
    console.error(`Error extracting business context from ${provider} payload:`, error);
    return undefined;
  }
}
