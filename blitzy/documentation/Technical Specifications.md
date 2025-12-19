# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create comprehensive unit tests for the Express.js server application (`server.js`)** using either **Jest** or **Mocha** testing framework.

**Request Category:** Add new tests

**Testing Requirements with Enhanced Clarity:**

- **HTTP Response Testing**: Verify that all endpoints return correct response bodies
  - `GET /` must return `"Hello, World!\n"` (including trailing newline)
  - `GET /evening` must return `"Good evening"`
  
- **Status Code Verification**: Ensure all routes return appropriate HTTP status codes
  - Success responses (200 OK) for valid requests
  - Error responses (404, 500) for invalid scenarios
  
- **Headers Validation**: Test response headers including
  - Content-Type headers
  - Content-Length headers
  - Custom headers if applicable
  
- **Server Startup/Shutdown Testing**: Verify server lifecycle management
  - Server binds correctly to `127.0.0.1:3000`
  - Server can be gracefully started and stopped
  - Startup callback executes properly
  
- **Error Handling**: Test how the server handles various error conditions
  - Undefined routes (404 responses)
  - Malformed requests
  - Server error scenarios
  
- **Edge Cases**: Comprehensive boundary condition testing
  - Empty request bodies
  - Invalid HTTP methods on defined routes
  - Concurrent request handling

**Implicit Testing Needs Surfaced:**

- Request method validation (GET vs POST vs PUT)
- Route path case sensitivity behavior
- Response encoding verification
- Connection timeout behavior

### 0.1.2 Special Instructions and Constraints

**Testing Framework Selection:**
- User specified **Jest or Mocha** as acceptable testing frameworks
- Recommendation: Jest for zero-configuration setup and built-in assertions

**Testing Requirements:**
- Use **Supertest** library for HTTP assertions (standard practice for Express testing)
- Follow Node.js testing conventions
- Match existing CommonJS module format of the codebase

**Web Search Research Conducted:**
- Jest and Supertest compatibility with Node.js 20.x - Confirmed compatible
- Express 5.x testing patterns with Supertest - Verified working
- Best practices for server lifecycle testing

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- To **test HTTP responses**, we will create unit tests using Supertest that make HTTP requests to the Express app instance and assert response bodies match expected values
- To **verify status codes**, we will use Supertest's `.expect(statusCode)` chaining to validate response codes
- To **validate headers**, we will use Supertest's `.expect('header-name', value)` assertions
- To **test server startup/shutdown**, we will create integration tests that verify the server binding and callback execution
- To **test error handling**, we will create tests for undefined routes and error scenarios
- To **cover edge cases**, we will test boundary conditions including invalid methods and malformed requests

### 0.1.4 Coverage Requirements Interpretation

**Explicit Coverage Targets:**
- All routes (`/` and `/evening`) must have comprehensive test coverage
- All specified test categories (responses, status codes, headers, lifecycle, errors, edge cases) must be addressed

**Implicit Coverage Expectations:**
- Based on industry standards for Express.js applications: Target **80%+ code coverage**
- Critical path coverage for all public endpoints: **100%**
- Error path coverage: **Minimum 70%**

**Comprehensive Testing Coverage Should Include:**
- Statement coverage for all executable lines in `server.js`
- Branch coverage for any conditional logic
- Function coverage for route handlers
- Line coverage for server configuration

## 0.2 Test Discovery and Analysis

### 0.2.1 Existing Test Infrastructure Assessment

**Repository Analysis Results:**

Repository analysis reveals **no existing testing infrastructure**. The project currently has:

- **No test files**: No files matching patterns `*test*`, `*spec*`, `test_*`, `spec_*`, `*_test.*`, `*_spec.*`
- **No test directories**: No `test/`, `tests/`, `__tests__/`, or `spec/` folders
- **No testing framework**: No Jest, Mocha, or other testing packages in `package.json`
- **Placeholder test script**: `package.json` contains `"test": "echo \"Error: no test specified\" && exit 1"`

**Current Project Structure:**
```
hello_world/
├── server.js           # Main Express application (target for testing)
├── package.json        # npm manifest (no test dependencies)
├── package-lock.json   # Dependency lockfile
├── README.md           # Minimal documentation
├── .gitignore          # Standard Node.js ignores
└── blitzy/
    └── documentation/  # Migration documentation
```

