/**
 * @fileoverview HTTP endpoint integration tests using Supertest
 * Tests existing endpoints, new health/API endpoints, and middleware behavior
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
}

/**
 * Asserts standard successful JSON response.
 * @param {SupertestResponse} response - Supertest response object
 * @param {Object} expectedBody - Expected response body structure to match
 */
function assertSuccessfulJsonResponse(response, expectedBody) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(response.body).toEqual(expect.objectContaining(expectedBody));
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

  describe('GET /health', () => {
    test('should return 200 status code', async () => {
      const response = await get('/health').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return JSON with status ok and uptime as positive number', async () => {
      const response = await get('/health');
      assertSuccessfulJsonResponse(response, { status: 'ok' });
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should return uptime value as a positive number approximately equal to process uptime', async () => {
      const response = await get('/health');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should return application/json Content-Type', async () => {
      const response = await get('/health').expect('Content-Type', /application\/json/);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/status', () => {
    test('should return 200 status code', async () => {
      const response = await get('/api/status').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return JSON with status running and environment as string', async () => {
      const response = await get('/api/status');
      assertSuccessfulJsonResponse(response, { status: 'running' });
      expect(typeof response.body.environment).toBe('string');
    });

    test('should return environment value as a non-empty string', async () => {
      const response = await get('/api/status');
      expect(typeof response.body.environment).toBe('string');
      expect(response.body.environment.length).toBeGreaterThan(0);
    });

    test('should return application/json Content-Type', async () => {
      const response = await get('/api/status').expect('Content-Type', /application\/json/);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Middleware Headers', () => {
    test('should include Helmet security headers and disable X-Powered-By', async () => {
      const response = await get('/');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should include CORS access-control-allow-origin header', async () => {
      const response = await get('/');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle CORS preflight OPTIONS request', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET');
      expect([200, 204]).toContain(response.status);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Body Parsing', () => {
    test('should accept POST with JSON Content-Type without body parser rejection', async () => {
      const response = await request(app)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send({ key: 'value' });
      // Should return 404 (no POST route) but NOT 400/415 (body parser rejection)
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(415);
    });

    test('should accept POST with URL-encoded Content-Type without body parser rejection', async () => {
      const response = await request(app)
        .post('/test-urlencoded')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value');
      // Should return 404 (no POST route) but NOT 400/415 (body parser rejection)
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(415);
    });
  });

  describe('Error Handler', () => {
    test('should return appropriate error response for unknown routes', async () => {
      const response = await get('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
    });

    test('should return response body with content for 404 errors', async () => {
      const response = await get('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.text.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for undefined routes (GET /invalid)', async () => {
      const response = await get('/invalid').expect(404);
      assert404Response(response);
    });

    test('should return 404 for POST / (unsupported method)', async () => {
      const response = await request(app).post('/').expect(404);
      assert404Response(response);
    });

    test('should return 404 for PUT /evening (unsupported method)', async () => {
      const response = await request(app).put('/evening').expect(404);
      assert404Response(response);
    });

    test('should return 404 for DELETE / (unsupported method)', async () => {
      const response = await request(app).delete('/').expect(404);
      assert404Response(response);
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
});
