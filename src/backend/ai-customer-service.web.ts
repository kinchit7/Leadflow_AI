/**
 * AI Customer Service (.web.ts)
 * Handles AI Customer Brief lifecycle management
 * 
 * ARCHITECTURE:
 * - Backend-only AI provider abstraction (no frontend exposure)
 * - Structured output validation with schema enforcement
 * - Audit logging via AuditLogs collection
 * - Tenant isolation through AuthContext
 * - Demo mode compatibility
 * 
 * PERSISTENCE LIMITATIONS:
 * - AICustomerBriefs stored in CMS (persisted across sessions)
 * - Audit logs stored in AuditLogs collection (immutable)
 * - No real-time updates - polling required for UI
 * - No webhook support for generation completion
 * 
 * AUDIT LIMITATIONS:
 * - Audit logs are append-only (no deletion)
 * - No audit log retention policy enforced
 * - Audit logs visible to all users in same business (no role-based filtering)
 */

import { ok, badRequest, forbidden, notFound, serverError } from 'wix-http-functions';
import { getCurrentMember } from 'wix-members-backend';
import { BaseCrudService } from '@/integrations/cms';
import { resolveAuthContext, AuthContext, authorizeRead } from './auth.web';
import { buildAIContext } from './ai-context-service.web';
import { AICustomerBriefs, AuditLogs } from '@/entities';

/**
 * AI Customer Brief types and interfaces
 */
export interface AICustomerBrief extends AICustomerBriefs {
  _id: string;
  customerId: string;
  businessId: string;
  briefContent: string;
  keyInsights: string;
  recommendedActions: string;
  riskFactors: string;
  opportunities: string;
  generatedAt: Date | string;
  generatedBy: string;
  aiProvider: string;
  modelVersion: string;
  isDemo: boolean;
}

export type AIBriefStatus = 'generating' | 'completed' | 'failed' | 'invalidated';

/**
 * Structured output schema for AI-generated briefs
 * Enforces consistent structure from AI provider
 */
interface AIBriefSchema {
  briefContent: string;
  keyInsights: string;
  recommendedActions: string;
  riskFactors: string;
  opportunities: string;
}

/**
 * Validates AI-generated brief against schema
 * Ensures all required fields are present and non-empty
 */
