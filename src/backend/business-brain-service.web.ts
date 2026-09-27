/**
 * Business Brain Service - Backend business logic for AI knowledge layer
 * Manages business profiles, products/services, FAQs, policies, and AI rules
 * Serves as the source of truth for all LeadFlow AI capabilities
 * Handles tenant isolation and authorization
 */

import { BaseCrudService } from '@/integrations/cms';
import {
  Products,
  Services,
  FrequentlyAskedQuestions,
  BusinessPolicies,
  KnowledgeItems,
  Businesses,
} from '@/entities';
import { AuthContext, authorizeRead, authorizeWrite } from './auth.web';

/**
 * Business Brain Profile - Central knowledge entity
 */
export interface BusinessBrainProfile {
  businessId: string;
  businessName: string;
  industry: string;
  location: string;
  teamSize: number;
  businessLogo?: string;
  productsCount: number;
  servicesCount: number;
  faqsCount: number;
  policiesCount: number;
  businessHoursConfigured: boolean;
  lastUpdated: Date;
}

/**
 * AI Rules Configuration
 */
export interface AIRulesConfig {
  _id: string;
  businessId: string;
  enableAutoResponses: boolean;
  enableLeadQualification: boolean;
  enableFollowUpReminders: boolean;
  enableInsights: boolean;
  responseTemplate?: string;
  qualificationCriteria?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get complete business brain profile with all knowledge layers
 */
export async function getBusinessBrainProfile(
  authContext: AuthContext
): Promise<BusinessBrainProfile | null> {
  try {
    // Get business info
    const businessResult = await BaseCrudService.getAll<Businesses>('businesses', [], { limit: 100 });
    const business = businessResult.items?.find(b => b._id === authContext.businessId);

    if (!business) {
      console.error('Business not found:', authContext.businessId);
      return null;
    }

    // Get counts for all knowledge layers
    const [productsResult, servicesResult, faqsResult, policiesResult, knowledgeResult] =
      await Promise.all([
        BaseCrudService.getAll<Products>('products', [], { limit: 1000 }),
        BaseCrudService.getAll<Services>('services', [], { limit: 1000 }),
        BaseCrudService.getAll<FrequentlyAskedQuestions>('faqs', [], { limit: 1000 }),
        BaseCrudService.getAll<BusinessPolicies>('policies', [], { limit: 1000 }),
        BaseCrudService.getAll<KnowledgeItems>('knowledgeitems', [], { limit: 1000 }),
      ]);

    const productsCount = productsResult.items?.length || 0;
    const servicesCount = servicesResult.items?.length || 0;
    const faqsCount = faqsResult.items?.length || 0;
    const policiesCount = policiesResult.items?.length || 0;
    const businessHoursConfigured = (knowledgeResult.items?.length || 0) > 0;

    return {
      businessId: authContext.businessId,
      businessName: business.businessName || '',
      industry: business.industry || '',
      location: business.location || '',
      teamSize: business.teamSize || 0,
      businessLogo: business.businessLogo,
      productsCount,
      servicesCount,
      faqsCount,
      policiesCount,
      businessHoursConfigured,
      lastUpdated: business._updatedDate || new Date(),
    };
  } catch (error) {
    console.error('Failed to get business brain profile:', error);
    throw error;
  }
}

/**
 * Get all products for business
 */
export async function getBusinessProducts(
  authContext: AuthContext,
  limit: number = 100,
  skip: number = 0
): Promise<{ items: Products[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<Products>('products', [], { limit, skip });

    return {
      items: result.items || [],
      totalCount: result.totalCount || 0,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get products:', error);
    throw error;
  }
}

/**
 * Create product with tenant isolation
 */
export async function createProduct(
  productData: Omit<Products, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<Products> {
  try {
    const authorized = await authorizeWrite('products', '', authContext);
    if (!authorized) {
      throw new Error('Unauthorized to create product');
    }

    const product: Products = {
      ...productData,
      _id: crypto.randomUUID(),
    };

    await BaseCrudService.create('products', product);
    return product;
  } catch (error) {
    console.error('Failed to create product:', error);
    throw error;
  }
}

/**
 * Update product
 */
export async function updateProduct(
  productId: string,
  updates: Partial<Products>,
  authContext: AuthContext
): Promise<Products | null> {
  try {
    const authorized = await authorizeWrite('products', productId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to update product');
    }

    await BaseCrudService.update('products', {
      _id: productId,
      ...updates,
    });

    return await BaseCrudService.getById<Products>('products', productId);
  } catch (error) {
    console.error('Failed to update product:', error);
    throw error;
  }
}

/**
 * Delete product
 */
export async function deleteProduct(
  productId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('products', productId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to delete product');
    }

    await BaseCrudService.delete('products', productId);
    return true;
  } catch (error) {
    console.error('Failed to delete product:', error);
    throw error;
  }
}

/**
 * Get all services for business
 */
export async function getBusinessServices(
  authContext: AuthContext,
  limit: number = 100,
  skip: number = 0
): Promise<{ items: Services[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<Services>('services', [], { limit, skip });

    return {
      items: result.items || [],
      totalCount: result.totalCount || 0,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get services:', error);
    throw error;
  }
}

/**
 * Create service with tenant isolation
 */
export async function createService(
  serviceData: Omit<Services, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<Services> {
  try {
    const authorized = await authorizeWrite('services', '', authContext);
    if (!authorized) {
      throw new Error('Unauthorized to create service');
    }

    const service: Services = {
      ...serviceData,
      _id: crypto.randomUUID(),
    };

    await BaseCrudService.create('services', service);
    return service;
  } catch (error) {
    console.error('Failed to create service:', error);
    throw error;
  }
}

/**
 * Update service
 */
export async function updateService(
  serviceId: string,
  updates: Partial<Services>,
  authContext: AuthContext
): Promise<Services | null> {
  try {
    const authorized = await authorizeWrite('services', serviceId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to update service');
    }

    await BaseCrudService.update('services', {
      _id: serviceId,
      ...updates,
    });

    return await BaseCrudService.getById<Services>('services', serviceId);
  } catch (error) {
    console.error('Failed to update service:', error);
    throw error;
  }
}

/**
 * Delete service
 */
export async function deleteService(
  serviceId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('services', serviceId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to delete service');
    }

    await BaseCrudService.delete('services', serviceId);
    return true;
  } catch (error) {
    console.error('Failed to delete service:', error);
    throw error;
  }
}

/**
 * Get all FAQs for business
 */
export async function getBusinessFAQs(
  authContext: AuthContext,
  limit: number = 100,
  skip: number = 0
): Promise<{ items: FrequentlyAskedQuestions[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<FrequentlyAskedQuestions>('faqs', [], {
      limit,
      skip,
    });

    return {
      items: result.items || [],
      totalCount: result.totalCount || 0,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get FAQs:', error);
    throw error;
  }
}

/**
 * Create FAQ with tenant isolation
 */
export async function createFAQ(
  faqData: Omit<FrequentlyAskedQuestions, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<FrequentlyAskedQuestions> {
  try {
    const authorized = await authorizeWrite('faqs', '', authContext);
    if (!authorized) {
      throw new Error('Unauthorized to create FAQ');
    }

    const faq: FrequentlyAskedQuestions = {
      ...faqData,
      _id: crypto.randomUUID(),
      isPublished: faqData.isPublished ?? true,
    };

    await BaseCrudService.create('faqs', faq);
    return faq;
  } catch (error) {
    console.error('Failed to create FAQ:', error);
    throw error;
  }
}

/**
 * Update FAQ
 */
export async function updateFAQ(
  faqId: string,
  updates: Partial<FrequentlyAskedQuestions>,
  authContext: AuthContext
): Promise<FrequentlyAskedQuestions | null> {
  try {
    const authorized = await authorizeWrite('faqs', faqId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to update FAQ');
    }

    await BaseCrudService.update('faqs', {
      _id: faqId,
      ...updates,
      lastUpdated: new Date(),
    });

    return await BaseCrudService.getById<FrequentlyAskedQuestions>('faqs', faqId);
  } catch (error) {
    console.error('Failed to update FAQ:', error);
    throw error;
  }
}

/**
 * Delete FAQ
 */
export async function deleteFAQ(
  faqId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('faqs', faqId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to delete FAQ');
    }

    await BaseCrudService.delete('faqs', faqId);
    return true;
  } catch (error) {
    console.error('Failed to delete FAQ:', error);
    throw error;
  }
}

/**
 * Get all policies for business
 */
export async function getBusinessPolicies(
  authContext: AuthContext,
  limit: number = 100,
  skip: number = 0
): Promise<{ items: BusinessPolicies[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<BusinessPolicies>('policies', [], {
      limit,
      skip,
    });

    return {
      items: result.items || [],
      totalCount: result.totalCount || 0,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get policies:', error);
    throw error;
  }
}

/**
 * Create policy with tenant isolation
 */
export async function createPolicy(
  policyData: Omit<BusinessPolicies, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<BusinessPolicies> {
  try {
    const authorized = await authorizeWrite('policies', '', authContext);
    if (!authorized) {
      throw new Error('Unauthorized to create policy');
    }

    const policy: BusinessPolicies = {
      ...policyData,
      _id: crypto.randomUUID(),
      isActive: policyData.isActive ?? true,
    };

    await BaseCrudService.create('policies', policy);
    return policy;
  } catch (error) {
    console.error('Failed to create policy:', error);
    throw error;
  }
}

/**
 * Update policy
 */
export async function updatePolicy(
  policyId: string,
  updates: Partial<BusinessPolicies>,
  authContext: AuthContext
): Promise<BusinessPolicies | null> {
  try {
    const authorized = await authorizeWrite('policies', policyId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to update policy');
    }

    await BaseCrudService.update('policies', {
      _id: policyId,
      ...updates,
      lastUpdated: new Date(),
    });

    return await BaseCrudService.getById<BusinessPolicies>('policies', policyId);
  } catch (error) {
    console.error('Failed to update policy:', error);
    throw error;
  }
}

/**
 * Delete policy
 */
export async function deletePolicy(
  policyId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('policies', policyId, authContext);
    if (!authorized) {
      throw new Error('Unauthorized to delete policy');
    }

    await BaseCrudService.delete('policies', policyId);
    return true;
  } catch (error) {
    console.error('Failed to delete policy:', error);
    throw error;
  }
}

/**
 * Get business hours configuration
 */
export async function getBusinessHours(
  authContext: AuthContext
): Promise<KnowledgeItems[]> {
  try {
    const result = await BaseCrudService.getAll<KnowledgeItems>('knowledgeitems', [], {
      limit: 100,
    });

    return result.items || [];
  } catch (error) {
    console.error('Failed to get business hours:', error);
    throw error;
  }
}

/**
 * Update business hours
 */
export async function updateBusinessHours(
  hoursData: Omit<KnowledgeItems, '_id' | '_createdDate' | '_updatedDate'>[],
  authContext: AuthContext
): Promise<KnowledgeItems[]> {
  try {
    const authorized = await authorizeWrite('knowledgeitems', '', authContext);
    if (!authorized) {
      throw new Error('Unauthorized to update business hours');
    }

    // Delete existing hours
    const existing = await BaseCrudService.getAll<KnowledgeItems>('knowledgeitems', [], {
      limit: 100,
    });
    for (const item of existing.items || []) {
      await BaseCrudService.delete('knowledgeitems', item._id);
    }

    // Create new hours
    const created: KnowledgeItems[] = [];
    for (const hours of hoursData) {
      const item: KnowledgeItems = {
        ...hours,
        _id: crypto.randomUUID(),
        isActive: true,
      };
      await BaseCrudService.create('knowledgeitems', item);
      created.push(item);
    }

    return created;
  } catch (error) {
    console.error('Failed to update business hours:', error);
    throw error;
  }
}

/**
 * Get AI rules configuration for business
 * Note: This is a placeholder for future AI rules storage
 */
export async function getAIRulesConfig(
  authContext: AuthContext
): Promise<AIRulesConfig | null> {
  try {
    // For now, return default config
    // In future, this will be stored in a dedicated collection
    return {
      _id: `ai-rules-${authContext.businessId}`,
      businessId: authContext.businessId,
      enableAutoResponses: true,
      enableLeadQualification: true,
      enableFollowUpReminders: true,
      enableInsights: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to get AI rules config:', error);
    throw error;
  }
}

/**
 * Update AI rules configuration
 */
export async function updateAIRulesConfig(
  config: Partial<AIRulesConfig>,
  authContext: AuthContext
): Promise<AIRulesConfig | null> {
  try {
    const authorized = await authorizeWrite('ai-rules', '', authContext);
    if (!authorized) {
      throw new Error('Unauthorized to update AI rules');
    }

    // For now, just return updated config
    // In future, this will persist to database
    return {
      _id: `ai-rules-${authContext.businessId}`,
      businessId: authContext.businessId,
      enableAutoResponses: config.enableAutoResponses ?? true,
      enableLeadQualification: config.enableLeadQualification ?? true,
      enableFollowUpReminders: config.enableFollowUpReminders ?? true,
      enableInsights: config.enableInsights ?? true,
      responseTemplate: config.responseTemplate,
      qualificationCriteria: config.qualificationCriteria,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to update AI rules config:', error);
    throw error;
  }
}

/**
 * Get complete knowledge base for AI processing
 * Aggregates all business knowledge into a single context
 */
export async function getCompleteKnowledgeBase(
  authContext: AuthContext
): Promise<{
  profile: BusinessBrainProfile | null;
  products: Products[];
  services: Services[];
  faqs: FrequentlyAskedQuestions[];
  policies: BusinessPolicies[];
  businessHours: KnowledgeItems[];
  aiRules: AIRulesConfig | null;
}> {
  try {
    const [profile, productsResult, servicesResult, faqsResult, policiesResult, hoursResult, aiRules] =
      await Promise.all([
        getBusinessBrainProfile(authContext),
        getBusinessProducts(authContext, 1000),
        getBusinessServices(authContext, 1000),
        getBusinessFAQs(authContext, 1000),
        getBusinessPolicies(authContext, 1000),
        getBusinessHours(authContext),
        getAIRulesConfig(authContext),
      ]);

    return {
      profile,
      products: productsResult.items,
      services: servicesResult.items,
      faqs: faqsResult.items,
      policies: policiesResult.items,
      businessHours: hoursResult,
      aiRules,
    };
  } catch (error) {
    console.error('Failed to get complete knowledge base:', error);
    throw error;
  }
}
