# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create comprehensive unit tests for the `server.js` Express.js application** using Jest or Mocha as the testing framework.

**Request Category:** Add new tests

**Testing Requirements Clarification:**

| User Requirement | Technical Interpretation |
|------------------|-------------------------|
| Test HTTP responses | Verify response bodies, content types, and JSON structures for all endpoints (GET /, GET /evening, GET /health) |
| Test status codes | Assert correct HTTP status codes (200 for success, 404 for not found, 500 for errors) across all routes and error conditions |
| Test headers | Validate custom headers, security headers presence (via Helmet), CORS headers, and content-type headers in responses |
| Test server startup/shutdown | Test the `startServer()` function for HTTP and HTTPS modes, graceful shutdown, and server lifecycle |
| Test error handling | Cover EADDRINUSE (port in use), EACCES (permission denied), ENOENT (file not found), and SSL certificate loading failures |
| Test edge cases | Include invalid port numbers, missing environment variables, malformed SSL certificates, and boundary conditions |

**Implicit Testing Needs Identified:**

- Environment variable configuration testing (PORT, ENABLE_HTTPS, SSL_KEY_PATH, SSL_CERT_PATH, TRUST_PROXY)
- Trust proxy configuration verification for reverse proxy environments
- JSON body parser limits (100kb) validation
- URL-encoded body parser behavior
- Module export verification (`{ app }` export pattern)
- Middleware chain integration (securityMiddleware, validationMiddleware)
- Health endpoint JSON structure validation with security flags

### 0.1.2 Special Instructions and Constraints

**Framework Selection:**
- The repository already uses **Jest 29.7.0** as its testing framework with **Supertest 7.1.4** for HTTP assertions
- Based on existing test patterns in `tests/security/*.js`, Jest with Supertest should be used for consistency
- No Mocha installation required - leverage existing Jest infrastructure

**Testing Conventions to Follow:**
- Follow the existing test file naming pattern: `test_<feature>.js`
- Use `describe()` blocks for grouping related tests
- Use `'should <expected behavior>'` pattern for test case names
- Import app via `const { app } = require('../../server')`
- Use Supertest pattern: `request(app).get('/').expect(200)`
- Apply proper environment isolation with `beforeAll/afterAll` hooks

**User Example Preservation:**
The user explicitly mentioned "using Jest or Mocha" - the Blitzy platform will use Jest given it's already configured in the project.

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

| Requirement | Implementation Approach |
|-------------|------------------------|
| To test HTTP responses | Create `tests/unit/test_server_routes.js` with Supertest assertions on response.text and response.body |
| To test status codes | Add assertions using `.expect(statusCode)` for success (200), not found (404), and error scenarios |
| To test headers | Use `response.headers` assertions for Content-Type, security headers presence, and custom headers |
| To test server startup | Create `tests/unit/test_server_lifecycle.js` with mocked `fs.readFileSync` and `https.createServer` |
| To test error handling | Mock error scenarios (EADDRINUSE, EACCES, ENOENT) and verify console error messages and process exit |
| To test edge cases | Create boundary tests for port validation, empty SSL paths, and missing environment variables |

### 0.1.4 Coverage Requirements Interpretation

**Explicit Coverage Targets:**
- The user did not specify explicit coverage percentages
- Based on "comprehensive" in the requirement, target high coverage for server.js

**Implicit Coverage Expectations:**

| Coverage Area | Target | Rationale |
|---------------|--------|-----------|
| Route handlers | 100% | All three routes (/, /evening, /health) must be tested |
| Server startup paths | 100% | Both HTTP and HTTPS startup paths with all error branches |
| Error handling branches | 95%+ | All documented error codes (EADDRINUSE, EACCES, ENOENT) |
| Configuration variations | 90%+ | Environment variable combinations for PORT, HTTPS, TRUST_PROXY |
| Edge cases | 85%+ | Invalid inputs, missing files, permission issues |

**Industry Standards for Express.js Testing:**
- <cite index="7-1">"Unit testing is an essential practice in Node.js development, and Jest is one of the most popular testing frameworks for JavaScript."</cite>
- Based on best practices, <cite index="5-17">"Apply some structure to your test suite so an occasional visitor could easily understand the requirements (tests are the best documentation) and the various scenarios that are being tested."</cite>

To achieve comprehensive testing, coverage should include:
- All route handlers with happy path and edge cases
- All environment variable configurations
- All error handling branches in `startServer()`
- SSL certificate loading success and failure paths
- Trust proxy enabled and disabled states

## 0.2 Test Discovery and Analysis

### 0.2.1 Existing Test Infrastructure Assessment

**Repository Analysis Summary:**
The repository analysis reveals a **Jest-based testing infrastructure** with comprehensive security-focused integration tests, but lacking dedicated unit tests for server.js core functionality.

**Test Discovery Results:**

| Discovery Pattern | Files Found | Location |
|-------------------|-------------|----------|
| `test_*.js` | 6 files | `tests/security/` |
| `*_test.js` | 0 files | - |
| `*.spec.js` | 0 files | - |
| `__tests__/` | Not present | - |

**Existing Test Files Inventory:**

| Test File | Purpose | Test Count | Server.js Coverage |
|-----------|---------|------------|-------------------|
| `tests/security/test_cors.js` | CORS policy validation | 8 | Routes only (implicit) |
| `tests/security/test_headers.js` | Helmet security headers | 12 | Routes only (implicit) |
| `tests/security/test_rate_limit.js` | Express-rate-limit behavior | 17+ | Routes only (implicit) |
| `tests/security/test_input_validation.js` | Input sanitization | 30+ | Routes only (implicit) |
| `tests/security/test_cve_2024_51999.js` | Prototype pollution CVE | 5 | Routes only (implicit) |
| `tests/security/test_cve_2025_13466.js` | Body-parser DoS CVE | 6 | Routes only (implicit) |

**Gap Analysis:**

| Test Category | Current Status | Gap Identified |
|---------------|----------------|----------------|
| Route handler responses | Implicitly tested via security tests | No dedicated response body/content-type tests |
| HTTP status codes | Partial (200, 400, 413, 429) | Missing 404, 500, and error scenario tests |
| Server startup/shutdown | Not tested | Complete gap - no lifecycle tests |
| HTTPS configuration | Not tested | Complete gap - no SSL tests |
| Error handling (EADDRINUSE, etc.) | Not tested | Complete gap - no error branch tests |
| Environment configuration | Implicit in rate-limit tests | No dedicated config tests |

### 0.2.2 Testing Framework Configuration

**Current Testing Framework: Jest 29.7.0**

