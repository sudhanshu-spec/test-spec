# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification


### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create a comprehensive unit test suite from scratch** for the `server.js` entry point and its associated modules in a Node.js/Express.js 5.x "Hello World" application. The repository currently has **zero test coverage** — no test files, no test framework, and no testing infrastructure exist.

**Request Category:** Add new tests (greenfield test implementation)

The user's requirements, restated with enhanced technical clarity:

- **HTTP Response Testing:** Validate that each registered endpoint (`GET /` and `GET /evening`) returns the exact expected response bodies — `'Hello, World!\n'` (14 bytes with trailing newline) and `'Good evening'` (12 bytes without trailing newline), respectively
- **Status Code Testing:** Assert that successful requests return HTTP 200 OK, undefined routes return HTTP 404, and unsupported HTTP methods are handled appropriately
- **Header Testing:** Verify that response headers include correct `Content-Type` (`text/html; charset=utf-8`), `Content-Length`, and Express-standard headers such as `X-Powered-By`
- **Server Startup/Shutdown Testing:** Confirm that `server.js` correctly invokes `app.listen()` with the configured `host` and `port`, logs the expected startup messages, and that the server can be gracefully shut down without dangling connections
- **Error Handling Testing:** Validate behavior for undefined routes (404), malformed requests, and server-level failure scenarios
- **Edge Case Testing:** Cover boundary conditions such as environment variable overrides, `PORT` parsing with non-numeric input, empty and malformed requests, trailing-slash behavior, and concurrent request handling

**Implicit Testing Needs Surfaced:**
- Configuration module (`src/config/index.js`) must be tested for environment variable handling, defaults, and `parseInt` edge cases
- Application factory (`src/app.js`) must be verified to export a properly configured Express instance without starting an HTTP listener
- Route aggregator (`src/routes/index.js`) must be confirmed to correctly re-export route modules via the barrel pattern
- Route handler isolation (`src/routes/main.routes.js`) must be independently testable via Express Router

### 0.1.2 Special Instructions and Constraints

The user specified **"Jest or Mocha"** as the testing framework preference. Based on the analysis of the repository's characteristics — a greenfield CommonJS Node.js application with no existing test tooling — **Jest is recommended** as the primary testing framework for the following reasons:

- Jest provides a batteries-included solution (test runner, assertions, mocking, code coverage) without additional library configuration
- Jest's built-in module mocking (`jest.mock()`) is critical for unit-testing `server.js`, which executes side effects (calling `app.listen()`) at module load time
- The tech spec (Requirement F-004-RQ-004) explicitly references Supertest compatibility, which pairs natively with Jest
- Jest's `--detectOpenHandles` and `--forceExit` flags handle Express server teardown gracefully

**No user-specified constraints** were provided regarding test file organization, naming conventions, or coverage thresholds. The plan adopts community-standard conventions for a Node.js/Express project.

**Web Search Requirements:**
- Verified Jest 30.x compatibility with Node.js 20.19.x (confirmed: Node 18.x+ required)
- Verified Supertest 7.x compatibility with Express 5.x (confirmed: works with any Express app or http.Server)
- Confirmed Jest 30.2.0 as the latest stable release on npm

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- To **test HTTP responses and status codes**, we will create `tests/app.test.js` using Supertest to send HTTP requests directly to the Express app instance exported by `src/app.js`, asserting on response bodies, status codes, and headers without binding to a network port
- To **test server startup/shutdown**, we will create `tests/server.test.js` using Jest's module mocking to intercept `require('./src/app')` and `require('./src/config')`, verifying that `app.listen()` is called with the correct arguments and that `console.log()` outputs the expected startup messages
- To **test error handling**, we will use Supertest to exercise undefined routes (`GET /nonexistent`), unsupported HTTP methods (`POST /`, `PUT /`, `DELETE /`), and verify the application returns appropriate 404 or 405 responses
- To **test edge cases**, we will create `tests/config.test.js` to validate environment variable overrides, `parseInt` boundary conditions on `PORT`, and default value fallback behavior
- To **test route handler isolation**, we will create `tests/routes/main.routes.test.js` to validate each route handler independently by mounting the router in a minimal Express test harness

