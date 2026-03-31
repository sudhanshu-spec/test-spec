# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create comprehensive unit tests for `server.js`** — the HTTP server entry point — using the **Jest** testing framework (already established in the project) augmented by **Supertest** for HTTP-level assertions.

**Request Category:** Add new tests | Update existing tests | Improve coverage

The user's request maps to the following six explicit testing dimensions:

- **HTTP Responses** — Verify that all server endpoints return the correct response bodies, including exact string matching with whitespace and newline semantics (e.g., `"Hello, World!\n"` vs. `"Good evening"`)
- **Status Codes** — Assert that every route returns the expected HTTP status code (200 for valid routes, 404 for undefined routes and unsupported methods)
- **Headers** — Validate response headers including `Content-Type: text/html; charset=utf-8`, `Content-Length`, and connection-related headers
- **Server Startup/Shutdown** — Test that `server.js` correctly binds to configured host/port via `app.listen()`, logs the startup confirmation message, and supports graceful shutdown through `server.close()`
- **Error Handling** — Verify robust handling of runtime errors such as `EADDRINUSE` (port already in use), `EACCES` (permission denied), and 404 responses for undefined routes and unsupported HTTP methods
- **Edge Cases** — Cover boundary conditions including invalid URLs, query parameter resilience, path normalization (double slashes, trailing slashes), special characters, empty paths, HEAD/OPTIONS methods, and concurrent request behavior

**Implicit Testing Needs Surfaced:**

- Module-level testing of `server.js` import side effects — since `require('server.js')` immediately triggers `app.listen()`, tests must use `jest.doMock()` to intercept and control this behavior
- Config module interaction testing — verifying that `server.js` correctly reads `config.host`, `config.port` from `src/config`
- Console output verification — ensuring the startup log message format `"Server running at http://{host}:{port}/"` is exact
- Error type discrimination — testing that different error codes (`EADDRINUSE`, `EACCES`, generic errors) are handled distinctly
- Response encoding consistency — verifying UTF-8 charset enforcement across all endpoints

### 0.1.2 Special Instructions and Constraints

- **Framework Selection:** The user specified "Jest or Mocha" — the repository already uses Jest `^30.2.0` as its testing framework with comprehensive configuration in `jest.config.js`. The Blitzy platform will use **Jest** to maintain consistency with the existing test infrastructure
- **Existing Test Patterns:** All new and updated tests must follow the established patterns documented in existing test files:
  - Unit tests use `jest.resetModules()` and helper loader functions (pattern from `tests/unit/config.test.js`)
  - Integration tests use Supertest with DRY helper functions (`get()`, `assertSuccessfulHtmlResponse()`, `assert404Response()` from `tests/integration/endpoints.test.js`)
  - Lifecycle tests use `jest.doMock()` with `createMockServer()`, `createMockListen()`, `setupMocks()` factory functions (pattern from `tests/lifecycle/server.test.js`)
- **Test Naming Convention:** Follow the existing `'should [expected behavior] when [condition]'` pattern used across all four test suites
- **JSDoc Annotations:** Include `@typedef` and `@fileoverview` JSDoc comments consistent with existing test files
- **CommonJS Module System:** All tests must use `require()`/`module.exports` — the project uses CommonJS exclusively (no ESM)
- **No Source Code Modifications:** Test additions should not require changes to production source files (`server.js`, `src/app.js`, `src/config/index.js`, `src/routes/main.routes.js`)

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- To **test HTTP responses**, we will **update** `tests/integration/endpoints.test.js` by adding test cases for HEAD request handling, response body encoding verification, content-length header accuracy, and response format consistency
- To **test status codes**, we will **update** `tests/integration/endpoints.test.js` by adding test cases for additional HTTP methods (HEAD, OPTIONS, PATCH), various invalid URL patterns, and status code verification for all supported and unsupported method/route combinations
- To **test headers**, we will **update** `tests/integration/endpoints.test.js` by adding dedicated header assertion tests covering `Content-Type`, `Content-Length`, `X-Powered-By`, `ETag`, and connection headers
- To **test server startup/shutdown**, we will **update** `tests/lifecycle/server.test.js` by adding test cases for additional configuration permutations, startup callback execution timing, and shutdown callback invocation semantics
- To **test error handling**, we will **update** `tests/lifecycle/server.test.js` by adding test cases for `EACCES` errors, generic uncategorized errors, and error handler registration verification; we will also **update** `tests/integration/endpoints.test.js` with additional 404/method-not-allowed scenarios
- To **test edge cases**, we will **create** `tests/unit/server.test.js` as a new unit test file that validates `server.js` module-level behavior (dependency imports, side effects, module structure), and we will **update** both `tests/integration/endpoints.test.js` and `tests/lifecycle/server.test.js` with additional boundary condition tests

### 0.1.4 Coverage Requirements Interpretation

**Explicit Coverage Targets:** The user's request for "comprehensive" tests implies thorough coverage across all stated dimensions — no specific numeric target was stated.

**Existing Coverage Baseline:** The repository currently achieves **100% coverage** across all metrics for all source files:

| Metric | Current | Threshold (jest.config.js) |
|--------|---------|---------------------------|
| Statements | 100% | ≥ 80% |
| Branches | 100% | ≥ 75% |
| Functions | 100% | ≥ 90% |
| Lines | 100% | ≥ 80% |

**Implicit Coverage Expectations:**