| Configuration Item | Value | Source |
|-------------------|-------|--------|
| Test Framework | Jest | `package.json` devDependencies |
| Framework Version | 29.7.0 | `package-lock.json` |
| HTTP Test Library | Supertest | `package.json` devDependencies |
| Supertest Version | 7.1.4 | `package-lock.json` |
| Test Environment | node | `package.json` jest config |

**Jest Configuration (from package.json):**

```json
"jest": {
  "testMatch": ["**/tests/**/*.js", "**/test_*.js"],
  "testPathIgnorePatterns": ["/node_modules/"],
  "testEnvironment": "node",
  "verbose": true
}
```

**Test Execution Command:**
```bash
npm test  # Runs: jest --detectOpenHandles --forceExit
```

### 0.2.3 Coverage Tools Analysis

| Tool | Current Status | Notes |
|------|----------------|-------|
| Jest Coverage | Available (built-in) | Not currently configured in package.json |
| Istanbul/nyc | Not installed | Jest's built-in coverage is sufficient |
| Coverage Threshold | Not configured | Should be added for quality gates |

### 0.2.4 Mock/Stub Libraries Detected

| Library | Status | Usage |
|---------|--------|-------|
| Jest Mocks | Built-in | `jest.spyOn()`, `jest.fn()` available |
| Supertest | Installed | HTTP assertions without network binding |
| Custom Mocks | None | Will need mocks for fs, https modules |

### 0.2.5 Test Data and Fixtures Analysis

**Existing Test Data Patterns:**

| Data Type | Location | Reusability |
|-----------|----------|-------------|
| MALICIOUS_PAYLOADS | `test_input_validation.js` | Reference only |
| VALID_INPUTS | `test_input_validation.js` | Reference only |
| TEST_IPS | `test_rate_limit.js` | Reference only |
| ALLOWED_ORIGIN | `test_cors.js` | Reusable |
| RATE_LIMIT_DEFAULTS | `test_rate_limit.js` | Reference only |

**New Test Data Requirements:**
- SSL certificate mock data (valid and invalid)
- Environment variable test fixtures
- Error object mocks (EADDRINUSE, EACCES, ENOENT)
- Port number edge cases (valid, invalid, privileged)

### 0.2.6 Web Search Research Conducted

**Best Practices for Jest Testing Patterns:**
- Use structured `describe()` blocks for organization and readability
- Follow the pattern of testing individual units in isolation
- Mock external dependencies (fs, https) for unit tests
- Use `beforeAll/afterAll` for environment setup and cleanup

**Recommended Mocking Strategies for Node.js Modules:**
- Use `jest.mock()` for automatic mocking of fs and https modules
- Use `jest.spyOn()` for selective mocking of console methods
- Store and restore `process.env` for configuration testing

**Test Organization Conventions for Express.js:**
- Separate unit tests from integration tests in folder structure
- Use `tests/unit/` for isolated unit tests
- Use `tests/integration/` for middleware chain tests
- Name files by feature: `test_<feature>.js`

**Common Pitfalls to Avoid:**
- Not restoring mocked modules after tests
- Not handling async operations properly
- Port conflicts between test runs
- Environment variable pollution between tests

## 0.3 Testing Scope Analysis

### 0.3.1 Test Target Identification

**Primary Code to be Tested: `server.js`**

| Component | Path | Test Types Required |
|-----------|------|---------------------|
| Express App | `server.js` (lines 127) | Unit + Integration |
| Route Handlers | `server.js` (lines 212-272) | Unit tests |
| startServer Function | `server.js` (lines 287-416) | Unit tests with mocks |
| Module Exports | `server.js` (line 445) | Unit test |
| Configuration Constants | `server.js` (lines 91-116) | Unit tests |

**Functions/Components Requiring Tests:**

| Function/Component | Line Numbers | Test Categories |
|-------------------|--------------|-----------------|
| `GET /` handler | 212-214 | Happy path, response body, headers |
| `GET /evening` handler | 239-241 | Happy path, response body, headers |
| `GET /health` handler | 258-272 | JSON structure, security flags, timestamp |
| `startServer()` | 287-416 | HTTP mode, HTTPS mode, error handling |
| `onListening()` callback | 293-317 | Console output verification |
| Trust proxy configuration | 138-141 | Enabled/disabled states |
| Body parser middleware | 164-171 | Limit configuration |
| Module export `{ app }` | 445 | Export verification |

### 0.3.2 Existing Test File Mapping

| Source File | Existing Test File | Test Categories Present | Gap |
|-------------|-------------------|------------------------|-----|
| `server.js` | `tests/security/test_headers.js` | Security headers only | Route responses, lifecycle |
| `server.js` | `tests/security/test_cors.js` | CORS headers only | Route responses, errors |
| `server.js` | `tests/security/test_rate_limit.js` | Rate limiting only | Server config, errors |
| `server.js` | `tests/security/test_input_validation.js` | Input validation only | Route handlers, startup |
| `server.js` | `tests/security/test_cve_*.js` | CVE regression only | All unit tests |
| `middleware/security.js` | `tests/security/test_*.js` | Implicit coverage | Dedicated unit tests |
| `middleware/validation.js` | `tests/security/test_input_validation.js` | Implicit coverage | Dedicated unit tests |
| `config/security.js` | None | None | Configuration tests |

### 0.3.3 Dependencies Requiring Mocking

**External Services to Mock:**

| Dependency | Module | Mock Requirement |
|------------|--------|------------------|
| File System | `fs` | `fs.readFileSync` for SSL certificate loading |
| HTTPS Server | `https` | `https.createServer` for HTTPS server creation |
| Console | `console` | `console.log`, `console.error` for output verification |
| Process | `process` | `process.exit` for error handling tests |

**Module Interactions to Stub:**

| Interaction | Stub Approach |
|-------------|---------------|
| SSL certificate reading | Mock `fs.readFileSync` to return mock certificates or throw errors |
| HTTPS server creation | Mock `https.createServer` to return mock server object |
| Server listening | Mock `.listen()` to invoke callback immediately |
| Server error events | Mock `.on('error')` to simulate EADDRINUSE, EACCES |

**Environment Variables to Virtualize:**

| Variable | Test Values |
|----------|-------------|
| `PORT` | `3000`, `8080`, `undefined`, `'invalid'` |
| `ENABLE_HTTPS` | `'true'`, `'false'`, `undefined` |
| `SSL_KEY_PATH` | `'./certs/key.pem'`, `''`, `'/nonexistent/path'` |
| `SSL_CERT_PATH` | `'./certs/cert.pem'`, `''`, `'/nonexistent/path'` |
| `TRUST_PROXY` | `'true'`, `'false'`, `undefined` |
| `NODE_ENV` | `'development'`, `'production'`, `'test'` |

