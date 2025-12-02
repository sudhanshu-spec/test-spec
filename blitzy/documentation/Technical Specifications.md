# Technical Specification

# 0. Agent Action Plan

## 0.1 Intent Clarification

### 0.1.1 Core Testing Objective

Based on the provided requirements, the Blitzy platform understands that the testing objective is to **create a comprehensive unit test suite for server.js** that validates all HTTP behaviors, response characteristics, and operational scenarios of the Express.js web server.

**Request Category:** Add new tests (from scratch - no existing test infrastructure)

**Testing Requirements with Enhanced Clarity:**

- **HTTP Response Testing:** Validate that all endpoints return the correct response bodies
  - GET `/` should return `'Hello, World!\n'` (including trailing newline)
  - GET `/evening` should return `'Good evening'`
  
- **Status Code Testing:** Verify HTTP status codes for all request scenarios
  - Successful requests return 200 OK
  - Non-existent routes return 404 Not Found
  - Unsupported methods return appropriate error codes
  
- **Header Testing:** Assert correct Content-Type and other HTTP headers
  - Response headers for text/html or text/plain content types
  - Content-Length headers when applicable
  
- **Server Startup/Shutdown Testing:** Test server lifecycle management
  - Verify server starts correctly on configured host and port
  - Validate graceful shutdown behavior
  - Test console.log output during startup
  
- **Error Handling Testing:** Cover error scenarios
  - Invalid routes should return 404
  - Unsupported HTTP methods (POST, PUT, DELETE on defined routes)
  - Malformed requests handling
  
- **Edge Case Testing:** Cover boundary conditions
  - Empty requests
  - Requests with query parameters
  - Requests with headers
  - Concurrent request handling

**Implicit Testing Needs Identified:**

- The current `server.js` does NOT export the Express `app` object, which is required for supertest integration
- A testable architecture pattern must be implemented (export app separately from server startup)
- Mock/stub patterns for console.log to verify startup messages
- Port conflict handling scenarios

### 0.1.2 Special Instructions and Constraints

**Critical Directives:**
- Use Jest OR Mocha as specified by user (recommend Jest for modern Node.js ecosystem alignment)
- Use `supertest` library for HTTP endpoint testing
- Follow CommonJS module patterns (the project uses `require`, not ES modules)
- Maintain minimal changes to source code (only refactor `server.js` to export `app` for testability)

**Testing Convention Requirements:**
- Test files should follow `*.test.js` naming convention
- Use descriptive test suite and test case names
- Group related tests using `describe()` blocks
- Each test should be independent and isolated

**Web Search Research Documented:**
- Jest 29.x/30.x compatibility with Node.js 20.x confirmed
- Supertest 7.1.4 is the current stable version
- Express 5.x testing patterns are consistent with Express 4.x

### 0.1.3 Technical Interpretation

These testing requirements translate to the following technical test implementation strategy:

- To **test HTTP responses**, we will create `tests/server.test.js` with supertest-based assertions
- To **test status codes**, we will verify response.status values for all route/method combinations
- To **test headers**, we will use supertest's `.expect()` chaining for Content-Type assertions
- To **test server startup/shutdown**, we will mock console.log and test server lifecycle
- To **test error handling**, we will send requests to undefined routes and invalid methods
- To **test edge cases**, we will send requests with various parameter combinations

### 0.1.4 Coverage Requirements Interpretation

**Explicit Coverage Targets:**
- No explicit percentage specified by user

**Implicit Coverage Expectations:**
- Industry standard for Node.js/Express applications: 80%+ line coverage
- Current repository coverage: 0% (no existing tests)
- Target: 90%+ coverage for `server.js` given its small size

**To achieve comprehensive testing, coverage should include:**
- All route handlers (100% - 2 routes)
- All response paths (100%)
- Error handling branches (implicit 404 handling)
- Server initialization code
- Console output verification

## 0.2 Test Discovery and Analysis

### 0.2.1 Existing Test Infrastructure Assessment

**Repository Analysis Results:**

Repository analysis reveals **NO existing test infrastructure**. The project is a minimal Node.js/Express setup without any testing framework, configuration, or test files.

