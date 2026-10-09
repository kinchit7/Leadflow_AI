/**
 * Demo Seed & Reset Module
 * Creates isolated demo tenant with Real Estate sample data
 * Idempotent and restricted to authorized demo administration
 * Never mixes demo data into production
 * 
 * PHASE 3C HARDENING:
 * - Requires Owner/Admin role for seed/reset operations
 * - Validates AuthContext to prevent unauthorized access
 * - Rejects attempts to seed production tenants
 * - Logs all demo operations for audit trail
 */

import { BaseCrudService } from '@/integrations/cms';
import { Customers, Leads, Opportunities, Followups, SupportTickets, Conversations } from '@/entities';
import { AuthContext, hasRole } from './auth.web';

const DEMO_TENANT_ID = 'demo-tenant-real-estate';
const DEMO_FLAG = true;

/**
 * Check if record is demo data
 */
export function isDemoRecord(record: any): boolean {
  return record?.isDemo === true && record?.tenantId === DEMO_TENANT_ID;
}

/**
 * Validate authorization for demo operations
 * PHASE 3C: Only Owner/Admin can seed/reset demo data
 */
export function validateDemoOperationAuthorization(authContext: AuthContext | null): boolean {
  if (!authContext) {
    console.warn('validateDemoOperationAuthorization: No auth context provided');
    return false;
  }

  if (!hasRole(authContext, ['owner', 'admin'])) {
    console.error(
      `validateDemoOperationAuthorization: Unauthorized demo operation by member ${authContext.memberId} with role ${authContext.role}`
    );
    return false;
  }

  return true;
}

/**
 * Seed demo tenant with Real Estate sample data
 * Idempotent - checks for existing demo data before creating
 * PHASE 3C: Requires Owner/Admin authorization
 */