### 0.1.4 Coverage Requirements Interpretation

No explicit coverage targets were specified by the user. Based on the application's simplicity and industry standards for Node.js/Express projects, the following coverage expectations apply:

- **Target: 90%+ line and branch coverage** — achievable given the small, synchronous codebase with no external service dependencies
- **Critical path coverage: 100%** — all registered route handlers, configuration defaults, and the `app.listen()` server initialization path must be fully covered
- **Error path coverage: 100%** — all reachable error conditions (404 for unknown routes, non-numeric PORT fallback) must be exercised
- **Existing coverage: 0%** — the repository contains no test infrastructure, so all coverage is net-new

To achieve comprehensive testing, coverage should include every exported function, every conditional branch (e.g., `process.env.HOST || '127.0.0.1'`), every route handler callback, and the server's `app.listen()` invocation path.


## 0.2 Test Discovery and Analysis


### 0.2.1 Existing Test Infrastructure Assessment

A comprehensive repository search was conducted to discover any existing test infrastructure. The following search patterns were employed across the entire repository:

- File name patterns: `*test*`, `*spec*`, `test_*`, `spec_*`, `*_test.*`, `*_spec.*`
- Configuration files: `jest.config.*`, `pytest.ini`, `.mocharc.*`, `vitest.config.*`
- Coverage tools: `.nycrc`, `.coveragerc`, `.c8rc`, `.istanbulrc`
- Test directories: `tests/`, `test/`, `__tests__/`, `spec/`

**Discovery Result:** The repository contains **zero test artifacts**. No test files, test configurations, test fixtures, test utilities, or coverage configurations exist anywhere in the repository.

**Repository analysis reveals the following testing landscape:**

| Discovery Area | Finding |
|----------------|---------|
| **Test Files** | None found — no `.test.js`, `.spec.js`, or test directory exists |
| **Test Framework** | Not installed — `package.json` lists no `devDependencies` section |
| **Test Script** | Placeholder only — `"test": "echo \"Error: no test specified\" && exit 1"` in `package.json` |
| **Coverage Tool** | None configured |
| **Mock/Stub Libraries** | None installed |
| **Test Data/Fixtures** | None present |
| **CI Test Integration** | None configured |

**Current testing framework:** None installed
**Test runner configuration location:** None exists — must be created
**Coverage tools in use:** None — must be added
**Mock/stub libraries detected:** None — Jest's built-in mocking will be used
**Test data fixtures or factories present:** None — must be created as needed

### 0.2.2 Source Code Testability Assessment

The application architecture is **highly testable** by design, following key patterns that enable clean unit testing:

| Source Module | Path | Testability Assessment |
|---------------|------|----------------------|
| **Application Factory** | `src/app.js` | Excellent — exports configured Express app without calling `listen()`, enabling direct Supertest integration |
| **Configuration Manager** | `src/config/index.js` | Excellent — pure data module with simple `process.env` reads and defaults |
| **Route Handlers** | `src/routes/main.routes.js` | Excellent — exports Express Router instance, testable in isolation via Supertest |
| **Route Aggregator** | `src/routes/index.js` | Excellent — pure re-export module with no logic |
| **Server Entry Point** | `server.js` | Moderate — executes `app.listen()` at module scope as a side effect; requires Jest module mocking to intercept imports before execution |

The separation of `src/app.js` (Express app configuration) from `server.js` (HTTP binding) is the critical architectural decision that enables unit testing. The tech spec explicitly documents this: the Application Factory (F-004-RQ-003) is required to "Not invoke `listen()` directly" specifically to "Enable unit testing via Supertest" (F-004-RQ-004).

### 0.2.3 Web Search Research Conducted

The following web research was conducted to validate testing tool compatibility and gather best practices:

| Research Topic | Finding | Source |
|----------------|---------|--------|
| **Jest 30.x Node.js compatibility** | Jest 30 requires Node.js 18.x or above; fully compatible with Node.js 20.19.0 | jestjs.io upgrade guide |
| **Jest latest stable version** | 30.2.0, published on npm | npmjs.com/package/jest |
| **Supertest latest version** | 7.2.2, published on npm | npmjs.com/package/supertest |
| **Supertest Express compatibility** | Works with any Express app or `http.Server`; auto-binds to ephemeral port when app is not listening | supertest npm documentation |
| **Express 5.x + Supertest pattern** | Standard pattern: pass `app` instance to `request(app)` — confirmed working with Express 5.x | Community guides and npm docs |
| **Jest `testEnvironment`** | Should be set to `'node'` for server-side testing (not `jsdom`) | Jest documentation |
| **Jest `--detectOpenHandles`** | Required when testing Express servers to catch dangling HTTP connections | Jest best practices |


## 0.3 Testing Scope Analysis


### 0.3.1 Test Target Identification

**Primary code to be tested:**

- **Module:** `server.js` at `/server.js` — requires unit tests for startup lifecycle, `app.listen()` invocation, console logging, and configuration consumption
- **Module:** `src/app.js` at `/src/app.js` — requires integration tests for HTTP response validation, route mounting, status codes, headers, and error handling via Supertest
- **Module:** `src/config/index.js` at `/src/config/index.js` — requires unit tests for default values, environment variable overrides, and `parseInt` edge cases
- **Module:** `src/routes/main.routes.js` at `/src/routes/main.routes.js` — requires unit tests for route handler behavior, response body exactness, and Content-Type validation
- **Module:** `src/routes/index.js` at `/src/routes/index.js` — requires unit tests for barrel export pattern verification

**Functions and behaviors requiring test categories:**

| Function/Behavior | Source Location | Test Categories Needed |
|-------------------|-----------------|----------------------|
| `app.listen(port, host, callback)` | `server.js:62` | Unit (mocked), startup/shutdown |
| `console.log()` startup messages | `server.js:64,68,71,74` | Unit (spy verification) |
| `express()` factory | `src/app.js:17` | Integration (app creation) |
| `app.use('/', mainRoutes)` | `src/app.js:25` | Integration (route mounting) |
| `GET /` handler | `src/routes/main.routes.js:26-28` | HTTP response, status, headers, edge cases |
| `GET /evening` handler | `src/routes/main.routes.js:37-39` | HTTP response, status, headers, edge cases |
| `process.env.HOST \|\| '127.0.0.1'` | `src/config/index.js:26` | Unit (env override, defaults) |
| `parseInt(process.env.PORT, 10) \|\| 3000` | `src/config/index.js:33` | Unit (parsing, NaN fallback, edge cases) |
| `process.env.NODE_ENV \|\| 'development'` | `src/config/index.js:40` | Unit (env override, defaults) |
| `module.exports = { mainRoutes }` | `src/routes/index.js:17-19` | Unit (barrel export) |

**Existing test file mapping:**

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|----------------------|
| `server.js` | None | None |
| `src/app.js` | None | None |
| `src/config/index.js` | None | None |
| `src/routes/main.routes.js` | None | None |
| `src/routes/index.js` | None | None |

**Dependencies requiring mocking:**

- **Module imports in `server.js`:** The `require('./src/app')` and `require('./src/config')` calls must be mocked when unit-testing `server.js` to prevent actual server startup and to control configuration values
- **`process.env` in `src/config/index.js`:** Environment variables must be manipulated in tests to cover override branches; `process.env` will be saved and restored per test
- **`console.log` in `server.js`:** Must be spied upon to verify startup messages without cluttering test output
- **No external services to mock:** The application has zero external dependencies (no databases, no APIs, no file system operations)
- **No database interactions to stub:** The application is stateless
- **No file system operations to virtualize:** All modules are pure code

### 0.3.2 Version Compatibility Research

Based on the current Node.js version 20.19.0 and Express.js 5.1.0, the recommended testing stack is:

| Tool | Recommended Version | Rationale |
|------|-------------------|-----------|
| **Jest** | 30.2.0 | Latest stable; supports Node 18.x+; compatible with Node 20.19.0; provides built-in mocking, assertions, and coverage |
| **Supertest** | 7.2.2 | Latest stable; SuperAgent-driven HTTP testing; auto-binds Express apps to ephemeral ports; compatible with Express 5.x |

**Compatibility verification:**