### 0.3.4 Version Compatibility Research

**Based on Node.js version 18.0.0+ (from package.json engines), recommended testing stack:**

| Tool | Recommended Version | Rationale |
|------|---------------------|-----------|
| Jest | 29.7.0 (current) | Latest stable, compatible with Node 18+ |
| Supertest | 7.1.4 (current) | Latest stable, supports async/await |
| Node.js | 20.x (installed) | Exceeds minimum 18.0.0, LTS version |
| npm | 11.x (installed) | Exceeds minimum 7.0.0 |

**Version Compatibility Matrix:**

| Component | Minimum | Current | Maximum Tested |
|-----------|---------|---------|----------------|
| Node.js | 18.0.0 | 20.19.6 | 22.x |
| Jest | 29.0.0 | 29.7.0 | 29.x |
| Supertest | 6.0.0 | 7.1.4 | 7.x |
| Express | 5.0.0 | 5.2.0 | 5.x |

**No Version Conflicts Detected:**
- All current dependencies are compatible
- Jest 29.7.0 works seamlessly with Node.js 20.x
- Supertest 7.1.4 supports Express 5.x application testing

### 0.3.5 Test Isolation Requirements

**Isolation Strategies Required:**

| Isolation Type | Implementation |
|----------------|----------------|
| Environment Variables | Store in `beforeAll`, restore in `afterAll` |
| Console Output | Spy and mock console methods |
| Module State | Use `jest.resetModules()` between tests |
| Process Exit | Mock `process.exit` to prevent test termination |
| File System | Mock `fs` module to avoid real file access |
| Network | Use Supertest (no actual port binding) |

**Test Independence Verification:**
- Each test must be runnable in isolation
- Tests must not depend on execution order
- Shared fixtures must be immutable
- Environment must be reset between test files

## 0.4 Test Implementation Design

### 0.4.1 Test Strategy Selection

**Test Types to Implement:**

| Test Type | Focus Areas | Priority |
|-----------|-------------|----------|
| Unit Tests | Route handlers, response bodies, status codes, module exports | Critical |
| Integration Tests | Full middleware chain with routes, end-to-end request flow | High |
| Edge Case Tests | Invalid ports, missing configs, malformed inputs | High |
| Error Handling Tests | EADDRINUSE, EACCES, ENOENT, SSL errors | Critical |
| Configuration Tests | Environment variables, trust proxy, body limits | Medium |

**Unit Tests Focus:**
- Isolated testing of each route handler (/, /evening, /health)
- Response body content verification
- HTTP status code assertions
- Content-type header validation
- JSON structure verification for /health endpoint

**Integration Tests Focus:**
- Complete request-response cycle through middleware chain
- Security headers presence after full middleware processing
- CORS behavior with Origin headers
- Rate limiting behavior (existing tests cover this)

**Edge Case Tests Focus:**
- Empty request body handling
- Missing query parameters
- Invalid HTTP methods (POST to GET-only endpoints)
- Large request body rejection

**Error Handling Tests Focus:**
- Server startup failure scenarios
- SSL certificate loading failures
- Port binding errors
- Permission denied errors

### 0.4.2 Test Case Blueprint

**Component: Root Route Handler (GET /)**

```
Test Categories:
- Happy path: GET / returns "Hello, World!\n" with 200 status
- Headers: Content-Type is text/html; charset=utf-8
- Edge cases: POST / returns 404 (method not allowed)
- Edge cases: GET / with query params still returns greeting
```

**Component: Evening Route Handler (GET /evening)**

```
Test Categories:
- Happy path: GET /evening returns "Good evening" with 200 status
- Headers: Content-Type is text/html; charset=utf-8
- Edge cases: POST /evening returns 404
- Edge cases: Case sensitivity - /Evening returns 404
```

**Component: Health Route Handler (GET /health)**

```
Test Categories:
- Happy path: Returns JSON with status "healthy"
- Structure: Contains timestamp, security object, version
- Security flags: Validates https, trustProxy, rateLimit, helmet, cors, inputValidation
- Headers: Content-Type is application/json; charset=utf-8
- Edge cases: Response timestamp is valid ISO 8601
- Edge cases: Version matches "2.0.0"
```

**Component: startServer Function**

```
Test Categories:
- HTTP mode: Server starts on configured port with HTTP
- HTTPS mode: Server starts with valid SSL certificates
- HTTPS fallback: Falls back to HTTP when SSL paths missing
- HTTPS fallback: Falls back to HTTP when certificates invalid
- Error cases: EADDRINUSE triggers error message and exit
- Error cases: EACCES triggers permission error message and exit
- Error cases: ENOENT for SSL files triggers fallback
- Console output: Startup banner displays correctly
- Performance boundaries: Server starts within reasonable time
```

**Component: Configuration Handling**

```
Test Categories:
- PORT: Uses environment variable when set
- PORT: Falls back to 3000 when not set
- PORT: Handles invalid port values
- TRUST_PROXY: Enables trust proxy when set to 'true'
- TRUST_PROXY: Disables trust proxy when not set
- ENABLE_HTTPS: Enables HTTPS when 'true'
- ENABLE_HTTPS: Defaults to HTTP when not set
```

### 0.4.3 Existing Test Extension Strategy

**Tests to Reference (Not Modify):**

| Test File | Reference Purpose |
|-----------|-------------------|
| `tests/security/test_headers.js` | Pattern for header assertions, helper functions |
| `tests/security/test_cors.js` | Pattern for origin-based testing |
| `tests/security/test_rate_limit.js` | Pattern for environment manipulation |

**Patterns to Adopt from Existing Tests:**

```javascript
// Pattern from test_headers.js for helper functions
function hasHeader(headers, headerName) {
  const lowerName = headerName.toLowerCase();
  return Object.keys(headers).some(key => 
    key.toLowerCase() === lowerName);
}

// Pattern from test_rate_limit.js for env setup
let originalEnv;
beforeAll(() => {
  originalEnv = { ...process.env };
});
afterAll(() => {
  process.env = originalEnv;
});
```

### 0.4.4 Test Data and Fixtures Design

**Required Test Data Structures:**

| Data Structure | Purpose | Contents |
|----------------|---------|----------|
| `VALID_PORTS` | Port configuration testing | `[3000, 8080, 9000, 65535]` |
| `INVALID_PORTS` | Edge case testing | `[-1, 0, 65536, 'abc', null]` |
| `SSL_MOCK_PATHS` | HTTPS testing | `{ key: './mock/key.pem', cert: './mock/cert.pem' }` |
| `EXPECTED_HEALTH_STRUCTURE` | Health endpoint validation | JSON schema object |