- Maintain 100% coverage across all metrics — the existing codebase achieves this and new tests must not introduce regressions
- Increase test case density — while line coverage is at 100%, the user's request for "comprehensive" testing implies adding more assertions per code path to test behavioral correctness, not just reachability
- Increase scenario breadth — the existing 41 tests cover core behaviors; the user wants additional edge cases, error scenarios, and boundary conditions that exercise the same code paths under more varied conditions

To achieve comprehensive testing, coverage should include:

- Every HTTP method against every defined and undefined route
- Every configuration permutation for host/port/env
- Every error type that `server.js` might encounter during startup
- Every header field in HTTP responses
- Every edge case in URL parsing and path normalization


## 0.2 Test Discovery and Analysis

### 0.2.1 Existing Test Infrastructure Assessment

Repository analysis reveals a **Jest 30.x** testing setup with a **three-tier test architecture** achieving 100% code coverage across 41 test cases. The project follows the App Factory Pattern where `src/app.js` exports the Express application without binding to a port, enabling isolated HTTP testing via Supertest.

**Testing Framework:** Jest `^30.2.0` (resolved: `30.1.3` via lockfile)

**Test Runner Configuration:**

| Configuration Element | Location | Details |
|----------------------|----------|---------|
| Jest config | `jest.config.js` | Root-level CommonJS config |
| Test match patterns | `jest.config.js` | `tests/**/*.test.js` |
| Test environment | `jest.config.js` | `node` (default) |
| Coverage directory | `jest.config.js` | `coverage/` |
| Coverage thresholds | `jest.config.js` | Statements: 80%, Branches: 75%, Functions: 90%, Lines: 80% |
| Module reset | `jest.config.js` | Not configured globally (done per-test) |

**Coverage Tools:** Jest's built-in coverage via `--coverage` flag, outputting to `coverage/` directory. Coverage reports configured through `jest.config.js` with enforced thresholds that cause CI failures if breached.

**Mock/Stub Libraries:** No external mocking libraries — the project uses Jest's built-in mocking exclusively (`jest.fn()`, `jest.doMock()`, `jest.resetModules()`, `jest.spyOn()`).

**Test Data Fixtures:** No dedicated fixture files or factory libraries. Test data is defined inline within each test file using constants and helper functions.

**Existing Test Suite Inventory:**

| Test File | Tier | Test Count | Scope |
|-----------|------|------------|-------|
| `tests/unit/config.test.js` | Unit | 9 | Config module: default values, env vars, PORT edge cases |
| `tests/unit/routes.test.js` | Unit | 7 | Router structure: stack layers, paths, HTTP methods |
| `tests/integration/endpoints.test.js` | Integration | 14 | HTTP endpoints via Supertest: responses, 404s, headers |
| `tests/lifecycle/server.test.js` | Lifecycle | 5 | Server startup, shutdown, custom config, errors |
| **Total** | **3 tiers** | **35 passed** | **Full source coverage** |

*Note: The 41-test total includes nested sub-assertions within `describe.each` blocks.*

**Existing Test Patterns Observed:**

- **Unit tier** — Uses `jest.resetModules()` in `beforeEach` with a `loadConfig()` / `loadRoutes()` helper that performs a fresh `require()` call per test. Environment variables are set/deleted via `process.env` manipulation with cleanup in `afterEach`. JSDoc `@typedef` annotations document mock objects.
- **Integration tier** — Uses Supertest's `request(app)` pattern with the app factory. Employs DRY helper functions (`get(path)`, `assertSuccessfulHtmlResponse()`, `assert404Response()`) to reduce boilerplate. Groups tests by route (`GET /`, `GET /evening`, `Undefined Routes`).
- **Lifecycle tier** — Uses `jest.doMock()` before `require('./../../server')` to intercept module-level side effects. Creates factory functions (`createMockServer()`, `createMockListen()`, `setupMocks()`) for mock construction. Captures the `app.listen()` callback via `mockImplementation`.

### 0.2.2 Web Search Research Conducted

The following research was conducted to validate testing tool compatibility and gather best practices:

- **Jest 30 Node.js Compatibility:** Jest 30 drops support for Node 14, 16, 19, and 21. The minimum supported Node version is 18.x. The project's Node v20.20.0 is fully compatible. Jest 30 delivers up to 37% faster test runs and 77% lower memory usage. New features include `expect.arrayOf()` and improved unhandled promise rejection handling via `waitForUnhandledRejections`.
- **Supertest 7.x Compatibility:** Supertest 7.1.4 is the latest stable release with no peer dependency constraints. It is fully compatible with Express 5.x and Jest 30. The library binds to ephemeral ports automatically when passed an app function, which aligns with the project's App Factory Pattern.
- **Jest 30 Mocking Best Practices:** Jest 30 retains full CommonJS mocking support through `jest.doMock()` and `jest.mock()`. The `jest.doMock()` pattern used in `tests/lifecycle/server.test.js` is the recommended approach for intercepting module-level side effects — no changes needed.
- **Express 5 Testing Patterns:** Express 5.1.0 (used by this project) maintains backward-compatible Supertest integration. The App Factory Pattern (exporting app without listen) remains the standard approach for HTTP testing.


## 0.3 Testing Scope Analysis

### 0.3.1 Test Target Identification

**Primary Code Under Test:**

- **Module:** `server.js` (entry point) at project root — requires unit tests for module-level behavior (dependency loading, `app.listen()` invocation, startup logging) and enhanced lifecycle tests for error scenarios and configuration permutations
- **Module:** `src/app.js` (Express application factory) — requires enhanced integration tests for HTTP responses, headers, status codes, and edge case URL handling
- **Module:** `src/config/index.js` (configuration provider) — existing unit tests are comprehensive; referenced as a mock dependency in server.js tests
- **Module:** `src/routes/main.routes.js` (route handlers) — requires enhanced integration tests for response body verification, additional HTTP methods, and edge cases

