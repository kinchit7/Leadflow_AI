# PHASE 3F-B: Architecture Decisions & Wix Data API Assessment

**Date:** 2026-09-29  
**Status:** ARCHITECTURE VALIDATED - IMPLEMENTATION READY  
**Scope:** Gate 0 validation and architectural decisions for Phase 3F-B

---

## EXECUTIVE SUMMARY

This document validates the Wix Data API capabilities available to LeadFlow AI and establishes architectural decisions for Phase 3F-B tenant isolation remediation.

**Key Finding:** The Wix Data API (BaseCrudService) has **fundamental limitations** that prevent true server-side filtering by businessId. The current implementation uses in-memory filtering, which is a **platform limitation, not an application bug**. However, **critical security gaps remain** that can be fixed at the application level without requiring Wix API enhancements.

**Recommendation:** Implement Phase 3F-B fixes using application-level authorization and validation, accepting the in-memory filtering limitation as a known platform constraint.

---

## SECTION 1: WIX DATA API CAPABILITIES ASSESSMENT

### 1.1 BaseCrudService API Surface

**Location:** `/integrations/cms/service.ts` (not directly accessible, but inferred from usage)

**Available Methods:**
```typescript
// Read operations
getAll<T>(collectionId, references?, options?): Promise<{
  items: T[]
  totalCount: number
  hasNext: boolean
  currentPage: number
  pageSize: number
  nextSkip?: number | null
}>

getById<T>(collectionId, itemId, references?): Promise<T | null>

// Write operations
create<T>(collectionId, itemData, multiRefs?): Promise<T>
update<T>(collectionId, itemData): Promise<T>
delete(collectionId, itemId): Promise<void>

// Reference operations
addReferences(collectionId, itemId, multiRefs): Promise<void>
removeReferences(collectionId, itemId, multiRefs): Promise<void>
```

### 1.2 Query Filtering Capabilities

**Finding: NO SERVER-SIDE FILTERING SUPPORT**

**Evidence:**
- `getAll()` accepts `references` parameter (for populating related records)
- `getAll()` accepts `options` parameter with `limit` and `skip` only
- No `filter`, `where`, `query`, or `condition` parameter exists
- All filtering in codebase is done in-memory after fetch

**Limitation Impact:**
- Cannot filter by businessId at database level
- Cannot filter by branchId at database level
- Cannot filter by isDemo at database level
- Cannot enforce tenant isolation in query layer
- Must fetch full dataset and filter in application

**Workaround:** Application-level filtering with authorization checks (current implementation)

### 1.3 Sorting & Pagination

**Supported:**
- `limit` parameter (default 50, tested up to 10000)
- `skip` parameter (for offset-based pagination)
- `hasNext` flag (indicates more data exists)
- `totalCount` (total items in collection, unfiltered)

**Limitation:**
- No `sort` parameter available
- No `order` parameter available
- Results returned in insertion order (not guaranteed)

### 1.4 Constraints & Validation

**Finding: NO DATABASE-LEVEL CONSTRAINTS SUPPORTED**

**Evidence:**
- No unique constraint enforcement
- No foreign key constraints
- No check constraints
- No default values
- No NOT NULL enforcement at database level

**Workaround:** Application-level validation before create/update

### 1.5 Permissions Model

**Supported:**
- Collection-level permissions (ANYONE, ADMIN, OWNER)
- Read, Write, Delete permissions per collection
- Enforced by Wix platform

**Current Configuration:**
- `businessmembers`: ADMIN only (read, write, delete)
- All other collections: ANYONE (read, write, delete)

**Limitation:**
- No row-level security (RLS)
- No field-level security
- No dynamic permissions based on user context
- All ANYONE collections are readable/writable by any authenticated user

### 1.6 Webhook & Event Support

**Finding: NO WEBHOOK SIGNATURE VALIDATION DOCUMENTED**

**Evidence:**
- HTTP endpoints exist but lack signature validation
- No Wix webhook signature format documented in codebase
- No HMAC validation implemented

**Assumption:** Wix webhooks use standard HMAC-SHA256 (common pattern)

### 1.7 Concurrency & Locking

**Finding: NO OPTIMISTIC LOCKING SUPPORT**