**Search Patterns Employed:**
- `*test*`, `*spec*`, `test_*`, `spec_*`, `*_test.*`, `*_spec.*` - No matches found
- `jest.config.*`, `pytest.ini`, `.mocharc.*` - No matches found
- `__tests__/`, `tests/`, `test/` directories - None exist

**Current State Documentation:**

| Component | Status | Location |
|-----------|--------|----------|
| Testing Framework | NOT INSTALLED | - |
| Test Runner Configuration | NOT PRESENT | - |
| Coverage Tools | NOT INSTALLED | - |
| Mock/Stub Libraries | NOT INSTALLED | - |
| Test Data Fixtures | NOT PRESENT | - |
| Test Files | NONE EXIST | - |

**Package.json Analysis:**

The current `package.json` confirms no testing infrastructure:
```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

**Dependencies Analysis:**
- Runtime: `express@^5.1.0` (only dependency)
- DevDependencies: None present

### 0.2.2 Source Code Analysis for Testability

**File: `server.js` - Analysis Summary:**

```javascript
const express = require('express');
const hostname = '127.0.0.1';
const port = 3000;
const app = express();
```

**Testability Assessment:**

| Aspect | Current State | Required Change |
|--------|---------------|-----------------|
| App Export | Not exported | Must export `app` for supertest |
| Server Start | Auto-starts on require | Conditional startup needed |
| Configuration | Hardcoded values | Consider environment variables |
| Routes | 2 GET routes defined | Fully testable via supertest |
| Error Handling | No explicit handlers | Test implicit Express error handling |

**Critical Testability Issue Identified:**

The `server.js` file calls `app.listen()` at module load time, which means importing it in tests will start the server. The recommended pattern requires separating app definition from server startup:

**Current Pattern (Non-Testable):**
```javascript
app.listen(port, hostname, () => { ... });
```

**Required Pattern (Testable):**
```javascript
module.exports = app;
if (require.main === module) {
  app.listen(port, hostname, () => { ... });
}
```

### 0.2.3 Web Search Research Conducted

**Research Topics and Findings:**

- **Jest Compatibility with Node.js 20.x:**
  - Jest 29.x supports Node 14.15, 16.10, 18.0 and above
  - Jest 30.x (latest: 30.2.0) supports Node 18.x minimum
  - Both versions compatible with Node.js 20.19.6

- **Supertest Best Practices for Express:**
  - Version 7.1.4 is current stable release
  - Works with Jest and Mocha seamlessly
  - Supports HTTP/1.1 and HTTP/2 protocols
  - No server port management needed when passing app directly

- **Test Organization Conventions for Node.js/Express:**
  - Standard directory: `tests/` or `__tests__/`
  - File naming: `*.test.js` or `*.spec.js`
  - Co-location pattern also acceptable: `server.test.js` next to `server.js`

- **Common Testing Pitfalls with Express 5.x:**
  - Async/await support in route handlers
  - Promise-based middleware handling
  - Error handling middleware placement

### 0.2.4 Framework and Tool Assessment

**Recommended Testing Stack:**

| Tool | Version | Purpose | Rationale |
|------|---------|---------|-----------|
| Jest | ^29.7.0 | Test runner and assertion library | Industry standard, excellent Node.js support, built-in mocking |
| Supertest | ^7.1.4 | HTTP assertion library | De facto standard for Express testing, fluent API |

**Alternative Stack (Mocha-based):**

| Tool | Version | Purpose |
|------|---------|---------|
| Mocha | ^10.8.0 | Test runner |
| Chai | ^5.1.0 | Assertion library |
| Supertest | ^7.1.4 | HTTP assertion library |

**Recommendation:** Jest is preferred due to:
- Zero configuration required for basic setup
- Built-in assertion library (no Chai needed)
- Built-in mocking capabilities
- Built-in coverage reporting
- Better async/await support
- Active maintenance and large community

## 0.3 Testing Scope Analysis

### 0.3.1 Test Target Identification

**Primary Code to be Tested:**

| Module/File | Path | Test Types Required |
|-------------|------|---------------------|
| Express Application | `server.js` | Unit tests, Integration tests, HTTP tests |

**Functions/Routes Requiring Test Coverage:**

| Route/Function | Test Categories |
|----------------|-----------------|
| `GET /` | Happy path, Response body, Status code, Headers |
| `GET /evening` | Happy path, Response body, Status code, Headers |
| `app.listen()` | Server startup, Port binding, Callback execution |
| Error handling | 404 responses, Invalid methods |

**Existing Test File Mapping:**

| Source File | Existing Test File | Test Categories Present |
|-------------|-------------------|------------------------|
| `server.js` | NONE | N/A - No tests exist |

### 0.3.2 Dependencies Requiring Mocking

**External Services to Mock:**
- None required (no external API calls in server.js)

**Internal Dependencies to Stub/Mock:**
- `console.log` - For verifying startup message output
- Server port binding - For testing port-in-use scenarios (edge case)

**File System Operations:**
- None required (no file system operations in server.js)

### 0.3.3 Version Compatibility Research

Based on current Node.js version (v20.19.6) and Express (v5.1.0), the recommended testing stack:

**Primary Testing Stack (Jest):**

| Component | Package | Version | Compatibility Rationale |
|-----------|---------|---------|------------------------|
| Testing Framework | jest | ^29.7.0 | Stable release, full Node 20 support, built-in ESM/CJS support |
| HTTP Testing | supertest | ^7.1.4 | Current stable, Express 5.x compatible |
| Coverage Tool | jest (built-in) | ^29.7.0 | Integrated V8 coverage |

**Version Conflicts to Resolve:**
- None identified - all packages are compatible

**Express 5.x Specific Considerations:**
- Express 5 uses native Promise support
- Async route handlers automatically catch errors
- Router improvements don't impact basic testing patterns

### 0.3.4 Test Scenarios Blueprint

**GET `/` Route - Test Scenarios:**

| Scenario Type | Test Case | Expected Outcome |
|---------------|-----------|------------------|
| Happy Path | Basic GET request | Status 200, Body: `'Hello, World!\n'` |
| Header Verification | Check Content-Type | text/html or text/plain |
| Content-Length | Verify response length | Matches body length |

**GET `/evening` Route - Test Scenarios:**

| Scenario Type | Test Case | Expected Outcome |
|---------------|-----------|------------------|
| Happy Path | Basic GET request | Status 200, Body: `'Good evening'` |
| Header Verification | Check Content-Type | text/html or text/plain |
| Content-Length | Verify response length | Matches body length |

**Error Handling - Test Scenarios:**

| Scenario Type | Test Case | Expected Outcome |
|---------------|-----------|------------------|
| 404 Not Found | GET `/nonexistent` | Status 404 |
| Method Not Allowed | POST `/` | Status 404 (Express default) |
| Method Not Allowed | PUT `/evening` | Status 404 (Express default) |
| Method Not Allowed | DELETE `/` | Status 404 (Express default) |

**Server Lifecycle - Test Scenarios:**

| Scenario Type | Test Case | Expected Outcome |
|---------------|-----------|------------------|
| Startup | Server binds to 127.0.0.1:3000 | Callback invoked |
| Console Output | Startup message | `Server running at http://127.0.0.1:3000/` |