**Findings Summary:**
- Repository analysis reveals **zero existing testing setup** with **no coverage infrastructure**
- Server implementation is minimal (19 lines) making it ideal for comprehensive testing
- CommonJS module format (`require`/`module.exports`) detected

### 0.2.2 Test Infrastructure Assessment Details

| Component | Status | Details |
|-----------|--------|---------|
| Testing Framework | NOT INSTALLED | No Jest, Mocha, or alternatives |
| Test Runner Configuration | NOT PRESENT | No jest.config.js, mocharc.*, etc. |
| Coverage Tools | NOT INSTALLED | No nyc, c8, or Jest coverage configured |
| Mock/Stub Libraries | NOT INSTALLED | No sinon, jest-mock, or similar |
| Test Data Fixtures | NOT PRESENT | No fixture files or factories |
| HTTP Testing Library | NOT INSTALLED | No Supertest or similar |

### 0.2.3 Server.js Analysis for Testability

**Source File:** `server.js` (19 lines)

**Testable Components Identified:**

| Component | Line(s) | Test Category | Testability Notes |
|-----------|---------|---------------|-------------------|
| Express app initialization | 6 | Unit | Direct testing possible |
| GET `/` route handler | 8-10 | Unit/Integration | Requires app export modification |
| GET `/evening` route handler | 12-14 | Unit/Integration | Requires app export modification |
| Server listen binding | 16-18 | Integration | Requires lifecycle management |
| Console log callback | 17 | Integration | Verify stdout output |

**Testability Challenges:**
- Server currently starts automatically on require (no app export)
- No separation between app configuration and server startup
- Will require minor refactoring to export app for testing without starting server

### 0.2.4 Web Search Research Conducted

**Research Topics and Findings:**

| Topic | Findings |
|-------|----------|
| Jest + Express 5 patterns | <cite index="14-6">Express version 5 and testing it using supertest</cite> is a validated approach |
| Supertest HTTP testing | <cite index="11-2,11-3">If the server is not already listening for connections then it is bound to an ephemeral port for you so there is no need to keep track of ports</cite> |
| Jest Node environment | <cite index="13-3,13-4">We need to tell Jest that we're only running our tests in Node.js environment. This will disable Jest's JSDom in our tests, which we don't need since we're building a server</cite> |
| Test organization | <cite index="15-9,15-10,15-11">A common convention is to create a folder called tests or to put test files alongside your source files with a .test.js extension</cite> |

**Best Practices Identified:**
- Separate app configuration from server startup for testability
- Use Supertest to pass Express app directly without manual port binding
- Configure Jest for Node.js environment (disable jsdom)
- Organize tests in dedicated `tests/` or `__tests__/` directory

## 0.3 Testing Scope Analysis

### 0.3.1 Test Target Identification

**Primary Code to be Tested:**

| Module/Component | Path | Test Types Required |
|-----------------|------|---------------------|
| Express Application | `server.js` | Unit tests, Integration tests |
| Root Route Handler | `server.js:8-10` | Unit tests, Response validation |
| Evening Route Handler | `server.js:12-14` | Unit tests, Response validation |
| Server Configuration | `server.js:3-4,16-18` | Integration tests, Lifecycle tests |

**Functions Requiring Tests:**

| Function | Location | Test Categories |
|----------|----------|-----------------|
| `app.get('/', handler)` | Line 8 | Happy path, Response body, Status codes, Headers |
| `app.get('/evening', handler)` | Line 12 | Happy path, Response body, Status codes, Headers |
| `app.listen(port, hostname, callback)` | Line 16 | Startup verification, Callback execution |

**Existing Test File Mapping:**

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|-------------------------|
| `server.js` | NONE | NONE - All tests to be created |

### 0.3.2 Dependencies Requiring Mocking

**External Services to Mock:** None - Server has no external API calls

**Database Interactions to Stub:** None - Server has no database connections

**File System Operations to Virtualize:** None - Server has no file operations

**Modules Requiring Test Doubles:**
- `console.log` - Spy to verify startup message output
- Express `app.listen` - For isolated unit testing of configuration

### 0.3.3 Version Compatibility Research

Based on current Node.js version `20.19.6` and Express `5.1.0`, the recommended testing stack:

