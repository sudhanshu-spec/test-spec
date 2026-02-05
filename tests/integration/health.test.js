/**
 * @fileoverview Health endpoint integration tests using Supertest
 * @module tests/integration/health
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request to the health endpoint and returns the response.
 * @param {string} [path='/health'] - Request path (defaults to /health)
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function getHealth(path = '/health') {
  return request(app).get(path);
}

/**
 * Asserts standard successful JSON response from health endpoint.
 * @param {SupertestResponse} response - Supertest response object
 */
function assertSuccessfulHealthResponse(response) {
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(response.body.status).toBe('ok');
  expect(response.body.timestamp).toBeDefined();
  expect(response.body.uptime).toBeDefined();
}

describe('Health Endpoint', () => {
  describe('GET /health', () => {
    test('should return 200 status code', async () => {
      const response = await getHealth();
      expect(response.status).toBe(200);
    });

    test('should return JSON content type', async () => {
      const response = await getHealth();
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should return status field with value "ok"', async () => {
      const response = await getHealth();
      expect(response.body.status).toBe('ok');
    });

    test('should return timestamp field in ISO format', async () => {
      const response = await getHealth();
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
      // Validate ISO date format by parsing and re-serializing
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    test('should return uptime field as number', async () => {
      const response = await getHealth();
      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should return complete health response with all required fields', async () => {
      const response = await getHealth();
      assertSuccessfulHealthResponse(response);
    });

    test('should return exactly 3 fields in response body', async () => {
      const response = await getHealth();
      expect(Object.keys(response.body)).toHaveLength(3);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Edge Cases', () => {
    test('should return 200 with unchanged body when query parameters are present', async () => {
      const response = await getHealth('/health?verbose=true').expect(200);
      expect(response.body.status).toBe('ok');
    });

    test('should handle multiple query parameters on health endpoint', async () => {
      const response = await getHealth('/health?foo=bar&baz=qux').expect(200);
      expect(response.body.status).toBe('ok');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should include security headers from Helmet middleware', async () => {
      const response = await getHealth();
      // Helmet sets X-Content-Type-Options header
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should have X-Frame-Options header from Helmet', async () => {
      const response = await getHealth();
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for POST /health (unsupported method)', async () => {
      const response = await request(app).post('/health').expect(404);
      expect(response.status).toBe(404);
    });

    test('should return 404 for PUT /health (unsupported method)', async () => {
      const response = await request(app).put('/health').expect(404);
      expect(response.status).toBe(404);
    });

    test('should return 404 for DELETE /health (unsupported method)', async () => {
      const response = await request(app).delete('/health').expect(404);
      expect(response.status).toBe(404);
    });

    test('should return 404 for /health/nonexistent subpath', async () => {
      const response = await getHealth('/health/nonexistent').expect(404);
      expect(response.status).toBe(404);
    });
  });
});

describe('Health Routes Module', () => {
  test('should export an Express Router', () => {
    const healthRoutes = require('../../src/routes/health.routes');
    expect(healthRoutes).toBeDefined();
    expect(typeof healthRoutes).toBe('function');
    // Express routers have a handle method
    expect(typeof healthRoutes.handle).toBe('function');
  });

  test('should have a GET route registered', () => {
    const healthRoutes = require('../../src/routes/health.routes');
    const stack = healthRoutes.stack;
    expect(stack.length).toBeGreaterThan(0);

    // Find GET / route in the router stack
    const getRoute = stack.find(layer =>
      layer.route &&
      layer.route.path === '/' &&
      layer.route.methods.get
    );
    expect(getRoute).toBeDefined();
  });
});