**Edge Cases - Test Scenarios:**

| Scenario Type | Test Case | Expected Outcome |
|---------------|-----------|------------------|
| Query Parameters | GET `/?param=value` | Status 200, Params ignored |
| Trailing Slash | GET `/evening/` | Status 404 or redirect |
| Case Sensitivity | GET `/Evening` | Status 404 |
| Empty Path | GET `` | Default root handler |

## 0.4 Test Implementation Design

### 0.4.1 Test Strategy Selection

**Test Types to Implement:**

| Test Type | Focus Areas | Priority |
|-----------|-------------|----------|
| Unit Tests | Isolated route handler responses | HIGH |
| Integration Tests | HTTP request/response cycle | HIGH |
| Edge Case Tests | Boundary conditions, invalid inputs | MEDIUM |
| Error Handling Tests | 404 scenarios, method validation | MEDIUM |
| Lifecycle Tests | Server startup/shutdown | LOW |

**Testing Approach:**
- Use supertest to test the Express app without starting a live server
- Mock `console.log` for startup message verification
- Test each route independently with isolated assertions

### 0.4.2 Test Case Blueprint

**Component: Root Route Handler (`GET /`)**

```
Component: GET / Route Handler
Test Categories:
- Happy path: GET request returns 'Hello, World!\n' with status 200
- Edge cases: Query params ignored, maintains correct response
- Error cases: N/A (route always succeeds)
- Performance boundaries: Response time under 100ms
```