**Fixture Organization Strategy:**

```
tests/
├── unit/
│   ├── test_server_routes.js      # Route handler unit tests
│   ├── test_server_lifecycle.js   # Startup/shutdown tests
│   └── test_server_config.js      # Configuration tests
├── fixtures/
│   ├── ssl_mocks.js               # Mock SSL certificates
│   └── env_fixtures.js            # Environment variable fixtures
└── helpers/
    └── test_utils.js              # Shared test utilities
```

**Mock Object Specifications:**

| Mock Object | Module | Methods to Mock |
|-------------|--------|-----------------|
| `mockFs` | `fs` | `readFileSync` |
| `mockHttps` | `https` | `createServer` |
| `mockServer` | (https server) | `listen`, `on` |
| `mockConsole` | `console` | `log`, `error` |
| `mockProcess` | `process` | `exit` |

**Test Database/State Management:**
- No database involved - stateless application
- Use Jest's `beforeEach`/`afterEach` for state reset
- Mock `process.env` for configuration tests
- Use `jest.resetModules()` to clear module cache between tests

## 0.5 Test File Transformation Mapping

### 0.5.1 File-by-File Test Plan

**Test Transformation Modes:**
- **CREATE** - Create a new test file
- **UPDATE** - Update an existing test file
- **DELETE** - Remove an obsolete test file
- **REFERENCE** - Use as an example for test patterns and styles

| Target Test File | Transformation | Source File/Test | Purpose/Changes |
|-----------------|----------------|------------------|-----------------|
| `tests/unit/test_server_routes.js` | CREATE | `server.js` | Comprehensive unit tests for all route handlers (GET /, GET /evening, GET /health) including response bodies, status codes, headers, and content types |
| `tests/unit/test_server_lifecycle.js` | CREATE | `server.js` | Unit tests for startServer() function covering HTTP startup, HTTPS startup, SSL certificate loading, error handling (EADDRINUSE, EACCES, ENOENT), and graceful fallback |
| `tests/unit/test_server_config.js` | CREATE | `server.js` | Unit tests for environment configuration including PORT, ENABLE_HTTPS, SSL_KEY_PATH, SSL_CERT_PATH, TRUST_PROXY, and body parser limits |
| `tests/unit/test_server_errors.js` | CREATE | `server.js` | Dedicated error handling tests for server startup failures, SSL errors, and console error output verification |
| `tests/unit/test_server_exports.js` | CREATE | `server.js` | Unit tests verifying module exports, app instance type, and testability pattern |
| `tests/helpers/test_utils.js` | CREATE | `tests/security/test_headers.js` | Shared test utilities extracted from existing patterns (hasHeader, getHeader, environment helpers) |
| `tests/fixtures/ssl_mocks.js` | CREATE | N/A | Mock SSL certificate data and paths for HTTPS testing |
| `tests/fixtures/env_fixtures.js` | CREATE | N/A | Environment variable fixtures for configuration testing |
| `tests/security/test_headers.js` | REFERENCE | N/A | Use as pattern for header assertion utilities and describe block structure |
| `tests/security/test_rate_limit.js` | REFERENCE | N/A | Use as pattern for environment variable manipulation and beforeAll/afterAll setup |
| `tests/security/test_cors.js` | REFERENCE | N/A | Use as pattern for Supertest request building and response assertions |

### 0.5.2 New Test Files Detail

**tests/unit/test_server_routes.js** - Route Handler Unit Tests

```
Test Categories: happy path, headers, edge cases, error cases
Mock Dependencies: None (uses Supertest on exported app)
Assertions Focus:
  - Response body exact match ("Hello, World!\n", "Good evening")
  - HTTP status code 200 for valid routes
  - HTTP status code 404 for undefined routes
  - Content-Type headers (text/html, application/json)
  - JSON structure validation for /health endpoint
  - Security flags verification in health response
```

**tests/unit/test_server_lifecycle.js** - Server Startup/Shutdown Tests

```
Test Categories: HTTP mode, HTTPS mode, fallback behavior, error handling
Mock Dependencies: fs, https, console, process
Assertions Focus:
  - HTTP server starts on configured port
  - HTTPS server starts with valid certificates
  - Fallback to HTTP when SSL paths missing
  - Fallback to HTTP when certificate files not found
  - Console output matches expected startup banner
  - Process.exit called on fatal errors
```

**tests/unit/test_server_config.js** - Configuration Tests

```
Test Categories: environment variables, defaults, edge cases
Mock Dependencies: process.env
Assertions Focus:
  - PORT environment variable is respected
  - Default port 3000 when PORT not set
  - TRUST_PROXY enables trust proxy when 'true'
  - ENABLE_HTTPS triggers HTTPS mode when 'true'
  - Body parser 100kb limit is enforced
```

**tests/unit/test_server_errors.js** - Error Handling Tests

```
Test Categories: EADDRINUSE, EACCES, ENOENT, SSL errors
Mock Dependencies: fs, https, console, process
Assertions Focus:
  - EADDRINUSE triggers specific error message
  - EACCES triggers permission denied message
  - ENOENT for SSL files triggers fallback message
  - Console.error called with correct messages
  - Process.exit(1) called on fatal errors
```

**tests/unit/test_server_exports.js** - Module Export Tests

```
Test Categories: export verification, app instance
Mock Dependencies: None
Assertions Focus:
  - module.exports contains 'app' property
  - app is valid Express application instance
  - app.use is a function (middleware capability)
  - app.get is a function (routing capability)
```

### 0.5.3 Test Configuration Updates

| Config File | Update Required |
|-------------|-----------------|
| `package.json` | Add test script for unit tests only: `"test:unit": "jest tests/unit"` |
| `package.json` | Add coverage script: `"test:coverage": "jest --coverage"` |
| `jest.config.js` | CREATE - Optional separate config for coverage thresholds |

**Recommended package.json script additions:**

```json
"scripts": {
  "test": "jest --detectOpenHandles --forceExit",
  "test:unit": "jest tests/unit --detectOpenHandles --forceExit",
  "test:security": "jest tests/security --detectOpenHandles --forceExit",
  "test:coverage": "jest --coverage --detectOpenHandles --forceExit"
}
```

### 0.5.4 Cross-File Test Dependencies

**Shared Fixtures:**

| Fixture File | Consumers | Purpose |
|--------------|-----------|---------|
| `tests/fixtures/ssl_mocks.js` | `test_server_lifecycle.js`, `test_server_errors.js` | Mock SSL certificate data |
| `tests/fixtures/env_fixtures.js` | `test_server_config.js`, `test_server_lifecycle.js` | Environment variable presets |

