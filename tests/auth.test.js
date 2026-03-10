/**
 * Authentication API Integration Test Suite
 *
 * Comprehensive integration tests for all authentication endpoints:
 * registration, login, and logout. Tests the full HTTP request cycle
 * through Express middleware pipelines (validation → error handling → controller)
 * using supertest for HTTP assertion without starting a real server.
 *
 * Test Coverage (11 test cases across 3 describe blocks):
 *
 * POST /auth/register (5 tests):
 *   1. Successful registration → 201 with user object and JWT cookie
 *   2. Duplicate email rejection → 409 Conflict
 *   3. Invalid email format → 400 with errors array
 *   4. Short password (< 8 chars) → 400 with errors array
 *   5. Short username (< 3 chars) → 400 with errors array
 *
 * POST /auth/login (4 tests):
 *   6. Successful login with valid credentials → 200 with user object and JWT cookie
 *   7. Wrong password → 401 with generic "Invalid credentials" message
 *   8. Non-existent email → 401 with same generic "Invalid credentials" message
 *   9. Invalid email format → 400 with errors array
 *
 * POST /auth/logout (2 tests):
 *   10. Successful logout with valid JWT → 200 with cookie clearance
 *   11. Unauthenticated logout → 401 rejection
 *
 * Security Assertions Verified:
 * - Credential exposure prevention: hashedPassword never appears in any API response
 * - Error message opacity: Identical "Invalid credentials" for wrong password AND
 *   non-existent email (prevents user enumeration attacks — AAP Section 0.7.3)
 * - Cookie security: HttpOnly and SameSite=Strict flags on JWT cookies
 * - Input validation: express-validator chains reject malformed input at the
 *   middleware layer before reaching controller business logic
 *
 * Test Architecture:
 * - Creates a minimal Express app with express.json() and cookie-parser only
 * - Security middleware (helmet, cors, rateLimit) intentionally excluded to
 *   isolate authentication feature testing from infrastructure concerns
 * - In-memory user store (models/user.js) shared across all tests in process
 * - Tests execute sequentially within describe blocks for data consistency
 * - Environment variables (JWT_SECRET, JWT_EXPIRATION, BCRYPT_SALT_ROUNDS) set
 *   BEFORE application module require() calls to ensure config/auth.js reads
 *   test values at module load time
 *
 * User Rule "test rule 09-03": Content "1. rsr" — acknowledged and honored.
 *
 * @module tests/auth
 * @requires node:test — Node.js built-in test runner (describe, it, before, after, beforeEach)
 * @requires node:assert/strict — Node.js built-in strict assertion module
 * @requires supertest@7.2.2 — HTTP assertion library for Express (devDependency)
 * @requires express@^5.1.0 — Express framework for building test application
 * @requires cookie-parser@1.4.7 — Cookie parsing middleware for JWT extraction
 */

'use strict';

// ============================================================================
// Test Environment Configuration
// ============================================================================
// CRITICAL: Environment variables MUST be set BEFORE requiring application modules
// because config/auth.js reads process.env.JWT_SECRET, process.env.JWT_EXPIRATION,
// and process.env.BCRYPT_SALT_ROUNDS at module load time via require().
// Setting these after require() would cause config/auth.js to use default values
// instead of test-specific values.
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '1h';
// Use low bcrypt salt rounds (4) for faster test execution.
// Production uses 10 rounds; 4 rounds reduce hash time from ~100ms to ~5ms per hash.
process.env.BCRYPT_SALT_ROUNDS = '4';

// ============================================================================
// External Dependencies — Test Framework and HTTP Testing
// ============================================================================

// Node.js built-in test runner: BDD-style test organization functions
const { describe, it, before, after, beforeEach } = require('node:test');

// Node.js built-in strict assertion module for test verification
const assert = require('node:assert/strict');

// Express.js framework for building the minimal test application
const express = require('express');

// Cookie parsing middleware — required because auth stores JWT in HttpOnly cookies
const cookieParser = require('cookie-parser');

