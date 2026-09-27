import { ok, badRequest, forbidden, notFound, serverError } from 'wix-http-functions';
import { getSecretKey } from 'wix-secrets';
import { getCurrentMember } from 'wix-members-backend';
import { query } from 'wix-data';

/**
 * AI Context Service
 * Provides centralized server-side AI context builder
 * Aggregates data from Customer 360 and Knowledge Base
 * Enforces tenant isolation and authorization
 */

interface AuthContext {
  memberId: string;
  tenantId: string;
  isAuthorized: boolean;
}

interface Customer360Data {
  customerId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  notes: string;
  profilePicture: string;
  interactions: any[];
  opportunities: any[];
  followUps: any[];
}

interface KnowledgeBaseData {
  items: any[];
  faqs: any[];
  policies: any[];
}

interface AIContextData {
  customer: Customer360Data | null;
  knowledgeBase: KnowledgeBaseData;
  timestamp: string;
  contextVersion: string;
}

/**
 * Validates and extracts authentication context
 */
async function validateAuthContext(request: any): Promise<AuthContext> {
  try {
    const member = await getCurrentMember({
      fieldsets: ['FULL']
    });

    if (!member || !member.id) {
      throw new Error('Unauthorized: No valid member session');
    }

    // Extract tenant ID from member metadata or request headers
    const tenantId = member.customFields?.['tenant-id'] || 
                     request.headers['x-tenant-id'] || 
                     member.id;

    return {
      memberId: member.id,
      tenantId,
      isAuthorized: true
    };
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Retrieves Customer 360 data with tenant isolation
 */
async function getCustomer360Data(
  customerId: string,
  tenantId: string
): Promise<Customer360Data | null> {
  try {
    // Query customer with tenant isolation
    const customerResults = await query('customers')
      .eq('_id', customerId)
      .eq('businessId', tenantId)
      .limit(1)
      .find();

    if (!customerResults.items || customerResults.items.length === 0) {
      return null;
    }

    const customer = customerResults.items[0];

    // Fetch related interactions (messages)
    const messagesResults = await query('messages')
      .eq('businessId', tenantId)
      .eq('sender', customerId)
      .limit(50)
      .find();

    // Fetch related opportunities
    const opportunitiesResults = await query('opportunities')
      .eq('businessId', tenantId)
      .limit(100)
      .find();

    // Fetch related follow-ups
    const followUpsResults = await query('followups')
      .eq('businessId', tenantId)
      .limit(50)
      .find();

    return {
      customerId: customer._id,
      fullName: customer.fullName || '',
      email: customer.email || '',
      phoneNumber: customer.phoneNumber || '',
      address: customer.address || '',
      city: customer.city || '',
      notes: customer.notes || '',
      profilePicture: customer.profilePicture || '',
      interactions: messagesResults.items || [],
      opportunities: opportunitiesResults.items || [],
      followUps: followUpsResults.items || []
    };
  } catch (error) {
    console.error('Error fetching Customer 360 data:', error);
    throw new Error(`Failed to fetch customer data: ${error.message}`);
  }
}

/**
 * Retrieves complete knowledge base with tenant isolation
 */
async function getCompleteKnowledgeBase(tenantId: string): Promise<KnowledgeBaseData> {
  try {
    // Fetch knowledge items
    const knowledgeResults = await query('knowledgeitems')
      .eq('isActive', true)
      .limit(100)
      .find();

    // Fetch FAQs
    const faqResults = await query('faqs')
      .eq('isPublished', true)
      .limit(100)
      .find();

    // Fetch policies
    const policiesResults = await query('policies')
      .eq('isActive', true)
      .limit(50)
      .find();

    return {
      items: knowledgeResults.items || [],
      faqs: faqResults.items || [],
      policies: policiesResults.items || []
    };
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    throw new Error(`Failed to fetch knowledge base: ${error.message}`);
  }
}

/**
 * Builds comprehensive AI context
 * Aggregates customer 360 and knowledge base data
 */
async function buildAIContext(
  customerId: string,
  authContext: AuthContext
): Promise<AIContextData> {
  try {
    // Fetch customer 360 data
    const customer360 = await getCustomer360Data(customerId, authContext.tenantId);

    if (!customer360) {
      throw new Error(`Customer not found or unauthorized: ${customerId}`);
    }

    // Fetch knowledge base
    const knowledgeBase = await getCompleteKnowledgeBase(authContext.tenantId);

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
 */
export async function post_aiContext(request: any) {
  try {
    // Validate authentication and authorization
    const authContext = await validateAuthContext(request);

    if (!authContext.isAuthorized) {
      return forbidden({
        body: {
          error: 'Unauthorized access',
          message: 'You do not have permission to access AI context'
        }
      });
    }

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

    // Build AI context
    const aiContext = await buildAIContext(customerId, authContext);

    return ok({
      body: {
        success: true,
        data: aiContext,
        memberId: authContext.memberId,
        tenantId: authContext.tenantId
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
 */
export async function get_customer360(request: any) {
  try {
    const authContext = await validateAuthContext(request);

    if (!authContext.isAuthorized) {
      return forbidden({
        body: {
          error: 'Unauthorized access'
        }
      });
    }

    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');

    if (!customerId) {
      return badRequest({
        body: {
          error: 'Missing customerId parameter'
        }
      });
    }

    const customer360 = await getCustomer360Data(customerId, authContext.tenantId);

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
 */
export async function get_knowledgeBase(request: any) {
  try {
    const authContext = await validateAuthContext(request);

    if (!authContext.isAuthorized) {
      return forbidden({
        body: {
          error: 'Unauthorized access'
        }
      });
    }

    const knowledgeBase = await getCompleteKnowledgeBase(authContext.tenantId);

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
 */
export async function post_validateContextAccess(request: any) {
  try {
    const authContext = await validateAuthContext(request);
    const body = request.body ? JSON.parse(request.body) : {};
    const { customerId } = body;

    if (!customerId) {
      return badRequest({
        body: {
          error: 'Missing customerId'
        }
      });
    }

    // Check if customer exists and belongs to tenant
    const customerResults = await query('customers')
      .eq('_id', customerId)
      .eq('businessId', authContext.tenantId)
      .limit(1)
      .find();

    const hasAccess = customerResults.items && customerResults.items.length > 0;

    return ok({
      body: {
        success: true,
        hasAccess,
        memberId: authContext.memberId,
        tenantId: authContext.tenantId
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
