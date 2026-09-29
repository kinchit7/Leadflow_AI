# LeadFlow AI — Workstream 1 Quick Start Guide

**Status:** BLOCKED — Pending Actual Test Execution  
**Date:** 2026-09-29  
**Purpose:** Reproducible test execution commands for Workstream 1 verification  

---

## TL;DR — Quick Commands

### Step 1: Verify Environment
```bash
node --version
npm --version
```

### Step 2: Install Dependencies
```bash
npm ci
```

### Step 3: Run Individual Test Suites

**Workstream 1 Integration Tests:**
```bash
npm run test:run -- src/backend/__tests__/workstream1-integration.test.ts
```

**Context Integrity Tests:**
```bash
npm run test:run -- src/backend/__tests__/context-integrity.test.ts
```

**Regression Tests:**
```bash
npm run test:run -- src/backend/__tests__/regression.test.ts
```

**Auth Tests:**
```bash
npm run test:run -- src/backend/__tests__/auth.test.ts
```

### Step 4: Run Complete Suite
```bash
npm run test:run
```

---

## Detailed Execution Steps

### Phase 1: Environment Setup (5 minutes)

```bash
# 1. Verify Node.js and npm
node --version
# Expected: v18.0.0 or higher

npm --version
# Expected: v9.0.0 or higher

# 2. Navigate to project root
cd /path/to/project

# 3. Install dependencies
npm ci
# Expected: All dependencies installed successfully
```

---

### Phase 2: Individual Test Execution (15 minutes)

#### Test 1: Workstream 1 Integration Tests
```bash
npm run test:run -- src/backend/__tests__/workstream1-integration.test.ts
```

**Expected output:**
```
✓ PHASE 3F-C Workstream 1: Context Integrity Integration
  ✓ Integration: validateContextFreshness() in authorizeRead()
    ✓ should reject stale context in authorizeRead()
    ✓ should accept fresh context in authorizeRead()
  ✓ Integration: validateContextFreshness() in authorizeWrite()
    ✓ should reject stale context in authorizeWrite()
    ✓ should accept fresh context in authorizeWrite()
  ✓ Membership revocation detection
    ✓ should reject revoked membership in authorizeRead()
    ✓ should reject revoked membership in authorizeWrite()
  ✓ Role change detection
    ✓ should detect role change on subsequent request
  ✓ Branch reassignment detection
    ✓ should detect branch reassignment on subsequent request

Test Files  1 passed (1)
     Tests  10 passed (10)
```

**Record:**
- Exit code: `0` (success)
- Passed: `10`
- Failed: `0`
- Skipped: `0`

---

#### Test 2: Context Integrity Tests
```bash
npm run test:run -- src/backend/__tests__/context-integrity.test.ts
```

**Expected output:**
```
✓ Context Integrity - PHASE 3F-C
  ✓ Workstream C: Multiple-Membership Race Condition
    ✓ Concurrent Business Switching
      ✓ should detect simultaneous membership activation
      ✓ should prevent context reuse across businesses
    ✓ Membership Revocation
      ✓ should block revoked member access
      ✓ should audit revocation detection

Test Files  1 passed (1)
     Tests  8 passed (8)
```

**Record:**
- Exit code: `0` (success)
- Passed: `8`
- Failed: `0`
- Skipped: `0`

---

#### Test 3: Regression Tests
```bash
npm run test:run -- src/backend/__tests__/regression.test.ts
```

**Expected output:**
```
✓ PHASE 3F-B Regression Tests
  ✓ Maximum Page Size Enforcement (5 tests)
  ✓ Cross-Tenant Access Prevention (8 tests)
  ✓ Branch Authorization (6 tests)
  ✓ Demo Data Filtering (5 tests)
  ✓ Multiple Membership Detection (4 tests)
  ✓ Audit Logging (8 tests)
  ✓ Protected Field Sanitization (5 tests)
  ✓ Bulk Operations (4 tests)

Test Files  1 passed (1)
     Tests  45 passed (45)
```

**Record:**
- Exit code: `0` (success)
- Passed: `45`
- Failed: `0`
- Skipped: `0`

---

#### Test 4: Auth Tests
```bash
npm run test:run -- src/backend/__tests__/auth.test.ts
```

**Expected output:**
```
✓ Authentication & Authorization (Phase 3)
  ✓ resolveAuthContext (5 tests)
  ✓ Multiple Membership Detection (4 tests)
  ✓ Role-Based Authorization (6 tests)
  ✓ Branch-Level Access Control (5 tests)
  ✓ Protected Field Validation (4 tests)
  ✓ Tenant Isolation (5 tests)

Test Files  1 passed (1)
     Tests  29 passed (29)
```

**Record:**
- Exit code: `0` (success)
- Passed: `29`
- Failed: `0`
- Skipped: `0`

---

### Phase 3: Complete Test Suite (10 minutes)

