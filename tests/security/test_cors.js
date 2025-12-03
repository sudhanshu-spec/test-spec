/**
 * @fileoverview Security test suite for CORS (Cross-Origin Resource Sharing) policy verification.
 * Contains 6 tests that verify the cors middleware properly controls cross-origin access to the
 * Express.js application. Tests verify origin whitelisting, preflight request handling, credentials
 * support, and Access-Control headers are correctly configured per OWASP security guidelines.
 * 
 * Test coverage includes:
 * - Requests from allowed origin (localhost:3000) include CORS headers
 * - Requests from non-whitelisted origin rejected or missing CORS headers
 * - Preflight OPTIONS requests handled correctly with proper status and headers
 * - Credentials allowed for whitelisted origins (Access-Control-Allow-Credentials: true)
 * - Access-Control-Allow-Origin header matches expected origin value
 * - Access-Control-Allow-Methods header restricts HTTP methods appropriately
 * 
 * @module tests/security/test_cors
 * @requires supertest - HTTP assertion library for Express.js testing
 * @requires ../../server - Express application instance with CORS middleware configured
 * 
 * @see middleware/security.js - CORS middleware configuration
 * @see config/security.js - CORS default settings (origin: 'http://localhost:3000')
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * @see https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny
 * 
 * @author Security Test Suite
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Run CORS tests
 * npm test -- --testPathPattern=test_cors
 * 
 * @example
 * // Run with verbose output
 * npm test -- --testPathPattern=test_cors --verbose
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

/**
 * Supertest HTTP assertion library for testing Express.js applications.
 * Provides methods for making HTTP requests with custom headers and asserting responses.
 * Used for CORS testing with Origin header manipulation.
 * @see https://www.npmjs.com/package/supertest
 */
const request = require('supertest');

/**
 * Express application instance with CORS middleware configured.
 * Imported from server.js which exports { app } for testing purposes.
 * The app includes cors middleware from middleware/security.js that enforces
 * cross-origin access policies.
 */
const { app } = require('../../server');

// =============================================================================
// Test Constants
// =============================================================================

/**
 * Allowed origin for CORS requests as configured in config/security.js.
 * This is the default allowed origin for the application.
 * @constant {string}
 */
const ALLOWED_ORIGIN = 'http://localhost:3000';

/**
 * Unauthorized origin for testing CORS rejection.
 * Requests from this origin should not receive CORS headers.
 * @constant {string}
 */
const UNAUTHORIZED_ORIGIN = 'http://evil.com';

/**
 * Alternative unauthorized origin for additional rejection testing.
 * @constant {string}
 */
const MALICIOUS_ORIGIN = 'http://attacker.example.com';

/**
 * Another test origin for verifying consistent behavior.
 * @constant {string}
 */
const RANDOM_ORIGIN = 'http://random-site.net';

// =============================================================================
// CORS Policy Test Suite
// =============================================================================