- **Jest 30.2.0 + Node 20.19.0:** Confirmed compatible. Jest 30 dropped support for Node 14, 16, 19, and 21, with minimum supported version of Node 18.x. Node 20.19.0 (LTS) is fully supported.
- **Supertest 7.2.2 + Express 5.1.0:** Confirmed compatible. Supertest accepts any Express app instance or `http.Server` object. It binds to an ephemeral port internally, requiring no port management in tests.
- **Jest 30.2.0 built-in coverage:** Jest includes `--coverage` flag which uses V8 coverage by default in Jest 30, eliminating the need for separate `istanbul`/`nyc` tools.

**No version conflicts detected.** All recommended packages are mutually compatible and have been verified against the project's runtime version.


## 0.4 Test Implementation Design


### 0.4.1 Test Strategy Selection

**Test types to implement:**

- **Unit tests:** Focus on isolated modules — `server.js` (with mocked dependencies), `src/config/index.js` (environment variable handling), and `src/routes/index.js` (barrel exports). These tests use Jest mocking to completely isolate each module from its dependencies.
- **Integration tests:** Focus on component interactions — `src/app.js` tested via Supertest to validate the full middleware pipeline and route resolution without starting a real HTTP server. This covers HTTP responses, status codes, and headers as a cohesive system.
- **Edge case tests:** Address boundary conditions — non-numeric `PORT` values, missing environment variables, undefined routes (404), unsupported HTTP methods, requests with extra trailing slashes, empty request bodies, and requests to paths with query strings.
- **Error handling tests:** Verify failure scenarios — 404 responses for unknown routes, appropriate handling of non-GET methods on defined routes, and server startup with invalid configuration.

### 0.4.2 Test Case Blueprint

```
Component: server.js (Server Entry Point)
Test Categories:
- Happy path: Server calls app.listen with correct host/port from config; startup logs printed
- Edge cases: Custom config values propagated correctly; callback function is invoked
- Error cases: Verify behavior documentation for listen failures
- Lifecycle: Module-level side effects (console.log statements) are verified
```

```
Component: src/app.js (Application Factory via Supertest)
Test Categories:
- Happy path: GET / returns 'Hello, World!\n' with 200; GET /evening returns 'Good evening' with 200
- Edge cases: Trailing slashes, case sensitivity, query strings on valid routes
- Error cases: GET /nonexistent returns 404; POST/PUT/DELETE on defined routes handled
- Headers: Content-Type is text/html, Content-Length matches body, X-Powered-By present
```

```
Component: src/config/index.js (Configuration Manager)
Test Categories:
- Happy path: Default values (host='127.0.0.1', port=3000, env='development')
- Edge cases: PORT='0' (valid port), PORT='abc' (NaN fallback), PORT='' (empty string)
- Error cases: parseInt returns NaN for non-numeric strings, OR fallback to 3000
- Environment overrides: HOST, PORT, NODE_ENV all respect process.env values
```

```
Component: src/routes/main.routes.js (Route Handlers)
Test Categories:
- Happy path: GET / responds with exact body including trailing newline; GET /evening responds with exact body
- Edge cases: Response body byte-length verification (14 bytes and 12 bytes)
- Headers: Content-Type verification for text responses
```

```
Component: src/routes/index.js (Route Aggregator)
Test Categories:
- Happy path: Exports object with mainRoutes property; mainRoutes is a function (Router)
- Edge cases: No extra properties exported
```

### 0.4.3 Existing Test Extension Strategy

No existing tests to extend, refactor, or fix — this is a completely greenfield test implementation. All test files will be created from scratch using consistent patterns:

- All test files follow the `describe`/`it` block structure
- All HTTP tests use `async/await` with Supertest's promise-based API
- All environment variable tests save and restore `process.env` using `beforeEach`/`afterEach`
- All module-mocking tests use `jest.mock()` with explicit `jest.resetModules()` between tests

### 0.4.4 Test Data and Fixtures Design

**Required test data structures:**

The application is simple enough that no external fixture files are needed. Test data will be defined inline within each test file:

- **Expected response bodies:** `'Hello, World!\n'` and `'Good evening'` — defined as constants within test files
- **Expected configuration defaults:** `{ host: '127.0.0.1', port: 3000, env: 'development' }` — defined inline
- **Environment variable overrides:** Objects like `{ HOST: '0.0.0.0', PORT: '8080', NODE_ENV: 'production' }` — defined inline per test case

