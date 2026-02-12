# Technical Specification

# 0. Agent Action Plan

## 0.1 Executive Summary

Based on the bug description, the Blitzy platform understands that the bug is a set of critical reliability deficiencies in `server.js` — the HTTP server entry point — where the application starts listening on a network port without capturing the server instance, without registering an error handler for bind-time failures, without implementing graceful shutdown for process termination signals, without validating configuration inputs, and without exporting the server reference for external control.

The specific technical failures are:

- **Missing error handling**: The return value of `app.listen()` (the `http.Server` instance) is discarded at line 49 of the original `server.js`. Without a captured reference, `server.on('error', handler)` cannot be registered. Consequently, an `EADDRINUSE` error (port already occupied) propagates as an unhandled `'error'` event on the server's `EventEmitter`, crashing the Node.js process with an uncaught exception. The same applies to `EACCES` errors when binding to privileged ports.
- **No graceful shutdown**: No `process.on('SIGTERM')` or `process.on('SIGINT')` handlers exist. When a process manager (PM2, Docker, Kubernetes) sends `SIGTERM`, or a developer presses Ctrl+C, all active HTTP connections are terminated instantly without allowing in-flight requests to complete. This causes data loss and broken responses.
- **No input validation**: The `port` and `host` values from `src/config/index.js` are passed directly to `app.listen()` without validation. While the config module provides sensible defaults via `parseInt(process.env.PORT, 10) || 3000`, edge cases like `PORT=-1` or `PORT=99999` bypass the fallback and produce invalid bind attempts.
- **No server export**: `server.js` does not export the server instance via `module.exports`, preventing external tooling, integration tests, and process managers from programmatically controlling the server lifecycle.
- **Vacuous test coverage**: The existing lifecycle tests in `tests/lifecycle/server.test.js` (lines 149–203) were designed to verify error handling and graceful shutdown, but pass vacuously — the EADDRINUSE test at line 192 uses an `if (errorHandler)` guard that silently skips verification because `server.js` never registers the handler the test expects to capture.

The error classification is: **logic error** (missing implementation of expected server lifecycle behaviors documented in the technical specification).

Reproduction steps:

- Start the server with an occupied port: `PORT=3000 node server.js & PORT=3000 node server.js` — the second instance crashes with an unhandled `EADDRINUSE` exception instead of logging a diagnostic message.
- Send SIGTERM to a running server: `kill -15 <pid>` — active connections are dropped immediately instead of draining.
- Start with an invalid port: `PORT=-1 node server.js` — Node.js receives an invalid port value instead of a clear validation error.


## 0.2 Root Cause Identification

Based on research, the root causes are five distinct but interrelated implementation omissions in `server.js`:

**Root Cause 1 — Discarded Server Instance Reference**

- Located in: `server.js`, line 49
- Triggered by: `app.listen(config.port, config.host, () => { ... })` — the return value (an `http.Server` instance) is not assigned to any variable
- Evidence: `grep -n "const server\|let server\|var server\|= app.listen" server.js` returns zero matches; the call is a bare expression statement
- This conclusion is definitive because: Without a reference to the server object, it is impossible to call `.on('error')`, `.close()`, or export the instance — all subsequent root causes stem from this omission

**Root Cause 2 — Missing `server.on('error')` Handler**

- Located in: `server.js`, after line 49 (missing code)
- Triggered by: Any bind-time error (EADDRINUSE, EACCES) causes the server's `EventEmitter` to emit an `'error'` event with no listener, which Node.js treats as an uncaught exception and terminates the process
- Evidence: `grep -n "on(" server.js` returns only the JSDoc comment at line 2; no `.on('error')` registration exists. The tech spec section 4.4.2 explicitly documents that this handler should exist and absorb EADDRINUSE errors without re-throwing
- This conclusion is definitive because: The existing lifecycle test at `tests/lifecycle/server.test.js:161-203` was designed to test this handler but its `if (errorHandler)` guard at line 192 never executes — `errorHandler` stays `null` because `server.js` never calls `server.on('error', handler)`

**Root Cause 3 — Missing Graceful Shutdown Handlers**