function validateBriefSchema(brief: any): brief is AIBriefSchema {
  if (!brief || typeof brief !== 'object') {
    return false;
  }

  const requiredFields: (keyof AIBriefSchema)[] = [
    'briefContent',
    'keyInsights',
    'recommendedActions',
    'riskFactors',
    'opportunities'
  ];

  for (const field of requiredFields) {
    if (typeof brief[field] !== 'string' || brief[field].trim().length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Backend-only AI provider abstraction
 * Generates customer brief using aggregated context
 * 
 * IMPLEMENTATION NOTE:
 * This is a mock implementation. In production, integrate with:
 * - OpenAI GPT-4 / Claude API
 * - Anthropic Claude
 * - Google Gemini
 * - Custom LLM endpoint
 * 
 * The abstraction allows swapping providers without frontend changes
 */
async function generateBriefWithAI(
  aiContext: any,
  businessId: string,
  isDemo: boolean
): Promise<AIBriefSchema> {
  try {
    // Mock AI generation for demo/testing
    if (isDemo) {
      return {
        briefContent: `AI-generated brief for ${aiContext.customer?.fullName || 'Customer'}. This customer has ${aiContext.customer?.leads?.length || 0} leads and ${aiContext.customer?.opportunities?.length || 0} opportunities.`,
        keyInsights: `Key insights: Customer is in ${aiContext.customer?.city || 'unknown location'}. Recent activity shows engagement with ${aiContext.customer?.leads?.[0]?.requirement || 'various services'}.`,
        recommendedActions: 'Recommended: Schedule follow-up meeting, review proposal, send product information.',
        riskFactors: 'Risk: No recent activity in past 30 days. Budget constraints mentioned in lead.',
        opportunities: 'Opportunity: Upsell premium services. Cross-sell complementary products. Expand to new departments.'
      };
    }

    // Production: Call real AI provider
    // Example with OpenAI:
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [{
    //       role: 'system',
    //       content: 'You are a business intelligence assistant...',
    //       role: 'user',
    //       content: `Generate a customer brief for: ${JSON.stringify(aiContext)}`
    //     }],
    //     temperature: 0.7,
    //     max_tokens: 2000
    //   })
    // });

    // For now, return mock data
    return {
      briefContent: `AI-generated brief for ${aiContext.customer?.fullName || 'Customer'}. This customer has ${aiContext.customer?.leads?.length || 0} leads and ${aiContext.customer?.opportunities?.length || 0} opportunities.`,
      keyInsights: `Key insights: Customer is in ${aiContext.customer?.city || 'unknown location'}. Recent activity shows engagement with ${aiContext.customer?.leads?.[0]?.requirement || 'various services'}.`,
      recommendedActions: 'Recommended: Schedule follow-up meeting, review proposal, send product information.',
      riskFactors: 'Risk: No recent activity in past 30 days. Budget constraints mentioned in lead.',
      opportunities: 'Opportunity: Upsell premium services. Cross-sell complementary products. Expand to new departments.'
    };
  } catch (error) {
    console.error('AI generation failed:', error);
    throw new Error(`AI provider error: ${error.message}`);
  }
}

/**
 * Logs action to AuditLogs collection
 * Immutable append-only audit trail
 */
async function logAuditEvent(
  actionPerformed: string,
  resourceAffected: string,
  userId: string,
  details: string,
  businessId: string
): Promise<void> {
  try {
    const auditLog: AuditLogs = {
      _id: crypto.randomUUID(),
      actionPerformed,
      resourceAffected,
      timestamp: new Date().toISOString(),
      userId,
      details: `${details} | Business: ${businessId}`,
      ipAddress: 'backend-service'
    };

    await BaseCrudService.create('auditlogs', auditLog);
  } catch (error) {
    // Log audit failure but don't fail the main operation
    console.error('Audit logging failed:', error);
  }
}

/**
 * Validates authentication context from current member session
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
 * Generates AI Customer Brief
 * 
 * LIFECYCLE:
 * 1. Validate auth and customer access
 * 2. Build AI context from customer 360 + knowledge base
 * 3. Call AI provider with context
 * 4. Validate structured output
 * 5. Store in AICustomerBriefs collection
 * 6. Log audit event
 * 
 * @param customerId - Customer to generate brief for
 * @param isDemo - Whether to use demo data
 * @returns Generated brief with metadata
 */
async function generateCustomerBrief(
  customerId: string,
  authContext: AuthContext,
  isDemo: boolean = false
): Promise<AICustomerBrief> {
  try {
    // Authorize customer access
    const hasAccess = await authorizeRead('customers', customerId, authContext);
    if (!hasAccess) {
      throw new Error(`Unauthorized: Cannot access customer ${customerId}`);
    }

    // Build AI context
    const aiContext = await buildAIContext(customerId, authContext);

    // Generate brief with AI provider
    const briefSchema = await generateBriefWithAI(aiContext, authContext.businessId, isDemo);

    // Validate structured output
    if (!validateBriefSchema(briefSchema)) {
      throw new Error('AI output validation failed: Invalid brief schema');
    }

    // Create brief record
    const brief: AICustomerBrief = {
      _id: crypto.randomUUID(),
      customerId,
      businessId: authContext.businessId,
      briefContent: briefSchema.briefContent,
      keyInsights: briefSchema.keyInsights,
      recommendedActions: briefSchema.recommendedActions,
      riskFactors: briefSchema.riskFactors,
      opportunities: briefSchema.opportunities,
      generatedAt: new Date().toISOString(),
      generatedBy: authContext.memberId,
      aiProvider: 'mock-provider', // In production: 'openai', 'anthropic', etc.
      modelVersion: '1.0',
      isDemo
    };

    // Store in CMS
    await BaseCrudService.create('aicustomerbriefs', brief);

    // Log audit event
    await logAuditEvent(
      'AI_BRIEF_GENERATED',
      `AICustomerBriefs:${brief._id}`,
      authContext.memberId,
      `Generated AI brief for customer ${customerId}`,
      authContext.businessId
    );

    return brief;
  } catch (error) {
    console.error('Brief generation failed:', error);
    
    // Log failure
    await logAuditEvent(
      'AI_BRIEF_GENERATION_FAILED',
      `Customer:${customerId}`,
      authContext.memberId,
      `Failed to generate brief: ${error.message}`,
      authContext.businessId
    );

    throw error;
  }
}

/**
 * Retrieves existing AI Customer Brief
 * 
 * @param customerId - Customer ID
 * @param authContext - Auth context for tenant isolation
 * @returns Latest brief for customer or null
 */
async function getCustomerBrief(
  customerId: string,
  authContext: AuthContext
): Promise<AICustomerBrief | null> {
  try {
    // Authorize customer access
    const hasAccess = await authorizeRead('customers', customerId, authContext);
    if (!hasAccess) {
      throw new Error(`Unauthorized: Cannot access customer ${customerId}`);
    }

    // Query briefs for this customer in this business
    const result = await BaseCrudService.getAll<AICustomerBrief>('aicustomerbriefs');

    // Filter by customer and business (client-side filtering due to CMS limitations)
    const briefs = result.items.filter(
      b => b.customerId === customerId && b.businessId === authContext.businessId
    );

    if (briefs.length === 0) {
      return null;
    }

    // Return most recent brief
    return briefs.sort(
      (a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime()
    )[0];
  } catch (error) {
    console.error('Failed to retrieve brief:', error);
    throw error;
  }
}

/**
 * Invalidates existing AI Customer Brief
 * Marks as stale, triggers regeneration on next request
 * 
 * @param customerId - Customer ID
 * @param authContext - Auth context
 */
async function invalidateCustomerBrief(
  customerId: string,
  authContext: AuthContext
): Promise<void> {
  try {
    // Authorize customer access
    const hasAccess = await authorizeRead('customers', customerId, authContext);
    if (!hasAccess) {
      throw new Error(`Unauthorized: Cannot access customer ${customerId}`);
    }

    // Get current brief
    const brief = await getCustomerBrief(customerId, authContext);
    if (!brief) {
      return; // No brief to invalidate
    }

    // Delete the brief (invalidation)
    await BaseCrudService.delete('aicustomerbriefs', brief._id);

    // Log audit event
    await logAuditEvent(
      'AI_BRIEF_INVALIDATED',
      `AICustomerBriefs:${brief._id}`,
      authContext.memberId,
      `Invalidated AI brief for customer ${customerId}`,
      authContext.businessId
    );
  } catch (error) {
    console.error('Brief invalidation failed:', error);
    
    // Log failure
    await logAuditEvent(
      'AI_BRIEF_INVALIDATION_FAILED',
      `Customer:${customerId}`,
      authContext.memberId,
      `Failed to invalidate brief: ${error.message}`,
      authContext.businessId
    );

    throw error;
  }
}

/**
 * HTTP Handler: Generate AI Customer Brief
 * POST /ai-customer-brief/generate
 * Body: { customerId: string, isDemo?: boolean }
 */
export async function post_generateAICustomerBrief(request: any) {
  try {
    const authContext = await validateAuthContext();
    const body = request.body ? JSON.parse(request.body) : {};
    const { customerId, isDemo = false } = body;

    if (!customerId) {
      return badRequest({
        body: {
          error: 'Missing required field',
          message: 'customerId is required'
        }
      });
    }

    const brief = await generateCustomerBrief(customerId, authContext, isDemo);

    return ok({
      body: {
        success: true,
        data: brief,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('Generate Brief Error:', error);

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
        error: 'Failed to generate brief',
        message: error.message
      }
    });
  }
}

/**
 * HTTP Handler: Get AI Customer Brief
 * GET /ai-customer-brief?customerId=<id>
 */
export async function get_aiCustomerBrief(request: any) {
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

    const brief = await getCustomerBrief(customerId, authContext);

    if (!brief) {
      return notFound({
        body: {
          error: 'No brief found',
          message: `No AI brief exists for customer ${customerId}`
        }
      });
    }

    return ok({
      body: {
        success: true,
        data: brief
      }
    });
  } catch (error) {
    console.error('Get Brief Error:', error);

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
        error: 'Failed to retrieve brief',
        message: error.message
      }
    });
  }
}

/**
 * HTTP Handler: Invalidate AI Customer Brief
 * POST /ai-customer-brief/invalidate
 * Body: { customerId: string }
 */
export async function post_invalidateAICustomerBrief(request: any) {
  try {
    const authContext = await validateAuthContext();
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

    await invalidateCustomerBrief(customerId, authContext);

    return ok({
      body: {
        success: true,
        message: 'Brief invalidated successfully'
      }
    });
  } catch (error) {
    console.error('Invalidate Brief Error:', error);

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
        error: 'Failed to invalidate brief',
        message: error.message
      }
    });
  }
}

/**
 * Export service functions for internal use
 */
export {
  generateCustomerBrief,
  getCustomerBrief,
  invalidateCustomerBrief,
  validateBriefSchema
};
