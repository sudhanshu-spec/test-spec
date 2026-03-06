# Blitzy Project Guide

## 1. Executive Summary

### 1.1 Project Overview

This project is a surgical bug fix addressing three interrelated production-readiness deficiencies in the `server.js` entry point of a Node.js/Express HTTP server application. The root cause was a single omission — the `http.Server` instance returned by `app.listen()` was discarded — which cascaded into missing EADDRINUSE error handling, absent graceful shutdown on SIGTERM/SIGINT signals, and vacuous test coverage. The fix captures the server reference, registers an error event handler, adds signal-based graceful shutdown, exports the server instance, and hardens the test suite with signal handler cleanup and two new test cases.

### 1.2 Completion Status

```mermaid
pie title Completion Status
    "Completed (AI)" : 7
    "Remaining" : 3
```

| Metric | Value |
|--------|-------|
| **Total Project Hours** | 10.0 |
| **Completed Hours (AI)** | 7.0 |
| **Remaining Hours** | 3.0 |
| **Completion Percentage** | **70.0%** |

**Calculation:** 7.0 completed hours / (7.0 + 3.0) total hours = 70.0% complete

### 1.3 Key Accomplishments

- ✅ Captured `http.Server` reference via `const server = app.listen(...)` at `server.js` line 49
- ✅ Implemented EADDRINUSE error handler via `server.on('error', handler)` at `server.js` line 65
- ✅ Implemented graceful shutdown via `process.on('SIGTERM'/'SIGINT', shutdown)` at `server.js` lines 95–96
- ✅ Exported server instance via `module.exports = server` at `server.js` line 108
- ✅ Added signal handler cleanup in test `afterEach` to prevent cross-test contamination
- ✅ Added 2 new test cases: non-EADDRINUSE error handling and SIGTERM shutdown verification
- ✅ All 43 tests pass with 100% coverage across all metrics (statements, branches, functions, lines)
- ✅ Runtime validated: server starts, endpoints respond correctly, EADDRINUSE handler works

### 1.4 Critical Unresolved Issues

| Issue | Impact | Owner | ETA |
|-------|--------|-------|-----|
| Human code review not yet performed | Changes not peer-verified before merge | Human Developer | 1 hour |
| Manual EADDRINUSE smoke test in production-like environment pending | Port conflict behavior unverified outside test mocks | Human Developer / QA | 0.5 hours |

### 1.5 Access Issues

No access issues identified. All work was performed within the local repository using Node.js built-in APIs and existing npm dependencies. No external services, API keys, or special permissions are required.

### 1.6 Recommended Next Steps

1. **[High]** Conduct human code review of `server.js` and `tests/lifecycle/server.test.js` — verify changes match AAP specification exactly
2. **[High]** Run manual EADDRINUSE smoke test — start two server instances on port 3000, confirm error handler logs message without crashing
3. **[Medium]** Deploy to staging environment and verify SIGTERM/SIGINT graceful shutdown behavior with a process manager (e.g., PM2 or Docker)
4. **[Medium]** Merge PR after review approval and deploy to production
5. **[Low]** Monitor production logs post-deployment for any unexpected server error events

---

## 2. Project Hours Breakdown

### 2.1 Completed Work Detail

| Component | Hours | Description |
|-----------|-------|-------------|
| Root Cause Analysis & Diagnostics | 1.5 | Code examination, grep analysis, mock tracing, identification of 3 root causes and their dependency chain |
| server.js — Server Reference Capture (RC-1) | 0.5 | Modified line 49: `app.listen(...)` → `const server = app.listen(...)` |
| server.js — EADDRINUSE Error Handler (RC-2) | 1.0 | Implemented `server.on('error', handler)` with EADDRINUSE-specific and generic error logging (lines 54–74) |
| server.js — Graceful Shutdown (RC-3) | 1.0 | Implemented `shutdown()` function and `process.on('SIGTERM'/'SIGINT', shutdown)` signal handlers (lines 76–96) |
| server.js — Module Export | 0.5 | Added `module.exports = server` with JSDoc type annotation (lines 98–108) |
| Test Modifications & New Tests | 1.5 | Added afterEach signal cleanup (lines 103–106), non-EADDRINUSE error test (lines 209–226), SIGTERM shutdown test (lines 228–243) |
| Validation & Regression Testing | 1.0 | Full test suite execution (43/43 pass), coverage verification (100%), runtime validation, grep-based fix verification |
| **Total** | **7.0** | |