| Component | Recommended Version | Compatibility Rationale |
|-----------|---------------------|------------------------|
| Jest | `29.7.0` | Stable LTS version, full Node 20 support, widely tested with Express |
| Supertest | `7.1.4` | Latest version, Express 5 compatible, handles ephemeral ports |
| jest-environment-node | `29.7.0` | Bundled with Jest 29.x, optimized for server testing |

**Alternative Stack (Mocha-based):**

| Component | Recommended Version | Compatibility Rationale |
|-----------|---------------------|------------------------|
| Mocha | `11.7.5` | Latest stable, Node 20 ESM/CJS support |
| Chai | `6.2.1` | Latest version, assertion library |
| Supertest | `7.1.4` | Same as Jest stack |

**Version Conflicts:** None identified - all packages are compatible with Node.js 20.x and Express 5.x

### 0.3.4 Testing Architecture Decision

**Recommended Framework: Jest**

**Rationale:**
- Zero-configuration setup for Node.js testing
- Built-in assertion library (no external dependencies)
- Built-in code coverage reporting
- Parallel test execution by default
- Active maintenance and community support
- Simpler configuration than Mocha + Chai combination

**Test Architecture:**
```
hello_world/
├── server.js                    # Source (requires minor export modification)
├── app.js                       # NEW: Extracted app for testability
├── package.json                 # Updated with test scripts and dependencies
├── jest.config.js               # NEW: Jest configuration
└── tests/
    ├── unit/
    │   └── server.test.js       # Unit tests for route handlers
    └── integration/
        └── server.integration.test.js  # Lifecycle and full request tests
```

## 0.4 Test Implementation Design

### 0.4.1 Test Strategy Selection

**Test Types to Implement:**

| Test Type | Focus Area | Implementation Approach |
|-----------|------------|------------------------|
| Unit Tests | Isolated route handler validation | Supertest + Jest with extracted app |
| Integration Tests | Full request/response cycle, server lifecycle | Supertest against running server |
| Edge Case Tests | Boundary conditions, invalid inputs | Parameterized tests with error assertions |
| Error Handling Tests | 404 responses, malformed requests | Negative test scenarios |

### 0.4.2 Test Case Blueprint

**Component: Root Route Handler (`GET /`)**
```
Test Categories:
- Happy path: Response body equals "Hello, World!\n", Status 200
- Edge cases: Trailing slash handling, Case sensitivity
- Error cases: Invalid HTTP methods (POST, PUT, DELETE)
- Headers: Content-Type verification, Content-Length check
```

**Component: Evening Route Handler (`GET /evening`)**
```
Test Categories:
- Happy path: Response body equals "Good evening", Status 200
- Edge cases: Query parameters ignored, Path variations
- Error cases: Invalid HTTP methods (POST, PUT, DELETE)
- Headers: Content-Type verification, Content-Length check
```

**Component: Server Lifecycle**
```
Test Categories:
- Happy path: Server starts on specified port/host, Callback executes
- Edge cases: Multiple startup attempts, Port already in use
- Error cases: Invalid hostname, Invalid port
- Integration: Full request after startup, Graceful shutdown
```

**Component: Error Handling**
```
Test Categories:
- Happy path: N/A (error scenario testing)
- Edge cases: Non-existent routes return 404
- Error cases: Server error responses (500)
- Headers: Error response headers validation
```

### 0.4.3 Existing Test Extension Strategy

Not applicable - no existing tests to extend. All tests will be created from scratch.

### 0.4.4 Test Data and Fixtures Design

**Required Test Data Structures:**

| Data Type | Purpose | Values |
|-----------|---------|--------|
| Expected Response Bodies | Assertion comparison | `"Hello, World!\n"`, `"Good evening"` |
| Server Configuration | Setup/teardown | `hostname: '127.0.0.1'`, `port: 3000` |
| Invalid Routes | 404 testing | `/nonexistent`, `/api/missing` |
| Invalid Methods | Method testing | `POST`, `PUT`, `DELETE`, `PATCH` |

**Fixture Organization:**
- Constants defined in test files (simple enough for inline definition)
- No external fixture files required for this minimal server

**Mock Object Specifications:**
- Console mock for startup message verification
- No complex mocks required due to minimal dependencies

**Test Database/State Management:**
- Not applicable - server is stateless
- Each test receives fresh app instance via Supertest

## 0.5 Test File Transformation Mapping

### 0.5.1 File-by-File Test Plan

