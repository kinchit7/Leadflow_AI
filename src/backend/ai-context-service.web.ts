import { ok, badRequest, forbidden, notFound, serverError } from 'wix-http-functions';
import { getCurrentMember } from 'wix-members-backend';
import { resolveAuthContext, AuthContext } from './auth.web';
import { getCustomer360 } from './customer-360.web';
import { getCompleteKnowledgeBase } from './business-brain-service.web';

/**
 * AI Context Service - Orchestration Layer
 * Provides centralized server-side AI context builder
 * Aggregates data from Customer 360 and Knowledge Base services
 * Enforces tenant isolation and authorization
 * 
 * This service acts as a thin orchestration layer that:
 * - Reuses canonical getCustomer360 from customer-360.web.ts
 * - Reuses canonical getCompleteKnowledgeBase from business-brain-service.web.ts
 * - Maintains tenant isolation through AuthContext
 * - Delegates authorization to underlying services
 */

interface AIContextData {
  customer: any;
  knowledgeBase: any;
  timestamp: string;
  contextVersion: string;
}

/**
 * Validates and extracts authentication context from current member session
 * Delegates to auth.web.ts for tenant resolution
 */
async function validateAuthContext(): Promise<AuthContext> {
  try {
    const member = await getCurrentMember({
      fieldsets: ['FULL']
    });

    if (!member || !member.id) {
      throw new Error('Unauthorized: No valid member session');
    }

    const authContext = await resolveAuthContext(member.id);
    if (!authContext) {
      throw new Error('Failed to resolve authentication context');
    }

    return authContext;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Builds comprehensive AI context
 * Orchestrates data aggregation from canonical services:
 * - Customer 360 (customer data, interactions, opportunities, follow-ups)
 * - Complete Knowledge Base (products, services, FAQs, policies, business hours, AI rules)
 * 
 * @param customerId - The customer ID to fetch context for
 * @param authContext - Authentication context with tenant isolation
 * @returns Aggregated AI context data
 */
async function buildAIContext(
  customerId: string,
  authContext: AuthContext
): Promise<AIContextData> {
  try {
    // Fetch customer 360 data using canonical service
    const customer360 = await getCustomer360(customerId, authContext);

    if (!customer360) {
      throw new Error(`Customer not found or unauthorized: ${customerId}`);
    }

    // Fetch complete knowledge base using canonical service
    const knowledgeBase = await getCompleteKnowledgeBase(authContext);

    return {
      customer: customer360,
      knowledgeBase,
      timestamp: new Date().toISOString(),
      contextVersion: '1.0'
    };
  } catch (error) {
    console.error('Error building AI context:', error);
    throw error;
  }
}

/**
 * Main HTTP handler for AI context endpoint
 * POST /ai-context
 * Body: { customerId: string }
 * 
 * Orchestrates data aggregation from canonical services
 */
export async function post_aiContext(request: any) {
  try {
    // Validate authentication and authorization
    const authContext = await validateAuthContext();

    // Parse request body
    const body = request.body ? JSON.parse(request.body) : {};
    const { customerId } = body;

    if (!customerId) {
      return badRequest({
        body: {
          error: 'Missing required field',
          message: 'customerId is required'
        }
      });
    }

    // Build AI context using orchestration function
    const aiContext = await buildAIContext(customerId, authContext);

    return ok({
      body: {
        success: true,
        data: aiContext,
        memberId: authContext.memberId,
        businessId: authContext.businessId
      }
    });
  } catch (error) {
    console.error('AI Context Service Error:', error);

    if (error.message.includes('not found')) {
      return notFound({
        body: {
          error: 'Not found',
          message: error.message
        }
      });
    }

    if (error.message.includes('Unauthorized')) {
      return forbidden({
        body: {
          error: 'Forbidden',
          message: error.message
        }
      });
    }

    return serverError({
      body: {
        error: 'Internal server error',
        message: 'Failed to build AI context'
      }
    });
  }
}

/**
 * Endpoint to get customer 360 data only
 * GET /customer-360?customerId=<id>
 * 
 * Delegates to canonical getCustomer360 service
 */
export async function get_customer360(request: any) {
  try {
    const authContext = await validateAuthContext();

    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');

    if (!customerId) {
      return badRequest({
        body: {
          error: 'Missing customerId parameter'
        }
      });
    }

    // Use canonical getCustomer360 service
    const customer360 = await getCustomer360(customerId, authContext);

    if (!customer360) {
      return notFound({
        body: {
          error: 'Customer not found'
        }
      });
    }

    return ok({
      body: {
        success: true,
        data: customer360
      }
    });
  } catch (error) {
    console.error('Customer 360 Error:', error);
    return serverError({
      body: {
        error: 'Failed to fetch customer 360 data'
      }
    });
  }
}

/**
 * Endpoint to get knowledge base only
 * GET /knowledge-base
 * 
 * Delegates to canonical getCompleteKnowledgeBase service
 */
export async function get_knowledgeBase(request: any) {
  try {
    const authContext = await validateAuthContext();

    // Use canonical getCompleteKnowledgeBase service
    const knowledgeBase = await getCompleteKnowledgeBase(authContext);

    return ok({
      body: {
        success: true,
        data: knowledgeBase
      }
    });
  } catch (error) {
    console.error('Knowledge Base Error:', error);
    return serverError({
      body: {
        error: 'Failed to fetch knowledge base'
      }
    });
  }
}

/**
 * Endpoint to validate context access
 * POST /validate-context-access
 * Body: { customerId: string }
 * 
 * Uses orchestration function to validate access
 */
export async function post_validateContextAccess(request: any) {
  try {
    const authContext = await validateAuthContext();
    const body = request.body ? JSON.parse(request.body) : {};
    const { customerId } = body;

    if (!customerId) {
      return badRequest({
        body: {
          error: 'Missing customerId'
        }
      });
    }

    // Attempt to fetch customer 360 - if successful, access is granted
    const customer360 = await getCustomer360(customerId, authContext);
    const hasAccess = customer360 !== null;

    return ok({
      body: {
        success: true,
        hasAccess,
        memberId: authContext.memberId,
        businessId: authContext.businessId
      }
    });
  } catch (error) {
    console.error('Context Access Validation Error:', error);
    return serverError({
      body: {
        error: 'Failed to validate context access'
      }
    });
  }
}