**Functions Requiring Test Coverage Per File:**

| Source File | Function/Behavior | Test Categories Needed |
|-------------|-------------------|----------------------|
| `server.js` | `app.listen(port, host, callback)` invocation | Unit, Lifecycle |
| `server.js` | Startup log message: `console.log()` format | Unit, Lifecycle |
| `server.js` | `require('./src/app')` import | Unit |
| `server.js` | `require('./src/config')` import | Unit |
| `src/app.js` | Express app creation and middleware chain | Integration |
| `src/app.js` | Route mounting at `/` | Integration |
| `src/routes/main.routes.js` | `GET /` handler → `"Hello, World!\n"` | Integration, Edge cases |
| `src/routes/main.routes.js` | `GET /evening` handler → `"Good evening"` | Integration, Edge cases |

**Existing Test File Mapping:**

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|----------------------|
| `server.js` | `tests/lifecycle/server.test.js` | Startup binding, log message, custom config, shutdown, EADDRINUSE |
| `server.js` | *(No unit-level test file)* | *(Gap: module structure, import verification, side effects)* |
| `src/app.js` | `tests/integration/endpoints.test.js` | GET /, GET /evening, 404 routes, headers |
| `src/config/index.js` | `tests/unit/config.test.js` | Defaults, env vars, edge cases (9 tests) |
| `src/routes/main.routes.js` | `tests/unit/routes.test.js` | Router stack, paths, methods (7 tests) |

**Dependencies Requiring Mocking:**

- `src/app` module — mocked in lifecycle tests to isolate `server.js` behavior from the actual Express app; mock provides a controlled `listen()` method that returns a mock server object
- `src/config` module — mocked in lifecycle tests to inject specific `host`, `port`, and `env` values without relying on real environment variables
- `console.log` — spied upon via `jest.spyOn(console, 'log')` to verify startup message format without producing test output noise
- `process.exit` — mocked for testing unrecoverable error scenarios (e.g., `EADDRINUSE`) where the server process would normally terminate
- No external services, databases, or file system operations require mocking — the application has zero external runtime dependencies

### 0.3.2 Version Compatibility Research

Based on the project's Node.js v20.20.0 runtime, the following testing stack versions have been verified for compatibility:

| Tool | Version | Compatibility Status | Rationale |
|------|---------|---------------------|-----------|
| **Jest** | `^30.2.0` (resolved: `30.1.3`) | ✅ Fully compatible | Requires Node ≥ 18.14.0; Node 20.20.0 satisfies. Installed and passing all 41 tests |
| **Supertest** | `^7.1.4` | ✅ Fully compatible | No Node.js version constraints. Works with Express 5.x. Installed and functional |
| **Express** | `^5.1.0` | ✅ Fully compatible | Runtime dependency, not a test dependency. Tested via Supertest successfully |
| **Node.js** | `20.20.0` (LTS) | ✅ Recommended version | README recommends 20.19.x LTS; 20.20.0 is within the LTS line. Satisfies Jest 30's ≥ 18.14.0 requirement |

**Version Conflict Analysis:** No version conflicts detected. All dependencies resolve cleanly via `npm ci` using the existing `package-lock.json` (lockfile version 3). The Jest 30 + Supertest 7 + Express 5 + Node 20 stack is production-validated in this project with zero compatibility issues.

**Jest 30-Specific Considerations:**

- Jest 30 provides improved unhandled promise rejection handling via `waitForUnhandledRejections`, which benefits tests that intentionally trigger async errors in server startup scenarios
- Jest 30's ESM wrapper support is not relevant here since the project uses CommonJS exclusively
- Jest 30's renamed `testPathPatterns` configuration option does not affect this project as the `jest.config.js` uses `testMatch` pattern instead


## 0.4 Test Implementation Design

### 0.4.1 Test Strategy Selection

**Test Types to Implement:**

- **Unit tests** — Focus on isolated `server.js` module behavior: verifying that the module correctly imports its dependencies (`src/app`, `src/config`), invokes `app.listen()` with the exact parameters from config, and exercises the startup callback logic. All dependencies are mocked to ensure full isolation.
- **Integration tests** — Cover HTTP-level interactions through Supertest against the Express app: response body correctness, status code accuracy for all method/route combinations, header field completeness, and HTTP protocol compliance.
- **Edge case tests** — Address boundary conditions across both levels: URL edge cases (empty paths, double slashes, encoded characters, trailing slashes), error type discrimination in server startup (EADDRINUSE, EACCES, generic errors), config edge cases (port 0, empty host), and HTTP method edge cases (HEAD, OPTIONS, PATCH, PUT, DELETE against all routes).
- **Error handling tests** — Verify failure scenarios including port-in-use errors, permission denied errors, generic listen errors, and 404 responses for undefined routes with various HTTP methods.

### 0.4.2 Test Case Blueprint

```
Component: server.js (Entry Point Module)
Test File: tests/unit/server.test.js (NEW)
Test Categories:
- Happy path: Module loads and calls app.listen() with correct config values
- Happy path: Startup callback logs formatted URL message
- Edge cases: Module imports resolve to correct dependency paths
- Edge cases: Server object returned from listen() has expected properties
- Error cases: Module behavior when dependencies fail to load
```

