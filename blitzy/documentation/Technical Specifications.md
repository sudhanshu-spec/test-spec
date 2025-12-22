# Technical Specification

# 0. Agent Action Plan

## 0.1 Executive Summary

Based on the bug description, the Blitzy platform understands that the bug is a collection of critical reliability and robustness deficiencies in `server.js` that could lead to application crashes, resource leaks, and ungraceful termination.

**Technical Failure Description:**
The original `server.js` implementation lacked essential production-ready features:

| Issue | Technical Classification | Impact |
|-------|-------------------------|--------|
| Missing error handling on `app.listen()` | Unhandled exception risk | Application crash on EADDRINUSE, EACCES |
| No graceful shutdown handling | Resource leak / connection drop | Abrupt termination, orphaned connections |
| No input validation | Configuration error | Server may fail silently or bind to invalid address |
| No resource cleanup | Memory/port leak | Port remains bound after crash |
| Server reference not saved | Cannot close server programmatically | Unable to implement graceful shutdown |
| No process-level error handlers | Unhandled exception/rejection crash | Application terminates without logging |

**Reproduction Steps (Executable Commands):**

```bash
# 1. Start the server
node server.js

##### 2. In another terminal, start a second instance (EADDRINUSE error)
node server.js  # Should crash without meaningful error message

##### 3. Press Ctrl+C (SIGINT)
#### Server should gracefully shut down but originally abruptly terminates
```

**Specific Error Types Identified:**
- EADDRINUSE: Port already in use - no handling
- EACCES: Permission denied for privileged ports - no handling
- EADDRNOTAVAIL: Invalid host address - no handling
- uncaughtException: Process-level exceptions - no handler
- unhandledRejection: Promise rejections - no handler
- SIGTERM/SIGINT: Termination signals - no graceful shutdown

## 0.2 Root Cause Identification

Based on comprehensive repository analysis and web research, **THE root causes** are:

#### Root Cause 1: Missing Server Error Handler
- **Located in:** `server.js` (entire file - no error event listener)
- **Triggered by:** Network errors during `app.listen()` such as EADDRINUSE, EACCES, EADDRNOTAVAIL
- **Evidence:** The original code `app.listen(config.port, config.host, ...)` did not attach any `.on('error', ...)` handler
- **Technical reasoning:** Express 5.x has different error behavior where the listen callback is called even when binding fails, requiring explicit error handler attachment

#### Root Cause 2: No Graceful Shutdown Implementation
- **Located in:** `server.js` (no signal handlers present)
- **Triggered by:** Process termination signals (SIGTERM from PM2/Docker/Kubernetes, SIGINT from Ctrl+C)
- **Evidence:** `grep -rn "SIGTERM\|SIGINT" . --include="*.js"` returned no results in source files
- **Technical reasoning:** Without graceful shutdown, active HTTP connections are abruptly terminated, and the port may not be properly released

#### Root Cause 3: Server Reference Not Stored
- **Located in:** `server.js` - original code: `app.listen(config.port, config.host, () => {...})`
- **Triggered by:** Any need to close the server programmatically
- **Evidence:** No variable assignment to capture the return value of `app.listen()`
- **Technical reasoning:** `app.listen()` returns an `http.Server` instance required for `server.close()` to gracefully stop accepting connections

#### Root Cause 4: No Configuration Validation
- **Located in:** `server.js` (no validation before server start)
- **Triggered by:** Invalid environment variables (e.g., PORT=99999, PORT=-1, PORT=invalid)
- **Evidence:** The config module defaults invalid values, but no explicit validation catches edge cases like port > 65535
- **Technical reasoning:** Attempting to bind to invalid port/host causes cryptic errors rather than clear validation messages

#### Root Cause 5: No Process-Level Error Handlers
- **Located in:** `server.js` (no uncaughtException/unhandledRejection handlers)
- **Triggered by:** Unhandled exceptions or promise rejections anywhere in the application
- **Evidence:** No `process.on('uncaughtException', ...)` or `process.on('unhandledRejection', ...)` handlers
- **Technical reasoning:** Without these handlers, the process terminates without proper logging or cleanup

**This conclusion is definitive because:** Web searches confirm these are standard requirements for production Express.js servers, as documented by the official Express.js documentation and PM2/Docker best practices. The repository analysis via grep confirmed the complete absence of all these patterns.

## 0.3 Diagnostic Execution

#### Code Examination Results

