/**
 * Customers Service - Backend business logic for customer management
 * Handles tenant isolation, customer lifecycle, and audit events
 */

import { BaseCrudService } from '@/integrations/cms';
import { Customers } from '@/entities';
import { AuthContext, authorizeRead, authorizeWrite } from './auth.web';
import { logCustomerCreated, logCustomerUpdated } from './activity-events.web';

/**
 * Get customer with authorization check
 */
export async function getCustomerAuthorized(
  customerId: string,
  authContext: AuthContext
): Promise<Customers | null> {
  try {
    const authorized = await authorizeRead('customers', customerId, authContext);
    if (!authorized) {
      console.error('Unauthorized access to customer:', customerId);
      return null;
    }

    return await BaseCrudService.getById<Customers>('customers', customerId);
  } catch (error) {
    console.error('Failed to get customer:', error);
    throw error;
  }
}

/**
 * Get all customers for business with tenant isolation
 */
export async function getCustomersForBusiness(
  authContext: AuthContext,
  limit: number = 50,
  skip: number = 0
): Promise<{ items: Customers[]; totalCount: number; hasNext: boolean }> {
  try {
    const result = await BaseCrudService.getAll<Customers>('customers', [], { limit, skip });
    
    const items = result.items
      ?.filter(customer => customer.businessId === authContext.businessId)
      .filter(customer => !customer.isDemo)
      || [];

    return {
      items,
      totalCount: items.length,
      hasNext: result.hasNext || false,
    };
  } catch (error) {
    console.error('Failed to get customers:', error);
    throw error;
  }
}

/**
 * Create customer with tenant isolation
 */
export async function createCustomerAuthorized(
  customerData: Omit<Customers, '_id' | '_createdDate' | '_updatedDate'>,
  authContext: AuthContext
): Promise<Customers> {
  try {
    const customer: Customers = {
      ...customerData,
      _id: crypto.randomUUID(),
      businessId: authContext.businessId,
      isDemo: false,
    };

    await BaseCrudService.create('customers', customer);

    // Log activity event
    await logCustomerCreated(
      customer._id,
      authContext.businessId,
      authContext.memberId,
      customer.fullName || ''
    );

    return customer;
  } catch (error) {
    console.error('Failed to create customer:', error);
    throw error;
  }
}

/**
 * Update customer with authorization and audit trail
 */
export async function updateCustomerAuthorized(
  customerId: string,
  updates: Partial<Customers>,
  authContext: AuthContext
): Promise<Customers | null> {
  try {
    const authorized = await authorizeWrite('customers', customerId, authContext);
    if (!authorized) {
      console.error('Unauthorized update to customer:', customerId);
      return null;
    }

    const existingCustomer = await BaseCrudService.getById<Customers>('customers', customerId);
    if (!existingCustomer) return null;

    // Prevent tenant override
    const safeUpdates = {
      ...updates,
      businessId: existingCustomer.businessId,
      isDemo: existingCustomer.isDemo,
    };

    await BaseCrudService.update('customers', {
      _id: customerId,
      ...safeUpdates,
    });

    // Log activity event
    await logCustomerUpdated(
      customerId,
      authContext.businessId,
      authContext.memberId,
      existingCustomer.fullName || ''
    );

    return await BaseCrudService.getById<Customers>('customers', customerId);
  } catch (error) {
    console.error('Failed to update customer:', error);
    throw error;
  }
}

/**
 * Delete customer with authorization
 */
export async function deleteCustomerAuthorized(
  customerId: string,
  authContext: AuthContext
): Promise<boolean> {
  try {
    const authorized = await authorizeWrite('customers', customerId, authContext);
    if (!authorized) {
      console.error('Unauthorized delete of customer:', customerId);
      return false;
    }

    await BaseCrudService.delete('customers', customerId);
    return true;
  } catch (error) {
    console.error('Failed to delete customer:', error);
    throw error;
  }
}

/**
 * Search customers by name or email
 */
export async function searchCustomers(
  query: string,
  authContext: AuthContext
): Promise<Customers[]> {
  try {
    const result = await BaseCrudService.getAll<Customers>('customers', [], { limit: 100 });
    
    const lowerQuery = query.toLowerCase();
    return result.items
      ?.filter(customer => 
        customer.businessId === authContext.businessId &&
        !customer.isDemo &&
        (customer.fullName?.toLowerCase().includes(lowerQuery) ||
         customer.email?.toLowerCase().includes(lowerQuery) ||
         customer.phoneNumber?.includes(query))
      )
      || [];
  } catch (error) {
    console.error('Failed to search customers:', error);
    return [];
  }
}

/**
 * Get customer count for business
 */
export async function getCustomerCount(
  authContext: AuthContext
): Promise<number> {
  try {
    const result = await BaseCrudService.getAll<Customers>('customers', [], { limit: 1000 });
    
    return result.items?.filter(customer => 
      customer.businessId === authContext.businessId &&
      !customer.isDemo
    ).length || 0;
  } catch (error) {
    console.error('Failed to get customer count:', error);
    return 0;
  }
}