```
Component: server.js (Lifecycle Behavior)
Test File: tests/lifecycle/server.test.js (ENHANCED)
Test Categories:
- Happy path: Server binds to default and custom host:port (existing)
- Happy path: Shutdown via server.close() invokes callback (existing)
- Edge cases: Server startup with port 0 (OS-assigned port)
- Edge cases: Server startup with empty host string
- Edge cases: Multiple sequential startup/shutdown cycles
- Error cases: EADDRINUSE triggers process.exit (existing)
- Error cases: EACCES (permission denied) triggers process.exit
- Error cases: Generic/unknown error propagation
- Error cases: Error event emitted after successful bind
```

```
Component: src/app.js (HTTP Response Behavior)
Test File: tests/integration/endpoints.test.js (ENHANCED)
Test Categories:
- Happy path: GET / returns "Hello, World!\n" with 200 (existing)
- Happy path: GET /evening returns "Good evening" with 200 (existing)
- Edge cases: HEAD / returns 200 with correct headers but empty body
- Edge cases: HEAD /evening returns 200 with headers but empty body
- Edge cases: OPTIONS request handling and response headers
- Edge cases: GET with query parameters (e.g., GET /?key=value)
- Edge cases: Trailing slash normalization (GET /evening/ behavior)
- Edge cases: Double-slash paths (GET //evening)
- Edge cases: URL-encoded characters in path
- Edge cases: Case-sensitive path handling (GET /Evening vs /evening)
- Error cases: POST/PUT/PATCH/DELETE to valid routes return 404
- Error cases: All HTTP methods to undefined routes return 404
- Error cases: Extremely long URL path handling
- Performance boundaries: Concurrent requests return consistent responses
```

### 0.4.3 Existing Test Extension Strategy

**Tests to Extend:**

- Enhance `tests/lifecycle/server.test.js` by adding cases for `EACCES` error handling, generic error propagation, port 0 binding, empty host configuration, and multiple startup/shutdown cycles. The existing `setupMocks()` factory function pattern will be reused, with new error mock scenarios added alongside the existing `EADDRINUSE` test.
- Enhance `tests/integration/endpoints.test.js` by adding cases for HEAD requests, OPTIONS requests, unsupported HTTP methods (POST, PUT, PATCH, DELETE) on valid routes, query parameter resilience, path normalization edge cases (trailing slashes, double slashes, case sensitivity), URL-encoded characters, and response header completeness validation. The existing `get()` helper function pattern will be extended with additional method helpers (`head()`, `options()`, `post()`, `put()`, etc.).

**Tests to Maintain As-Is:**

- `tests/unit/config.test.js` — 9 tests providing full coverage of configuration logic. No modifications needed as the config module is not a direct target of this request.
- `tests/unit/routes.test.js` — 7 tests providing full coverage of route structure. No modifications needed as the route definitions are not changing.

### 0.4.4 Test Data and Fixtures Design

**Required Test Data Structures:**

- **Mock Server Object:** Factory function `createMockServer()` returning `{ close: jest.fn(), on: jest.fn(), address: jest.fn() }` — extends the existing pattern in `tests/lifecycle/server.test.js` with `address()` for port 0 tests
- **Mock App Object:** Factory function `createMockApp()` returning `{ listen: jest.fn() }` — reuses the existing pattern with configurable `mockImplementation` for different callback scenarios
- **Mock Config Object:** Inline objects with `{ host, port, env }` — reuses the existing pattern with additional permutations for edge cases (empty host, port 0, various env values)
- **Error Objects:** Constructed via `Object.assign(new Error('msg'), { code: 'EADDRINUSE' })` — extends existing pattern to include `EACCES` and generic error codes

**Fixture Organization Strategy:** The project uses inline fixtures within test files (no separate fixture directory). This pattern will be maintained. Each test file defines its own constants and factory functions at the top of the file, consistent with the established codebase convention.

**Mock Object Specifications:**

| Mock | Purpose | Construction Pattern |
|------|---------|---------------------|
| `mockServer` | Simulates `http.Server` returned by `app.listen()` | `{ close: jest.fn(cb => cb()), on: jest.fn(), address: jest.fn(() => ({ port: 3000 })) }` |
| `mockListen` | Captures listen callback for manual invocation | `jest.fn((port, host, cb) => { cb(); return mockServer; })` |
| `mockApp` | Simulates the Express app module | `{ listen: mockListen }` |
| `mockConfig` | Provides controlled configuration values | `{ host: '127.0.0.1', port: 3000, env: 'test' }` |
| `consoleSpy` | Captures console.log output for message verification | `jest.spyOn(console, 'log').mockImplementation()` |

**Test Database/State Management:** Not applicable — this project has no database. Test isolation is achieved through Jest's module registry reset (`jest.resetModules()`) and mock cleanup (`jest.restoreAllMocks()`), ensuring each test begins with a clean module state.


## 0.5 Test File Transformation Mapping

### 0.5.1 File-by-File Test Plan