**Fixture organization strategy:** Inline fixtures within test files. The application's small scope does not justify a separate `fixtures/` directory.

**Mock object specifications:**

- `server.js` tests require a mock `app` object with a `listen` method implemented as `jest.fn()` and a mock `config` object with controllable `host`, `port`, and `env` properties
- `console.log` will be spied on using `jest.spyOn(console, 'log')` to verify startup messages

**Test database/state management approach:** Not applicable — the application is stateless with no persistence layer. Each test starts with a clean module cache via `jest.resetModules()` where needed.


## 0.5 Test File Transformation Mapping


### 0.5.1 File-by-File Test Plan

| Target Test File | Transformation | Source File/Reference | Purpose/Changes |
|-----------------|----------------|----------------------|-----------------|
| `tests/server.test.js` | CREATE | `server.js` | Unit tests for server entry point: verify `app.listen()` called with correct args, console.log startup messages, module import side effects, and lifecycle behavior using Jest module mocking |
| `tests/app.test.js` | CREATE | `src/app.js` | Integration tests via Supertest: GET / and GET /evening happy-path responses, HTTP status codes, response headers (Content-Type, Content-Length, X-Powered-By), 404 for undefined routes, unsupported HTTP methods, edge cases (trailing slashes, query strings) |
| `tests/config.test.js` | CREATE | `src/config/index.js` | Unit tests for configuration module: default values, HOST/PORT/NODE_ENV environment variable overrides, parseInt edge cases (NaN, empty, zero), OR-fallback branch coverage |
| `tests/routes/main.routes.test.js` | CREATE | `src/routes/main.routes.js` | Unit tests for route handlers: response body exactness (byte-level verification including trailing newline), Content-Type headers, isolated router testing via Supertest on mounted Express Router |
| `tests/routes/index.test.js` | CREATE | `src/routes/index.js` | Unit tests for route aggregator: barrel export verification, mainRoutes property existence and type, no extraneous exports |
| `package.json` | UPDATE | `package.json` | Update test script from placeholder to `jest --detectOpenHandles --forceExit`, add `devDependencies` for jest and supertest, add Jest configuration section |
| `jest.config.js` | CREATE | N/A | Jest configuration: testEnvironment node, coverage thresholds, test path patterns, verbose output |

### 0.5.2 New Test Files Detail

- **`tests/server.test.js`** — Server entry point unit tests
  - Test categories: happy path (listen called correctly), edge cases (custom config values), lifecycle (console messages)
  - Mock dependencies: `jest.mock('./src/app')` returns mock app with `listen` as `jest.fn()`; `jest.mock('./src/config')` returns controllable config object
  - Assertions focus: Verify `app.listen` called once with `(config.port, config.host, callback)`, verify console.log called with correct startup messages, verify callback invocation triggers the "Server running at" log

- **`tests/app.test.js`** — Express application integration tests
  - Test categories: happy path (200 responses), error cases (404, method not allowed), headers (Content-Type, Content-Length), edge cases (trailing slash, query strings, case sensitivity)
  - Mock dependencies: None — uses real `src/app.js` with Supertest
  - Assertions focus: `expect(response.status).toBe(200)`, `expect(response.text).toBe('Hello, World!\n')`, `expect(response.headers['content-type']).toMatch(/text\/html/)`, 404 status for undefined routes

- **`tests/config.test.js`** — Configuration module unit tests
  - Test categories: happy path (defaults), edge cases (PORT parsing), environment override (all three variables)
  - Mock dependencies: Direct manipulation of `process.env` with save/restore pattern
  - Assertions focus: `expect(config.host).toBe('127.0.0.1')`, `expect(config.port).toBe(3000)`, `expect(config.env).toBe('development')`, override assertions for custom values

- **`tests/routes/main.routes.test.js`** — Route handler unit tests
  - Test categories: happy path (correct bodies), edge cases (byte-length verification, trailing newline presence/absence)
  - Mock dependencies: None — mounts router on minimal Express app for Supertest
  - Assertions focus: Exact response body matching, `Buffer.byteLength` verification, Content-Type header validation

