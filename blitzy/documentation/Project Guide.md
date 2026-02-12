# Project Guide: server.js Production-Readiness Bug Fix

## 1. Executive Summary

This project addresses five critical production-readiness deficiencies in `server.js` — the HTTP server entry point of a Node.js / Express 5.1.0 reference application. The root cause was a single architectural deficiency: the `http.Server` instance returned by `app.listen()` was discarded, preventing any lifecycle management.

**Completion: 19 hours completed out of 27 total hours = 70% complete.**

All development and testing work specified in the Agent Action Plan is fully implemented and validated:
- All 9 scope changes from Section 0.5.1 are implemented
- All 16 Jest tests pass (100% test pass rate)
- All 4 validation gates pass (dependencies, syntax, tests, runtime)
- Git working tree is clean with all changes committed

The remaining 8 hours consist of human review, security patching, CI/CD integration, and production verification tasks — no development rework is required.

### Key Achievements
- Captured the `http.Server` instance from `app.listen()` to enable full lifecycle management
- Added `validateConfig()` with port range (1–65535) and host validation
- Implemented `server.on('error')` with friendly messages for EADDRINUSE and EACCES
- Built `gracefulShutdown()` with connection draining, force-exit timeout, and duplicate signal guard
- Registered `uncaughtException` and `unhandledRejection` process-level handlers
- Created 417-line test suite with 16 tests covering all 5 root causes
- Exported server instance via `module.exports` for integration testing

### Critical Issues
- **npm audit**: 1 high-severity vulnerability in `qs` package (pre-existing, not introduced by this change) — fixable via `npm audit fix`

---

## 2. Validation Results Summary

### Gate 1: Dependencies ✅
- `npm install` completed successfully — 362 packages audited
- Runtime: express@5.1.0 | Dev: jest@30.1.3 (satisfies ^30.1.3)

### Gate 2: Compilation / Syntax ✅
All 6 JavaScript files pass `node --check` syntax validation:
| File | Status |
|------|--------|
| `server.js` | ✅ OK |
| `src/app.js` | ✅ OK |
| `src/config/index.js` | ✅ OK |
| `src/routes/index.js` | ✅ OK |
| `src/routes/main.routes.js` | ✅ OK |
| `__tests__/server.test.js` | ✅ OK |

