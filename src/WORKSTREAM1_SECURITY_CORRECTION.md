# WORKSTREAM 1 — Security Correction: Server-Side Constrained Query Implementation

**Date:** 2026-10-05  
**Status:** IMPLEMENTATION COMPLETE — TEST EXECUTION PENDING  
**Scope:** BusinessMembers authorization lookup hardening

---

## Problem Statement

The previous implementation of `resolveAuthContext()` was **NOT actually server-side constrained**:

```typescript
// OLD (INCORRECT) APPROACH
const membershipResult = await BaseCrudService.getAll<BusinessMembers>(
  'businessmembers',
  [],
  { limit: 100 } // Fetches first 100 records
);

// Then filters in memory (JavaScript)
const activeMemberships = membershipResult.items.filter(
  (m: BusinessMembers) => 
    m.memberId === memberId && 
    m.status === 'active'
);
```

**Security Issue:**
- If a member has 150 total memberships, and their active membership is at record 101+, it would be missed
- The `limit: 100` was a performance optimization, NOT a security constraint
- Filtering happened in memory after fetching, not at database level

---

## Solution: Wix Data Predicates

The new implementation uses Wix Data API predicates for **true database-level filtering**:

```typescript
// NEW (CORRECT) APPROACH
const membershipResult = await queryWithPredicates<BusinessMembers>(
  'businessmembers',
  [
    { field: 'memberId', operator: 'eq', value: memberId },
    { field: 'status', operator: 'eq', value: 'active' }
  ],
  { limit: 2 } // Retrieve at most 2 to detect multiple active memberships
);
```

**How It Works:**
1. Wix Data API receives predicates: `memberId == authenticated memberId` AND `status == 'active'`
2. Database applies predicates to entire collection (not just first 100 records)
3. Returns ONLY matching records
4. Pagination offset applies AFTER filtering

**Result:**
- Correctly handles collections of any size
- Filtering is database-level, not in-memory
- Client cannot override predicates

---

## Modified Files

### 1. `/src/backend/wix-data-query.web.ts` (NEW FILE)

**Purpose:** Provides server-side constrained query capability using Wix Data predicates

**Key Functions:**
- `queryWithPredicates<T>()` - Query with database-level filtering

**Security Properties:**
- Predicates applied at database level
- Supports multiple predicates with AND logic
- Returns paginated results
- Handles >100 record case correctly

**Example Usage:**
```typescript
const result = await queryWithPredicates<BusinessMembers>(
  'businessmembers',
  [
    { field: 'memberId', operator: 'eq', value: 'member-123' },
    { field: 'status', operator: 'eq', value: 'active' }
  ],
  { limit: 2 }
);

// Result:
// - items.length === 0 → no active membership
// - items.length === 1 → single active membership (use it)
// - items.length >= 2 → multiple active memberships (fail closed)
```

### 2. `/src/backend/auth.web.ts` (MODIFIED)

**Changes to `resolveAuthContext()`:**

**Line 14-15: Import new query function**
```typescript
import { queryWithPredicates } from './wix-data-query.web';
```

**Lines 85-183: Updated implementation**
```typescript
export async function resolveAuthContext(
  memberId: string, 
  skipCache: boolean = false
): Promise<AuthContext | null> {
  // ... validation ...

  // WORKSTREAM 1: Server-side constrained query using Wix Data predicates
  const membershipResult = await queryWithPredicates<BusinessMembers>(
    'businessmembers',
    [
      { field: 'memberId', operator: 'eq', value: memberId },
      { field: 'status', operator: 'eq', value: 'active' }
    ],
    { limit: 2 } // Retrieve at most 2 to detect multiple active memberships
  );

  // Check result count
  if (membershipResult.items.length === 0) {
    return null; // No active membership
  }

  if (membershipResult.items.length > 1) {
    console.error(`Member ${memberId} has multiple active memberships. Denying access.`);
    await logMultipleMembershipDetected(memberId, membershipResult.items.length);
    return null; // Fail closed
  }

  const membership = membershipResult.items[0];
  // ... validate and extract context ...
}
```

**Security Guarantees:**
- ✅ Query constrained at DATABASE LEVEL
- ✅ Predicates: `memberId == authenticated memberId` AND `status == 'active'`
- ✅ Handles >100 record case correctly
- ✅ Detects multiple active memberships
- ✅ Client cannot override predicates
- ✅ Fail-closed on ambiguous state

### 3. `/src/backend/__tests__/security-remediation.test.ts` (UPDATED)

**New Tests for WORKSTREAM 1:**

1. **Valid membership found**
   - Single active membership resolved correctly
   - businessId and role extracted

2. **Member has no active membership**
   - Returns null when no active memberships found
   - Returns null when membership status is not 'active'

3. **Member has multiple active memberships**
   - Fails closed when multiple active memberships detected
   - Logs event via `logMultipleMembershipDetected()`