- Located in: `server.js` (missing code — no `process.on('SIGTERM')` or `process.on('SIGINT')` anywhere)
- Triggered by: Process termination signals sent by Docker/Kubernetes (`SIGTERM`) or developer Ctrl+C (`SIGINT`)
- Evidence: `grep -rn "SIGTERM\|SIGINT\|process.on\|shutdown\|graceful" server.js src/` returns zero matches in `server.js`
- This conclusion is definitive because: Without signal handlers, Node.js default behavior is to terminate immediately, destroying all active TCP connections without allowing the HTTP server to drain

**Root Cause 4 — Missing Configuration Input Validation**

- Located in: `server.js`, between config loading (line 37) and `app.listen()` (line 49) — no validation exists
- Triggered by: Environment variables like `PORT=-1`, `PORT=99999`, or `HOST=""` that pass through `src/config/index.js` parsing but produce invalid network bind parameters
- Evidence: `grep -rn "valid\|isNaN\|range\|check" server.js src/` returns zero matches in `server.js`; `src/config/index.js` uses `parseInt(process.env.PORT, 10) || 3000` which correctly handles NaN via the `||` fallback but passes through negative numbers and values above 65535
- This conclusion is definitive because: `parseInt('-1', 10)` returns `-1` (truthy, not caught by `|| 3000`) and `parseInt('99999', 10)` returns `99999` (truthy, not caught) — both are invalid TCP port numbers

**Root Cause 5 — Missing Module Export**

- Located in: `server.js`, end of file (missing `module.exports`)
- Triggered by: Any external code attempting to `require('./server')` to access the server instance for programmatic control
- Evidence: `grep -n "module.exports\|exports\." server.js` returns zero matches
- This conclusion is definitive because: Without `module.exports = server`, the `require()` call returns an empty object `{}`, making it impossible for integration tests or process managers to call `server.close()`


## 0.3 Diagnostic Execution

### 0.3.1 Code Examination Results

- File analyzed: `server.js` (relative to repository root)
- Problematic code block: lines 49–52 (entire Server Initialization section)
- Specific failure point: line 49 — bare `app.listen()` call without variable assignment
- Execution flow leading to bug:
  - Step 1: `server.js` loads `src/app` (Express app) and `src/config` (port/host/env)
  - Step 2: `app.listen(config.port, config.host, callback)` binds the server — the returned `http.Server` instance is discarded
  - Step 3: If port is occupied, the server emits an `'error'` event; with no listener, Node.js throws `Error: listen EADDRINUSE` and crashes
  - Step 4: If SIGTERM/SIGINT arrives, the process terminates immediately — no `server.close()` is ever called because no server reference exists
  - Step 5: The module exports nothing (`module.exports` defaults to `{}`), blocking external lifecycle control

- File analyzed: `tests/lifecycle/server.test.js` (relative to repository root)
- Problematic code block: lines 161–203 (EADDRINUSE test)
- Specific failure point: line 192 — `if (errorHandler)` guard evaluates to `false` because `server.js` never registers an error handler
- Execution flow leading to vacuous test:
  - Step 1: Test creates `errorMockServer` with a custom `.on()` that captures handlers
  - Step 2: `require('../../server')` executes — `app.listen()` is called (mocked), returning `errorMockServer`
  - Step 3: Since `server.js` never calls `server.on('error', ...)`, the test's `errorHandler` variable remains `null`
  - Step 4: The `if (errorHandler)` block at line 192 is skipped entirely — the assertion at line 193 never runs
  - Step 5: The test passes because no assertion actually fails — this is a **vacuously true** result

### 0.3.2 Repository Analysis Findings

| Tool Used | Command Executed | Finding | File:Line |
|-----------|-----------------|---------|-----------|
| grep | `grep -n "error\|Error\|catch\|try\|throw\|on(" server.js` | Only JSDoc comment at line 2 matched; zero error-handling code | `server.js:2` |
| grep | `grep -rn "SIGTERM\|SIGINT\|process.on\|shutdown\|graceful" server.js src/` | Zero matches in `server.js`; only README references in config | `src/config/README.md:17-18` |
| grep | `grep -rn "valid\|isNaN\|range\|check" server.js src/` | Zero matches in `server.js` | N/A |
| grep | `grep -n "module.exports\|exports\." server.js` | Zero matches — no module export | N/A |
| grep | `grep -n "const server\|let server\|var server\|= app.listen" server.js` | Zero matches — server reference not captured | N/A |
| sed | `sed -n '161,203p' tests/lifecycle/server.test.js` | EADDRINUSE test has conditional guard at line 192 that skips assertion when handler is null | `tests/lifecycle/server.test.js:192` |
| sed | `sed -n '149,159p' tests/lifecycle/server.test.js` | Graceful shutdown test verifies mock interface, not application behavior | `tests/lifecycle/server.test.js:149-159` |
| bash | `CI=true npx jest --verbose --coverage` | 41 tests pass, 100% coverage — but server.js lifecycle tests are vacuously true | `server.js:49` |