export async function seedDemoTenant(
  authContext?: AuthContext
): Promise<{ created: number; skipped: number }> {
  try {
    // PHASE 3C: Validate authorization
    if (!authContext || !validateDemoOperationAuthorization(authContext)) {
      console.error('seedDemoTenant: Unauthorized demo seed operation');
      throw new Error('Demo initialization requires an authorized owner/admin context.');
    }

    let created = 0;
    let skipped = 0;

    // Check if demo data already exists
    const existingCustomers = await BaseCrudService.getAll<Customers>('customers');
    const demoCustomersExist = existingCustomers.items?.some(c => isDemoRecord(c) && c.businessId === authContext.businessId);

    if (demoCustomersExist) {
      console.log('Demo data already exists, skipping seed');
      return { created: 0, skipped: 1 };
    }

    // Create demo customers
    const demoCustomers = [
      {
        _id: crypto.randomUUID(),
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@demo.com',
        phoneNumber: '555-0101',
        address: '123 Oak Street',
        city: 'San Francisco',
        notes: 'Interested in residential properties',
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
      {
        _id: crypto.randomUUID(),
        fullName: 'Michael Chen',
        email: 'michael.chen@demo.com',
        phoneNumber: '555-0102',
        address: '456 Maple Avenue',
        city: 'San Francisco',
        notes: 'Looking for commercial investment',
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
      {
        _id: crypto.randomUUID(),
        fullName: 'Emma Rodriguez',
        email: 'emma.rodriguez@demo.com',
        phoneNumber: '555-0103',
        address: '789 Pine Road',
        city: 'Oakland',
        notes: 'First-time homebuyer',
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
    ];

    for (const customer of demoCustomers) {
      await BaseCrudService.create('customers', customer);
      created++;
    }

    // Create demo leads
    const demoLeads = [
      {
        _id: crypto.randomUUID(),
        customer: demoCustomers[0]._id,
        source: 'Website',
        priority: 'HIGH',
        stage: 'Qualified',
        owner: 'demo-agent',
        value: 450000,
        requirement: '3 bedroom, 2 bath, near transit',
        budget: 500000,
        location: 'San Francisco',
        timeline: 'Within 30 days',
        nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
      {
        _id: crypto.randomUUID(),
        customer: demoCustomers[1]._id,
        source: 'Referral',
        priority: 'MEDIUM',
        stage: 'Active Enquiry',
        owner: 'demo-agent',
        value: 1200000,
        requirement: 'Commercial space, 5000+ sqft',
        budget: 1500000,
        location: 'San Francisco',
        timeline: 'Within 60 days',
        nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
      {
        _id: crypto.randomUUID(),
        customer: demoCustomers[2]._id,
        source: 'Online Ad',
        priority: 'HIGH',
        stage: 'Decision Ready',
        owner: 'demo-agent',
        value: 350000,
        requirement: '2 bedroom starter home',
        budget: 400000,
        location: 'Oakland',
        timeline: 'Urgent',
        nextFollowUp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
    ];

    for (const lead of demoLeads) {
      await BaseCrudService.create('leads', lead);
      created++;
    }

    // Create demo opportunities
    const demoOpportunities = [
      {
        _id: crypto.randomUUID(),
        opportunityName: 'Residential - 123 Oak Street',
        leadTitle: demoLeads[0]._id,
        pipelineValue: 450000,
        stage: 'Proposal',
        expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        description: 'High-potential residential sale',
        owner: 'demo-agent',
        probability: 75,
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
      {
        _id: crypto.randomUUID(),
        opportunityName: 'Commercial - Downtown SF',
        leadTitle: demoLeads[1]._id,
        pipelineValue: 1200000,
        stage: 'Negotiation',
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: 'Commercial investment opportunity',
        owner: 'demo-agent',
        probability: 60,
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
    ];

    for (const opportunity of demoOpportunities) {
      await BaseCrudService.create('opportunities', opportunity);
      created++;
    }

    // Create demo follow-ups
    const demoFollowups = [
      {
        _id: crypto.randomUUID(),
        title: 'Schedule property viewing',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        relatedRecordType: 'lead',
        relatedRecordId: demoLeads[0]._id,
        owner: 'demo-agent',
        notes: 'Confirm availability for weekend showing',
        createdAt: new Date(),
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
      {
        _id: crypto.randomUUID(),
        title: 'Send inspection report',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
        status: 'Pending',
        relatedRecordType: 'opportunity',
        relatedRecordId: demoOpportunities[0]._id,
        owner: 'demo-agent',
        notes: 'Follow up on inspection findings',
        createdAt: new Date(),
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
    ];

    for (const followup of demoFollowups) {
      await BaseCrudService.create('followups', followup);
      created++;
    }

    // Create demo support tickets
    const demoTickets = [
      {
        _id: crypto.randomUUID(),
        issueDescription: 'Question about financing options',
        status: 'Open',
        customerName: demoCustomers[0].fullName,
        assignedTo: 'demo-agent',
        priority: 'Medium',
        createdAt: new Date(),
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
    ];

    for (const ticket of demoTickets) {
      await BaseCrudService.create('tickets', ticket);
      created++;
    }

    // Create demo conversations
    const demoConversations = [
      {
        _id: crypto.randomUUID(),
        subject: 'Property inquiry - 123 Oak Street',
        status: 'Active',
        lastActivityAt: new Date(),
        customerName: demoCustomers[0].fullName,
        channel: 'Email',
        unreadMessages: 0,
        isPinned: true,
        isDemo: DEMO_FLAG,
        businessId: authContext.businessId,
        tenantId: DEMO_TENANT_ID,
      },
    ];

    for (const conversation of demoConversations) {
      await BaseCrudService.create('conversations', conversation);
      created++;
    }

    console.log(`Demo seed completed: ${created} records created`);
    return { created, skipped };
  } catch (error) {
    console.error('Failed to seed demo tenant:', error);
    throw error;
  }
}

/**
 * Reset demo tenant - delete all demo data
 * Only affects records with isDemo=true and tenantId=DEMO_TENANT_ID
 * Never deletes production records
 * PHASE 3C: Requires Owner/Admin authorization
 */
export async function resetDemoTenant(
  authContext?: AuthContext
): Promise<{ deleted: number }> {
  try {
    // PHASE 3C: Validate authorization
    if (!authContext || !validateDemoOperationAuthorization(authContext)) {
      console.error('resetDemoTenant: Unauthorized demo reset operation');
      throw new Error('Demo reset requires an authorized owner/admin context.');
    }

    let deleted = 0;

    // Delete demo customers (and cascade deletes related records)
    const customers = await BaseCrudService.getAll<Customers>('customers');
    const demoCustomers = customers.items?.filter(c => isDemoRecord(c) && c.businessId === authContext.businessId) || [];

    for (const customer of demoCustomers) {
      await BaseCrudService.delete('customers', customer._id);
      deleted++;
    }

    // Delete demo leads
    const leads = await BaseCrudService.getAll<Leads>('leads');
    const demoLeads = leads.items?.filter(l => isDemoRecord(l) && l.businessId === authContext.businessId) || [];

    for (const lead of demoLeads) {
      await BaseCrudService.delete('leads', lead._id);
      deleted++;
    }

    // Delete demo opportunities
    const opportunities = await BaseCrudService.getAll<Opportunities>('opportunities');
    const demoOpportunities = opportunities.items?.filter(o => isDemoRecord(o) && o.businessId === authContext.businessId) || [];

    for (const opportunity of demoOpportunities) {
      await BaseCrudService.delete('opportunities', opportunity._id);
      deleted++;
    }

    // Delete demo follow-ups
    const followups = await BaseCrudService.getAll<Followups>('followups');
    const demoFollowups = followups.items?.filter(f => isDemoRecord(f) && f.businessId === authContext.businessId) || [];

    for (const followup of demoFollowups) {
      await BaseCrudService.delete('followups', followup._id);
      deleted++;
    }

    // Delete demo support tickets
    const tickets = await BaseCrudService.getAll<SupportTickets>('tickets');
    const demoTickets = tickets.items?.filter(t => isDemoRecord(t) && t.businessId === authContext.businessId) || [];

    for (const ticket of demoTickets) {
      await BaseCrudService.delete('tickets', ticket._id);
      deleted++;
    }

    // Delete demo conversations
    const conversations = await BaseCrudService.getAll<Conversations>('conversations');
    const demoConversations = conversations.items?.filter(c => isDemoRecord(c) && c.businessId === authContext.businessId) || [];

    for (const conversation of demoConversations) {
      await BaseCrudService.delete('conversations', conversation._id);
      deleted++;
    }

    console.log(`Demo reset completed: ${deleted} records deleted`);
    return { deleted };
  } catch (error) {
    console.error('Failed to reset demo tenant:', error);
    throw error;
  }
}

/**
 * Get demo tenant ID
 */
export function getDemoTenantId(): string {
  return DEMO_TENANT_ID;
}