4. **Membership beyond first 100 records**
   - Query constraint verification
   - Ensures limit parameter is used

5. **Inactive membership is ignored**
   - Only active status matches
   - Revoked/pending memberships filtered out

6. **Query is server-side constrained**
   - Verifies memberId and status predicates are applied
   - Confirms filtering happens at database level

7. **Client-supplied businessId cannot change authorization context**
   - businessId extracted from database, not client
   - Client cannot override authorization

### 4. `/src/SECURITY_REMEDIATION_REPORT.md` (UPDATED)

**Corrections Made:**
- Removed claim that old implementation was "server-side constrained"
- Clarified that old approach used in-memory filtering
- Documented new Wix Data predicate approach
- Added explanation of how >100 record case is handled
- Added explanation of multiple active membership detection

---

## Security Analysis

### How >100 Records Are Handled

**Old Approach (INCORRECT):**
```
1. Fetch first 100 records: getAll(..., { limit: 100 })
2. Filter in memory: items.filter(m => m.memberId === memberId && m.status === 'active')
3. PROBLEM: If valid membership is at record 101+, it's missed
```

**New Approach (CORRECT):**
```
1. Query with predicates: queryWithPredicates(..., [
     { field: 'memberId', operator: 'eq', value: memberId },
     { field: 'status', operator: 'eq', value: 'active' }
   ])
2. Wix Data applies predicates to entire collection
3. Returns ONLY matching records (regardless of collection size)
4. Pagination offset applies AFTER filtering
5. RESULT: Correctly handles any collection size
```

### How Multiple Active Memberships Are Detected

**Query Result Interpretation:**
```typescript
const result = await queryWithPredicates(..., { limit: 2 });

if (result.items.length === 0) {
  // No active membership found
  // → Deny access (return null)
}

if (result.items.length === 1) {
  // Single active membership found
  // → Use it to resolve context
  const membership = result.items[0];
  return { memberId, businessId: membership.businessId, ... };
}

if (result.items.length >= 2) {
  // Multiple active memberships detected
  // → Fail closed (ambiguous context)
  await logMultipleMembershipDetected(memberId, result.items.length);
  return null;
}
```

**Why limit: 2?**
- We only need to know if there are 0, 1, or 2+ active memberships
- Retrieving 2 records is sufficient to detect the ambiguous case
- Minimizes database load while maintaining security

### Client Cannot Override Authorization

**Predicate Application:**
```typescript
// Client cannot supply these predicates
// They are hardcoded in resolveAuthContext()
const predicates = [
  { field: 'memberId', operator: 'eq', value: memberId }, // From Wix session
  { field: 'status', operator: 'eq', value: 'active' }    // Hardcoded
];

// Client cannot:
// - Change memberId (comes from authenticated session)
// - Change status filter (hardcoded to 'active')
// - Add/remove predicates
// - Supply businessId as authorization proof
```

---

## Preserved Security Controls

All existing security controls remain intact:

- ✅ Tenant isolation (businessId validation)
- ✅ Branch authorization (branchId validation)
- ✅ Role authorization (role validation)
- ✅ Context freshness validation (5-minute TTL)
- ✅ Membership revocation detection
- ✅ Role change detection
- ✅ Branch reassignment detection
- ✅ Protected field sanitization
- ✅ Audit logging
- ✅ Fail-closed behavior

---

## Test Execution Status

**IMPLEMENTATION COMPLETE — TEST EXECUTION PENDING**

The test suite has been created in `/src/backend/__tests__/security-remediation.test.ts` with comprehensive coverage for:

1. Valid membership resolution
2. No active membership detection
3. Multiple active membership detection
4. >100 record handling
5. Inactive membership filtering
6. Server-side constraint verification
7. Client override prevention
8. Context freshness validation
9. Membership revocation detection
10. Role change detection
11. Branch change detection
12. Priority engine runtime defects
13. Activity event duplicate handling
14. Webhook secret initialization
15. Audit sanitization Promise handling
16. Regression tests for existing controls

**Note:** Tests require execution in the Wix Vibe environment to validate actual Wix Data API behavior.

---

## Deployment Checklist

- [x] New query function implemented (`wix-data-query.web.ts`)
- [x] Authorization function updated (`auth.web.ts`)
- [x] Test suite created (`security-remediation.test.ts`)
- [x] Documentation updated (`SECURITY_REMEDIATION_REPORT.md`)
- [ ] Tests executed in Wix Vibe environment
- [ ] Staging verification completed
- [ ] Production deployment

---

## References

- **Wix Data API:** Uses `items.query()` with `.eq()`, `.ne()`, `.gt()`, etc. predicates
- **Predicate Application:** Database-level filtering before pagination
- **Pagination:** Applied AFTER predicate filtering
- **Security Model:** Deny-by-default, fail-closed on ambiguous state
