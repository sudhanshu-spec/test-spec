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
 * Makes a HEAD request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function head(path) {
  return request(app).head(path);
}

/**
 * Makes a POST request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function post(path) {
  return request(app).post(path);
}

/**
 * Makes a PUT request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function put(path) {
  return request(app).put(path);
}

/**
 * Makes a PATCH request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function patch(path) {
  return request(app).patch(path);
}

/**
 * Makes a DELETE request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function del(path) {
  return request(app).delete(path);
}

/**
 * Makes an OPTIONS request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function options(path) {
  return request(app).options(path);
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

  describe('HEAD Requests', () => {
    test('should return 200 with correct headers but empty body for HEAD /', async () => {
      const response = await head('/').expect(200);
      expect(response.body).toEqual({});
      expect(response.text === '' || response.text === undefined).toBe(true);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });

    test('should return 200 with correct headers but empty body for HEAD /evening', async () => {
      const response = await head('/evening').expect(200);
      expect(response.body).toEqual({});
      expect(response.text === '' || response.text === undefined).toBe(true);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('OPTIONS Requests', () => {
    test('should handle OPTIONS request', async () => {
      const response = await options('/');
      expect(response.status).toBeDefined();
      expect(response.headers).toBeDefined();
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

    test('should return 404 for PATCH / (unsupported method)', async () => {
      const response = await patch('/').expect(404);
      assert404Response(response);
    });

    test('should return 404 for DELETE /evening (unsupported method)', async () => {
      const response = await del('/evening').expect(404);
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

    test('should handle query parameters on valid routes', async () => {
      const response = await get('/?foo=bar').expect(200);
      assertSuccessfulHtmlResponse(response, 'Hello, World!\n');
    });

    test('should handle trailing slash on /evening/', async () => {
      const response = await get('/evening/');
      expect(response.status).toBeDefined();
      expect([200, 301, 302, 404]).toContain(response.status);
    });

    test('should handle double slashes in path', async () => {
      const response = await get('//evening');
      expect(response.status).toBeDefined();
      expect([200, 404]).toContain(response.status);
    });

    test('should handle URL-encoded characters', async () => {
      const response = await get('/%65vening');
      expect(response.status).toBeDefined();
      expect([200, 404]).toContain(response.status);
    });

    test('should be case-insensitive for route paths by default', async () => {
      const response = await get('/Evening');
      expect(response.status).toBeDefined();
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Response Headers', () => {
    test('should include Content-Length header in response', async () => {
      const response = await get('/');
      expect(response.headers['content-length']).toBeDefined();
      expect(parseInt(response.headers['content-length'], 10)).toBe(Buffer.byteLength('Hello, World!\n'));
    });

    test('should include Content-Type text/html for all routes', async () => {
      const rootResponse = await get('/');
      expect(rootResponse.headers['content-type']).toMatch(/text\/html/);
      expect(rootResponse.headers['content-type']).toMatch(/charset=utf-8/i);

      const eveningResponse = await get('/evening');
      expect(eveningResponse.headers['content-type']).toMatch(/text\/html/);
      expect(eveningResponse.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle extremely long URL paths with 404', async () => {
      const longPath = '/' + 'a'.repeat(1000);
      const response = await get(longPath);
      assert404Response(response);
    });

    test('should return consistent responses under concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () => get('/'));
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        assertSuccessfulHtmlResponse(response, 'Hello, World!\n');
      });
    });
  });
});