### 2.2 Remaining Work Detail

| Category | Base Hours | Priority | After Multiplier |
|----------|------------|----------|------------------|
| Human Code Review — verify 2 modified files against AAP spec | 1.0 | High | 1.0 |
| Manual EADDRINUSE Smoke Test — dual server instance verification | 0.5 | High | 0.5 |
| Staging Deployment & Verification — SIGTERM/SIGINT lifecycle testing | 1.0 | Medium | 1.5 |
| **Total** | **2.5** | | **3.0** |

### 2.3 Enterprise Multipliers Applied

| Multiplier | Value | Rationale |
|------------|-------|-----------|
| Compliance Review | 1.10x | Code review approval and change management process overhead for production deployment |
| Uncertainty Buffer | 1.10x | Minor uncertainty in staging environment configuration and process manager signal delivery |
| **Combined** | **1.21x** | Applied to base remaining hours: 2.5h × 1.21 ≈ 3.0h |

---

## 3. Test Results

| Test Category | Framework | Total Tests | Passed | Failed | Coverage % | Notes |
|---------------|-----------|-------------|--------|--------|------------|-------|
| Unit — Configuration | Jest 30.2.0 | 14 | 14 | 0 | 100% | Default values, custom values, edge cases, type checks, structure validation |
| Unit — Routes | Jest 30.2.0 | 7 | 7 | 0 | 100% | Router export, handler definitions, path ordering |
| Integration — Endpoints | Jest 30.2.0 + Supertest 7.1.4 | 14 | 14 | 0 | 100% | GET /, GET /evening, 404 handling, edge cases |
| Lifecycle — Server Entry Point | Jest 30.2.0 | 7 | 7 | 0 | 100% | Binding, startup log, custom config, shutdown, EADDRINUSE, non-EADDRINUSE, SIGTERM |
| **Totals** | | **43** | **43** | **0** | **100%** | All suites pass; execution time ~1.2s |

**Coverage Breakdown (all thresholds exceeded):**

| Metric | Achieved | Threshold | Status |
|--------|----------|-----------|--------|
| Statements | 100% | ≥ 80% | ✅ Pass |
| Branches | 100% | ≥ 75% | ✅ Pass |
| Functions | 100% | ≥ 90% | ✅ Pass |
| Lines | 100% | ≥ 80% | ✅ Pass |

---

## 4. Runtime Validation & UI Verification

**Runtime Health:**

- ✅ Server starts successfully on `http://127.0.0.1:3000/` with `node server.js`
- ✅ `GET /` returns `"Hello, World!\n"` with status 200 and `text/html; charset=utf-8` content type
- ✅ `GET /evening` returns `"Good evening"` with status 200 and `text/html; charset=utf-8` content type
- ✅ `GET /invalid` returns 404 for undefined routes
- ✅ EADDRINUSE error handler logs `"Port 3000 is already in use. Please free the port or use a different one."` when port is occupied

**Fix Verification (AAP §0.6.1):**

- ✅ `grep -n "const server = app.listen" server.js` → match at line 49
- ✅ `grep -n "server.on('error'" server.js` → match at line 65
- ✅ `grep -n "process.on('SIGTERM'" server.js` → match at line 95
- ✅ `grep -n "process.on('SIGINT'" server.js` → match at line 96
- ✅ `grep -n "module.exports = server" server.js` → match at line 108