| Target Test File | Transformation | Source File/Reference | Purpose/Changes |
|-----------------|----------------|----------------------|-----------------|
| `tests/unit/server.test.js` | CREATE | `server.js` | Comprehensive unit tests for all route handlers including response bodies, status codes, headers, and invalid method handling |
| `tests/integration/server.integration.test.js` | CREATE | `server.js` | Integration tests for server startup/shutdown, lifecycle management, and end-to-end request flows |
| `tests/unit/routes.test.js` | CREATE | `server.js` | Dedicated route-specific tests covering edge cases, path variations, and boundary conditions |
| `tests/unit/errorHandling.test.js` | CREATE | `server.js` | Error handling tests for 404 responses, undefined routes, and error scenarios |
| `app.js` | CREATE | `server.js` | Extract Express app configuration for testability without automatic server startup |
| `jest.config.js` | CREATE | N/A | Jest configuration for Node.js environment, coverage settings, and test patterns |
| `server.js` | UPDATE | `server.js` | Minimal modification to import app from `app.js` while preserving existing behavior |
| `package.json` | UPDATE | `package.json` | Add test script, Jest and Supertest as devDependencies |

### 0.5.2 New Test Files Detail

**tests/unit/server.test.js** - Core unit test coverage
```
Test categories: Happy path, Status codes, Response bodies, Headers
Mock dependencies: None (using Supertest ephemeral binding)
Assertions focus:
- Response body exact match verification
- HTTP 200 status codes for valid routes
- Content-Type and Content-Length headers
- Trailing newline in root response
```

**tests/integration/server.integration.test.js** - Server lifecycle testing
```
Integration points: Express app.listen(), server binding, callback execution
Test data requirements: Host/port configuration values
Assertions focus:
- Server startup on correct host:port
- Callback function execution
- Graceful server shutdown
- Request handling after startup
```

**tests/unit/routes.test.js** - Route-specific edge case tests
```
Test categories: Edge cases, Path handling, Query parameters
Mock dependencies: None
Assertions focus:
- Route path matching behavior
- Invalid HTTP method responses
- Case sensitivity handling
```

**tests/unit/errorHandling.test.js** - Error scenario tests
```
Test categories: 404 responses, Error handling
Mock dependencies: None
Assertions focus:
- 404 status for undefined routes
- Appropriate error responses
- Error response headers
```

### 0.5.3 Source Files to Modify Detail

**app.js** - NEW: Extracted app configuration
```javascript
// Extract Express app setup for testability
// Exports: app instance (not started)
// Purpose: Allow Supertest to manage server lifecycle
```

**server.js** - UPDATE: Import app and start server
```
Changes required:
- Import app from app.js
- Preserve server startup behavior for production
- Keep existing console.log message
```

**package.json** - UPDATE: Test infrastructure
```
New npm scripts:
- "test": "jest"
- "test:coverage": "jest --coverage"
- "test:watch": "jest --watch"

New devDependencies:
- jest: ^29.7.0
- supertest: ^7.1.4
```

### 0.5.4 Test Configuration Updates

**jest.config.js** - Jest configuration file
```
Settings to configure:
- testEnvironment: "node"
- roots: ["<rootDir>/tests"]
- testMatch: ["**/*.test.js"]
- collectCoverage: false (enable via CLI)
- coverageDirectory: "coverage"
- coverageThreshold: { global: { statements: 80, branches: 80 } }
```

### 0.5.5 Cross-File Test Dependencies

**Shared Components:**

| Component | Location | Usage |
|-----------|----------|-------|
| Express app instance | `app.js` | Imported by all test files via Supertest |
| Server configuration constants | Inline in tests | Port 3000, host 127.0.0.1 |
| Expected response values | Inline in tests | "Hello, World!\n", "Good evening" |

**Import Structure:**
```
tests/unit/server.test.js        → imports: supertest, ../app.js
tests/unit/routes.test.js        → imports: supertest, ../app.js
tests/unit/errorHandling.test.js → imports: supertest, ../app.js
tests/integration/*.test.js      → imports: supertest, ../app.js
```

**No external test utilities required** - Jest provides all necessary assertion and lifecycle management capabilities

## 0.6 Dependency Inventory

### 0.6.1 Testing Dependencies

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest | 29.7.0 | Testing framework with built-in assertion library, test runner, and coverage reporting |
| npm | supertest | 7.1.4 | HTTP assertions library for testing Express endpoints without starting server |

