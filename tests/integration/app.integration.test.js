/**
 * Express Application Integration Tests
 *
 * Full HTTP request/response cycle tests using Supertest against the Express 5
 * app factory exported from src/app.js. Supertest accepts the app instance
 * directly and binds to an ephemeral port automatically — no live server needed.
 *
 * Test categories:
 *   - GET / route: status code, response body (with trailing \n), headers
 *   - GET /evening route: status code, response body (no trailing \n), headers
 *   - 404 handling: undefined routes, unsupported HTTP methods
 *   - Edge cases: query parameters, HEAD requests
 *
 * Express 5 specifics:
 *   - Default 404 handler returns an HTML error page; tests assert status code
 *     rather than exact body content for 404 responses
 *   - res.send() with a string sets Content-Type to 'text/html; charset=utf-8'
 *
 * @module tests/integration/app.integration.test
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('Integration Tests - Express Application', () => {
  // ===========================================================================
  // GET / Route Tests
  // ===========================================================================

  describe('GET /', () => {
    test('GET / should return 200 status code', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
    });

    test('GET / should return Hello, World!\\n as response body', async () => {
      const res = await request(app).get('/');

      // CRITICAL: The trailing newline (\n) MUST be present in the assertion.
      // Source: src/routes/main.routes.js line 27: res.send('Hello, World!\n')
      expect(res.text).toBe('Hello, World!\n');
    });

    test('GET / should include Content-Type text/html header', async () => {
      const res = await request(app).get('/');

      // Express res.send() with a string sets Content-Type to text/html; charset=utf-8
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET / should include Content-Length header', async () => {
      const res = await request(app).get('/');

      // Express automatically sets Content-Length for string responses
      expect(res.headers['content-length']).toBeDefined();
    });
  });

  // ===========================================================================
  // GET /evening Route Tests
  // ===========================================================================

  describe('GET /evening', () => {
    test('GET /evening should return 200 status code', async () => {
      const res = await request(app).get('/evening');

      expect(res.status).toBe(200);
    });

    test('GET /evening should return Good evening as response body', async () => {
      const res = await request(app).get('/evening');

      // NO trailing newline — exact string match required
      // Source: src/routes/main.routes.js line 38: res.send('Good evening')
      expect(res.text).toBe('Good evening');
    });

    test('GET /evening should include Content-Type text/html header', async () => {
      const res = await request(app).get('/evening');

      expect(res.headers['content-type']).toMatch(/text\/html/);
    });
  });

  // ===========================================================================
  // 404 Not Found - Undefined Routes
  // ===========================================================================

  describe('404 Not Found - Undefined Routes', () => {
    test('GET /nonexistent should return 404 status code', async () => {
      // Express 5's default handler returns 404 for paths with no registered route
      const res = await request(app).get('/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // 404 Not Found - Unsupported HTTP Methods
  // ===========================================================================

  describe('404 Not Found - Unsupported HTTP Methods', () => {
    test('POST / should return 404 for unregistered method', async () => {
      // Only GET is registered on / (src/routes/main.routes.js line 26)
      // Express 5 returns 404 for unregistered methods on defined paths
      const res = await request(app).post('/');

      expect(res.status).toBe(404);
    });

    test('PUT /evening should return 404 for unregistered method', async () => {
      // Only GET is registered on /evening
      const res = await request(app).put('/evening');

      expect(res.status).toBe(404);
    });

    test('DELETE / should return 404 for unregistered method', async () => {
      const res = await request(app).delete('/');

      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    test('GET / with query parameters should still return correct response', async () => {
      // Query parameters should not affect route matching or response body
      const res = await request(app).get('/?foo=bar&baz=123');

      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });

    test('HEAD / should return 200 with no body', async () => {
      // HEAD requests return headers without body; Express handles HEAD
      // automatically for GET routes
      const res = await request(app).head('/');

      expect(res.status).toBe(200);
      // HEAD responses must have an empty body
      expect(res.text).toBeFalsy();
    });
  });
});
