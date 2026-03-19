# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create a comprehensive, greenfield unit test suite** for the `server.js` HTTP server entry point and its associated modules in a Node.js/Express 5 application.

**Request Category:** Add new tests (greenfield — no tests currently exist in the repository)

The user's requirements decompose into the following specific testing objectives:

- **HTTP Responses:** Verify that each defined route (`GET /` and `GET /evening`) returns the exact expected response body, including trailing newline characters where present
- **Status Codes:** Assert that successful routes return HTTP 200, undefined routes return HTTP 404, and unsupported HTTP methods are handled with appropriate status codes
- **Headers:** Validate `Content-Type`, `Content-Length`, and other Express-managed response headers on every endpoint
- **Server Startup/Shutdown:** Test the `app.listen()` binding lifecycle in `server.js`, including successful startup callback execution, console output logging, and graceful server termination via `.close()`
- **Error Handling:** Exercise Express 5's default error handling for undefined routes, malformed requests, and internal server error scenarios
- **Edge Cases:** Cover boundary conditions such as concurrent requests, oversized URLs, unexpected HTTP methods, empty paths, and special character handling in route paths

**Implicit Testing Needs Surfaced:**
- Configuration module (`src/config/index.js`) requires unit testing to validate environment variable parsing, default values, and type coercion (`parseInt` for PORT)
- Route handler isolation testing (`src/routes/main.routes.js`) should verify exact string responses including trailing newlines
- The factory pattern in `src/app.js` (exports app without `listen()`) must be validated as the primary testability seam

### 0.1.2 Special Instructions and Constraints

The user specified "Jest or Mocha" as the testing framework. Based on the project's characteristics, **Jest 30** is selected as the recommended framework for the following reasons:
- Built-in assertion library, mocking, and coverage reporting eliminates the need for additional packages (chai, sinon, nyc)
- Native CommonJS support matches the project's module system
- `testEnvironment: 'node'` eliminates unnecessary JSDOM overhead for a server-only application
- `supertest` integrates seamlessly with Jest for HTTP assertion testing

No user-provided examples to preserve. No Figma attachments referenced. No additional environment variables or secrets required for testing.

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- To **test HTTP responses and status codes**, we will create `__tests__/app.test.js` using `supertest` to issue HTTP requests against the Express app instance exported by `src/app.js` — without binding to a network port
- To **test response headers**, we will extend the HTTP assertions in `__tests__/app.test.js` to validate `Content-Type`, `Content-Length`, and `X-Powered-By` headers on each endpoint
- To **test server startup/shutdown**, we will create `__tests__/server.test.js` that mocks `app.listen()` and `console.log()` to verify the startup lifecycle in `server.js`, then tests actual port binding with `.close()` for shutdown
- To **test error handling**, we will add test cases in `__tests__/app.test.js` for undefined routes (404), unsupported HTTP methods (404/405), and Express 5's built-in error handler behavior
- To **test edge cases**, we will add boundary condition tests in `__tests__/app.test.js` for deeply nested paths, special characters, very long URLs, and simultaneous requests
- To **test configuration**, we will create `__tests__/config.test.js` to validate `src/config/index.js` environment variable parsing, defaults, and type coercion
- To **test route handlers**, we will create `__tests__/routes/main.routes.test.js` to test the Express Router in isolation

### 0.1.4 Coverage Requirements Interpretation

- **Explicit coverage targets mentioned by user:** None specified; the user requested "comprehensive" tests, which implies high coverage intent
- **Industry standard for Node.js/Express applications:** 80%+ line and branch coverage is the common baseline for server-side JavaScript
- **Repository baseline:** 0% (no tests exist currently)
- **Critical path analysis:** `server.js` is the entry point and `src/routes/main.routes.js` defines all user-facing behavior — both require near-complete coverage

To achieve comprehensive testing, coverage should include:
- **100% line coverage** on `server.js` (entry point, all console.log statements)
- **100% line coverage** on `src/config/index.js` (all configuration branches including defaults and env var overrides)
- **100% line coverage** on `src/routes/main.routes.js` (both route handlers)
- **100% line coverage** on `src/app.js` (app creation and route mounting)
- **Overall target:** ≥ 90% line coverage, ≥ 85% branch coverage across the entire source tree