### 0.3.3 Web Search Findings

- Search queries: "Express.js 5 server error handling graceful shutdown best practices", "Node.js server EADDRINUSE error handling app.listen"
- Web sources referenced:
  - Express.js official documentation (`expressjs.com/en/advanced/healthcheck-graceful-shutdown.html`) — confirms graceful shutdown pattern using `server.close()` with SIGTERM/SIGINT handlers
  - Lagoon Documentation (`docs.lagoon.sh/using-lagoon-advanced/nodejs/`) — documents that Node.js does not handle shutdown gracefully out of the box and demonstrates the `process.on('SIGTERM', () => server.close())` pattern
  - OneUptime blog (`oneuptime.com/blog/post/2026-01-25-fix-eaddrinuse-nodejs`) — demonstrates `server.on('error', handler)` pattern for catching EADDRINUSE with code-specific branching
  - PM2 documentation (`pm2.io/docs/runtime/best-practices/graceful-shutdown/`) — documents SIGINT interception and `server.close()` pattern with database cleanup
- Key findings incorporated:
  - The `app.listen()` return value must be captured as the `http.Server` instance
  - `server.on('error', handler)` must be registered immediately after `listen()` to catch bind-time errors
  - Both `SIGTERM` and `SIGINT` must be handled for production and development parity
  - A forced-shutdown timeout (typically 5–10 seconds) with `.unref()` prevents indefinite hangs
  - `server.close()` stops accepting new connections and waits for in-flight requests to complete

### 0.3.4 Fix Verification Analysis

- Steps followed to reproduce bug:
  - Examined `server.js` source code and confirmed all five root causes via `grep` commands
  - Ran existing test suite (41 tests) — all passed, confirming vacuous test behavior
  - Analyzed `tests/lifecycle/server.test.js` lines 161–203 to confirm the `if (errorHandler)` guard skips verification
- Confirmation tests used to ensure the bug was fixed:
  - Ran the full test suite after applying fixes: 55 tests (14 new), all passing
  - The EADDRINUSE test at line 192 now captures the error handler (no longer `null`) and actually verifies it does not throw
  - New tests cover EACCES handling, generic errors, port validation boundaries, host validation, SIGTERM/SIGINT shutdown, forced timeout, and module export
- Boundary conditions and edge cases covered:
  - Port boundaries: 1 (minimum valid), 65535 (maximum valid), -1 (below range), 99999 (above range), NaN (non-numeric)
  - Host validation: empty string
  - Graceful shutdown: normal close (callback fires), hanging close (5-second timeout triggers forced exit)
  - Error handler: EADDRINUSE, EACCES, and unknown error codes
- Whether verification was successful: **Yes** — confidence level **98%**. The remaining 2% accounts for platform-specific signal handling behavior that cannot be fully simulated in a mocked test environment.


## 0.4 Bug Fix Specification

### 0.4.1 The Definitive Fix

**File to modify:** `server.js`

The fix addresses all five root causes through four targeted additions and one modification to the existing `server.js` file, plus 14 new test cases in `tests/lifecycle/server.test.js` for full verification coverage.

**Current implementation at line 49:**

```javascript
app.listen(config.port, config.host, () => {
```

**Required change at line 79 (renumbered after additions):**

```javascript
const server = app.listen(config.port, config.host, () => {
```

This fixes the root cause by capturing the `http.Server` instance returned by `app.listen()`, enabling all subsequent error handling, graceful shutdown, and export operations.

### 0.4.2 Change Instructions

**INSERTION 1 — Configuration Validation (after line 37, before Server Initialization)**