### Gate 3: Tests ✅ — 16/16 (100%)
```
PASS __tests__/server.test.js (2.28s)
  Configuration Validation
    ✓ rejects port above 65535 with a RangeError
    ✓ rejects negative port with a RangeError
    ✓ defaults to port 3000 when PORT is non-numeric string
    ✓ starts successfully with a valid port
  Server Error Handling
    ✓ reports EADDRINUSE and exits with code 1 when port is occupied
  HTTP Request Processing
    ✓ GET / returns 200 with "Hello, World!\n"
    ✓ GET /evening returns 200 with "Good evening"
    ✓ GET /nonexistent returns 404
    ✓ handles multiple concurrent requests without errors
  Graceful Shutdown
    ✓ SIGTERM triggers graceful shutdown with exit code 0
    ✓ SIGINT triggers graceful shutdown with exit code 0
    ✓ shutdown logs contain graceful shutdown message
    ✓ shutdown logs indicate HTTP server was closed
    ✓ duplicate SIGTERM signals do not cause crash
    ✓ port is freed after graceful shutdown
  Module Exports
    ✓ server.js exports an object with close and address methods

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

### Gate 4: Runtime Validation ✅
| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| Server start (PORT=3456) | "Server running at..." | ✅ Confirmed | Pass |
| GET / | 200 "Hello, World!\n" | ✅ Confirmed | Pass |
| GET /evening | 200 "Good evening" | ✅ Confirmed | Pass |
| GET /nonexistent | 404 | ✅ Confirmed | Pass |
| SIGTERM | Graceful shutdown, exit 0 | ✅ Confirmed | Pass |
| PORT=99999 | RangeError with clear message, exit 1 | ✅ Confirmed | Pass |
| EADDRINUSE | Friendly "already in use" message, exit 1 | ✅ Confirmed | Pass |

### Fixes Applied During Validation
- Synchronized package-lock.json with package.json jest version spec
- Refined test suite for CI reliability (2 iterations)
- All fixes are committed — git working tree is clean

---

## 3. Project Hours Breakdown

### Completed Hours Calculation (19h)

| Component | Hours | Details |
|-----------|-------|---------|
| Research & root cause analysis | 3h | 5 root causes identified, web research, diagnostic execution on 6 source files |
| server.js — Config validation | 1.5h | `validateConfig()` with port range and host checks (lines 39–73) |
| server.js — Shutdown config | 0.5h | `SHUTDOWN_TIMEOUT_MS` constant, `isShuttingDown` guard flag (lines 75–93) |
| server.js — Server init modification | 0.5h | `const server = app.listen(...)` capture (lines 95–111) |
| server.js — Error handling | 1.5h | `server.on('error')` with EADDRINUSE/EACCES switch (lines 113–150) |
| server.js — Graceful shutdown | 2h | `gracefulShutdown()` + SIGTERM/SIGINT handlers (lines 152–200) |
| server.js — Process error handlers | 1h | `uncaughtException` + `unhandledRejection` (lines 202–232) |
| server.js — Module export | 0.25h | `module.exports = server` (lines 234–243) |
| Test helpers | 1.5h | `forkServer`, `waitForListening`, `httpGet`, `httpRequest`, `getFreePort` |
| Test suite — 16 tests | 4.25h | Config validation (4), error handling (1), HTTP (4), shutdown (6), exports (1) |
| package.json configuration | 0.5h | jest devDependency, test script |
| Debug, validation & iteration | 2h | 6 commits, package-lock sync, CI test refinement |
| **Total Completed** | **19h** | |

### Remaining Hours Calculation (8h)

| Task | Hours | Rationale |
|------|-------|-----------|
| Code review and PR approval | 1.5h | Human review of 611 net new lines across server.js and test suite |
| npm audit fix (qs vulnerability) | 1h | High-severity qs DoS vulnerability; test regression after update |
| CI/CD pipeline test integration | 2h | Configure `npm test` in CI pipeline, verify Jest runs in CI environment |
| README documentation update | 1h | Document graceful shutdown behavior, signal handling, new test commands |
| Production/staging verification | 1.5h | Deploy to staging, verify SIGTERM from process manager, test under load |
| EACCES privileged port testing | 1h | Test on ports < 1024 (requires root); verify error message and exit code |
| **Total Remaining** | **8h** | |

### Completion Calculation
- **Completed**: 19 hours
- **Remaining**: 8 hours
- **Total Project**: 27 hours
- **Completion**: 19 / 27 = **70%**

```mermaid
pie title Project Hours Breakdown
    "Completed Work" : 19
    "Remaining Work" : 8
