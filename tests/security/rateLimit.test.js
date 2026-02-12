/**
 * @fileoverview Rate limiting behavior tests.
 * Verifies that express-rate-limit middleware correctly throttles
 * requests per IP and returns appropriate 429 responses and headers.
 * @module tests/security/rateLimit
 */

'use strict';

const request = require('supertest');

/**
 * Creates a fresh Express app instance with a low rate limit for testing.
 * Resets module cache so the rate limiter's in-memory store is cleared.
 * @param {number} [maxRequests=5] - Maximum number of requests allowed in window
 * @param {number} [windowMs=60000] - Rate limit window duration in milliseconds
 * @returns {import('express').Application} Fresh Express app
 */
function createTestApp(maxRequests = 5, windowMs = 60000) {
  jest.resetModules();

  // Override config to set a low rate limit for testing purposes
  process.env.RATE_LIMIT_MAX = String(maxRequests);
  process.env.RATE_LIMIT_WINDOW_MS = String(windowMs);

  return require('../../src/app');
}

describe('Rate Limiting', () => {
  /** @type {import('express').Application} */
  let app;

  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    jest.resetModules();
  });

  describe('Rate Limit Headers', () => {
    beforeEach(() => {
      app = createTestApp(10);
    });

    test('should include RateLimit-Policy header on responses', async () => {
      const response = await request(app).get('/');
      expect(response.headers['ratelimit-policy']).toBeDefined();
    });

    test('should include RateLimit header on responses', async () => {
      const response = await request(app).get('/');
      expect(response.headers['ratelimit']).toBeDefined();
    });

    test('should include rate limit headers on /evening endpoint', async () => {
      const response = await request(app).get('/evening');
      expect(response.headers['ratelimit-policy']).toBeDefined();
      expect(response.headers['ratelimit']).toBeDefined();
    });
  });

  describe('Rate Limit Enforcement', () => {
    test('should return 429 status after exceeding the rate limit', async () => {
      // Create app with very low limit for testing
      app = createTestApp(3);

      // Send requests up to and beyond the limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
      }

      // The next request should be rate limited
      const limitedResponse = await request(app).get('/');
      expect(limitedResponse.status).toBe(429);
    });

    test('should return rate limit exceeded message in 429 response body', async () => {
      app = createTestApp(2);

      // Exhaust the limit
      await request(app).get('/');
      await request(app).get('/');

      // Verify 429 response body contains a meaningful message
      const limitedResponse = await request(app).get('/');
      expect(limitedResponse.status).toBe(429);
      expect(limitedResponse.text).toBeDefined();
      expect(limitedResponse.text.length).toBeGreaterThan(0);
    });

    test('should rate limit across different endpoints from the same IP', async () => {
      app = createTestApp(3);

      // Use different endpoints but from the same test agent
      await request(app).get('/');
      await request(app).get('/evening');
      await request(app).get('/');

      // The 4th request should be rate limited regardless of endpoint
      const limitedResponse = await request(app).get('/evening');
      expect(limitedResponse.status).toBe(429);
    });

    test('should still include security headers on 429 rate limited responses', async () => {
      app = createTestApp(1);

      // Exhaust the limit
      await request(app).get('/');

      // Verify 429 response still has security headers from Helmet
      const limitedResponse = await request(app).get('/');
      expect(limitedResponse.status).toBe(429);
      expect(limitedResponse.headers['x-content-type-options']).toBe('nosniff');
      expect(limitedResponse.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Rate Limit Configuration', () => {
    test('should respect custom RATE_LIMIT_MAX configuration', async () => {
      app = createTestApp(2);

      const firstResponse = await request(app).get('/');
      expect(firstResponse.status).toBe(200);

      const secondResponse = await request(app).get('/');
      expect(secondResponse.status).toBe(200);

      // Third request should be blocked with limit of 2
      const thirdResponse = await request(app).get('/');
      expect(thirdResponse.status).toBe(429);
    });

    test('should allow requests within the configured limit', async () => {
      app = createTestApp(10);

      // All 5 requests should succeed when limit is 10
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
      }
    });
  });
});
