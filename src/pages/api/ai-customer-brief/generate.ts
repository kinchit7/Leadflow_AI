/**
 * API Endpoint: POST /api/ai-customer-brief/generate
 * PHASE 3F-C: Generate new AI Customer Brief
 * 
 * Request Body:
 * {
 *   customerId: string,
 *   isDemo?: boolean
 * }
 * 
 * Security:
 * - Requires authenticated user
 * - Validates business context on server
 * - Enforces tenant isolation
 * - Applies rate limiting for expensive AI operations
 * - Logs all generation attempts
 * - Prevents unauthorized customer access
 */

import { getSecretKey } from '@wix/sdk';
import { createClient } from '@wix/sdk';
import { resolveAuthContext } from '../../../backend/auth.web';
import { post_generateAICustomerBrief } from '../../../backend/ai-customer-service.web';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../../../backend/rate-limiter.web';

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

    // Apply rate limiting for AI generation (expensive operation)
    const rateLimitResult = await checkRateLimit('aiGeneration', memberId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'AI generation requests are rate limited. Please try again later.',
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
    const response = await post_generateAICustomerBrief(mockRequest);

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
    console.error('POST /api/ai-customer-brief/generate error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate AI brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