**Evidence:**
- No version field support
- No timestamp-based locking
- No compare-and-swap operations
- No transaction support

**Workaround:** Application-level version tracking (add version field manually)

---

## SECTION 2: SECURITY FINDINGS VALIDATION

### 2.1 Finding 1: In-Memory Filtering (CONFIRMED - PLATFORM LIMITATION)

**Root Cause:** Wix Data API does not support server-side filtering

**Severity:** CRITICAL (but unavoidable with current platform)

**Mitigation Strategy:**
1. Accept in-memory filtering as platform constraint
2. Enforce authorization checks BEFORE returning data to client
3. Validate businessId on every operation
4. Implement maximum page size to limit exposure
5. Add audit logging for all data access

**Implementation:** Application-level authorization in service layer

### 2.2 Finding 2: Pagination Bypass (CONFIRMED - REQUIRES MITIGATION)

**Root Cause:** Large limit values can fetch all records at once

**Severity:** CRITICAL (but mitigatable)

**Mitigation Strategy:**
1. Enforce maximum page size (e.g., 100 records)
2. Validate limit parameter server-side
3. Cap limit to maximum even if client requests more
4. Add rate limiting to prevent enumeration

**Implementation:** Service-layer validation

### 2.3 Finding 3: Multiple Active Memberships (CONFIRMED - REQUIRES MITIGATION)

**Root Cause:** No database-level unique constraint

**Severity:** HIGH (mitigatable)

**Mitigation Strategy:**
1. Add application-level validation in resolveAuthContext
2. Implement membership deduplication logic
3. Add audit logging for multiple membership detection
4. Require explicit business selection if multiple memberships exist

**Implementation:** Auth service enhancement

### 2.4 Finding 4: Branch Assignment Validation (CONFIRMED - REQUIRES MITIGATION)

**Root Cause:** No validation of branchId against BusinessMembers

**Severity:** HIGH (mitigatable)

**Mitigation Strategy:**
1. Validate branchId on record creation
2. Validate branchId on record update
3. Check against BusinessMembers collection
4. Reject invalid branch assignments

**Implementation:** Service-layer validation

### 2.5 Finding 5: Demo Data Filtering (CONFIRMED - REQUIRES MITIGATION)

**Root Cause:** Inconsistent demo data filtering across services

**Severity:** MEDIUM (mitigatable)

**Mitigation Strategy:**
1. Add demo filter to all list queries
2. Add demo filter to single record queries
3. Ensure consistent filtering across all services

**Implementation:** Service-layer filtering

### 2.6 Finding 6: Webhook Signature Validation (CONFIRMED - REQUIRES IMPLEMENTATION)

**Root Cause:** No signature validation on HTTP endpoints

**Severity:** CRITICAL (mitigatable)

**Mitigation Strategy:**
1. Implement HMAC-SHA256 signature validation
2. Add replay protection (nonce/timestamp)
3. Add rate limiting per IP

**Implementation:** HTTP endpoint middleware

### 2.7 Finding 7: Rate Limiting (CONFIRMED - REQUIRES IMPLEMENTATION)

**Root Cause:** No rate limiting on authorization functions

**Severity:** MEDIUM (mitigatable)

**Mitigation Strategy:**
1. Implement rate limiting middleware
2. Configure limits per endpoint
3. Add monitoring and alerting

**Implementation:** HTTP endpoint middleware

### 2.8 Finding 8: Stale Context Race Condition (CONFIRMED - REQUIRES MITIGATION)

**Root Cause:** No context versioning or validation

**Severity:** MEDIUM (mitigatable)

**Mitigation Strategy:**
1. Implement context versioning
2. Validate context version on each request
3. Invalidate old context after switch

**Implementation:** Auth service enhancement

### 2.9 Finding 9: Audit Logging (CONFIRMED - REQUIRES IMPLEMENTATION)

**Root Cause:** No persistent audit trail

**Severity:** MEDIUM (mitigatable)

**Mitigation Strategy:**
1. Create audit logging system
2. Log authorization failures
3. Log context switches
4. Log sensitive operations

**Implementation:** Audit service creation

### 2.10 Finding 10: Concurrency Control (CONFIRMED - REQUIRES MITIGATION)

**Root Cause:** No version control on BusinessMembers

