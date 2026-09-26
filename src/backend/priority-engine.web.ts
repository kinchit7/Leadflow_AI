/**
 * Priority Engine - Rule-based, explainable priority calculation
 * HIGH: urgent timeline (7 days), high-value opportunity, overdue follow-up, decision-ready
 * MEDIUM: qualified/active enquiry needing follow-up
 * LOW: incomplete or long-term enquiries
 */

import { Leads, Opportunities, Followups } from '@/entities';
import { BaseCrudService } from '@/integrations/cms';

export interface PriorityResult {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  signals: string[];
  configuredThreshold?: number;
}

/**
 * Calculate lead priority based on multiple signals
 * Returns explainable priority with reasoning
 */
export async function calculateLeadPriority(
  lead: Leads,
  businessConfiguredThreshold: number = 50000
): Promise<PriorityResult> {
  const signals: string[] = [];
  let priorityScore = 0;

  // Signal 1: Timeline urgency (within 7 days)
  if (lead.timeline === 'Urgent' || lead.timeline === 'Within 7 days') {
    signals.push('Urgent timeline detected');
    priorityScore += 40;
  } else if (lead.timeline === 'Within 30 days') {
    signals.push('Near-term timeline');
    priorityScore += 20;
  }

  // Signal 2: High-value opportunity (relative to business threshold)
  if (lead.value && lead.value >= businessConfiguredThreshold) {
    signals.push(`High-value opportunity (${lead.value} >= ${businessConfiguredThreshold})`);
    priorityScore += 35;
  } else if (lead.value && lead.value >= businessConfiguredThreshold * 0.5) {
    signals.push('Medium-value opportunity');
    priorityScore += 15;
  }

  // Signal 3: Lead stage/qualification
  if (lead.stage === 'Qualified' || lead.stage === 'Decision Ready') {
    signals.push(`Lead stage: ${lead.stage}`);
    priorityScore += 30;
  } else if (lead.stage === 'Active Enquiry') {
    signals.push('Active enquiry');
    priorityScore += 15;
  }

  // Signal 4: Budget alignment
  if (lead.budget && lead.budget > 0) {
    signals.push('Budget confirmed');
    priorityScore += 10;
  }

  // Signal 5: Overdue follow-up
  try {
    const followups = await BaseCrudService.getAll<Followups>('followups');
    const overdueFollowup = followups.items?.find(
      f => f.relatedRecordId === lead._id && 
           f.status !== 'Completed' && 
           new Date(f.dueDate!) < new Date()
    );
    if (overdueFollowup) {
      signals.push('Overdue follow-up exists');
      priorityScore += 25;
    }
  } catch (error) {
    console.error('Failed to check follow-ups:', error);
  }

  // Determine priority level
  let priority: 'HIGH' | 'MEDIUM' | 'LOW';
  if (priorityScore >= 60) {
    priority = 'HIGH';
  } else if (priorityScore >= 30) {
    priority = 'MEDIUM';
  } else {
    priority = 'LOW';
  }

  return {
    priority,
    explanation: generateExplanation(priority, signals),
    signals,
    configuredThreshold,
  };
}

/**
 * Calculate opportunity priority
 */
export async function calculateOpportunityPriority(
  opportunity: Opportunities,
  businessConfiguredThreshold: number = 100000
): Promise<PriorityResult> {
  const signals: string[] = [];
  let priorityScore = 0;

  // Signal 1: Pipeline value
  if (opportunity.pipelineValue && opportunity.pipelineValue >= businessConfiguredThreshold) {
    signals.push(`High pipeline value (${opportunity.pipelineValue})`);
    priorityScore += 40;
  } else if (opportunity.pipelineValue && opportunity.pipelineValue >= businessConfiguredThreshold * 0.5) {
    signals.push('Medium pipeline value');
    priorityScore += 20;
  }

  // Signal 2: Stage
  if (opportunity.stage === 'Negotiation' || opportunity.stage === 'Proposal') {
    signals.push(`Advanced stage: ${opportunity.stage}`);
    priorityScore += 35;
  } else if (opportunity.stage === 'Qualification') {
    signals.push('Qualification stage');
    priorityScore += 15;
  }

  // Signal 3: Close date urgency
  if (opportunity.expectedCloseDate) {
    const daysToClose = Math.floor(
      (new Date(opportunity.expectedCloseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysToClose <= 7 && daysToClose > 0) {
      signals.push(`Close date within 7 days (${daysToClose} days)`);
      priorityScore += 30;
    } else if (daysToClose <= 0) {
      signals.push('Close date overdue');
      priorityScore += 40;
    }
  }

  // Signal 4: Probability
  if (opportunity.probability && opportunity.probability >= 75) {
    signals.push(`High probability (${opportunity.probability}%)`);
    priorityScore += 20;
  }

  let priority: 'HIGH' | 'MEDIUM' | 'LOW';
  if (priorityScore >= 65) {
    priority = 'HIGH';
  } else if (priorityScore >= 35) {
    priority = 'MEDIUM';
  } else {
    priority = 'LOW';
  }

  return {
    priority,
    explanation: generateExplanation(priority, signals),
    signals,
    configuredThreshold,
  };
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(priority: string, signals: string[]): string {
  if (signals.length === 0) {
    return `${priority} priority - insufficient data for detailed assessment`;
  }

  const signalText = signals.join('; ');
  const reasons = {
    HIGH: `High priority due to: ${signalText}. Requires immediate attention.`,
    MEDIUM: `Medium priority due to: ${signalText}. Schedule follow-up.`,
    LOW: `Low priority due to: ${signalText}. Monitor for changes.`,
  };

  return reasons[priority as keyof typeof reasons] || 'Unable to determine priority';
}

/**
 * Check if follow-up is overdue
 */
export function isFollowupOverdue(followup: Followups): boolean {
  if (followup.status === 'Completed') return false;
  return new Date(followup.dueDate!) < new Date();
}

/**
 * Get days until follow-up due
 */
export function getDaysUntilDue(followup: Followups): number {
  const dueDate = new Date(followup.dueDate!);
  const today = new Date();
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
