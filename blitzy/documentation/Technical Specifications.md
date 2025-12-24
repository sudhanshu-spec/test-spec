# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

This section captures and translates the user's testing requirements into precise technical objectives, ensuring complete alignment between intent and implementation.

### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create a comprehensive unit test suite for the `server.js` entry point module** using either Jest or Mocha as the testing framework.

**Request Category:** Add new tests (greenfield test implementation)

**Testing Requirements with Enhanced Clarity:**

- **HTTP Response Testing:** Validate that the Express application properly handles HTTP requests and returns expected response bodies, including exact string matching for `Hello, World!\n` and `Good evening` responses
- **Status Code Verification:** Confirm that all endpoints return appropriate HTTP status codes (200 OK for successful requests, appropriate error codes for failure scenarios)
- **HTTP Headers Validation:** Assert that response headers include correct `Content-Type` (text/html; charset=utf-8) and other Express-generated headers
- **Server Startup Testing:** Verify that `app.listen()` executes correctly with configured host and port, and callback function fires appropriately
- **Server Shutdown Testing:** Test graceful server termination and proper cleanup of resources
- **Error Handling Testing:** Validate application behavior under failure conditions including invalid routes (404), malformed requests, and port binding conflicts
- **Edge Case Testing:** Cover boundary conditions such as empty requests, unusual headers, connection limits, and configuration variations

**Implicit Testing Needs Surfaced:**

- Configuration module (`src/config/index.js`) behavior with environment variables
- Express app factory pattern (`src/app.js`) isolation testing
- Route handler response validation (`src/routes/main.routes.js`)
- Console logging verification during startup sequence
- Module caching behavior validation

### 0.1.2 Special Instructions and Constraints

**Framework Selection:**
- User specified "Jest or Mocha" - Implementation will use **Jest** as the primary framework due to:
  - Zero-configuration setup for JavaScript projects
  - Built-in assertion library (no additional chai dependency)
  - Native async/await support
  - Snapshot testing capabilities
  - Wide community adoption and Express 5.x compatibility

**Testing Approach Directives:**
- Follow CommonJS module patterns to match existing codebase
- Utilize `supertest` library for HTTP request simulation without starting actual server
- Maintain separation between unit tests (isolated component testing) and integration tests (HTTP endpoint testing)
- Preserve existing code architecture - no modifications to source files required

**Web Search Research Conducted:**
- <cite index="6-1">Jest latest version is 30.2.0</cite>, but Jest 29.7.0 recommended for Node.js 20 stability
- <cite index="11-2,11-3">"The motivation with this module is to provide a high-level abstraction for testing HTTP, while still allowing you to drop down to the lower-level API provided by superagent." Supertest can be installed as an npm module and "if the server is not already listening for connections then it is bound to an ephemeral port."</cite>
- <cite index="14-1,14-2">"In this example, we'll be using Express version 5 and testing it using supertest. Run npm install express@^5 supertest to install them both."</cite>

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- **To test HTTP responses**, we will create `tests/server.test.js` using Jest and supertest to make requests to the Express app and assert response bodies match expected values
- **To test status codes**, we will add assertions using `expect(response.status).toBe(200)` patterns for each endpoint
- **To test headers**, we will validate `Content-Type` and other headers using supertest's `expect('Content-Type', /text\/html/)` chain method
- **To test server startup**, we will create `tests/server-lifecycle.test.js` to mock `app.listen()` and verify callback execution and logging
- **To test shutdown**, we will mock the server close functionality and verify cleanup sequences
- **To test error handling**, we will create `tests/error-handling.test.js` covering 404 responses, malformed requests, and exception scenarios
- **To test edge cases**, we will add boundary condition tests for empty requests, unusual inputs, and configuration variations

### 0.1.4 Coverage Requirements Interpretation

**Explicit Coverage Targets:** Not specified by user

**Implicit Coverage Expectations Based On:**

- **Industry Standards for Node.js/Express Applications:** 80%+ line coverage recommended
- **Repository Analysis:** No existing coverage baseline (greenfield implementation)
- **Critical Path Analysis:** Focus coverage on:
  - Server entry point (`server.js`) - 90%+ target
  - Route handlers (`src/routes/main.routes.js`) - 100% target
  - Configuration module (`src/config/index.js`) - 100% target
  - App factory (`src/app.js`) - 100% target

**Comprehensive Testing Coverage Should Include:**

- All defined routes (`GET /`, `GET /evening`)
- Server startup callback execution
- Configuration value resolution (host, port, env)
- Error conditions (404 for undefined routes)
- Response format validation (body content, headers, status codes)
- Module export verification


## 0.2 Test Discovery and Analysis

This section documents the comprehensive repository analysis performed to understand the existing test infrastructure and codebase structure.

### 0.2.1 Existing Test Infrastructure Assessment

**Repository Search Conducted:**
- Searched for test files matching patterns: `*test*`, `*spec*`, `test_*`, `spec_*`, `*_test.*`, `*_spec.*`
- Searched for test configuration files: `jest.config.*`, `mocha*`, `.mocharc.*`, `vitest*`
- Searched for test directories: `test/`, `tests/`, `__tests__/`, `spec/`

**Discovery Results:**
- **No existing test files found** in repository
- **No test configuration files present**
- **No dedicated test directories exist**
- Current `package.json` test script is a placeholder: `"test": "echo \"Error: no test specified\" && exit 1"`

**Repository Analysis Reveals:**

| Component | File Path | Test Status | Test Priority |
|-----------|-----------|-------------|---------------|
| Server Entry Point | `server.js` | No tests | HIGH |
| Express App Factory | `src/app.js` | No tests | HIGH |
| Configuration Module | `src/config/index.js` | No tests | MEDIUM |
| Routes Barrel | `src/routes/index.js` | No tests | LOW |
| Main Route Handlers | `src/routes/main.routes.js` | No tests | HIGH |

**Testing Framework Detection:**

| Package File | Testing Framework | Coverage Tool | Mock Library |
|--------------|-------------------|---------------|--------------|
| `package.json` | None detected | None detected | None detected |
| `package-lock.json` | None detected | None detected | None detected |

### 0.2.2 Current Testing Framework Analysis

**Current Testing Framework:** None installed

**Test Runner Configuration Location:** Not present (to be created)

**Coverage Tools in Use:** None (to be added)

**Mock/Stub Libraries Detected:** None (to be added)

**Test Data Fixtures or Factories Present:** None (to be created)

**Recommended Testing Stack for Node.js 20.x + Express 5.1.0:**