**Optional Dependencies (If Enhanced Coverage Needed):**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest-extended | 4.0.2 | Additional Jest matchers for more expressive assertions |
| npm | @types/jest | 29.5.14 | TypeScript type definitions (if TypeScript is added later) |
| npm | @types/supertest | 6.0.2 | TypeScript type definitions (if TypeScript is added later) |

### 0.6.2 Existing Runtime Dependencies (Unchanged)

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | express | ^5.1.0 | Web application framework (existing production dependency) |

### 0.6.3 Development Dependencies Summary

**Complete `devDependencies` Section for package.json:**
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.1.4"
  }
}
```

### 0.6.4 Import Updates Required

**Test files requiring imports:**

| File Pattern | Import Updates |
|--------------|----------------|
| `tests/**/*.test.js` | `const request = require('supertest');` |
| `tests/**/*.test.js` | `const app = require('../../app');` |

**Import transformation rules:**
```
// All test files will use:
const request = require('supertest');
const app = require('../../app');  // or '../app' depending on directory depth

// For integration tests that need server reference:
const app = require('../../app');
```

**Source file import updates:**
```
// server.js - Updated import
const app = require('./app');

// app.js - New file exports
module.exports = app;
```

### 0.6.5 Alternative Mocha Configuration (If Selected)

If Mocha is chosen over Jest, use these dependencies:

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | mocha | 11.7.5 | Testing framework |
| npm | chai | 6.2.1 | Assertion library |
| npm | supertest | 7.1.4 | HTTP assertions library |
| npm | nyc | 17.1.0 | Code coverage tool |

**Mocha devDependencies:**
```json
{
  "devDependencies": {
    "mocha": "^11.7.5",
    "chai": "^6.2.1",
    "supertest": "^7.1.4",
    "nyc": "^17.1.0"
  }
}
```

## 0.7 Coverage and Quality Targets

### 0.7.1 Coverage Metrics

**Current Coverage:** 0% (No tests exist)

**Target Coverage:** 90%+ based on user requirement for "comprehensive" testing

**Coverage Gaps to Address:**

| Component | Current | Target | Focus Areas |
|-----------|---------|--------|-------------|
| Route Handlers | 0% | 100% | Response validation, status codes |
| Server Configuration | 0% | 80% | Startup, binding, callback |
| Error Paths | 0% | 90% | 404 handling, invalid methods |
| Edge Cases | 0% | 85% | Boundary conditions |

**Per-File Coverage Targets:**

| File | Statement | Branch | Function | Line |
|------|-----------|--------|----------|------|
| `app.js` | 100% | 100% | 100% | 100% |
| `server.js` | 80% | N/A | 100% | 80% |

### 0.7.2 Test Quality Criteria

**Assertion Density Expectations:**
- Minimum 2 assertions per test case
- Each test should verify both status code AND response body
- Header assertions where applicable

**Test Isolation Requirements:**
- Each test must be independent and executable in isolation
- No shared state between tests
- Fresh app instance per test via Supertest

**Performance Constraints:**
- Individual test execution: < 500ms
- Full test suite: < 5 seconds
- No external network calls during tests

**Maintainability Standards:**
- Clear test descriptions using describe/it blocks
- Consistent naming convention: `should [expected behavior]`
- Organized by functionality (routes, errors, lifecycle)
- DRY principles for repeated assertions

### 0.7.3 Test Categories and Expected Counts

| Category | Expected Test Count | Coverage Focus |
|----------|---------------------|----------------|
| Route Response Tests | 4+ | Body content validation |
| Status Code Tests | 6+ | HTTP status verification |
| Header Tests | 4+ | Content-Type, Content-Length |
| Error Handling Tests | 4+ | 404 responses, invalid methods |
| Server Lifecycle Tests | 3+ | Startup, shutdown, callback |
| Edge Case Tests | 4+ | Boundary conditions |
| **Total Minimum** | **25+** | Comprehensive coverage |

### 0.7.4 Quality Gates

**Test Suite Must Pass These Criteria:**
- All tests pass (0 failures)
- Code coverage meets minimum thresholds
- No skipped tests in final submission
- No console errors during test execution
- Test execution completes within timeout limits

**Jest Coverage Thresholds (jest.config.js):**
```javascript
coverageThreshold: {
  global: {
    statements: 80,
    branches: 80,
    functions: 90,
    lines: 80
  }
}
```

## 0.8 Scope Boundaries

### 0.8.1 Exhaustively In Scope

**New Test Files:**
- `tests/unit/server.test.js` - Core unit tests
- `tests/unit/routes.test.js` - Route-specific edge cases
- `tests/unit/errorHandling.test.js` - Error scenario tests
- `tests/integration/server.integration.test.js` - Server lifecycle tests
- `tests/**/*.test.js` - All test files in tests directory

**Source File Modifications (Minimal):**
- `app.js` - NEW: Extract Express app configuration for testability
- `server.js` - UPDATE: Import app from app.js (minimal change)

**Test Configuration:**
- `jest.config.js` - Jest configuration file
- `package.json` - Test scripts and devDependencies

**Test Utilities:**
- None required (Jest built-ins sufficient)

**Documentation Updates:**
- `README.md` - Add testing section with commands (optional)

### 0.8.2 Explicitly Out of Scope

**Source Code Modifications Beyond Testability:**
- Adding new routes or endpoints
- Changing response bodies or behavior
- Adding middleware or error handlers to production code
- Modifying Express configuration beyond export

**Non-Test Features:**
- Database integration
- Authentication/authorization
- Logging infrastructure
- Environment configuration (.env files)
- Docker/containerization
- CI/CD pipeline configuration
- HTTPS/TLS configuration
- Process management (PM2, etc.)

**Unrelated Test Files:**
- E2E tests with browser automation
- Performance/load testing
- Security scanning tests

**Items Explicitly Excluded per User Instructions:**
- No modifications to existing business logic
- No feature additions while adding tests
- No infrastructure changes beyond test setup

### 0.8.3 Boundary Clarifications

**What Constitutes "Minimal Source Modification":**
- Extracting Express `app` to separate file for export
- Importing extracted app in server.js
- No changes to route handlers, response bodies, or server behavior

**Test Infrastructure Boundaries:**

| Item | In Scope | Out of Scope |
|------|----------|--------------|
| Jest setup | ✓ | |
| Supertest setup | ✓ | |
| Coverage reporting | ✓ | |
| CI/CD integration | | ✓ |
| Docker test containers | | ✓ |
| Browser-based testing | | ✓ |
| Performance benchmarks | | ✓ |

### 0.8.4 File Pattern Summary

**Files to CREATE:**
```
tests/
├── unit/
│   ├── server.test.js
│   ├── routes.test.js
│   └── errorHandling.test.js
└── integration/
    └── server.integration.test.js