```bash
npm run test:run
```

**Expected output:**
```
✓ src/backend/__tests__/workstream1-integration.test.ts (10)
✓ src/backend/__tests__/context-integrity.test.ts (8)
✓ src/backend/__tests__/regression.test.ts (45)
✓ src/backend/__tests__/auth.test.ts (29)
✓ src/backend/__tests__/services-integration.test.ts (50)
✓ src/backend/__tests__/business-selector.test.ts (10)
✓ src/backend/__tests__/rate-limiter.test.ts (8)
✓ src/backend/__tests__/webhook-security.test.ts (10)

Test Files  8 passed (8)
     Tests  170 passed (170)
```

**Record:**
- Exit code: `0` (success)
- Total tests: `170`
- Passed: `170`
- Failed: `0`
- Skipped: `0`

---

## Troubleshooting

### Issue: "Command not found: npm"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "vitest: command not found"
**Solution:** Run `npm ci` to install dependencies

### Issue: "Cannot find module '@/integrations'"
**Solution:** Verify tsconfig.json path aliases are correct

### Issue: "Tests timeout"
**Solution:** Increase timeout:
```bash
npm run test:run -- --testTimeout=10000
```

### Issue: "Mock setup failed"
**Solution:** Check that all mocked modules exist:
```bash
ls -la src/backend/auth.web.ts
ls -la src/backend/audit-service.web.ts
```

---

## Acceptance Criteria Verification

### ✓ Membership Revocation
```bash
npm run test:run -- src/backend/__tests__/workstream1-integration.test.ts -t "revoked"
```
Expected: Tests pass, revoked users blocked

### ✓ Role Changes
```bash
npm run test:run -- src/backend/__tests__/context-integrity.test.ts -t "role"
```
Expected: Tests pass, role changes detected

### ✓ Branch Changes
```bash
npm run test:run -- src/backend/__tests__/context-integrity.test.ts -t "branch"
```
Expected: Tests pass, branch changes detected

### ✓ Tenant Isolation
```bash
npm run test:run -- src/backend/__tests__/regression.test.ts -t "tenant|cross"
```
Expected: Tests pass, cross-tenant access blocked

### ✓ Context Freshness
```bash
npm run test:run -- src/backend/__tests__/workstream1-integration.test.ts -t "stale|fresh"
```
Expected: Tests pass, stale contexts rejected

### ✓ Protected Services
```bash
npm run test:run -- src/backend/__tests__/services-integration.test.ts
```
Expected: All services pass authorization checks

---

## Results Template

**Copy and fill in after running tests:**

```markdown
# Workstream 1 Test Execution Results

## Environment
- Node version: _______________
- npm version: _______________

## Test Results

### Workstream 1 Integration Tests
- Command: npm run test:run -- src/backend/__tests__/workstream1-integration.test.ts
- Exit code: _______________
- Passed: ___ / 10 | Failed: ___ | Skipped: ___

### Context Integrity Tests
- Command: npm run test:run -- src/backend/__tests__/context-integrity.test.ts
- Exit code: _______________
- Passed: ___ / 8 | Failed: ___ | Skipped: ___

### Regression Tests
- Command: npm run test:run -- src/backend/__tests__/regression.test.ts
- Exit code: _______________
- Passed: ___ / 45 | Failed: ___ | Skipped: ___

### Auth Tests
- Command: npm run test:run -- src/backend/__tests__/auth.test.ts
- Exit code: _______________
- Passed: ___ / 29 | Failed: ___ | Skipped: ___

### Complete Suite
- Command: npm run test:run
- Exit code: _______________
- Total tests: _______________
- Passed: ___ | Failed: ___ | Skipped: ___

## Status
- [ ] All tests passed (exit code 0)
- [ ] Membership revocation verified
- [ ] Role changes verified
- [ ] Branch changes verified
- [ ] Tenant isolation verified
- [ ] Context freshness verified
- [ ] Protected services verified

## Recommendation
- [ ] PASS — Proceed to final verification
- [ ] BLOCKED — Resolve failures and re-test
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/backend/auth.web.ts` | Authorization logic |
| `src/backend/audit-service.web.ts` | Audit logging |
| `src/backend/__tests__/workstream1-integration.test.ts` | Context freshness tests |
| `src/backend/__tests__/context-integrity.test.ts` | Membership/role/branch tests |
| `src/backend/__tests__/regression.test.ts` | 45 regression tests |
| `src/backend/__tests__/auth.test.ts` | Core auth tests |
| `src/backend/__tests__/services-integration.test.ts` | Protected services tests |

---

## Status

**Current:** BLOCKED — Pending Actual Test Execution

**Next:** Execute commands above and record results

**Success Criteria:** All tests pass with exit code 0

---

**Quick Start Version:** 1.0  
**Date:** 2026-09-29  
**Status:** BLOCKED — Pending Execution