- **`tests/routes/index.test.js`** — Route aggregator unit tests
  - Test categories: happy path (export shape validation)
  - Mock dependencies: None
  - Assertions focus: `expect(routes).toHaveProperty('mainRoutes')`, `expect(typeof routes.mainRoutes).toBe('function')`, `expect(Object.keys(routes)).toHaveLength(1)`

### 0.5.3 Test Configuration Updates

- **`jest.config.js`:** Create with `testEnvironment: 'node'`, `roots: ['<rootDir>/tests']`, `testMatch: ['**/*.test.js']`, `collectCoverageFrom: ['server.js', 'src/**/*.js']`, `coverageDirectory: 'coverage'`, `coverageThreshold` global targets, and `verbose: true`
- **`package.json` test script:** Update from `"echo \"Error: no test specified\" && exit 1"` to `"jest --detectOpenHandles --forceExit"` — the `--detectOpenHandles` flag ensures any unclosed server handles are reported, and `--forceExit` ensures the Jest process terminates cleanly even if Express listeners are not fully closed
- **`package.json` coverage script:** Add `"test:coverage": "jest --coverage --detectOpenHandles --forceExit"` for generating coverage reports

### 0.5.4 Cross-File Test Dependencies

- **Shared fixtures:** No shared fixture files required — all test data is inline. The Express `app` instance from `src/app.js` is imported directly in `tests/app.test.js` and `tests/routes/main.routes.test.js`
- **Mock objects:** The mock `app` with `jest.fn()` listen method is defined locally within `tests/server.test.js`; no shared mock modules needed
- **Test utilities:** No shared helper functions are necessary given the application's limited scope
- **Import dependencies across test files:**
  - `tests/app.test.js` → imports `src/app.js` and `supertest`
  - `tests/server.test.js` → uses `jest.mock()` for `./src/app` and `./src/config`, then `require('./server.js')` after mocking
  - `tests/config.test.js` → uses `jest.resetModules()` and re-requires `src/config/index.js` per test to pick up fresh `process.env` state
  - `tests/routes/main.routes.test.js` → imports `src/routes/main.routes.js`, creates minimal Express app for mounting the router, and uses Supertest
  - `tests/routes/index.test.js` → imports `src/routes/index.js` directly


## 0.6 Dependency Inventory


### 0.6.1 Testing Dependencies

All testing packages required for this exercise, with exact names and verified versions:

| Registry | Package Name | Version | Purpose |
|----------|-------------|---------|---------|
| npm | `jest` | 30.2.0 | Testing framework — test runner, assertions (`expect`), module mocking (`jest.mock`), spying (`jest.spyOn`), and built-in code coverage (V8-based) |
| npm | `supertest` | 7.2.2 | HTTP assertions library — SuperAgent-driven testing of Express apps; auto-binds to ephemeral ports; chainable `.expect()` API for status, headers, and body validation |

**Version verification:**
- `jest@30.2.0` — confirmed as the latest stable version on npm; requires Node.js 18.x+, which is satisfied by the project's Node.js 20.19.0 runtime
- `supertest@7.2.2` — confirmed as the latest stable version on npm; compatible with any Express application or `http.Server` instance

**No additional packages required.** Jest 30 includes built-in coverage reporting (via V8 coverage provider), making separate tools like `istanbul`, `nyc`, or `c8` unnecessary. Jest's built-in `jest.fn()`, `jest.mock()`, and `jest.spyOn()` eliminate the need for standalone mocking libraries like `sinon` or `jest-mock-extended`.

**Installation command:**
```bash
npm install --save-dev jest@30.2.0 supertest@7.2.2
```

### 0.6.2 Import Updates

Since no existing test files exist, there are no import transformations required. All test files will be created with correct imports from the start:

- `tests/app.test.js`:
  - `const request = require('supertest');`
  - `const app = require('../src/app');`

- `tests/server.test.js`:
  - `jest.mock('../src/app');` (before any `require`)
  - `jest.mock('../src/config');`

- `tests/config.test.js`:
  - Fresh `require('../src/config')` after `jest.resetModules()` per test

