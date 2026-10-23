/**
 * API Endpoint: POST /api/ai-customer-brief/invalidate
 * PHASE 3F-C: Invalidate existing AI Customer Brief
 * 
 * Request Body:
 * {
 *   customerId: string
 * }
 * 
 * Security:
 * - Requires authenticated user
 * - Validates business context on server
 * - Enforces tenant isolation
 * - Prevents unauthorized brief invalidation
 * - Logs all invalidation attempts
 */

import { getSecretKey } from '@wix/sdk';
import { createClient } from '@wix/sdk';
import { resolveAuthContext } from '../../../backend/auth.web';
import { post_invalidateAICustomerBrief } from '../../../backend/ai-customer-service.web';
import { checkRateLimit } from '../../../backend/rate-limiter.web';

export async function POST(request: Request) {
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

    // Apply rate limiting (less strict than generation, but still important)
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

    // Parse request body
    const body = await request.text();
    
    // Create mock request object for backend handler
    const mockRequest = {
      url: request.url,
      method: 'POST',
      body: body,
    };

    // Call backend handler (which validates auth context and tenant isolation internally)
    const response = await post_invalidateAICustomerBrief(mockRequest);

    // Extract status and body from wix-http-functions response
    const status = (response as any).status || 200;
    const responseBody = (response as any).body || {};

    return new Response(
      JSON.stringify(responseBody),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('POST /api/ai-customer-brief/invalidate error:', error);
    // SECURITY: Do not expose internal error messages to client
    return new Response(
      JSON.stringify({
        error: 'Failed to invalidate AI brief',
        // Do not include error.message - it may leak internal details
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
