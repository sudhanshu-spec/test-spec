# Technical Specification

# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification


### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create a comprehensive unit test suite from scratch** for the `hello_world` Express.js 5 application centered on `server.js` and its constituent modules. The project currently has zero test infrastructure — no test framework, no test files, no devDependencies, and a placeholder test script that exits with an error.

**Request Category:** Add new tests (greenfield test suite creation)

The user's requirements explicitly enumerate the following testing concerns:

- **HTTP Responses** — Verify that each endpoint (`GET /` and `GET /evening`) returns the correct response body, including exact string matching with attention to trailing newlines
- **Status Codes** — Confirm that valid routes return `200 OK` and unregistered routes/methods yield appropriate `404` responses from Express 5's default error handling
- **Headers** — Assert that response headers such as `Content-Type`, `Content-Length`, and Express-standard headers (`X-Powered-By`) are correctly set
- **Server Startup/Shutdown** — Test the HTTP server lifecycle managed by `server.js`, including the `app.listen()` binding callback and graceful handling of port conflicts
- **Error Handling** — Validate behavior under fault conditions including invalid routes, unsupported HTTP methods, malformed requests, and configuration edge cases
- **Edge Cases** — Cover boundary conditions in the configuration module (invalid `PORT` values, missing environment variables) and route handler behavior under unusual inputs

**Implicit testing needs surfaced through code analysis:**

- Configuration module (`src/config/index.js`) defaults and environment variable override logic, including `parseInt` behavior with non-numeric `PORT` values
- Factory pattern validation — ensuring `src/app.js` exports a proper Express application instance without initiating network binding
- Route aggregator integrity — confirming the barrel export pattern in `src/routes/index.js` correctly surfaces the `mainRoutes` router
- Express 5-specific behaviors such as async error propagation and revised path matching semantics

### 0.1.2 Special Instructions and Constraints

The user's requirement specifies **"Jest or Mocha"** as the testing framework. Based on analysis of the project characteristics:

- The project uses **CommonJS modules** (`require`/`module.exports`), which provides seamless Jest compatibility without ESM configuration
- The tech spec (Section 6.6.3.1) explicitly recommends **Jest** as the primary framework
- Jest provides built-in assertion library, mocking utilities, and coverage reporting — eliminating the need for additional packages like Chai or nyc required by Mocha
- **Decision: Jest 29.7.0** is selected as the testing framework for maximum stability with the current Node.js 20.x runtime

No additional special directives were provided by the user. The following conventions are inferred from the codebase:

- Follow `'use strict'` pragma convention present in `server.js`
- Use JSDoc-style documentation comments consistent with all source modules
- Adopt `describe`/`test` block naming patterns that mirror the module documentation headers
- Test file naming follows `*.test.js` suffix convention per tech spec Section 6.6.10

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- To **test HTTP responses**, we will create `tests/integration/app.test.js` using Supertest to issue requests against the Express app factory exported from `src/app.js` and assert exact response body strings
- To **test status codes**, we will extend `tests/integration/app.test.js` with assertions for `200` on valid routes and `404` on undefined routes and unsupported HTTP methods
- To **test headers**, we will add Supertest `.expect()` chains that validate `Content-Type: text/html; charset=utf-8` and verify presence/absence of `X-Powered-By`
- To **test server startup/shutdown**, we will create `tests/unit/server.test.js` that mocks `app.listen()` to verify the startup callback fires and logs the expected console message
- To **test error handling**, we will create test cases in `tests/integration/app.test.js` for 404 handling on undefined routes and unsupported HTTP methods
- To **test edge cases**, we will create `tests/unit/config.test.js` to exercise configuration defaults, environment variable overrides, and `parseInt` edge cases with invalid port values
- To **test route architecture**, we will create `tests/unit/routes.test.js` to verify the router exports and route registration patterns

### 0.1.4 Coverage Requirements Interpretation

No explicit coverage targets were specified by the user. Based on the tech spec Section 6.6.6.1 recommended thresholds and the project's small codebase (181 total lines of code across 5 modules):

- **Line Coverage Target:** ≥ 80% — achievable given the minimal branching in route handlers
- **Branch Coverage Target:** ≥ 75% — primarily driven by the ternary/fallback logic in `src/config/index.js`
- **Function Coverage Target:** ≥ 90% — all 8 testable functions across the codebase should be exercised
- **Statement Coverage Target:** ≥ 80% — comprehensive execution of all code paths

To achieve comprehensive testing, coverage should include:

- All three configuration property exports (`host`, `port`, `env`) with both default and overridden values
- Both route handler functions (`GET /` and `GET /evening`)
- The Express app factory function in `src/app.js`
- The route aggregator export in `src/routes/index.js`
- The server startup logic in `server.js` (via mocking)


## 0.2 Test Discovery and Analysis


### 0.2.1 Existing Test Infrastructure Assessment

A comprehensive repository search was conducted to identify any existing test infrastructure. The following search patterns were executed across the project root at `/tmp/blitzy/test-spec/050126/`:

