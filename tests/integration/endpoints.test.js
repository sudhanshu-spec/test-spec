/**
 * @fileoverview HTTP endpoint integration tests using Supertest
 * Tests all HTTP endpoints including original routes, health checks, and API routes
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
 * Asserts JSON response Content-Type.
 * @param {SupertestResponse} response - Supertest response object
 */
function assertJsonResponse(response) {
  expect(response.headers['content-type']).toMatch(/application\/json/);
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

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    test('should return 200 status code', async () => {
      const response = await get('/health').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return JSON response with status field', async () => {
      const response = await get('/health');
      assertJsonResponse(response);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    test('should return timestamp in response body', async () => {
      const response = await get('/health');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('number');
    });
  });

  describe('GET /health/ready', () => {
    test('should return 200 status code', async () => {
      const response = await get('/health/ready').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return JSON response with readiness status', async () => {
      const response = await get('/health/ready');
      assertJsonResponse(response);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    test('should return uptime in response body', async () => {
      const response = await get('/health/ready');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /health/live', () => {
    test('should return 200 status code', async () => {
      const response = await get('/health/live').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return OK response', async () => {
      const response = await get('/health/live');
      expect(response.text).toBe('OK');
    });
  });
});

describe('API Endpoints', () => {
  describe('GET /api/v1/status', () => {
    test('should return 200 status code', async () => {
      const response = await get('/api/v1/status').expect(200);
      expect(response.status).toBe(200);
    });

    test('should return JSON response', async () => {
      const response = await get('/api/v1/status');
      assertJsonResponse(response);
    });

    test('should return version v1 in response body', async () => {
      const response = await get('/api/v1/status');
      expect(response.body).toHaveProperty('version', 'v1');
    });

    test('should return operational status', async () => {
      const response = await get('/api/v1/status');
      expect(response.body).toHaveProperty('status', 'operational');
    });

    test('should return timestamp in response body', async () => {
      const response = await get('/api/v1/status');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('number');
    });
  });
});

describe('Request ID Middleware Integration', () => {
  test('should include X-Request-ID header in response', async () => {
    const response = await get('/');
    expect(response.headers).toHaveProperty('x-request-id');
  });

  test('should return valid UUID v4 in X-Request-ID header', async () => {
    const response = await get('/');
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(response.headers['x-request-id']).toMatch(uuidV4Regex);
  });

  test('should generate unique X-Request-ID for each request', async () => {
    const response1 = await get('/');
    const response2 = await get('/');
    expect(response1.headers['x-request-id']).not.toBe(response2.headers['x-request-id']);
  });

  test('should include X-Request-ID header on health endpoints', async () => {
    const response = await get('/health');
    expect(response.headers).toHaveProperty('x-request-id');
  });

  test('should include X-Request-ID header on API endpoints', async () => {
    const response = await get('/api/v1/status');
    expect(response.headers).toHaveProperty('x-request-id');
  });

  test('should include X-Request-ID header on 404 responses', async () => {
    const response = await get('/nonexistent');
    expect(response.headers).toHaveProperty('x-request-id');
  });
});

describe('Security Headers', () => {
  test('should set security headers via helmet', async () => {
    const response = await get('/');
    // helmet sets various security headers
    expect(response.headers).toHaveProperty('x-content-type-options');
  });
});

describe('Compression', () => {
  test('should accept gzip encoding', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept-Encoding', 'gzip');
    // Response should be successful with or without compression
    expect(response.status).toBe(200);
  });
});
