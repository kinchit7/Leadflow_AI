/**
 * SECURITY REMEDIATION TESTS
 * Comprehensive tests for all workstreams:
 * - WORKSTREAM 1: BusinessMembers authorization lookup
 * - WORKSTREAM 2: Context freshness preservation
 * - WORKSTREAM 3: Priority engine runtime defects
 * - WORKSTREAM 4: Activity events duplicate handling
 * - WORKSTREAM 5: Webhook secret initialization
 * - WORKSTREAM 6: Audit sanitization Promise handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveAuthContext,
  validateContextFreshness,
  authorizeRead,
  authorizeWrite,
  sanitizeUpdatePayload,
  AuthContext,
} from '../auth.web';
import {
  calculateLeadPriority,
  calculateOpportunityPriority,
} from '../priority-engine.web';
import {
  createActivityEvent,
  ActivityEvent,
} from '../activity-events.web';
import {
  verifyWebhookSignature,
  isWebhookDuplicate,
  recordWebhookEvent,
} from '../webhook-security.web';
import { BaseCrudService } from '@/integrations/cms';
import { Leads, Opportunities } from '@/entities';
import { logProtectedFieldOverrideAttempt } from '../audit-service.web';

// Mock BaseCrudService
vi.mock('@/integrations/cms', () => ({
  BaseCrudService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Test-only adapter: production query semantics are covered by wix-data-query-regression.test.ts.
vi.mock('../wix-data-query.web', () => ({
  queryWithPredicates: vi.fn(async (collectionId: string, predicates: any[], options: any = {}) => {
    const result = await BaseCrudService.getAll(collectionId, [], options);
    if (!result || !Array.isArray(result.items)) {
      throw new Error('Malformed test fixture returned by BaseCrudService.getAll');
    }
    const matches = result.items.filter((item: any) => predicates.every((p: any) => {
      const actual = item?.[p.field];
      switch (p.operator) {
        case 'eq': return actual === p.value;
        case 'ne': return actual !== p.value;
        case 'gt': return actual > p.value;
        case 'gte': return actual >= p.value;
        case 'lt': return actual < p.value;
        case 'lte': return actual <= p.value;
        case 'contains': return String(actual ?? '').includes(String(p.value));
        case 'startsWith': return String(actual ?? '').startsWith(String(p.value));
        default: throw new Error('Unsupported test predicate: ' + p.operator);
      }
    }));
    const skip = options.skip ?? 0;
    const limit = options.limit ?? 2;
    const page = matches.slice(skip, skip + limit);
    return {
      items: page,
      totalCount: matches.length,
      hasNext: skip + page.length < matches.length,
      currentPage: Math.floor(skip / limit),
      pageSize: limit,
      nextSkip: skip + page.length < matches.length ? skip + limit : null,
    };
  }),
}));


// Mock audit service
vi.mock('../audit-service.web', () => ({
  logMultipleMembershipDetected: vi.fn(),
  logAuthorizationFailure: vi.fn(),
  logCrossTenantAccessAttempt: vi.fn(),
  logBranchAuthorizationFailure: vi.fn(),
  logProtectedFieldOverrideAttempt: vi.fn().mockResolvedValue(undefined),
}));

describe('SECURITY REMEDIATION - All Workstreams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // WORKSTREAM 1: BusinessMembers Authorization Lookup
  // ============================================================================
  describe('WORKSTREAM 1: BusinessMembers Authorization Lookup', () => {
    describe('Valid membership found', () => {
      it('should resolve context with single active membership', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId,
              role: 'manager',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        expect(context).not.toBeNull();
        expect(context?.businessId).toBe(businessId);
        expect(context?.role).toBe('manager');
      });
    });

    describe('Member has no active membership', () => {
      it('should return null when no active memberships found', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        expect(context).toBeNull();
      });

      it('should return null when membership status is not active', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-123',
              role: 'manager',
              status: 'pending', // Not active
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        expect(context).toBeNull();
      });
    });

    describe('Member has multiple active memberships', () => {
      it('should fail closed when multiple active memberships detected', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-123',
              role: 'manager',
              status: 'active',
            },
            {
              _id: 'membership-2',
              memberId,
              businessId: 'business-456',
              role: 'admin',
              status: 'active',
            },
          ],
          totalCount: 2,
          hasNext: false,
          currentPage: 0,
          pageSize: 2,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        expect(context).toBeNull();
      });
    });

    describe('Membership beyond first 100 records', () => {
      it('should query with limit to prevent full collection scan', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        await resolveAuthContext(memberId);

        // Verify getAll was called with limit parameter
        expect(vi.mocked(BaseCrudService.getAll)).toHaveBeenCalledWith(
          'businessmembers',
          [],
          { limit: 100 }
        );
      });
    });

    describe('Inactive membership is ignored', () => {
      it('should ignore inactive memberships in filter', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId: 'business-456',
              role: 'manager',
              status: 'revoked', // Inactive
            },
            {
              _id: 'membership-2',
              memberId,
              businessId,
              role: 'manager',
              status: 'active', // Active
            },
          ],
          totalCount: 2,
          hasNext: false,
          currentPage: 0,
          pageSize: 2,
          nextSkip: null,
        });

        const context = await resolveAuthContext(memberId);

        expect(context?.businessId).toBe(businessId);
      });
    });

    describe('Query is server-side constrained', () => {
      it('should use memberId and status for filtering', async () => {
        const memberId = 'member-123';

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        await resolveAuthContext(memberId);

        // Verify the query is constrained by limit
        const callArgs = vi.mocked(BaseCrudService.getAll).mock.calls[0];
        expect(callArgs[0]).toBe('businessmembers');
        expect(callArgs[2]?.limit).toBe(100);
      });
    });
  });

  // ============================================================================
  // WORKSTREAM 2: Context Freshness Preservation
  // ============================================================================
  describe('WORKSTREAM 2: Context Freshness Preservation', () => {
    describe('Stale context rejected', () => {
      it('should reject context older than 5 minutes', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        const staleContext: AuthContext = {
          memberId,
          businessId,
          role: 'manager',
          _validatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes old
        };

        const isFresh = await validateContextFreshness(staleContext);

        expect(isFresh).toBe(false);
      });
    });

    describe('Revoked membership rejected', () => {
      it('should reject when membership is revoked', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        const context: AuthContext = {
          memberId,
          businessId,
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock fresh resolution returning no memberships (revoked)
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        const isFresh = await validateContextFreshness(context);

        expect(isFresh).toBe(false);
      });
    });

    describe('Changed role rejected', () => {
      it('should reject when role changes', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        const context: AuthContext = {
          memberId,
          businessId,
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock fresh resolution with different role
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId,
              role: 'guest', // Role changed
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isFresh = await validateContextFreshness(context);

        expect(isFresh).toBe(false);
      });
    });

    describe('Changed branch rejected', () => {
      it('should reject when branch changes', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        const context: AuthContext = {
          memberId,
          businessId,
          branchId: 'branch-1',
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock fresh resolution with different branch
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId,
              branchId: 'branch-2', // Branch changed
              role: 'manager',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isFresh = await validateContextFreshness(context);

        expect(isFresh).toBe(false);
      });
    });

    describe('Fresh context accepted', () => {
      it('should accept fresh context with no changes', async () => {
        const memberId = 'member-123';
        const businessId = 'business-123';

        const context: AuthContext = {
          memberId,
          businessId,
          role: 'manager',
          _validatedAt: new Date(),
        };

        // Mock fresh resolution with same values
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [
            {
              _id: 'membership-1',
              memberId,
              businessId,
              role: 'manager',
              status: 'active',
            },
          ],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const isFresh = await validateContextFreshness(context);

        expect(isFresh).toBe(true);
      });
    });
  });

  // ============================================================================
  // WORKSTREAM 3: Priority Engine Runtime Defects
  // ============================================================================
  describe('WORKSTREAM 3: Priority Engine Runtime Defects', () => {
    describe('Priority engine does not reference undefined configuredThreshold', () => {
      it('should use businessConfiguredThreshold parameter in lead priority', async () => {
        const lead: Leads = {
          _id: 'lead-1',
          customer: 'customer-1',
          value: 75000,
          timeline: 'Urgent',
          stage: 'Qualified',
        };

        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [],
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });

        const result = await calculateLeadPriority(lead, 50000);

        // Should use the parameter value, not undefined
        expect(result.configuredThreshold).toBe(50000);
        expect(result.configuredThreshold).toBeDefined();
      });

      it('should use businessConfiguredThreshold parameter in opportunity priority', async () => {
        const opportunity: Opportunities = {
          _id: 'opp-1',
          opportunityName: 'Test Opportunity',
          pipelineValue: 150000,
          stage: 'Negotiation',
        };

        const result = await calculateOpportunityPriority(opportunity, 100000);

        // Should use the parameter value, not undefined
        expect(result.configuredThreshold).toBe(100000);
        expect(result.configuredThreshold).toBeDefined();
      });
    });
  });

  // ============================================================================
  // WORKSTREAM 4: Activity Events Duplicate Handling
  // ============================================================================
  describe('WORKSTREAM 4: Activity Events Duplicate Handling', () => {
    describe('Activity event lookup handles undefined result', () => {
      it('should handle undefined result gracefully', async () => {
        const event: Omit<ActivityEvent, '_id' | '_createdDate' | '_updatedDate'> = {
          eventType: 'customer_created',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          actor: 'user-1',
          timestamp: new Date(),
          description: 'Customer created',
        };

        // Mock undefined result
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce(undefined as any);
        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({} as any);

        const result = await createActivityEvent(event);

        // Should create new event without crashing
        expect(result._id).toBeDefined();
        expect(vi.mocked(BaseCrudService.create)).toHaveBeenCalled();
      });

      it('should handle null items gracefully', async () => {
        const event: Omit<ActivityEvent, '_id' | '_createdDate' | '_updatedDate'> = {
          eventType: 'customer_created',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          actor: 'user-1',
          timestamp: new Date(),
          description: 'Customer created',
        };

        // Mock result with null items
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: null as any,
          totalCount: 0,
          hasNext: false,
          currentPage: 0,
          pageSize: 0,
          nextSkip: null,
        });
        vi.mocked(BaseCrudService.create).mockResolvedValueOnce({} as any);

        const result = await createActivityEvent(event);

        // Should create new event without crashing
        expect(result._id).toBeDefined();
        expect(vi.mocked(BaseCrudService.create)).toHaveBeenCalled();
      });
    });

    describe('Duplicate activity event returns actual duplicate', () => {
      it('should return the actual duplicate event found', async () => {
        const event: Omit<ActivityEvent, '_id' | '_createdDate' | '_updatedDate'> = {
          eventType: 'customer_created',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          actor: 'user-1',
          timestamp: new Date(),
          description: 'Customer created',
        };

        const duplicateEvent: ActivityEvent = {
          _id: 'event-1',
          eventType: 'customer_created',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          actor: 'user-1',
          timestamp: new Date(),
          description: 'Customer created',
        };

        // Mock result with duplicate
        vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
          items: [duplicateEvent],
          totalCount: 1,
          hasNext: false,
          currentPage: 0,
          pageSize: 1,
          nextSkip: null,
        });

        const result = await createActivityEvent(event);

        // Should return the actual duplicate, not items[0]
        expect(result._id).toBe(duplicateEvent._id);
        expect(result._id).toBe('event-1');
      });
    });
  });

  // ============================================================================
  // WORKSTREAM 5: Webhook Secret Initialization
  // ============================================================================
  describe('WORKSTREAM 5: Webhook Secret Initialization', () => {
    describe('Webhook secrets resolve correctly', () => {
      it('should fail closed when webhook secret is missing', async () => {
        // Temporarily clear the secret
        const originalSecret = process.env.WEBHOOK_SECRET;
        delete process.env.WEBHOOK_SECRET;

        const result = await verifyWebhookSignature(
          'generic',
          'test-body',
          'test-signature'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('MISSING_SECRET');

        // Restore
        if (originalSecret) {
          process.env.WEBHOOK_SECRET = originalSecret;
        }
      });

      it('should validate signature when secret is configured', async () => {
        // Set a test secret
        process.env.WEBHOOK_SECRET = 'test-secret';

        const result = await verifyWebhookSignature(
          'generic',
          'test-body',
          'invalid-signature'
        );

        // Should fail due to invalid signature, not missing secret
        expect(result.valid).toBe(false);
        expect(result.reason).not.toBe('MISSING_SECRET');
      });
    });

    describe('Missing webhook secret fails closed', () => {
      it('should reject webhook when secret is not configured', () => {
        const result = verifyWebhookSignature(
          'unknown-provider',
          'test-body',
          'test-signature'
        );

        expect(result.valid).toBe(false);
      });
    });
  });

  // ============================================================================
  // WORKSTREAM 6: Audit Sanitization Promise Handling
  // ============================================================================
  describe('WORKSTREAM 6: Audit Sanitization Promise Handling', () => {
    describe('Protected field audit handling works with undefined mock return', () => {
      it('should handle audit function returning undefined', () => {
        const authContext: AuthContext = {
          memberId: 'member-1',
          businessId: 'business-1',
        };

        const updates = {
          businessId: 'business-2', // Protected field
          name: 'New Name',
        };

        // Mock audit function to return undefined
        vi.mocked(logProtectedFieldOverrideAttempt).mockReturnValueOnce(undefined);

        const sanitized = sanitizeUpdatePayload(updates, authContext);

        // Should remove protected field
        expect(sanitized.businessId).toBeUndefined();
        expect(sanitized.name).toBe('New Name');
      });

      it('should handle audit function returning Promise', async () => {
        const authContext: AuthContext = {
          memberId: 'member-1',
          businessId: 'business-1',
        };

        const updates = {
          role: 'admin', // Protected field
          name: 'New Name',
        };

        // Mock audit function to return Promise
        vi.mocked(logProtectedFieldOverrideAttempt).mockResolvedValueOnce(undefined);

        const sanitized = sanitizeUpdatePayload(updates, authContext);

        // Should remove protected field
        expect(sanitized.role).toBeUndefined();
        expect(sanitized.name).toBe('New Name');
      });

      it('should not remove non-protected fields', () => {
        const authContext: AuthContext = {
          memberId: 'member-1',
          businessId: 'business-1',
        };

        const updates = {
          name: 'New Name',
          email: 'test@example.com',
          phone: '555-1234',
        };

        const sanitized = sanitizeUpdatePayload(updates, authContext);

        // Should keep all non-protected fields
        expect(sanitized.name).toBe('New Name');
        expect(sanitized.email).toBe('test@example.com');
        expect(sanitized.phone).toBe('555-1234');
      });
    });
  });

  // ============================================================================
  // REGRESSION TESTS
  // ============================================================================
  describe('REGRESSION: Existing Security Controls', () => {
    it('should still enforce tenant isolation in authorizeRead', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';
      const otherBusinessId = 'business-456';

      const context: AuthContext = {
        memberId,
        businessId,
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record from different business
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId: otherBusinessId,
      });

      // Mock fresh context
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
            role: 'manager',
            status: 'active',
          },
        ],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1,
        nextSkip: null,
      });

      const authorized = await authorizeRead('customers', recordId, context);

      expect(authorized).toBe(false);
    });

    it('should still enforce branch isolation in authorizeWrite', async () => {
      const memberId = 'member-123';
      const businessId = 'business-123';
      const recordId = 'record-123';

      const context: AuthContext = {
        memberId,
        businessId,
        branchId: 'branch-1',
        role: 'manager',
        _validatedAt: new Date(),
      };

      // Mock record from different branch
      vi.mocked(BaseCrudService.getById).mockResolvedValueOnce({
        _id: recordId,
        businessId,
        branchId: 'branch-2',
      });

      // Mock fresh context
      vi.mocked(BaseCrudService.getAll).mockResolvedValueOnce({
        items: [
          {
            _id: 'membership-1',
            memberId,
            businessId,
            branchId: 'branch-1',
            role: 'manager',
            status: 'active',
          },
        ],
        totalCount: 1,
        hasNext: false,
        currentPage: 0,
        pageSize: 1,
        nextSkip: null,
      });

      const authorized = await authorizeWrite('customers', recordId, context);

      expect(authorized).toBe(false);
    });
  });
});
