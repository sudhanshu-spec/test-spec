/**
 * Authentication Middleware Unit Tests
 * 
 * Comprehensive unit test suite for the JWT authentication middleware (middleware/auth.js).
 * Tests the middleware in complete isolation by mocking Express req, res, and next objects,
 * verifying all token verification scenarios without requiring a running Express server.
 * 
 * Test Coverage (5 mandatory scenarios per AAP Section 0.2.2):
 * 1. Valid token — middleware calls next() and attaches decoded user to req.user
 * 2. Expired token — middleware returns 401 Unauthorized with error message
 * 3. Missing token — middleware returns 401 when no cookie is present
 * 4. Malformed token — middleware returns 401 for garbled/invalid JWT strings
 * 5. Wrong secret — middleware returns 401 for tokens signed with incorrect secret
 * 
 * Dependencies:
 * - node:test — Node.js built-in test runner (describe, it, before, beforeEach)
 * - node:assert/strict — Node.js built-in strict assertion module
 * - jsonwebtoken — JWT creation for generating test tokens (same package as production)
 * 
 * User rule "test rule 09-03" (content: "1. rsr") acknowledged and honored.
 * 
 * @module tests/middleware/auth
 * @requires node:test
 * @requires node:assert/strict
 * @requires jsonwebtoken
 */

// ============================================================================
// Test Constants
// ============================================================================

/**
 * Secret key used for signing test JWT tokens.
 * Must match the value set in process.env.JWT_SECRET below so that the
 * auth middleware (which reads jwtSecret from config/auth.js) can verify
 * tokens generated in these tests.
 * 
 * @constant {string}
 */
const TEST_SECRET = 'test-secret-key-for-middleware-testing';

/**
 * Standard user payload embedded in test JWT tokens.
 * Mirrors the structure used by the production authController when signing tokens:
 * { id, email } — the decoded payload the middleware attaches to req.user on success.
 * 
 * @constant {Object}
 * @property {string} id - Test user identifier
 * @property {string} email - Test user email address
 */
const TEST_USER_PAYLOAD = { id: 'test-user-id-123', email: 'test@example.com' };

// ============================================================================
// CRITICAL: Set environment variables BEFORE requiring auth modules.
// config/auth.js reads process.env.JWT_SECRET at module load time (line 48),
// so the env var must be configured before any require() that transitively
// loads config/auth.js (which includes middleware/auth.js).
// ============================================================================
process.env.JWT_SECRET = TEST_SECRET;
process.env.JWT_EXPIRATION = '1h';
process.env.BCRYPT_SALT_ROUNDS = '4';

// ============================================================================
// Module Imports
// ============================================================================

// Node.js built-in test runner — BDD-style test organization
const { describe, it, before, beforeEach } = require('node:test');

// Node.js built-in strict assertion module — provides strictEqual, ok, equal
const assert = require('node:assert/strict');

// JWT library for creating test tokens — same package used by production middleware
const jwt = require('jsonwebtoken');

// Module under test — JWT authentication middleware (default export)
const authMiddleware = require('../../middleware/auth');

// Auth configuration — used to verify test environment aligns with middleware expectations
const authConfig = require('../../config/auth');

// ============================================================================
// Mock Object Helper Functions
// ============================================================================

/**
 * Creates a mock Express request object.
 * 
 * Only the cookies property is needed since the auth middleware
 * exclusively reads req.cookies.token (with optional chaining) for JWT extraction.
 * Additional properties (headers, body, etc.) are not accessed by the middleware.
 * 
 * @param {Object} [cookies={}] - Cookie key-value pairs to set on the mock request
 * @returns {Object} Mock request object with cookies property
 */
function createMockReq(cookies = {}) {
  return {
    cookies: cookies
  };
}

