/**
 * @fileoverview Unit tests for server.js route handlers.
 * Contains comprehensive tests for all Express.js route handlers:
 * - GET / (root endpoint returning "Hello, World!\n")
 * - GET /evening (evening greeting endpoint)
 * - GET /health (health check endpoint with JSON response)
 * - Undefined routes (404 handling)
 * 
 * Test coverage includes:
 * - HTTP status codes (200 for success, 404 for not found)
 * - Response body validation (text and JSON content)
 * - Content-Type header verification (text/html, application/json)
 * - Security headers presence via Helmet middleware
 * - JSON structure validation for health endpoint
 * - Edge cases (invalid methods, query parameters, case sensitivity)
 * 
 * @module tests/unit/test_server_routes
 * @requires supertest - HTTP assertion library for Express.js testing
 * @requires ../../server - Express application instance with routes configured
 * @requires ../helpers/test_utils - Shared test utilities for header validation
 * 
 * @see server.js - Route handler implementations
 * @see tests/security/test_headers.js - Pattern reference for test structure
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Run route tests only
 * npm test -- --testPathPattern=test_server_routes
 * 
 * @example
 * // Run with verbose output
 * npm test -- --testPathPattern=test_server_routes --verbose
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

/**
 * Supertest HTTP assertion library for testing Express.js applications.
 * Provides methods for making HTTP requests and asserting responses
 * without starting an actual HTTP server.
 * @see https://www.npmjs.com/package/supertest
 */
const request = require('supertest');

/**
 * Express application instance with all middleware and routes configured.
 * Imported from server.js which exports { app } for testing purposes.
 * The app includes security middleware (helmet, cors, rate-limit) and
 * validation middleware before route handlers.
 */
const { app } = require('../../server');

/**
 * Shared test utilities for case-insensitive header validation.
 * - hasHeader: Check if a header exists (case-insensitive)
 * - getHeader: Get header value (case-insensitive)
 */
const { hasHeader, getHeader } = require('../helpers/test_utils');

// =============================================================================
// Test Constants
// =============================================================================

/**
 * Expected response body for the root endpoint.
 * The server returns "Hello, World!" followed by a newline character.
 * @constant {string}
 */
const HELLO_WORLD_RESPONSE = 'Hello, World!\n';

/**
 * Expected response body for the evening endpoint.
 * The server returns "Good evening" as plain text.
 * @constant {string}
 */
const GOOD_EVENING_RESPONSE = 'Good evening';

/**
 * Expected health status value in health endpoint response.
 * @constant {string}
 */
const HEALTHY_STATUS = 'healthy';

/**
 * Expected version string in health endpoint response.
 * Matches the version defined in server.js.
 * @constant {string}
 */
const EXPECTED_VERSION = '2.0.0';

/**
 * Expected security configuration keys in health endpoint response.
 * These keys represent the security features enabled on the server.
 * @constant {string[]}
 */
const SECURITY_KEYS = [
  'https',
  'trustProxy',
  'rateLimit',
  'helmet',
  'cors',
  'inputValidation'
];

/**
 * Content-Type header value for HTML responses.
 * Used by GET / and GET /evening endpoints.
 * @constant {string}
 */
const TEXT_HTML_CONTENT_TYPE = 'text/html; charset=utf-8';

/**
 * Content-Type header value for JSON responses.
 * Used by GET /health endpoint.
 * @constant {string}
 */
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

// =============================================================================
// Root Route Test Suite (GET /)
// =============================================================================

/**
 * Test suite for the root route handler (GET /).
 * Verifies that the root endpoint returns the correct greeting message
 * with proper status code, content type, and security headers.
 */
describe('Server Routes - GET /', () => {
  /**
   * Test 1: Basic functionality - returns Hello, World! with 200 status.
   * 
   * Verifies:
   * - HTTP status code is 200 OK
   * - Response body is exactly "Hello, World!\n"
   * 
   * @see server.js lines 212-214 for route implementation
   */
  it('should return Hello, World! with 200 status', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.text).toBe(HELLO_WORLD_RESPONSE);
  });

  /**
   * Test 2: Content-Type header verification.
   * 
   * Verifies:
   * - Content-Type header is present
   * - Content-Type is text/html with UTF-8 charset
   * 
   * Express.js sets this automatically for res.send() with string content.
   */
  it('should return text/html content-type', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    const contentType = getHeader(response.headers, 'Content-Type');
    
    expect(contentType).toBeDefined();
    expect(contentType.toLowerCase()).toBe(TEXT_HTML_CONTENT_TYPE);
  });

  /**
   * Test 3: Security headers verification via Helmet middleware.
   * 
   * Verifies:
   * - X-Content-Type-Options header is present
   * - This confirms Helmet middleware is applied to the route
   * 
   * @see tests/security/test_headers.js for comprehensive header tests
   */
  it('should include security headers from Helmet', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    // Verify X-Content-Type-Options header exists (set by Helmet)
    const hasSecurityHeader = hasHeader(response.headers, 'X-Content-Type-Options');
    expect(hasSecurityHeader).toBe(true);
    
    // Verify the value is 'nosniff'
    const xContentTypeOptions = getHeader(response.headers, 'X-Content-Type-Options');
    expect(xContentTypeOptions.toLowerCase()).toBe('nosniff');
  });

  /**
   * Test 4: Invalid HTTP method handling - POST to GET-only endpoint.
   * 
   * Verifies:
   * - POST request to / returns 404 status (method not defined)
   * - Express returns 404 for undefined route/method combinations
   * 
   * Note: Express treats undefined method handlers as 404, not 405.
   */
  it('should return 404 for POST method', async () => {
    const response = await request(app)
      .post('/')
      .expect(404);
    
    expect(response.status).toBe(404);
  });

  /**
   * Test 5: Query parameter handling - route still works with params.
   * 
   * Verifies:
   * - GET / with query parameters still returns greeting
   * - Query parameters do not affect the response
   * - Status code remains 200 OK
   */
  it('should handle query parameters gracefully', async () => {
    const response = await request(app)
      .get('/?param=value&foo=bar')
      .expect(200);
    
    expect(response.text).toBe(HELLO_WORLD_RESPONSE);
  });
});