## 0.2 Test Discovery and Analysis

### 0.2.1 Existing Test Infrastructure Assessment

A comprehensive repository search was conducted to discover any pre-existing test infrastructure. The investigation employed multiple search strategies: recursive file system scans for `*test*`, `*spec*`, `test_*`, `*_test.*`, `*_spec.*` patterns; directory scans for `__tests__/`, `test/`, `tests/`; and configuration file searches for `jest.config.*`, `.mocharc.*`, `vitest.config.*`, `pytest.ini`, `.coveragerc`.

**Repository analysis reveals zero existing test infrastructure.** The application is a greenfield testing target with the following confirmed findings:

- **No test files found:** The repository contains zero files matching any test naming convention anywhere in the project tree (excluding `node_modules/`)
- **No test directories:** No `__tests__/`, `test/`, or `tests/` directories exist
- **No test configuration files:** No Jest, Mocha, Vitest, or any other test runner configuration files are present
- **Placeholder test script:** The `package.json` `"test"` script is set to `echo "Error: no test specified" && exit 1`, confirming no test framework has been integrated

**Current Testing Framework:** None installed
**Test Runner Configuration:** Not present
**Coverage Tools in Use:** None
**Mock/Stub Libraries:** None
**Test Data Fixtures/Factories:** None

**Source File Inventory (files requiring test coverage):**

| Source File | Lines | Purpose | Test Priority |
|-------------|-------|---------|---------------|
| `server.js` | 75 | HTTP server entry point — calls `app.listen()`, logs startup messages | High |
| `src/app.js` | 28 | Express application factory — creates and configures Express instance | High |
| `src/config/index.js` | 42 | Configuration manager — env var parsing with defaults | High |
| `src/routes/main.routes.js` | 42 | Route handlers — `GET /` and `GET /evening` endpoints | High |
| `src/routes/index.js` | 20 | Route aggregator — barrel pattern re-exports | Medium |

### 0.2.2 Web Search Research Conducted

The following web research was conducted to inform testing tool selection and compatibility:

- **Jest 30 compatibility with Node.js 20:** Confirmed that Jest 30.2.0 supports Node.js 18.x as the minimum version. Node.js 20.19.0 (our runtime) is fully supported. Jest 30 drops support for Node 14, 16, 19, and 21 only.
- **Supertest compatibility with Express 5:** Confirmed that `supertest` 7.2.2 works with Express 5.x. The library accepts an Express app instance or `http.Server` directly, enabling port-free testing through the factory pattern in `src/app.js`.
- **Express 5 default 404 behavior:** Confirmed that Express sends automatic 404 responses for unmatched routes without requiring custom middleware. This is critical for edge case and error handling tests — the default Express handler returns an HTML response with status 404.
- **Jest + supertest integration patterns:** The standard pattern involves importing the Express app (not the server), passing it to `supertest(app)`, and using chained assertions for status codes, headers, and response bodies. This aligns perfectly with the project's factory pattern architecture.
- **Dry-run installation verification:** A `npm install --dry-run` confirmed that Jest 30.2.0 and supertest 7.2.2 can be installed together without dependency conflicts in the current Node.js 20.19.0 / Express 5.1.0 environment.


## 0.3 Testing Scope Analysis

### 0.3.1 Test Target Identification

**Primary code to be tested:**

- **Module: server.js** at `server.js` — requires lifecycle, mocking, and console output tests
  - `app.listen(config.port, config.host, callback)` invocation
  - Console output: `Server running at http://...`, `Application module loaded successfully`, two PR validation log lines
  - Module dependency loading (`require('./src/app')`, `require('./src/config')`)
- **Module: app** at `src/app.js` — requires HTTP integration tests via supertest
  - Express app creation via `express()`
  - Route mounting via `app.use('/', mainRoutes)`
  - Module export of configured app instance
- **Module: config** at `src/config/index.js` — requires environment variable unit tests
  - `host` property: defaults to `'127.0.0.1'`, overrides via `HOST` env var
  - `port` property: defaults to `3000`, overrides via `PORT` env var, `parseInt()` coercion
  - `env` property: defaults to `'development'`, overrides via `NODE_ENV` env var