/**
 * Creates a mock Express response object with method chaining support.
 * 
 * Captures statusCode and jsonData for test assertions. Supports the
 * res.status(code).json(data) chaining pattern used by the auth middleware
 * when returning 401 Unauthorized error responses.
 * 
 * @returns {Object} Mock response object with status() and json() chainable methods
 * @property {number|null} statusCode - HTTP status code set via status(), null if not called
 * @property {Object|null} jsonData - JSON body set via json(), null if not called
 */
function createMockRes() {
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      res.statusCode = code;
      return res; // Enable chaining: res.status(401).json(...)
    },
    json(data) {
      res.jsonData = data;
      return res;
    }
  };
  return res;
}

/**
 * Creates a mock Express next() function that tracks invocation state.
 * 
 * Uses a closure to maintain a boolean flag indicating whether next() was called.
 * The wasCalled() method provides clean assertion access to this state.
 * 
 * @returns {Function} Mock next function with wasCalled() inspection method
 */
function createMockNext() {
  let called = false;
  const next = () => { called = true; };
  next.wasCalled = () => called;
  return next;
}

// ============================================================================
// Test Suite: Auth Middleware - JWT Verification
// ============================================================================

describe('Auth Middleware - JWT Verification', () => {

  /**
   * Test environment setup — runs once before all tests.
   * Verifies that the environment variable configuration was correctly
   * loaded by config/auth.js at module require time.
   */
  before(() => {
    // Sanity check: ensure authConfig loaded the test secret correctly
    // This validates that process.env.JWT_SECRET was set before config/auth.js was required
    assert.strictEqual(
      authConfig.jwtSecret,
      TEST_SECRET,
      'Test setup error: authConfig.jwtSecret does not match TEST_SECRET. ' +
      'Ensure process.env.JWT_SECRET is set before requiring config/auth.js.'
    );
  });

  // -------------------------------------------------------------------------
  // Test Case 1: Valid Token — Authentication Success
  // -------------------------------------------------------------------------
  it('should call next() and attach decoded user for valid token', () => {
    // Arrange: Create a valid JWT token signed with the correct test secret
    const token = jwt.sign(TEST_USER_PAYLOAD, TEST_SECRET, { expiresIn: '1h' });
    const req = createMockReq({ token });
    const res = createMockRes();
    const next = createMockNext();

    // Act: Invoke the auth middleware with mock Express objects
    authMiddleware(req, res, next);

    // Assert: next() was called — authentication passed successfully
    assert.ok(next.wasCalled(), 'next() should have been called for valid token');

    // Assert: req.user was populated with decoded JWT payload
    assert.ok(req.user, 'req.user should be defined after successful authentication');
    assert.equal(req.user.id, TEST_USER_PAYLOAD.id, 'req.user.id should match token payload');
    assert.equal(req.user.email, TEST_USER_PAYLOAD.email, 'req.user.email should match token payload');

    // Assert: No error response was sent (status was never called)
    assert.strictEqual(res.statusCode, null, 'res.status() should not have been called for valid token');
    assert.strictEqual(res.jsonData, null, 'res.json() should not have been called for valid token');
  });

  // -------------------------------------------------------------------------
  // Test Case 2: Expired Token — Returns 401 Unauthorized
  // -------------------------------------------------------------------------
  it('should return 401 for expired token', () => {
    // Arrange: Create an already-expired JWT token using explicit past timestamps.
    // iat (issued at) = 10 seconds ago, exp (expiration) = 5 seconds ago.
    // This approach is more reliable than expiresIn: '0s' which may race with verification.
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiredPayload = {
      ...TEST_USER_PAYLOAD,
      iat: nowInSeconds - 10,
      exp: nowInSeconds - 5
    };
    const token = jwt.sign(expiredPayload, TEST_SECRET);
    const req = createMockReq({ token });
    const res = createMockRes();
    const next = createMockNext();

    // Act: Invoke the auth middleware
    authMiddleware(req, res, next);

    // Assert: 401 Unauthorized response was sent
    assert.strictEqual(res.statusCode, 401, 'Should return 401 for expired token');
    assert.ok(res.jsonData, 'JSON response body should be defined for expired token');
    assert.ok(res.jsonData.message, 'Response should contain a message property for expired token');

    // Assert: next() was NOT called — authentication failed
    assert.strictEqual(next.wasCalled(), false, 'next() should not be called for expired token');

    // Assert: req.user was NOT populated
    assert.strictEqual(req.user, undefined, 'req.user should be undefined for expired token');
  });

  // -------------------------------------------------------------------------
  // Test Case 3: Missing Token — Returns 401 Unauthorized
  // -------------------------------------------------------------------------
  it('should return 401 when no token cookie is present', () => {
    // Arrange: Create request with empty cookies object (no token property)
    const req = createMockReq({});
    const res = createMockRes();
    const next = createMockNext();

    // Act: Invoke the auth middleware
    authMiddleware(req, res, next);

    // Assert: 401 Unauthorized response was sent with appropriate message
    assert.strictEqual(res.statusCode, 401, 'Should return 401 when no token is present');
    assert.ok(res.jsonData, 'JSON response body should be defined when token is missing');
    assert.ok(res.jsonData.message, 'Response should contain a message property when token is missing');

    // Assert: next() was NOT called — authentication failed
    assert.strictEqual(next.wasCalled(), false, 'next() should not be called when token is missing');

    // Assert: req.user was NOT populated
    assert.strictEqual(req.user, undefined, 'req.user should be undefined when token is missing');
  });

  // -------------------------------------------------------------------------
  // Test Case 4: Malformed/Invalid Token — Returns 401 Unauthorized
  // -------------------------------------------------------------------------
  it('should return 401 for malformed/invalid token', () => {
    // Arrange: Create request with a garbled, non-JWT string as the token value.
    // This triggers a JsonWebTokenError in jwt.verify() since the string
    // does not conform to the three-part base64url JWT format (header.payload.signature).
    const req = createMockReq({ token: 'not-a-valid-jwt-token-string' });
    const res = createMockRes();
    const next = createMockNext();

    // Act: Invoke the auth middleware
    authMiddleware(req, res, next);

    // Assert: 401 Unauthorized response was sent
    assert.strictEqual(res.statusCode, 401, 'Should return 401 for malformed token');
    assert.ok(res.jsonData, 'JSON response body should be defined for malformed token');
    assert.ok(res.jsonData.message, 'Response should contain a message property for malformed token');

    // Assert: next() was NOT called — authentication failed
    assert.strictEqual(next.wasCalled(), false, 'next() should not be called for malformed token');

    // Assert: req.user was NOT populated
    assert.strictEqual(req.user, undefined, 'req.user should be undefined for malformed token');
  });

  // -------------------------------------------------------------------------
  // Test Case 5: Token Signed with Wrong Secret — Returns 401 Unauthorized
  // -------------------------------------------------------------------------
  it('should return 401 for token signed with wrong secret', () => {
    // Arrange: Create a structurally valid JWT token signed with a DIFFERENT secret
    // than the one configured in the middleware (TEST_SECRET via process.env.JWT_SECRET).
    // jwt.verify() will detect the signature mismatch and throw JsonWebTokenError.
    const token = jwt.sign(TEST_USER_PAYLOAD, 'wrong-secret-key-not-matching', { expiresIn: '1h' });
    const req = createMockReq({ token });
    const res = createMockRes();
    const next = createMockNext();

    // Act: Invoke the auth middleware
    authMiddleware(req, res, next);

    // Assert: 401 Unauthorized response was sent
    assert.strictEqual(res.statusCode, 401, 'Should return 401 for token with wrong secret');
    assert.ok(res.jsonData, 'JSON response body should be defined for wrong-secret token');
    assert.ok(res.jsonData.message, 'Response should contain a message property for wrong-secret token');

    // Assert: next() was NOT called — authentication failed
    assert.strictEqual(next.wasCalled(), false, 'next() should not be called for wrong-secret token');

    // Assert: req.user was NOT populated
    assert.strictEqual(req.user, undefined, 'req.user should be undefined for wrong-secret token');
  });

});
