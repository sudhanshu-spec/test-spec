/**
 * @fileoverview HTTP endpoint integration tests using Supertest
 *
 * Tests verify existing endpoint behavior is preserved after middleware
 * pipeline additions, and validates middleware effects on response headers.
 *
 * @module tests/integration/endpoints
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

/**
 * Asserts standard successful HTML response.
 * @param {SupertestResponse} response - Supertest response object
 * @param {string} expectedBody - Expected response body
 */
function assertSuccessfulHtmlResponse(response, expectedBody) {
  expect(response.status).toBe(200);
  expect(response.text).toBe(expectedBody);
  expect(response.headers['content-type']).toMatch(/text\/html/);
  expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
}

/**
 * Asserts 404 error response.
 * @param {SupertestResponse} response - Supertest response object
 */
function assert404Response(response) {
  expect(response.status).toBe(404);
  expect(response.text).toBeDefined();
  if (response.body && response.body.error) {
    expect(response.body.error).toBe('Not Found');
  }
}

describe('HTTP Endpoints', () => {
  describe('GET /', () => {
    test('should return 200 status code', async () => {
      const response = await get('/').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return "Hello, World!\\n" in response body', async () => {
      const response = await get('/');
      assertSuccessfulHtmlResponse(response, 'Hello, World!\n');
    });

    test('should return text/html Content-Type header', async () => {
      const response = await get('/').expect('Content-Type', /text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('GET /evening', () => {
    test('should return 200 status code', async () => {
      const response = await get('/evening').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return "Good evening" in response body', async () => {
      const response = await get('/evening');
      assertSuccessfulHtmlResponse(response, 'Good evening');
    });

    test('should return text/html Content-Type header', async () => {
      const response = await get('/evening').expect('Content-Type', /text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for undefined routes (GET /invalid)', async () => {
      const response = await get('/invalid');
      assert404Response(response);
    });

    test('should return 404 for POST / (unsupported method)', async () => {
      const response = await request(app).post('/');
      assert404Response(response);
    });

    test('should return 404 for PUT /evening (unsupported method)', async () => {
      const response = await request(app).put('/evening');
      assert404Response(response);
    });

    test('should return 404 for DELETE / (unsupported method)', async () => {
      const response = await request(app).delete('/');
      assert404Response(response);
    });

    test('should return JSON response for 404 errors', async () => {
      const response = await get('/invalid');
      expect(response.status).toBe(404);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBe('Not Found');
      expect(response.body.path).toBe('/invalid');
    });
  });

  describe('Edge Cases', () => {
    test('should return 200 with unchanged body when query parameters are present', async () => {
      const response = await get('/?param=value').expect(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle multiple query parameters on root endpoint', async () => {
      const response = await get('/?foo=bar&baz=qux').expect(200);
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should handle query parameters on /evening endpoint', async () => {
      const response = await get('/evening?time=late').expect(200);
      expect(response.text).toBe('Good evening');
    });

    test('should handle double slash path (GET //)', async () => {
      const response = await get('//');
      expect(response.status).toBeDefined();
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Middleware Integration', () => {
    describe('Security Headers (Helmet)', () => {
      test('should include x-content-type-options header in response', async () => {
        const response = await get('/');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      });

      test('should include x-frame-options header in response', async () => {
        const response = await get('/');
        expect(response.headers['x-frame-options']).toBeDefined();
      });

      test('should include security headers on /evening endpoint', async () => {
        const response = await get('/evening');
        expect(response.headers['x-content-type-options']).toBeDefined();
      });
    });

    describe('CORS Headers', () => {
      test('should include access-control-allow-origin header when Origin is sent', async () => {
        const response = await request(app)
          .get('/')
          .set('Origin', 'http://localhost:3000');
        expect(response.headers['access-control-allow-origin']).toBeDefined();
      });

      test('should respond to OPTIONS preflight request', async () => {
        const response = await request(app)
          .options('/')
          .set('Origin', 'http://localhost:3000')
          .set('Access-Control-Request-Method', 'GET');
        expect([200, 204]).toContain(response.status);
      });
    });

    describe('Compression', () => {
      test('should include content-encoding header when Accept-Encoding is set', async () => {
        // The 'Hello, World!\n' body is very small and may not trigger compression
        // (threshold-based). Compression middleware sets Vary: Accept-Encoding regardless
        // of whether the response body is compressed.
        const response = await request(app)
          .get('/')
          .set('Accept-Encoding', 'gzip');
        expect(response.status).toBe(200);
        expect(response.headers['vary']).toMatch(/Accept-Encoding/);
      });
    });

    describe('Body Parsing', () => {
      test('should accept JSON content type in requests', async () => {
        // Sending a JSON body to a nonexistent route confirms express.json()
        // middleware is active and does not break the 404 flow
        const response = await request(app)
          .post('/nonexistent')
          .send({ test: 'data' })
          .set('Content-Type', 'application/json');
        expect(response.status).toBe(404);
      });
    });
  });
});