| Tool | Purpose | Recommended Version |
|------|---------|---------------------|
| Jest | Testing framework | 29.7.0 |
| supertest | HTTP testing library | 7.0.0 |

### 0.2.3 Source File Analysis

**`server.js` - Entry Point Analysis:**
```javascript
// Lines 40-47: Module imports
const app = require('./src/app');
const config = require('./src/config');
```

**Key Testing Targets:**
- `app.listen(config.port, config.host, callback)` invocation at line 62
- Console logging statements at lines 64, 68, 71, 74
- Module dependency injection patterns

**`src/app.js` - Express Factory Analysis:**
```javascript
// Line 17: Express app creation
const app = express();
// Line 25: Route mounting
app.use('/', mainRoutes);
```

**Key Testing Targets:**
- Express application instantiation
- Route mounting at root path
- Module export verification

**`src/config/index.js` - Configuration Analysis:**
```javascript
// Lines 26, 33, 40: Environment configuration
host: process.env.HOST || '127.0.0.1',
port: parseInt(process.env.PORT, 10) || 3000,
env: process.env.NODE_ENV || 'development'
```

**Key Testing Targets:**
- Default value resolution
- Environment variable override behavior
- Port parsing (parseInt with radix 10)

**`src/routes/main.routes.js` - Route Handler Analysis:**
```javascript
// Line 27: Root route response
res.send('Hello, World!\n');
// Line 38: Evening route response
res.send('Good evening');
```

**Key Testing Targets:**
- Exact response string matching (including trailing newline)
- HTTP status codes (implicit 200)
- Content-Type headers

### 0.2.4 Web Search Research Conducted

**Best Practices for Jest Testing Patterns:**
- <cite index="9-1">"Jest is a universal testing platform, with the ability to adapt to any JavaScript library or framework."</cite>
- Use `describe()` blocks to group related tests logically
- Use `test()` or `it()` for individual test cases
- Implement `beforeAll()`, `afterAll()`, `beforeEach()`, `afterEach()` hooks for setup/teardown

**Recommended Mocking Strategies for Express Applications:**
- <cite index="16-12,16-13">"When testing Node.js HTTP servers (like Express apps), Supertest can directly invoke the server's request handling code without needing to listen on a network port. This makes tests faster and easier to manage in a development environment."</cite>
- Mock `console.log` using `jest.spyOn(console, 'log')`
- Mock environment variables by manipulating `process.env`
- Use Jest's module mocking for dependency isolation

**Test Organization Conventions for Node.js/Express:**
- Place test files in a dedicated `tests/` directory
- Mirror source structure: `tests/unit/`, `tests/integration/`
- Name test files with `.test.js` suffix
- Group tests by feature/module being tested

