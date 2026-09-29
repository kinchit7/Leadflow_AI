/**
 * Rate Limiter Tests - PHASE 3F-C
 * Tests for server-side rate limiting and resource controls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  getRateLimitResponse,
  resetRateLimit,
  getRateLimitStatus,
  cleanupExpiredRateLimits,
  RATE_LIMIT_CONFIGS,
  RateLimitResult,
} from '../rate-limiter.web';
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

describe('Rate Limiter - PHASE 3F-C', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workstream B: Rate Limiting and Resource Controls', () => {
    describe('Authentication-Sensitive Operations', () => {
      it('should enforce login rate limit', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.login;

        // Mock first request (allowed)
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result1 = await checkRateLimit('login', userId);
        expect(result1.allowed).toBe(true);
        expect(result1.remaining).toBe(config.maxRequests - 1);
      });

      it('should deny login after exceeding rate limit', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.login;

        // Mock existing record at max requests
        const existingRecord = {
          _id: 'record-1',
          key: `ratelimit:login:${userId}`,
          count: config.maxRequests,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 15 * 60 * 1000),
          lastUpdated: new Date(),
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [existingRecord],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const result = await checkRateLimit('login', userId);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfter).toBeDefined();
      });

      it('should reset login rate limit after window expires', async () => {
        const userId = 'user-123';

        // Mock expired record
        const expiredRecord = {
          _id: 'record-1',
          key: `ratelimit:login:${userId}`,
          count: 5,
          windowStart: new Date(Date.now() - 20 * 60 * 1000),
          windowEnd: new Date(Date.now() - 5 * 60 * 1000), // Expired
          lastUpdated: new Date(),
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [expiredRecord],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result = await checkRateLimit('login', userId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.login.maxRequests - 1);
      });
    });

    describe('Webhook Endpoints', () => {
      it('should enforce webhook rate limit per IP', async () => {
        const ipAddress = '192.168.1.1';
        const config = RATE_LIMIT_CONFIGS.webhook;

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result = await checkRateLimit('webhook', ipAddress);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(config.maxRequests - 1);
      });

      it('should handle high webhook volume', async () => {
        const ipAddress = '192.168.1.1';
        const config = RATE_LIMIT_CONFIGS.webhook;

        // Simulate 1000 requests
        for (let i = 0; i < config.maxRequests; i++) {
          vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
            items: [
              {
                _id: 'record-1',
                key: `ratelimit:webhook:${ipAddress}`,
                count: i,
                windowStart: new Date(),
                windowEnd: new Date(Date.now() + 60 * 1000),
                lastUpdated: new Date(),
              },
            ],
            totalCount: 1,
            hasNext: false,
            currentPage: 0,
            pageSize: 1,
            nextSkip: null,
          });

          vi.mocked(BaseCrudService.update).mockResolvedValueOnce({});

          const result = await checkRateLimit('webhook', ipAddress);
          expect(result.allowed).toBe(true);
        }

        // Next request should be denied
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'record-1',
              key: `ratelimit:webhook:${ipAddress}`,
              count: config.maxRequests,
              windowStart: new Date(),
              windowEnd: new Date(Date.now() + 60 * 1000),
              lastUpdated: new Date(),
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const result = await checkRateLimit('webhook', ipAddress);
        expect(result.allowed).toBe(false);
      });
    });

    describe('AI Actions and Expensive Processing', () => {
      it('should enforce AI generation rate limit per user', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.aiGeneration;

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result = await checkRateLimit('aiGeneration', userId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(config.maxRequests - 1);
      });

      it('should deny AI generation after hourly limit', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.aiGeneration;

        const existingRecord = {
          _id: 'record-1',
          key: `ratelimit:ai_generation:${userId}`,
          count: config.maxRequests,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 60 * 60 * 1000),
          lastUpdated: new Date(),
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [existingRecord],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const result = await checkRateLimit('aiGeneration', userId);
        expect(result.allowed).toBe(false);
      });
    });

    describe('Messaging and Communication', () => {
      it('should enforce messaging rate limit per user', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.messaging;

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result = await checkRateLimit('messaging', userId);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Search and Bulk Operations', () => {
      it('should enforce search rate limit per user', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.search;

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result = await checkRateLimit('search', userId);
        expect(result.allowed).toBe(true);
      });

      it('should enforce bulk operation rate limit per business', async () => {
        const businessId = 'business-1';
        const config = RATE_LIMIT_CONFIGS.bulkOperation;

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

        const result = await checkRateLimit('bulkOperation', businessId);
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Workstream C: HTTP Response Handling', () => {
    it('should return 429 response when rate limited', async () => {
      const userId = 'user-123';
      const config = RATE_LIMIT_CONFIGS.login;

      const existingRecord = {
        _id: 'record-1',
        key: `ratelimit:login:${userId}`,
        count: config.maxRequests,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 15 * 60 * 1000),
        lastUpdated: new Date(),
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [existingRecord],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1,
        nextSkip: null,
      });

      const response = await getRateLimitResponse('login', userId);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });

    it('should return null when request is allowed', async () => {
      const userId = 'user-123';

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 0,
        nextSkip: null,
      });

      vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

      const response = await getRateLimitResponse('login', userId);
      expect(response).toBeNull();
    });

    it('should include Retry-After header in rate limit response', async () => {
      const userId = 'user-123';
      const config = RATE_LIMIT_CONFIGS.login;

      const existingRecord = {
        _id: 'record-1',
        key: `ratelimit:login:${userId}`,
        count: config.maxRequests,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 15 * 60 * 1000),
        lastUpdated: new Date(),
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [existingRecord],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1,
        nextSkip: null,
      });

      const response = await getRateLimitResponse('login', userId);
      expect(response?.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Workstream D: Distributed Rate Limiting', () => {
    it('should use persistent storage (not in-memory)', async () => {
      const userId = 'user-123';

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 0,
        nextSkip: null,
      });

      vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

      await checkRateLimit('login', userId);

      // Verify BaseCrudService was called (persistent storage)
      expect(BaseCrudService.getAll).toHaveBeenCalled();
      expect(BaseCrudService.create).toHaveBeenCalled();
    });

    it('should support multiple server instances', async () => {
      const userId = 'user-123';

      // First server instance
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [],
        totalCount: 0,
        hasNext: false,
        currentPage: 0,
        pageSize: 0,
        nextSkip: null,
      });

      vi.mocked(BaseCrudService.create).mockResolvedValueOnce({});

      const result1 = await checkRateLimit('login', userId);
      expect(result1.allowed).toBe(true);

      // Second server instance (should see the same record)
      const record = {
        _id: 'record-1',
        key: `ratelimit:login:${userId}`,
        count: 1,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 15 * 60 * 1000),
        lastUpdated: new Date(),
      };

      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [record],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1,
        nextSkip: null,
      });

      vi.mocked(BaseCrudService.update).mockResolvedValueOnce({});

      const result2 = await checkRateLimit('login', userId);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(RATE_LIMIT_CONFIGS.login.maxRequests - 2);
    });
  });

  describe('Workstream E: Regression Tests', () => {
    describe('Boundary Tests', () => {
      it('should handle zero remaining requests', async () => {
        const userId = 'user-123';
        const config = RATE_LIMIT_CONFIGS.login;

        const existingRecord = {
          _id: 'record-1',
          key: `ratelimit:login:${userId}`,
          count: config.maxRequests + 1,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 15 * 60 * 1000),
          lastUpdated: new Date(),
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [existingRecord],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const result = await checkRateLimit('login', userId);
        expect(result.remaining).toBe(0);
      });

      it('should handle database errors gracefully (fail open)', async () => {
        const userId = 'user-123';

        vi.mocked(BaseCrudService.getAll).mockRejectedValueOnce(new Error('Database error'));

        const result = await checkRateLimit('login', userId);
        expect(result.allowed).toBe(true); // Fail open
      });

      it('should handle missing rate limit configuration', async () => {
        const result = await checkRateLimit('nonexistent', 'user-123');
        expect(result.allowed).toBe(true); // Fail open
      });
    });

    describe('Cleanup Tests', () => {
      it('should cleanup expired rate limit records', async () => {
        const expiredRecord = {
          _id: 'record-1',
          key: 'ratelimit:login:user-123',
          count: 5,
          windowStart: new Date(Date.now() - 20 * 60 * 1000),
          windowEnd: new Date(Date.now() - 5 * 60 * 1000), // Expired
          lastUpdated: new Date(),
        };

        const activeRecord = {
          _id: 'record-2',
          key: 'ratelimit:login:user-456',
          count: 2,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 15 * 60 * 1000),
          lastUpdated: new Date(),
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [expiredRecord, activeRecord],
          totalCount: 2,
          hasNext: false,
          currentPage: 0,
          pageSize: 2,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.delete).mockResolvedValueOnce({});

        await cleanupExpiredRateLimits();

        // Should delete only expired record
        expect(BaseCrudService.delete).toHaveBeenCalledWith('ratelimits', 'record-1');
        expect(BaseCrudService.delete).not.toHaveBeenCalledWith('ratelimits', 'record-2');
      });
    });

    describe('Reset Tests', () => {
      it('should reset rate limit for a key', async () => {
        const userId = 'user-123';

        const record = {
          _id: 'record-1',
          key: 'ratelimit:login:user-123',
          count: 5,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 15 * 60 * 1000),
          lastUpdated: new Date(),
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [record],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        vi.mocked(BaseCrudService.delete).mockResolvedValueOnce({});

        await resetRateLimit('login', userId);

        expect(BaseCrudService.delete).toHaveBeenCalledWith('ratelimits', 'record-1');
      });
    });
  });
});