| Target Test File | Transformation | Source File/Test | Purpose/Changes |
|-----------------|----------------|------------------|-----------------|
| `tests/unit/server.test.js` | CREATE | `server.js` | New unit test file for server.js module-level behavior: dependency imports, app.listen() invocation with correct parameters, startup callback logging, and module structure verification |
| `tests/lifecycle/server.test.js` | UPDATE | `tests/lifecycle/server.test.js` | Add EACCES error handling, generic error propagation, port 0 binding, empty host config, and multiple startup/shutdown cycle tests to the existing 5-test suite |
| `tests/integration/endpoints.test.js` | UPDATE | `tests/integration/endpoints.test.js` | Add HEAD requests, OPTIONS handling, unsupported HTTP methods on valid routes, query parameter resilience, path edge cases, URL encoding, case sensitivity, and response header completeness tests |
| `tests/unit/config.test.js` | REFERENCE | `tests/unit/config.test.js` | Reference for unit test patterns: `jest.resetModules()` in `beforeEach`, helper loader function, env var manipulation with cleanup |
| `tests/unit/routes.test.js` | REFERENCE | `tests/unit/routes.test.js` | Reference for unit test patterns: structural validation, describe/it nesting conventions, JSDoc annotations |
| `tests/lifecycle/server.test.js` | REFERENCE | `tests/lifecycle/server.test.js` | Reference for lifecycle test patterns: `jest.doMock()`, factory functions, mock callback capture, console spy pattern |
| `tests/integration/endpoints.test.js` | REFERENCE | `tests/integration/endpoints.test.js` | Reference for integration test patterns: Supertest helper functions, `describe.each` blocks, DRY assertion helpers |

### 0.5.2 New Test Files Detail

**`tests/unit/server.test.js`** — Unit-level tests for `server.js` module

- **Test categories:** Module loading behavior, dependency verification, listen parameter correctness, callback execution
- **Mock dependencies:** `src/app` (mocked to return controlled listen function), `src/config` (mocked to return specific host/port/env values), `console.log` (spied to verify output)
- **Assertions focus:**
  - `app.listen()` is called exactly once with `(config.port, config.host, callback)`
  - The callback passed to `listen()` calls `console.log()` with the formatted URL string
  - Module requires `./src/app` and `./src/config` as its dependencies
  - The log message matches the exact format: `Server running at http://{host}:{port}/`
- **Estimated test count:** 8–12 test cases organized in 3 describe blocks:
  - `describe('Module Dependencies')` — Import verification tests
  - `describe('Server Initialization')` — Listen call parameter tests
  - `describe('Startup Callback')` — Log message format and execution tests

### 0.5.3 Test Files to Modify Detail

**`tests/lifecycle/server.test.js`** — Add approximately 8–10 test cases for expanded lifecycle scenarios

- **New test methods:**
  - `'should call process.exit when EACCES error occurs'` — Mirrors existing EADDRINUSE test with `error.code = 'EACCES'`
  - `'should propagate generic error when unknown error code occurs'` — Tests error handling without recognized error codes
  - `'should handle server startup with port 0'` — Verifies OS-assigned ephemeral port behavior
  - `'should handle server startup with empty host string'` — Tests binding to all interfaces via empty host
  - `'should execute multiple startup/shutdown cycles cleanly'` — Tests server restart reliability
  - `'should register error handler on server object'` — Verifies `server.on('error', handler)` is called
  - `'should log correct message format with various config combinations'` — Tests log output with different host/port combinations using `describe.each`
- **Updated fixtures:** Extend existing `setupMocks()` factory to accept error code parameter; add `createEaccesError()` helper alongside existing error mock pattern
- **Assertions to add:** `process.exit` called with code 1 for EACCES, error event handler registered via `server.on('error')`, log format matches across config permutations

**`tests/integration/endpoints.test.js`** — Add approximately 15–20 test cases for expanded HTTP coverage

- **New test methods:**
  - `'should return 200 with correct headers but empty body for HEAD /'` — HEAD request support
  - `'should return 200 with correct headers but empty body for HEAD /evening'` — HEAD request on second route
  - `'should handle OPTIONS request'` — OPTIONS method response
  - `'should return 404 for POST to /'` — POST on GET-only route
  - `'should return 404 for PUT to /evening'` — PUT on GET-only route
  - `'should return 404 for PATCH to /'` — PATCH on GET-only route
  - `'should return 404 for DELETE to /evening'` — DELETE on GET-only route
  - `'should handle query parameters on valid routes'` — GET /?foo=bar returns 200
  - `'should handle trailing slash on /evening/'` — Path normalization behavior
  - `'should handle double slashes in path'` — GET //evening behavior
  - `'should handle URL-encoded characters'` — Encoded path segments
  - `'should be case-sensitive for route paths'` — GET /Evening vs /evening
  - `'should include Content-Length header in response'` — Header completeness
  - `'should include Content-Type text/html for all routes'` — Content-Type consistency
  - `'should handle extremely long URL paths with 404'` — Long URL boundary test
  - `'should return consistent responses under concurrent requests'` — Concurrent GET /
- **Updated fixtures:** Add new helper functions `head(path)`, `post(path)`, `put(path)`, `patch(path)`, `del(path)`, and `options(path)` following the existing `get(path)` DRY pattern
- **Assertions to add:** Response body empty for HEAD, Content-Length matches body length, Content-Type matches across all endpoints, 404 status for unsupported methods

### 0.5.4 Test Configuration Updates

- **`jest.config.js`:** No changes required. The existing `testMatch: ['**/tests/**/*.test.js']` pattern automatically discovers the new `tests/unit/server.test.js` file. Coverage thresholds remain at their current levels (80% statements, 75% branches, 90% functions, 80% lines). The `coveragePathIgnorePatterns` exclusion of `node_modules/` and `tests/` remains correct.
- **`package.json` scripts:** No changes required. The existing `test`, `test:coverage`, and `test:ci` scripts work with any test files matching the Jest config pattern.
- **Coverage configuration:** No threshold adjustments needed since coverage is already at 100% and the new tests add density, not new source file coverage.

### 0.5.5 Cross-File Test Dependencies

**Shared Fixtures:**