**Component: Evening Route Handler (`GET /evening`)**

```
Component: GET /evening Route Handler
Test Categories:
- Happy path: GET request returns 'Good evening' with status 200
- Edge cases: Query params ignored, trailing slash handling
- Error cases: N/A (route always succeeds)
- Performance boundaries: Response time under 100ms
```

**Component: Error Handling (Implicit)**

```
Component: Express Default Error Handler
Test Categories:
- Happy path: N/A
- Edge cases: Various undefined routes
- Error cases: 404 for undefined routes, 404 for invalid methods
- Performance boundaries: N/A
```

**Component: Server Lifecycle**

```
Component: Server Startup
Test Categories:
- Happy path: Server starts on correct host:port
- Edge cases: Console output verification
- Error cases: Port already in use (optional)
- Performance boundaries: Startup time under 1 second
```

### 0.4.3 Existing Test Extension Strategy

Not applicable - no existing tests to extend. All tests will be created from scratch.

### 0.4.4 Test Data and Fixtures Design

**Required Test Data Structures:**

No complex test data required for this simple server. All test data is inline:

| Data Type | Usage | Location |
|-----------|-------|----------|
| Expected Response Bodies | Assertion comparisons | Inline in test files |
| Route Paths | Request targets | Inline in test files |
| Expected Status Codes | Assertion comparisons | Inline in test files |

**Fixture Organization Strategy:**
- No separate fixture files needed due to simplicity
- All test data defined inline within test suites

**Mock Object Specifications:**

| Mock Target | Purpose | Implementation |
|-------------|---------|----------------|
| `console.log` | Verify startup message | Jest's `jest.spyOn()` |

**Test Database/State Management:**
- Not applicable - no database or persistent state in the application

### 0.4.5 Test Suite Structure

**Recommended Test Organization:**

```
tests/
├── server.test.js          # Main test file for server.js
├── routes/
│   ├── root.test.js        # Tests for GET / (optional split)
│   └── evening.test.js     # Tests for GET /evening (optional split)
└── setup.js                # Jest setup file (optional)
```

**Simplified Structure (Recommended for small app):**

```
tests/
└── server.test.js          # All tests in single file
```

**Test Suite Hierarchy:**

```javascript
describe('Express Server', () => {
  describe('GET /', () => {
    // Root route tests
  });
  
  describe('GET /evening', () => {
    // Evening route tests
  });
  
  describe('Error Handling', () => {
    // 404 and invalid method tests
  });
  
  describe('Server Lifecycle', () => {
    // Startup/shutdown tests
  });
});
```

## 0.5 Test File Transformation Mapping

### 0.5.1 File-by-File Test Plan

**Comprehensive Test File Transformation Table:**

| Target Test File | Transformation | Source File/Reference | Purpose/Changes |
|-----------------|----------------|----------------------|-----------------|
| `tests/server.test.js` | CREATE | `server.js` | Comprehensive unit tests for all routes, HTTP responses, status codes, headers, and error handling |
| `server.js` | UPDATE | `server.js` | Refactor to export `app` for testability while maintaining current execution behavior |
| `package.json` | UPDATE | `package.json` | Add Jest, supertest as devDependencies; update test script |
| `jest.config.js` | CREATE | N/A | Jest configuration for Node.js environment |

**Source File Modifications Required for Testability:**

| Target Source File | Transformation | Current State | Required Changes |
|-------------------|----------------|---------------|------------------|
| `server.js` | UPDATE | Auto-starts server on import | Add conditional export of `app`; wrap `listen()` call in `if (require.main === module)` block |

### 0.5.2 New Test Files Detail

**tests/server.test.js** - Comprehensive HTTP and Unit Tests