- **Module: mainRoutes** at `src/routes/main.routes.js` — requires route handler tests
  - `GET /` handler: returns `'Hello, World!\n'` (with trailing newline)
  - `GET /evening` handler: returns `'Good evening'` (no trailing newline)
- **Module: routeIndex** at `src/routes/index.js` — requires export validation test
  - Re-exports `mainRoutes` via barrel pattern

**Existing test file mapping:**

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|------------------------|
| `server.js` | None | None |
| `src/app.js` | None | None |
| `src/config/index.js` | None | None |
| `src/routes/main.routes.js` | None | None |
| `src/routes/index.js` | None | None |

**Dependencies requiring mocking:**

- **`app.listen()` in server.js:** Must be mocked to prevent actual port binding during tests. The `listen` method should be spied on to verify it is called with the correct host, port, and callback arguments.
- **`console.log()` in server.js:** Must be spied on to assert startup log messages are produced in the correct order without cluttering test output.
- **`process.env` in config/index.js:** Must be manipulated (set/clear) per test to validate environment variable parsing and default fallback behavior. Requires careful state cleanup between tests.
- **No external services to mock:** The application has no database connections, external API calls, or third-party service integrations.
- **No file system operations to virtualize:** The application does not read or write files at runtime.

### 0.3.2 Version Compatibility Research

Based on the current Node.js 20.19.0 runtime and Express 5.1.0 framework, the recommended testing stack is:

| Tool | Recommended Version | Rationale |
|------|-------------------|-----------|
| Jest | 30.2.0 | Latest stable release; Node.js 18+ minimum matches our v20.19.0; built-in CommonJS support; built-in mocking and coverage |
| supertest | 7.2.2 | Latest stable release; verified compatible with Express 5.x; supports passing Express app directly without port binding |
| Node.js | 20.19.0 | Already installed; matches project's recommended LTS version from README.md |
| npm | 10.8.2 | Ships with Node.js 20.19.0; used for dependency management |

**Version Conflict Analysis:**
- Jest 30.2.0 bundles its own `@jest/globals` and assertion library — no external assertion library (chai) needed
- supertest 7.2.2 depends on `superagent` and `methods` — no conflicts with Express 5.1.0's dependency tree
- Dry-run installation confirmed: 338 packages would be added, 0 conflicts, only `qs` minor version change (`6.14.0` → `6.14.2`)
- No peer dependency warnings detected

**Key Jest 30 Considerations:**
- Matcher aliases removed (e.g., `toBeCalled` → `toHaveBeenCalled`) — all test code will use canonical matcher names
- ESM wrappers added but CommonJS `require()` continues to work unchanged
- `testEnvironment: 'node'` is the correct setting for this server-side application


## 0.4 Test Implementation Design

### 0.4.1 Test Strategy Selection

**Test types to implement:**

- **Unit tests:** Focus on isolated module behavior for `server.js`, `src/config/index.js`, `src/routes/index.js`, and `src/routes/main.routes.js` — each tested with mocked dependencies where necessary
- **Integration tests:** Cover HTTP request/response cycle using `supertest` against the Express app from `src/app.js`, exercising the full middleware and routing stack without port binding
- **Edge case tests:** Address boundary conditions including undefined routes, unsupported HTTP methods, special characters in URLs, deeply nested paths, oversized URLs, and concurrent request handling
- **Error handling tests:** Verify Express 5's default behavior for 404 (not found), unsupported methods, and general error propagation

### 0.4.2 Test Case Blueprint

```
Component: server.js (HTTP Server Entry Point)
Test Categories:
- Happy path: Module loads without errors; app.listen() called with correct args; startup logs produced
- Edge cases: PORT env var set to non-numeric string; HOST env var is empty string
- Error cases: app.listen() binding failure (port in use); server.close() graceful shutdown
```

```
Component: src/app.js (Application Factory)
Test Categories:
- Happy path: GET / returns 200 with 'Hello, World!\n'; GET /evening returns 200 with 'Good evening'
- Edge cases: HEAD requests to valid routes; multiple concurrent GET requests
- Error cases: GET /nonexistent returns 404; POST/PUT/DELETE to GET-only routes
```

