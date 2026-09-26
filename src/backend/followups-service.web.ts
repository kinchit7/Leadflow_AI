/**
 * Follow-ups Service - Backend business logic for follow-up management
 * Handles tenant isolation, overdue tracking, and audit events
 */

import { BaseCrudService } from '@/integrations/cms';
import { Followups } from '@/entities';
import { AuthContext, authorizeRead, authorizeWrite } from './auth.web';
import { logFollowupCreated, logFollowupCompleted, isFollowupOverdue, getDaysUntilDue } from './activity-events.web';

/**
 * Get follow-up with authorization check
 */
export async function getFollowupAuthorized(
  followupId: string,
  authContext: AuthContext
): Promise<Followups | null> {
  try {
    const authorized = await authorizeRead('followups', followupId, authContext);
    if (!authorized) {
      console.error('Unauthorized access to follow-up:', followupId);
      return null;
    }

    return await BaseCrudService.getById<Followups>('followups', followupId);
  } catch (error) {
    console.error('Failed to get follow-up:', error);
    throw error;
  }
}

/**
 * Get all follow-ups for business with tenant isolation
 */
export async function getFollowupsForBusiness(
  authContext: AuthContext,
  limit: number = 50,
  skip: number = 0
): Promise<{ items: Followups[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<Followups>('followups', [], { limit, skip });
    
    const items = result.items
      ?.filter(fu => fu.businessId === authContext.businessId)
      .filter(fu => !fu.isDemo)
      || [];

    return {
      items,
      totalCount: items.length,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get follow-ups:', error);
    throw error;
  }
}

/**
 * Create follow-up with tenant isolation
 */
export async function createFollowupAuthorized(
  followupData: Omit<Followups, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<Followups> {
  try {
    const followup: Followups = {
      ...followupData,
      _id: crypto.randomUUID(),
      businessId: authContext.businessId,
      isDemo: false,
      createdAt: new Date(),
    };

    await BaseCrudService.create('followups', followup);

    // Log activity event
    if (followup.relatedRecordId) {
      await logFollowupCreated(
        '', // customerId would need to be resolved
        followup._id,
        authContext.businessId,
        authContext.memberId,
        followup.title || '',
        followup.dueDate || new Date()
      );
    }

    return followup;
  } catch (error) {
    console.error('Failed to create follow-up:', error);
    throw error;
  }
}

/**
 * Update follow-up with authorization
 */
export async function updateFollowupAuthorized(
  followupId: string,
  updates: Partial<Followups>,
  authContext: AuthContext
): Promise<Followups | null> {
  try {
    const authorized = await authorizeWrite('followups', followupId, authContext);
    if (!authorized) {
      console.error('Unauthorized update to follow-up:', followupId);
      return null;
    }

    const existingFollowup = await BaseCrudService.getById<Followups>('followups', followupId);
    if (!existingFollowup) return null;

    // Prevent tenant override
    const safeUpdates = {
      ...updates,
      businessId: existingFollowup.businessId,
      isDemo: existingFollowup.isDemo,
    };

    // Log completion if status changed to Completed
    if (updates.status === 'Completed' && existingFollowup.status !== 'Completed') {
      await logFollowupCompleted(
        '', // customerId would need to be resolved
        followupId,
        authContext.businessId,
        authContext.memberId,
        existingFollowup.title || ''
      );
    }

    await BaseCrudService.update('followups', {
      _id: followupId,
      ...safeUpdates,
    });

    return await BaseCrudService.getById<Followups>('followups', followupId);
  } catch (error) {
    console.error('Failed to update follow-up:', error);
    throw error;
  }
}

/**
 * Delete follow-up with authorization
 */
export async function deleteFollowupAuthorized(
  followupId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('followups', followupId, authContext);
    if (!authorized) {
      console.error('Unauthorized delete of follow-up:', followupId);
      return false;
    }

    await BaseCrudService.delete('followups', followupId);
    return true;
  } catch (error) {
    console.error('Failed to delete follow-up:', error);
    throw error;
  }
}

/**
 * Get follow-ups due today
 */
export async function getFollowupsDueToday(
  authContext: AuthContext
): Promise<Followups[]> {
  try {
    const result = await BaseCrudService.getAll<Followups>('followups', [], { limit: 100 });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return result.items
      ?.filter(fu => 
        fu.businessId === authContext.businessId &&
        !fu.isDemo &&
        fu.status !== 'Completed' &&
        new Date(fu.dueDate!) >= today &&
        new Date(fu.dueDate!) < tomorrow
      )
      || [];
  } catch (error) {
    console.error('Failed to get follow-ups due today:', error);
    return [];
  }
}

/**
 * Get overdue follow-ups
 */
export async function getOverdueFollowups(
  authContext: AuthContext
): Promise<Followups[]> {
  try {
    const result = await BaseCrudService.getAll<Followups>('followups', [], { limit: 100 });
    
    return result.items
      ?.filter(fu => 
        fu.businessId === authContext.businessId &&
        !fu.isDemo &&
        fu.status !== 'Completed' &&
        isFollowupOverdue(fu)
      )
      .sort((a, b) => {
        // Sort by most overdue first
        const aDaysOverdue = getDaysUntilDue(a);
        const bDaysOverdue = getDaysUntilDue(b);
        return aDaysOverdue - bDaysOverdue;
      })
      || [];
  } catch (error) {
    console.error('Failed to get overdue follow-ups:', error);
    return [];
  }
}

/**
 * Get pending follow-ups for a related record
 */
export async function getPendingFollowupsForRecord(
  relatedRecordId: string,
  authContext: AuthContext
): Promise<Followups[]> {
  try {
    const result = await BaseCrudService.getAll<Followups>('followups', [], { limit: 100 });
    
    return result.items
      ?.filter(fu => 
        fu.businessId === authContext.businessId &&
        !fu.isDemo &&
        fu.relatedRecordId === relatedRecordId &&
        fu.status !== 'Completed'
      )
      || [];
  } catch (error) {
    console.error('Failed to get pending follow-ups:', error);
    return [];
  }
}

/**
 * Get follow-up metrics
 */
export async function getFollowupMetrics(
  authContext: AuthContext
): Promise<{
  total: number;
  dueToday: number;
  overdue: number;
  completed: number;
}> {
  try {
    const result = await BaseCrudService.getAll<Followups>('followups', [], { limit: 1000 });
    
    const followups = result.items?.filter(fu => 
      fu.businessId === authContext.businessId &&
      !fu.isDemo
    ) || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: followups.length,
      dueToday: followups.filter(fu => 
        fu.status !== 'Completed' &&
        new Date(fu.dueDate!) >= today &&
        new Date(fu.dueDate!) < tomorrow
      ).length,
      overdue: followups.filter(fu => 
        fu.status !== 'Completed' &&
        isFollowupOverdue(fu)
      ).length,
      completed: followups.filter(fu => fu.status === 'Completed').length,
    };
  } catch (error) {
    console.error('Failed to get follow-up metrics:', error);
    return { total: 0, dueToday: 0, overdue: 0, completed: 0 };
  }
}
