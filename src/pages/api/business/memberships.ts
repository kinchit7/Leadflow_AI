/**
 * API Endpoint: GET /api/business/memberships
 * PHASE 1: Discover authorized memberships for authenticated user
 * 
 * Returns:
 * - Array of authorized memberships
 * - Business names and roles
 * - Only active memberships
 * 
 * Security:
 * - Requires Wix authentication
 * - Server-side membership validation
 * - No client-supplied businessId override
 */

import { getSecretKey } from '@wix/sdk';
import { createClient } from '@wix/sdk';
import { members } from '@wix/members';
import { resolveAuthContext } from '../../../backend/auth.web';
import { discoverAuthorizedMemberships } from '../../../backend/business-selector.web';

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

    // Discover authorized memberships
    const memberships = await discoverAuthorizedMemberships(memberId);

    return new Response(
      JSON.stringify({
        success: true,
        memberships,
        count: memberships.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GET /api/business/memberships error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to discover memberships',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