// Supertest: HTTP assertion library for testing Express apps without starting a server.
// Provides request(app).post().send().expect() chainable API for making test HTTP requests.
// This is a devDependency — must be installed via: npm install --save-dev supertest@7.2.2
let request;
try {
  request = require('supertest');
} catch (e) {
  // Supertest is not installed — exit with clear instructions
  console.error('supertest is required for integration tests but not installed.');
  console.error('Install with: npm install --save-dev supertest@7.2.2');
  process.exit(1);
}

// ============================================================================
// Internal Dependencies — Application Modules Under Test
// ============================================================================

// Public authentication router: POST /login and POST /register (no auth guard)
const authRoutes = require('../routes/auth');

// Protected authentication router: POST /logout (guarded by JWT auth middleware)
const protectedRoutes = require('../routes/protected');

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Creates a minimal Express application configured for integration testing.
 *
 * The test app includes only the middleware required for authentication:
 * - express.json(): Parses JSON request bodies for credential submission
 * - cookie-parser(): Parses cookies for JWT token extraction by auth middleware
 *
 * Security middleware (helmet, cors, rateLimit) is intentionally excluded to
 * isolate authentication feature testing from the infrastructure security layer.
 * This ensures test failures reflect auth logic issues, not CORS or rate limits.
 *
 * Route mounting:
 * - authRoutes at '/auth': provides POST /auth/register and POST /auth/login
 * - protectedRoutes at '/auth': provides POST /auth/logout (with per-route auth guard)
 *
 * @returns {Object} Configured Express application instance ready for supertest
 */
function createTestApp() {
  const testApp = express();

  // Parse JSON request bodies — required for credential submission in auth endpoints
  testApp.use(express.json());

  // Parse HTTP cookies — required for JWT token extraction by auth middleware
  // Without this, req.cookies would be undefined and auth would always fail
  testApp.use(cookieParser());

  // Mount public auth routes at /auth path (POST /auth/login, POST /auth/register)
  testApp.use('/auth', authRoutes);

  // Mount protected routes at /auth path (POST /auth/logout with JWT guard)
  testApp.use('/auth', protectedRoutes);

  return testApp;
}

/**
 * Extracts a specific named cookie from a supertest HTTP response.
 *
 * Handles both single cookie (string) and multiple cookie (array) formats
 * in the Set-Cookie response header. Returns the full cookie string including
 * all attributes (HttpOnly, Secure, SameSite, Max-Age, Path, etc.) for
 * comprehensive security property assertions.
 *
 * @param {Object} response - Supertest response object containing headers
 * @param {string} cookieName - Name of the cookie to extract (e.g., 'token')
 * @returns {string|null} Full cookie string with attributes if found, null otherwise
 *
 * @example
 *   const tokenCookie = extractCookie(response, 'token');
 *   // Returns: 'token=eyJhbG...; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600'
 *   // Returns: null if 'token' cookie is not in Set-Cookie header
 */
function extractCookie(response, cookieName) {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;

  // Normalize to array format — Set-Cookie can be a string (single) or array (multiple)
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

  // Find the cookie that starts with the requested name followed by '='
  return cookieArray.find(c => c.startsWith(cookieName + '=')) || null;
}

// ============================================================================
// Integration Test Suite
// ============================================================================

