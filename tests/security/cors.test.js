/**
 * @fileoverview CORS policy enforcement tests.
 * Verifies that the cors middleware correctly handles cross-origin
 * requests, preflight OPTIONS requests, and origin whitelisting.
 * @module tests/security/cors
 */

'use strict';

const request = require('supertest');

/**
 * Creates a fresh Express app instance with a specific CORS origin.
 * Resets module cache so configuration is re-evaluated.
 * @param {string} [origin='http://localhost:3000'] - Allowed CORS origin
 * @returns {import('express').Application} Fresh Express app
 */
function createTestApp(origin = 'http://localhost:3000') {
  jest.resetModules();
  process.env.CORS_ORIGIN = origin;
  // Set high rate limit to avoid interference in CORS tests
  process.env.RATE_LIMIT_MAX = '1000';
  return require('../../src/app');
}

describe('CORS Policy', () => {
  /** @type {import('express').Application} */
  let app;

  afterEach(() => {
    delete process.env.CORS_ORIGIN;
    delete process.env.RATE_LIMIT_MAX;
    jest.resetModules();
  });

  describe('Access-Control-Allow-Origin Header', () => {
    test('should include Access-Control-Allow-Origin header when Origin is sent', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should set Access-Control-Allow-Origin to the configured origin', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    test('should work correctly when no Origin header is sent', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app).get('/');

      // Without an Origin header, the response should still succeed
      expect(response.status).toBe(200);
    });
  });

  describe('Preflight OPTIONS Requests', () => {
    test('should respond to OPTIONS preflight request with CORS headers', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      // OPTIONS preflight should return a 2xx status
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should include Access-Control-Allow-Methods on preflight', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should handle preflight on /evening endpoint', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .options('/evening')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });
  });

  describe('CORS with Different Origins', () => {
    test('should use configured CORS_ORIGIN value', async () => {
      app = createTestApp('https://example.com');
      const response = await request(app)
        .get('/')
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    test('should handle wildcard origin configuration', async () => {
      app = createTestApp('*');
      const response = await request(app)
        .get('/')
        .set('Origin', 'https://any-domain.com');

      // Wildcard origin should allow all
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('CORS on Different Endpoints', () => {
    test('should include CORS headers on GET /', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.status).toBe(200);
    });

    test('should include CORS headers on GET /evening', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .get('/evening')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.status).toBe(200);
    });

    test('should include CORS headers even on 404 responses', async () => {
      app = createTestApp('http://localhost:3000');
      const response = await request(app)
        .get('/nonexistent')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(404);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
