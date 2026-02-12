/**
 * @fileoverview HTTP endpoint integration tests using Supertest
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
  expect(response.body.status).toBe('error');
  expect(response.body.statusCode).toBe(404);
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

    test('should return JSON error response for 404', async () => {
      const response = await get('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message', 'Not Found');
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

  describe('Middleware Security Headers', () => {
    test('should include Content-Security-Policy header from Helmet', async () => {
      const response = await get('/');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should include X-Content-Type-Options header from Helmet', async () => {
      const response = await get('/');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should include Cross-Origin-Opener-Policy header from Helmet', async () => {
      const response = await get('/');
      expect(response.headers['cross-origin-opener-policy']).toBeDefined();
    });

    test('should include X-DNS-Prefetch-Control header from Helmet', async () => {
      const response = await get('/');
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    test('should include Access-Control-Allow-Origin header', async () => {
      const response = await get('/');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    test('should respond to OPTIONS preflight request', async () => {
      const response = await request(app).options('/');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