```

---

## 4. Detailed Remaining Task Table

| # | Task | Description | Action Steps | Priority | Severity | Hours |
|---|------|-------------|--------------|----------|----------|-------|
| 1 | Code review and PR approval | Human developer reviews all changes to server.js and __tests__/server.test.js | 1. Review 194 new lines in server.js for correctness and style. 2. Review 417 lines in test suite for coverage adequacy. 3. Verify package.json changes. 4. Approve and merge PR. | High | Medium | 1.5 |
| 2 | Fix npm audit vulnerability (qs) | High-severity DoS vulnerability in qs <6.14.1 (transitive dependency via Express) | 1. Run `npm audit fix` to update qs. 2. Run `CI=true npx jest --verbose --forceExit --testTimeout=30000` to confirm no regressions. 3. Verify `npm audit` shows 0 vulnerabilities. 4. Commit updated package-lock.json. | High | High | 1.0 |
| 3 | CI/CD pipeline test integration | Configure automated test execution in CI/CD pipeline | 1. Add `npm test` step to CI configuration (GitHub Actions / Jenkins / etc.). 2. Ensure `CI=true` environment variable is set. 3. Verify Jest runs with `--watchAll=false` in CI. 4. Configure test result reporting. | Medium | Medium | 2.0 |
| 4 | Update README with shutdown documentation | Document new graceful shutdown behavior and signal handling for operators | 1. Add "Graceful Shutdown" section to README.md. 2. Document SIGTERM/SIGINT behavior. 3. Document configuration validation rules. 4. Add testing instructions with `npm test` command. | Medium | Low | 1.0 |
| 5 | Production/staging environment verification | Validate bug fix behavior in production-like environment | 1. Deploy to staging environment. 2. Test SIGTERM from process manager (PM2/Docker/K8s). 3. Verify connection draining under moderate load. 4. Confirm clean port release after shutdown. | Medium | Medium | 1.5 |
| 6 | EACCES privileged port edge case testing | Test error handling for ports requiring elevated privileges | 1. Attempt `PORT=80 node server.js` without root. 2. Verify friendly "requires elevated privileges" message appears. 3. Confirm exit code 1. 4. Document results. | Low | Low | 1.0 |
| | **Total Remaining Hours** | | | | | **8.0** |

---

## 5. Development Guide

### 5.1 System Prerequisites

| Requirement | Version | Verification Command |
|-------------|---------|---------------------|
| Node.js | 20.x LTS (tested on 20.20.0) | `node --version` |
| npm | 10.x+ (tested on 11.1.0) | `npm --version` |
| OS | Linux / macOS / Windows | N/A |

### 5.2 Environment Setup

```bash
# Clone the repository and switch to the feature branch
git clone <repository-url>
cd <repository-name>
git checkout blitzy-fb182b3b-c744-472d-b152-cff613dcbb9f
```

**Environment Variables** (all optional — sensible defaults provided):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | TCP port to bind (must be 1–65535) |
| `HOST` | `127.0.0.1` | Network interface to bind |
| `NODE_ENV` | `development` | Application environment |

### 5.3 Dependency Installation

```bash
# Install all dependencies (runtime + dev)
npm install
```

**Expected output**: 362 packages installed, 0 errors.

**Verification**:
```bash
# Verify Express version
node -e "console.log('Express:', require('express/package.json').version)"
# Expected: Express: 5.1.0

# Verify Jest version
npx jest --version
# Expected: 30.1.3
```

### 5.4 Running Tests

```bash
# Run the full test suite (16 tests)
CI=true npx jest --verbose --forceExit --testTimeout=30000
```

**Expected output**: `Test Suites: 1 passed, 1 total — Tests: 16 passed, 16 total`

**Alternative** (uses package.json test script):
```bash
CI=true npm test
```

### 5.5 Application Startup

```bash
# Start with defaults (port 3000, host 127.0.0.1)
npm start

# Start with custom port
PORT=8080 node server.js

# Start with custom host and port
HOST=0.0.0.0 PORT=8080 node server.js
```

**Expected output**: `Server running at http://127.0.0.1:3000/` (or custom host:port)

### 5.6 Verification Steps

```bash
# In a separate terminal, verify HTTP responses:

# Test root endpoint
curl -s http://127.0.0.1:3000/
# Expected: Hello, World!

# Test evening endpoint
curl -s http://127.0.0.1:3000/evening
# Expected: Good evening

# Test 404 handling
curl -sw "\nStatus: %{http_code}" http://127.0.0.1:3000/nonexistent
# Expected: Status: 404
```

### 5.7 Testing Bug Fix Scenarios