```
File: tests/server.test.js
Purpose: Complete test coverage for server.js Express application

Test Categories:
- Happy path: GET / returns correct body, GET /evening returns correct body
- Edge cases: Query parameters, trailing slashes, case sensitivity
- Error cases: 404 for undefined routes, 404 for unsupported methods
- Header validation: Content-Type verification

Mock Dependencies:
- console.log (for startup message verification)

Assertions Focus:
- Response status codes (200, 404)
- Response body content (exact string matching)
- Response headers (Content-Type)
- Response timing (optional)

Test Count Estimate: 12-15 test cases
```

### 0.5.3 Configuration File Updates

**jest.config.js** - Jest Configuration

```
File: jest.config.js (CREATE)
Purpose: Configure Jest for Node.js testing environment

Configuration:
- testEnvironment: 'node'
- testMatch: ['**/tests/**/*.test.js']
- coverageDirectory: 'coverage'
- collectCoverageFrom: ['server.js']
- verbose: true
```

**package.json** - Script and Dependency Updates

```
File: package.json (UPDATE)
Purpose: Add testing dependencies and scripts

Changes:
- Add devDependencies: jest, supertest
- Update scripts.test: 'jest --coverage'
- Add scripts.test:watch: 'jest --watch' (optional)
```

### 0.5.4 Complete Test File Inventory

| File Path | Status | Type | Description |
|-----------|--------|------|-------------|
| `tests/server.test.js` | TO CREATE | Test File | Main test suite for server.js |
| `jest.config.js` | TO CREATE | Config | Jest configuration |
| `package.json` | TO UPDATE | Config | Add devDependencies and test scripts |
| `server.js` | TO UPDATE | Source | Add app export for testability |

### 0.5.5 Cross-File Test Dependencies

**Shared Dependencies:**

| Dependency | Location | Usage |
|------------|----------|-------|
| Express app instance | `server.js` (exported) | Imported by all test files |
| Supertest | `node_modules/supertest` | HTTP request simulation |
| Jest globals | Jest runtime | `describe`, `it`, `expect`, `beforeAll`, `afterAll` |

**Import Structure for Test Files:**

```javascript
// tests/server.test.js
const request = require('supertest');
const app = require('../server');
```

### 0.5.6 Source File Modification Specification

**server.js Refactoring Plan:**

| Line Range | Current Code | New Code | Rationale |
|------------|--------------|----------|-----------|
| End of file | `app.listen(...)` | Conditional startup block | Enable testability |
| End of file | (none) | `module.exports = app;` | Export for supertest |

**Detailed Modification:**

Current `server.js` (lines 16-18):
```javascript
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
```

Required `server.js` (refactored):
```javascript
if (require.main === module) {
  app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}
module.exports = app;
```

This pattern ensures:
- Running `node server.js` starts the server (production behavior preserved)
- Importing `server.js` in tests returns the app without starting (testability enabled)

## 0.6 Dependency Inventory

### 0.6.1 Testing Dependencies

**Required Testing Packages:**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest | ^29.7.0 | JavaScript testing framework with built-in assertions and mocking |
| npm | supertest | ^7.1.4 | HTTP assertions library for testing Express endpoints |

**Optional Testing Packages:**

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | jest-cli | ^29.7.0 | Command-line interface for Jest (included with jest) |

### 0.6.2 Version Compatibility Matrix

| Package | Minimum Node.js | Current Node.js | Compatible |
|---------|-----------------|-----------------|------------|
| jest@29.7.0 | 14.15.0 | 20.19.6 | ✅ Yes |
| supertest@7.1.4 | 14.18.0 | 20.19.6 | ✅ Yes |
| express@5.1.0 | 18.0.0 | 20.19.6 | ✅ Yes |

### 0.6.3 Dependency Installation Commands

**Installation Command:**

```bash
npm install --save-dev jest supertest
```