- `*test*`, `*spec*`, `test_*`, `spec_*`, `*_test.*`, `*_spec.*` — **zero matches** (excluding `node_modules`)
- `jest.config.*`, `jest.setup.*`, `.babelrc`, `mocharc.*`, `vitest.*` — **zero matches**
- `__tests__/`, `__mocks__/`, `tests/`, `test/` directories — **none exist**

**Repository analysis reveals a completely greenfield testing environment with no framework, configuration, or test files present.**

| Infrastructure Element | Status | Evidence |
|------------------------|--------|----------|
| Test framework installed | ❌ Not present | `package.json` has no `devDependencies` field |
| Test runner configuration | ❌ Not present | No `jest.config.js`, `.mocharc.*`, or `vitest.config.*` found |
| Test script | ❌ Placeholder only | `"test": "echo \"Error: no test specified\" && exit 1"` in `package.json` |
| Test files | ❌ None exist | `find . -name "*test*" -o -name "*spec*"` returns zero results |
| Coverage tools | ❌ Not configured | No Istanbul/nyc/c8 configuration files |
| Mock/stub libraries | ❌ Not installed | No mock libraries in dependencies |
| Test data fixtures | ❌ Not present | No fixture files or directories |
| CI/CD test automation | ❌ Not configured | No GitHub Actions, Jenkins, or pipeline configuration |

**Testability design patterns detected in the existing codebase:**

| Pattern | Location | Testing Benefit |
|---------|----------|-----------------|
| Factory Pattern | `src/app.js` | Exports Express app without calling `listen()`, enabling Supertest to bind ephemeral ports |
| Configuration Separation | `src/config/index.js` | Environment variables can be manipulated per-test via `process.env` |
| Route Modularization | `src/routes/main.routes.js` | Routes use `express.Router()` and can be tested independently |
| Server/App Separation | `server.js` vs `src/app.js` | Network binding is isolated from application logic |
| Barrel Export | `src/routes/index.js` | Centralized route aggregation enables focused mocking |

The factory pattern in `src/app.js` is the critical architectural enabler for unit testing — the module header explicitly documents: *"Design pattern: Factory pattern - creates configured Express app enabling unit testing without starting the actual server."*

### 0.2.2 Web Search Research Conducted

The following research was conducted to validate technology choices and identify best practices:

| Research Topic | Key Finding | Source |
|----------------|-------------|--------|
| Jest 30 compatibility with Node 20 | Jest 30.2.0 is the latest version; minimum Node 18.x supported; some performance regression reports on larger codebases | jestjs.io/blog, npmjs.com/package/jest |
| Jest 29 stability | Jest 29.7.0 is the final 29.x release; supports Node 14.15, 16.10, 18.0+; battle-tested and widely adopted | jestjs.io/docs/upgrading-to-jest29 |
| Supertest + Express 5 | Supertest 7.2.2 is the latest version; confirmed compatible with Express 5 applications; supports passing Express app directly to `request()` | npmjs.com/package/supertest, bhdouglass.com |
| Express 5 testing patterns | Express 5 app/server separation pattern is the recommended approach; Supertest handles ephemeral port binding automatically | expressjs.com, various testing guides |
| Jest with CommonJS modules | Jest natively supports CommonJS without additional configuration; no transform or ESM shims required | jestjs.io documentation |
| Environment variable mocking in Jest | `process.env` can be directly manipulated in `beforeEach`/`afterEach` blocks; `jest.resetModules()` enables fresh `require()` calls to re-evaluate config modules | JavaScript testing best practices |


## 0.3 Testing Scope Analysis


### 0.3.1 Test Target Identification

**Primary code to be tested:**

| Module/File | Path | Test Type Required | Complexity |
|-------------|------|-------------------|------------|
| HTTP Server Entry Point | `server.js` | Unit tests (mocked `listen`) | Low |
| Express App Factory | `src/app.js` | Integration tests (via Supertest) | Low |
| Configuration Module | `src/config/index.js` | Unit tests (env var manipulation) | Low |
| Route Aggregator | `src/routes/index.js` | Unit tests (export verification) | Trivial |
| Main Route Handlers | `src/routes/main.routes.js` | Integration tests (via Supertest) | Low |

**Functions and exports requiring test categories:**

| Function/Export | Location | Test Categories |
|-----------------|----------|-----------------|
| `app.listen(port, host, callback)` | `server.js` line 51 | Happy path startup, callback verification, console output |
| `module.exports = app` (Express instance) | `src/app.js` line 26 | Factory returns valid Express app, routes mounted correctly |
| `module.exports.host` | `src/config/index.js` line 27 | Default value, env override |
| `module.exports.port` | `src/config/index.js` line 33 | Default value, env override, parseInt edge cases |
| `module.exports.env` | `src/config/index.js` line 39 | Default value, env override |
| `module.exports = { mainRoutes }` | `src/routes/index.js` line 18 | Export existence, correct reference |
| `router.get('/', handler)` | `src/routes/main.routes.js` line 29 | Response body, status, headers |
| `router.get('/evening', handler)` | `src/routes/main.routes.js` line 38 | Response body, status, headers |

