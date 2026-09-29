/**
 * API Endpoint: POST /api/business/switch
 * PHASE 3: Server-validated business context switching
 * 
 * Validates:
 * 1. Member is authenticated
 * 2. Destination business membership exists and is active
 * 3. Member has permission to access destination business
 * 4. Role and branch assignments are valid
 * 
 * Returns:
 * - New AuthContext on success
 * - Error details on failure
 * 
 * Security:
 * - Requires Wix authentication
 * - Server-side membership validation
 * - Prevents unauthorized business access
 * - Logs all context switches for audit trail
 */

import { getSecretKey } from '@wix/sdk';
import { createClient } from '@wix/sdk';
import { members } from '@wix/members';
import { switchBusinessContext, clearStaleState } from '../../../backend/business-selector.web';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { targetBusinessId } = body;

    if (!targetBusinessId || typeof targetBusinessId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid targetBusinessId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // Perform server-validated context switch
    const switchResult = await switchBusinessContext(memberId, targetBusinessId);

    if (!switchResult.success) {
      console.warn(
        `Context switch failed for member ${memberId} to business ${targetBusinessId}: ${switchResult.error}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: switchResult.error || 'Context switch failed',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clear stale state (client-side will handle this too)
    // Note: This is a server-side hint; client should also clear state
    const previousBusinessId = body.previousBusinessId;
    if (previousBusinessId && previousBusinessId !== targetBusinessId) {
      clearStaleState(previousBusinessId, targetBusinessId);
    }

    // Log successful context switch
    console.info(
      `Context switch successful: member ${memberId} -> business ${targetBusinessId} ` +
      `(role: ${switchResult.authContext?.role || 'none'})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        authContext: switchResult.authContext,
        timestamp: switchResult.timestamp,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('POST /api/business/switch error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Context switch failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