- `tests/routes/main.routes.test.js`:
  - `const request = require('supertest');`
  - `const express = require('express');`
  - `const mainRouter = require('../../src/routes/main.routes');`

- `tests/routes/index.test.js`:
  - `const routes = require('../../src/routes');`


## 0.7 Coverage and Quality Targets


### 0.7.1 Coverage Metrics

- **Current coverage:** 0% — no tests or coverage tooling exist in the repository
- **Target coverage:** 90%+ overall, based on industry best practices for small, deterministic Node.js applications with no external dependencies

**Coverage gaps to address (from 0% baseline):**

| Source File | Current Coverage | Target Coverage | Focus Areas |
|-------------|-----------------|-----------------|-------------|
| `server.js` | 0% | 90%+ | `app.listen()` invocation, callback execution, console.log outputs |
| `src/app.js` | 0% | 100% | Express factory creation, route mounting, module export |
| `src/config/index.js` | 0% | 100% | All three environment variable branches (set vs. default), `parseInt` conversion |
| `src/routes/main.routes.js` | 0% | 100% | Both GET handlers, response body correctness, router creation |
| `src/routes/index.js` | 0% | 100% | Barrel export, `mainRoutes` property |

**Per-file branch coverage notes:**

- `src/config/index.js` has 6 branches (3 OR-expressions × 2 paths each: env var set vs. default). All 6 branches must be covered by testing with and without environment variables.
- `server.js` has 1 branch within the `app.listen` callback. The callback branch is covered by triggering the mocked listen callback.
- `src/app.js`, `src/routes/main.routes.js`, and `src/routes/index.js` have no conditional branches — 100% line coverage implies 100% branch coverage.

### 0.7.2 Test Quality Criteria

- **Assertion density:** Each test case should contain at least 1 meaningful assertion; HTTP integration tests should typically assert 2-3 properties per test (status + body, or status + header + body)
- **Test isolation:** Every test must run independently — no shared mutable state between tests; `jest.resetModules()` used for module-level isolation; `process.env` saved/restored per test
- **Performance constraints:** The entire test suite should execute in under 5 seconds given the application's trivial complexity; no network calls, no database access, no I/O beyond module loading
- **Maintainability standards:**
  - Each test has a descriptive name that documents the expected behavior
  - Tests are organized in `describe` blocks grouped by component and scenario
  - Magic strings (response bodies, config defaults) are defined as named constants
  - Test structure follows Arrange-Act-Assert pattern consistently
- **Repository test patterns and conventions:** Since no existing patterns exist, the tests will establish the project's canonical test conventions — `tests/` directory at project root, `*.test.js` naming, Jest with `testEnvironment: 'node'`, Supertest for HTTP assertions


## 0.8 Scope Boundaries


### 0.8.1 Exhaustively In Scope

**New test files:**
- `tests/server.test.js` — server entry point unit tests with mocked dependencies
- `tests/app.test.js` — Express application integration tests via Supertest (HTTP responses, status codes, headers, error handling, edge cases)
- `tests/config.test.js` — configuration module unit tests (defaults, overrides, parsing)
- `tests/routes/main.routes.test.js` — route handler isolation tests via Supertest
- `tests/routes/index.test.js` — route aggregator barrel export verification

**Test configuration:**
- `jest.config.js` — Jest configuration (testEnvironment, coverage settings, test paths)
- `package.json` — Updated test script and new devDependencies (jest, supertest)

**Test utilities and helpers:**
- No shared test utility files required — all helpers are inline per test file

**Documentation updates:**
- No documentation updates required as part of this testing task

### 0.8.2 Explicitly Out of Scope

- **Source code modifications:** No changes to `server.js`, `src/app.js`, `src/config/index.js`, `src/routes/main.routes.js`, or `src/routes/index.js` — all source modules are testable as-is without modification
- **Refactoring beyond testing needs:** No restructuring of the application architecture, module patterns, or Express configuration
- **Feature additions:** No new routes, middleware, error handlers, or application functionality added while implementing tests
- **Unrelated test files:** No tests for `node_modules/`, build tooling, or documentation content
- **Performance optimizations:** No performance tuning, profiling, or benchmarking beyond test execution speed validation
- **CI/CD pipeline configuration:** No GitHub Actions, Jenkins, or other CI configuration changes (this may be recommended separately but is outside the scope of this testing task)
- **End-to-end testing:** No browser-based or full-stack E2E tests; Supertest integration tests are the highest level of testing in scope
- **Security testing:** No penetration testing, dependency vulnerability scanning, or security-focused test cases beyond standard HTTP response validation
- **`blitzy/` directory:** Documentation and specification files in the `blitzy/` folder are not modified or tested
- **`README.md`:** No updates to the project README as part of this testing task