**Existing test file mapping:**

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|------------------------|
| `server.js` | None | None |
| `src/app.js` | None | None |
| `src/config/index.js` | None | None |
| `src/routes/index.js` | None | None |
| `src/routes/main.routes.js` | None | None |

**Dependencies requiring mocking:**

| Dependency | Mock Strategy | Rationale |
|------------|---------------|-----------|
| `app.listen()` in `server.js` | `jest.mock('./src/app')` to return mock app with `.listen()` spy | Prevents actual network binding during unit tests |
| `console.log` in `server.js` | `jest.spyOn(console, 'log')` | Captures startup message without terminal output |
| `process.env` in config tests | Direct property assignment with cleanup in `afterEach` | Tests environment variable fallback logic |
| `require('./src/config')` | `jest.resetModules()` between tests | Forces re-evaluation of module-level `process.env` reads |

### 0.3.2 Version Compatibility Research

Based on the project's runtime (Node.js 20.20.0), framework (Express 5.1.0), and module system (CommonJS), the following testing stack is recommended:

| Tool | Recommended Version | Compatibility Basis |
|------|-------------------|---------------------|
| **Jest** | 29.7.0 | Final 29.x release; supports Node 14.15+ through 22.x; native CommonJS support; zero-config for this project; tech spec Section 6.6.3.1 recommends `^29.x` |
| **Supertest** | 7.2.2 | Latest stable; SuperAgent-driven HTTP assertions; confirmed Express 5 compatibility; accepts Express app instances directly via `request(app)` |

**Why Jest 29.7.0 over Jest 30.x:**

| Consideration | Jest 29.7.0 | Jest 30.2.0 |
|---------------|-------------|-------------|
| Stability | Battle-tested final release | Newer, some reported regressions |
| Node 20 support | ✅ Full support | ✅ Full support |
| CommonJS support | ✅ Native | ✅ Native |
| Breaking changes | None (mature) | Removed matcher aliases, new glob engine |
| Tech spec alignment | ✅ Matches `^29.x` recommendation | Exceeds recommended range |
| Risk level | Low | Low-Medium |

**Why Supertest 7.2.2:**

| Consideration | Detail |
|---------------|--------|
| Express 5 support | Supertest accepts any `http.Server` or Express app function; Express 5 app instances work identically to Express 4 for this purpose |
| Ephemeral port binding | Supertest automatically binds to an unused port when passed an app that is not already listening, eliminating port conflict issues |
| Assertion chaining | Provides `.expect(status)`, `.expect(header, value)`, and `.expect(body)` for clean, readable test assertions |
| Framework agnostic | Works with Jest, Mocha, or any test runner — assertions are Promise-based |

**Version conflict assessment:** No conflicts detected. Jest 29.7.0 and Supertest 7.2.2 have no overlapping or incompatible transitive dependencies with Express 5.1.0.


## 0.4 Test Implementation Design


### 0.4.1 Test Strategy Selection

**Test types to implement:**

- **Unit tests** — Focus on isolated modules: configuration defaults/overrides (`src/config/index.js`), server startup behavior (`server.js` with mocked dependencies), route aggregator exports (`src/routes/index.js`), and individual router registration (`src/routes/main.routes.js`)
- **Integration tests** — Cover the full HTTP request/response cycle via Supertest against the Express app factory (`src/app.js`), validating route handler responses, status codes, headers, and Express 5 default error behavior
- **Edge case tests** — Address boundary conditions including non-numeric `PORT` values, undefined environment variables, requests to unregistered paths, unsupported HTTP methods, and empty/malformed request paths
- **Error handling tests** — Verify Express 5's built-in 404 handler for undefined routes, method-not-allowed scenarios, and validate that no unhandled exceptions escape the application

### 0.4.2 Test Case Blueprint

**Component: `src/config/index.js` (Configuration Module)**

```
Component: Configuration Module
Test File: tests/unit/config.test.js
Test Categories:
- Happy path: Default values returned when no env vars set (host='127.0.0.1', port=3000, env='development')
- Happy path: Custom values honored when env vars are set (HOST, PORT, NODE_ENV)
- Edge cases: PORT set to non-numeric string ('abc') → parseInt returns NaN, fallback to 3000
- Edge cases: PORT set to '0' → parseInt returns 0 (falsy), fallback to 3000
- Edge cases: PORT set to negative value → parseInt returns negative number
- Edge cases: PORT set to float string ('3000.5') → parseInt truncates to 3000
- Edge cases: Empty string env vars → fallback to defaults via || operator
```

**Component: `src/app.js` (Express App Factory)**

```
Component: Express App Factory
Test File: tests/unit/app.test.js
Test Categories:
- Happy path: Exports a valid Express application object with expected properties
- Happy path: Application has routes mounted at '/' and '/evening'
- Edge cases: Exported object is a function (Express apps are callable)
- Error cases: Application handles requests to undefined routes with 404
```

**Component: `server.js` (HTTP Server Entry Point)**

```
Component: HTTP Server Entry Point
Test File: tests/unit/server.test.js
Test Categories:
- Happy path: Calls app.listen with configured port and host
- Happy path: Startup callback logs correct URL to console
- Edge cases: Console message includes configured host and port values
- Error cases: Module requires dependencies correctly
```

