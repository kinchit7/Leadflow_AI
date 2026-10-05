/**
 * WORKSTREAM 1: Wix Data Query Service
 * Provides server-side constrained query capability using Wix Data predicates
 * 
 * This module bridges the gap between BaseCrudService (generic CRUD) and specific
 * security requirements that need database-level filtering (not in-memory).
 * 
 * SECURITY PROPERTY: All predicates are applied at the database level
 * - Filters are NOT applied in memory after fetching
 * - Query is constrained by Wix Data before results are returned
 * - Handles >100 record case correctly (not limited to first page)
 */

import { items } from '@wix/data';
import { WixDataItem, PaginationOptions, PaginatedResult } from '@/integrations/cms';

/**
 * Predicate for filtering Wix Data queries
 */
export interface QueryPredicate {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith';
  value: unknown;
}

/**
 * Query BusinessMembers with server-side predicates
 * WORKSTREAM 1 SECURITY IMPLEMENTATION:
 * 
 * This function ensures that filtering happens at the database level, not in memory.
 * It is specifically designed for the authorization lookup use case where we need to:
 * 1. Find memberships for a specific memberId
 * 2. Filter by status='active'
 * 3. Detect if multiple active memberships exist
 * 4. Handle cases where valid memberships exist beyond the first 100 records
 * 
 * @param collectionId - Collection ID to query
 * @param predicates - Array of predicates to apply (AND logic)
 * @param options - Pagination options
 * @returns PaginatedResult with items matching all predicates
 * 
 * @example
 * // Query for active memberships for a specific member
 * const result = await queryWithPredicates('businessmembers', [
 *   { field: 'memberId', operator: 'eq', value: 'member-123' },
 *   { field: 'status', operator: 'eq', value: 'active' }
 * ], { limit: 2 });
 * 
 * // Result will have 0, 1, or 2+ items
 * // 0 → no active membership
 * // 1 → single active membership (use it)
 * // 2+ → multiple active memberships (fail closed)
 */
export async function queryWithPredicates<T extends WixDataItem>(
  collectionId: string,
  predicates: QueryPredicate[],
  options?: PaginationOptions
): Promise<PaginatedResult<T>> {
  try {
    // Start with base query
    let query = items.query(collectionId);

    // Apply all predicates with AND logic
    for (const predicate of predicates) {
      switch (predicate.operator) {
        case 'eq':
          query = query.eq(predicate.field, predicate.value);
          break;
        case 'ne':
          query = query.ne(predicate.field, predicate.value);
          break;
        case 'gt':
          query = query.gt(predicate.field, predicate.value);
          break;
        case 'gte':
          query = query.gte(predicate.field, predicate.value);
          break;
        case 'lt':
          query = query.lt(predicate.field, predicate.value);
          break;
        case 'lte':
          query = query.lte(predicate.field, predicate.value);
          break;
        case 'contains':
          query = query.contains(predicate.field, predicate.value);
          break;
        case 'startsWith':
          query = query.startsWith(predicate.field, predicate.value as string);
          break;
        default:
          console.warn(`queryWithPredicates: Unknown operator ${predicate.operator}`);
      }
    }

    // Apply pagination
    const limit = options?.limit ?? 50;
    const skip = options?.skip ?? 0;
    
    query = query.limit(limit).skip(skip).returnTotalCount();

    // Execute query
    const result = await query.find();

    // Build paginated result
    const totalCount = result.totalCount ?? result.items.length;
    const pageSize = limit;
    const currentPage = Math.floor(skip / pageSize);
    const hasNext = skip + result.items.length < totalCount;
    const nextSkip = hasNext ? skip + pageSize : null;

    return {
      items: result.items as T[],
      totalCount,
      hasNext,
      currentPage,
      pageSize,
      nextSkip,
    };
  } catch (error) {
    console.error(`queryWithPredicates: Error querying ${collectionId}:`, error);
    throw error;
  }
}