INSERT at line 39 (new lines 39–63): Port range validation (`1–65535`) and host non-empty string validation. Calls `process.exit(1)` with a diagnostic `console.error` message for invalid configurations, preventing `app.listen()` from receiving nonsensical bind parameters.

```javascript
// Port validation: guards against PORT=-1 or PORT=99999
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  console.error(`Invalid port number: ${config.port}. Must be an integer between 1 and 65535.`);
  process.exit(1);
}
```

**MODIFICATION 1 — Capture Server Instance (line 49)**

MODIFY line 49 from `app.listen(config.port, config.host, () => {` to `const server = app.listen(config.port, config.host, () => {` — assigns the `http.Server` return value to `server`.

**INSERTION 2 — Error Handler (after listen block)**

INSERT at line 98 (new lines 98–106): Registers `server.on('error', handler)` to catch `EADDRINUSE`, `EACCES`, and generic server errors. The handler absorbs the error gracefully via `console.error` without re-throwing, preventing process crashes.

```javascript
// Error handler: catches EADDRINUSE, EACCES, and generic errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use.`);
  }
});
```

**INSERTION 3 — Graceful Shutdown (after Error Handler)**

INSERT at line 125 (new lines 125–141): Defines `gracefulShutdown(signal)` function and registers `process.on('SIGTERM')` and `process.on('SIGINT')` handlers. The function calls `server.close()` to stop accepting new connections and drain in-flight requests, then `process.exit(0)`. A 5-second `setTimeout` with `.unref()` forces termination if draining hangs.

**INSERTION 4 — Module Export (end of file)**

INSERT at line 152: `module.exports = server;` — exports the `http.Server` instance for external programmatic control and test integration.

### 0.4.3 Fix Validation

- Test command to verify fix: `CI=true npx jest --verbose --coverage`
- Expected output after fix: 55 tests passing, 100% code coverage across all metrics (statements, branches, functions, lines)
- Confirmation method:
  - The EADDRINUSE test at `tests/lifecycle/server.test.js:192` now captures a non-null `errorHandler` and verifies it absorbs the error without throwing
  - New tests directly invoke SIGTERM/SIGINT handlers and verify `server.close()` is called followed by `process.exit(0)`
  - Forced timeout test uses `jest.useFakeTimers()` to advance past 5 seconds and verify `process.exit(1)` fires
  - Port boundary tests verify validation rejects -1, 99999, NaN and accepts 1, 65535

### 0.4.4 User Interface Design

Not applicable — no Figma screens or UI components were provided or affected by this fix. The changes are purely server-side lifecycle behavior in a backend Node.js application.


## 0.5 Scope Boundaries

### 0.5.1 Changes Required (Exhaustive List)

| File | Lines Modified | Specific Change |
|------|---------------|-----------------|
| `server.js` | Lines 39–63 (new) | Added configuration validation for port range (1–65535) and host non-empty string |
| `server.js` | Line 79 (modified) | Changed `app.listen(...)` to `const server = app.listen(...)` to capture server instance |
| `server.js` | Lines 84–106 (new) | Added `server.on('error', handler)` with EADDRINUSE, EACCES, and generic error branches |
| `server.js` | Lines 108–141 (new) | Added `gracefulShutdown()` function with SIGTERM/SIGINT handlers and 5-second forced timeout |
| `server.js` | Lines 143–152 (new) | Added `module.exports = server` to export the server instance |
| `tests/lifecycle/server.test.js` | Lines 97–114 (new) | Added signal handler cleanup in `beforeEach`/`afterEach` to prevent MaxListenersExceeded warning |
| `tests/lifecycle/server.test.js` | Lines 200–240 (new) | Added Error Handling describe block: error handler registration, EACCES, and generic error tests |
| `tests/lifecycle/server.test.js` | Lines 242–352 (new) | Added Configuration Validation describe block: negative port, port > 65535, NaN port, empty host, boundary port 1, boundary port 65535 |
| `tests/lifecycle/server.test.js` | Lines 354–467 (new) | Added Graceful Shutdown describe block: SIGTERM/SIGINT handler registration, graceful SIGTERM, graceful SIGINT, forced timeout on hanging close |
| `tests/lifecycle/server.test.js` | Lines 469–483 (new) | Added Module Export describe block: verify export returns server instance |

No other files require modification.

### 0.5.2 Explicitly Excluded

- **Do not modify:** `src/app.js` — the Express application factory is functioning correctly; routing and middleware are not affected
- **Do not modify:** `src/config/index.js` — the configuration module correctly handles `parseInt` fallback for PORT; the server-side validation is an additional safety net, not a replacement
- **Do not modify:** `src/routes/index.js` or `src/routes/main.routes.js` — route handlers are orthogonal to server lifecycle behavior
- **Do not modify:** `tests/integration/endpoints.test.js` — HTTP endpoint tests are unaffected by server lifecycle changes
- **Do not modify:** `tests/unit/config.test.js` or `tests/unit/routes.test.js` — unit tests for config and routes remain valid
- **Do not refactor:** The `src/config/index.js` `parseInt(process.env.PORT, 10) || 3000` pattern — while it could be improved to explicitly validate ranges, this is a separate enhancement beyond the current bug fix scope
- **Do not add:** Custom error pages, HTTP error middleware, health-check endpoints, or structured logging — these are out of scope for the targeted bug fix


## 0.6 Verification Protocol

### 0.6.1 Bug Elimination Confirmation

- Execute: `CI=true npx jest --verbose --coverage`
- Verify output matches:
  - `Tests: 55 passed, 55 total`
  - `Test Suites: 4 passed, 4 total`
  - Coverage report shows `100%` for statements, branches, functions, and lines across all files
- Confirm error no longer appears in: The EADDRINUSE lifecycle test at `tests/lifecycle/server.test.js` line 192 now enters the `if (errorHandler)` block (handler is no longer `null`) and executes the `expect(() => errorHandler(errnoException)).not.toThrow()` assertion, proving the error handler is registered and functional
- Validate functionality with: 14 new unit tests grouped into four describe blocks:
  - **Error Handling** (3 tests): Verifies error handler registration, EACCES absorption, and generic error absorption
  - **Configuration Validation** (6 tests): Verifies rejection of negative port, port above 65535, NaN port, empty host, and acceptance of boundary ports 1 and 65535
  - **Graceful Shutdown** (4 tests): Verifies SIGTERM/SIGINT handler registration, graceful shutdown on each signal, and forced timeout when `server.close()` hangs
  - **Module Export** (1 test): Verifies `require('./server')` returns the server instance

### 0.6.2 Regression Check

- Run existing test suite: `CI=true npx jest --verbose --coverage` — all original 41 tests continue to pass unchanged
- Verify unchanged behavior in:
  - **HTTP endpoint behavior**: All 14 integration tests in `tests/integration/endpoints.test.js` pass (GET `/`, GET `/evening`, 404 handling, edge cases)
  - **Configuration loading**: All 12 unit tests in `tests/unit/config.test.js` pass (defaults, custom values, edge cases, type checking)
  - **Route handler definitions**: All 7 unit tests in `tests/unit/routes.test.js` pass (router export, handler definitions, path ordering)
  - **Original lifecycle tests**: All 5 original tests in `tests/lifecycle/server.test.js` pass (host/port binding, startup message, custom config, graceful shutdown mock, EADDRINUSE)
- Confirm performance metrics: Test suite completes in approximately 1.1 seconds with zero warnings, no degradation from the baseline
- No breaking changes: The `module.exports = server` addition is backward-compatible — existing code that `require('./server')` without using the return value is unaffected


## 0.7 Execution Requirements

### 0.7.1 Research Completeness Checklist

- ✓ Repository structure fully mapped — root folder contains `server.js`, `src/` (app.js, config/, routes/), `tests/` (integration/, lifecycle/, unit/), `package.json`, and configuration files
- ✓ All related files examined with retrieval tools — `server.js`, `src/app.js`, `src/config/index.js`, `src/routes/index.js`, `src/routes/main.routes.js`, `tests/lifecycle/server.test.js`, `tests/integration/endpoints.test.js`, `package.json`, `README.md`
- ✓ Bash analysis completed for patterns/dependencies — `grep` and `sed` commands confirmed absence of error handling, shutdown logic, validation, and exports in `server.js`
- ✓ Root cause definitively identified with evidence — five distinct omissions documented with exact line numbers, grep command outputs, and cross-referenced against tech spec section 4.4.2
- ✓ Single solution determined and validated — fix applied, 55 tests pass, 100% coverage, zero warnings

### 0.7.2 Fix Implementation Rules

- Make the exact specified changes only — the fix adds five targeted code blocks to `server.js` (validation, server reference capture, error handler, graceful shutdown, module export) and 14 test cases to `tests/lifecycle/server.test.js`
- Zero modifications outside the bug fix — no changes to `src/app.js`, `src/config/index.js`, `src/routes/`, integration tests, unit tests, or `package.json`
- No interpretation or improvement of working code — the Express app factory, route handlers, and configuration module are functioning correctly and remain untouched
- Preserve all whitespace and formatting except where changed — the existing JSDoc comment style (`@type`, `@param`, `@module`), `'use strict'` directive, section separator comments (`// ====`), and indentation patterns are preserved exactly
- All new code follows the project's established patterns:
  - JSDoc comments with type annotations on every new function and constant
  - Section separator comments matching the existing `// ====...====` style
  - `console.log` for informational messages, `console.error` for error messages
  - No external dependencies added — only core Node.js APIs (`process.on`, `setTimeout`, `module.exports`)


