/**
 * Today Service - Prioritized actionable work for the dashboard
 * Shows high-priority leads, due follow-ups, overdue items, and metrics
 */

import { BaseCrudService } from '@/integrations/cms';
import { Leads, Opportunities, Followups, SupportTickets } from '@/entities';
import { AuthContext } from './auth.web';
import { getHighPriorityLeads, getUnassignedLeads, getQualifiedLeadsWithoutAction } from './leads-service.web';
import { getFollowupsDueToday, getOverdueFollowups } from './followups-service.web';
import { getUnresolvedTickets, getEscalatedTickets } from './support-service.web';
import { getOpenOpportunitiesWithoutAction } from './opportunities-service.web';

export interface TodayDashboard {
  highPriorityLeads: Leads[];
  followupsDueToday: Followups[];
  overdueFollowups: Followups[];
  unassignedLeads: Leads[];
  qualifiedLeadsWithoutAction: Leads[];
  opportunitiesWithoutAction: Opportunities[];
  unresolvedTickets: SupportTickets[];
  escalatedTickets: SupportTickets[];
  metrics: {
    newLeadsToday: number;
    dueTodayCount: number;
    overdueCount: number;
    openOpportunitiesCount: number;
    openTicketsCount: number;
  };
}

/**
 * Get Today dashboard with all actionable items
 */
export async function getTodayDashboard(
  authContext: AuthContext
): Promise<TodayDashboard> {
  try {
    // Get all actionable items in parallel
    const [
      highPriorityLeads,
      followupsDueToday,
      overdueFollowups,
      unassignedLeads,
      qualifiedLeadsWithoutAction,
      opportunitiesWithoutAction,
      unresolvedTickets,
      escalatedTickets,
      leadsResult,
      opportunitiesResult,
      ticketsResult,
    ] = await Promise.all([
      getHighPriorityLeads(authContext),
      getFollowupsDueToday(authContext),
      getOverdueFollowups(authContext),
      getUnassignedLeads(authContext),
      getQualifiedLeadsWithoutAction(authContext),
      getOpenOpportunitiesWithoutAction(authContext),
      getUnresolvedTickets(authContext),
      getEscalatedTickets(authContext),
      BaseCrudService.getAll<Leads>('leads', [], { limit: 1000 }),
      BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 1000 }),
      BaseCrudService.getAll<SupportTickets>('tickets', [], { limit: 1000 }),
    ]);

    // Calculate metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newLeadsToday = leadsResult.items?.filter(l => 
      l.businessId === authContext.businessId &&
      !l.isDemo &&
      l._createdDate &&
      new Date(l._createdDate) >= today &&
      new Date(l._createdDate) < tomorrow
    ).length || 0;

    const openOpportunitiesCount = opportunitiesResult.items?.filter(o => 
      o.businessId === authContext.businessId &&
      !o.isDemo &&
      o.stage !== 'Won' &&
      o.stage !== 'Lost'
    ).length || 0;

    const openTicketsCount = ticketsResult.items?.filter(t => 
      t.businessId === authContext.businessId &&
      !t.isDemo &&
      t.status !== 'Resolved' &&
      t.status !== 'Closed'
    ).length || 0;

    return {
      highPriorityLeads,
      followupsDueToday,
      overdueFollowups,
      unassignedLeads,
      qualifiedLeadsWithoutAction,
      opportunitiesWithoutAction,
      unresolvedTickets,
      escalatedTickets,
      metrics: {
        newLeadsToday,
        dueTodayCount: followupsDueToday.length,
        overdueCount: overdueFollowups.length,
        openOpportunitiesCount,
        openTicketsCount,
      },
    };
  } catch (error) {
    console.error('Failed to get Today dashboard:', error);
    return {
      highPriorityLeads: [],
      followupsDueToday: [],
      overdueFollowups: [],
      unassignedLeads: [],
      qualifiedLeadsWithoutAction: [],
      opportunitiesWithoutAction: [],
      unresolvedTickets: [],
      escalatedTickets: [],
      metrics: {
        newLeadsToday: 0,
        dueTodayCount: 0,
        overdueCount: 0,
        openOpportunitiesCount: 0,
        openTicketsCount: 0,
      },
    };
  }
}

/**
 * Get high-priority action items (top 10)
 */
export async function getTopActionItems(
  authContext: AuthContext
): Promise<Array<{
  type: string;
  id: string;
  title: string;
  priority: string;
  dueDate?: Date | string;
  relatedCustomer?: string;
}>> {
  try {
    const dashboard = await getTodayDashboard(authContext);
    
    const items: Array<any> = [];

    // Add overdue follow-ups (highest priority)
    dashboard.overdueFollowups.forEach(fu => {
      items.push({
        type: 'followup',
        id: fu._id,
        title: fu.title || 'Follow-up',
        priority: 'CRITICAL',
        dueDate: fu.dueDate,
      });
    });

    // Add high-priority leads
    dashboard.highPriorityLeads.forEach(lead => {
      items.push({
        type: 'lead',
        id: lead._id,
        title: lead.requirement || 'Lead',
        priority: 'HIGH',
        dueDate: lead.nextFollowUp,
      });
    });

    // Add escalated tickets
    dashboard.escalatedTickets.forEach(ticket => {
      items.push({
        type: 'ticket',
        id: ticket._id,
        title: ticket.issueDescription || 'Support Ticket',
        priority: 'HIGH',
      });
    });

    // Add follow-ups due today
    dashboard.followupsDueToday.forEach(fu => {
      items.push({
        type: 'followup',
        id: fu._id,
        title: fu.title || 'Follow-up',
        priority: 'MEDIUM',
        dueDate: fu.dueDate,
      });
    });

    // Add unassigned leads
    dashboard.unassignedLeads.forEach(lead => {
      items.push({
        type: 'lead',
        id: lead._id,
        title: lead.requirement || 'Unassigned Lead',
        priority: 'MEDIUM',
      });
    });

    return items.slice(0, 10);
  } catch (error) {
    console.error('Failed to get top action items:', error);
    return [];
  }
}

/**
 * Get dashboard metrics summary
 */
export async function getDashboardMetrics(
  authContext: AuthContext
): Promise<{
  newLeads: number;
  dueTodayFollowups: number;
  overdueFollowups: number;
  openOpportunities: number;
  openTickets: number;
}> {
  try {
    const dashboard = await getTodayDashboard(authContext);
    return {
      newLeads: dashboard.metrics.newLeadsToday,
      dueTodayFollowups: dashboard.metrics.dueTodayCount,
      overdueFollowups: dashboard.metrics.overdueCount,
      openOpportunities: dashboard.metrics.openOpportunitiesCount,
      openTickets: dashboard.metrics.openTicketsCount,
    };
  } catch (error) {
    console.error('Failed to get dashboard metrics:', error);
    return {
      newLeads: 0,
      dueTodayFollowups: 0,
      overdueFollowups: 0,
      openOpportunities: 0,
      openTickets: 0,
    };
  }
}
