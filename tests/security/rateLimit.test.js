/**
 * @fileoverview Rate limiting security test suite.
 *
 * Verifies that the express-rate-limit middleware correctly enforces
 * request throttling per IP address and returns appropriate HTTP 429
 * responses with IETF standard RateLimit headers.
 *
 * The rate limiter under test (src/middleware/rateLimiter.js) is configured with
 * standardHeaders: 'draft-8', which produces a combined RateLimit header
 * containing limit, remaining, and reset fields, plus a RateLimit-Policy
 * header. Legacy X-RateLimit-* headers are disabled.
 *
 * Tests cover:
 * - Presence and correctness of combined RateLimit and RateLimit-Policy headers
 * - HTTP 429 Too Many Requests enforcement when configured threshold is exceeded
 * - Retry-After header presence and validity on rate-limited responses
 * - Descriptive JSON error body structure on rate-limited responses
 * - Consistent rate limiting behavior across all endpoints (GET / and GET /evening)
 *
 * @module tests/security/rateLimit
 * @see {@link module:src/middleware/rateLimiter} Rate limiter middleware under test
 * @see {@link module:src/config} Configuration providing rateLimitMax and rateLimitWindowMs
 */

'use strict';

const request = require('supertest');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Rate limit maximum used for header verification tests.
 * Kept higher than enforcement tests to avoid accidental 429 responses
 * during header inspection across multiple test cases.
 * @constant {number}
 */
const HEADER_TEST_MAX = 50;

/**
 * Low rate limit maximum used for enforcement tests.
 * Allows triggering HTTP 429 responses with a minimal number of requests,
 * keeping test execution fast and deterministic.
 * @constant {number}
 */
const ENFORCEMENT_TEST_MAX = 5;

/**
 * Rate limit window duration in milliseconds used for all tests.
 * Set to 60 seconds for predictable and deterministic test behavior.
 * @constant {number}
 */
const TEST_WINDOW_MS = 60000;

/**
 * Module-level Express application instance used by the current test.
 * Reassigned before each test or test group via {@link createTestApp}.
 * @type {import('express').Application}
 */
let app;

/**
 * Creates a fresh Express application instance with the specified rate limit
 * configuration. Calls jest.resetModules() to clear the Node.js module cache,
 * ensuring each invocation yields an app with a pristine rate limiter
 * in-memory store and zero request history.
 *
 * @param {number} [maxRequests=ENFORCEMENT_TEST_MAX] - Maximum requests allowed per window
 * @param {number} [windowMs=TEST_WINDOW_MS] - Rate limit window duration in milliseconds
 * @returns {import('express').Application} A fresh Express application instance
 */
function createTestApp(maxRequests = ENFORCEMENT_TEST_MAX, windowMs = TEST_WINDOW_MS) {
  jest.resetModules();
  process.env.RATE_LIMIT_MAX = String(maxRequests);
  process.env.RATE_LIMIT_WINDOW_MS = String(windowMs);
  return require('../../src/app');
}

/**
 * Sends a GET request to the specified path on the current app instance.
 * Follows the same helper pattern established in tests/integration/endpoints.test.js.
 *
 * @param {string} path - The URL path to send the GET request to
 * @returns {Promise<SupertestResponse>} Supertest response promise
 */
function get(path) {
  return request(app).get(path);
}