**Component: `src/routes/main.routes.js` (Route Handlers) — via Integration**

```
Component: Route Handlers (Integration)
Test File: tests/integration/app.integration.test.js
Test Categories:
- Happy path: GET / returns 200 with 'Hello, World!\n'
- Happy path: GET /evening returns 200 with 'Good evening'
- Headers: GET / includes Content-Type: text/html; charset=utf-8
- Headers: GET /evening includes Content-Type: text/html; charset=utf-8
- Error cases: GET /nonexistent returns 404
- Error cases: POST / returns 404 (method not registered on router)
- Error cases: PUT /evening returns 404
- Edge cases: GET / with query parameters still returns correct response
- Edge cases: GET /evening with trailing slash behavior
```

**Component: `src/routes/index.js` (Route Aggregator)**

```
Component: Route Aggregator
Test File: tests/unit/routes.test.js
Test Categories:
- Happy path: Exports object containing mainRoutes property
- Happy path: mainRoutes is a valid Express Router instance (function)
- Edge cases: No extra unexpected exports present
```

### 0.4.3 Existing Test Extension Strategy

This is a greenfield test implementation — no existing tests to extend, refactor, or fix. All test files listed in Section 0.5 are net-new creations.

| Action | Detail |
|--------|--------|
| Tests to extend | None — no existing test files |
| Tests to refactor | None — no legacy test patterns |
| Tests to fix | None — no broken tests |
| Tests to deprecate | None — no obsolete test infrastructure |

### 0.4.4 Test Data and Fixtures Design

**Required test data structures:**

Given the stateless nature of the application (no database, no persistent storage, no user input processing), test data requirements are minimal:

| Data Type | Content | Usage |
|-----------|---------|-------|
| Expected response bodies | `'Hello, World!\n'`, `'Good evening'` | Assertion comparison in integration tests |
| Environment variable sets | `{ HOST: '0.0.0.0', PORT: '8080', NODE_ENV: 'production' }` | Configuration override tests |
| Invalid port values | `'abc'`, `''`, `'0'`, `'-1'`, `'3000.5'` | Edge case tests for parseInt behavior |

**Fixture organization strategy:**

No dedicated fixture files are needed for this project. Test data is sufficiently small to be defined inline within each test file. Environment variable manipulation uses direct `process.env` assignment with `beforeEach`/`afterEach` cleanup patterns.

**Mock object specifications:**

| Mock | Target | Implementation |
|------|--------|----------------|
| App mock | `./src/app` in `server.test.js` | `jest.mock('./src/app')` returning object with `listen: jest.fn()` |
| Config mock | `./src/config` in `server.test.js` | `jest.mock('./src/config')` returning `{ host: '127.0.0.1', port: 3000, env: 'test' }` |
| Console spy | `console.log` | `jest.spyOn(console, 'log').mockImplementation(() => {})` |

**Test state management approach:**

- Each test file uses `beforeEach`/`afterEach` hooks to save and restore `process.env` state
- `jest.resetModules()` is called between configuration tests to force fresh module evaluation
- No shared mutable state between test suites
- Tests are designed to run independently and in any order


## 0.5 Test File Transformation Mapping


### 0.5.1 File-by-File Test Plan

| Target Test File | Transformation | Source File/Reference | Purpose/Changes |
|-----------------|----------------|----------------------|-----------------|
| `tests/unit/config.test.js` | CREATE | `src/config/index.js` | Unit tests for configuration defaults, environment variable overrides, and parseInt edge cases for PORT |
| `tests/unit/app.test.js` | CREATE | `src/app.js` | Unit tests verifying Express app factory exports a valid application with routes mounted |
| `tests/unit/server.test.js` | CREATE | `server.js` | Unit tests for server startup behavior with mocked app.listen and console.log verification |
| `tests/unit/routes.test.js` | CREATE | `src/routes/index.js`, `src/routes/main.routes.js` | Unit tests for route aggregator exports and router registration validation |
| `tests/integration/app.integration.test.js` | CREATE | `src/app.js` | Integration tests for full HTTP request/response cycle: status codes, response bodies, headers, 404 handling, and edge cases |
| `jest.config.js` | CREATE | N/A | Jest configuration file specifying test environment, match patterns, coverage thresholds, and verbose output |
| `package.json` | UPDATE | `package.json` | Add devDependencies (jest, supertest) and update test scripts |

### 0.5.2 New Test Files Detail

**`tests/unit/config.test.js`** — Configuration module unit tests

- Test categories: default values, environment variable overrides, parseInt edge cases
- Mock dependencies: `process.env` (direct manipulation), `jest.resetModules()` for fresh require
- Assertions focus: Exact value equality for `host`, `port`, and `env` properties; type checking for `port` (number vs NaN)
- Test cases:
  - `should return default host '127.0.0.1' when HOST is not set`
  - `should return default port 3000 when PORT is not set`
  - `should return default env 'development' when NODE_ENV is not set`
  - `should use HOST environment variable when set`
  - `should use PORT environment variable when set (parsed as integer)`
  - `should use NODE_ENV environment variable when set`
  - `should fall back to 3000 when PORT is non-numeric string`
  - `should fall back to 3000 when PORT is empty string`
  - `should fall back to 3000 when PORT is '0'`
  - `should parse PORT as integer truncating decimals`