**Shared Test Utilities:**

| Utility File | Functions Provided | Consumers |
|--------------|-------------------|-----------|
| `tests/helpers/test_utils.js` | `hasHeader()`, `getHeader()`, `storeEnv()`, `restoreEnv()` | All unit test files |

**Mock Objects:**

| Mock Object | Location | Purpose |
|-------------|----------|---------|
| `mockFs` | `test_server_lifecycle.js` (inline) | Mock fs.readFileSync for SSL tests |
| `mockHttpsServer` | `test_server_lifecycle.js` (inline) | Mock https.createServer |
| `mockConsole` | `test_server_errors.js` (inline) | Spy on console.log/error |

**Import Updates Required:**

| Test File | Required Imports |
|-----------|------------------|
| `tests/unit/test_server_routes.js` | `supertest`, `../../server` |
| `tests/unit/test_server_lifecycle.js` | `supertest`, `../../server`, `fs`, `https` (mocked) |
| `tests/unit/test_server_config.js` | `supertest`, `../../server` |
| `tests/unit/test_server_errors.js` | `supertest`, `../../server`, `fs`, `https` (mocked) |
| `tests/unit/test_server_exports.js` | `../../server` |

### 0.5.5 Test File Structure Summary

```
tests/
├── unit/                              # NEW FOLDER
│   ├── test_server_routes.js          # CREATE - 15+ tests
│   ├── test_server_lifecycle.js       # CREATE - 12+ tests
│   ├── test_server_config.js          # CREATE - 10+ tests
│   ├── test_server_errors.js          # CREATE - 8+ tests
│   └── test_server_exports.js         # CREATE - 4+ tests
├── fixtures/                          # NEW FOLDER
│   ├── ssl_mocks.js                   # CREATE - Mock SSL data
│   └── env_fixtures.js                # CREATE - Env presets
├── helpers/                           # NEW FOLDER
│   └── test_utils.js                  # CREATE - Shared utilities
└── security/                          # EXISTING - Reference only
    ├── test_cors.js                   # REFERENCE
    ├── test_headers.js                # REFERENCE
    ├── test_rate_limit.js             # REFERENCE
    ├── test_input_validation.js       # REFERENCE
    ├── test_cve_2024_51999.js         # REFERENCE
    └── test_cve_2025_13466.js         # REFERENCE
```

**Total New Test Files: 8**
**Total New Test Cases: ~49+ tests**

## 0.6 Dependency Inventory

### 0.6.1 Testing Dependencies

**Existing Testing Packages (Already Installed):**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest | 29.7.0 | Testing framework and test runner |
| npm | supertest | 7.1.4 | HTTP assertions for Express testing without network binding |

**Runtime Dependencies Under Test:**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | express | ^5.2.0 | Web application framework being tested |
| npm | helmet | ^8.1.0 | Security headers middleware |
| npm | cors | ^2.8.5 | CORS middleware |
| npm | express-rate-limit | ^8.2.1 | Rate limiting middleware |
| npm | express-validator | ^7.2.0 | Input validation middleware |

**No Additional Dependencies Required:**

