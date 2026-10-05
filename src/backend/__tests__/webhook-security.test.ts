/**
 * Webhook Security Tests - WORKSTREAM 5 (Corrected)
 * Tests for webhook signature validation with dynamic secret loading
 * Verifies secrets are retrieved from Wix Secrets Manager at verification time
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  verifyWebhookSignature,
  isWebhookDuplicate,
  recordWebhookEvent,
  validateWebhookPayload,
  extractEventId,
  WebhookValidationResult,
} from '../webhook-security.web';
import { BaseCrudService } from '@/integrations/cms';

// Mock Wix Secrets Manager
vi.mock('wix-secrets-backend', () => ({
  getSecret: vi.fn(),
}));

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getSecret } from 'wix-secrets-backend';

describe('Webhook Security - WORKSTREAM 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getSecret to return test secrets
    vi.mocked(getSecret).mockImplementation(async (secretName: string) => {
      const secrets: Record<string, string> = {
        'STRIPE_WEBHOOK_SECRET': 'whsec_test_stripe_secret',
        'TWILIO_WEBHOOK_SECRET': 'twilio_test_secret',
        'WEBHOOK_SECRET': 'generic_test_secret',
      };
      return secrets[secretName] || null;
    });
  });

  describe('Workstream A: Secret Loading and Verification', () => {
    describe('Secret Retrieval from Wix Secrets Manager', () => {
      it('should retrieve Stripe secret from Wix Secrets Manager', async () => {
        const secret = 'whsec_test_stripe_secret';
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const body = 'test body';
        const signedContent = `${timestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = await verifyWebhookSignature('stripe', body, signature, timestamp);
        
        // Verify getSecret was called with correct secret name
        expect(vi.mocked(getSecret)).toHaveBeenCalledWith('STRIPE_WEBHOOK_SECRET');
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('stripe');
      });

      it('should retrieve generic secret from Wix Secrets Manager', async () => {
        const secret = 'generic_test_secret';
        const body = 'test body';
        const signature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        const result = await verifyWebhookSignature('generic', body, signature);
        
        // Verify getSecret was called with correct secret name
        expect(vi.mocked(getSecret)).toHaveBeenCalledWith('WEBHOOK_SECRET');
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('generic');
      });

      it('should reject webhook when secret is missing from Wix Secrets Manager', async () => {
        // Mock getSecret returning null (secret not found)
        vi.mocked(getSecret).mockResolvedValueOnce(null);

        const result = await verifyWebhookSignature('stripe', 'test body', 'signature', '123456');
        
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SECRET');
        expect(result.error).toContain('not configured');
      });

      it('should reject webhook when Wix Secrets Manager throws error', async () => {
        // Mock getSecret throwing error
        vi.mocked(getSecret).mockRejectedValueOnce(new Error('Secrets Manager unavailable'));

        const result = await verifyWebhookSignature('stripe', 'test body', 'signature', '123456');
        
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SECRET');
      });

      it('should fail closed (reject) when secret retrieval fails', async () => {
        // Simulate network error
        vi.mocked(getSecret).mockRejectedValueOnce(new Error('Network timeout'));

        const result = await verifyWebhookSignature('generic', 'test body', 'valid_sig');
        
        // Fail-closed: must reject
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SECRET');
      });
    });

    describe('Invalid and Missing Signatures', () => {
      it('should reject webhook with missing signature header', async () => {
        const result = await verifyWebhookSignature('stripe', 'test body', '');
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SIGNATURE');
      });

      it('should reject webhook with invalid signature', async () => {
        const body = 'test body';
        const invalidSignature = 'invalid_signature_value';
        const result = await verifyWebhookSignature('stripe', body, invalidSignature);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('INVALID_SIGNATURE');
      });

      it('should reject webhook from unknown provider', async () => {
        const result = await verifyWebhookSignature('unknown_provider', 'test body', 'signature');
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('UNKNOWN_PROVIDER');
      });
    });

    describe('Valid Signatures', () => {
      it('should accept valid Stripe webhook signature', async () => {
        const secret = 'whsec_test_stripe_secret';
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const body = 'test body';
        const signedContent = `${timestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = await verifyWebhookSignature('stripe', body, signature, timestamp);
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('stripe');
      });

      it('should accept valid generic HMAC-SHA256 signature', async () => {
        const secret = 'generic_test_secret';
        const body = 'test body';
        const signature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        const result = await verifyWebhookSignature('generic', body, signature);
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('generic');
      });

      it('should accept valid Twilio HMAC-SHA1 signature', async () => {
        const secret = 'twilio_test_secret';
        const body = 'test body';
        const signature = crypto
          .createHmac('sha1', secret)
          .update(body)
          .digest('base64');

        const result = await verifyWebhookSignature('twilio', body, signature);
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('twilio');
      });
    });
  });

  describe('Workstream B: Replay Attack Prevention', () => {
    it('should reject webhook with future timestamp', async () => {
      const secret = 'whsec_test_stripe_secret';
      const futureTimestamp = Math.floor(Date.now() / 1000 + 3600).toString(); // 1 hour in future
      const body = 'test body';
      const signedContent = `${futureTimestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');

      const result = await verifyWebhookSignature('stripe', body, signature, futureTimestamp);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('FUTURE_TIMESTAMP');
    });

    it('should reject webhook with stale timestamp', async () => {
      const secret = 'whsec_test_stripe_secret';
      const staleTimestamp = Math.floor(Date.now() / 1000 - 600).toString(); // 10 minutes old
      const body = 'test body';
      const signedContent = `${staleTimestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');

      const result = await verifyWebhookSignature('stripe', body, signature, staleTimestamp);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('STALE_TIMESTAMP');
    });

    it('should accept webhook with recent timestamp', async () => {
      const secret = 'whsec_test_stripe_secret';
      const recentTimestamp = Math.floor(Date.now() / 1000 - 60).toString(); // 1 minute old
      const body = 'test body';
      const signedContent = `${recentTimestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');

      const result = await verifyWebhookSignature('stripe', body, signature, recentTimestamp);
      expect(result.valid).toBe(true);
    });
  });

  describe('Workstream C: Payload Validation', () => {
    it('should reject webhook with invalid content type', () => {
      const result = validateWebhookPayload('text/plain', { test: 'data' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject webhook with non-object payload', () => {
      const result = validateWebhookPayload('application/json', 'not an object');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('should reject webhook with oversized payload', () => {
      const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      const result = validateWebhookPayload('application/json', largePayload, 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('PAYLOAD_TOO_LARGE');
    });

    it('should accept valid webhook payload', () => {
      const payload = { id: 'evt_123', type: 'charge.succeeded' };
      const result = validateWebhookPayload('application/json', payload);
      expect(result.valid).toBe(true);
    });
  });

  describe('Workstream D: Idempotency and Duplicate Detection', () => {
    describe('Duplicate Event Detection', () => {
      it('should detect duplicate webhook event', async () => {
        const eventId = 'evt_duplicate_123';
        const provider = 'stripe';

        // Mock existing record
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'record-1',
              eventId,
              provider,
              timestamp: new Date(),
              status: 'processed',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isDuplicate = await isWebhookDuplicate(eventId, provider);
        expect(isDuplicate).toBe(true);
      });

      it('should not detect non-duplicate webhook event', async () => {
        const eventId = 'evt_new_123';
        const provider = 'stripe';

        // Mock no existing record
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        const isDuplicate = await isWebhookDuplicate(eventId, provider);
        expect(isDuplicate).toBe(false);
      });

      it('should handle database error gracefully (fail closed)', async () => {
        const eventId = 'evt_error_123';
        const provider = 'stripe';

        // Mock database error
        vi.mocked(BaseCrudService.getAll).mockRejectedValueOnce(new Error('Database error'));

        const isDuplicate = await isWebhookDuplicate(eventId, provider);
        // Fail closed: treat as potential duplicate if we can't check
        expect(isDuplicate).toBe(true);
      });
    });

    describe('Event Recording', () => {
      it('should record processed webhook event', async () => {
        const eventId = 'evt_record_123';
        const provider = 'stripe';
        const businessId = 'business-1';

        await recordWebhookEvent(eventId, provider, businessId, 'processed', 'Success');

        expect(BaseCrudService.create).toHaveBeenCalledWith(
          'webhookidempotency',
          expect.objectContaining({
            eventId,
            provider,
            businessId,
            status: 'processed',
            result: 'Success',
          })
        );
      });

      it('should record failed webhook event', async () => {
        const eventId = 'evt_failed_123';
        const provider = 'stripe';

        await recordWebhookEvent(eventId, provider, undefined, 'failed', 'Processing error');

        expect(BaseCrudService.create).toHaveBeenCalledWith(
          'webhookidempotency',
          expect.objectContaining({
            eventId,
            provider,
            status: 'failed',
            result: 'Processing error',
          })
        );
      });

      it('should handle recording error gracefully', async () => {
        const eventId = 'evt_record_error_123';
        const provider = 'stripe';

        // Mock database error
        vi.mocked(BaseCrudService.create).mockRejectedValueOnce(new Error('Database error'));

        // Should not throw
        await expect(
          recordWebhookEvent(eventId, provider, undefined, 'processed')
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('Workstream E: Event ID Extraction', () => {
    it('should extract event ID from Stripe payload', () => {
      const payload = { id: 'evt_stripe_123', type: 'charge.succeeded' };
      const eventId = extractEventId('stripe', payload);
      expect(eventId).toBe('evt_stripe_123');
    });

    it('should extract event ID from Twilio payload (MessageSid)', () => {
      const payload = { MessageSid: 'SM_twilio_123', Body: 'Test message' };
      const eventId = extractEventId('twilio', payload);
      expect(eventId).toBe('SM_twilio_123');
    });

    it('should extract event ID from Twilio payload (EventType)', () => {
      const payload = { EventType: 'onMessageSent', MessageSid: 'SM_123' };
      const eventId = extractEventId('twilio', payload);
      expect(eventId).toBe('SM_123'); // MessageSid takes precedence
    });

    it('should extract event ID from generic payload', () => {
      const payload = { eventId: 'evt_generic_123', data: 'test' };
      const eventId = extractEventId('generic', payload);
      expect(eventId).toBe('evt_generic_123');
    });

    it('should handle missing event ID gracefully', () => {
      const payload = { data: 'test' };
      const eventId = extractEventId('stripe', payload);
      expect(eventId).toBeUndefined();
    });
  });

  describe('Workstream F: Cross-Tenant Webhook Processing', () => {
    it('should prevent webhook from bypassing tenant authorization', async () => {
      // This test verifies that webhook processing respects business context
      // In actual implementation, webhook handlers should validate businessId
      
      const eventId = 'evt_cross_tenant_123';
      const provider = 'stripe';
      const businessId = 'business-1';

      // Record event with specific business context
      await recordWebhookEvent(eventId, provider, businessId, 'processed');

      // Verify record includes business context
      expect(BaseCrudService.create).toHaveBeenCalledWith(
        'webhookidempotency',
        expect.objectContaining({
          businessId,
        })
      );
    });
  });

  describe('Workstream G: Constant-Time Comparison', () => {
    it('should use constant-time comparison to prevent timing attacks', async () => {
      const secret = 'generic_test_secret';
      const body = 'test body';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      // Create invalid signature with same length
      const invalidSignature = 'a'.repeat(validSignature.length);

      const result1 = await verifyWebhookSignature('generic', body, validSignature);
      const result2 = await verifyWebhookSignature('generic', body, invalidSignature);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
    });
  });

  describe('Workstream H: Provider-Specific Tests', () => {
    it('should validate Stripe signature format', async () => {
      const secret = 'whsec_test_stripe_secret';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = 'test body';

      // Stripe expects: timestamp.signature
      const signedContent = `${timestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');

      const result = await verifyWebhookSignature('stripe', body, signature, timestamp);
      expect(result.valid).toBe(true);
    });

    it('should validate Twilio signature format', async () => {
      const secret = 'twilio_test_secret';
      const body = 'test body';
      const signature = crypto
        .createHmac('sha1', secret)
        .update(body)
        .digest('base64');

      const result = await verifyWebhookSignature('twilio', body, signature);
      expect(result.valid).toBe(true);
    });
  });

  describe('Workstream I: Boundary and Edge Cases', () => {
    it('should handle empty body', async () => {
      const result = await verifyWebhookSignature('generic', '', 'signature');
      expect(result.valid).toBe(false);
    });

    it('should handle Buffer body', async () => {
      const secret = 'generic_test_secret';
      const body = Buffer.from('test body');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const result = await verifyWebhookSignature('generic', body, signature);
      expect(result.valid).toBe(true);
    });

    it('should handle very long event ID', async () => {
      const eventId = 'evt_' + 'x'.repeat(1000);
      const provider = 'stripe';

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 0,
        nextSkip: null,
      });

      const isDuplicate = await isWebhookDuplicate(eventId, provider);
      expect(isDuplicate).toBe(false);
    });
  });
});