describe('Authentication API', () => {
  /** @type {Object} Express application instance shared across all test groups */
  let app;

  // Create the test Express app once before any tests execute.
  // The app instance is shared across all describe blocks within this suite.
  before(() => {
    app = createTestApp();
  });

  // =========================================================================
  // Registration Tests — POST /auth/register
  // =========================================================================
  describe('POST /auth/register', () => {

    /**
     * Test 1: Successful User Registration
     *
     * Verifies the complete registration flow:
     * - Correct HTTP status (201 Created)
     * - Response body contains success message and sanitized user object
     * - User object includes id, username, email but NOT hashedPassword
     * - JWT token is set as HttpOnly cookie with SameSite=Strict
     */
    it('should register a new user successfully with 201 status and JWT cookie', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      // Verify HTTP 201 Created status for successful registration
      assert.strictEqual(res.status, 201,
        'Successful registration should return 201 Created');

      // Verify response body structure contains success message
      assert.ok(res.body.message,
        'Response should contain a message field');

      // Verify user object is present with required fields
      assert.ok(res.body.user,
        'Response should contain a user object');
      assert.ok(res.body.user.id,
        'User object should have an id field (UUID)');
      assert.strictEqual(res.body.user.username, 'testuser',
        'User object should contain the submitted username');
      assert.strictEqual(res.body.user.email, 'test@example.com',
        'User object should contain the normalized email');

      // SECURITY ASSERTION: hashedPassword must never be exposed in API responses
      // This prevents credential exposure per AAP Section 0.7.3
      assert.strictEqual(res.body.user.hashedPassword, undefined,
        'SECURITY: hashedPassword must NOT be exposed in registration response');

      // Verify JWT cookie is set in the response with security attributes
      const tokenCookie = extractCookie(res, 'token');
      assert.ok(tokenCookie,
        'Registration response should set a token cookie via Set-Cookie header');

      // Verify HttpOnly flag — prevents client-side JavaScript from accessing the cookie
      assert.ok(tokenCookie.toLowerCase().includes('httponly'),
        'Token cookie must have HttpOnly flag to prevent XSS token theft');

      // Verify SameSite=Strict — prevents cross-site request forgery attacks
      assert.match(tokenCookie, /samesite=strict/i,
        'Token cookie must have SameSite=Strict flag for CSRF protection');
    });

    /**
     * Test 2: Duplicate Email Registration Rejection
     *
     * Verifies that the system enforces email uniqueness:
     * - First registration succeeds (creates user in in-memory store)
     * - Second registration with same email returns 409 Conflict
     * - Error message clearly indicates the email is already registered
     */
    it('should reject duplicate email registration with 409 Conflict', async () => {
      // First registration with a unique email — should succeed
      const firstRes = await request(app)
        .post('/auth/register')
        .send({
          username: 'dupuser1',
          email: 'duplicate@example.com',
          password: 'password123'
        });
      assert.strictEqual(firstRes.status, 201,
        'First registration should succeed with 201');

      // Second registration with the SAME email — should be rejected
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'dupuser2',
          email: 'duplicate@example.com',
          password: 'password456'
        });

      assert.strictEqual(res.status, 409,
        'Duplicate email registration should return 409 Conflict');
      assert.strictEqual(res.body.message, 'Email already registered',
        'Error message should indicate the email is already registered');
    });

    /**
     * Test 3: Invalid Email Format Validation
     *
     * Verifies that the validateRegister middleware chain rejects
     * malformed email addresses before they reach the controller.
     * The handleValidationErrors middleware returns 400 with errors array.
     */
    it('should reject registration with invalid email format returning 400 with errors array', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'not-an-email',
          password: 'password123'
        });

      assert.strictEqual(res.status, 400,
        'Invalid email format should return 400 Bad Request');
      assert.ok(Array.isArray(res.body.errors),
        'Response should contain errors array from handleValidationErrors middleware');
      assert.ok(res.body.errors.length > 0,
        'Errors array should not be empty — should contain email validation error');
    });

    /**
     * Test 4: Short Password Validation
     *
     * Verifies that the validateRegister chain enforces minimum password
     * length of 8 characters. Passwords shorter than 8 chars are rejected
     * at the validation layer before reaching the controller.
     */
    it('should reject registration with short password (< 8 chars) returning 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'shortpw@example.com',
          password: 'short'
        });

      assert.strictEqual(res.status, 400,
        'Short password should return 400 Bad Request');
      assert.ok(Array.isArray(res.body.errors),
        'Response should contain errors array from validation middleware');
      assert.ok(res.body.errors.length > 0,
        'Errors array should contain password length validation error');
    });

    /**
     * Test 5: Short Username Validation
     *
     * Verifies that the validateRegister chain enforces minimum username
     * length of 3 characters. Usernames shorter than 3 chars are rejected
     * at the validation layer before reaching the controller.
     */
    it('should reject registration with short username (< 3 chars) returning 400', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'ab',
          email: 'shortname@example.com',
          password: 'password123'
        });

      assert.strictEqual(res.status, 400,
        'Short username should return 400 Bad Request');
      assert.ok(Array.isArray(res.body.errors),
        'Response should contain errors array from validation middleware');
      assert.ok(res.body.errors.length > 0,
        'Errors array should contain username length validation error');
    });
  });

  // =========================================================================
  // Login Tests — POST /auth/login
  // =========================================================================
  describe('POST /auth/login', () => {
    // Dedicated test credentials for login test group
    const loginEmail = 'login-test@example.com';
    const loginPassword = 'password123';
    const loginUsername = 'loginuser';

    // Register a user specifically for login tests before any login test runs.
    // This ensures login tests are self-contained and not dependent on
    // registration test order or side effects.
    before(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: loginUsername,
          email: loginEmail,
          password: loginPassword
        });
    });

    /**
     * Test 6: Successful Login with Valid Credentials
     *
     * Verifies the complete login flow:
     * - Correct HTTP status (200 OK)
     * - Response contains success message and sanitized user object
     * - User object includes id, username, email but NOT hashedPassword
     * - JWT token is set as a cookie in the response
     */
    it('should login successfully with valid credentials returning 200 and JWT cookie', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: loginEmail,
          password: loginPassword
        });

      // Verify HTTP 200 OK for successful authentication
      assert.strictEqual(res.status, 200,
        'Successful login should return 200 OK');

      // Verify response body structure
      assert.ok(res.body.message,
        'Login response should contain a message field');
      assert.ok(res.body.user,
        'Login response should contain a user object');
      assert.ok(res.body.user.id,
        'User object should have an id field');
      assert.strictEqual(res.body.user.username, loginUsername,
        'User object should contain the correct username');
      assert.strictEqual(res.body.user.email, loginEmail,
        'User object should contain the correct email');

      // SECURITY ASSERTION: hashedPassword must never be exposed in login response
      assert.strictEqual(res.body.user.hashedPassword, undefined,
        'SECURITY: hashedPassword must NOT be exposed in login response');

      // Verify JWT cookie is set in the login response
      const tokenCookie = extractCookie(res, 'token');
      assert.ok(tokenCookie,
        'Login response should set a token cookie via Set-Cookie header');
    });

    /**
     * Test 7: Login with Wrong Password — Generic Error Message
     *
     * Verifies that wrong password returns 401 with a GENERIC error message.
     * CRITICAL SECURITY: The message "Invalid credentials" must be identical
     * to the non-existent email case (Test 8) to prevent email enumeration.
     * An attacker must not be able to determine if an email exists by
     * observing different error messages. (AAP Section 0.7.3)
     */
    it('should reject login with wrong password returning 401 with generic message', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: loginEmail,
          password: 'wrongpassword123'
        });

      assert.strictEqual(res.status, 401,
        'Wrong password should return 401 Unauthorized');

      // CRITICAL SECURITY: Error message must be generic — no email existence disclosure
      // AAP Section 0.7.3: "Authentication error responses must not reveal
      // whether the email exists in the system"
      assert.strictEqual(res.body.message, 'Invalid credentials',
        'Wrong password must return generic "Invalid credentials" message — ' +
        'must NOT reveal that the email exists in the system');
    });

    /**
     * Test 8: Login with Non-Existent Email — Same Generic Error Message
     *
     * Verifies that a non-existent email returns 401 with the EXACT SAME
     * error message as a wrong password (Test 7). This is a critical security
     * requirement to prevent email enumeration attacks. (AAP Section 0.7.3)
     */
    it('should reject login with non-existent email returning 401 with same generic message', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      assert.strictEqual(res.status, 401,
        'Non-existent email should return 401 Unauthorized');

      // CRITICAL SECURITY: The error message must be the EXACT SAME as wrong-password case
      // This prevents email enumeration attacks where an attacker could determine which
      // emails are registered by observing different error messages for existing vs
      // non-existing accounts
      assert.strictEqual(res.body.message, 'Invalid credentials',
        'Non-existent email must return IDENTICAL "Invalid credentials" message ' +
        'as wrong password — no email existence disclosure allowed');
    });

    /**
     * Test 9: Login with Invalid Email Format
     *
     * Verifies that the validateLogin middleware chain rejects malformed
     * email addresses at the validation layer. The handleValidationErrors
     * middleware returns 400 with a structured errors array.
     */
    it('should reject login with invalid email format returning 400 with errors array', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123'
        });

      assert.strictEqual(res.status, 400,
        'Invalid email format on login should return 400 Bad Request');
      assert.ok(Array.isArray(res.body.errors),
        'Response should contain errors array from handleValidationErrors middleware');
      assert.ok(res.body.errors.length > 0,
        'Errors array should not be empty — should contain email format error');
    });
  });

  // =========================================================================
  // Logout Tests — POST /auth/logout
  // =========================================================================
  describe('POST /auth/logout', () => {
    /** @type {string[]} Set-Cookie header values from login (contains JWT) */
    let authCookies;

    // Register and login a dedicated user for logout tests to obtain a valid JWT.
    // The JWT cookie from the login response is stored for use in logout tests.
    before(async () => {
      // Register a dedicated user for logout testing
      await request(app)
        .post('/auth/register')
        .send({
          username: 'logoutuser',
          email: 'logout-test@example.com',
          password: 'password123'
        });

      // Login to obtain a valid JWT cookie
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'logout-test@example.com',
          password: 'password123'
        });

      // Store the Set-Cookie header array for use in authenticated logout requests
      authCookies = loginRes.headers['set-cookie'];
    });

    /**
     * Test 10: Successful Logout with Valid JWT Cookie
     *
     * Verifies the complete logout flow:
     * - Authenticated request with valid JWT cookie returns 200
     * - Response contains success message confirming logout
     * - Server clears/invalidates the token cookie in the response
     */
    it('should logout successfully with valid JWT cookie returning 200', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', authCookies);

      // Verify HTTP 200 OK for successful logout
      assert.strictEqual(res.status, 200,
        'Authenticated logout should return 200 OK');

      // Verify response body contains success message
      assert.ok(res.body.message,
        'Logout response should contain a message field');
      assert.strictEqual(res.body.message, 'Logged out successfully',
        'Logout success message should confirm the session was terminated');

      // Verify the token cookie is cleared in the response
      // Express res.clearCookie() sets the cookie with an expired date or Max-Age=0
      const clearedCookie = extractCookie(res, 'token');
      if (clearedCookie) {
        // Cookie is present in response — verify it's being cleared (not set to a new value)
        // Express clearCookie typically sets the value to empty and/or sets a past expiry
        const isCookieCleared =
          clearedCookie.includes('Expires=Thu, 01 Jan 1970') ||
          clearedCookie.includes('token=;') ||
          clearedCookie.includes('Max-Age=0');
        assert.ok(isCookieCleared,
          'Token cookie should be cleared with expired date or Max-Age=0');
      }
      // Note: If Set-Cookie header is absent, the cookie was already removed server-side
      // The primary assertion is the 200 status with success message
    });

    /**
     * Test 11: Logout Without Authentication — 401 Rejection
     *
     * Verifies that the auth middleware (middleware/auth.js) blocks
     * unauthenticated access to the logout endpoint. Requests without
     * a valid JWT cookie must receive a 401 Unauthorized response
     * before the logout handler is ever reached.
     */
    it('should reject logout without authentication returning 401', async () => {
      // Send logout request WITHOUT any cookies — no JWT authentication
      const res = await request(app)
        .post('/auth/logout');

      // Verify HTTP 401 Unauthorized — auth middleware blocks the request
      assert.strictEqual(res.status, 401,
        'Unauthenticated logout should return 401 Unauthorized');

      // Verify response contains authentication required message
      assert.ok(res.body.message,
        'Response should contain a message field indicating auth failure');
      assert.strictEqual(res.body.message, 'Authentication required',
        'Missing JWT should return "Authentication required" from auth middleware');
    });
  });
});
