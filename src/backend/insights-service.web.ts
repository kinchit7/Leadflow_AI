/**
 * Insights Service - Analytics and metrics calculations
 * All calculations based on real authorized records
 */

import { BaseCrudService } from '@/integrations/cms';
import { Leads, Opportunities, Followups, SupportTickets } from '@/entities';
import { AuthContext } from './auth.web';

export interface InsightsMetrics {
  leads: {
    total: number;
    byStage: Record<string, number>;
    byPriority: Record<string, number>;
    avgValue: number;
    totalValue: number;
  };
  opportunities: {
    total: number;
    byStage: Record<string, number>;
    avgValue: number;
    totalValue: number;
    winRate: number;
  };
  followups: {
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  support: {
    total: number;
    byStatus: Record<string, number>;
    avgResolutionTime: number;
    openCount: number;
  };
  conversion: {
    leadToOpportunity: number;
    opportunityToWon: number;
  };
}

/**
 * Get comprehensive insights metrics
 */
export async function getInsightsMetrics(
  authContext: AuthContext
): Promise<InsightsMetrics> {
  try {
    const [leadsResult, opportunitiesResult, followupsResult, ticketsResult] = await Promise.all([
      BaseCrudService.getAll<Leads>('leads', [], { limit: 1000 }),
      BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 1000 }),
      BaseCrudService.getAll<Followups>('followups', [], { limit: 1000 }),
      BaseCrudService.getAll<SupportTickets>('tickets', [], { limit: 1000 }),
    ]);

    // Filter by tenant
    const leads = leadsResult.items?.filter(l => 
      l.businessId === authContext.businessId && !l.isDemo
    ) || [];

    const opportunities = opportunitiesResult.items?.filter(o => 
      o.businessId === authContext.businessId && !o.isDemo
    ) || [];

    const followups = followupsResult.items?.filter(f => 
      f.businessId === authContext.businessId && !f.isDemo
    ) || [];

    const tickets = ticketsResult.items?.filter(t => 
      t.businessId === authContext.businessId && !t.isDemo
    ) || [];

    // Calculate lead metrics
    const leadsByStage: Record<string, number> = {};
    const leadsByPriority: Record<string, number> = {};
    let totalLeadValue = 0;

    leads.forEach(lead => {
      leadsByStage[lead.stage || 'Unknown'] = (leadsByStage[lead.stage || 'Unknown'] || 0) + 1;
      leadsByPriority[lead.priority || 'Unknown'] = (leadsByPriority[lead.priority || 'Unknown'] || 0) + 1;
      totalLeadValue += lead.value || 0;
    });

    const avgLeadValue = leads.length > 0 ? totalLeadValue / leads.length : 0;

    // Calculate opportunity metrics
    const opportunitiesByStage: Record<string, number> = {};
    let totalOppValue = 0;
    let wonCount = 0;

    opportunities.forEach(opp => {
      opportunitiesByStage[opp.stage || 'Unknown'] = (opportunitiesByStage[opp.stage || 'Unknown'] || 0) + 1;
      totalOppValue += opp.pipelineValue || 0;
      if (opp.stage === 'Won') wonCount++;
    });

    const avgOppValue = opportunities.length > 0 ? totalOppValue / opportunities.length : 0;
    const winRate = opportunities.length > 0 ? (wonCount / opportunities.length) * 100 : 0;

    // Calculate follow-up metrics
    const completedFollowups = followups.filter(f => f.status === 'Completed').length;
    const overdueFollowups = followups.filter(f => 
      f.status !== 'Completed' && new Date(f.dueDate!) < new Date()
    ).length;
    const completionRate = followups.length > 0 ? (completedFollowups / followups.length) * 100 : 0;

    // Calculate support metrics
    const ticketsByStatus: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    tickets.forEach(ticket => {
      ticketsByStatus[ticket.status || 'Unknown'] = (ticketsByStatus[ticket.status || 'Unknown'] || 0) + 1;
      
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        if (ticket._createdDate && ticket._updatedDate) {
          const resolutionTime = new Date(ticket._updatedDate).getTime() - new Date(ticket._createdDate).getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      }
    });

    const avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0; // in hours
    const openTickets = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;

    // Calculate conversion rates
    const leadToOpportunityRate = leads.length > 0 
      ? (opportunities.length / leads.length) * 100 
      : 0;

    const opportunityToWonRate = opportunities.length > 0 
      ? (wonCount / opportunities.length) * 100 
      : 0;