**`tests/unit/app.test.js`** — Express app factory unit tests

- Test categories: export validation, Express instance verification, route mounting
- Mock dependencies: None (tests the real module)
- Assertions focus: Type checking (`typeof app`), property existence (`app.use`, `app.get`), route stack inspection
- Test cases:
  - `should export a function (Express app)`
  - `should have request handler properties (get, post, use)`
  - `should have routes mounted on the application`

**`tests/unit/server.test.js`** — Server startup unit tests

- Test categories: startup behavior, callback execution, console logging
- Mock dependencies: `jest.mock('./src/app')`, `jest.mock('./src/config')`, `jest.spyOn(console, 'log')`
- Assertions focus: `app.listen` called with correct arguments, console.log message format
- Test cases:
  - `should call app.listen with configured port and host`
  - `should log startup message with correct URL when server starts`
  - `should pass a callback function to app.listen`

**`tests/unit/routes.test.js`** — Route aggregator and registration unit tests

- Test categories: barrel export validation, router type verification
- Mock dependencies: None
- Assertions focus: Export structure, function type, Router instance behavior
- Test cases:
  - `should export an object with mainRoutes property`
  - `should export mainRoutes as a function (Express Router)`
  - `mainRoutes router should have GET / handler registered`
  - `mainRoutes router should have GET /evening handler registered`

**`tests/integration/app.integration.test.js`** — Full HTTP integration tests

- Integration points: Supertest → Express app → Route handlers → HTTP responses
- Test data requirements: Expected response strings defined inline
- Test cases:
  - `GET / should return 200 status code`
  - `GET / should return 'Hello, World!\n' as response body`
  - `GET / should include Content-Type text/html header`
  - `GET / should include Content-Length header`
  - `GET /evening should return 200 status code`
  - `GET /evening should return 'Good evening' as response body`
  - `GET /evening should include Content-Type text/html header`
  - `GET /nonexistent should return 404 status code`
  - `POST / should return 404 for unregistered method`
  - `PUT /evening should return 404 for unregistered method`
  - `DELETE / should return 404 for unregistered method`
  - `GET / with query parameters should still return correct response`
  - `HEAD / should return 200 with no body`

### 0.5.3 Test Configuration Updates

**`jest.config.js`** — New Jest configuration file

- `testEnvironment`: `'node'` — Server-side testing, no DOM required
- `testMatch`: `['**/tests/**/*.test.js']` — Match all test files under `tests/` directory
- `collectCoverage`: `true` — Enable coverage collection by default
- `coverageDirectory`: `'coverage'` — Standard coverage output directory
- `coveragePathIgnorePatterns`: `['/node_modules/']` — Exclude dependencies from coverage
- `coverageThreshold.global`: `{ branches: 75, functions: 90, lines: 80, statements: 80 }` — Enforce minimum thresholds
- `verbose`: `true` — Detailed test output for clarity

**`package.json`** — Script and dependency updates

- Update `"test"` script from placeholder to `"jest"`
- Add `"test:coverage"` script: `"jest --coverage"`
- Add `"test:watch"` script: `"jest --watch"`
- Add `"test:ci"` script: `"jest --ci --coverage"`
- Add `devDependencies`: `jest@29.7.0`, `supertest@7.2.2`

### 0.5.4 Cross-File Test Dependencies

**Shared fixtures:** None required — all test data is defined inline within each test file due to the minimal data requirements.

**Mock objects:**

| Mock Location | Used By | Purpose |
|---------------|---------|---------|
| Inline in `tests/unit/server.test.js` | `server.test.js` only | Mocks `./src/app` and `./src/config` to isolate server startup logic |
| `process.env` manipulation | `tests/unit/config.test.js` | Tests configuration default/override behavior |
| `console.log` spy | `tests/unit/server.test.js` | Captures and asserts startup log message |

**Test utilities:** No shared helper functions are needed. Each test file is self-contained.

**Import dependency map:**

| Test File | Imports From |
|-----------|--------------|
| `tests/unit/config.test.js` | `src/config/index.js` (via fresh `require` after `jest.resetModules()`) |
| `tests/unit/app.test.js` | `src/app.js` |
| `tests/unit/server.test.js` | None directly (mocks `src/app` and `src/config`, then requires `server.js`) |
| `tests/unit/routes.test.js` | `src/routes/index.js`, `src/routes/main.routes.js` |
| `tests/integration/app.integration.test.js` | `supertest`, `src/app.js` |

**Test directory structure to create:**

```
hello_world/
├── tests/
│   ├── unit/
│   │   ├── config.test.js
│   │   ├── app.test.js
│   │   ├── server.test.js
│   │   └── routes.test.js
│   └── integration/
│       └── app.integration.test.js
├── jest.config.js
├── package.json (updated)
├── server.js
└── src/
    ├── app.js
    ├── config/
    │   └── index.js
    └── routes/
        ├── index.js
        └── main.routes.js
```


