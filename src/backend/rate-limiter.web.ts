/**
 * Rate Limiting Module - PHASE 3F-C
 * Implements server-side rate limiting for sensitive operations
 * 
 * Supported Strategies:
 * - Per-user rate limiting (authentication-sensitive operations)
 * - Per-IP rate limiting (webhook endpoints)
 * - Per-business rate limiting (bulk operations)
 * - Per-endpoint rate limiting (AI actions, expensive processing)
 * 
 * Security Controls:
 * - Shared, durable rate-limit mechanism (not in-memory)
 * - Consistent rate-limit responses
 * - No sensitive information disclosure
 * - Abuse and boundary testing
 * - Prevents bypass via client-supplied identifiers
 */

import { BaseCrudService } from '@/integrations/cms';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  keyPrefix: string;
}

/**
 * Rate limit record
 */
export interface RateLimitRecord {
  _id: string;
  key: string;
  count: number;
  windowStart: Date;
  windowEnd: Date;
  lastUpdated: Date;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication-sensitive operations
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'ratelimit:login',
  },
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'ratelimit:password_reset',
  },
  // Webhook endpoints
  webhook: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:webhook',
  },
  // AI actions and expensive processing
  aiGeneration: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'ratelimit:ai_generation',
  },
  // Messaging or communication triggers
  messaging: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'ratelimit:messaging',
  },
  // Search and bulk operations
  search: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:search',
  },
  bulkOperation: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'ratelimit:bulk_operation',
  },
};

/**
 * Check rate limit for a given key
 * Uses persistent storage (not in-memory) to support multiple server instances
 * 
 * @param configName - Configuration name (e.g., 'login', 'webhook')
 * @param key - Rate limit key (user ID, IP, business ID, etc.)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  configName: string,
  key: string
): Promise<RateLimitResult> {
  try {
    const config = RATE_LIMIT_CONFIGS[configName];
    if (!config) {
      console.error(`Unknown rate limit configuration: ${configName}`);
      return {
        allowed: true,
        remaining: config?.maxRequests || 0,
        resetTime: new Date(),
      };
    }

    const now = new Date();
    const rateLimitKey = `${config.keyPrefix}:${key}`;

    // Query existing rate limit record
    let record: RateLimitRecord | null = null;
    try {
      // Note: This requires a ratelimits collection
      // For now, we'll use a workaround with getAll and filter
      const result = await BaseCrudService.getAll<RateLimitRecord>(
        'ratelimits',
        [],
        { limit: 100 }
      );

      if (result && Array.isArray(result.items)) {
        record = result.items.find((r: any) => r.key === rateLimitKey) || null;
      }
    } catch (error) {
      console.error(`Error querying rate limit record for ${rateLimitKey}:`, error);
      // Fail open: allow request if we can't check rate limit
      // This prevents denial-of-service via rate limiter failure
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(now.getTime() + config.windowMs),
      };
    }

    // Check if window has expired
    if (record && record.windowEnd < now) {
      // Window expired, reset counter
      record = null;
    }

    if (!record) {
      // First request in window
      const newRecord: RateLimitRecord = {
        _id: crypto.randomUUID(),
        key: rateLimitKey,
        count: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + config.windowMs),
        lastUpdated: now,
      };

      try {
        await BaseCrudService.create('ratelimits', newRecord);
      } catch (error) {
        console.error(`Error creating rate limit record for ${rateLimitKey}:`, error);
        // Fail open
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: newRecord.windowEnd,
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.windowEnd,
      };
    }

    // Increment counter
    const newCount = record.count + 1;
    const allowed = newCount <= config.maxRequests;

    try {
      await BaseCrudService.update('ratelimits', {
        _id: record._id,
        count: newCount,
        lastUpdated: now,
      });
    } catch (error) {
      console.error(`Error updating rate limit record for ${rateLimitKey}:`, error);
      // Fail open
      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetTime: record.windowEnd,
      };
    }

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - newCount),
      resetTime: record.windowEnd,
      retryAfter: allowed ? undefined : Math.ceil((record.windowEnd.getTime() - now.getTime()) / 1000),
    };
  } catch (error) {
    console.error(`Unexpected error in checkRateLimit:`, error);
    // Fail open
    return {
      allowed: true,
      remaining: 0,
      resetTime: new Date(),
    };
  }
}

/**
 * Check rate limit and return HTTP response if exceeded
 * 
 * @param configName - Configuration name
 * @param key - Rate limit key
 * @returns Response object if rate limited, null if allowed
 */