The existing testing stack (Jest 29.7.0 + Supertest 7.1.4) is sufficient for all planned unit tests:
- Jest provides built-in mocking capabilities (`jest.mock()`, `jest.spyOn()`)
- Jest provides built-in coverage reporting (`--coverage` flag)
- Supertest handles HTTP testing without additional libraries
- No additional assertion libraries needed (Jest's `expect()` is comprehensive)

### 0.6.2 Dependency Version Verification

**Verified from package-lock.json:**

| Package | Declared Version | Resolved Version | Integrity Verified |
|---------|------------------|------------------|-------------------|
| jest | ^29.7.0 | 29.7.0 | ✅ |
| supertest | ^7.1.4 | 7.1.4 | ✅ |
| express | ^5.2.0 | 5.2.1 | ✅ |

**Node.js and npm Requirements:**

| Tool | Required (package.json) | Installed | Status |
|------|-------------------------|-----------|--------|
| Node.js | >=18.0.0 | 20.19.6 | ✅ Compatible |
| npm | >=7.0.0 | 11.1.0 | ✅ Compatible |

### 0.6.3 Built-in Jest Features to Use

| Feature | Usage | Configuration |
|---------|-------|---------------|
| `jest.mock()` | Mock fs, https modules | Inline in test files |
| `jest.spyOn()` | Spy on console.log/error | Inline in test files |
| `jest.fn()` | Create mock functions | Inline in test files |
| `jest.resetModules()` | Reset module cache | In beforeEach hooks |
| `--coverage` | Generate coverage report | CLI flag |
| `--detectOpenHandles` | Detect async leaks | Already configured |
| `--forceExit` | Force exit after tests | Already configured |

### 0.6.4 Import Updates Required

**Test Files Requiring Standard Imports:**

| Test File | Required Imports |
|-----------|------------------|
| `tests/unit/test_server_routes.js` | `const request = require('supertest');`<br/>`const { app } = require('../../server');` |
| `tests/unit/test_server_lifecycle.js` | `const request = require('supertest');`<br/>`const { app } = require('../../server');`<br/>`jest.mock('fs');`<br/>`jest.mock('https');` |
| `tests/unit/test_server_config.js` | `const request = require('supertest');`<br/>`const { app } = require('../../server');` |
| `tests/unit/test_server_errors.js` | `const request = require('supertest');`<br/>`const { app } = require('../../server');`<br/>`jest.mock('fs');`<br/>`jest.mock('https');` |
| `tests/unit/test_server_exports.js` | `const serverModule = require('../../server');` |

**Import Pattern from Existing Tests:**

```javascript
// Standard pattern from tests/security/test_headers.js
'use strict';
const request = require('supertest');
const { app } = require('../../server');
```

**Module Mock Pattern for Lifecycle Tests:**

```javascript
// Pattern for mocking Node.js built-in modules
jest.mock('fs');
jest.mock('https');

const fs = require('fs');
const https = require('https');
const { app } = require('../../server');
```

### 0.6.5 No New Dependencies to Install

**Confirmation:** All testing capabilities are available with existing packages.

| Capability | Provider | Status |
|------------|----------|--------|
| Test framework | Jest 29.7.0 | Installed |
| HTTP assertions | Supertest 7.1.4 | Installed |
| Mocking | Jest built-in | Available |
| Coverage | Jest built-in | Available |
| Async handling | Jest built-in | Available |

**npm install command:** Not required - all dependencies already present.

**npm ci verification:**
```bash
npm ci  # Verified - 354 packages installed successfully
```

## 0.7 Coverage and Quality Targets

### 0.7.1 Coverage Metrics

**Current Coverage Status:**
- Current coverage: Not measured (coverage not configured in package.json)
- Existing tests: 84 tests in `tests/security/` (security-focused integration tests)
- server.js coverage: Partial - routes tested implicitly, no lifecycle/error tests

**Target Coverage Goals:**

| Coverage Type | Current | Target | Rationale |
|---------------|---------|--------|-----------|
| Line Coverage | Unknown | 90%+ | Comprehensive testing per user request |
| Branch Coverage | Unknown | 85%+ | Cover all if/else paths in startServer() |
| Function Coverage | Unknown | 95%+ | All exported and key internal functions |
| Statement Coverage | Unknown | 90%+ | Industry standard for production code |

**Coverage Gaps to Address:**

| Component | Current Coverage | Target Coverage | Gap Analysis |
|-----------|------------------|-----------------|--------------|
| Route handlers (/, /evening, /health) | ~60% (implicit) | 100% | Need explicit route tests |
| startServer() function | 0% | 95%+ | Complete gap - needs all branches |
| HTTP startup path | 0% | 100% | No tests exist |
| HTTPS startup path | 0% | 100% | No tests exist |
| SSL certificate loading | 0% | 100% | No tests exist |
| Error handling (EADDRINUSE) | 0% | 100% | No tests exist |
| Error handling (EACCES) | 0% | 100% | No tests exist |
| Error handling (ENOENT) | 0% | 100% | No tests exist |
| Trust proxy configuration | 0% | 100% | No dedicated tests |
| Environment variable handling | 20% (implicit) | 90%+ | Need explicit tests |
| Module exports | 0% | 100% | No tests exist |

**Focus Areas for Coverage:**
- Critical paths: All route handlers, server startup, error handling
- Error handlers: All documented error codes (EADDRINUSE, EACCES, ENOENT)
- Edge cases: Invalid configurations, missing files, permission issues

### 0.7.2 Per-File Coverage Targets

| File | Target Line Coverage | Target Branch Coverage | Priority |
|------|---------------------|----------------------|----------|
| `server.js` | 90%+ | 85%+ | Critical |
| `middleware/security.js` | 80%+ (existing) | 75%+ | Medium |
| `middleware/validation.js` | 80%+ (existing) | 75%+ | Medium |
| `config/security.js` | 75%+ | 70%+ | Medium |

**server.js Coverage Breakdown:**

| Section (Lines) | Description | Target | Test File |
|-----------------|-------------|--------|-----------|
| 127 | Express app initialization | 100% | test_server_exports.js |
| 138-141 | Trust proxy configuration | 100% | test_server_config.js |
| 156-180 | Middleware application | Implicit | Covered by existing tests |
| 212-214 | GET / handler | 100% | test_server_routes.js |
| 239-241 | GET /evening handler | 100% | test_server_routes.js |
| 258-272 | GET /health handler | 100% | test_server_routes.js |
| 287-416 | startServer() function | 95%+ | test_server_lifecycle.js |

### 0.7.3 Test Quality Criteria

**Assertion Density Expectations:**

| Test Category | Minimum Assertions per Test | Rationale |
|---------------|----------------------------|-----------|
| Route tests | 3+ | Status, body, content-type |
| Health endpoint tests | 5+ | Status, body structure, security flags |
| Lifecycle tests | 4+ | Mock calls, console output, behavior |
| Error tests | 3+ | Error message, exit code, console |
| Config tests | 2+ | Behavior verification per config |

**Test Isolation Requirements:**
- Each test must run independently
- No shared mutable state between tests
- Environment variables restored after each test
- Module cache reset where needed
- Console mocks restored after each test

**Performance Constraints:**

| Constraint | Target | Measurement |
|------------|--------|-------------|
| Individual test execution | < 500ms | Jest timeout default |
| Full unit test suite | < 10s | Acceptable CI/CD time |
| Test startup overhead | < 1s | Module loading time |

**Maintainability Standards:**
- Use descriptive test names following `'should <behavior>'` pattern
- Group related tests with `describe()` blocks
- Use helper functions for repeated assertions
- Document any complex test setup in comments
- Follow existing test file patterns in repository

### 0.7.4 Repository Test Pattern Compliance

**Patterns to Follow from Existing Tests:**

| Pattern | Source | Application |
|---------|--------|-------------|
| File naming | `test_<feature>.js` | All new test files |
| Describe blocks | `'Feature Name - Component Name'` | All test files |
| Test cases | `'should <expected behavior>'` | All test cases |
| Environment setup | `beforeAll/afterAll` with env store/restore | Config tests |
| Supertest usage | `request(app).get('/').expect(200)` | Route tests |
| JSDoc headers | `@fileoverview` documentation | All new test files |

**Quality Checklist for Each Test File:**

- [ ] JSDoc `@fileoverview` header present
- [ ] Uses `'use strict';` directive
- [ ] Follows established naming conventions
- [ ] Contains `describe()` blocks for organization
- [ ] Uses `beforeAll/afterAll` for setup/teardown
- [ ] Restores mocked modules after tests
- [ ] Has minimum assertion density
- [ ] Can run in isolation
- [ ] Does not depend on test execution order

### 0.7.5 Coverage Verification Commands

**Run Coverage Report:**
```bash
npm test -- --coverage
```

**Run Coverage for Specific Tests:**
```bash
npm test -- --coverage --testPathPattern=unit
```

**Expected Coverage Report Format:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   XX.XX |    XX.XX |   XX.XX |   XX.XX |
 server.js          |   90.00 |    85.00 |   95.00 |   90.00 |
--------------------|---------|----------|---------|---------|
```

## 0.8 Scope Boundaries

### 0.8.1 Exhaustively In Scope

**New Test Files:**

| Pattern | Description |
|---------|-------------|
| `tests/unit/test_server_routes.js` | Route handler unit tests |
| `tests/unit/test_server_lifecycle.js` | Server startup/shutdown tests |
| `tests/unit/test_server_config.js` | Configuration unit tests |
| `tests/unit/test_server_errors.js` | Error handling unit tests |
| `tests/unit/test_server_exports.js` | Module export verification tests |
| `tests/unit/**/*.js` | All future unit tests in unit folder |

**Test Support Files:**

| Pattern | Description |
|---------|-------------|
| `tests/fixtures/ssl_mocks.js` | Mock SSL certificate data |
| `tests/fixtures/env_fixtures.js` | Environment variable fixtures |
| `tests/fixtures/**/*.js` | All test fixtures |
| `tests/helpers/test_utils.js` | Shared test utilities |
| `tests/helpers/**/*.js` | All test helper files |

**Test Configuration:**

| File | Scope |
|------|-------|
| `package.json` | Add new npm scripts for unit tests and coverage |
| `jest.config.js` | Optional - create if coverage thresholds needed |

**Source File Under Test:**

| File | Scope |
|------|-------|
| `server.js` | Primary target - all exported and key internal functions |

**Reference Files (Read-Only):**

| Pattern | Purpose |
|---------|---------|
| `tests/security/test_headers.js` | Pattern reference for header assertions |
| `tests/security/test_cors.js` | Pattern reference for request building |
| `tests/security/test_rate_limit.js` | Pattern reference for environment manipulation |
| `tests/security/*.js` | All security tests as pattern references |

### 0.8.2 Explicitly Out of Scope

**Source Code Modifications:**

| File | Reason |
|------|--------|
| `server.js` | No modifications - testing existing code as-is |
| `middleware/security.js` | No modifications - not targeted for testing |
| `middleware/validation.js` | No modifications - not targeted for testing |
| `config/security.js` | No modifications - not targeted for testing |
| `*.js` (all other source files) | No modifications - testing exercise only |

**Existing Test Files:**

| Pattern | Reason |
|---------|--------|
| `tests/security/test_cors.js` | Existing tests - reference only |
| `tests/security/test_headers.js` | Existing tests - reference only |
| `tests/security/test_rate_limit.js` | Existing tests - reference only |
| `tests/security/test_input_validation.js` | Existing tests - reference only |
| `tests/security/test_cve_*.js` | Existing tests - reference only |
| `tests/security/*.js` | All existing security tests - no modifications |

**Feature Additions:**

| Item | Reason |
|------|--------|
| New routes | Out of scope - testing existing routes only |
| New middleware | Out of scope - testing exercise only |
| New endpoints | Out of scope - not in user requirements |
| API changes | Out of scope - testing existing API |

**Performance Optimizations:**

| Item | Reason |
|------|--------|
| Route handler optimization | Out of scope - testing only |
| Middleware optimization | Out of scope - testing only |
| Server startup optimization | Out of scope - testing only |

**Refactoring:**

| Item | Reason |
|------|--------|
| Code structure changes | Out of scope - testing existing structure |
| Module reorganization | Out of scope - testing only |
| Configuration refactoring | Out of scope - testing only |

**Documentation:**

| Item | Status |
|------|--------|
| `README.md` updates | Out of scope unless testing section needed |
| JSDoc in source files | Out of scope - no source modifications |
| API documentation | Out of scope - testing only |

### 0.8.3 Boundary Clarifications

**Middleware Testing Boundary:**
- IN SCOPE: Testing that server.js correctly applies middleware (implicit)
- OUT OF SCOPE: Unit testing middleware internals (covered by existing security tests)

**Configuration Testing Boundary:**
- IN SCOPE: Testing server.js configuration handling (PORT, ENABLE_HTTPS, etc.)
- OUT OF SCOPE: Testing config/security.js module directly

**Integration vs Unit Boundary:**
- IN SCOPE: Unit tests for server.js using mocked dependencies
- IN SCOPE: Route handler tests using Supertest (integration-style but focused on server.js)
- OUT OF SCOPE: Full end-to-end tests with real SSL certificates

**Error Testing Boundary:**
- IN SCOPE: Error handling in startServer() function
- IN SCOPE: Mocked error scenarios (EADDRINUSE, EACCES, ENOENT)
- OUT OF SCOPE: Real network errors requiring actual port binding

### 0.8.4 Scope Change Triggers

**If any of these conditions arise, scope should be revisited:**

| Trigger | Action |
|---------|--------|
| server.js requires modification for testability | Escalate - source modification needed |
| Coverage targets unachievable without refactoring | Document as limitation |
| New dependencies required for testing | Document and get approval |
| Test framework change required | Major scope change - requires approval |

## 0.9 Execution Parameters

### 0.9.1 Testing-Specific Instructions

**Test Execution Commands:**

| Command | Purpose | Usage |
|---------|---------|-------|
| `npm test` | Run all tests (security + unit) | Standard CI/CD execution |
| `npm test -- --testPathPattern=unit` | Run only unit tests | Development focus |
| `npm test -- --testPathPattern=security` | Run only security tests | Security verification |
| `npm test -- tests/unit/test_server_routes.js` | Run single test file | Targeted debugging |

**Coverage Measurement Command:**
```bash
npm test -- --coverage --collectCoverageFrom='server.js'
```

**Watch Mode Command (Development):**
```bash
npm test -- --watch --testPathPattern=unit
```

**Single Test Execution Pattern:**
```bash
npm test -- -t 'should return Hello, World'
```

**Debug Mode Execution:**
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/test_server_routes.js
```

### 0.9.2 Environment Setup Requirements

**Required Environment Variables for Tests:**

| Variable | Test Value | Purpose |
|----------|------------|---------|
| `NODE_ENV` | `test` | Ensure test environment |
| `PORT` | `3000` (default) | Standard port for tests |
| `ENABLE_HTTPS` | `false` | Disable HTTPS for route tests |
| `TRUST_PROXY` | `false` | Disable trust proxy by default |

**Environment Variables Available (from user setup):**

| Variable | Status | Notes |
|----------|--------|-------|
| `DB_HOST` | Available | Not used by server.js |
| `API_KEY` | Available (secret) | Not used by server.js |

**Test Environment Isolation:**

```javascript
// Pattern for environment isolation in tests
let originalEnv;

beforeAll(() => {
  originalEnv = { ...process.env };
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  process.env = originalEnv;
});
```

### 0.9.3 Test Patterns to Follow

**Patterns from Repository:**

| Pattern | Example | Source |
|---------|---------|--------|
| File naming | `test_server_routes.js` | `tests/security/test_headers.js` |
| Describe blocks | `describe('Server Routes - GET /', ...)` | All existing tests |
| Test names | `it('should return Hello, World', ...)` | All existing tests |
| Supertest usage | `request(app).get('/').expect(200)` | All existing tests |
| Environment setup | Store/restore `process.env` | `test_rate_limit.js` |

**Test Structure Template:**

```javascript
/**
 * @fileoverview Unit tests for server.js route handlers
 * @module tests/unit/test_server_routes
 */

'use strict';

const request = require('supertest');
const { app } = require('../../server');

describe('Server Routes - GET /', () => {
  it('should return Hello, World with 200 status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });
});
```

### 0.9.4 Excluded Test Categories

**Per User Instructions - No Exclusions Specified**

All test categories are included:
- Route handler tests ✅
- Status code tests ✅
- Header tests ✅
- Server startup/shutdown tests ✅
- Error handling tests ✅
- Edge case tests ✅

### 0.9.5 CI/CD Integration Parameters

**GitHub Actions Integration (if applicable):**

```yaml
# Example test step for CI
- name: Run Tests
  run: npm test
  env:
    NODE_ENV: test
    CI: true
```

**Test Timeouts:**

| Context | Timeout | Configuration |
|---------|---------|---------------|
| Individual test | 5000ms | Jest default |
| Test suite | 30000ms | Jest default |
| CI pipeline | 60000ms | Configurable |

**Parallel Execution:**
- Jest runs test files in parallel by default
- Use `--runInBand` for sequential execution if needed
- Current test suite size (84 existing + ~49 new) is suitable for parallel execution

### 0.9.6 Test Execution Verification

**Pre-Execution Checklist:**
- [ ] Dependencies installed (`npm ci` completed)
- [ ] Node.js version verified (≥18.0.0)
- [ ] No port conflicts (3000 not in use)
- [ ] Environment variables set correctly

**Post-Execution Verification:**
- [ ] All tests pass (exit code 0)
- [ ] No console errors (non-mocked)
- [ ] Coverage meets targets (if enabled)
- [ ] No open handles detected

**Verification Command:**
```bash
# Full verification run
npm test && echo "All tests passed"
```

## 0.10 Special Instructions

### 0.10.1 Testing-Specific Requirements

**Minimal Change Principle:**
- ONLY create new test files in `tests/unit/`, `tests/fixtures/`, and `tests/helpers/`
- DO NOT modify existing source code (`server.js`, `middleware/*.js`, `config/*.js`)
- DO NOT modify existing test files in `tests/security/`
- Only modify `package.json` to add new npm scripts

**Pattern Adherence:**
- Follow existing test patterns established in `tests/security/test_headers.js`
- Use the same JSDoc header format for new test files
- Maintain consistent `describe()/it()` block structure
- Use identical Supertest patterns for HTTP assertions

**Test Isolation Requirements:**
- Ensure all tests can run independently
- Ensure all tests can run in parallel (no shared mutable state)
- Ensure environment variables are restored after each test
- Use `jest.resetModules()` when module state needs clearing

### 0.10.2 Mocking Guidelines

**Use Existing Mocking Patterns:**
- Use `jest.spyOn(console, 'log').mockImplementation()` for console mocking
- Use `jest.spyOn(console, 'error').mockImplementation()` for error output
- Use `jest.mock('fs')` for file system mocking in lifecycle tests
- Use `jest.mock('https')` for HTTPS server mocking

**Mock Restoration:**
- All mocks must be restored in `afterAll()` or `afterEach()` hooks
- Use `jest.restoreAllMocks()` for comprehensive cleanup
- Verify no mock leakage between test files

### 0.10.3 Framework Selection Confirmation

**Framework Decision: Jest**

The user specified "Jest or Mocha" - the Blitzy platform selects **Jest** for the following reasons:

| Factor | Jest | Mocha | Decision |
|--------|------|-------|----------|
| Already installed | ✅ Yes | ❌ No | Jest |
| Configured in package.json | ✅ Yes | ❌ No | Jest |
| Existing tests use | ✅ Jest | ❌ - | Jest |
| Built-in mocking | ✅ Yes | ❌ Needs sinon | Jest |
| Built-in coverage | ✅ Yes | ❌ Needs nyc | Jest |
| Team familiarity | ✅ Assumed | ❓ Unknown | Jest |

**No Mocha Installation Required:**
- Mocha would require additional setup and configuration
- Mocha would require additional libraries (chai, sinon, nyc)
- Using Jest maintains consistency with existing test infrastructure

### 0.10.4 Code Style and Naming Conventions

**File Naming:**
- Use `test_<feature>.js` format (matching existing tests)
- Use snake_case for file names
- Place unit tests in `tests/unit/` folder

**Test Naming:**
- Describe blocks: `'<Feature> - <Component>'`
- Test cases: `'should <expected behavior>'`
- Be specific and descriptive

**Code Style:**
- Use `'use strict';` directive
- Use CommonJS (`require`) not ES Modules
- Use 2-space indentation
- Use single quotes for strings
- Include semicolons
- Follow ES6+ syntax where appropriate

### 0.10.5 Backward Compatibility

**Maintain Test Suite Compatibility:**
- New tests must not break existing `npm test` command
- New tests must work with existing Jest configuration
- New test files must match `testMatch` patterns in package.json

**Existing Test Pattern Preservation:**
- Use identical import patterns as existing tests
- Use identical assertion patterns as existing tests
- Use identical environment handling as existing tests

### 0.10.6 Documentation Requirements

**JSDoc Headers Required:**
Each new test file must include:

```javascript
/**
 * @fileoverview [Description of test file purpose]
 * @module tests/unit/[test_file_name]
 * @requires supertest
 * @requires ../../server
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 */
```

**Inline Comments:**
- Document complex test setup
- Explain mock configurations
- Note any edge cases being tested

### 0.10.7 Quality Assurance Checklist

**Before Submitting Tests:**
- [ ] All new tests pass locally (`npm test`)
- [ ] No modifications to source code
- [ ] No modifications to existing tests
- [ ] JSDoc headers present in all new files
- [ ] Test names follow naming conventions
- [ ] Environment cleanup in afterAll hooks
- [ ] Mock restoration in place
- [ ] Tests run independently
- [ ] Tests run in parallel without conflicts
- [ ] Coverage targets achieved (if measurable)

### 0.10.8 User-Specified Requirements Summary

**From User Input:**
> "Create comprehensive unit tests for server.js using Jest or Mocha. Test HTTP responses, status codes, headers, server startup/shutdown, error handling, and edge cases"

**Implementation Mapping:**

| User Requirement | Implementation |
|------------------|----------------|
| "comprehensive unit tests for server.js" | 5 new test files covering all server.js functionality |
| "using Jest or Mocha" | Using Jest (already configured) |
| "Test HTTP responses" | `test_server_routes.js` - response body assertions |
| "status codes" | `test_server_routes.js` - status code assertions |
| "headers" | `test_server_routes.js` - header assertions |
| "server startup/shutdown" | `test_server_lifecycle.js` - lifecycle tests |
| "error handling" | `test_server_errors.js` - error scenario tests |
| "edge cases" | Distributed across all test files |

**Setup Instruction Handling:**
- User provided: `npm build run` - This appears to be a typo. The correct command is `npm run build` or simply `npm start`
- The project does not have a build script defined in package.json
- Tests run directly with `npm test` using Jest