**UI Verification:**

- Not applicable — this is a backend Node.js server with no UI components.

---

## 5. Compliance & Quality Review

| AAP Requirement | Spec Reference | Status | Evidence |
|-----------------|----------------|--------|----------|
| Capture `http.Server` reference from `app.listen()` | §5.2.1, §0.4.1 RC-1 | ✅ Pass | `const server = app.listen(...)` at server.js:49 |
| Register `server.on('error', handler)` for EADDRINUSE | §4.4.2 PROC-06 | ✅ Pass | Error handler at server.js:65–74 |
| Error handler absorbs errors without re-throwing | §4.4.2, §4.4.3 | ✅ Pass | No `throw` statement in handler; `console.error` only |
| No retry mechanisms for EADDRINUSE | §4.4.3 | ✅ Pass | No retry logic present |
| Register `process.on('SIGTERM', shutdown)` | §4.5.2 PROC-07 | ✅ Pass | Signal handler at server.js:95 |
| Register `process.on('SIGINT', shutdown)` | §4.5.2 PROC-07 | ✅ Pass | Signal handler at server.js:96 |
| Shutdown calls `server.close(callback)` | §4.5.2 | ✅ Pass | `server.close(() => {...})` at server.js:89–92 |
| No connection timeout enforcement during shutdown | §4.5.2 | ✅ Pass | No `setTimeout` force-exit present |
| Export server instance via `module.exports` | §5.2.1 | ✅ Pass | `module.exports = server` at server.js:108 |
| CommonJS module pattern maintained | §0.7 Rules | ✅ Pass | `require()` / `module.exports` used exclusively |
| `'use strict'` directive preserved | §0.7 Rules | ✅ Pass | Line 19 unchanged |
| Section divider style consistent | §0.7 Rules | ✅ Pass | `// ===...===` format matches lines 21–23, 39–41 |
| JSDoc comment style preserved | §0.7 Rules | ✅ Pass | All new blocks have JSDoc with Tech Spec references |
| Test `afterEach` signal handler cleanup | §0.4.2 | ✅ Pass | `removeAllListeners` at test lines 105–106 |
| All 41+ tests pass | §0.6.1 | ✅ Pass | 43/43 tests pass (2 new tests added for coverage) |
| Coverage thresholds met | §0.6.1 | ✅ Pass | 100% all metrics, thresholds: 80/75/90/80 |
| No modifications to excluded files | §0.5.2 | ✅ Pass | Only server.js and server.test.js modified |
| No new npm dependencies | §0.7 Rules | ✅ Pass | Only Node.js built-in APIs used |

**Autonomous Fixes Applied:**

| Fix | Commit | Description |
|-----|--------|-------------|
| Core bug fix | `a1aab4c` | Captured server reference, added error handler, shutdown handlers, module export |
| Test scope revert | `53b50c5` | Reverted graceful shutdown test to original form per AAP scope boundaries |
| Coverage gap fix | `e8e7dc5` | Added 2 new tests (non-EADDRINUSE errors, SIGTERM shutdown) to meet 90% functions threshold |

---

## 6. Risk Assessment

| Risk | Category | Severity | Probability | Mitigation | Status |
|------|----------|----------|-------------|------------|--------|
| EADDRINUSE handler absorbs error but does not exit process — server remains in limbo state | Technical | Low | Low | By Tech Spec design (§4.4.3); process managers (PM2, Docker) handle restart policy | Accepted |
| No connection timeout during graceful shutdown — long-lived connections could delay exit | Technical | Low | Low | Per Tech Spec §4.5.2 no timeout enforcement; container orchestrators enforce kill timeout | Accepted |
| Signal handler accumulation in test environment if afterEach fails | Technical | Low | Very Low | afterEach cleanup added; Jest test isolation provides additional safety | Mitigated |
| Server bound to 127.0.0.1 limits network accessibility | Operational | Low | N/A | Default is secure; override via `HOST=0.0.0.0` environment variable for production | Accepted |
| No structured logging (uses console.log/error) | Operational | Low | N/A | Adequate for current scope; production logging library (winston, pino) is an enhancement | Accepted |
| No health check endpoint for container orchestrators | Integration | Low | Low | Not in AAP scope; `/health` endpoint is a recommended enhancement for Kubernetes/Docker deployments | Accepted |

