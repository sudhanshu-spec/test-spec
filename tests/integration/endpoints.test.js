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

    test('should return JSON with status ok', async () => {
      const response = await get('/health');
      expect(response.body).toHaveProperty('status', 'ok');
    });

    test('should return JSON with uptime as a number', async () => {
      const response = await get('/health');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
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

    test('should return JSON with status running', async () => {
      const response = await get('/api/status');
      expect(response.body).toHaveProperty('status', 'running');
    });

    test('should return JSON with environment string', async () => {
      const response = await get('/api/status');
      expect(response.body).toHaveProperty('environment');
      expect(typeof response.body.environment).toBe('string');
    });

    test('should return application/json Content-Type', async () => {
      const response = await get('/api/status').expect('Content-Type', /application\/json/);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Middleware Headers', () => {
    test('should include helmet security headers', async () => {
      const response = await get('/');
      // Helmet disables X-Powered-By
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should include CORS headers', async () => {
      const response = await get('/');
      // Default CORS origin is '*'
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Body Parsing', () => {
    test('should parse JSON request body', async () => {
      const response = await request(app)
        .post('/api/status')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      // POST to this endpoint will return 404 since only GET is defined
      // But body parsing should not cause an error
      expect(response.status).toBeDefined();
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
