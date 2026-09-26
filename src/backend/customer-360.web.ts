/**
 * Customer 360 Service - Comprehensive customer view with activity timeline
 * Includes overview, conversations, leads, opportunities, follow-ups, support, and activity
 */

import { BaseCrudService } from '@/integrations/cms';
import { Customers, Leads, Opportunities, Followups, SupportTickets, Conversations, Messages } from '@/entities';
import { AuthContext, authorizeRead } from './auth.web';
import { getCustomerActivityTimeline, ActivityEvent } from './activity-events.web';

export interface Customer360 {
  customer: Customers;
  leads: Leads[];
  opportunities: Opportunities[];
  followups: Followups[];
  supportTickets: SupportTickets[];
  conversations: Conversations[];
  recentMessages: Messages[];
  activityTimeline: ActivityEvent[];
  metrics: {
    totalLeads: number;
    activeLeads: number;
    totalOpportunities: number;
    openOpportunities: number;
    totalFollowups: number;
    overdueFollowups: number;
    openTickets: number;
  };
}

/**
 * Get complete Customer 360 view with authorization
 */
export async function getCustomer360(
  customerId: string,
  authContext: AuthContext
): Promise<Customer360 | null> {
  try {
    // Authorize customer access
    const authorized = await authorizeRead('customers', customerId, authContext);
    if (!authorized) {
      console.error('Unauthorized access to customer:', customerId);
      return null;
    }

    // Get customer
    const customer = await BaseCrudService.getById<Customers>('customers', customerId);
    if (!customer) return null;

    // Get related records
    const [leadsResult, opportunitiesResult, followupsResult, ticketsResult, conversationsResult, messagesResult] = await Promise.all([
      BaseCrudService.getAll<Leads>('leads', [], { limit: 100 }),
      BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 100 }),
      BaseCrudService.getAll<Followups>('followups', [], { limit: 100 }),
      BaseCrudService.getAll<SupportTickets>('tickets', [], { limit: 100 }),
      BaseCrudService.getAll<Conversations>('conversations', [], { limit: 100 }),
      BaseCrudService.getAll<Messages>('messages', [], { limit: 100 }),
    ]);

    // Filter by customer and tenant
    const leads = leadsResult.items?.filter(l => 
      l.customer === customerId && 
      l.businessId === authContext.businessId &&
      !l.isDemo
    ) || [];

    const opportunities = opportunitiesResult.items?.filter(o => 
      o.businessId === authContext.businessId &&
      !o.isDemo &&
      leads.some(l => l._id === o.leadTitle) // Related through lead
    ) || [];

    const followups = followupsResult.items?.filter(f => 
      f.businessId === authContext.businessId &&
      !f.isDemo &&
      (leads.some(l => l._id === f.relatedRecordId) ||
       opportunities.some(o => o._id === f.relatedRecordId))
    ) || [];

    const supportTickets = ticketsResult.items?.filter(t => 
      t.businessId === authContext.businessId &&
      !t.isDemo &&
      t.customerName === customer.fullName
    ) || [];

    const conversations = conversationsResult.items?.filter(c => 
      c.businessId === authContext.businessId &&
      !c.isDemo &&
      c.customerName === customer.fullName
    ) || [];

    const recentMessages = messagesResult.items?.filter(m => 
      m.businessId === authContext.businessId &&
      !m.isDemo &&
      conversations.some(c => c._id === m.sender) // Simplified - would need conversation_id field
    ).slice(0, 10) || [];

    // Get activity timeline
    const activityTimeline = await getCustomerActivityTimeline(customerId, authContext.businessId, 50);

    // Calculate metrics
    const metrics = {
      totalLeads: leads.length,
      activeLeads: leads.filter(l => l.stage !== 'Lost').length,
      totalOpportunities: opportunities.length,
      openOpportunities: opportunities.filter(o => o.stage !== 'Won' && o.stage !== 'Lost').length,
      totalFollowups: followups.length,
      overdueFollowups: followups.filter(f => 
        f.status !== 'Completed' && 
        new Date(f.dueDate!) < new Date()
      ).length,
      openTickets: supportTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length,
    };

    return {
      customer,
      leads,
      opportunities,
      followups,
      supportTickets,
      conversations,
      recentMessages,
      activityTimeline,
      metrics,
    };
  } catch (error) {
    console.error('Failed to get Customer 360:', error);
    return null;
  }
}

/**
 * Get customer overview (summary metrics)
 */
export async function getCustomerOverview(
  customerId: string,
  authContext: AuthContext
): Promise<{
  customer: Customers;
  metrics: any;
} | null> {
  try {
    const customer360 = await getCustomer360(customerId, authContext);
    if (!customer360) return null;

    return {
      customer: customer360.customer,
      metrics: customer360.metrics,
    };
  } catch (error) {
    console.error('Failed to get customer overview:', error);
    return null;
  }
}

/**
 * Get customer leads
 */
export async function getCustomerLeads(
  customerId: string,
  authContext: AuthContext
): Promise<Leads[]> {
  try {
    const customer360 = await getCustomer360(customerId, authContext);
    return customer360?.leads || [];
  } catch (error) {
    console.error('Failed to get customer leads:', error);
    return [];
  }
}

/**
 * Get customer opportunities
 */
export async function getCustomerOpportunities(
  customerId: string,
  authContext: AuthContext
): Promise<Opportunities[]> {
  try {
    const customer360 = await getCustomer360(customerId, authContext);
    return customer360?.opportunities || [];
  } catch (error) {
    console.error('Failed to get customer opportunities:', error);
    return [];
  }
}

/**
 * Get customer follow-ups
 */
export async function getCustomerFollowups(
  customerId: string,
  authContext: AuthContext
): Promise<Followups[]> {
  try {
    const customer360 = await getCustomer360(customerId, authContext);
    return customer360?.followups || [];
  } catch (error) {
    console.error('Failed to get customer follow-ups:', error);
    return [];
  }
}

/**
 * Get customer support tickets
 */
export async function getCustomerSupportTickets(
  customerId: string,
  authContext: AuthContext
): Promise<SupportTickets[]> {
  try {
    const customer360 = await getCustomer360(customerId, authContext);
    return customer360?.supportTickets || [];
  } catch (error) {
    console.error('Failed to get customer support tickets:', error);
    return [];
  }
}

/**
 * Get customer activity timeline
 */
export async function getCustomerTimeline(
  customerId: string,
  authContext: AuthContext
): Promise<ActivityEvent[]> {
  try {
    const customer360 = await getCustomer360(customerId, authContext);
    return customer360?.activityTimeline || [];
  } catch (error) {
    console.error('Failed to get customer timeline:', error);
    return [];
  }
}
