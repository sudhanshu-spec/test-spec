/**
 * Rate Limiting Test Suite
 *
 * Verifies that express-rate-limit middleware correctly limits requests
 * per IP address and returns appropriate HTTP 429 responses with
 * draft-8 compliant RateLimit headers when the threshold is exceeded.
 *
 * @module tests/security/rate-limit.test
 */

'use strict';

const request = require('supertest');
const express = require('express');
const { createSecurityMiddleware } = require('../../src/middleware/security');
const { mainRoutes } = require('../../src/routes');

/**
 * Creates a fresh Express app with a low rate limit for testing.
 * Uses a separate app instance to avoid polluting the shared app state
 * and to allow configurable rate limit thresholds.
 *
 * @param {number} limit - Maximum requests per window
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {express.Application} Configured Express app
 */
function createTestApp(limit, windowMs) {
  const app = express();
  const testConfig = {
    env: 'test',
    rateLimitWindowMs: windowMs || 15 * 60 * 1000,
    rateLimitMax: limit,
    corsOrigins: '*'
  };

  const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = createSecurityMiddleware(testConfig);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(rateLimitMiddleware);
  app.use('/', mainRoutes);

  return app;
}

describe('Rate Limiting (express-rate-limit)', () => {
  /**
   * Verifies that RateLimit response headers are present in responses,
   * using the draft-8 standard header format.
   */
  it('should include RateLimit headers in response', async () => {
    const app = createTestApp(100);
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    // draft-8 headers use lowercase 'ratelimit' in combined header
    const hasRateLimitHeader =
      res.headers['ratelimit'] !== undefined ||
      res.headers['ratelimit-limit'] !== undefined ||
      res.headers['ratelimit-remaining'] !== undefined ||
      res.headers['ratelimit-reset'] !== undefined;

    expect(hasRateLimitHeader).toBe(true);
  });

  /**
   * Verifies that requests within the rate limit are allowed through
   * and receive normal 200 responses.
   */
  it('should allow requests within the rate limit', async () => {
    const app = createTestApp(5);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    }
  });

  /**
   * Verifies that exceeding the rate limit returns HTTP 429 status
   * with an appropriate error message.
   */
  it('should return 429 when rate limit is exceeded', async () => {
    const limit = 3;
    const app = createTestApp(limit);

    // Send requests up to the limit
    for (let i = 0; i < limit; i++) {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    }

    // The next request should be rate limited
    const res = await request(app).get('/');
    expect(res.status).toBe(429);
  });

  /**
   * Verifies the rate limit exceeded response body contains the
   * expected error details including status, error type, and message.
   */
  it('should return JSON error body when rate limited', async () => {
    const limit = 2;
    const app = createTestApp(limit);

    // Exhaust the limit
    for (let i = 0; i < limit; i++) {
      await request(app).get('/');
    }

    // Verify error response body
    const res = await request(app).get('/');
    expect(res.status).toBe(429);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
    expect(res.body.message).toBeDefined();
  });

  /**
   * Verifies that the Retry-After header is present when rate limit
   * is exceeded, indicating when the client can retry.
   */
  it('should include Retry-After header when rate limited', async () => {
    const limit = 2;
    const app = createTestApp(limit);

    // Exhaust the limit
    for (let i = 0; i < limit; i++) {
      await request(app).get('/');
    }

    // Check Retry-After header
    const res = await request(app).get('/');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  /**
   * Verifies that rate limiting applies independently to different routes.
   * Both / and /evening should share the same rate limiter since it is
   * applied globally before route mounting.
   */
  it('should apply rate limiting across all routes', async () => {
    const limit = 3;
    const app = createTestApp(limit);

    // Mix requests to different endpoints
    await request(app).get('/');
    await request(app).get('/evening');
    await request(app).get('/');

    // The fourth request should be rate limited regardless of route
    const res = await request(app).get('/evening');
    expect(res.status).toBe(429);
  });
});