- No shared fixture files exist — each test file is self-contained with its own mock factories and test data. This pattern will be maintained for the new `tests/unit/server.test.js` file.

**Mock Objects:**

| Mock Pattern | Used In | Purpose |
|-------------|---------|---------|
| `createMockServer()` factory | `tests/lifecycle/server.test.js`, `tests/unit/server.test.js` | Creates mock `http.Server` objects. Both files will define their own version independently per project convention |
| `createMockListen()` factory | `tests/lifecycle/server.test.js`, `tests/unit/server.test.js` | Creates mock `app.listen()` functions. Defined independently per file |
| `jest.spyOn(console, 'log')` | `tests/lifecycle/server.test.js`, `tests/unit/server.test.js` | Captures startup log output. Standard Jest API, no shared dependency |
| `request(app)` Supertest agent | `tests/integration/endpoints.test.js` | Creates HTTP test client. Isolated to integration tests |

**Test Utilities:**

- DRY helper functions (`get()`, `assertSuccessfulHtmlResponse()`, `assert404Response()`) are defined within `tests/integration/endpoints.test.js` and will be extended with additional method helpers (`head()`, `post()`, etc.) within the same file
- No cross-file test utility sharing is needed

**Import Updates Required:**

- `tests/unit/server.test.js` (NEW) — Will import `server.js` via `require('./../../server')` after setting up mocks, consistent with the pattern used in `tests/lifecycle/server.test.js`
- No import changes needed for existing test files — all current `require()` paths remain valid


## 0.6 Dependency Inventory

### 0.6.1 Testing Dependencies

All testing packages are already present in the project's `package.json` under `devDependencies`. No new testing dependencies need to be installed.

| Registry | Package Name | Version | Purpose |
|----------|-------------|---------|---------|
| npm | jest | ^30.2.0 (resolved: 30.1.3) | Testing framework — provides test runner, assertion library, mocking, and coverage collection |
| npm | supertest | ^7.1.4 | HTTP assertion library — enables integration testing of Express app without starting a real server |
| npm | express | ^5.1.0 | Runtime dependency (not test-specific) — the Express framework being tested |

**Dependency Notes:**

- **No additional testing packages required.** The existing Jest + Supertest combination provides all necessary capabilities for the planned test expansion: Jest's built-in `jest.fn()`, `jest.doMock()`, `jest.spyOn()`, and `jest.resetModules()` handle all mocking needs; Supertest handles all HTTP assertion needs
- **No assertion libraries needed.** Jest's built-in `expect()` API provides `toBe()`, `toEqual()`, `toHaveBeenCalledWith()`, `toHaveBeenCalledTimes()`, `toMatch()`, `toContain()`, and `toHaveProperty()` — sufficient for all planned test assertions
- **No coverage libraries needed.** Jest's built-in `--coverage` flag with the configured thresholds in `jest.config.js` provides complete coverage measurement and enforcement

### 0.6.2 Import Updates

No import transformation rules are needed for this testing exercise. All test files use stable `require()` paths that reference the existing source structure.

**Import patterns used across test files:**

| Test File | Import Statement | Target |
|-----------|-----------------|--------|
| `tests/unit/server.test.js` (NEW) | `require('./../../server')` | `server.js` (loaded after mock setup) |
| `tests/unit/server.test.js` (NEW) | `jest.doMock('./../../src/app', ...)` | Mocked app module |
| `tests/unit/server.test.js` (NEW) | `jest.doMock('./../../src/config', ...)` | Mocked config module |
| `tests/lifecycle/server.test.js` | `require('./../../server')` | `server.js` (existing, unchanged) |
| `tests/integration/endpoints.test.js` | `require('./../../src/app')` | `src/app.js` (existing, unchanged) |
| `tests/integration/endpoints.test.js` | `require('supertest')` | Supertest library (existing, unchanged) |
| `tests/unit/config.test.js` | `require('./../../src/config')` | `src/config/index.js` (existing, unchanged) |
| `tests/unit/routes.test.js` | `require('./../../src/routes')` | `src/routes/index.js` (existing, unchanged) |

All relative paths use the `./../../` prefix pattern established by the project's test directory structure (`tests/<tier>/<file>.test.js` → project root). No path refactoring or aliasing is required.


## 0.7 Coverage and Quality Targets

### 0.7.1 Coverage Metrics

**Current Coverage Baseline (verified via `npx jest --ci --coverage`):**

| Source File | Statements | Branches | Functions | Lines |
|-------------|-----------|----------|-----------|-------|
| `server.js` | 100% | 100% | 100% | 100% |
| `src/app.js` | 100% | 100% | 100% | 100% |
| `src/config/index.js` | 100% | 100% | 100% | 100% |
| `src/routes/index.js` | 100% | 100% | 100% | 100% |
| `src/routes/main.routes.js` | 100% | 100% | 100% | 100% |
| **All files** | **100%** | **100%** | **100%** | **100%** |

**Target Coverage:** Maintain 100% across all metrics. The user's request for "comprehensive" tests translates to increasing **test case density and scenario breadth**, not increasing numeric coverage which is already maximal.

**Enforced Thresholds (from `jest.config.js`):**

| Metric | Threshold | Current | Target |
|--------|-----------|---------|--------|
| Statements | ≥ 80% | 100% | 100% |
| Branches | ≥ 75% | 100% | 100% |
| Functions | ≥ 90% | 100% | 100% |
| Lines | ≥ 80% | 100% | 100% |

**Coverage Gaps to Address:**