```
Component: src/config/index.js (Configuration Manager)
Test Categories:
- Happy path: Default values returned when no env vars set; env vars override defaults
- Edge cases: PORT as '0'; PORT as float string '3000.5'; empty string env vars
- Error cases: PORT as non-numeric string ('abc'); HOST with special characters
```

```
Component: src/routes/main.routes.js (Route Handlers)
Test Categories:
- Happy path: GET / returns exact 'Hello, World!\n'; GET /evening returns exact 'Good evening'
- Edge cases: Trailing slashes on route paths; case sensitivity of paths
- Error cases: Unsupported HTTP methods on defined routes
```

```
Component: src/routes/index.js (Route Aggregator)
Test Categories:
- Happy path: Exports mainRoutes as a function (Express Router)
- Edge cases: None applicable for barrel module
- Error cases: None applicable for barrel module
```

### 0.4.3 Existing Test Extension Strategy

Not applicable — this is a greenfield testing effort. No existing test files require extension, refactoring, or repair.

### 0.4.4 Test Data and Fixtures Design

**Required test data structures:**
- No persistent test data or database fixtures are needed. All test data is inline within test files (static strings, environment variable values).

**Fixture organization strategy:**
- No separate fixture files required. The application returns static string responses with no data dependencies.

**Mock object specifications:**
- `jest.spyOn(console, 'log')` — captures console output in `server.test.js` to verify startup messages without polluting test output
- `jest.spyOn(app, 'listen')` — intercepts server binding in `server.test.js` to verify arguments and invoke callback without actual port binding
- `process.env` manipulation — direct assignment and deletion of `HOST`, `PORT`, `NODE_ENV` environment variables in `config.test.js` with `beforeEach`/`afterEach` cleanup

**Test database/state management approach:**
- Each test file uses `beforeEach`/`afterEach` hooks to save and restore `process.env` state, ensuring test isolation
- Jest module cache is cleared between tests in `server.test.js` using `jest.resetModules()` to ensure fresh `require()` evaluations
- Supertest manages its own ephemeral server instances automatically when passed an Express app — no manual port management required


## 0.5 Test File Transformation Mapping

### 0.5.1 File-by-File Test Plan

| Target Test File | Transformation | Source File/Reference | Purpose/Changes |
|-----------------|----------------|----------------------|-----------------|
| `__tests__/server.test.js` | CREATE | `server.js` | Unit tests for server lifecycle: `app.listen()` invocation, startup console logs, module loading, graceful shutdown via `.close()`, callback execution |
| `__tests__/app.test.js` | CREATE | `src/app.js` | HTTP integration tests via supertest: response bodies, status codes, headers, 404 for undefined routes, unsupported methods, edge cases |
| `__tests__/config.test.js` | CREATE | `src/config/index.js` | Unit tests for configuration module: default values, `HOST`/`PORT`/`NODE_ENV` env var overrides, `parseInt` coercion, edge cases for invalid PORT values |
| `__tests__/routes/main.routes.test.js` | CREATE | `src/routes/main.routes.js` | Route handler unit tests: exact response body strings, trailing newline verification, response content type validation |
| `__tests__/routes/index.test.js` | CREATE | `src/routes/index.js` | Barrel export validation: ensures `mainRoutes` is exported and is a valid Express Router function |
| `jest.config.js` | CREATE | N/A | Jest configuration: `testEnvironment: 'node'`, `collectCoverage: true`, coverage thresholds, test match patterns |
| `package.json` | UPDATE | `package.json` | Update `"test"` script from placeholder to `"jest --coverage"` and add `devDependencies` for `jest` and `supertest` |

### 0.5.2 New Test Files Detail

- **`__tests__/server.test.js`** — Server lifecycle unit tests
  - Test categories: happy path (module loads, listen called, logs produced), error cases (listen failure), shutdown (server.close callback)
  - Mock dependencies: `jest.spyOn(console, 'log')`, `jest.resetModules()` for fresh require
  - Assertions focus: `app.listen()` called with `(3000, '127.0.0.1', callback)`, console.log called with exact startup message strings, server instance returned from listen is closeable