app.js
jest.config.js
```

**Files to UPDATE:**
```
server.js     # Minimal import change
package.json  # Add devDependencies and test scripts
```

**Files NOT to Modify:**
```
package-lock.json  # Auto-generated by npm
.gitignore         # No changes needed
README.md          # Optional documentation only
blitzy/**/*        # Documentation untouched
```

## 0.9 Execution Parameters

### 0.9.1 Testing-Specific Instructions

**Test Execution Commands:**

| Purpose | Command |
|---------|---------|
| Run all tests | `npm test` |
| Run tests with coverage | `npm run test:coverage` |
| Run tests in watch mode | `npm run test:watch` |
| Run single test file | `npx jest tests/unit/server.test.js` |
| Run tests matching pattern | `npx jest --testNamePattern="GET /"` |
| Debug mode execution | `node --inspect-brk node_modules/.bin/jest --runInBand` |

### 0.9.2 Package.json Scripts Configuration

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:verbose": "jest --verbose"
  }
}
```

### 0.9.3 Jest CLI Options Reference

| Option | Purpose | Usage |
|--------|---------|-------|
| `--coverage` | Generate coverage report | `npm test -- --coverage` |
| `--watch` | Re-run tests on file changes | `npm test -- --watch` |
| `--verbose` | Show individual test results | `npm test -- --verbose` |
| `--runInBand` | Run tests serially | `npm test -- --runInBand` |
| `--testTimeout=5000` | Set custom timeout | `npm test -- --testTimeout=5000` |
| `--detectOpenHandles` | Debug hanging tests | `npm test -- --detectOpenHandles` |

### 0.9.4 Environment Setup Requirements

**Prerequisites:**
- Node.js 20.x installed and active
- npm 10.x or higher
- Project dependencies installed via `npm install`

