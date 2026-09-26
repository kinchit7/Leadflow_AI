/**
 * Opportunities Service - Backend business logic for opportunity management
 * Handles tenant isolation, priority calculation, and audit events
 */

import { BaseCrudService } from '@/integrations/cms';
import { Opportunities } from '@/entities';
import { AuthContext, authorizeRead, authorizeWrite } from './auth.web';
import { calculateOpportunityPriority } from './priority-engine.web';
import { logOpportunityCreated } from './activity-events.web';

/**
 * Get opportunity with authorization check
 */
export async function getOpportunityAuthorized(
  opportunityId: string,
  authContext: AuthContext
): Promise<Opportunities | null> {
  try {
    const authorized = await authorizeRead('opportunities', opportunityId, authContext);
    if (!authorized) {
      console.error('Unauthorized access to opportunity:', opportunityId);
      return null;
    }

    return await BaseCrudService.getById<Opportunities>('opportunities', opportunityId);
  } catch (error) {
    console.error('Failed to get opportunity:', error);
    throw error;
  }
}

/**
 * Get all opportunities for business with tenant isolation
 */
export async function getOpportunitiesForBusiness(
  authContext: AuthContext,
  limit: number = 50,
  skip: number = 0
): Promise<{ items: Opportunities[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<Opportunities>('opportunities', [], { limit, skip });
    
    const items = result.items
      ?.filter(opp => opp.businessId === authContext.businessId)
      .filter(opp => !opp.isDemo)
      || [];

    return {
      items,
      totalCount: items.length,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get opportunities:', error);
    throw error;
  }
}

/**
 * Create opportunity with tenant isolation and priority calculation
 */
export async function createOpportunityAuthorized(
  opportunityData: Omit<Opportunities, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext,
  businessConfiguredThreshold: number = 100000
): Promise<Opportunities> {
  try {
    const opportunity: Opportunities = {
      ...opportunityData,
      _id: crypto.randomUUID(),
      businessId: authContext.businessId,
      isDemo: false,
    };

    // Calculate initial priority
    const priorityResult = await calculateOpportunityPriority(opportunity, businessConfiguredThreshold);
    opportunity.priority = priorityResult.priority;

    await BaseCrudService.create('opportunities', opportunity);

    // Log activity event
    if (opportunity.leadTitle) {
      await logOpportunityCreated(
        '', // customerId would need to be resolved from lead
        opportunity._id,
        authContext.businessId,
        authContext.memberId,
        opportunity.opportunityName || ''
      );
    }

    return opportunity;
  } catch (error) {
    console.error('Failed to create opportunity:', error);
    throw error;
  }
}

/**
 * Update opportunity with authorization and audit trail
 */
export async function updateOpportunityAuthorized(
  opportunityId: string,
  updates: Partial<Opportunities>,
  authContext: AuthContext,
  businessConfiguredThreshold: number = 100000
): Promise<Opportunities | null> {
  try {
    const authorized = await authorizeWrite('opportunities', opportunityId, authContext);
    if (!authorized) {
      console.error('Unauthorized update to opportunity:', opportunityId);
      return null;
    }

    const existingOpp = await BaseCrudService.getById<Opportunities>('opportunities', opportunityId);
    if (!existingOpp) return null;

    // Prevent tenant override
    const safeUpdates = {
      ...updates,
      businessId: existingOpp.businessId,
      isDemo: existingOpp.isDemo,
    };

    // Recalculate priority if relevant fields changed
    if (updates.pipelineValue || updates.stage || updates.expectedCloseDate || updates.probability) {
      const priorityResult = await calculateOpportunityPriority(
        {
          ...existingOpp,
          ...safeUpdates,
        },
        businessConfiguredThreshold
      );
      safeUpdates.priority = priorityResult.priority;
    }

    await BaseCrudService.update('opportunities', {
      _id: opportunityId,
      ...safeUpdates,
    });

    return await BaseCrudService.getById<Opportunities>('opportunities', opportunityId);
  } catch (error) {
    console.error('Failed to update opportunity:', error);
    throw error;
  }
}

/**
 * Override opportunity priority with audit trail
 */
export async function overrideOpportunityPriority(
  opportunityId: string,
  newPriority: 'HIGH' | 'MEDIUM' | 'LOW',
  reason: string,
  authContext: AuthContext
): Promise<Opportunities | null> {
  try {
    const authorized = await authorizeWrite('opportunities', opportunityId, authContext);
    if (!authorized) {
      console.error('Unauthorized priority override:', opportunityId);
      return null;
    }

    const opportunity = await BaseCrudService.getById<Opportunities>('opportunities', opportunityId);
    if (!opportunity) return null;

    await BaseCrudService.update('opportunities', {
      _id: opportunityId,
      priority: newPriority,
      priorityOverride: true,
      priorityOverrideReason: reason,
      priorityOverrideBy: authContext.memberId,
      priorityOverrideDate: new Date(),
    });

    return await BaseCrudService.getById<Opportunities>('opportunities', opportunityId);
  } catch (error) {
    console.error('Failed to override priority:', error);
    throw error;
  }
}

/**
 * Delete opportunity with authorization
 */
export async function deleteOpportunityAuthorized(
  opportunityId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('opportunities', opportunityId, authContext);
    if (!authorized) {
      console.error('Unauthorized delete of opportunity:', opportunityId);
      return false;
    }

    await BaseCrudService.delete('opportunities', opportunityId);
    return true;
  } catch (error) {
    console.error('Failed to delete opportunity:', error);
    throw error;
  }
}

/**
 * Get open opportunities without next action
 */
export async function getOpenOpportunitiesWithoutAction(
  authContext: AuthContext
): Promise<Opportunities[]> {
  try {
    const result = await BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 100 });
    
    return result.items
      ?.filter(opp => 
        opp.businessId === authContext.businessId &&
        !opp.isDemo &&
        opp.stage !== 'Won' &&
        opp.stage !== 'Lost'
      )
      || [];
  } catch (error) {
    console.error('Failed to get open opportunities:', error);
    return [];
  }
}

/**
 * Get opportunities by stage
 */
export async function getOpportunitiesByStage(
  stage: string,
  authContext: AuthContext
): Promise<Opportunities[]> {
  try {
    const result = await BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 100 });
    
    return result.items
      ?.filter(opp => 
        opp.businessId === authContext.businessId &&
        !opp.isDemo &&
        opp.stage === stage
      )
      || [];
  } catch (error) {
    console.error('Failed to get opportunities by stage:', error);
    return [];
  }
}
