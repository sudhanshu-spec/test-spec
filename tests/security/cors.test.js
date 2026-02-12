/**
 * @fileoverview CORS policy enforcement security tests using Supertest
 *
 * Dedicated test suite that verifies the CORS middleware in src/middleware/cors.js
 * enforces proper cross-origin access control on all application endpoints.
 *
 * Tests verify that:
 * - Access-Control-Allow-Origin header matches the configured origin
 * - Preflight OPTIONS requests return correct CORS response headers
 *   (Access-Control-Allow-Methods, Access-Control-Allow-Headers)
 * - Missing Origin header requests proceed without CORS errors
 * - Requests from non-whitelisted origins are appropriately handled
 * - CORS headers are present on all application endpoint responses
 *
 * The CORS middleware is configured (in src/middleware/cors.js) with:
 *   origin: config.corsOrigin (default: 'http://localhost:3000')
 *   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
 *   allowedHeaders: ['Content-Type', 'Authorization']
 *   credentials: true
 *   optionsSuccessStatus: 200
 *
 * Follows the principle of least privilege — CORS is configured to restrict
 * cross-origin access to known origins rather than allowing open access.
 *
 * @module tests/security/cors
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Default allowed CORS origin matching the corsOrigin configuration default.
 * Corresponds to config.corsOrigin from src/config/index.js when the
 * CORS_ORIGIN environment variable is not set.
 * @type {string}
 */
const ALLOWED_ORIGIN = 'http://localhost:3000';

/**
 * A non-whitelisted origin used to verify CORS restriction behavior.
 * Requests bearing this origin should not receive the requesting origin
 * in the Access-Control-Allow-Origin response header.
 * @type {string}
 */
const NON_WHITELISTED_ORIGIN = 'http://malicious.example.com';

/**
 * Makes a GET request to the specified path through the full middleware stack.
 * Mirrors the helper function pattern from tests/integration/endpoints.test.js.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

describe('CORS Policy', () => {
  describe('Access-Control-Allow-Origin', () => {
    test('should include Access-Control-Allow-Origin header matching configured origin when Origin header is sent with the allowed origin', async () => {
      const response = await get('/')
        .set('Origin', ALLOWED_ORIGIN)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    test('should handle requests without an Origin header correctly', async () => {
      const response = await get('/');

      // Without an Origin header the request should proceed normally
      // without any CORS error — server processes the request and returns 200
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle requests from non-whitelisted origin appropriately', async () => {
      const response = await get('/')
        .set('Origin', NON_WHITELISTED_ORIGIN);

      // The CORS middleware configured with a fixed string origin always
      // reflects the configured origin in the Access-Control-Allow-Origin
      // response header, not the requesting origin. Browser-side enforcement
      // blocks cross-origin access when the response header value does not
      // match the requesting page's origin, preventing unauthorized access.
      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
      expect(response.headers['access-control-allow-origin']).not.toBe(NON_WHITELISTED_ORIGIN);
    });
  });

  describe('Preflight OPTIONS Requests', () => {
    test('should respond to OPTIONS preflight request with correct Access-Control-Allow-Methods header', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-methods']).toBeDefined();

      // Verify all five configured HTTP methods are present in the response.
      // The CORS middleware specifies: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('OPTIONS');
    });

    test('should respond to OPTIONS preflight request with correct Access-Control-Allow-Headers header', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.headers['access-control-allow-headers']).toBeDefined();

      // Verify the two configured headers are permitted.
      // The CORS middleware specifies: ['Content-Type', 'Authorization']
      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('Authorization');
    });

    test('should return 200 optionsSuccessStatus for preflight requests', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      // The CORS middleware sets optionsSuccessStatus: 200 for legacy
      // browser compatibility (some older browsers choke on 204)
      expect(response.status).toBe(200);
    });
  });

  describe('CORS on Application Endpoints', () => {
    test('GET / with allowed Origin header should include CORS headers and return correct body', async () => {
      const response = await get('/')
        .set('Origin', ALLOWED_ORIGIN)
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    test('GET /evening with allowed Origin header should include CORS headers and return correct body', async () => {
      const response = await get('/evening')
        .set('Origin', ALLOWED_ORIGIN)
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });
  });
});