**Test Environment Variables:**
- `NODE_ENV=test` (optional, for environment-specific behavior)
- No additional environment variables required

**Setup Commands:**
```bash
# Install all dependencies including devDependencies
npm install

#### Verify Jest is available
npx jest --version

#### Run tests
npm test
```

### 0.9.5 Test Patterns and Conventions

**File Naming Convention:**
- Unit tests: `*.test.js`
- Integration tests: `*.integration.test.js`

**Directory Structure:**
```
tests/
├── unit/           # Fast, isolated unit tests
└── integration/    # Tests requiring server lifecycle
```

**Test Naming Convention:**
```javascript
describe('Component/Feature', () => {
  describe('Method/Scenario', () => {
    it('should [expected behavior]', () => {
      // test implementation
    });
  });
});
```

### 0.9.6 CI/CD Integration Notes

**For future CI/CD integration (out of scope but documented):**

```yaml
# Example GitHub Actions snippet
- name: Run tests
  run: npm test -- --ci --coverage
  env:
    CI: true
```

**CI-specific flags:**
- `--ci`: Disables interactive prompts
- `--coverage`: Generates coverage for reporting
- `--maxWorkers=2`: Limit parallelism in CI environment

## 0.10 Special Instructions for Testing

### 0.10.1 Minimal Change Principle

**CRITICAL DIRECTIVE:** Only modify test files and test-related configurations.

- **DO NOT** modify source code business logic
- **DO NOT** add new features while adding tests
- **DO NOT** change response bodies or status codes in production code
- **MINIMAL** source modification allowed: Extract `app` for testability only

### 0.10.2 Source Code Modification Guidelines

**Permitted Modifications:**

| File | Permitted Changes | Prohibited Changes |
|------|-------------------|-------------------|
| `server.js` | Import app from app.js | Route handler logic |
| `app.js` | Create new file with app setup | N/A (new file) |
| `package.json` | devDependencies, scripts | dependencies, main, name |

**App Extraction Pattern:**

```javascript
// app.js - NEW FILE (Permitted)
const express = require('express');
const app = express();
// ... route definitions ...
module.exports = app;

// server.js - MINIMAL CHANGE (Permitted)
const app = require('./app');
app.listen(port, hostname, callback);
```

### 0.10.3 Test Pattern Requirements

**Follow Repository Test Conventions:**
- Use CommonJS `require` syntax (match existing codebase)
- Use Jest's built-in `describe`/`it`/`expect` functions
- Keep tests in dedicated `tests/` directory

**Test Isolation Mandate:**
- Each test must be independent
- Use Supertest's ephemeral port binding
- No shared state between test files
- Clean up any resources in `afterEach`/`afterAll`

**Assertion Standards:**
- Use Jest's `expect()` for assertions
- Use Supertest's `.expect()` for HTTP assertions
- Verify both status code AND response body

### 0.10.4 Mocking Guidelines

**Console Mocking (for startup message verification):**
```javascript
// Permitted approach
const consoleSpy = jest.spyOn(console, 'log');
// ... test ...
consoleSpy.mockRestore();
```

**No External Mocking Required:**
- Server has no external dependencies
- No database mocking needed
- No API mocking needed

### 0.10.5 Test Execution Constraints

**Parallel Execution:**
- Tests should run independently and in parallel
- Jest default parallelization is acceptable
- No test ordering dependencies allowed

**Timeout Requirements:**
- Individual tests: 5000ms (Jest default)
- Full suite: Should complete in < 10 seconds

**Backward Compatibility:**
- Tests must work with existing `server.js` behavior
- No breaking changes to production functionality
- Maintain existing API contract

### 0.10.6 Code Style and Naming Conventions

**Match Existing Repository Style:**
- Single quotes for strings
- No semicolons (match existing style) OR semicolons if present
- 2-space indentation
- CommonJS module format

**Test Naming:**
- Describe blocks: Feature or component name
- It blocks: `should [verb] [expected outcome]`

**Example:**
```javascript
describe('GET /', () => {
  it('should return Hello World with newline', async () => {
    // test implementation
  });
});
```

### 0.10.7 Documentation Requirements

**Each test file should include:**
- Brief header comment explaining test purpose
- Clear describe block organization
- Meaningful test descriptions

**README updates (optional):**
- Document test commands
- Explain test structure
- Note coverage expectations