```bash
# Test graceful shutdown (send SIGTERM)
node server.js &
SERVER_PID=$!
sleep 1
kill -SIGTERM $SERVER_PID
# Expected: "Received SIGTERM. Starting graceful shutdown..." followed by "HTTP server closed successfully."

# Test invalid port validation
PORT=99999 node server.js
# Expected: RangeError: Invalid port: 99999. Port must be an integer between 1 and 65535.
# Exit code: 1

# Test EADDRINUSE detection
PORT=3456 node server.js &
sleep 1
PORT=3456 node server.js
# Expected: Error: Port 3456 is already in use. Please choose a different port or stop the other process.
# Exit code: 1
kill %1 2>/dev/null
```

### 5.8 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` on test run | Port 3000 occupied by another process | Kill the process using port 3000: `lsof -ti:3000 \| xargs kill` |
| Jest "Force exiting" warning | Open server handles after tests | Normal behavior — `--forceExit` flag handles this safely |
| `npm audit` high vulnerability | Pre-existing qs DoS issue | Run `npm audit fix` to update qs |
| Tests timeout | Slow CI environment | Increase timeout: `--testTimeout=60000` |

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Force-exit timer (10s) may be too short under heavy load | Medium | Low | Make `SHUTDOWN_TIMEOUT_MS` configurable via environment variable for production tuning |
| `uncaughtException` handler calls `gracefulShutdown()` which may fail if server is in bad state | Low | Low | The force-exit timeout provides a safety net; Node.js docs advise against recovery after uncaught exceptions |
| Jest `--forceExit` flag masks potential open handle leaks in tests | Low | Low | Run with `--detectOpenHandles` periodically to identify leaks |

### 6.2 Security Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| High-severity `qs` DoS vulnerability (GHSA-6rw7-vpxm-498p) | High | Medium | Run `npm audit fix` immediately — this is a pre-existing issue, not introduced by this change |
| No rate limiting on HTTP endpoints | Medium | Medium | Outside bug fix scope — consider adding rate limiting middleware for production |

### 6.3 Operational Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| No health check endpoint for load balancers | Medium | Medium | Outside bug fix scope — consider adding `GET /health` for production readiness |
| No structured logging (console.log/error only) | Low | Low | Outside bug fix scope — consider Winston/Pino for production observability |
| EACCES error path not tested in CI (requires privileged ports) | Low | Low | Manual testing required on staging with ports < 1024 |

### 6.4 Integration Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Process manager (PM2/Docker/K8s) may send SIGKILL before graceful shutdown completes | Medium | Medium | Configure process manager's kill timeout to exceed `SHUTDOWN_TIMEOUT_MS` (10s) |
| `module.exports = server` may affect existing `require()` consumers if any exist | Low | Low | Original file had no exports; this is additive and backward-compatible |

---

## 7. Git Change Summary

| Metric | Value |
|--------|-------|
| Branch | `blitzy-fb182b3b-c744-472d-b152-cff613dcbb9f` |
| Commits | 6 |
| Files changed | 4 (server.js, __tests__/server.test.js, package.json, package-lock.json) |
| Lines added | 615 |
| Lines removed | 4 |
| Net new lines | 611 |
| Working tree | Clean (all changes committed) |

### Files Modified

| File | Change | Lines | Description |
|------|--------|-------|-------------|
| `server.js` | UPDATED | 52 → 243 (+194, -3) | Added 7 new sections: config validation, shutdown config, server capture, error handling, graceful shutdown, process handlers, module export |
| `__tests__/server.test.js` | CREATED | 417 | Comprehensive Jest test suite with 16 tests covering all 5 root causes |
| `package.json` | UPDATED | +4, -1 | Added jest devDependency, updated test script |
| `package-lock.json` | UPDATED | +4808, -459 | Synced lockfile with jest dependency tree |

### Unchanged Files (verified no modifications)
- `src/app.js` — Express app factory (correct, no changes needed)
- `src/config/index.js` — Twelve-Factor configuration module (correct, no changes needed)
- `src/routes/index.js` — Route barrel export (correct, no changes needed)
- `src/routes/main.routes.js` — GET / and GET /evening handlers (correct, no changes needed)