describe('Rate Limiting', () => {
  /**
   * Clean up environment variables and module cache after every test
   * to ensure complete isolation between tests. Each test creates its
   * own fresh app instance via createTestApp().
   */
  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    jest.resetModules();
  });

  // ---------------------------------------------------------------------------
  // RateLimit Headers — draft-8 combined format verification
  // ---------------------------------------------------------------------------
  describe('RateLimit Headers', () => {
    beforeEach(() => {
      app = createTestApp(HEADER_TEST_MAX);
    });

    test('response should include RateLimit-Limit header indicating the configured max requests', async () => {
      /** @type {SupertestResponse} */
      const response = await get('/');
      expect(response.status).toBe(200);

      // draft-8 encodes the quota (limit) in the RateLimit-Policy header as q=<max>
      const policyHeader = response.headers['ratelimit-policy'];
      expect(policyHeader).toBeDefined();

      // Extract the quota (limit) value from the policy header
      const quotaMatch = policyHeader.match(/q=(\d+)/);
      expect(quotaMatch).not.toBeNull();
      expect(parseInt(quotaMatch[1], 10)).toBe(HEADER_TEST_MAX);
    });

    test('response should include RateLimit-Remaining header showing remaining requests', async () => {
      /** @type {SupertestResponse} */
      const response = await get('/');
      expect(response.status).toBe(200);

      // draft-8 encodes remaining requests in the combined RateLimit header as r=<remaining>
      const ratelimitHeader = response.headers['ratelimit'];
      expect(ratelimitHeader).toBeDefined();

      // Extract the remaining value from the combined header
      const remainingMatch = ratelimitHeader.match(/r=(\d+)/);
      expect(remainingMatch).not.toBeNull();

      const remaining = parseInt(remainingMatch[1], 10);
      // After one request in a fresh window, remaining should be max - 1
      expect(remaining).toBe(HEADER_TEST_MAX - 1);
    });

    test('response should include RateLimit-Reset header showing window reset time', async () => {
      /** @type {SupertestResponse} */
      const response = await get('/');
      expect(response.status).toBe(200);

      // draft-8 encodes the reset time in the combined RateLimit header as t=<seconds>
      const ratelimitHeader = response.headers['ratelimit'];
      expect(ratelimitHeader).toBeDefined();

      // Extract the reset time (seconds until window resets) from the combined header
      const resetMatch = ratelimitHeader.match(/t=(\d+)/);
      expect(resetMatch).not.toBeNull();

      const resetSeconds = parseInt(resetMatch[1], 10);
      // Reset should be a positive number of seconds within the window duration
      expect(resetSeconds).toBeGreaterThan(0);
      expect(resetSeconds).toBeLessThanOrEqual(Math.ceil(TEST_WINDOW_MS / 1000));
    });

    test('response should include RateLimit-Policy header with window configuration', async () => {
      /** @type {SupertestResponse} */
      const response = await get('/');
      expect(response.status).toBe(200);

      // draft-8 RateLimit-Policy contains quota (q=), window (w=), and partition key (pk=)
      const policyHeader = response.headers['ratelimit-policy'];
      expect(policyHeader).toBeDefined();
      // Verify the policy contains quota and window parameters
      expect(policyHeader).toMatch(/q=\d+/);
      expect(policyHeader).toMatch(/w=\d+/);
    });
  });

  // ---------------------------------------------------------------------------
  // Rate Limit Enforcement — HTTP 429, Retry-After, and response body
  // ---------------------------------------------------------------------------
  describe('Rate Limit Enforcement', () => {
    test('should return HTTP 429 when rate limit threshold is exceeded', async () => {
      app = createTestApp(ENFORCEMENT_TEST_MAX);

      // Send requests up to the configured maximum — all should succeed
      for (let i = 0; i < ENFORCEMENT_TEST_MAX; i++) {
        const response = await get('/');
        expect(response.status).toBe(200);
      }

      // The next request exceeds the threshold and must return 429
      /** @type {SupertestResponse} */
      const limitedResponse = await get('/');
      expect(limitedResponse.status).toBe(429);
    }, 15000);

    test('should include Retry-After header in 429 response', async () => {
      app = createTestApp(ENFORCEMENT_TEST_MAX);

      // Exhaust the rate limit budget with allowed requests
      for (let i = 0; i < ENFORCEMENT_TEST_MAX; i++) {
        await get('/');
      }

      // Verify the 429 response includes a valid Retry-After header
      /** @type {SupertestResponse} */
      const limitedResponse = await get('/');
      expect(limitedResponse.status).toBe(429);
      expect(limitedResponse.headers['retry-after']).toBeDefined();

      // Retry-After value must be a positive integer within the window duration
      const retryAfterSeconds = parseInt(limitedResponse.headers['retry-after'], 10);
      expect(retryAfterSeconds).toBeGreaterThan(0);
      expect(retryAfterSeconds).toBeLessThanOrEqual(Math.ceil(TEST_WINDOW_MS / 1000));
    }, 15000);

    test('should include a descriptive message body in 429 response', async () => {
      app = createTestApp(ENFORCEMENT_TEST_MAX);

      // Exhaust the rate limit budget with allowed requests
      for (let i = 0; i < ENFORCEMENT_TEST_MAX; i++) {
        await get('/');
      }

      // Verify the 429 response body contains structured error information
      // matching the message object configured in src/middleware/rateLimiter.js
      /** @type {SupertestResponse} */
      const limitedResponse = await get('/');
      expect(limitedResponse.status).toBe(429);

      expect(limitedResponse.body).toBeDefined();
      expect(limitedResponse.body.status).toBe(429);
      expect(limitedResponse.body.error).toBe('Too Many Requests');
      expect(typeof limitedResponse.body.message).toBe('string');
      expect(limitedResponse.body.message.length).toBeGreaterThan(0);
    }, 15000);

    test('should enforce rate limit across different endpoints from the same IP', async () => {
      app = createTestApp(3);

      // Distribute requests across different endpoints from the same client
      const response1 = await get('/');
      expect(response1.status).toBe(200);

      const response2 = await get('/evening');
      expect(response2.status).toBe(200);

      const response3 = await get('/');
      expect(response3.status).toBe(200);

      // The 4th request must be rate-limited regardless of which endpoint is hit
      /** @type {SupertestResponse} */
      const limitedResponse = await get('/evening');
      expect(limitedResponse.status).toBe(429);
    }, 15000);

    test('should still include security headers on 429 rate limited responses', async () => {
      app = createTestApp(1);

      // Exhaust the limit with the single allowed request
      await get('/');

      // Verify the 429 response retains Helmet security headers
      /** @type {SupertestResponse} */
      const limitedResponse = await get('/');
      expect(limitedResponse.status).toBe(429);
      // Helmet sets x-content-type-options: nosniff on all responses
      expect(limitedResponse.headers['x-content-type-options']).toBe('nosniff');
      // Helmet removes the X-Powered-By header
      expect(limitedResponse.headers['x-powered-by']).toBeUndefined();
    }, 15000);
  });

  // ---------------------------------------------------------------------------
  // Rate Limit Per-Endpoint — verify headers on each route
  // ---------------------------------------------------------------------------
  describe('Rate Limit Per-Endpoint', () => {
    beforeEach(() => {
      app = createTestApp(HEADER_TEST_MAX);
    });

    test('rate limit headers present on GET / responses', async () => {
      /** @type {SupertestResponse} */
      const response = await get('/');
      expect(response.status).toBe(200);

      // Verify the combined RateLimit header contains remaining (r=) and reset (t=) fields
      const ratelimitHeader = response.headers['ratelimit'];
      expect(ratelimitHeader).toBeDefined();
      expect(ratelimitHeader).toMatch(/r=\d+/);
      expect(ratelimitHeader).toMatch(/t=\d+/);

      // Verify RateLimit-Policy header contains quota (q=) and window (w=) fields
      const policyHeader = response.headers['ratelimit-policy'];
      expect(policyHeader).toBeDefined();
      expect(policyHeader).toMatch(/q=\d+/);
      expect(policyHeader).toMatch(/w=\d+/);
    });

    test('rate limit headers present on GET /evening responses', async () => {
      /** @type {SupertestResponse} */
      const response = await get('/evening');
      expect(response.status).toBe(200);

      // Verify the combined RateLimit header contains remaining (r=) and reset (t=) fields
      const ratelimitHeader = response.headers['ratelimit'];
      expect(ratelimitHeader).toBeDefined();
      expect(ratelimitHeader).toMatch(/r=\d+/);
      expect(ratelimitHeader).toMatch(/t=\d+/);

      // Verify RateLimit-Policy header contains quota (q=) and window (w=) fields
      const policyHeader = response.headers['ratelimit-policy'];
      expect(policyHeader).toBeDefined();
      expect(policyHeader).toMatch(/q=\d+/);
      expect(policyHeader).toMatch(/w=\d+/);
    });
  });

  // ---------------------------------------------------------------------------
  // Rate Limit Configuration — verify environment variable overrides
  // ---------------------------------------------------------------------------
  describe('Rate Limit Configuration', () => {
    test('should respect custom RATE_LIMIT_MAX configuration', async () => {
      app = createTestApp(2);

      const firstResponse = await get('/');
      expect(firstResponse.status).toBe(200);

      const secondResponse = await get('/');
      expect(secondResponse.status).toBe(200);

      // Third request must be blocked with a configured limit of 2
      /** @type {SupertestResponse} */
      const thirdResponse = await get('/');
      expect(thirdResponse.status).toBe(429);
    });

    test('should allow requests within the configured limit', async () => {
      app = createTestApp(10);

      // All 5 requests should succeed when the configured limit is 10
      for (let i = 0; i < 5; i++) {
        const response = await get('/');
        expect(response.status).toBe(200);
      }
    });

    test('RateLimit header limit value should match configured maximum', async () => {
      const customMax = 25;
      app = createTestApp(customMax);

      /** @type {SupertestResponse} */
      const response = await get('/');
      expect(response.status).toBe(200);

      // Verify the RateLimit-Policy header quota reflects the custom limit
      const policyHeader = response.headers['ratelimit-policy'];
      expect(policyHeader).toBeDefined();

      const quotaMatch = policyHeader.match(/q=(\d+)/);
      expect(quotaMatch).not.toBeNull();
      expect(parseInt(quotaMatch[1], 10)).toBe(customMax);
    });
  });
});