// =============================================================================
// Evening Route Test Suite (GET /evening)
// =============================================================================

/**
 * Test suite for the evening route handler (GET /evening).
 * Verifies that the evening endpoint returns the correct greeting message
 * with proper status code, content type, and handles edge cases.
 */
describe('Server Routes - GET /evening', () => {
  /**
   * Test 1: Basic functionality - returns Good evening with 200 status.
   * 
   * Verifies:
   * - HTTP status code is 200 OK
   * - Response body is exactly "Good evening"
   * 
   * @see server.js lines 239-241 for route implementation
   */
  it('should return Good evening with 200 status', async () => {
    const response = await request(app)
      .get('/evening')
      .expect(200);
    
    expect(response.text).toBe(GOOD_EVENING_RESPONSE);
  });

  /**
   * Test 2: Content-Type header verification.
   * 
   * Verifies:
   * - Content-Type header is present
   * - Content-Type is text/html with UTF-8 charset
   */
  it('should return text/html content-type', async () => {
    const response = await request(app)
      .get('/evening')
      .expect(200);
    
    const contentType = getHeader(response.headers, 'Content-Type');
    
    expect(contentType).toBeDefined();
    expect(contentType.toLowerCase()).toBe(TEXT_HTML_CONTENT_TYPE);
  });

  /**
   * Test 3: Case insensitivity - /Evening matches /evening by default.
   * 
   * Verifies:
   * - Express.js routes are case-insensitive by default
   * - /Evening (capital E) matches /evening route
   * - Returns 200 status with same response
   * 
   * Note: Express.js default is case-insensitive routing.
   * To enable case sensitivity, use: app.set('case sensitive routing', true)
   */
  it('should handle case variations like /Evening (Express default is case-insensitive)', async () => {
    const response = await request(app)
      .get('/Evening')
      .expect(200);
    
    expect(response.status).toBe(200);
    expect(response.text).toBe(GOOD_EVENING_RESPONSE);
  });

  /**
   * Test 4: Invalid HTTP method handling - POST to GET-only endpoint.
   * 
   * Verifies:
   * - POST request to /evening returns 404 status
   * - Express treats undefined method handlers as 404
   */
  it('should return 404 for POST method', async () => {
    const response = await request(app)
      .post('/evening')
      .expect(404);
    
    expect(response.status).toBe(404);
  });
});

// =============================================================================
// Health Route Test Suite (GET /health)
// =============================================================================

/**
 * Test suite for the health check route handler (GET /health).
 * Verifies that the health endpoint returns the correct JSON structure
 * with health status, timestamp, security configuration, and version.
 * 
 * The health endpoint is critical for:
 * - Container orchestration (Kubernetes liveness/readiness probes)
 * - Load balancer health checks
 * - Monitoring system integration
 */