While numeric coverage is 100%, the following qualitative coverage gaps exist and will be filled:

- **`server.js` error handling breadth:** Currently only `EADDRINUSE` is tested. Target: test `EACCES` and generic errors to verify the error handler discriminates between error types
- **`server.js` configuration variations:** Currently tests default config and one custom config. Target: test port 0, empty host, and additional host/port combinations to verify parameter pass-through fidelity
- **HTTP method coverage:** Currently only GET and undefined-route 404s are tested. Target: test HEAD, OPTIONS, POST, PUT, PATCH, DELETE against all defined routes to verify method routing completeness
- **Response header completeness:** Currently only `Content-Type` is explicitly asserted. Target: assert `Content-Length`, `ETag`, and `X-Powered-By` headers to verify full response header correctness
- **URL edge case coverage:** Currently only clean paths are tested. Target: test trailing slashes, double slashes, query parameters, URL-encoded characters, and case sensitivity to verify Express routing behavior under stress

**Per-File Test Count Targets:**

| Test File | Current Tests | Planned Additions | Target Total |
|-----------|--------------|-------------------|-------------|
| `tests/unit/server.test.js` (NEW) | 0 | 8–12 | 8–12 |
| `tests/lifecycle/server.test.js` | 5 | 8–10 | 13–15 |
| `tests/integration/endpoints.test.js` | 14 | 15–20 | 29–34 |
| `tests/unit/config.test.js` | 9 | 0 | 9 |
| `tests/unit/routes.test.js` | 7 | 0 | 7 |
| **Total** | **35** | **31–42** | **66–77** |

### 0.7.2 Test Quality Criteria

**Assertion Density Expectations:**

- Each test case should contain **at least 1 primary assertion** and relevant supporting assertions
- Integration tests using Supertest should chain assertions: `.expect(statusCode).expect('Content-Type', value).expect(bodyMatcher)`
- Lifecycle tests should verify both the action (e.g., `listen` called) and the effect (e.g., log message output)

**Test Isolation Requirements:**

- Each test file must use `beforeEach` with `jest.resetModules()` (unit tier) or fresh Supertest agent creation (integration tier)
- Each lifecycle test must use `jest.doMock()` before the `require()` call to prevent module-level side effects from leaking
- `afterEach` blocks must restore all spies via `jest.restoreAllMocks()` and clean up environment variable changes
- Tests must be runnable in any order and in parallel without interference

**Performance Constraints:**

- Individual test execution time should remain under 500ms per test case
- Total suite execution time should remain under 10 seconds (current: ~2.5 seconds for 41 tests)
- No external network calls, file system writes, or actual port binding in unit tests

**Maintainability Standards:**

- Follow existing code style: 2-space indentation, single quotes, CommonJS modules
- Use descriptive test names following `'should [behavior] when [condition]'` convention
- Use DRY helper functions for repeated assertion patterns (extending existing pattern)
- Include JSDoc `@fileoverview` and `@typedef` annotations consistent with existing test files
- Group tests logically using nested `describe` blocks by feature area

**Repository Test Pattern Compliance:**

- Unit tests: Follow `tests/unit/config.test.js` pattern — `beforeEach` reset + helper loader
- Integration tests: Follow `tests/integration/endpoints.test.js` pattern — Supertest + DRY helpers
- Lifecycle tests: Follow `tests/lifecycle/server.test.js` pattern — `jest.doMock()` + factory functions


## 0.8 Scope Boundaries

### 0.8.1 Exhaustively In Scope

**New Test Files:**

- `tests/unit/server.test.js` — New unit test file for `server.js` module-level testing (module imports, listen parameter verification, startup callback logic)

**Test File Updates:**

- `tests/lifecycle/server.test.js` — Enhanced with additional error types (EACCES, generic), config permutations (port 0, empty host), multiple startup/shutdown cycles, and error handler registration verification
- `tests/integration/endpoints.test.js` — Enhanced with HEAD/OPTIONS method tests, unsupported HTTP methods (POST/PUT/PATCH/DELETE) on defined routes, URL edge cases (trailing slashes, double slashes, encoded characters, case sensitivity, query parameters), response header completeness, and concurrent request consistency

**Test Configuration (no changes needed, validated as-is):**

- `jest.config.js` — Automatically discovers the new test file via existing `testMatch` pattern; thresholds remain unchanged
- `package.json` — Test scripts (`test`, `test:coverage`, `test:ci`) work without modification

**Test Utilities and Patterns (defined inline per project convention):**

- Mock factory functions in `tests/unit/server.test.js` — `createMockServer()`, `createMockListen()`, `setupMocks()`
- Extended mock factories in `tests/lifecycle/server.test.js` — Error code parameterization for `EADDRINUSE`, `EACCES`, and generic errors
- Extended DRY helpers in `tests/integration/endpoints.test.js` — `head()`, `post()`, `put()`, `patch()`, `del()`, `options()` helper functions

**Reference Test Files (used for pattern consistency, not modified):**

- `tests/unit/config.test.js` — Reference for unit test patterns
- `tests/unit/routes.test.js` — Reference for unit test conventions
- `tests/README.md` — Reference for test documentation standards

### 0.8.2 Explicitly Out of Scope