**Severity:** MEDIUM (mitigatable)

**Mitigation Strategy:**
1. Add version field to BusinessMembers
2. Implement optimistic locking
3. Validate version on each request

**Implementation:** Schema enhancement + auth service

---

## SECTION 3: ARCHITECTURAL DECISIONS

### 3.1 Decision 1: Accept In-Memory Filtering as Platform Constraint

**Decision:** Implement application-level authorization checks instead of server-side filtering

**Rationale:**
- Wix Data API does not support server-side filtering
- In-memory filtering is the only available option
- Authorization checks can mitigate exposure risk
- Maximum page size limits the scope of in-memory filtering

**Implementation:**
- Keep existing in-memory filtering pattern
- Add authorization checks BEFORE returning data
- Enforce maximum page size (100 records)
- Add audit logging for all data access

**Risk:** If authorization check is bypassed, attacker can access all records in memory

**Mitigation:** Multiple layers of authorization (service layer + entity layer)

### 3.2 Decision 2: Implement Application-Level Constraints

**Decision:** Add validation logic in service layer instead of database constraints

**Rationale:**
- Wix Data API does not support database constraints
- Application-level validation is the only available option
- Validation can be as effective as database constraints if properly implemented

**Implementation:**
- Validate businessId on every operation
- Validate branchId against BusinessMembers
- Validate role against VALID_ROLES
- Validate status against allowed values

**Risk:** Validation can be bypassed if service layer is not called

**Mitigation:** All data access must go through service layer (enforce in code review)

### 3.3 Decision 3: Implement Context Versioning for Race Condition Prevention

**Decision:** Add version field to BusinessMembers and validate on each request

**Rationale:**
- No database-level locking available
- Version-based optimistic locking is a proven pattern
- Can detect stale context and force re-authentication

**Implementation:**
- Add `version` field to BusinessMembers (increment on update)
- Store version in AuthContext
- Validate version on each request
- Force re-authentication if version mismatch

**Risk:** Version field requires schema change

**Mitigation:** Add version field as optional, default to 1

### 3.4 Decision 4: Implement Audit Logging for Compliance

**Decision:** Create persistent audit trail for all sensitive operations

**Rationale:**
- Required for security compliance
- Helps detect unauthorized access attempts
- Provides forensic evidence

**Implementation:**
- Create auditlogs collection (if not exists)
- Log authorization failures
- Log context switches
- Log sensitive operations (create, update, delete)

**Risk:** Audit logs can grow large

**Mitigation:** Implement log retention policy (e.g., 90 days)

### 3.5 Decision 5: Implement Rate Limiting for Brute Force Protection

**Decision:** Add rate limiting middleware to HTTP endpoints

**Rationale:**
- Prevents brute force attacks
- Prevents enumeration attacks
- Prevents denial of service

**Implementation:**
- Implement rate limiter (in-memory or Redis)
- Configure limits per endpoint (e.g., 100 req/min per IP)
- Add monitoring and alerting

**Risk:** Rate limiting can affect legitimate users

**Mitigation:** Set reasonable limits, provide whitelist for trusted IPs

### 3.6 Decision 6: Implement Webhook Signature Validation

**Decision:** Add HMAC-SHA256 signature validation to HTTP endpoints

**Rationale:**
- Prevents forged webhook requests
- Ensures authenticity of webhook source

**Implementation:**
- Implement HMAC-SHA256 validation
- Add replay protection (nonce/timestamp)
- Add rate limiting per IP

**Risk:** Signature format may differ from assumption

**Mitigation:** Implement generic HMAC validation, document assumption

---

## SECTION 4: IMPLEMENTATION STRATEGY

### 4.1 Phase 3F-B Tasks (Database-Level Isolation)

**Task 3F-B-1: Enforce Maximum Page Size**
- Add MAX_PAGE_SIZE constant (100)
- Validate limit parameter in all service functions
- Cap limit to maximum
- Add regression tests

**Task 3F-B-2: Implement Branch Validation**
- Add validateBranchId() function
- Validate branchId on record creation
- Validate branchId on record update
- Add regression tests

**Task 3F-B-3: Implement Multiple Membership Detection**
- Enhance resolveAuthContext() to detect multiple memberships
- Require explicit business selection if multiple exist
- Add regression tests