## 0.6 Dependency Inventory


### 0.6.1 Testing Dependencies

All testing packages are installed as `devDependencies` to avoid shipping test infrastructure to production.

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest | 29.7.0 | Testing framework, test runner, assertion library, mocking utilities, and coverage reporter |
| npm | supertest | 7.2.2 | HTTP assertion library for testing Express endpoints without starting a live server |

**Installation command:**

```bash
npm install --save-dev jest@29.7.0 supertest@7.2.2
```

**Version justification:**

| Package | Version Rationale |
|---------|-------------------|
| `jest@29.7.0` | Final release in the 29.x line; full compatibility with Node.js 20.x; native CommonJS support; zero-config for this project; aligns with tech spec Section 6.6.3.1 recommendation of `^29.x`; avoids Jest 30.x breaking changes (removed matcher aliases, new glob engine) |
| `supertest@7.2.2` | Latest stable release; SuperAgent-driven HTTP testing; confirmed compatibility with Express 5.1.0; accepts Express app instances directly for ephemeral port binding; Promise-based API integrates cleanly with Jest async/await patterns |

**Existing production dependencies (unchanged):**

| Registry | Package Name | Version | Status |
|----------|--------------|---------|--------|
| npm | express | ^5.1.0 (resolved: 5.1.0) | Production dependency — no changes required |

**Transitive dependency impact:** Installing `jest@29.7.0` and `supertest@7.2.2` adds their respective dependency trees to `node_modules` as development-only packages. No conflicts exist with the existing `express@5.1.0` dependency tree (67 transitive packages). The `npm install --save-dev` command ensures these are isolated in the `devDependencies` field.

### 0.6.2 Import Updates

Since this is a greenfield test suite with no existing test files, there are no import migration or transformation rules to apply. All imports in the new test files are fresh declarations.

**Import patterns for new test files:**

| Test File | Required Imports |
|-----------|-----------------|
| `tests/unit/config.test.js` | Dynamic `require('../../src/config')` inside test blocks (after `jest.resetModules()`) |
| `tests/unit/app.test.js` | `const app = require('../../src/app');` |
| `tests/unit/server.test.js` | `jest.mock('../../src/app')` and `jest.mock('../../src/config')` at top level; `require('../../server')` inside test |
| `tests/unit/routes.test.js` | `const { mainRoutes } = require('../../src/routes');` and `const mainRouter = require('../../src/routes/main.routes');` |
| `tests/integration/app.integration.test.js` | `const request = require('supertest');` and `const app = require('../../src/app');` |

**Path resolution note:** All test files use relative paths with `../../` prefix to navigate from `tests/unit/` or `tests/integration/` back to the project root where source modules reside. Jest's default `rootDir` (project root, where `package.json` lives) ensures correct module resolution without additional configuration.


## 0.7 Coverage and Quality Targets


### 0.7.1 Coverage Metrics

**Current coverage:** 0% — No test framework installed, no test files exist, and no coverage tooling is configured. The `package.json` test script is a non-functional placeholder.

**Target coverage:** ≥ 80% line coverage based on tech spec Section 6.6.6.1 recommended thresholds and industry best practices for Node.js applications. Given the small codebase (181 lines across 5 modules), achieving high coverage is realistic with the planned test suite.

**Coverage gaps to address:**

| Module | Current Coverage | Target Coverage | Gap Analysis |
|--------|-----------------|-----------------|--------------|
| `server.js` (53 LOC) | 0% | ≥ 80% | Server startup logic requires mocking `app.listen` and `console.log`; the `require` statements and `app.listen()` call are the primary coverage targets |
| `src/app.js` (27 LOC) | 0% | ≥ 90% | Small module with factory logic; importing the module and exercising routes via Supertest covers all executable lines |
| `src/config/index.js` (41 LOC) | 0% | ≥ 90% | Three properties with fallback logic; `process.env` manipulation with `jest.resetModules()` tests both default and override branches |
| `src/routes/index.js` (19 LOC) | 0% | ≥ 90% | Barrel export file; importing and verifying the export structure covers all lines |
| `src/routes/main.routes.js` (41 LOC) | 0% | ≥ 90% | Two route handlers; Supertest integration tests exercise both handler functions completely |

**Global coverage thresholds (enforced in `jest.config.js`):**

| Coverage Type | Threshold | Rationale |
|---------------|-----------|-----------|
| Lines | ≥ 80% | Industry standard minimum; tech spec recommendation |
| Branches | ≥ 75% | Covers the `||` fallback branches in `src/config/index.js` and route matching |
| Functions | ≥ 90% | All 8 testable functions across the codebase should be exercised |
| Statements | ≥ 80% | Comprehensive execution ensuring no dead code remains untested |

### 0.7.2 Test Quality Criteria

**Assertion density expectations:**

