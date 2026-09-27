# PHASE 2.5: BACKEND ↔ FRONTEND INTEGRATION PLAN

## Overview
Connect all frontend pages to Phase 2 backend Web Modules with proper authorization, tenant isolation, error handling, loading states, and demo mode support.

## Backend Services Available
1. **auth.web.ts** - Authorization & tenant isolation
2. **priority-engine.web.ts** - Lead/opportunity priority calculation
3. **leads-service.web.ts** - Lead CRUD with auth & priority
4. **opportunities-service.web.ts** - Opportunity management
5. **followups-service.web.ts** - Follow-up scheduling
6. **support-service.web.ts** - Support ticket management
7. **customer-360.web.ts** - Customer unified view
8. **today-service.web.ts** - Dashboard metrics & action items
9. **insights-service.web.ts** - Analytics & reporting
10. **activity-events.web.ts** - Activity timeline
11. **demo-seed.web.ts** - Demo data management

## Frontend Pages to Integrate
- [x] HomePage - Dashboard with metrics (authenticated view)
- [ ] LeadsPage - Lead list with CRUD
- [ ] LeadDetailPage - Lead detail with priority override
- [ ] CustomersPage - Customer list with CRUD
- [ ] CustomerDetailPage - Customer 360 view
- [ ] FollowUpsPage - Follow-up management
- [ ] SupportPage - Support ticket management
- [ ] TodayPage - Today's action items
- [ ] InsightsPage - Analytics dashboard
- [ ] OpportunitiesPage - Opportunity management (if exists)

## Implementation Strategy

### Phase 1: Core Integration Layer
1. Create `useBackendService` hook for auth context resolution
2. Implement error boundary with user-friendly messages
3. Add loading state management
4. Create demo mode toggle component

### Phase 2: Page-by-Page Integration
1. Update each page to call backend services
2. Add proper error handling & retry logic
3. Implement loading states
4. Add demo data support

### Phase 3: Testing & Verification
1. Test end-to-end workflows
2. Verify tenant isolation
3. Test mobile responsiveness
4. Verify demo mode start/reset

## Key Requirements
- ✅ Server-side authorization (auth.web.ts)
- ✅ Tenant isolation (businessId filtering)
- ✅ Demo data separation (isDemo flag)
- ✅ Error handling with user feedback
- ✅ Loading states on all async operations
- ✅ Data refresh capability
- ✅ Mobile responsive design
- ✅ Proper TypeScript typing

## Status
Starting Phase 1: Core Integration Layer