## 0.8 References

### 0.8.1 Files and Folders Searched

| Path | Purpose | Key Finding |
|------|---------|-------------|
| `server.js` | Primary fix target — HTTP server entry point | Missing error handling, shutdown logic, validation, export |
| `src/app.js` | Express application factory | Functioning correctly; no changes needed |
| `src/config/index.js` | Configuration management with env var support | `parseInt` fallback handles NaN but not negative/out-of-range ports |
| `src/config/README.md` | Configuration documentation | Documents `process.env.PORT` and `process.env.HOST` patterns |
| `src/routes/index.js` | Route aggregation barrel file | Exports main router; not affected |
| `src/routes/main.routes.js` | GET `/` and GET `/evening` route handlers | Not affected by server lifecycle changes |
| `tests/lifecycle/server.test.js` | Server lifecycle test suite | EADDRINUSE test passes vacuously; updated with 14 new tests |
| `tests/integration/endpoints.test.js` | HTTP endpoint integration tests | All 14 tests pass; unaffected by changes |
| `tests/unit/config.test.js` | Configuration module unit tests | All 12 tests pass; unaffected |
| `tests/unit/routes.test.js` | Route handler unit tests | All 7 tests pass; unaffected |
| `package.json` | Project metadata and dependencies | Express 5.1.0, Jest 29.7.0, Node.js 20 — no dependency changes |
| `README.md` | Project documentation | Confirmed Node.js version requirements |
| `jest.config.js` | Jest test configuration | Coverage thresholds: 80% statements, 75% branches, 80% lines, 90% functions |