**Expected package.json Changes:**

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.1.4"
  }
}
```

### 0.6.4 Import Updates

**Test Files Import Requirements:**

| File | Required Imports |
|------|-----------------|
| `tests/server.test.js` | `require('supertest')`, `require('../server')` |

**Import Transformation Rules:**

```javascript
// Standard test file imports
const request = require('supertest');  // HTTP testing
const app = require('../server');       // Express app under test
```

### 0.6.5 Transitive Dependencies

**Jest Transitive Dependencies (Key):**

| Package | Version | Purpose |
|---------|---------|---------|
| @jest/core | 29.7.0 | Core test runner |
| jest-environment-node | 29.7.0 | Node.js test environment |
| expect | 29.7.0 | Assertion library |
| jest-mock | 29.7.0 | Mocking utilities |

**Supertest Transitive Dependencies (Key):**

| Package | Version | Purpose |
|---------|---------|---------|
| superagent | 9.0.0 | HTTP client library |
| methods | 1.1.2 | HTTP methods list |

### 0.6.6 Lock File Considerations

After installing test dependencies:
- `package-lock.json` will be regenerated
- Approximately 200+ new packages added (Jest ecosystem)
- Total `node_modules` size increase: ~50-100MB

**Verification Commands:**

```bash
# Verify Jest installation
npx jest --version

#### Verify supertest installation
npm list supertest