/**
 * Test suite for CORS (Cross-Origin Resource Sharing) policy enforcement.
 * Verifies that the cors middleware from middleware/security.js properly
 * controls cross-origin access to the Express.js application.
 * 
 * The CORS configuration (from config/security.js defaults):
 * - origin: 'http://localhost:3000' (allowed origin)
 * - credentials: true (allow cookies/auth headers)
 * - optionsSuccessStatus: 200 (for legacy browser compatibility)
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */
describe('CORS Policy - cors Middleware', () => {

  // ===========================================================================
  // Test 1: Allowed Origin CORS Headers
  // ===========================================================================

  /**
   * Test 1: Verifies that requests from the allowed origin receive proper CORS headers.
   * 
   * When a request is sent with an Origin header matching the configured allowed
   * origin (http://localhost:3000), the response should include the
   * Access-Control-Allow-Origin header with the matching origin value.
   * 
   * @test {GET /} Sends request with allowed Origin header
   * @expects {string} Access-Control-Allow-Origin header to be present
   * @expects {string} Header value to match the allowed origin
   */
  it('should include CORS headers for allowed origin', async () => {
    // Send GET request with Origin header from allowed origin
    const response = await request(app)
      .get('/')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    // Verify Access-Control-Allow-Origin header is present
    expect(response.headers['access-control-allow-origin']).toBeDefined();

    // Verify the header value matches the allowed origin
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);

    // Verify the response body is still the expected content
    expect(response.text).toBe('Hello, World!\n');
  });

  // ===========================================================================
  // Test 2: Non-Whitelisted Origin Rejection
  // ===========================================================================

  /**
   * Test 2: Verifies that requests from non-whitelisted origins are rejected.
   * 
   * When a request is sent with an Origin header that is not in the whitelist
   * (e.g., http://evil.com), the response should NOT include the
   * Access-Control-Allow-Origin header, effectively blocking cross-origin access.
   * 
   * Note: The server may still return 200 OK for the actual request, but browsers
   * will block access to the response due to missing CORS headers. The cors
   * middleware with a specific origin string will not reflect unauthorized origins.
   * 
   * @test {GET /} Sends request with unauthorized Origin header
   * @expects {undefined} No Access-Control-Allow-Origin header in response
   */
  it('should reject requests from non-whitelisted origin', async () => {
    // Send GET request with Origin header from unauthorized origin
    const response = await request(app)
      .get('/')
      .set('Origin', UNAUTHORIZED_ORIGIN)
      .expect(200); // Server responds, but without CORS headers

    // Verify Access-Control-Allow-Origin header is NOT present for unauthorized origin
    // When using a specific origin (not '*' or function), cors middleware
    // only adds the header for matching origins
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  // ===========================================================================
  // Test 3: Preflight OPTIONS Request Handling
  // ===========================================================================

  /**
   * Test 3: Verifies that preflight OPTIONS requests are handled correctly.
   * 
   * Browsers send preflight OPTIONS requests before making cross-origin requests
   * that are considered "non-simple" (e.g., with custom headers, PUT/DELETE methods).
   * The server must respond with appropriate CORS headers for the preflight check.
   * 
   * The optionsSuccessStatus is configured to 200 (instead of 204) for legacy
   * browser compatibility per cors middleware configuration.
   * 
   * @test {OPTIONS /} Sends preflight request with Origin header
   * @expects {number} Status 200 (optionsSuccessStatus configuration)
   * @expects {string} Access-Control-Allow-Origin header present
   * @expects {string} Access-Control-Allow-Methods header present
   */
  it('should handle preflight OPTIONS requests correctly', async () => {
    // Send OPTIONS preflight request with required headers
    const response = await request(app)
      .options('/')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type');

    // Verify successful preflight response (200 per optionsSuccessStatus config)
    // Note: May return 200 or 204 depending on configuration
    expect([200, 204]).toContain(response.status);

    // Verify Access-Control-Allow-Origin header is present
    expect(response.headers['access-control-allow-origin']).toBeDefined();
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);

    // Verify Access-Control-Allow-Methods header is present
    // This indicates which HTTP methods are allowed for cross-origin requests
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });

  // ===========================================================================
  // Test 4: Credentials Support for Whitelisted Origins
  // ===========================================================================

  /**
   * Test 4: Verifies that credentials are allowed for whitelisted origins.
   * 
   * When credentials: true is configured in CORS options (as set in config/security.js),
   * the Access-Control-Allow-Credentials header should be present and set to 'true'.
   * This allows cookies and authorization headers to be included in cross-origin requests.
   * 
   * Note: When credentials are enabled, Access-Control-Allow-Origin cannot be '*'
   * and must specify a specific origin, which is correctly configured.
   * 
   * @test {GET /} Sends request with Origin from whitelist
   * @expects {string} Access-Control-Allow-Credentials header to be 'true'
   */
  it('should allow credentials for whitelisted origins', async () => {
    // Send GET request with Origin header from allowed origin
    const response = await request(app)
      .get('/')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    // Verify Access-Control-Allow-Origin header is present (required for credentials)
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);

    // Verify Access-Control-Allow-Credentials header is set to 'true'
    // This is configured as credentials: true in corsConfig
    expect(response.headers['access-control-allow-credentials']).toBeDefined();
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  // ===========================================================================
  // Test 5: Correct Access-Control-Allow-Origin Values
  // ===========================================================================

  /**
   * Test 5: Verifies that Access-Control-Allow-Origin header returns correct values.
   * 
   * Tests multiple requests from different origins to ensure:
   * - Allowed origins receive the correct Access-Control-Allow-Origin header
   * - Unauthorized origins do NOT receive the header
   * 
   * This verifies the origin whitelisting is working correctly and not
   * accidentally allowing all origins or reflecting arbitrary origins.
   * 
   * @test {GET /} Sends requests from multiple different origins
   * @expects {string} Allowed origins get correct header value
   * @expects {undefined} Unauthorized origins get no header
   */
  it('should return correct Access-Control-Allow-Origin value', async () => {
    // Test 1: Request from allowed origin should get CORS header
    const allowedResponse = await request(app)
      .get('/')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(allowedResponse.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);

    // Test 2: Request from malicious origin should NOT get CORS header
    const maliciousResponse = await request(app)
      .get('/')
      .set('Origin', MALICIOUS_ORIGIN)
      .expect(200);

    expect(maliciousResponse.headers['access-control-allow-origin']).toBeUndefined();

    // Test 3: Request from random origin should NOT get CORS header
    const randomResponse = await request(app)
      .get('/')
      .set('Origin', RANDOM_ORIGIN)
      .expect(200);

    expect(randomResponse.headers['access-control-allow-origin']).toBeUndefined();

    // Test 4: Request without Origin header (same-origin) should still work
    const noOriginResponse = await request(app)
      .get('/')
      .expect(200);

    // Response body should be correct regardless of CORS headers
    expect(noOriginResponse.text).toBe('Hello, World!\n');
  });

  // ===========================================================================
  // Test 6: HTTP Methods Restriction
  // ===========================================================================

  /**
   * Test 6: Verifies that Access-Control-Allow-Methods header restricts HTTP methods.
   * 
   * The preflight response should include Access-Control-Allow-Methods header
   * that specifies which HTTP methods are allowed for cross-origin requests.
   * This prevents unauthorized methods from being used in cross-origin contexts.
   * 
   * @test {OPTIONS /} Sends preflight OPTIONS request
   * @expects {string} Access-Control-Allow-Methods header present
   * @expects {string} Header contains expected HTTP methods (GET, POST, etc.)
   */
  it('should restrict HTTP methods via Access-Control-Allow-Methods', async () => {
    // Send OPTIONS preflight request
    const response = await request(app)
      .options('/')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');

    // Verify preflight response is successful
    expect([200, 204]).toContain(response.status);

    // Verify Access-Control-Allow-Methods header is present
    const allowMethods = response.headers['access-control-allow-methods'];
    expect(allowMethods).toBeDefined();

    // Verify the header contains expected HTTP methods
    // The cors middleware typically allows standard methods by default
    // Check that at least GET is present (our routes use GET)
    expect(allowMethods.toLowerCase()).toMatch(/get/i);

    // Verify Access-Control-Allow-Headers is present for preflight
    // This indicates which custom headers are allowed
    expect(response.headers['access-control-allow-headers']).toBeDefined();
  });

  // ===========================================================================
  // Additional CORS Security Tests
  // ===========================================================================

  /**
   * Additional test: Verifies CORS headers are applied to all endpoints.
   * 
   * Tests that CORS protection is consistent across different routes,
   * not just the root endpoint. The /evening endpoint should have
   * the same CORS policy applied.
   */
  it('should apply CORS policy consistently across all endpoints', async () => {
    // Test CORS on /evening endpoint
    const eveningResponse = await request(app)
      .get('/evening')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    // Verify CORS headers on alternate endpoint
    expect(eveningResponse.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(eveningResponse.headers['access-control-allow-credentials']).toBe('true');
    expect(eveningResponse.text).toBe('Good evening');

    // Verify unauthorized origin blocked on alternate endpoint too
    const unauthorizedResponse = await request(app)
      .get('/evening')
      .set('Origin', UNAUTHORIZED_ORIGIN)
      .expect(200);

    expect(unauthorizedResponse.headers['access-control-allow-origin']).toBeUndefined();
  });

  /**
   * Additional test: Verifies CORS does not expose sensitive headers unnecessarily.
   * 
   * While testing CORS behavior, also ensures that sensitive response headers
   * are not inadvertently exposed via Access-Control-Expose-Headers.
   */
  it('should not expose unnecessary headers in CORS response', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    // Access-Control-Expose-Headers should be limited or undefined
    // If present, it should not expose sensitive headers
    const exposedHeaders = response.headers['access-control-expose-headers'];
    
    // If header is present, verify it doesn't expose sensitive headers
    if (exposedHeaders) {
      // Sensitive headers that should NOT be exposed
      const sensitiveHeaders = ['set-cookie', 'authorization', 'x-api-key'];
      const exposedLower = exposedHeaders.toLowerCase();
      
      sensitiveHeaders.forEach(header => {
        expect(exposedLower).not.toContain(header);
      });
    }
    
    // CORS headers should be present for allowed origin
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

});