describe('Server Routes - GET /health', () => {
  /**
   * Test 1: Basic functionality - returns 200 status with JSON body.
   * 
   * Verifies:
   * - HTTP status code is 200 OK
   * - Response body is valid JSON (parsed by supertest)
   * - Body is an object (not null, array, or primitive)
   */
  it('should return 200 status with JSON body', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toBeDefined();
    expect(typeof response.body).toBe('object');
    expect(response.body).not.toBeNull();
    expect(Array.isArray(response.body)).toBe(false);
  });

  /**
   * Test 2: Content-Type header verification.
   * 
   * Verifies:
   * - Content-Type header is present
   * - Content-Type is application/json with UTF-8 charset
   */
  it('should return application/json content-type', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    const contentType = getHeader(response.headers, 'Content-Type');
    
    expect(contentType).toBeDefined();
    expect(contentType.toLowerCase()).toBe(JSON_CONTENT_TYPE);
  });

  /**
   * Test 3: Status field validation - should be "healthy".
   * 
   * Verifies:
   * - Response contains 'status' field
   * - Status value is exactly "healthy"
   */
  it('should include status as healthy', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBeDefined();
    expect(response.body.status).toBe(HEALTHY_STATUS);
  });

  /**
   * Test 4: Timestamp validation - should be valid ISO 8601 format.
   * 
   * Verifies:
   * - Response contains 'timestamp' field
   * - Timestamp is a string
   * - Timestamp is valid ISO 8601 date format
   * - Timestamp parses to a valid Date object
   * - Timestamp is within reasonable time range (last 10 seconds)
   */
  it('should include valid ISO 8601 timestamp', async () => {
    const beforeRequest = new Date();
    
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    const afterRequest = new Date();
    
    // Verify timestamp exists and is a string
    expect(response.body.timestamp).toBeDefined();
    expect(typeof response.body.timestamp).toBe('string');
    
    // Verify timestamp is valid ISO 8601 format
    const timestampDate = new Date(response.body.timestamp);
    expect(timestampDate.toString()).not.toBe('Invalid Date');
    
    // Verify ISO 8601 format (contains 'T' separator and 'Z' for UTC)
    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    
    // Verify timestamp is within request window (within 10 seconds)
    expect(timestampDate.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime() - 10000);
    expect(timestampDate.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 10000);
  });

  /**
   * Test 5: Security object validation - should include all security flags.
   * 
   * Verifies:
   * - Response contains 'security' field
   * - Security field is an object
   * - Security object contains all expected keys:
   *   - https (boolean)
   *   - trustProxy (boolean)
   *   - rateLimit (boolean)
   *   - helmet (boolean)
   *   - cors (boolean)
   *   - inputValidation (boolean)
   * - All security flags are boolean values
   * - Static security flags (rateLimit, helmet, cors, inputValidation) are true
   */
  it('should include security object with all flags', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    // Verify security object exists
    expect(response.body.security).toBeDefined();
    expect(typeof response.body.security).toBe('object');
    expect(response.body.security).not.toBeNull();
    
    // Verify all expected keys are present
    SECURITY_KEYS.forEach(key => {
      expect(response.body.security).toHaveProperty(key);
      expect(typeof response.body.security[key]).toBe('boolean');
    });
    
    // Verify static security flags are true (these are always enabled)
    expect(response.body.security.rateLimit).toBe(true);
    expect(response.body.security.helmet).toBe(true);
    expect(response.body.security.cors).toBe(true);
    expect(response.body.security.inputValidation).toBe(true);
    
    // Note: https and trustProxy depend on environment configuration
    // Their boolean type is verified above, but value is environment-dependent
  });

  /**
   * Test 6: Version field validation - should be "2.0.0".
   * 
   * Verifies:
   * - Response contains 'version' field
   * - Version is a string
   * - Version value matches expected "2.0.0"
   * 
   * @see server.js line 270 for version definition
   */
  it('should include version 2.0.0', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.version).toBeDefined();
    expect(typeof response.body.version).toBe('string');
    expect(response.body.version).toBe(EXPECTED_VERSION);
  });
});

// =============================================================================
// Undefined Routes Test Suite (404 Handling)
// =============================================================================

/**
 * Test suite for undefined route handling.
 * Verifies that requests to non-existent routes return proper 404 responses
 * while still including security headers.
 */
describe('Server Routes - Undefined Routes', () => {
  /**
   * Test 1: Undefined route returns 404 status.
   * 
   * Verifies:
   * - GET request to non-existent route returns 404
   * - Response status is exactly 404 Not Found
   */
  it('should return 404 for undefined route', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);
    
    expect(response.status).toBe(404);
  });

  /**
   * Test 2: Security headers included on 404 responses.
   * 
   * Verifies:
   * - X-Content-Type-Options header is present on 404 response
   * - Security headers are applied even for error responses
   * - Helmet middleware runs before Express error handling
   * 
   * This is important for security - error responses should not
   * expose the application to attacks like MIME sniffing.
   */
  it('should still include security headers on 404', async () => {
    const response = await request(app)
      .get('/this-route-does-not-exist')
      .expect(404);
    
    // Verify security headers are present even on 404 responses
    const hasSecurityHeader = hasHeader(response.headers, 'X-Content-Type-Options');
    expect(hasSecurityHeader).toBe(true);
    
    // Verify the value is correct
    const xContentTypeOptions = getHeader(response.headers, 'X-Content-Type-Options');
    expect(xContentTypeOptions).toBeDefined();
    expect(xContentTypeOptions.toLowerCase()).toBe('nosniff');
  });

  /**
   * Test 3: Multiple undefined routes return consistent 404.
   * 
   * Verifies:
   * - Different non-existent paths all return 404
   * - Behavior is consistent across various URL patterns
   * 
   * Note: Express.js routes are case-insensitive by default, so
   * /Evening matches /evening and /HEALTH matches /health (returning 200).
   * Only truly undefined routes return 404.
   */
  it('should return 404 for various undefined routes', async () => {
    const undefinedRoutes = [
      '/api/unknown',
      '/admin',
      '/test/path/deep',
      '/hello',
      '/healthcheck',    // Similar to /health but different
      '/morninggreeting' // Different from /evening
    ];

    for (const route of undefinedRoutes) {
      const response = await request(app)
        .get(route)
        .expect(404);
      
      expect(response.status).toBe(404);
    }
  });
});