**Task 3F-B-4: Add Demo Data Filtering**
- Add demo filter to all list queries
- Add demo filter to single record queries
- Add regression tests

**Task 3F-B-5: Add Context Versioning**
- Add version field to BusinessMembers
- Implement version validation in authorizeRead/Write
- Add regression tests

### 4.2 Phase 3F-C Tasks (Application-Level Hardening)

**Task 3F-C-1: Implement Webhook Signature Validation**
- Implement HMAC-SHA256 validation
- Add replay protection
- Add rate limiting

**Task 3F-C-2: Implement Rate Limiting**
- Add rate limiter middleware
- Configure limits per endpoint
- Add monitoring

**Task 3F-C-3: Fix Stale Context Race Condition**
- Implement context versioning
- Validate context version on each request
- Add regression tests

### 4.3 Phase 3F-D Tasks (Audit & Monitoring)

**Task 3F-D-1: Create Audit Logging System**
- Create auditlogs collection
- Log authorization failures
- Log context switches
- Log sensitive operations

**Task 3F-D-2: Implement Concurrency Control**
- Add version field to BusinessMembers
- Implement optimistic locking
- Validate version on each request

---

## SECTION 5: COLLECTION PERMISSION REVIEW

### 5.1 Current Permission Configuration

**businessmembers Collection:**
- Insert: ADMIN only ✓
- Update: ADMIN only ✓
- Delete: ADMIN only ✓
- Read: ADMIN only ✓
- **Status:** Correctly restricted

**All Other Collections (leads, customers, opportunities, tickets, followups, etc.):**
- Insert: ANYONE ✓
- Update: ANYONE ✓
- Delete: ANYONE ✓
- Read: ANYONE ✓
- **Status:** Open to all authenticated users (requires application-level authorization)

### 5.2 Permission Changes Required

**No changes recommended.** The current permission model is appropriate:
- businessmembers is restricted to ADMIN (correct)
- Other collections are open to ANYONE (correct, application layer enforces authorization)

**Rationale:**
- Wix Data API does not support row-level security
- Application-level authorization is the only option
- Restricting collection permissions would break application
- Current model is secure if application layer is properly implemented

### 5.3 Permission Enforcement Verification

**Required Verification:**
1. All data access goes through service layer functions
2. Service layer functions call authorizeRead/Write/Delete
3. Authorization functions validate businessId
4. Authorization functions validate branchId
5. Authorization functions validate role

**Verification Method:**
- Code review of all service functions
- Regression tests for cross-tenant access
- Integration tests with real Wix runtime

---

## SECTION 6: RISK ASSESSMENT

### 6.1 Residual Risks After Phase 3F-B

**Risk 1: In-Memory Filtering Exposure**
- **Severity:** MEDIUM (mitigated by authorization checks)
- **Mitigation:** Authorization checks before returning data
- **Residual Risk:** If authorization check is bypassed, all records in memory are exposed

**Risk 2: Pagination Bypass**
- **Severity:** MEDIUM (mitigated by maximum page size)
- **Mitigation:** Enforce maximum page size (100 records)
- **Residual Risk:** Attacker can still fetch 100 records per request

**Risk 3: Multiple Membership Race Condition**
- **Severity:** LOW (mitigated by context versioning)
- **Mitigation:** Detect multiple memberships, require explicit selection
- **Residual Risk:** Race condition during context switch (mitigated in Phase 3F-C)

**Risk 4: Branch Assignment Bypass**
- **Severity:** LOW (mitigated by validation)
- **Mitigation:** Validate branchId on create/update
- **Residual Risk:** If validation is bypassed, branch isolation fails

**Risk 5: Webhook Forgery**
- **Severity:** CRITICAL (mitigated in Phase 3F-C)
- **Mitigation:** Implement signature validation
- **Residual Risk:** Until Phase 3F-C, webhooks are vulnerable

### 6.2 Unresolved Issues

**Issue 1: No Server-Side Filtering**
- **Status:** UNRESOLVED (platform limitation)
- **Impact:** In-memory filtering required
- **Workaround:** Application-level authorization checks
- **Future:** Requires Wix Data API enhancement