---

## 7. Visual Project Status

```mermaid
pie title Project Hours Breakdown
    "Completed Work" : 7
    "Remaining Work" : 3
```

**Remaining Work by Priority:**

| Priority | Hours (After Multiplier) | Tasks |
|----------|------------------------|-------|
| High | 1.5 | Code review (1.0h) + EADDRINUSE smoke test (0.5h) |
| Medium | 1.5 | Staging deployment & lifecycle verification |
| **Total** | **3.0** | |

---

## 8. Summary & Recommendations

### Achievement Summary

Blitzy autonomous agents successfully diagnosed and fixed all three root causes of the server lifecycle management bug in `server.js`. The fix is surgically targeted — confined to exactly 2 files (`server.js` and `tests/lifecycle/server.test.js`) with 97 lines added and 1 line modified, introducing zero new dependencies. All 43 tests pass with 100% code coverage across statements, branches, functions, and lines. The project is **70.0% complete** (7.0 hours completed out of 10.0 total hours).

### Remaining Gaps

The remaining 3.0 hours consist exclusively of path-to-production activities that require human intervention:

1. **Human code review** of the 2 modified files to verify changes match the AAP specification
2. **Manual EADDRINUSE smoke test** — starting two server instances on the same port to verify error handling in a real (non-mocked) environment
3. **Staging deployment** — deploying to a staging environment and testing SIGTERM/SIGINT graceful shutdown behavior with a process manager

### Production Readiness Assessment

The codebase is **ready for human review and merge**. All autonomous work is complete, validated, and regression-tested. No compilation errors, no test failures, and no runtime issues were detected. The fix aligns precisely with Tech Spec sections §4.4.2, §4.5.2, and §5.2.1.

### Success Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tests Passing | 41+ | 43/43 | ✅ Exceeded |
| Statement Coverage | ≥ 80% | 100% | ✅ Exceeded |
| Branch Coverage | ≥ 75% | 100% | ✅ Exceeded |
| Function Coverage | ≥ 90% | 100% | ✅ Exceeded |
| Line Coverage | ≥ 80% | 100% | ✅ Exceeded |
| Files Modified | 2 | 2 | ✅ Match |
| New Dependencies | 0 | 0 | ✅ Match |

---

## 9. Development Guide

### System Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | v20.20.0 | JavaScript runtime |
| npm | 11.1.0 | Package manager |
| Git | Any recent | Version control |

### Environment Setup

```bash
# Clone the repository and switch to the fix branch
git clone <repository-url>
cd hello_world
git checkout blitzy-b28d4fb9-b738-48b6-ad89-25c2bd10badd
```

No environment variables are required for development. Defaults are:
- `HOST` → `127.0.0.1`
- `PORT` → `3000`
- `NODE_ENV` → `development`

### Dependency Installation

```bash
# Install exact dependency versions from lockfile
npm ci
```

Expected output: `added 73 packages` (approximate count depending on platform)

### Running Tests

```bash
# Run all tests with coverage (CI mode, no watch)
CI=true npx jest --ci --coverage --watchAll=false
```

Expected output:
- `Test Suites: 4 passed, 4 total`
- `Tests: 43 passed, 43 total`
- Coverage: 100% across all metrics

### Starting the Server

```bash
# Start with defaults (127.0.0.1:3000)
npm start

# Start with custom host and port
HOST=0.0.0.0 PORT=8080 npm start
```

Expected output: `Server running at http://127.0.0.1:3000/`

### Verification Steps