- **File analyzed:** `server.js`
- **Problematic code block:** Lines 1-67 (entire original file)
- **Specific failure point:** Line where `app.listen()` is called without error handling
- **Execution flow leading to bug:**
  1. Server starts with `node server.js`
  2. `app.listen()` attempts to bind to port
  3. If port in use → EADDRINUSE error thrown
  4. No error handler attached → Process crashes
  5. No cleanup occurs → Port may remain bound

#### Repository Analysis Findings

| Tool Used | Command Executed | Finding | File:Line |
|-----------|-----------------|---------|-----------|
| grep | `grep -rn "SIGTERM\|SIGINT" . --include="*.js"` | No signal handlers found | N/A |
| grep | `grep -rn "\.on('error'" . --include="*.js"` | No server error handlers in src | N/A |
| grep | `grep -rn "process.on" . --include="*.js"` | No process event handlers | N/A |
| cat | `cat server.js` | Server ref not stored | server.js:all |
| cat | `cat src/config/index.js` | Config uses fallbacks | src/config/index.js:15-30 |
| bash | `node server.js & node server.js` | EADDRINUSE crashes process | N/A |

#### Web Search Findings

**Search Queries:**
- "Express.js 5 graceful shutdown best practices"
- "Express.js app.listen error handling callback"
- "Node.js server.on error EADDRINUSE handling"

**Web Sources Referenced:**
- expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
- pm2.io/docs/runtime/best-practices/graceful-shutdown/
- betterstack.com/community/guides/scaling-nodejs/error-handling-express/
- GitHub Issue #6191: Express 5 app.listen() behavior change

**Key Findings:**
- Express 5 has different error behavior than Express 4 for listen errors
- Graceful shutdown requires: storing server reference, handling SIGTERM/SIGINT, calling server.close()
- PM2/Docker/Kubernetes send SIGTERM for graceful shutdown
- Process-level handlers needed for uncaughtException and unhandledRejection

#### Fix Verification Analysis

**Steps followed to reproduce bug:**
1. Started server with `node server.js`
2. Started second instance → Verified EADDRINUSE handling
3. Sent SIGINT (Ctrl+C) → Verified graceful shutdown
4. Tested invalid port (99999) → Verified validation
5. Tested negative port (-1) → Verified validation

**Confirmation tests used:**
- 9 unit tests in `test/server.test.js`
- All tests passing

**Boundary conditions and edge cases covered:**
- Port 0 (OS-assigned port)
- Port 65535 (max valid port)
- Port 99999 (invalid, > 65535)
- Port -1 (invalid, negative)
- Non-numeric port string
- Empty host (defaults to 127.0.0.1)
- Multiple SIGINT signals (prevented duplicate shutdown)

**Verification successful, confidence level: 95%**

## 0.4 Bug Fix Specification

#### The Definitive Fix

**Files to modify:** `server.js`

**This fixes the root causes by:**
- Storing server reference for programmatic shutdown
- Attaching `.on('error', handleServerError)` for EADDRINUSE/EACCES/EADDRNOTAVAIL handling
- Adding SIGTERM/SIGINT handlers for graceful shutdown
- Adding process-level error handlers for uncaughtException/unhandledRejection
- Adding configuration validation before server start
- Implementing forced exit timeout for hung shutdown

#### Change Instructions

**DELETE** the minimal original implementation and **REPLACE** with comprehensive server module.

**Key additions:**

1. **Server reference storage:**
```javascript
let server = null;
// ... in startServer():
server = app.listen(config.port, config.host, () => {...});
```

2. **Server error handler:**
```javascript
server.on('error', handleServerError);
// Handles EADDRINUSE, EACCES, EADDRNOTAVAIL
```

3. **Graceful shutdown function:**
```javascript
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  server.close((err) => {
    process.exit(err ? 1 : 0);
  });
}
```