- **`__tests__/app.test.js`** — HTTP integration tests
  - Test categories: happy path (200 responses on `/` and `/evening`), edge cases (trailing slashes, HEAD requests, concurrent requests, long URLs, special characters in path), error cases (404 for undefined routes, unsupported HTTP methods like POST/PUT/DELETE/PATCH on GET-only routes)
  - Mock dependencies: None — supertest handles ephemeral server binding internally
  - Assertions focus: `response.status`, `response.text`, `response.headers['content-type']`, `response.headers['content-length']`

- **`__tests__/config.test.js`** — Configuration module unit tests
  - Test categories: happy path (defaults: host `'127.0.0.1'`, port `3000`, env `'development'`), env var overrides (`HOST`, `PORT`, `NODE_ENV`), edge cases (PORT as `'0'`, PORT as non-numeric `'abc'`, empty string values)
  - Mock dependencies: Direct `process.env` manipulation with save/restore in `beforeEach`/`afterEach`, `jest.resetModules()` for fresh config require
  - Assertions focus: Strict equality on returned config properties, `typeof` checks for port (number), `NaN` handling for invalid PORT strings

- **`__tests__/routes/main.routes.test.js`** — Route handler tests
  - Test categories: happy path (exact string responses including trailing `\n`), edge cases (response encoding, content-type headers)
  - Mock dependencies: None — uses supertest with Express app mounting the router
  - Assertions focus: Exact string match on `response.text`, content-type includes `text/html`, correct content-length bytes

- **`__tests__/routes/index.test.js`** — Route aggregator tests
  - Test categories: happy path (exports `mainRoutes` as a function)
  - Mock dependencies: None
  - Assertions focus: `typeof mainRoutes === 'function'`, export shape validation

- **`jest.config.js`** — Jest test runner configuration
  - `testEnvironment: 'node'`
  - `testMatch: ['**/__tests__/**/*.test.js']`
  - `collectCoverageFrom: ['server.js', 'src/**/*.js']`
  - `coverageThreshold` global settings for lines, branches, functions, statements

### 0.5.3 Test Configuration Updates

- **`jest.config.js`**: Create new file with `testEnvironment: 'node'`, coverage collection from `server.js` and `src/**/*.js`, threshold enforcement at 90% lines
- **`package.json`**: Update `"test"` script to `"jest --coverage"`, add `jest` and `supertest` to `devDependencies`

### 0.5.4 Cross-File Test Dependencies

- **Shared fixtures:** None required — all test data is inline static strings
- **Mock objects:** `console.log` spy pattern is used in `server.test.js` only; each test file is self-contained
- **Test utilities:** No shared helper functions needed for this test suite size
- **Import updates required:** `__tests__/app.test.js` imports `src/app.js` via `require('../src/app')`; `__tests__/server.test.js` imports `server.js` via `require('../server')` after mocking; `__tests__/config.test.js` imports `src/config/index.js` via `require('../src/config')`
- **Module cache management:** `server.test.js` and `config.test.js` both require `jest.resetModules()` in `beforeEach` to ensure fresh module evaluation when testing different environment variable configurations


## 0.6 Dependency Inventory

### 0.6.1 Testing Dependencies

| Registry | Package Name | Version | Purpose |
|----------|-------------|---------|---------|
| npm | jest | 30.2.0 | Testing framework — test runner, assertion library, mocking, and coverage reporting |
| npm | supertest | 7.2.2 | HTTP assertion library — sends requests to Express app without port binding |

**Version Verification:**
- `jest@30.2.0` confirmed available on npm registry via `npm view jest@30.2.0 version`
- `supertest@7.2.2` confirmed available on npm registry via `npm view supertest@7.2.2 version`
- Dry-run installation verified: 338 packages added, zero conflicts, compatible with Node.js 20.19.0 and Express 5.1.0

**Existing Production Dependencies (unchanged):**

| Registry | Package Name | Version | Purpose |
|----------|-------------|---------|---------|
| npm | express | ^5.1.0 (locked at 5.1.0) | Web application framework — provides app factory, routing, and HTTP server |

**No additional testing utility packages required.** Jest 30 includes built-in:
- Assertion library (`expect` API)
- Mocking utilities (`jest.fn()`, `jest.spyOn()`, `jest.mock()`)
- Module isolation (`jest.resetModules()`, `jest.isolateModules()`)
- Coverage collection and reporting (Istanbul/V8)
- Timer mocking (`jest.useFakeTimers()`)