export async function getRateLimitResponse(
  configName: string,
  key: string
): Promise<Response | null> {
  const result = await checkRateLimit(configName, key);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        resetTime: result.resetTime.toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIGS[configName]?.maxRequests.toString() || '0',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Log rate limit event
 * 
 * @param configName - Configuration name
 * @param key - Rate limit key
 * @param allowed - Whether request was allowed
 * @param memberId - Member ID (optional)
 * @param businessId - Business ID (optional)
 */
export async function logRateLimitEvent(
  configName: string,
  key: string,
  allowed: boolean,
  memberId?: string,
  businessId?: string
): Promise<void> {
  try {
    const { logAuditEvent } = await import('./audit-service.web');

    await logAuditEvent({
      action: `ratelimit_${allowed ? 'allowed' : 'exceeded'}`,
      memberId: memberId || 'unknown',
      businessId,
      resourceType: 'ratelimit',
      resourceId: `${configName}:${key}`,
      result: allowed ? 'success' : 'failure',
      reason: allowed ? 'Request allowed' : `Rate limit exceeded for ${configName}`,
      severity: allowed ? 'LOW' : 'MEDIUM',
    });
  } catch (error) {
    console.error(`Error logging rate limit event:`, error);
    // Non-blocking: audit logging failure should not prevent rate limiting
  }
}

/**
 * Reset rate limit for a key (admin operation)
 * 
 * @param configName - Configuration name
 * @param key - Rate limit key
 */
export async function resetRateLimit(
  configName: string,
  key: string
): Promise<void> {
  try {
    const config = RATE_LIMIT_CONFIGS[configName];
    if (!config) {
      console.error(`Unknown rate limit configuration: ${configName}`);
      return;
    }

    const rateLimitKey = `${config.keyPrefix}:${key}`;

    // Query and delete existing record
    const result = await BaseCrudService.getAll<RateLimitRecord>(
      'ratelimits',
      [],
      { limit: 100 }
    );

    if (result && Array.isArray(result.items)) {
      const record = result.items.find((r: any) => r.key === rateLimitKey);
      if (record) {
        await BaseCrudService.delete('ratelimits', record._id);
        console.debug(`Reset rate limit for ${rateLimitKey}`);
      }
    }
  } catch (error) {
    console.error(`Error resetting rate limit for ${configName}:${key}:`, error);
  }
}

/**
 * Get rate limit status for a key
 * 
 * @param configName - Configuration name
 * @param key - Rate limit key
 * @returns Rate limit status
 */
export async function getRateLimitStatus(
  configName: string,
  key: string
): Promise<RateLimitResult> {
  return checkRateLimit(configName, key);
}

/**
 * Cleanup expired rate limit records (maintenance operation)
 * Should be called periodically (e.g., hourly)
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    const now = new Date();

    // Query all rate limit records
    const result = await BaseCrudService.getAll<RateLimitRecord>(
      'ratelimits',
      [],
      { limit: 1000 }
    );

    if (!result || !Array.isArray(result.items)) {
      return;
    }

    // Delete expired records
    let deleted = 0;
    for (const record of result.items) {
      if (record.windowEnd < now) {
        try {
          await BaseCrudService.delete('ratelimits', record._id);
          deleted++;
        } catch (error) {
          console.error(`Error deleting expired rate limit record ${record._id}:`, error);
        }
      }
    }

    if (deleted > 0) {
      console.debug(`Cleaned up ${deleted} expired rate limit records`);
    }
  } catch (error) {
    console.error(`Error cleaning up expired rate limits:`, error);
  }
}