#### Run tests to verify setup
npm test
```

## 0.7 Coverage and Quality Targets

### 0.7.1 Coverage Metrics

**Current vs Target Coverage:**

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Line Coverage | 0% | 90% | +90% |
| Branch Coverage | 0% | 85% | +85% |
| Function Coverage | 0% | 100% | +100% |
| Statement Coverage | 0% | 90% | +90% |

**Per-File Coverage Targets:**

| File | Line Target | Branch Target | Function Target |
|------|-------------|---------------|-----------------|
| `server.js` | 90% | 85% | 100% |

**Coverage Gaps to Address:**

| Component | Current | Target | Focus Areas |
|-----------|---------|--------|-------------|
| Route Handlers | 0% | 100% | Both GET routes must be fully tested |
| Server Initialization | 0% | 80% | app.listen callback |
| Error Paths | 0% | 90% | 404 responses, Express default handlers |

### 0.7.2 Test Quality Criteria

**Assertion Density Expectations:**
- Minimum 2 assertions per test case
- Each route test should verify: status code, response body, headers
- Error tests should verify: status code, error message presence

**Test Isolation Requirements:**
- Each test must be independent (no shared state between tests)
- Tests must not depend on execution order
- Each test should be able to run in isolation: `jest --testNamePattern="test name"`

**Performance Constraints:**
- Individual test execution: < 500ms
- Total test suite execution: < 10 seconds
- No network calls to external services

**Maintainability Standards:**
- Clear, descriptive test names following pattern: `should [action] when [condition]`
- Group related tests using `describe()` blocks
- Use constants for expected values to avoid magic strings
- Comments for non-obvious test logic

### 0.7.3 Test Suite Quality Metrics

**Expected Test Metrics:**

| Metric | Target Value |
|--------|--------------|
| Total Test Cases | 12-15 |
| Test Suites | 1 (expandable to 4) |
| Average Assertions per Test | 2-3 |
| Test Execution Time | < 5 seconds |

**Test Distribution by Category:**

| Category | Test Count | Percentage |
|----------|------------|------------|
| Happy Path | 4 | 30% |
| Edge Cases | 4 | 30% |
| Error Handling | 3 | 25% |
| Headers/Metadata | 2 | 15% |

### 0.7.4 Code Quality Standards for Tests

**Naming Conventions:**
- Test files: `*.test.js`
- Test suites: Descriptive module/feature name
- Test cases: `should [expected behavior] when [condition]`

**Structure Conventions:**
```javascript
describe('Module Name', () => {
  describe('Feature/Method', () => {
    it('should [action] when [condition]', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Best Practices to Follow:**
- Use `async/await` for all supertest requests
- Avoid test interdependencies
- Clean up any resources in `afterEach` or `afterAll`
- Use descriptive error messages in assertions

## 0.8 Scope Boundaries

### 0.8.1 Exhaustively In Scope

**New Test Files:**
- `tests/server.test.js` - Main test suite for all server.js functionality

**Test File Updates:**
- N/A (no existing test files)

**Test Configuration Files:**
- `jest.config.js` - Jest runner configuration
- `package.json` - Script and devDependency updates

**Test Utilities and Helpers:**
- N/A (simple project, no shared utilities needed)

**Source File Modifications (Minimal for Testability):**
- `server.js` - Add `module.exports = app` and conditional `listen()`

**Documentation Updates:**
- `README.md` - Add testing section with commands (optional)

### 0.8.2 Explicitly Out of Scope

**Source Code Modifications Beyond Testability:**
- ❌ Adding new routes
- ❌ Changing response formats
- ❌ Adding middleware
- ❌ Changing port configuration
- ❌ Adding environment variable support
- ❌ Error handling middleware

**Feature Additions:**
- ❌ POST, PUT, DELETE endpoints
- ❌ Database integration
- ❌ Authentication
- ❌ Logging middleware
- ❌ CORS support

**Infrastructure Changes:**
- ❌ Docker configuration
- ❌ CI/CD pipeline setup
- ❌ Deployment scripts
- ❌ Production optimizations

**Additional Testing Types:**
- ❌ Performance/load testing
- ❌ Security testing
- ❌ End-to-end testing with real server
- ❌ Browser-based testing

**Unrelated Test Files:**
- ❌ Tests for non-existent modules
- ❌ Integration tests with external services

### 0.8.3 Scope Summary Table

| Item | In Scope | Out of Scope |
|------|----------|--------------|
| Unit tests for existing routes | ✅ | |
| HTTP response testing | ✅ | |
| Status code validation | ✅ | |
| Header verification | ✅ | |
| Error handling (404) | ✅ | |
| Server lifecycle tests | ✅ | |
| Jest configuration | ✅ | |
| Supertest integration | ✅ | |
| package.json updates | ✅ | |
| Minimal server.js refactor | ✅ | |
| New feature development | | ❌ |
| Database testing | | ❌ |
| CI/CD setup | | ❌ |
| Performance testing | | ❌ |
| Security testing | | ❌ |
| Docker/deployment | | ❌ |

### 0.8.4 Boundary Conditions

**Testability Refactoring Boundaries:**

The ONLY modification to `server.js` source code is:
1. Export the `app` object: `module.exports = app;`
2. Wrap `listen()` in conditional: `if (require.main === module)`

**NO other source modifications are permitted within this testing scope.**

**Test Coverage Boundaries:**

Tests will cover:
- All existing functionality (2 routes)
- Express default behavior (404 handling)
- Documented startup behavior

Tests will NOT cover:
- Functionality that doesn't exist
- External dependencies
- Production deployment scenarios

## 0.9 Execution Parameters

### 0.9.1 Testing-Specific Instructions

**Test Execution Command:**

```bash
npm test
```

This maps to:
```bash
jest --coverage
```

**Coverage Measurement Command:**

```bash
npm test -- --coverage
```

Or directly:
```bash
npx jest --coverage --coverageReporters="text" --coverageReporters="lcov"
```

**Watch Mode Command:**

```bash
npm run test:watch
```

Or directly:
```bash
npx jest --watch
```

**Single Test Execution Pattern:**

```bash
# Run specific test file
npx jest tests/server.test.js

#### Run tests matching pattern
npx jest --testNamePattern="GET /"

#### Run specific describe block
npx jest --testNamePattern="Express Server"
```

**Debug Mode Execution:**

```bash
# With Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

#### Verbose output
npx jest --verbose

#### Show individual test results
npx jest --verbose --expand
```

### 0.9.2 Environment Setup Requirements

**Prerequisites:**
- Node.js 20.x installed (v20.19.6 or compatible)
- npm 10.x or later
- No environment variables required

**Setup Commands:**

```bash
# Install all dependencies (including dev)
npm install

#### Verify Jest is available
npx jest --version
```

**Test Environment Configuration:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `testEnvironment` | `node` | Use Node.js runtime (not jsdom) |
| `testMatch` | `**/tests/**/*.test.js` | Find test files |
| `verbose` | `true` | Detailed output |
| `collectCoverage` | `true` | Enable coverage |

### 0.9.3 Package.json Scripts

**Updated Scripts Section:**

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:verbose": "jest --verbose --coverage"
  }
}
```

### 0.9.4 Jest Configuration (jest.config.js)

**Complete Configuration:**

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['server.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,
      lines: 90,
      statements: 90
    }
  },
  verbose: true
};
```

### 0.9.5 Expected Test Output

**Successful Test Run:**

```
PASS  tests/server.test.js
  Express Server
    GET /
      ✓ should return Hello World with status 200 (45ms)
      ✓ should return correct Content-Type header (12ms)
    GET /evening
      ✓ should return Good evening with status 200 (8ms)
      ✓ should return correct Content-Type header (6ms)
    Error Handling
      ✓ should return 404 for undefined routes (15ms)
      ✓ should return 404 for POST on GET routes (9ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Coverage:    90% lines
```

### 0.9.6 CI/CD Integration Notes

**Recommended CI Command:**

```bash
npm ci && npm test
```

**Exit Codes:**
- `0` - All tests passed
- `1` - Test failures or coverage threshold not met

**Coverage Report Locations:**
- Text summary: stdout
- HTML report: `coverage/lcov-report/index.html`
- LCOV data: `coverage/lcov.info`

## 0.10 Special Instructions

### 0.10.1 Testing-Specific Requirements

**User-Specified Requirements:**

The user explicitly requested:
- "Create comprehensive unit tests for server.js"
- "Using Jest or Mocha" - **Recommendation: Jest** (based on ecosystem analysis)
- Test the following specific areas:
  - HTTP responses
  - Status codes
  - Headers
  - Server startup/shutdown
  - Error handling
  - Edge cases

### 0.10.2 Critical Implementation Guidelines

**Minimal Change Principle:**
- ONLY modify test files and test-related configurations
- DO NOT modify source code unless absolutely necessary for testability
- The ONLY permitted source modification is adding app export to `server.js`

**Testability Refactoring Rule:**
```javascript
// This is the ONLY change permitted in server.js:
if (require.main === module) {
  app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
}
module.exports = app;
```

**Follow Existing Patterns:**
- Use CommonJS `require()` syntax (project standard)
- Match existing code style (indentation, semicolons)
- No ES modules or TypeScript

### 0.10.3 Test Isolation Requirements

**Each Test Must:**
- Be completely independent
- Not rely on other tests running first
- Not modify global state that affects other tests
- Clean up any resources it creates

**Supertest Isolation:**
- Each test creates fresh HTTP requests
- No persistent connections between tests
- App instance is stateless (no session/database)

### 0.10.4 Mocking Guidelines

**What to Mock:**
- `console.log` - For verifying startup messages (if testing lifecycle)

**What NOT to Mock:**
- Express framework behavior
- HTTP response handling
- Route middleware

**Mocking Pattern:**

```javascript
jest.spyOn(console, 'log').mockImplementation();
```

### 0.10.5 Assertion Style Guidelines

**Use Supertest Chainable Assertions:**

```javascript
await request(app)
  .get('/')
  .expect(200)
  .expect('Content-Type', /text/)
  .expect('Hello, World!\n');
```

**Use Jest Matchers for Complex Assertions:**

```javascript
const response = await request(app).get('/');
expect(response.status).toBe(200);
expect(response.text).toContain('Hello');
```

### 0.10.6 Test Naming Conventions

**Required Pattern:** `should [expected behavior] when [condition]`

**Examples:**
- `should return status 200 when GET / is called`
- `should return Hello World when accessing root route`
- `should return 404 when accessing undefined route`
- `should include Content-Type header when responding`

### 0.10.7 Code Style Requirements

**Maintain Consistency With:**
- 2-space indentation (or match existing)
- Single quotes for strings
- Semicolons at end of statements
- Async/await syntax for all asynchronous operations

### 0.10.8 Documentation Requirements

**Each Test File Should Include:**
- Brief comment describing test scope
- Group related tests in describe blocks
- Clear test names that document expected behavior

**No External Documentation Required For:**
- Individual test cases (names should be self-documenting)
- Test data (inline and obvious)

### 0.10.9 Verification Checklist

Before marking tests complete, verify:

- [ ] All tests pass: `npm test`
- [ ] Coverage meets threshold: 90%+ lines
- [ ] No console errors or warnings
- [ ] Tests run in isolation: `npx jest --runInBand`
- [ ] Tests run in parallel: `npx jest` (default)
- [ ] Source functionality unchanged: `npm start` still works
- [ ] No breaking changes to existing behavior