### 0.6.2 Import Updates

**Test files requiring specific import patterns:**

- `__tests__/server.test.js` — Requires dynamic `require('../server')` inside test blocks after `jest.resetModules()` to ensure fresh module loading per test
- `__tests__/app.test.js` — Static `require('../src/app')` at top of file, passed to `supertest(app)` for HTTP assertions
- `__tests__/config.test.js` — Dynamic `require('../src/config')` inside test blocks after environment variable manipulation and `jest.resetModules()`
- `__tests__/routes/main.routes.test.js` — Static `require('../../src/routes/main.routes')` or tested indirectly via supertest through the app
- `__tests__/routes/index.test.js` — Static `require('../../src/routes')` to validate barrel export shape

**Import pattern for supertest usage:**
```js
const request = require('supertest');
const app = require('../src/app');
```

**Import pattern for module-cache-sensitive tests:**
```js
beforeEach(() => { jest.resetModules(); });
const config = require('../src/config');
```


## 0.7 Coverage and Quality Targets

### 0.7.1 Coverage Metrics

- **Current coverage:** 0% (no test files exist in the repository)
- **Target coverage:** ≥ 90% line coverage, ≥ 85% branch coverage based on industry best practice for Node.js server applications and the user's request for "comprehensive" testing

**Coverage gaps to address (all gaps — greenfield):**

| Source File | Current Coverage | Target Coverage | Focus Areas |
|-------------|-----------------|-----------------|-------------|
| `server.js` | 0% | 100% lines | `app.listen()` call, all four `console.log()` statements, module require paths |
| `src/app.js` | 0% | 100% lines | Express app creation, route mounting, module export |
| `src/config/index.js` | 0% | 100% lines, 100% branches | Default values branch (`||` operators), `parseInt` coercion, all three config properties |
| `src/routes/main.routes.js` | 0% | 100% lines | Both `GET /` and `GET /evening` route handlers |
| `src/routes/index.js` | 0% | 100% lines | Barrel re-export of `mainRoutes` |

**Per-file coverage targets enforced via `jest.config.js`:**

| Metric | Global Threshold |
|--------|-----------------|
| Lines | 90% |
| Branches | 85% |
| Functions | 90% |
| Statements | 90% |

### 0.7.2 Test Quality Criteria

- **Assertion density:** Each test case should contain at least one meaningful assertion; HTTP integration tests should assert both status code AND response body/headers
- **Test isolation:** Every test must be independent and runnable in any order; `beforeEach`/`afterEach` hooks restore `process.env` and clear module caches; no shared mutable state between test cases
- **Performance constraints:** The entire test suite should complete within 10 seconds; supertest operates in-memory without network overhead; no real HTTP port binding in unit tests
- **Maintainability standards:** Descriptive `describe`/`it` block names following the pattern `'[Module] > [scenario] > [expected behavior]'`; grouped by test category (happy path, edge cases, errors)
- **Repository test pattern conventions:** Since no existing patterns exist, establish conventions that serve as the standard for future development — `__tests__/` directory mirroring `src/` structure, `.test.js` suffix, CommonJS `require()` imports


## 0.8 Scope Boundaries

### 0.8.1 Exhaustively In Scope

**New test files:**
- `__tests__/server.test.js` — Server lifecycle unit tests
- `__tests__/app.test.js` — HTTP integration tests via supertest
- `__tests__/config.test.js` — Configuration module unit tests
- `__tests__/routes/main.routes.test.js` — Route handler tests
- `__tests__/routes/index.test.js` — Route aggregator barrel export tests

**Test configuration:**
- `jest.config.js` — Jest runner configuration with coverage settings
- `package.json` — `"test"` script update and `devDependencies` additions

**Source files under test (read-only — not modified):**
- `server.js`
- `src/app.js`
- `src/config/index.js`
- `src/routes/main.routes.js`
- `src/routes/index.js`

### 0.8.2 Explicitly Out of Scope