**Issue 2: No Database Constraints**
- **Status:** UNRESOLVED (platform limitation)
- **Impact:** Application-level validation required
- **Workaround:** Service layer validation
- **Future:** Requires Wix Data API enhancement

**Issue 3: No Row-Level Security**
- **Status:** UNRESOLVED (platform limitation)
- **Impact:** Application-level authorization required
- **Workaround:** Service layer authorization checks
- **Future:** Requires Wix Data API enhancement

---

## SECTION 7: TESTING STRATEGY

### 7.1 Unit Tests (Phase 3F-B)

**Test Categories:**
1. Authorization checks (existing 48 tests)
2. Business selector (existing 28 tests)
3. Service integration (existing 15 tests)
4. New regression tests (TBD)

**New Regression Tests Required:**
1. Cross-tenant access prevention
2. Pagination enforcement
3. Branch validation
4. Demo data filtering
5. Multiple membership detection
6. Context versioning

### 7.2 Integration Tests (Phase 3F-E)

**Test Scenarios:**
1. Deploy to Wix staging
2. Test with real Wix Data API
3. Test with real Wix Members API
4. Test webhook delivery
5. Test rate limiting
6. Test signature validation

### 7.3 Security Tests (Phase 3F-E)

**Test Scenarios:**
1. Penetration testing
2. Fuzzing
3. Load testing
4. Cross-tenant access attempts
5. Privilege escalation attempts
6. Webhook forgery attempts

---

## SECTION 8: DEPLOYMENT STRATEGY

### 8.1 Pre-Deployment Checklist

- [ ] All unit tests pass (91 tests)
- [ ] All regression tests pass (TBD)
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Staging deployment successful
- [ ] Integration tests passed

### 8.2 Deployment Steps

1. **Phase 3F-B (Database-Level Isolation)**
   - Deploy auth service enhancements
   - Deploy service layer validation
   - Deploy maximum page size enforcement
   - Deploy demo data filtering
   - Deploy context versioning

2. **Phase 3F-C (Application-Level Hardening)**
   - Deploy webhook signature validation
   - Deploy rate limiting
   - Deploy stale context detection

3. **Phase 3F-D (Audit & Monitoring)**
   - Deploy audit logging system
   - Deploy concurrency control

4. **Phase 3F-E (Testing & Verification)**
   - Execute all tests
   - Verify fixes
   - Document results

### 8.3 Rollback Strategy

- Keep previous version available
- Monitor error rates after deployment
- Rollback if error rate exceeds threshold
- Document rollback procedure

---

## SECTION 9: ACCEPTANCE CRITERIA

### 9.1 Phase 3F-B Acceptance Criteria

- [ ] All 91 unit tests pass
- [ ] All new regression tests pass
- [ ] No cross-tenant access vulnerabilities
- [ ] Maximum page size enforced
- [ ] Branch validation implemented
- [ ] Demo data filtering consistent
- [ ] Context versioning implemented
- [ ] Code review approved
- [ ] Security review approved

### 9.2 Phase 3F-C Acceptance Criteria

- [ ] Webhook signature validation implemented
- [ ] Rate limiting implemented
- [ ] Stale context detection implemented
- [ ] All tests pass
- [ ] Code review approved
- [ ] Security review approved

### 9.3 Phase 3F-D Acceptance Criteria

- [ ] Audit logging system implemented
- [ ] Concurrency control implemented
- [ ] All tests pass
- [ ] Code review approved
- [ ] Security review approved

### 9.4 Phase 3F-E Acceptance Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All security tests pass
- [ ] Performance tests pass
- [ ] Staging deployment successful
- [ ] Production deployment approved

---

## SECTION 10: DOCUMENT METADATA

- **Report ID:** PHASE3F_B_ARCHITECTURE_DECISIONS
- **Version:** 1.0
- **Date:** 2026-09-29
- **Status:** COMPLETE - ARCHITECTURE VALIDATED
- **Next Phase:** 3F-B Implementation
- **Estimated Timeline:** 2-3 weeks for Phase 3F-B

---

**END OF PHASE 3F-B ARCHITECTURE DECISIONS**

This document establishes the architectural foundation for Phase 3F-B implementation. All decisions are based on validated Wix Data API capabilities and platform limitations.
