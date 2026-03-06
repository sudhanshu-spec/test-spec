/**
 * Comprehensive Unit Test Suite for Express.js Server
 *
 * Contains 30 tests organized in 11 categories to validate all server
 * functionality including robustness features such as error handling,
 * health check endpoint, input validation, and security headers.
 *
 * Uses Jest as the test framework and supertest for HTTP assertion testing.
 * The app instance is imported directly from server.js without starting
 * the server, as supertest handles server binding internally.
 *
 * Test Categories (30 tests total):
 *  1. Basic Routes (2)
 *  2. Health Check Endpoint (1)
 *  3. 404 Not Found Handler (4)
 *  4. JSON Body Parser (3)
 *  5. Security Headers (5)
 *  6. CORS (1)
 *  7. Error Format (2)
 *  8. Content-Type (2)
 *  9. HTTP Methods (3)
 * 10. Edge Cases (5)
 * 11. Response Headers (2)
 *
 * @requires supertest - HTTP assertion testing library for Express.js
 * @requires ./server - Express application instance (app export)
 */

const request = require('supertest');
const { app } = require('./server');

describe('Express Server Tests', () => {

  // ===========================================================================
  // Category 1: Basic Routes (2 tests)
  // Verifies the core application routes return expected responses.
  // ===========================================================================
  describe('Basic Routes', () => {
    test('GET / should return "Hello, World!"', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });

    test('GET /evening should return "Good evening"', async () => {
      const res = await request(app).get('/evening');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('Good evening');
    });
  });

  // ===========================================================================
  // Category 2: Health Check Endpoint (1 test)
  // Validates the /health endpoint returns proper monitoring data.
  // ===========================================================================
  describe('Health Check Endpoint', () => {
    test('GET /health should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ===========================================================================
  // Category 3: 404 Not Found Handler (4 tests)
  // Ensures undefined routes return proper 404 JSON responses for all
  // common HTTP methods (GET, POST, PUT, DELETE).
  // ===========================================================================
  describe('404 Not Found Handler', () => {
    test('GET /nonexistent should return 404 with JSON error', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not Found');
      expect(res.body.message).toMatch(/\/nonexistent/);
      expect(res.body.statusCode).toBe(404);
    });

    test('POST /undefined-route should return 404', async () => {
      const res = await request(app).post('/undefined-route');
      expect(res.statusCode).toBe(404);
    });

    test('PUT /undefined-route should return 404', async () => {
      const res = await request(app).put('/undefined-route');
      expect(res.statusCode).toBe(404);
    });

    test('DELETE /undefined-route should return 404', async () => {
      const res = await request(app).delete('/undefined-route');
      expect(res.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // Category 4: JSON Body Parser (3 tests)
  // Validates express.json() middleware with size limit (100kb) and strict mode.
  // Tests acceptance of valid JSON, rejection of malformed JSON, and
  // enforcement of payload size limits to prevent DoS attacks.
  // ===========================================================================
  describe('JSON Body Parser', () => {
    test('POST with valid JSON body should be accepted by parser', async () => {
      const res = await request(app)
        .post('/')
        .send({ name: 'test', value: 42 });
      // Valid JSON is accepted by parser; 404 returned because no POST route is defined for /
      expect(res.statusCode).toBe(404);
    });

    test('POST with content-type application/json and invalid JSON should return 400', async () => {
      const res = await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(res.statusCode).toBe(400);
    });

    test('POST with large JSON payload (>100kb) should return 413 PayloadTooLargeError', async () => {
      // Generate a payload exceeding the 100kb limit configured in express.json()
      const largePayload = { data: 'x'.repeat(200000) };
      const res = await request(app)
        .post('/')
        .send(largePayload);
      expect(res.statusCode).toBe(413);
    });
  });

  // ===========================================================================
  // Category 5: Security Headers (5 tests)
  // Validates that helmet.js middleware applies all critical security headers
  // and removes the X-Powered-By header to prevent framework fingerprinting.
  // ===========================================================================
  describe('Security Headers', () => {
    test('Response should include Content-Security-Policy header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-security-policy']).toBeDefined();
    });

    test('Response should include Strict-Transport-Security header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    test('Response should include X-Content-Type-Options header set to nosniff', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Response should NOT include X-Powered-By header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('Response should include Cross-Origin-Opener-Policy header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['cross-origin-opener-policy']).toBeDefined();
    });
  });

  // ===========================================================================
  // Category 6: CORS (1 test)
  // Validates that CORS preflight requests receive proper Access-Control
  // headers for cross-origin resource sharing compliance.
  // ===========================================================================
  describe('CORS', () => {
    test('OPTIONS request should return CORS headers (Access-Control-Allow-Methods)', async () => {
      const res = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  // ===========================================================================
  // Category 7: Error Format (2 tests)
  // Validates that error responses follow a standardized JSON structure
  // with error, message, and statusCode fields for consistent API responses.
  // ===========================================================================
  describe('Error Format', () => {
    test('404 response should have correct JSON structure with error, message, and statusCode fields', async () => {
      const res = await request(app).get('/does-not-exist');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('statusCode');
    });

    test('404 response Content-Type should be application/json', async () => {
      const res = await request(app).get('/does-not-exist');
      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ===========================================================================
  // Category 8: Content-Type (2 tests)
  // Validates that different endpoints return the correct Content-Type header
  // based on the type of content being served (HTML vs JSON).
  // ===========================================================================
  describe('Content-Type', () => {
    test('GET / should return text/html content-type', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /health should return application/json content-type', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ===========================================================================
  // Category 9: HTTP Methods (3 tests)
  // Validates that unsupported HTTP methods on defined routes return 404
  // since only GET is defined for / and /evening routes.
  // Express 5.x returns 404 (not 405) when method is not matched.
  // ===========================================================================
  describe('HTTP Methods', () => {
    test('POST / should return 404 (only GET defined for /)', async () => {
      const res = await request(app).post('/');
      expect(res.statusCode).toBe(404);
    });

    test('PUT / should return 404', async () => {
      const res = await request(app).put('/');
      expect(res.statusCode).toBe(404);
    });

    test('DELETE / should return 404', async () => {
      const res = await request(app).delete('/');
      expect(res.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // Category 10: Edge Cases (5 tests)
  // Validates server behavior under unusual or boundary request conditions
  // including malformed URLs, query parameters, and path edge cases.
  // ===========================================================================
  describe('Edge Cases', () => {
    test('Request with empty path segments (GET //) should return 404 or valid response', async () => {
      const res = await request(app).get('//');
      // Express may normalize // to / (200) or treat as undefined route (404)
      expect([200, 404]).toContain(res.statusCode);
    });

    test('Request with query parameters (GET /?key=value) should still return 200', async () => {
      const res = await request(app).get('/?key=value');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });

    test('Request with special characters in URL (GET /path%20with%20spaces) should return 404', async () => {
      const res = await request(app).get('/path%20with%20spaces');
      expect(res.statusCode).toBe(404);
    });

    test('Request with very long URL should be handled gracefully', async () => {
      const longPath = '/' + 'a'.repeat(10000);
      const res = await request(app).get(longPath);
      // Should return 404 (route not found) or 414 (URI too long)
      expect(res.statusCode).toBeDefined();
      expect([404, 414]).toContain(res.statusCode);
    });

    test('Request with multiple consecutive slashes (GET ///test) should return 404', async () => {
      const res = await request(app).get('///test');
      expect(res.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // Category 11: Response Headers (2 tests)
  // Validates that responses include standard HTTP headers and that the
  // health endpoint returns all required monitoring fields.
  // ===========================================================================
  describe('Response Headers', () => {
    test('Response should include proper Date header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['date']).toBeDefined();
    });

    test('Health endpoint response should include all required fields (status, uptime, timestamp)', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      // Validate field types and values
      expect(res.body.status).toBe('healthy');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      // Validate timestamp is a valid ISO 8601 string
      const parsedTimestamp = new Date(res.body.timestamp);
      expect(parsedTimestamp.toISOString()).toBe(res.body.timestamp);
    });
  });
});
