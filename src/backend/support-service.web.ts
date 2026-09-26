/**
 * Support Service - Backend business logic for support ticket management
 * Handles tenant isolation, status tracking, and audit events
 */

import { BaseCrudService } from '@/integrations/cms';
import { SupportTickets } from '@/entities';
import { AuthContext, authorizeRead, authorizeWrite } from './auth.web';
import { logSupportTicketCreated, logSupportStatusChanged } from './activity-events.web';

/**
 * Get support ticket with authorization check
 */
export async function getSupportTicketAuthorized(
  ticketId: string,
  authContext: AuthContext
): Promise<SupportTickets | null> {
  try {
    const authorized = await authorizeRead('tickets', ticketId, authContext);
    if (!authorized) {
      console.error('Unauthorized access to support ticket:', ticketId);
      return null;
    }

    return await BaseCrudService.getById<SupportTickets>('tickets', ticketId);
  } catch (error) {
    console.error('Failed to get support ticket:', error);
    throw error;
  }
}

/**
 * Get all support tickets for business with tenant isolation
 */
export async function getSupportTicketsForBusiness(
  authContext: AuthContext,
  limit: number = 50,
  skip: number = 0
): Promise<{ items: SupportTickets[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<SupportTickets>('tickets', [], { limit, skip });
    
    const items = result.items
      ?.filter(ticket => ticket.businessId === authContext.businessId)
      .filter(ticket => !ticket.isDemo)
      || [];

    return {
      items,
      totalCount: items.length,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get support tickets:', error);
    throw error;
  }
}

/**
 * Create support ticket with tenant isolation
 */
export async function createSupportTicketAuthorized(
  ticketData: Omit<SupportTickets, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<SupportTickets> {
  try {
    const ticket: SupportTickets = {
      ...ticketData,
      _id: crypto.randomUUID(),
      businessId: authContext.businessId,
      isDemo: false,
      createdAt: new Date(),
      status: ticketData.status || 'Open',
    };

    await BaseCrudService.create('tickets', ticket);

    // Log activity event
    await logSupportTicketCreated(
      '', // customerId would need to be resolved
      ticket._id,
      authContext.businessId,
      authContext.memberId,
      ticket.issueDescription || ''
    );

    return ticket;
  } catch (error) {
    console.error('Failed to create support ticket:', error);
    throw error;
  }
}

/**
 * Update support ticket with authorization and audit trail
 */
export async function updateSupportTicketAuthorized(
  ticketId: string,
  updates: Partial<SupportTickets>,
  authContext: AuthContext
): Promise<SupportTickets | null> {
  try {
    const authorized = await authorizeWrite('tickets', ticketId, authContext);
    if (!authorized) {
      console.error('Unauthorized update to support ticket:', ticketId);
      return null;
    }

    const existingTicket = await BaseCrudService.getById<SupportTickets>('tickets', ticketId);
    if (!existingTicket) return null;

    // Prevent tenant override
    const safeUpdates = {
      ...updates,
      businessId: existingTicket.businessId,
      isDemo: existingTicket.isDemo,
    };

    // Log status change if applicable
    if (updates.status && updates.status !== existingTicket.status) {
      await logSupportStatusChanged(
        '', // customerId would need to be resolved
        ticketId,
        authContext.businessId,
        authContext.memberId,
        existingTicket.status || 'Unknown',
        updates.status
      );
    }

    await BaseCrudService.update('tickets', {
      _id: ticketId,
      ...safeUpdates,
    });

    return await BaseCrudService.getById<SupportTickets>('tickets', ticketId);
  } catch (error) {
    console.error('Failed to update support ticket:', error);
    throw error;
  }
}

/**
 * Delete support ticket with authorization
 */
export async function deleteSupportTicketAuthorized(
  ticketId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('tickets', ticketId, authContext);
    if (!authorized) {
      console.error('Unauthorized delete of support ticket:', ticketId);
      return false;
    }

    await BaseCrudService.delete('tickets', ticketId);
    return true;
  } catch (error) {
    console.error('Failed to delete support ticket:', error);
    throw error;
  }
}

/**
 * Get unresolved support tickets
 */
export async function getUnresolvedTickets(
  authContext: AuthContext
): Promise<SupportTickets[]> {
  try {
    const result = await BaseCrudService.getAll<SupportTickets>('tickets', [], { limit: 100 });
    
    return result.items
      ?.filter(ticket => 
        ticket.businessId === authContext.businessId &&
        !ticket.isDemo &&
        ticket.status !== 'Resolved' &&
        ticket.status !== 'Closed'
      )
      || [];
  } catch (error) {
    console.error('Failed to get unresolved tickets:', error);
    return [];
  }
}

/**
 * Get escalated support tickets
 */
export async function getEscalatedTickets(
  authContext: AuthContext
): Promise<SupportTickets[]> {
  try {
    const result = await BaseCrudService.getAll<SupportTickets>('tickets', [], { limit: 100 });
    
    return result.items
      ?.filter(ticket => 
        ticket.businessId === authContext.businessId &&
        !ticket.isDemo &&
        ticket.priority === 'High' &&
        ticket.status !== 'Resolved' &&
        ticket.status !== 'Closed'
      )
      || [];
  } catch (error) {
    console.error('Failed to get escalated tickets:', error);
    return [];
  }
}

/**
 * Get support ticket metrics
 */
export async function getSupportMetrics(
  authContext: AuthContext
): Promise<{
  total: number;
  open: number;
  escalated: number;
  resolved: number;
}> {
  try {
    const result = await BaseCrudService.getAll<SupportTickets>('tickets', [], { limit: 1000 });
    
    const tickets = result.items?.filter(t => 
      t.businessId === authContext.businessId &&
      !t.isDemo
    ) || [];

    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'Open').length,
      escalated: tickets.filter(t => t.priority === 'High').length,
      resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
    };
  } catch (error) {
    console.error('Failed to get support metrics:', error);
    return { total: 0, open: 0, escalated: 0, resolved: 0 };
  }
}

/**
 * Assign support ticket
 */
export async function assignSupportTicket(
  ticketId: string,
  assignedTo: string,
  authContext: AuthContext
): Promise<SupportTickets | null> {
  try {
    const authorized = await authorizeWrite('tickets', ticketId, authContext);
    if (!authorized) {
      console.error('Unauthorized assignment of support ticket:', ticketId);
      return null;
    }

    await BaseCrudService.update('tickets', {
      _id: ticketId,
      assignedTo,
    });

    return await BaseCrudService.getById<SupportTickets>('tickets', ticketId);
  } catch (error) {
    console.error('Failed to assign support ticket:', error);
    throw error;
  }
}