### 0.8.2 Technical Specification Sections Referenced

| Section | Content Used |
|---------|-------------|
| 4.4 Error Handling Flows | Section 4.4.2 documents expected EADDRINUSE error handling via `server.on('error')` and confirms the test coverage at `tests/lifecycle/server.test.js:161-203` |

### 0.8.3 External Web Sources Referenced

| Source | URL | Usage |
|--------|-----|-------|
| Express.js Documentation | `expressjs.com/en/advanced/healthcheck-graceful-shutdown.html` | Graceful shutdown pattern with `server.close()` |
| Lagoon Documentation | `docs.lagoon.sh/using-lagoon-advanced/nodejs/` | Node.js `process.on('SIGTERM')` and `process.on('SIGINT')` pattern for containerized environments |
| PM2 Documentation | `pm2.io/docs/runtime/best-practices/graceful-shutdown/` | SIGINT interception and `server.close()` with process manager integration |
| OneUptime Blog | `oneuptime.com/blog/post/2026-01-25-fix-eaddrinuse-nodejs` | `server.on('error')` pattern with EADDRINUSE code-specific branching |
| GeeksforGeeks | `geeksforgeeks.org/node-js/explain-graceful-shutdown-in-express-js/` | SIGTERM graceful shutdown implementation pattern |
| Code Concisely | `codeconcisely.com/posts/graceful-shutdown-in-express/` | Forced shutdown timeout with `setTimeout().unref()` pattern |

### 0.8.4 Attachments

No attachments were provided for this project. No Figma screens or external design files were referenced.