4. **Signal handlers:**
```javascript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

5. **Process-level error handlers:**
```javascript
process.on('uncaughtException', (err) => {...});
process.on('unhandledRejection', (reason) => {...});
```

6. **Configuration validation:**
```javascript
function validateConfig() {
  // Validates port range 0-65535 and host non-empty
}
```

#### Fix Validation

**Test command to verify fix:**
```bash
cd /tmp/blitzy/test-spec/1 && npm test
```

**Expected output after fix:**
```
Results: 9 passed, 0 failed
```

**Confirmation methods:**
- Run `node server.js`, press Ctrl+C → Should log "SIGINT received" and "graceful shutdown"
- Start two servers on same port → Second should show "Port already in use" and exit cleanly
- Set PORT=99999 → Should show "Invalid port number" and exit with code 1

## 0.5 Scope Boundaries

#### Changes Required (EXHAUSTIVE LIST)

| File | Lines | Specific Change |
|------|-------|-----------------|
| `server.js` | 1-260 | Complete rewrite with error handling, graceful shutdown, validation |
| `test/server.test.js` | 1-270 | New file - comprehensive unit tests for all features |
| `package.json` | scripts.test | Updated from "no test specified" to "node test/server.test.js" |

**No other files require modification.**

#### Explicitly Excluded

**Do not modify:**
- `src/app.js` - Express app configuration works correctly
- `src/config/index.js` - Configuration module works correctly (defaults invalid values)
- `src/routes/index.js` - Route handlers work correctly
- `src/routes/evening.js` - Route handlers work correctly
- `node_modules/*` - Third-party dependencies

**Do not refactor:**
- Config module's fallback behavior (intentional design for resilience)
- Route handler implementations (out of scope)
- Express middleware chain (working correctly)

**Do not add:**
- Health check endpoints (separate feature)
- Metrics/monitoring integration (separate feature)
- Load balancer integration (separate feature)
- Database connection management (not used in this project)
- Logging framework integration (uses console, sufficient for scope)

## 0.6 Verification Protocol

#### Bug Elimination Confirmation

**Execute test suite:**
```bash
cd /tmp/blitzy/test-spec/1 && npm test
```

**Verify output matches:**
```
Results: 9 passed, 0 failed
```

**Confirm error no longer appears in:**
- Console output during SIGTERM/SIGINT
- Server startup with occupied port
- Invalid configuration values

**Validate functionality with:**

| Test Scenario | Command | Expected Result |
|--------------|---------|-----------------|
| Normal startup | `node server.js` | "Server running at http://127.0.0.1:3000/" |
| HTTP GET / | `curl http://127.0.0.1:3000/` | "Hello, World!" |
| HTTP GET /evening | `curl http://127.0.0.1:3000/evening` | "Good evening" |
| SIGINT shutdown | Press Ctrl+C | "SIGINT received...graceful shutdown...exit 0" |
| SIGTERM shutdown | `kill -TERM <pid>` | "SIGTERM received...graceful shutdown...exit 0" |
| Port conflict | Start 2 servers | "Port already in use...exit 1" |
| Invalid port | `PORT=99999 node server.js` | "Invalid port number...exit 1" |
| Negative port | `PORT=-1 node server.js` | "Invalid port number...exit 1" |

#### Regression Check

**Run existing test suite:**
```bash
npm test
```

**Verify unchanged behavior in:**
- `/` endpoint returns "Hello, World!" with status 200
- `/evening` endpoint returns "Good evening" with status 200
- Server binds to configured HOST and PORT
- Application logs startup messages correctly

**Confirm performance metrics:**
- Server startup time: < 1 second
- Graceful shutdown time: < 5 seconds
- HTTP response time: < 100ms

## 0.7 Execution Requirements

#### Research Completeness Checklist

- ✓ Repository structure fully mapped
  - `server.js` - Entry point (modified)
  - `src/app.js` - Express app configuration
  - `src/config/index.js` - Configuration management
  - `src/routes/` - Route handlers
- ✓ All related files examined with retrieval tools
  - Analyzed server.js, app.js, config/index.js, package.json
- ✓ Bash analysis completed for patterns/dependencies
  - Searched for SIGTERM/SIGINT handlers (none found)
  - Searched for error handlers (none in source)
  - Searched for process event handlers (none found)
- ✓ Root cause definitively identified with evidence
  - 5 root causes identified with specific technical reasoning
- ✓ Single solution determined and validated
  - Comprehensive server.js rewrite with all features
  - 9 tests all passing

#### Fix Implementation Rules

**Applied rules:**
- Made the exact specified changes only
- Zero modifications outside the bug fix scope
- No interpretation or improvement of working code
- Preserved all whitespace and formatting conventions
- Used 'use strict' as per existing codebase pattern
- Maintained JSDoc comment style for consistency
- Kept console.log for output (matches existing pattern)

**Compatibility verification:**
- Node.js 18.x-20.x (verified with v20.19.6)
- Express 5.1.0 (verified compatibility with error handling)
- No new dependencies added

**Code quality:**
- All functions documented with JSDoc comments
- Clear separation of concerns (validation, error handling, shutdown)
- Consistent naming conventions (camelCase for functions)
- Error messages provide actionable guidance

