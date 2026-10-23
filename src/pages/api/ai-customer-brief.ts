/**
 * API Endpoint: GET /api/ai-customer-brief?customerId=<id>
 * PHASE 3F-C: Retrieve existing AI Customer Brief
 * 
 * Security:
 * - Requires authenticated user
 * - Validates business context on server
 * - Enforces tenant isolation
 * - Applies rate limiting
 * - Logs all access attempts
 */

import { getSecretKey } from '@wix/sdk';
import { createClient } from '@wix/sdk';
import { resolveAuthContext } from '../../backend/auth.web';
import { get_aiCustomerBrief } from '../../backend/ai-customer-service.web';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../../backend/rate-limiter.web';

export async function GET(request: Request) {
  try {
    // Get authenticated member from Wix session
    const wixClient = createClient({
      auth: getSecretKey(),
    });

    const currentMember = await wixClient.members.getCurrentMember();

    if (!currentMember.member) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const memberId = currentMember.member._id;

    // Apply rate limiting for AI operations
    const rateLimitResult = await checkRateLimit('aiGeneration', memberId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString(),
          },
        }
      );
    }

    // Create mock request object for backend handler
    const url = new URL(request.url);
    const mockRequest = {
      url: request.url,
      method: 'GET',
    };

    // Call backend handler (which validates auth context internally)
    const response = await get_aiCustomerBrief(mockRequest);

    // Extract status and body from wix-http-functions response
    const status = (response as any).status || 200;
    const body = (response as any).body || {};

    return new Response(
      JSON.stringify(body),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('GET /api/ai-customer-brief error:', error);
    // SECURITY: Do not expose internal error messages to client
    return new Response(
      JSON.stringify({
        error: 'Failed to retrieve AI brief',
        // Do not include error.message - it may leak internal details
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