| Test File | Estimated Test Count | Min Assertions Per Test | Rationale |
|-----------|---------------------|-------------------------|-----------|
| `tests/unit/config.test.js` | 10 | 1-2 | Each test validates a single config property value or type |
| `tests/unit/app.test.js` | 3 | 1-2 | Export type and property existence checks |
| `tests/unit/server.test.js` | 3 | 1-2 | Mock call verification and console.log assertion |
| `tests/unit/routes.test.js` | 4 | 1-2 | Export structure and router type validation |
| `tests/integration/app.integration.test.js` | 13 | 1-3 | Status code, body, and header assertions per request |

**Test isolation requirements:**

- Each test file operates independently with no shared mutable state
- Configuration tests use `jest.resetModules()` and `process.env` save/restore to ensure clean module evaluation per test
- Server startup tests mock all external dependencies to prevent network binding
- Integration tests use Supertest's ephemeral port binding — no port conflicts between parallel test files

**Performance constraints for test execution:**

- Total test suite should complete in under 5 seconds for the 33 planned test cases
- No network calls to external services
- No file system writes during tests
- No database connections or in-memory stores needed

**Maintainability standards:**

- Test names follow `should [expected behavior]` convention per tech spec Section 6.6.10
- `describe` blocks mirror module names for clear test-to-source traceability
- Inline comments explain non-obvious mock setups (e.g., why `jest.resetModules()` is needed for config tests)
- Tests avoid implementation coupling — assertions target observable behavior (HTTP responses, return values) rather than internal data structures


## 0.8 Scope Boundaries


### 0.8.1 Exhaustively In Scope

**New test files (with trailing patterns):**

- `tests/unit/config.test.js` — Configuration module unit tests
- `tests/unit/app.test.js` — Express app factory unit tests
- `tests/unit/server.test.js` — Server startup/shutdown unit tests
- `tests/unit/routes.test.js` — Route aggregator and registration unit tests
- `tests/integration/app.integration.test.js` — Full HTTP request/response integration tests

**Test configuration files:**

- `jest.config.js` — Jest framework configuration (test environment, match patterns, coverage thresholds, verbose mode)
- `package.json` — Update `devDependencies` with `jest@29.7.0` and `supertest@7.2.2`; update `scripts.test` from placeholder to `jest`; add `test:coverage`, `test:watch`, and `test:ci` scripts

**Test directory structure:**

- `tests/` — Root test directory (to be created)
- `tests/unit/` — Unit test subdirectory (to be created)
- `tests/integration/` — Integration test subdirectory (to be created)

**Source files under test (read-only targets — not modified):**

- `server.js` — HTTP server entry point (tested via mocking in `server.test.js`)
- `src/app.js` — Express app factory (tested directly and via Supertest)
- `src/config/index.js` — Configuration module (tested via env var manipulation)
- `src/routes/index.js` — Route aggregator barrel export (tested for export structure)
- `src/routes/main.routes.js` — Route handlers (tested via Supertest integration)

**Testing concerns explicitly in scope per user requirements:**

- HTTP response body correctness (exact string matching including trailing newlines)
- HTTP status codes (200 for valid routes, 404 for invalid routes and unsupported methods)
- HTTP response headers (Content-Type, Content-Length)
- Server startup behavior (listen callback, console output)
- Server shutdown considerations (no long-running connections to clean up)
- Error handling (404 responses, unsupported HTTP methods)
- Edge cases (invalid PORT values, missing environment variables, query parameters on routes)

### 0.8.2 Explicitly Out of Scope

**Source code modifications:**

- No changes to `server.js`, `src/app.js`, `src/config/index.js`, `src/routes/index.js`, or `src/routes/main.routes.js` — source code remains untouched
- No refactoring of existing module structure or patterns

**Test types not included:**

- End-to-end tests requiring a running server instance (Supertest handles this internally)
- Performance/load testing (stress tests, benchmarks, response time SLA validation)
- Security testing (penetration testing, vulnerability scanning — handled separately via `npm audit`)
- Snapshot testing (not applicable for plain text HTTP responses)
- Visual regression testing (no UI components)

**Infrastructure not in scope:**

- CI/CD pipeline configuration (GitHub Actions, Jenkins, etc.)
- Docker or container-based test environments
- Pre-commit hooks (Husky, lint-staged)
- ESLint or code formatting configuration
- Production deployment changes

**Features not in scope:**

- Adding new routes or endpoints
- Modifying Express middleware stack
- Database integration or mocking (no database in project)
- Authentication or authorization testing (not implemented in project)
- HTTPS/TLS testing (project uses HTTP only)
- WebSocket testing (not applicable)

**Unrelated test files:**

- No tests for `node_modules` dependencies
- No tests for `blitzy/` documentation artifacts
- No tests for `README.md` content validation


## 0.9 Execution Parameters


### 0.9.1 Testing-Specific Instructions

**Test execution commands:**

| Command | Script | Purpose |
|---------|--------|---------|
| `npm test` | `jest` | Run the complete test suite once |
| `npm run test:coverage` | `jest --coverage` | Run tests with coverage report generation |
| `npm run test:ci` | `jest --ci --coverage` | CI-optimized run: disables watch, enables coverage, fails on threshold violations |
| `npm run test:watch` | `jest --watch` | Development watch mode — reruns tests on file changes |
| `npx jest --testPathPattern=config` | N/A | Run only tests matching "config" in their file path |
| `npx jest --verbose` | N/A | Run with detailed individual test result output |
| `NODE_ENV=test npm test` | N/A | Run tests with explicit test environment variable |