    return {
      leads: {
        total: leads.length,
        byStage: leadsByStage,
        byPriority: leadsByPriority,
        avgValue: avgLeadValue,
        totalValue: totalLeadValue,
      },
      opportunities: {
        total: opportunities.length,
        byStage: opportunitiesByStage,
        avgValue: avgOppValue,
        totalValue: totalOppValue,
        winRate,
      },
      followups: {
        total: followups.length,
        completed: completedFollowups,
        overdue: overdueFollowups,
        completionRate,
      },
      support: {
        total: tickets.length,
        byStatus: ticketsByStatus,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        openCount: openTickets,
      },
      conversion: {
        leadToOpportunity: Math.round(leadToOpportunityRate * 10) / 10,
        opportunityToWon: Math.round(opportunityToWonRate * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Failed to get insights metrics:', error);
    return {
      leads: { total: 0, byStage: {}, byPriority: {}, avgValue: 0, totalValue: 0 },
      opportunities: { total: 0, byStage: {}, avgValue: 0, totalValue: 0, winRate: 0 },
      followups: { total: 0, completed: 0, overdue: 0, completionRate: 0 },
      support: { total: 0, byStatus: {}, avgResolutionTime: 0, openCount: 0 },
      conversion: { leadToOpportunity: 0, opportunityToWon: 0 },
    };
  }
}

/**
 * Get lead funnel analysis
 */
export async function getLeadFunnelAnalysis(
  authContext: AuthContext
): Promise<Record<string, number>> {
  try {
    const result = await BaseCrudService.getAll<Leads>('leads', [], { limit: 1000 });
    const leads = result.items?.filter(l => 
      l.businessId === authContext.businessId && !l.isDemo
    ) || [];

    const funnel: Record<string, number> = {
      'New': 0,
      'Active Enquiry': 0,
      'Qualified': 0,
      'Decision Ready': 0,
      'Won': 0,
      'Lost': 0,
    };

    leads.forEach(lead => {
      const stage = lead.stage || 'New';
      funnel[stage] = (funnel[stage] || 0) + 1;
    });

    return funnel;
  } catch (error) {
    console.error('Failed to get lead funnel:', error);
    return {};
  }
}

/**
 * Get opportunity pipeline analysis
 */
export async function getOpportunityPipelineAnalysis(
  authContext: AuthContext
): Promise<Record<string, number>> {
  try {
    const result = await BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 1000 });
    const opportunities = result.items?.filter(o => 
      o.businessId === authContext.businessId && !o.isDemo
    ) || [];

    const pipeline: Record<string, number> = {
      'Qualification': 0,
      'Proposal': 0,
      'Negotiation': 0,
      'Won': 0,
      'Lost': 0,
    };

    opportunities.forEach(opp => {
      const stage = opp.stage || 'Qualification';
      pipeline[stage] = (pipeline[stage] || 0) + 1;
    });

    return pipeline;
  } catch (error) {
    console.error('Failed to get opportunity pipeline:', error);
    return {};
  }
}

/**
 * Get performance by owner
 */
export async function getPerformanceByOwner(
  authContext: AuthContext
): Promise<Record<string, {
  leadsCount: number;
  opportunitiesCount: number;
  totalValue: number;
  wonCount: number;
}>> {
  try {
    const [leadsResult, opportunitiesResult] = await Promise.all([
      BaseCrudService.getAll<Leads>('leads', [], { limit: 1000 }),
      BaseCrudService.getAll<Opportunities>('opportunities', [], { limit: 1000 }),
    ]);

    const leads = leadsResult.items?.filter(l => 
      l.businessId === authContext.businessId && !l.isDemo
    ) || [];

    const opportunities = opportunitiesResult.items?.filter(o => 
      o.businessId === authContext.businessId && !o.isDemo
    ) || [];

    const performance: Record<string, any> = {};

    // Aggregate by owner
    leads.forEach(lead => {
      const owner = lead.owner || 'Unassigned';
      if (!performance[owner]) {
        performance[owner] = { leadsCount: 0, opportunitiesCount: 0, totalValue: 0, wonCount: 0 };
      }
      performance[owner].leadsCount++;
      performance[owner].totalValue += lead.value || 0;
    });

    opportunities.forEach(opp => {
      const owner = opp.owner || 'Unassigned';
      if (!performance[owner]) {
        performance[owner] = { leadsCount: 0, opportunitiesCount: 0, totalValue: 0, wonCount: 0 };
      }
      performance[owner].opportunitiesCount++;
      performance[owner].totalValue += opp.pipelineValue || 0;
      if (opp.stage === 'Won') {
        performance[owner].wonCount++;
      }
    });

    return performance;
  } catch (error) {
    console.error('Failed to get performance by owner:', error);
    return {};
  }
}
