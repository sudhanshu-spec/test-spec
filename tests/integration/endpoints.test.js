/**
 * @fileoverview HTTP endpoint integration tests and security header verification using Supertest.
 * Validates HTTP endpoint behavior, security response headers (Helmet), rate limit headers
 * (express-rate-limit), and CORS headers (cors middleware).
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

describe('Security Headers', () => {
  test('should include content-security-policy header on GET /', async () => {
    const response = await get('/');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  test('should include strict-transport-security header on GET /', async () => {
    const response = await get('/');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  test('should include x-content-type-options header with value nosniff', async () => {
    const response = await get('/');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should include x-frame-options header on GET /', async () => {
    const response = await get('/');
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  test('should NOT include x-powered-by header (removed by Helmet)', async () => {
    const response = await get('/');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('should include security headers on GET /evening', async () => {
    const response = await get('/evening');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Rate Limit Headers', () => {
  test('should include ratelimit-limit header on responses', async () => {
    const response = await get('/');
    expect(response.headers['ratelimit-limit']).toBeDefined();
  });

  test('should include ratelimit-remaining header on responses', async () => {
    const response = await get('/');
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  test('should include ratelimit-reset header on responses', async () => {
    const response = await get('/');
    expect(response.headers['ratelimit-reset']).toBeDefined();
  });
});

describe('CORS Headers', () => {
  test('should include access-control-allow-origin header when Origin is set', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  test('should return CORS headers on OPTIONS preflight request', async () => {
    const response = await request(app)
      .options('/')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });
});