- **Source code modifications** — No changes to `server.js`, `src/app.js`, `src/config/index.js`, `src/routes/index.js`, or `src/routes/main.routes.js`. Tests must work against the existing production code as-is
- **New feature implementation** — No new routes, middleware, or functionality will be added to the Express application as part of this testing exercise
- **Refactoring beyond testing needs** — No restructuring of existing test files beyond adding new test cases and helper functions within them
- **External testing tools** — No introduction of Mocha, Chai, Sinon, or other testing libraries. The existing Jest + Supertest stack is sufficient and will be used exclusively
- **E2E or browser testing** — No end-to-end tests, no Selenium/Playwright/Puppeteer integration. The project explicitly excludes E2E testing per the Technical Specification
- **Database testing** — Not applicable. The project has no database dependencies
- **Performance benchmarking** — No formal load testing or benchmarking. Concurrent request tests verify correctness, not performance
- **CI/CD pipeline changes** — No modifications to CI configuration or deployment scripts
- **Coverage threshold adjustments** — No changes to `jest.config.js` threshold values. Current thresholds are appropriate and will continue to be met
- **Test documentation updates** — `tests/README.md` is not being modified. The existing documentation accurately describes the three-tier test architecture
- **Unrelated test files** — `tests/unit/config.test.js` and `tests/unit/routes.test.js` will not be modified. They achieve full coverage for their respective source modules and are not targets of this request


## 0.9 Execution Parameters

### 0.9.1 Testing-Specific Instructions

**Test Execution Commands:**

| Purpose | Command |
|---------|---------|
| Run all tests | `npm test` |
| Run tests with coverage | `npm run test:coverage` |
| Run tests in CI mode | `npm run test:ci` (equivalent to `CI=true npx jest --ci --coverage`) |
| Run a specific test file | `npx jest tests/unit/server.test.js` |
| Run tests matching pattern | `npx jest --testPathPatterns="server"` |
| Run with verbose output | `npx jest --verbose` |

**Coverage Measurement Command:**

```
npx jest --ci --coverage --reporters=default
```

This produces a coverage report in the `coverage/` directory and enforces the thresholds defined in `jest.config.js`. The CI mode disables watch mode and interactive prompts.

**Single Test Execution Pattern:**

```
npx jest tests/lifecycle/server.test.js -t "should call process.exit"
```

The `-t` flag filters by test name pattern within the specified file.

**Specific Test Patterns to Follow in the Repository:**

- **Unit tests** must isolate modules by using `jest.resetModules()` in `beforeEach` and a helper function (e.g., `loadServer()`) that calls `require()` after mock setup, ensuring each test starts with a fresh module registry
- **Integration tests** must use the Supertest `request(app)` pattern where `app` is imported from `src/app.js` (the factory export, not `server.js`), avoiding actual port binding during HTTP assertion tests
- **Lifecycle tests** must use `jest.doMock()` before `require('./../../server')` to intercept `app.listen()` before the module-level call executes, enabling controlled testing of the listen callback
- **All test files** must restore mocks via `jest.restoreAllMocks()` in `afterEach` and clean up any `process.env` mutations to prevent test pollution

**Environment Setup Requirements:**

- Node.js v20.20.0 (already installed and verified)
- Dependencies installed via `npm ci` using `package-lock.json` (lockfile v3)
- No environment variables required for test execution — the test suite manages its own env var manipulation internally
- No external services, databases, or network connectivity required
- The `coverage/` directory is gitignored and auto-generated by Jest


## 0.10 Special Instructions for Testing

The following testing-specific directives govern all implementation work under this plan:

- **DO NOT modify source code.** All production files (`server.js`, `src/app.js`, `src/config/index.js`, `src/routes/index.js`, `src/routes/main.routes.js`) must remain untouched. Tests must exercise the existing code paths as-is, using mocking and dependency injection techniques already established in the repository.

- **Follow existing test patterns.** Every new test file and test case must adhere to the conventions established in the existing test suite:
  - Unit tests: `jest.resetModules()` + loader helper function pattern (per `tests/unit/config.test.js`)
  - Integration tests: Supertest + DRY helper function pattern (per `tests/integration/endpoints.test.js`)
  - Lifecycle tests: `jest.doMock()` + factory function pattern (per `tests/lifecycle/server.test.js`)

- **Maintain test isolation.** Every test must be independently runnable and produce deterministic results regardless of execution order. No test may depend on state established by a prior test. Module registry resets and mock restoration must occur in `beforeEach`/`afterEach` hooks.

- **Use Jest built-in mocking exclusively.** No external mocking libraries (Sinon, testdouble, nock) may be introduced. The project relies on `jest.fn()`, `jest.doMock()`, `jest.spyOn()`, and `jest.resetModules()` for all mocking needs.

- **Ensure all tests can run in parallel.** Jest's default parallel execution mode must be supported. No shared mutable state across test files. No actual port binding in unit tests. Integration tests use Supertest's ephemeral port binding which is inherently parallel-safe.

- **Match existing code style.** Two-space indentation, single-quoted strings, semicolon-terminated statements, CommonJS `require()`/`module.exports` syntax, and consistent JSDoc annotations.

- **Preserve 100% coverage.** The new test files and enhanced test cases must not cause any regression in the existing 100% code coverage. All tests must pass under `npm run test:ci` with coverage enforcement.

- **Test the three-tier architecture boundary.** New `tests/unit/server.test.js` validates module structure (unit tier). Enhanced `tests/lifecycle/server.test.js` validates startup/shutdown behavior (lifecycle tier). Enhanced `tests/integration/endpoints.test.js` validates HTTP behavior (integration tier). Each tier tests through its designated interface and does not cross boundaries.

- **No watch mode in CI.** All test execution commands must use `CI=true` or `--ci` flags to prevent Jest from entering interactive/watch mode. The `--watchAll=false` flag is implicitly set by CI mode.