```bash
# Test root endpoint
curl -s http://127.0.0.1:3000/
# Expected: Hello, World!

# Test evening endpoint
curl -s http://127.0.0.1:3000/evening
# Expected: Good evening

# Test 404 handling
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/nonexistent
# Expected: 404

# Verify EADDRINUSE handling (in a second terminal while server is running)
node -e "require('http').createServer().listen(3000)"
# Expected: Error message logged, not a crash

# Test graceful shutdown
kill -SIGTERM <server-pid>
# Expected: "Shutdown signal received: closing HTTP server" followed by "HTTP server closed"
```

### Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| `Error: listen EADDRINUSE` on startup | Port 3000 already occupied | Kill the existing process: `lsof -ti:3000 \| xargs kill` or set `PORT=3001` |
| Tests fail with "Cannot find module" | Dependencies not installed | Run `npm ci` to install from lockfile |
| Jest enters watch mode | Missing CI flag | Use `CI=true npx jest --ci --watchAll=false` |
| Signal handler tests flaky | Handler accumulation | Ensure `afterEach` cleanup is present in test file |

---

## 10. Appendices

### A. Command Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start HTTP server (`node server.js`) |
| `npm test` | Run Jest test suite |
| `npm run test:ci` | Run tests with CI flags and coverage |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch` | Run tests in watch mode (development) |
| `CI=true npx jest --ci --coverage --watchAll=false` | Full validation command |

### B. Port Reference

| Port | Service | Default Host | Configurable Via |
|------|---------|--------------|------------------|
| 3000 | Express HTTP server | 127.0.0.1 | `PORT` and `HOST` environment variables |

### C. Key File Locations

| File | Purpose | Lines |
|------|---------|-------|
| `server.js` | HTTP server entry point (primary fix location) | 108 |
| `tests/lifecycle/server.test.js` | Server lifecycle tests (secondary fix location) | 244 |
| `src/app.js` | Express application factory | 27 |
| `src/config/index.js` | Environment-driven configuration | 41 |
| `src/routes/index.js` | Route barrel export | 19 |
| `src/routes/main.routes.js` | HTTP route handlers (GET /, GET /evening) | 41 |
| `jest.config.js` | Jest test configuration with coverage thresholds | 27 |
| `package.json` | Project manifest and npm scripts | — |

### D. Technology Versions

| Technology | Version | Role |
|------------|---------|------|
| Node.js | v20.20.0 | Runtime |
| Express | ^5.1.0 | HTTP framework |
| Jest | ^30.2.0 | Test runner |
| Supertest | ^7.1.4 | HTTP assertion library |
| npm | 11.1.0 | Package manager |

### E. Environment Variable Reference

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `HOST` | `127.0.0.1` | string | Server bind address |
| `PORT` | `3000` | number | Server listen port (parsed with `parseInt`) |
| `NODE_ENV` | `development` | string | Application environment |

### F. Developer Tools Guide

**Running a specific test file:**
```bash
npx jest tests/lifecycle/server.test.js --verbose
```

**Checking coverage for server.js only:**
```bash
npx jest --coverage --collectCoverageFrom='server.js'
```

**Verifying fix presence via grep:**
```bash
grep -n "const server = app.listen" server.js
grep -n "server.on('error'" server.js
grep -n "process.on('SIGTERM'" server.js
grep -n "module.exports = server" server.js
```

### G. Glossary

| Term | Definition |
|------|------------|
| EADDRINUSE | Node.js error code indicating the requested network port is already occupied by another process |
| Graceful Shutdown | Process of stopping the server by ceasing to accept new connections while allowing active connections to complete |
| SIGTERM | Unix termination signal sent by process managers and container orchestrators to request graceful shutdown |
| SIGINT | Unix interrupt signal sent by Ctrl+C in a terminal |
| CommonJS | Node.js module system using `require()` and `module.exports` |
| Factory Pattern | Design pattern where `src/app.js` creates and configures the Express app without binding to a port |