- **Source code modifications:** No changes to `server.js`, `src/app.js`, `src/config/index.js`, `src/routes/main.routes.js`, or `src/routes/index.js` — tests must work against the existing source code as-is
- **Refactoring beyond testing needs:** No restructuring of the application architecture, module boundaries, or file organization
- **Feature additions:** No new routes, middleware, or functionality added while creating tests
- **End-to-end testing:** No browser-based, Puppeteer, Playwright, or Cypress tests
- **Performance/load testing:** No benchmarking, stress testing, or performance profiling tools
- **CI/CD pipeline integration:** No GitHub Actions, Jenkins, or other CI configuration changes (test command is provided for manual or future CI use)
- **Documentation updates:** No changes to `README.md` or `blitzy/` documentation directory
- **Linting/formatting configuration:** No ESLint, Prettier, or other code quality tool additions
- **TypeScript type definitions:** No `@types/jest` or `@types/supertest` — the project uses plain JavaScript with CommonJS
- **Files in `blitzy/` directory:** All specification and documentation files are read-only reference material
- **Files in `node_modules/`:** Standard exclusion from all test operations


## 0.9 Execution Parameters

### 0.9.1 Testing-Specific Instructions

**Test execution commands:**

| Action | Command |
|--------|---------|
| Run all tests | `npm test` (maps to `jest --coverage`) |
| Run all tests (verbose) | `npx jest --verbose --coverage` |
| Run single test file | `npx jest __tests__/server.test.js` |
| Run tests matching pattern | `npx jest --testPathPattern="app"` |
| Run with coverage report | `npx jest --coverage` |
| Run in CI mode (non-interactive) | `CI=true npx jest --coverage --watchAll=false` |
| Debug a specific test | `node --inspect-brk node_modules/.bin/jest --runInBand __tests__/server.test.js` |

**Test patterns to follow in the repository:**
- All test files reside in `__tests__/` directory, mirroring the `src/` folder structure
- Test files use the `.test.js` suffix (e.g., `server.test.js`, `app.test.js`)
- CommonJS `require()` imports are used throughout (no ESM `import` statements)
- `describe` blocks group tests by module, with nested `describe` blocks for test categories
- `it` blocks use descriptive names: `it('should return 200 and Hello World for GET /', ...)`
- `beforeEach`/`afterEach` hooks manage test state isolation

**Environment setup requirements for tests:**
- Node.js 20.19.0 must be the active runtime
- All dependencies installed via `npm ci` before running tests
- `jest` and `supertest` must be present in `devDependencies`
- No additional environment variables required — tests manage their own `process.env` state
- `testEnvironment: 'node'` in `jest.config.js` (no JSDOM)


## 0.10 Special Instructions for Testing

### 0.10.1 Testing-Specific Requirements

The following directives govern the implementation of the test suite:

- **DO NOT modify source code:** All source files (`server.js`, `src/app.js`, `src/config/index.js`, `src/routes/main.routes.js`, `src/routes/index.js`) must remain untouched. Tests must work against the existing codebase exactly as it is.
- **Use CommonJS exclusively:** All test files must use `require()` / `module.exports` syntax. No ESM `import`/`export` statements, consistent with the project's enforced module system.
- **Leverage the factory pattern for HTTP testing:** The architectural separation between `src/app.js` (exports app) and `server.js` (calls `listen()`) enables testing HTTP behavior via `supertest(app)` without network port binding. This pattern must be the primary approach for all HTTP response, status code, and header tests.
- **Isolate server.js tests with module cache resets:** Since `server.js` executes `app.listen()` and `console.log()` at module load time (top-level side effects), each test must use `jest.resetModules()` before a fresh `require('../server')` to prevent state leakage between tests.
- **Restore process.env after every test:** Tests that manipulate environment variables must save the original values in `beforeEach` and restore them in `afterEach` to ensure complete isolation. Never rely on test execution order.
- **Ensure all tests can run independently:** Each test file and each individual test case must be executable in isolation. Use `--runInBand` flag compatibility but do not require it.
- **Match canonical Jest 30 API:** Use `toHaveBeenCalled()` (not deprecated `toBeCalled()`), `toHaveBeenCalledWith()` (not `toBeCalledWith()`), and other canonical matcher names per Jest 30's breaking changes.
- **Framework choice: Jest 30.2.0:** Selected over Mocha per the user's "Jest or Mocha" option, due to built-in mocking, coverage, and assertions that reduce dependency count and configuration complexity for this CommonJS project.


