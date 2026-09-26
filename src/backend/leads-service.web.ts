/**
 * Leads Service - Backend business logic for lead management
 * Handles tenant isolation, priority calculation, and audit events
 */

import { BaseCrudService } from '@/integrations/cms';
import { Leads, Customers } from '@/entities';
import { AuthContext, authorizeRead, authorizeWrite } from './auth.web';
import { calculateLeadPriority, PriorityResult } from './priority-engine.web';
import { logLeadCreated, logLeadStageChanged } from './activity-events.web';

/**
 * Get lead with authorization check
 */
export async function getLeadAuthorized(
  leadId: string,
  authContext: AuthContext
): Promise<Leads | null> {
  try {
    const authorized = await authorizeRead('leads', leadId, authContext);
    if (!authorized) {
      console.error('Unauthorized access to lead:', leadId);
      return null;
    }

    return await BaseCrudService.getById<Leads>('leads', leadId);
  } catch (error) {
    console.error('Failed to get lead:', error);
    throw error;
  }
}

/**
 * Get all leads for business with tenant isolation
 */
export async function getLeadsForBusiness(
  authContext: AuthContext,
  limit: number = 50,
  skip: number = 0
): Promise<{ items: Leads[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<Leads>('leads', [], { limit, skip });
    
    const items = result.items
      ?.filter(lead => lead.businessId === authContext.businessId)
      .filter(lead => !lead.isDemo) // Exclude demo data in production
      || [];

    return {
      items,
      totalCount: items.length,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get leads:', error);
    throw error;
  }
}

/**
 * Create lead with tenant isolation and priority calculation
 */
export async function createLeadAuthorized(
  leadData: Omit<Leads, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<Leads> {
  try {
    // Enforce tenant ownership
    const lead: Leads = {
      ...leadData,
      _id: crypto.randomUUID(),
      businessId: authContext.businessId,
      isDemo: false,
    };

    // Calculate initial priority
    const priorityResult = await calculateLeadPriority(lead);
    lead.priority = priorityResult.priority;

    // Create the lead
    await BaseCrudService.create('leads', lead);

    // Log activity event
    if (lead.customer) {
      await logLeadCreated(lead.customer, lead._id, authContext.businessId, authContext.memberId);
    }

    return lead;
  } catch (error) {
    console.error('Failed to create lead:', error);
    throw error;
  }
}

/**
 * Update lead with authorization and audit trail
 */
export async function updateLeadAuthorized(
  leadId: string,
  updates: Partial<Leads>,
  authContext: AuthContext
): Promise<Leads | null> {
  try {
    const authorized = await authorizeWrite('leads', leadId, authContext);
    if (!authorized) {
      console.error('Unauthorized update to lead:', leadId);
      return null;
    }

    const existingLead = await BaseCrudService.getById<Leads>('leads', leadId);
    if (!existingLead) return null;

    // Prevent tenant override
    const safeUpdates = {
      ...updates,
      businessId: existingLead.businessId,
      isDemo: existingLead.isDemo,
    };

    // Recalculate priority if relevant fields changed
    if (updates.timeline || updates.value || updates.stage || updates.budget) {
      const priorityResult = await calculateLeadPriority({
        ...existingLead,
        ...safeUpdates,
      });
      safeUpdates.priority = priorityResult.priority;
    }

    // Log stage change if applicable
    if (updates.stage && updates.stage !== existingLead.stage) {
      await logLeadStageChanged(
        existingLead.customer || '',
        leadId,
        authContext.businessId,
        authContext.memberId,
        existingLead.stage || 'Unknown',
        updates.stage
      );
    }

    await BaseCrudService.update('leads', {
      _id: leadId,
      ...safeUpdates,
    });

    return await BaseCrudService.getById<Leads>('leads', leadId);
  } catch (error) {
    console.error('Failed to update lead:', error);
    throw error;
  }
}

/**
 * Override lead priority with audit trail
 */
export async function overrideLeadPriority(
  leadId: string,
  newPriority: 'HIGH' | 'MEDIUM' | 'LOW',
  reason: string,
  authContext: AuthContext
): Promise<Leads | null> {
  try {
    const authorized = await authorizeWrite('leads', leadId, authContext);
    if (!authorized) {
      console.error('Unauthorized priority override:', leadId);
      return null;
    }

    const lead = await BaseCrudService.getById<Leads>('leads', leadId);
    if (!lead) return null;

    await BaseCrudService.update('leads', {
      _id: leadId,
      priority: newPriority,
      priorityOverride: true,
      priorityOverrideReason: reason,
      priorityOverrideBy: authContext.memberId,
      priorityOverrideDate: new Date(),
    });

    return await BaseCrudService.getById<Leads>('leads', leadId);
  } catch (error) {
    console.error('Failed to override priority:', error);
    throw error;
  }
}

/**
 * Delete lead with authorization
 */
export async function deleteLeadAuthorized(
  leadId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('leads', leadId, authContext);
    if (!authorized) {
      console.error('Unauthorized delete of lead:', leadId);
      return false;
    }

    await BaseCrudService.delete('leads', leadId);
    return true;
  } catch (error) {
    console.error('Failed to delete lead:', error);
    throw error;
  }
}

/**
 * Get high-priority leads needing attention
 */
export async function getHighPriorityLeads(
  authContext: AuthContext
): Promise<Leads[]> {
  try {
    const result = await BaseCrudService.getAll<Leads>('leads', [], { limit: 100 });
    
    return result.items
      ?.filter(lead => 
        lead.businessId === authContext.businessId &&
        !lead.isDemo &&
        lead.priority === 'HIGH'
      )
      .sort((a, b) => {
        // Sort by timeline urgency
        const timelineOrder = { 'Urgent': 0, 'Within 7 days': 1, 'Within 30 days': 2 };
        const aOrder = timelineOrder[a.timeline as keyof typeof timelineOrder] ?? 999;
        const bOrder = timelineOrder[b.timeline as keyof typeof timelineOrder] ?? 999;
        return aOrder - bOrder;
      })
      || [];
  } catch (error) {
    console.error('Failed to get high-priority leads:', error);
    return [];
  }
}

/**
 * Get unassigned leads
 */
export async function getUnassignedLeads(
  authContext: AuthContext
): Promise<Leads[]> {
  try {
    const result = await BaseCrudService.getAll<Leads>('leads', [], { limit: 100 });
    
    return result.items
      ?.filter(lead => 
        lead.businessId === authContext.businessId &&
        !lead.isDemo &&
        (!lead.owner || lead.owner === '')
      )
      || [];
  } catch (error) {
    console.error('Failed to get unassigned leads:', error);
    return [];
  }
}

/**
 * Get qualified leads without next action
 */
export async function getQualifiedLeadsWithoutAction(
  authContext: AuthContext
): Promise<Leads[]> {
  try {
    const result = await BaseCrudService.getAll<Leads>('leads', [], { limit: 100 });
    
    return result.items
      ?.filter(lead => 
        lead.businessId === authContext.businessId &&
        !lead.isDemo &&
        lead.stage === 'Qualified' &&
        (!lead.nextFollowUp || new Date(lead.nextFollowUp) < new Date())
      )
      || [];
  } catch (error) {
    console.error('Failed to get qualified leads without action:', error);
    return [];
  }
}