## 0.9 Execution Parameters


### 0.9.1 Testing-Specific Instructions

**Test execution command:**
```bash
npx jest --detectOpenHandles --forceExit
```

**Coverage measurement command:**
```bash
npx jest --coverage --detectOpenHandles --forceExit
```

**Single test file execution pattern:**
```bash
npx jest tests/app.test.js --detectOpenHandles --forceExit
```

**Verbose output with test names:**
```bash
npx jest --verbose --detectOpenHandles --forceExit
```

**Debug mode execution:**
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/app.test.js
```

**Specific test patterns to follow in the repository:**
- All test files reside in the `tests/` directory at the project root, mirroring the source structure where applicable (e.g., `tests/routes/` maps to `src/routes/`)
- Test file naming follows `<module-name>.test.js` convention
- Jest's `testEnvironment: 'node'` is mandatory for all tests — no DOM/browser environment
- The `--detectOpenHandles` flag is always included to catch any unclosed HTTP server handles from Supertest
- The `--forceExit` flag ensures the Jest process terminates even if asynchronous teardown is incomplete

**Excluded test categories:** None — all test types (unit, integration, edge case, error handling) are in scope.

**Environment setup requirements for tests:**
- Node.js 20.19.0 (LTS) must be the active runtime
- `npm ci` must be run before test execution to install project dependencies
- `npm install --save-dev jest@30.2.0 supertest@7.2.2` must be executed to install test dependencies
- No environment variables are required for test execution — tests manage their own `process.env` state
- No database, cache, or external service must be running


## 0.10 Special Instructions for Testing


### 0.10.1 Testing-Specific Requirements

The following testing-specific requirements are derived from the user's directive and the application's architectural characteristics:

- **DO NOT modify source code:** All five source modules (`server.js`, `src/app.js`, `src/config/index.js`, `src/routes/main.routes.js`, `src/routes/index.js`) must remain unmodified. The application factory pattern already enables clean testing without any source changes.
- **Test the `app` directly for HTTP behavior:** Use `src/app.js` (the Express application instance) with Supertest for all HTTP response, status code, and header tests. Do not import `server.js` for HTTP tests, as it triggers `app.listen()` as a module-level side effect.
- **Mock `server.js` dependencies for lifecycle tests:** When testing `server.js` itself, use `jest.mock()` to replace `./src/app` and `./src/config` with controlled mocks before `require('./server.js')` executes. This prevents actual port binding during test execution.
- **Isolate `process.env` mutations:** Configuration tests in `tests/config.test.js` must save the original `process.env` state in `beforeEach` and restore it in `afterEach` to prevent cross-test contamination. Use `jest.resetModules()` before each test to force a fresh `require()` of the config module.
- **Use `--detectOpenHandles --forceExit` flags:** Always include these Jest flags to prevent test hangs caused by Express server handles that may not be fully closed by Supertest.
- **Maintain test isolation and parallel safety:** All tests must run independently, in any order, and with no shared mutable state. Jest runs test files in parallel by default; ensure no port conflicts or global state leaks.
- **Match existing code style:** Tests should follow the same CommonJS (`require`/`module.exports`) pattern used throughout the source code. Use `'use strict';` where consistent with source files. Use single-quoted strings matching the source code convention.
- **Verify byte-level response accuracy:** The `GET /` endpoint must return exactly `'Hello, World!\n'` (14 bytes with trailing newline) and the `GET /evening` endpoint must return exactly `'Good evening'` (12 bytes without trailing newline). Tests must verify these at the byte level to maintain behavioral parity documented in the tech spec (Requirements F-001-RQ-002, F-001-RQ-003, F-002-RQ-002, F-002-RQ-003).


