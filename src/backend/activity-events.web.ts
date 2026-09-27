/**
 * Activity Events Module - Chronological timeline for Customer 360
 * Persists events from all related records: customers, leads, opportunities, follow-ups, support, notes
 * Never invent communication history - only real persisted events
 */

import { BaseCrudService } from '@/integrations/cms';
import { Followups } from '@/entities';

export interface ActivityEvent {
  _id: string;
  eventType: 'customer_created' | 'customer_updated' | 'lead_created' | 'lead_assigned' | 
            'lead_stage_changed' | 'opportunity_created' | 'opportunity_stage_changed' | 
            'followup_created' | 'followup_completed' | 'support_created' | 'support_status_changed' | 
            'note_added' | 'message_sent' | 'call_logged' | 'email_sent';
  tenantId: string;
  customerId: string;
  actor: string; // userId or system
  relatedRecordType?: string; // 'lead', 'opportunity', 'followup', 'support', 'note'
  relatedRecordId?: string;
  timestamp: Date | string;
  description: string;
  metadata?: Record<string, any>;
  _createdDate?: Date;
  _updatedDate?: Date;
}

/**
 * Create activity event
 * Idempotent - checks for duplicate events to avoid duplication on retries
 */
export async function createActivityEvent(
  event: Omit<ActivityEvent, '_id' | '_createdDate' | '_updatedDate'>
): Promise<ActivityEvent> {
  try {
    // Check for duplicate event (same type, customer, related record, within 1 minute)
    const existingEvents = await BaseCrudService.getAll<ActivityEvent>('activityevents');
    const isDuplicate = existingEvents.items?.some(e => 
      e.eventType === event.eventType &&
      e.customerId === event.customerId &&
      e.relatedRecordId === event.relatedRecordId &&
      e.tenantId === event.tenantId &&
      new Date(e.timestamp!).getTime() > new Date().getTime() - 60000 // within 1 minute
    );

    if (isDuplicate) {
      console.log('Duplicate event detected, skipping creation');
      return existingEvents.items![0];
    }

    const newEvent: ActivityEvent = {
      ...event,
      _id: crypto.randomUUID(),
    };

    await BaseCrudService.create('activityevents', newEvent);
    return newEvent;
  } catch (error) {
    console.error('Failed to create activity event:', error);
    throw error;
  }
}

/**
 * Get customer activity timeline
 * Returns all events for a customer, sorted chronologically (newest first)
 */
export async function getCustomerActivityTimeline(
  customerId: string,
  tenantId: string,
  limit: number = 50
): Promise<ActivityEvent[]> {
  try {
    const result = await BaseCrudService.getAll<ActivityEvent>('activityevents', [], { limit });
    
    const events = result.items
      ?.filter(e => e.customerId === customerId && e.tenantId === tenantId)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit) || [];

    return events;
  } catch (error) {
    console.error('Failed to get activity timeline:', error);
    return [];
  }
}

/**
 * Log customer created
 */
export async function logCustomerCreated(
  customerId: string,
  tenantId: string,
  actor: string,
  customerName: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'customer_created',
    tenantId,
    customerId,
    actor,
    timestamp: new Date(),
    description: `Customer created: ${customerName}`,
  });
}

/**
 * Log customer updated
 */
export async function logCustomerUpdated(
  customerId: string,
  tenantId: string,
  actor: string,
  customerName: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'customer_updated',
    tenantId,
    customerId,
    actor,
    timestamp: new Date(),
    description: `Customer updated: ${customerName}`,
  });
}

/**
 * Log lead creation event
 */
export async function logLeadCreated(
  customerId: string,
  leadId: string,
  tenantId: string,
  actor: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'lead_created',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'lead',
    relatedRecordId: leadId,
    timestamp: new Date(),
    description: 'Lead created',
  });
}

/**
 * Log lead stage change
 */
export async function logLeadStageChanged(
  customerId: string,
  leadId: string,
  tenantId: string,
  actor: string,
  oldStage: string,
  newStage: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'lead_stage_changed',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'lead',
    relatedRecordId: leadId,
    timestamp: new Date(),
    description: `Lead stage changed from ${oldStage} to ${newStage}`,
    metadata: { oldStage, newStage },
  });
}

/**
 * Log opportunity created
 */
export async function logOpportunityCreated(
  customerId: string,
  opportunityId: string,
  tenantId: string,
  actor: string,
  opportunityName: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'opportunity_created',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'opportunity',
    relatedRecordId: opportunityId,
    timestamp: new Date(),
    description: `Opportunity created: ${opportunityName}`,
  });
}

/**
 * Log follow-up created
 */
export async function logFollowupCreated(
  customerId: string,
  followupId: string,
  tenantId: string,
  actor: string,
  title: string,
  dueDate: Date | string
): Promise<void> {
  await createActivityEvent({
    eventType: 'followup_created',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'followup',
    relatedRecordId: followupId,
    timestamp: new Date(),
    description: `Follow-up scheduled: ${title} (due ${new Date(dueDate).toLocaleDateString()})`,
  });
}

/**
 * Log follow-up completed
 */
export async function logFollowupCompleted(
  customerId: string,
  followupId: string,
  tenantId: string,
  actor: string,
  title: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'followup_completed',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'followup',
    relatedRecordId: followupId,
    timestamp: new Date(),
    description: `Follow-up completed: ${title}`,
  });
}

/**
 * Log support ticket created
 */
export async function logSupportTicketCreated(
  customerId: string,
  ticketId: string,
  tenantId: string,
  actor: string,
  issueDescription: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'support_created',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'support',
    relatedRecordId: ticketId,
    timestamp: new Date(),
    description: `Support ticket created: ${issueDescription}`,
  });
}

/**
 * Log support ticket status change
 */
export async function logSupportStatusChanged(
  customerId: string,
  ticketId: string,
  tenantId: string,
  actor: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'support_status_changed',
    tenantId,
    customerId,
    actor,
    relatedRecordType: 'support',
    relatedRecordId: ticketId,
    timestamp: new Date(),
    description: `Support ticket status changed from ${oldStatus} to ${newStatus}`,
    metadata: { oldStatus, newStatus },
  });
}

/**
 * Log note added
 */
export async function logNoteAdded(
  customerId: string,
  tenantId: string,
  actor: string,
  noteContent: string
): Promise<void> {
  await createActivityEvent({
    eventType: 'note_added',
    tenantId,
    customerId,
    actor,
    timestamp: new Date(),
    description: `Note added: ${noteContent.substring(0, 100)}${noteContent.length > 100 ? '...' : ''}`,
  });
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