**Single test execution patterns:**

- Run a specific test file: `npx jest tests/unit/config.test.js`
- Run only unit tests: `npx jest tests/unit/`
- Run only integration tests: `npx jest tests/integration/`
- Run tests matching a name pattern: `npx jest -t "should return default port"`

**Environment setup requirements for tests:**

| Requirement | Detail |
|-------------|--------|
| Node.js runtime | v18.x or higher (v20.20.0 installed) |
| npm packages | `jest@29.7.0` and `supertest@7.2.2` in devDependencies |
| Working directory | Project root (where `package.json` resides) |
| Environment variables | None required — tests manage their own `process.env` state |
| Network access | Not required — Supertest uses in-process HTTP binding |
| File system access | Read-only access to source modules under `src/` |

**Test patterns to follow in the repository:**

- All test files use the `*.test.js` naming convention
- Test files mirror the source directory structure: `src/config/index.js` → `tests/unit/config.test.js`
- `describe` blocks use module or feature names: `describe('Configuration Module', () => { ... })`
- Individual tests use `test('should [behavior]', () => { ... })` format
- Async integration tests use `async/await` with Supertest: `const res = await request(app).get('/')`
- Configuration tests use `jest.resetModules()` pattern to force fresh module evaluation between tests
- Server startup tests mock dependencies at the module level using `jest.mock()`

**Excluded test categories:**

- No performance benchmarks
- No security/penetration tests
- No snapshot tests
- No end-to-end tests requiring external processes


## 0.10 Special Instructions for Testing


### 0.10.1 Testing-Specific Requirements

The following directives govern the test implementation approach, derived from the user's requirement to test `server.js` comprehensively and the architectural constraints of the existing codebase:

**Minimal change principle:**

- ONLY create test files, test configuration files, and update `package.json` with devDependencies/scripts
- DO NOT modify any source files (`server.js`, `src/app.js`, `src/config/index.js`, `src/routes/index.js`, `src/routes/main.routes.js`)
- The existing factory pattern in `src/app.js` already provides the necessary testability — no source code changes are required to enable testing

**Framework selection:**

- Use **Jest 29.7.0** as the testing framework per user instruction ("Jest or Mocha") and tech spec alignment
- Use **Supertest 7.2.2** for HTTP assertion testing against the Express app
- Do not install additional assertion libraries (Chai, should.js) — Jest's built-in `expect` API is sufficient
- Do not install additional mocking libraries — Jest's built-in `jest.fn()`, `jest.mock()`, and `jest.spyOn()` cover all mocking needs

**Test isolation and independence:**

- Ensure all tests can run independently and in any order
- Use `beforeEach`/`afterEach` hooks for environment variable save/restore in configuration tests
- Use `jest.resetModules()` to prevent module caching from leaking state between config tests
- Mock `app.listen()` in server startup tests to prevent actual TCP port binding
- Suppress `console.log` output during tests using `jest.spyOn(console, 'log').mockImplementation()`

**Naming and style conventions:**

- Match existing code style: `'use strict'` pragma is optional in test files (Jest handles strict mode)
- Use CommonJS `require`/`module.exports` consistent with the source codebase
- Follow JSDoc comment header pattern from source files for test file documentation
- Test file names use `*.test.js` suffix (not `*.spec.js`) per tech spec Section 6.6.10
- Describe blocks use the module name: `describe('Configuration Module', ...)`
- Test cases use the `should` prefix: `test('should return default port 3000', ...)`

**Express 5 specific considerations:**

- Express 5.1.0 returns async-aware middleware — test error scenarios anticipate Promise-based error propagation
- Express 5 route matching is stricter than Express 4 — tests for trailing slash behavior should account for Express 5's `path-to-regexp` v8 semantics
- Express 5's default 404 handler returns an HTML error page — integration tests asserting 404 behavior should check status code rather than exact body content
- The `X-Powered-By` header is enabled by default in Express 5 — tests can assert its presence or value

**Configuration module testing pattern:**

- The `src/config/index.js` module evaluates `process.env` at require-time (module load), not at function call time
- Tests MUST use `jest.resetModules()` before each test to force a fresh `require()` that re-evaluates environment variables
- Save the original `process.env` state in `beforeEach` and restore it in `afterEach` to prevent test pollution
- The `parseInt(process.env.PORT, 10) || 3000` expression has specific behavior: `parseInt('abc', 10)` returns `NaN`, and `NaN || 3000` evaluates to `3000`; `parseInt('0', 10)` returns `0`, and `0 || 3000` evaluates to `3000`

**Response body precision:**

- `GET /` returns `'Hello, World!\n'` — note the explicit trailing newline character (`\n`), which must be included in test assertions
- `GET /evening` returns `'Good evening'` — no trailing newline, exact string match required
- Express's `res.send()` with a string argument sets `Content-Type` to `text/html; charset=utf-8` by default


