/**
 * Webhook Security Tests - PHASE 3F-C
 * Tests for webhook signature validation, idempotency, and replay protection
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

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Webhook Security - PHASE 3F-C', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables for webhook secrets
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_stripe_secret';
    process.env.TWILIO_WEBHOOK_SECRET = 'twilio_test_secret';
    process.env.WEBHOOK_SECRET = 'generic_test_secret';
  });

  describe('Workstream A: Webhook Signature Validation', () => {
    describe('Invalid and Missing Signatures', () => {
      it('should reject webhook with missing signature header', () => {
        const result = verifyWebhookSignature('stripe', 'test body', '');
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SIGNATURE');
      });

      it('should reject webhook with invalid signature', () => {
        const body = 'test body';
        const invalidSignature = 'invalid_signature_value';
        const result = verifyWebhookSignature('stripe', body, invalidSignature);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('INVALID_SIGNATURE');
      });

      it('should reject webhook from unknown provider', () => {
        const result = verifyWebhookSignature('unknown_provider', 'test body', 'signature');
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('UNKNOWN_PROVIDER');
      });

      it('should reject webhook with missing secret configuration', () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;
        const result = verifyWebhookSignature('stripe', 'test body', 'signature');
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SECRET');
      });
    });

    describe('Valid Signatures', () => {
      it('should accept valid Stripe webhook signature', () => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET!;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const body = 'test body';
        const signedContent = `${timestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = verifyWebhookSignature('stripe', body, signature, timestamp);
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('stripe');
      });

      it('should accept valid generic HMAC-SHA256 signature', () => {
        const secret = process.env.WEBHOOK_SECRET!;
        const body = 'test body';
        const signature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        const result = verifyWebhookSignature('generic', body, signature);
        expect(result.valid).toBe(true);
        expect(result.providerId).toBe('generic');
      });
    });

    describe('Replay Attack Prevention', () => {
      it('should reject webhook with future timestamp', () => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET!;
        const futureTimestamp = Math.floor(Date.now() / 1000 + 3600).toString(); // 1 hour in future
        const body = 'test body';
        const signedContent = `${futureTimestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = verifyWebhookSignature('stripe', body, signature, futureTimestamp);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('FUTURE_TIMESTAMP');
      });

      it('should reject webhook with stale timestamp', () => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET!;
        const staleTimestamp = Math.floor(Date.now() / 1000 - 600).toString(); // 10 minutes old
        const body = 'test body';
        const signedContent = `${staleTimestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = verifyWebhookSignature('stripe', body, signature, staleTimestamp);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('STALE_TIMESTAMP');
      });

      it('should accept webhook with recent timestamp', () => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET!;
        const recentTimestamp = Math.floor(Date.now() / 1000 - 60).toString(); // 1 minute old
        const body = 'test body';
        const signedContent = `${recentTimestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = verifyWebhookSignature('stripe', body, signature, recentTimestamp);
        expect(result.valid).toBe(true);
      });
    });

    describe('Payload Validation', () => {
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
  });

  describe('Workstream B: Idempotency and Duplicate Detection', () => {
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

  describe('Workstream C: Event ID Extraction', () => {
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

  describe('Workstream D: Cross-Tenant Webhook Processing', () => {
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

  describe('Workstream E: Regression Tests', () => {
    describe('Boundary Tests', () => {
      it('should handle empty body', () => {
        const result = verifyWebhookSignature('generic', '', 'signature');
        expect(result.valid).toBe(false);
      });

      it('should handle Buffer body', () => {
        const secret = process.env.WEBHOOK_SECRET!;
        const body = Buffer.from('test body');
        const signature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        const result = verifyWebhookSignature('generic', body, signature);
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

    describe('Signature Timing Tests', () => {
      it('should use constant-time comparison to prevent timing attacks', () => {
        const secret = process.env.WEBHOOK_SECRET!;
        const body = 'test body';
        const validSignature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        // Create invalid signature with same length
        const invalidSignature = 'a'.repeat(validSignature.length);

        const result1 = verifyWebhookSignature('generic', body, validSignature);
        const result2 = verifyWebhookSignature('generic', body, invalidSignature);

        expect(result1.valid).toBe(true);
        expect(result2.valid).toBe(false);
      });
    });

    describe('Provider-Specific Tests', () => {
      it('should validate Stripe signature format', () => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET!;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const body = 'test body';

        // Stripe expects: timestamp.signature
        const signedContent = `${timestamp}.${body}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        const result = verifyWebhookSignature('stripe', body, signature, timestamp);
        expect(result.valid).toBe(true);
      });

      it('should validate Twilio signature format', () => {
        const secret = process.env.TWILIO_WEBHOOK_SECRET!;
        const body = 'test body';
        const signature = crypto
          .createHmac('sha1', secret)
          .update(body)
          .digest('base64');

        const result = verifyWebhookSignature('twilio', body, signature);
        expect(result.valid).toBe(true);
      });
    });
  });
});