**Common Pitfalls to Avoid:**
- Not closing server connections after tests (use supertest's built-in handling)
- Mutating shared state between tests (reset mocks in `beforeEach`)
- Not handling async operations properly (always await or return promises)
- Port conflicts when running integration tests in parallel


## 0.3 Testing Scope Analysis

This section defines the complete testing scope by mapping test targets, existing coverage, and dependencies requiring mocking.

### 0.3.1 Test Target Identification

**Primary Code to be Tested:**

| Module/Class | Path | Test Types Required |
|--------------|------|---------------------|
| Server Entry Point | `server.js` | Unit tests (startup logic), Integration tests (lifecycle) |
| Express Application | `src/app.js` | Unit tests (factory pattern), Integration tests (HTTP) |
| Configuration Module | `src/config/index.js` | Unit tests (env vars, defaults) |
| Routes Aggregator | `src/routes/index.js` | Unit tests (export verification) |
| Main Route Handlers | `src/routes/main.routes.js` | Unit tests (handler isolation), Integration tests (HTTP responses) |

**Functions Requiring Test Coverage:**

| Function/Method | File | Test Categories |
|-----------------|------|-----------------|
| `app.listen()` callback | `server.js:62-65` | Happy path, error handling |
| Console logging statements | `server.js:64,68,71,74` | Verification tests |
| `express()` instantiation | `src/app.js:17` | Unit tests |
| `app.use('/', mainRoutes)` | `src/app.js:25` | Route mounting tests |
| `router.get('/')` handler | `src/routes/main.routes.js:26-28` | Response tests, status tests, header tests |
| `router.get('/evening')` handler | `src/routes/main.routes.js:37-39` | Response tests, status tests, header tests |
| Config exports | `src/config/index.js:20-41` | Default values, env override tests |

### 0.3.2 Existing Test File Mapping

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|-------------------------|
| `server.js` | None | None |
| `src/app.js` | None | None |
| `src/config/index.js` | None | None |
| `src/routes/index.js` | None | None |
| `src/routes/main.routes.js` | None | None |

### 0.3.3 Dependencies Requiring Mocking

**External Services to Mock:**
- None (application has no external service dependencies)

**Node.js Built-ins to Mock:**
- `console.log` - For verifying startup messages
- `process.env` - For testing configuration variations
- `http.Server` - For server lifecycle testing

**Express Framework Components to Mock:**
- `app.listen()` - For unit testing server startup without port binding
- `express.Router()` - For isolated route handler testing

**Database Interactions to Stub:**
- None (application has no database dependencies)

**File System Operations to Virtualize:**
- None (application does not perform file system operations)

### 0.3.4 Version Compatibility Research

**Current Runtime Environment:**
- Node.js: 20.19.6 (LTS)
- Express: 5.1.0

**Recommended Testing Stack with Compatibility Rationale:**

| Category | Package | Version | Rationale |
|----------|---------|---------|-----------|
| Testing Framework | jest | 29.7.0 | Stable version with full Node.js 20 support; Jest 30.x dropped support for Node 16/19/21/23 but 29.x remains fully compatible |
| HTTP Testing | supertest | 7.0.0 | Latest stable version with Express 5.x support confirmed in web research |
| Coverage Reporter | Built-in Jest | - | Jest includes native coverage via `--coverage` flag using v8 provider |

**Version Conflict Analysis:**
- No conflicts detected between recommended versions
- Jest 29.7.0 + supertest 7.0.0 combination is well-tested in the Node.js ecosystem
- Express 5.x APIs are compatible with supertest's request simulation

**Package Compatibility Matrix:**

| Package | Min Node.js | Max Node.js | Express 5.x Compatible |
|---------|-------------|-------------|------------------------|
| jest@29.7.0 | 14.15.0 | 22.x | Yes |
| supertest@7.0.0 | 14.0.0 | 22.x | Yes |

### 0.3.5 Test Category Breakdown

**Unit Tests (Isolated Component Testing):**
- Configuration module default values
- Configuration module environment variable parsing
- Express app factory module export
- Routes barrel export structure
- Console logging during startup

**Integration Tests (HTTP Endpoint Testing):**
- `GET /` endpoint response body, status code, headers
- `GET /evening` endpoint response body, status code, headers
- 404 handling for undefined routes
- Request/response header validation

**Edge Case Tests (Boundary Condition Testing):**
- Empty configuration values
- Invalid PORT environment variable (non-numeric)
- Missing environment variables (fallback to defaults)
- Concurrent request handling
- Large request payloads (within Express defaults)

**Error Handling Tests (Failure Scenario Testing):**
- 404 Not Found for undefined routes
- Application behavior with malformed requests
- Server startup failure scenarios (mocked)


## 0.4 Test Implementation Design

This section defines the comprehensive test strategy, test case blueprints, and test data design for the server.js testing implementation.

### 0.4.1 Test Strategy Selection

**Test Types to Implement:**

| Test Type | Focus Area | Execution Method |
|-----------|------------|------------------|
| Unit Tests | Isolated component behavior | Jest with mocking |
| Integration Tests | HTTP endpoint functionality | Jest + supertest |
| Edge Case Tests | Boundary conditions | Jest with varied inputs |
| Error Handling Tests | Failure scenarios | Jest with error simulation |

**Unit Tests Focus:**
- Configuration module value resolution
- Module export verification
- Console logging behavior during startup
- Express app factory pattern validation

**Integration Tests Coverage:**
- `GET /` endpoint complete request/response cycle
- `GET /evening` endpoint complete request/response cycle
- HTTP header validation for all endpoints
- Status code verification for successful and failed requests

**Edge Case Tests Address:**
- Empty/missing environment variables
- Invalid PORT values (non-numeric strings)
- Whitespace in configuration values
- Undefined routes (404 handling)

**Error Handling Tests Verify:**
- 404 responses for non-existent routes
- Proper error message formatting
- Server graceful behavior under error conditions

### 0.4.2 Test Case Blueprint

**Component: server.js (Server Entry Point)**

```
Test Categories:
- Happy path: Server starts successfully with default config,
              callback executes, logs appear
- Edge cases: Custom HOST/PORT via environment,
              various NODE_ENV values
- Error cases: Port binding failure (mocked),
               Missing dependencies (mocked)
```

**Component: src/app.js (Express Application Factory)**

```
Test Categories:
- Happy path: App exports valid Express instance,
              routes are mounted correctly
- Edge cases: Multiple imports return same instance
              (module caching)
- Error cases: N/A (no error paths in current implementation)
```

**Component: src/config/index.js (Configuration Module)**

```
Test Categories:
- Happy path: Returns default values when env vars absent,
              returns env values when present
- Edge cases: Empty string env vars, whitespace values,
              PORT=0, PORT=65535, negative PORT
- Error cases: Non-numeric PORT parsing behavior
```

**Component: src/routes/main.routes.js (Route Handlers)**

```
Test Categories:
- Happy path: GET / returns 'Hello, World!\n' with 200,
              GET /evening returns 'Good evening' with 200
- Edge cases: POST/PUT/DELETE to defined routes,
              requests with unusual headers
- Error cases: N/A (handlers have no error paths)
```

**Component: HTTP Error Handling**

```
Test Categories:
- Happy path: N/A
- Edge cases: Various undefined route paths
- Error cases: GET /undefined returns 404,
               POST /nonexistent returns 404
```

### 0.4.3 Existing Test Extension Strategy

Since no existing tests are present, this is a greenfield implementation. All tests will be newly created following these patterns:

**Test Structure Pattern:**
```javascript
describe('ModuleName', () => {
  describe('functionName', () => {
    test('should behave X when Y', () => {
      // Arrange, Act, Assert
    });
  });
});
```

**Assertion Patterns:**
- Use `expect().toBe()` for primitive comparisons
- Use `expect().toEqual()` for object comparisons
- Use `expect().toMatch()` for regex patterns
- Use supertest's chainable `.expect()` for HTTP assertions

### 0.4.4 Test Data and Fixtures Design

**Required Test Data Structures:**

| Fixture Name | Purpose | Contents |
|--------------|---------|----------|
| Default Config | Baseline configuration values | `{ host: '127.0.0.1', port: 3000, env: 'development' }` |
| Custom Config | Environment override testing | `{ host: '0.0.0.0', port: 8080, env: 'production' }` |
| Expected Responses | Route response validation | Response body strings with exact formatting |

**Fixture Organization Strategy:**
- Create `tests/fixtures/` directory for shared test data
- Store configuration variants in `tests/fixtures/config.fixtures.js`
- Store expected response data in `tests/fixtures/response.fixtures.js`

**Mock Object Specifications:**

| Mock Target | Mock Type | Purpose |
|-------------|-----------|---------|
| `console.log` | Jest spy | Verify startup messages |
| `process.env` | Direct manipulation | Test config variations |
| `app.listen` | Jest mock | Unit test server startup |

**Test Database/State Management Approach:**
- No database involved in this application
- State management via Jest's `beforeEach` / `afterEach` hooks
- Environment variable cleanup after each config test
- Mock reset between tests using `jest.clearAllMocks()`

### 0.4.5 Test File Structure Design

```
tests/
├── unit/
│   ├── config.test.js          # Configuration module tests
│   ├── app.test.js             # Express app factory tests
│   └── routes.test.js          # Route handler unit tests
├── integration/
│   ├── server.test.js          # Server lifecycle tests
│   ├── endpoints.test.js       # HTTP endpoint tests
│   └── error-handling.test.js  # 404 and error tests
├── fixtures/
│   ├── config.fixtures.js      # Configuration test data
│   └── response.fixtures.js    # Expected response data
└── setup.js                    # Global test setup
```

### 0.4.6 Test Isolation Strategy

**Module Isolation Approach:**
- Use Jest's `jest.mock()` for dependency injection
- Reset module cache between tests when needed: `jest.resetModules()`
- Isolate environment variables per test suite

**HTTP Test Isolation:**
- supertest handles server lifecycle automatically
- No persistent server state between tests
- Each test receives fresh Express app instance

**Mock Cleanup Protocol:**
```javascript
afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});
```


## 0.5 Test File Transformation Mapping

This section provides an exhaustive mapping of every test file to be created, updated, or referenced as part of this testing implementation.

### 0.5.1 File-by-File Test Plan

**Test Transformation Modes:**
- **CREATE** - Create a new test file
- **UPDATE** - Update an existing test file
- **DELETE** - Remove an obsolete test file
- **REFERENCE** - Use as an example for test patterns and styles

| Target Test File | Transformation | Source File/Reference | Purpose/Changes |
|-----------------|----------------|----------------------|-----------------|
| `tests/unit/config.test.js` | CREATE | `src/config/index.js` | Unit tests for configuration module: default values, environment variable parsing, port integer conversion |
| `tests/unit/app.test.js` | CREATE | `src/app.js` | Unit tests for Express app factory: module export verification, route mounting validation |
| `tests/unit/routes.test.js` | CREATE | `src/routes/main.routes.js` | Unit tests for route handlers: isolated handler function testing with mocked request/response |
| `tests/unit/routes-barrel.test.js` | CREATE | `src/routes/index.js` | Unit tests for routes barrel: export structure verification |
| `tests/integration/server.test.js` | CREATE | `server.js` | Integration tests for server lifecycle: startup callback, logging verification, graceful handling |
| `tests/integration/endpoints.test.js` | CREATE | `src/app.js` | HTTP endpoint tests: GET /, GET /evening - status codes, response bodies, headers |
| `tests/integration/error-handling.test.js` | CREATE | `src/app.js` | Error handling tests: 404 responses for undefined routes, various HTTP methods on undefined paths |
| `tests/fixtures/config.fixtures.js` | CREATE | N/A | Test fixture data for configuration testing scenarios |
| `tests/fixtures/response.fixtures.js` | CREATE | N/A | Expected response data for endpoint validation |
| `tests/setup.js` | CREATE | N/A | Global Jest setup configuration and test utilities |
| `jest.config.js` | CREATE | N/A | Jest configuration file with coverage settings, test patterns, and module paths |
| `package.json` | UPDATE | `package.json` | Add Jest and supertest devDependencies, update test script |

### 0.5.2 New Test Files Detail

**`tests/unit/config.test.js`** - Configuration module unit tests

- Test categories: default values, environment override, edge cases
- Mock dependencies: `process.env` manipulation
- Assertions focus:
  - Default host is `'127.0.0.1'`
  - Default port is `3000` (numeric)
  - Default env is `'development'`
  - Environment variables override defaults
  - PORT parsing uses radix 10
  - Invalid PORT falls back to default

**`tests/unit/app.test.js`** - Express application factory tests

- Test categories: module export, route mounting
- Mock dependencies: None required (pure export testing)
- Assertions focus:
  - Export is valid Express application
  - Application has `use`, `listen` methods
  - Routes are mounted at root path

**`tests/unit/routes.test.js`** - Route handler unit tests

- Test categories: handler behavior, response formatting
- Mock dependencies: Express request/response objects
- Assertions focus:
  - Root handler calls `res.send()` with exact string
  - Evening handler calls `res.send()` with exact string
  - Handlers do not throw exceptions

**`tests/unit/routes-barrel.test.js`** - Routes aggregator tests

- Test categories: export verification
- Mock dependencies: None
- Assertions focus:
  - Export contains `mainRoutes` property
  - `mainRoutes` is valid Express Router

**`tests/integration/server.test.js`** - Server lifecycle integration tests

- Test categories: startup sequence, callback execution
- Mock dependencies: `console.log` spy
- Assertions focus:
  - Server can start without errors
  - Startup callback fires
  - Console messages appear in correct order

**`tests/integration/endpoints.test.js`** - HTTP endpoint integration tests

- Integration points: Express app, route handlers, HTTP layer
- Test data requirements: Expected response strings
- Assertions focus:
  - `GET /` returns status 200
  - `GET /` response body is `'Hello, World!\n'`
  - `GET /` Content-Type is `text/html; charset=utf-8`
  - `GET /evening` returns status 200
  - `GET /evening` response body is `'Good evening'`
  - `GET /evening` Content-Type is `text/html; charset=utf-8`

**`tests/integration/error-handling.test.js`** - Error handling integration tests

- Integration points: Express error handling middleware
- Test data requirements: Various undefined route paths
- Assertions focus:
  - Undefined routes return 404 status
  - 404 response body is appropriate
  - Various HTTP methods on undefined routes return 404

**`tests/fixtures/config.fixtures.js`** - Configuration test fixtures

- Fixture types:
  - Default configuration values
  - Custom environment configurations
  - Edge case configurations (empty strings, invalid values)

**`tests/fixtures/response.fixtures.js`** - Response test fixtures

- Fixture types:
  - Expected response bodies for each endpoint
  - Expected headers
  - Expected status codes

**`tests/setup.js`** - Global test setup

- Setup functions:
  - Environment variable backup/restore utilities
  - Common test helpers
  - Global mock configurations

### 0.5.3 Test Configuration Updates

**`jest.config.js`** - Jest configuration file

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['**/*.js', '!**/node_modules/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  setupFilesAfterEnv: ['./tests/setup.js']
};
```

**`package.json`** - Script and dependency updates

- Add `"test": "jest"` script
- Add `"test:coverage": "jest --coverage"` script
- Add `"test:watch": "jest --watch"` script
- Add `jest` and `supertest` as devDependencies

### 0.5.4 Cross-File Test Dependencies

**Shared Fixtures:**

| Fixture File | Used By | Purpose |
|--------------|---------|---------|
| `tests/fixtures/config.fixtures.js` | `tests/unit/config.test.js` | Configuration test data |
| `tests/fixtures/response.fixtures.js` | `tests/integration/endpoints.test.js` | Expected response validation |

**Mock Objects:**

| Mock Location | Used By | Purpose |
|---------------|---------|---------|
| `tests/setup.js` | All test files | Global mock setup |
| Inline mocks | Individual test files | Test-specific mocking |

**Test Utilities:**

| Utility | Location | Purpose |
|---------|----------|---------|
| Environment helpers | `tests/setup.js` | Save/restore process.env |
| Request helpers | Supertest built-in | HTTP request simulation |

**Import Updates Required:**

| Test File | Required Imports |
|-----------|------------------|
| `tests/unit/config.test.js` | `../src/config` |
| `tests/unit/app.test.js` | `../src/app` |
| `tests/unit/routes.test.js` | `../src/routes/main.routes` |
| `tests/unit/routes-barrel.test.js` | `../src/routes` |
| `tests/integration/endpoints.test.js` | `supertest`, `../src/app` |
| `tests/integration/server.test.js` | `../server` (with mocking) |
| `tests/integration/error-handling.test.js` | `supertest`, `../src/app` |

### 0.5.5 Complete Test File Inventory

| # | File Path | Type | Status |
|---|-----------|------|--------|
| 1 | `tests/unit/config.test.js` | Unit Test | CREATE |
| 2 | `tests/unit/app.test.js` | Unit Test | CREATE |
| 3 | `tests/unit/routes.test.js` | Unit Test | CREATE |
| 4 | `tests/unit/routes-barrel.test.js` | Unit Test | CREATE |
| 5 | `tests/integration/server.test.js` | Integration Test | CREATE |
| 6 | `tests/integration/endpoints.test.js` | Integration Test | CREATE |
| 7 | `tests/integration/error-handling.test.js` | Integration Test | CREATE |
| 8 | `tests/fixtures/config.fixtures.js` | Test Fixture | CREATE |
| 9 | `tests/fixtures/response.fixtures.js` | Test Fixture | CREATE |
| 10 | `tests/setup.js` | Test Setup | CREATE |
| 11 | `jest.config.js` | Configuration | CREATE |
| 12 | `package.json` | Manifest | UPDATE |


## 0.6 Dependency Inventory

This section provides a complete inventory of all testing dependencies required for the unit test implementation.

### 0.6.1 Testing Dependencies

**Primary Testing Packages:**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest | 29.7.0 | JavaScript testing framework with built-in assertions, mocking, and coverage |
| npm | supertest | 7.0.0 | HTTP assertions library for testing Express applications without starting server |

**Package Selection Rationale:**

**Jest 29.7.0:**
- Stable LTS-aligned version with full Node.js 20 compatibility
- Built-in test runner, assertion library, and mocking capabilities
- Native coverage reporting via V8 provider
- Zero-configuration for JavaScript projects
- Widely adopted in Express/Node.js ecosystem

**Supertest 7.0.0:**
- <cite index="16-12">"When testing Node.js HTTP servers (like Express apps), Supertest can directly invoke the server's request handling code without needing to listen on a network port."</cite>
- Fluent chainable API for HTTP assertions
- Compatible with Express 5.x as confirmed in web research
- Handles server lifecycle automatically

### 0.6.2 Existing Runtime Dependencies

**Current `package.json` Dependencies:**

| Registry | Package Name | Version | Type |
|----------|--------------|---------|------|
| npm | express | ^5.1.0 | Runtime dependency |

**Resolved Version (from `package-lock.json`):**

| Package | Resolved Version | Purpose |
|---------|------------------|---------|
| express | 5.1.0 | Web framework for HTTP handling |

### 0.6.3 Development Dependencies to Add

**New `devDependencies` Section:**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest | 29.7.0 | Testing framework |
| npm | supertest | 7.0.0 | HTTP testing utilities |

**Installation Command:**
```bash
npm install --save-dev jest@29.7.0 supertest@7.0.0
```

### 0.6.4 Package Version Verification

**Jest 29.7.0 Compatibility:**
- Node.js requirement: >=14.15.0
- Current Node.js: 20.19.6 ✓
- Express compatibility: Full support for all Express versions ✓

**Supertest 7.0.0 Compatibility:**
- Node.js requirement: >=14.0.0
- Current Node.js: 20.19.6 ✓
- Express 5.x compatibility: Confirmed via web research ✓

### 0.6.5 Import Updates

**Test Files Requiring Imports:**

| Test File | Required Imports | Import Statement |
|-----------|------------------|------------------|
| `tests/unit/config.test.js` | Config module | `const config = require('../src/config');` |
| `tests/unit/app.test.js` | App module | `const app = require('../src/app');` |
| `tests/unit/routes.test.js` | Routes module | `const router = require('../src/routes/main.routes');` |
| `tests/unit/routes-barrel.test.js` | Routes barrel | `const { mainRoutes } = require('../src/routes');` |
| `tests/integration/endpoints.test.js` | supertest, app | `const request = require('supertest');`<br>`const app = require('../src/app');` |
| `tests/integration/server.test.js` | Server module | Dynamic import with mocking |
| `tests/integration/error-handling.test.js` | supertest, app | `const request = require('supertest');`<br>`const app = require('../src/app');` |

**Import Transformation Rules:**

| Pattern | Description |
|---------|-------------|
| Source files | Use relative paths from test directory: `../src/` |
| NPM packages | Use package name directly: `require('supertest')` |
| Fixtures | Use relative paths: `./fixtures/` |
| Setup file | Configured in jest.config.js |

### 0.6.6 Package.json Updates Required

**Current `package.json` Structure:**
```json
{
  "name": "hello_world",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

**Updated `package.json` Structure:**
```json
{
  "name": "hello_world",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "jest": "29.7.0",
    "supertest": "7.0.0"
  }
}
```

### 0.6.7 Transitive Dependencies

**Jest 29.7.0 Key Transitive Dependencies:**

| Package | Purpose |
|---------|---------|
| @jest/core | Core test runner |
| @jest/expect | Assertion library |
| jest-mock | Mocking utilities |
| jest-snapshot | Snapshot testing |
| babel-jest | Code transformation (optional) |

**Supertest 7.0.0 Key Transitive Dependencies:**

| Package | Purpose |
|---------|---------|
| superagent | HTTP client foundation |
| methods | HTTP method utilities |
| component-emitter | Event handling |

**Note:** All transitive dependencies are automatically managed by npm and do not require manual installation.


## 0.7 Coverage and Quality Targets

This section defines the coverage metrics, quality criteria, and maintainability standards for the test implementation.

### 0.7.1 Coverage Metrics

**Current Coverage Status:**
- Current coverage: 0% (no existing tests)
- Coverage tool: None installed

**Target Coverage Goals:**

| Metric | Target | Rationale |
|--------|--------|-----------|
| Overall Line Coverage | ≥85% | Industry standard for Node.js applications |
| Overall Branch Coverage | ≥80% | Ensure conditional logic is tested |
| Overall Function Coverage | ≥90% | All exported functions should be tested |
| Overall Statement Coverage | ≥85% | Comprehensive statement execution |

**Per-File Coverage Targets:**

| File | Line Coverage Target | Priority |
|------|---------------------|----------|
| `server.js` | ≥80% | HIGH |
| `src/app.js` | ≥95% | HIGH |
| `src/config/index.js` | ≥100% | MEDIUM |
| `src/routes/index.js` | ≥100% | LOW |
| `src/routes/main.routes.js` | ≥100% | HIGH |

### 0.7.2 Coverage Gaps to Address

**Component: server.js**
- Current: 0%
- Target: ≥80%
- Focus areas:
  - `app.listen()` callback execution
  - Console logging statements
  - Module import validation

**Component: src/app.js**
- Current: 0%
- Target: ≥95%
- Focus areas:
  - Express app instantiation
  - Route mounting at root path
  - Module export

**Component: src/config/index.js**
- Current: 0%
- Target: 100%
- Focus areas:
  - Default value resolution for host, port, env
  - Environment variable override behavior
  - PORT integer parsing with radix 10

**Component: src/routes/main.routes.js**
- Current: 0%
- Target: 100%
- Focus areas:
  - Root route handler (`GET /`)
  - Evening route handler (`GET /evening`)
  - Response string exact matching

### 0.7.3 Test Quality Criteria

**Assertion Density Expectations:**

| Test Type | Min Assertions per Test | Rationale |
|-----------|------------------------|-----------|
| Unit tests | 1-3 | Focused, single-responsibility |
| Integration tests | 2-5 | Validate multiple aspects of request/response |
| Edge case tests | 1-2 | Specific boundary validation |

**Test Isolation Requirements:**

- Each test must be independently executable
- No shared mutable state between tests
- Tests must not depend on execution order
- Mock cleanup required after each test
- Environment variables must be restored after config tests

**Performance Constraints:**

| Metric | Target | Rationale |
|--------|--------|-----------|
| Individual test execution | <100ms | Fast feedback loop |
| Full test suite execution | <5s | CI/CD efficiency |
| Coverage report generation | <10s | Reasonable overhead |

### 0.7.4 Maintainability Standards

**Code Style Requirements:**

- Follow existing CommonJS module pattern
- Use `describe()` / `test()` structure consistently
- Meaningful test descriptions using "should" language
- Group related tests in nested `describe()` blocks

**Naming Conventions:**

| Element | Convention | Example |
|---------|------------|---------|
| Test files | `*.test.js` suffix | `config.test.js` |
| Test suites | Module/function name | `describe('config', ...)` |
| Test cases | Action + expectation | `test('should return default port when PORT not set', ...)` |

**Documentation Requirements:**

- Each test file should have a header comment explaining its purpose
- Complex test setup should include inline comments
- Fixtures should be documented with their purpose

### 0.7.5 Repository Test Pattern Compliance

**Pattern Analysis:**
- No existing test patterns to follow (greenfield implementation)
- Established patterns from industry best practices will be used

**Adopted Patterns:**

| Pattern | Description | Application |
|---------|-------------|-------------|
| AAA (Arrange-Act-Assert) | Standard test structure | All tests |
| Test isolation | No shared state | All tests |
| Descriptive naming | Clear intent | All test names |
| Fixture separation | Reusable test data | Fixture files |

**Example Test Structure:**
```javascript
describe('config', () => {
  describe('default values', () => {
    test('should return 127.0.0.1 for host', () => {
      // Arrange - setup preconditions
      // Act - execute code under test
      // Assert - verify expectations
    });
  });
});
```

### 0.7.6 Coverage Configuration

**Jest Coverage Settings:**

```javascript
// jest.config.js coverage configuration
module.exports = {
  collectCoverage: false, // Enable via --coverage flag
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'lcov', 'html']
};
```

**Coverage Exclusions:**

| Path Pattern | Reason |
|--------------|--------|
| `node_modules/**` | Third-party code |
| `coverage/**` | Generated coverage reports |
| `tests/**` | Test files themselves |
| `jest.config.js` | Configuration file |

### 0.7.7 Quality Gates

**Pre-Commit Requirements:**
- All tests must pass
- No decrease in coverage percentage
- No new linting errors in test files

**CI/CD Requirements:**
- Test suite completes successfully
- Coverage meets minimum thresholds
- Test execution time within limits

**Coverage Enforcement:**

| Threshold Type | Value | Enforcement |
|----------------|-------|-------------|
| Minimum lines | 85% | CI failure |
| Minimum branches | 80% | CI failure |
| Minimum functions | 90% | CI failure |


## 0.8 Scope Boundaries

This section clearly defines what is included and excluded from the testing implementation scope.

### 0.8.1 Exhaustively In Scope

**New Test Files:**

| Pattern | Description |
|---------|-------------|
| `tests/unit/**/*.test.js` | All new unit test files |
| `tests/integration/**/*.test.js` | All integration test files |
| `tests/fixtures/**/*.js` | All test fixture files |
| `tests/setup.js` | Global test setup file |

**Specific Test Files to Create:**

- `tests/unit/config.test.js` - Configuration module tests
- `tests/unit/app.test.js` - Express app factory tests
- `tests/unit/routes.test.js` - Route handler unit tests
- `tests/unit/routes-barrel.test.js` - Routes barrel export tests
- `tests/integration/server.test.js` - Server lifecycle tests
- `tests/integration/endpoints.test.js` - HTTP endpoint tests
- `tests/integration/error-handling.test.js` - Error handling tests
- `tests/fixtures/config.fixtures.js` - Configuration test data
- `tests/fixtures/response.fixtures.js` - Expected response fixtures
- `tests/setup.js` - Global Jest setup

**Test Configuration Files:**

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest test runner configuration |
| `package.json` | Test script and devDependency updates |

**Source Files Under Test (Read-Only):**

| File | Test Coverage |
|------|---------------|
| `server.js` | Lifecycle, startup, logging |
| `src/app.js` | Factory pattern, exports |
| `src/config/index.js` | Default values, env parsing |
| `src/routes/index.js` | Export structure |
| `src/routes/main.routes.js` | Handler behavior, responses |

**Documentation Updates:**

| File | Updates |
|------|---------|
| `README.md` | Add testing section with commands |

### 0.8.2 Explicitly Out of Scope

**Source Code Modifications:**

| Item | Reason |
|------|--------|
| `server.js` logic changes | Testing should not modify production code |
| `src/app.js` refactoring | Testing scope only |
| `src/config/index.js` changes | No modifications needed for testability |
| `src/routes/*.js` changes | Handlers already testable as-is |

**Feature Additions:**

| Item | Reason |
|------|--------|
| New endpoints | Out of testing scope |
| New middleware | Out of testing scope |
| Error handling middleware | Not requested |
| Request validation | Not requested |

**Refactoring Beyond Testing:**

| Item | Reason |
|------|--------|
| Module structure changes | Not required for testing |
| ESM migration | CommonJS sufficient for testing |
| TypeScript conversion | Not requested |
| Code organization changes | Not requested |

**Unrelated Test Files:**

| Item | Reason |
|------|--------|
| E2E browser tests | Not requested |
| Performance/load tests | Not requested |
| Security tests | Not requested |

**Performance Optimizations:**

| Item | Reason |
|------|--------|
| Server performance tuning | Out of scope |
| Response caching | Out of scope |
| Compression | Out of scope |

### 0.8.3 Conditional Inclusions

**Items Included If Necessary for Testability:**

| Item | Condition | Action |
|------|-----------|--------|
| Module export modifications | Only if required for testing | Document and minimize |
| Environment setup scripts | If CI/CD requires | Create minimal setup |
| Mock configuration | If external deps added | Add mock implementations |

**Items Requiring Explicit Approval:**

| Item | Approval Needed |
|------|-----------------|
| Source code changes | User confirmation |
| New runtime dependencies | User confirmation |
| CI/CD pipeline changes | User confirmation |

### 0.8.4 Boundary Definitions

**Test Directory Boundary:**
```
tests/                          # IN SCOPE
├── unit/                       # IN SCOPE
│   ├── config.test.js         # IN SCOPE
│   ├── app.test.js            # IN SCOPE
│   ├── routes.test.js         # IN SCOPE
│   └── routes-barrel.test.js  # IN SCOPE
├── integration/                # IN SCOPE
│   ├── server.test.js         # IN SCOPE
│   ├── endpoints.test.js      # IN SCOPE
│   └── error-handling.test.js # IN SCOPE
├── fixtures/                   # IN SCOPE
│   ├── config.fixtures.js     # IN SCOPE
│   └── response.fixtures.js   # IN SCOPE
└── setup.js                    # IN SCOPE
```

**Source Directory Boundary (Read-Only):**
```
server.js                       # READ ONLY - under test
src/                            # READ ONLY - under test
├── app.js                      # READ ONLY - under test
├── config/                     # READ ONLY - under test
│   └── index.js               # READ ONLY - under test
└── routes/                     # READ ONLY - under test
    ├── index.js               # READ ONLY - under test
    └── main.routes.js         # READ ONLY - under test
```

**Configuration Boundary:**
```
jest.config.js                  # IN SCOPE - create
package.json                    # IN SCOPE - update scripts/devDeps
package-lock.json               # AUTO-UPDATED by npm
```

### 0.8.5 Scope Validation Checklist

| Category | Items | In Scope |
|----------|-------|----------|
| Unit tests | Config, App, Routes | ✓ Yes |
| Integration tests | Server, Endpoints, Errors | ✓ Yes |
| Test fixtures | Config data, Response data | ✓ Yes |
| Test setup | Global configuration | ✓ Yes |
| Test configuration | Jest config | ✓ Yes |
| Package updates | devDependencies, scripts | ✓ Yes |
| Source modifications | Any production code | ✗ No |
| New features | Endpoints, middleware | ✗ No |
| E2E tests | Browser automation | ✗ No |
| Performance tests | Load testing | ✗ No |


## 0.9 Execution Parameters

This section defines the specific commands, environment setup, and execution patterns for the test suite.

### 0.9.1 Testing-Specific Instructions

**Test Execution Commands:**

| Command | Purpose | Usage |
|---------|---------|-------|
| `npm test` | Run all tests | Standard test execution |
| `npm run test:coverage` | Run tests with coverage | Coverage report generation |
| `npm run test:watch` | Run tests in watch mode | Development feedback loop |

**Detailed Command Specifications:**

**Standard Test Execution:**
```bash
npm test
# Equivalent to: npx jest
# Runs all tests matching pattern: tests/**/*.test.js
```

**Coverage Measurement:**
```bash
npm run test:coverage
# Equivalent to: npx jest --coverage
# Generates coverage report in ./coverage directory
# Outputs text summary to console
# Creates HTML report at ./coverage/lcov-report/index.html
```

**Watch Mode (Development):**
```bash
npm run test:watch
# Equivalent to: npx jest --watch
# Re-runs affected tests on file changes
# Interactive mode for test selection
```

**Single Test Execution Pattern:**
```bash
# Run specific test file
npx jest tests/unit/config.test.js

#### Run tests matching pattern
npx jest --testPathPattern="config"

#### Run tests matching name
npx jest -t "should return default port"
```

**Debug Mode Execution:**
```bash
# Run with verbose output
npx jest --verbose

#### Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

#### Run specific test in debug mode
node --inspect-brk node_modules/.bin/jest tests/unit/config.test.js
```

### 0.9.2 Environment Setup Requirements

**Required Environment:**

| Requirement | Value | Verification Command |
|-------------|-------|---------------------|
| Node.js | >=18.x (20.x recommended) | `node --version` |
| npm | >=8.x | `npm --version` |

**Pre-Test Setup:**
```bash
# Install all dependencies including devDependencies
npm install

#### Verify Jest is available
npx jest --version
```

**Environment Variables for Testing:**

| Variable | Test Value | Purpose |
|----------|------------|---------|
| `NODE_ENV` | `test` | Identifies test environment |
| `HOST` | Various | Configuration testing |
| `PORT` | Various | Configuration testing |

### 0.9.3 Test Patterns to Follow

**File Naming Pattern:**
```
tests/
├── unit/
│   └── [module-name].test.js
├── integration/
│   └── [feature-name].test.js
└── fixtures/
    └── [data-type].fixtures.js
```

**Test Structure Pattern:**
```javascript
'use strict';

// Imports
const moduleUnderTest = require('../src/module');

// Test Suite
describe('ModuleName', () => {
  // Setup/Teardown
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  // Nested suite for function/feature
  describe('functionName', () => {
    test('should do X when Y', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Assertion Patterns:**
```javascript
// Equality
expect(value).toBe(expected);
expect(obj).toEqual(expectedObj);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// HTTP (with supertest)
await request(app).get('/').expect(200);
await request(app).get('/').expect('Content-Type', /html/);
```

### 0.9.4 Excluded Test Categories

**Not Implemented (Per User Scope):**

| Category | Reason |
|----------|--------|
| E2E tests | Not requested |
| Performance tests | Not requested |
| Security tests | Not requested |
| Load tests | Not requested |
| Visual regression tests | Not applicable |

### 0.9.5 CI/CD Integration Parameters

**GitHub Actions Configuration (if needed):**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
```

**Test Result Exit Codes:**

| Exit Code | Meaning | CI Action |
|-----------|---------|-----------|
| 0 | All tests passed | Success |
| 1 | Test failures | Failure |
| 2 | Configuration error | Failure |

### 0.9.6 Test Execution Order

**Recommended Execution Sequence:**

1. **Unit tests first** - Fast, isolated validation
2. **Integration tests second** - HTTP endpoint validation
3. **Coverage report last** - Full suite with metrics

**Parallel Execution:**
- Jest runs tests in parallel by default
- Each test file runs in isolated process
- Use `--runInBand` for sequential execution if needed

### 0.9.7 Timeout Configuration

**Default Timeouts:**

| Scope | Timeout | Configuration |
|-------|---------|---------------|
| Individual test | 5000ms | Jest default |
| Test file | None | No limit |
| Total suite | None | No limit |

**Custom Timeout (if needed):**
```javascript
// Per-test timeout
test('long running test', async () => {
  // test code
}, 10000); // 10 second timeout

// jest.config.js global timeout
module.exports = {
  testTimeout: 5000
};
```

### 0.9.8 Mock Reset Strategy

**Between Tests:**
```javascript
afterEach(() => {
  jest.clearAllMocks();  // Clear mock call history
});
```

**Between Test Files:**
```javascript
afterAll(() => {
  jest.resetModules();   // Reset module cache
  jest.restoreAllMocks(); // Restore original implementations
});
```

**Environment Variable Cleanup:**
```javascript
// In tests/setup.js
const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});
```


## 0.10 Special Instructions

This section captures all testing-specific requirements and constraints explicitly specified or implied by the user request.

### 0.10.1 Testing-Specific Requirements

**Minimal Change Principle:**
- **ONLY modify test files and test-related configurations**
- Do not alter production source code in `server.js` or `src/` directory
- Keep test infrastructure additions focused and minimal
- Avoid introducing unnecessary dependencies

**Source Code Preservation:**
- **DO NOT modify source code unless absolutely necessary for testability**
- Current codebase is already structured for testability (app factory pattern)
- No refactoring of production code is required
- Module exports are already test-friendly

**Test Pattern Compliance:**
- Follow CommonJS module pattern (matching existing codebase)
- Use `require()` syntax consistently
- Maintain `'use strict';` directive in all test files
- Follow existing indentation and formatting style

### 0.10.2 Test Isolation Requirements

**Test Independence:**
- Ensure all tests can run independently and in parallel
- No shared mutable state between test files
- Each test must set up its own preconditions
- Each test must clean up after itself

**Mock Isolation:**
- Reset all mocks between tests using `jest.clearAllMocks()`
- Restore environment variables after config tests
- Use `jest.resetModules()` when testing module-level behavior

**HTTP Request Isolation:**
- Supertest handles server lifecycle automatically
- No persistent connections between tests
- Each request creates fresh server instance

### 0.10.3 Mocking Strategy

**Use Built-in Jest Mocking:**
- Prefer `jest.spyOn()` for function spying
- Use `jest.mock()` for module mocking
- Avoid external mocking libraries

**Console Logging Mocks:**
```javascript
// Spy on console.log for verification
jest.spyOn(console, 'log').mockImplementation();
```

**Environment Variable Handling:**
```javascript
// Direct manipulation of process.env
const originalEnv = { ...process.env };
process.env.PORT = '8080';
// ... test ...
process.env = originalEnv;
```

### 0.10.4 Response Validation Rules

**Exact String Matching:**
- `GET /` must return exactly `'Hello, World!\n'` (14 characters with newline)
- `GET /evening` must return exactly `'Good evening'` (12 characters, no newline)
- Use `.toBe()` for strict equality assertions

**Header Validation:**
- Content-Type must include `text/html`
- Charset must be `utf-8`
- Use regex matching for header flexibility

**Status Code Validation:**
- Success responses: 200
- Not Found responses: 404
- Use supertest's `.expect(statusCode)` for clean assertions

### 0.10.5 Code Style and Naming Conventions

**Match Existing Repository Style:**
- 2-space indentation
- Single quotes for strings
- Semicolons at end of statements
- JSDoc comments for documentation

**Test Naming Convention:**
```javascript
// Use descriptive "should" language
test('should return 200 status for root endpoint', ...)
test('should return Hello World with newline', ...)
test('should use default port when PORT not set', ...)
```

**File Naming Convention:**
```
[module].test.js         # Unit tests
[feature].test.js        # Integration tests
[type].fixtures.js       # Test fixtures
```

### 0.10.6 Backward Compatibility

**Test Utilities:**
- Maintain backward compatibility in any shared test utilities
- Document any utility function changes
- Version test utilities if significant changes occur

**Fixture Data:**
- Keep fixture data stable for test reproducibility
- Document any fixture format changes
- Maintain separate fixtures for different test scenarios

### 0.10.7 Framework Selection Rationale

**User Specified:** "Jest or Mocha"

**Selection: Jest**

| Factor | Jest | Mocha |
|--------|------|-------|
| Zero-config setup | ✓ Yes | Requires configuration |
| Built-in assertions | ✓ Yes | Requires Chai |
| Built-in mocking | ✓ Yes | Requires Sinon |
| Built-in coverage | ✓ Yes | Requires NYC |
| Async support | ✓ Native | ✓ Native |
| Express 5 compat | ✓ Yes | ✓ Yes |
| Community adoption | Very high | High |

**Decision:** Jest selected for simpler setup and built-in features

### 0.10.8 User Request Summary

**Original Request:**
> "Create comprehensive unit tests for server.js using Jest or Mocha. Test HTTP responses, status codes, headers, server startup/shutdown, error handling, and edge cases."

**Interpreted Requirements:**

| Requirement | Implementation |
|-------------|----------------|
| Unit tests for server.js | `tests/unit/*.test.js`, `tests/integration/server.test.js` |
| Jest or Mocha | Jest 29.7.0 selected |
| HTTP responses | supertest assertions on response bodies |
| Status codes | supertest `.expect(statusCode)` assertions |
| Headers | supertest header assertions (Content-Type) |
| Server startup/shutdown | Lifecycle tests with mocked callbacks |
| Error handling | 404 tests for undefined routes |
| Edge cases | Configuration variations, boundary conditions |

### 0.10.9 Implementation Priorities

**Priority 1 - Critical (Must Have):**
- HTTP endpoint tests (`GET /`, `GET /evening`)
- Status code validation
- Response body validation

**Priority 2 - Important (Should Have):**
- Header validation
- Configuration module tests
- 404 error handling tests

**Priority 3 - Nice to Have:**
- Server lifecycle tests
- Console logging verification
- Edge case coverage

### 0.10.10 Success Criteria

**Test Suite Completeness:**
- All specified test types implemented
- All endpoints covered
- All error scenarios tested

**Quality Metrics:**
- ≥85% line coverage
- All tests pass consistently
- Tests execute in <5 seconds

**Documentation:**
- Test file headers documented
- Complex tests commented
- README updated with test commands


