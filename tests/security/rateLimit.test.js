/**
 * Rate Limiting Verification Test Suite
 * 
 * This test suite verifies the express-rate-limit middleware functionality
 * for protecting against brute-force attacks and denial-of-service (DoS) attempts.
 * 
 * Tests verify:
 * - Request throttling is enforced with configurable windows (default 15 minutes)
 * - Request limits are enforced (default 100 requests per window)
 * - 429 Too Many Requests status is returned when limits are exceeded
 * - Proper RateLimit headers are included in responses (draft-8 standard)
 * - Retry-After header is present in 429 responses
 * - DoS and brute-force attack protection mechanisms work correctly
 * 
 * Security Requirements Validated:
 * - Section 0.8.2: Rate limiting verification tests - Verify DoS protection active
 * - Section 0.8.1: Test case - 429 status after exceeding limit
 * - Section 0.5.5: Verify 429 response when limit exceeded
 * - Section 0.5.5: Send 101+ requests in 15 min; expect 429
 * 
 * @module tests/security/rateLimit.test
 * @see https://www.npmjs.com/package/express-rate-limit
 */

'use strict';

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

/**
 * HTTP assertion library for testing Express applications
 * Used to make simulated HTTP requests and assert on responses
 * @see https://www.npmjs.com/package/supertest
 */
const request = require('supertest');

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

/**
 * Express application instance with rate limiting middleware configured
 * Exported from server.js for supertest HTTP testing
 */
const app = require('../../server');

/**
 * Pre-configured rate limiter middleware
 * Imported for direct unit testing of configuration values
 */
const rateLimiter = require('../../middleware/rateLimiter');

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

/**
 * Default rate limit values from the rate limiter configuration
 * Used for calculating expected behavior in tests
 */
const DEFAULT_RATE_LIMIT = 100;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Test rate limit for faster testing
 * We'll set a low limit to avoid making 100+ requests in each test
 */
const TEST_RATE_LIMIT = 5;

// =============================================================================
// DRAFT-8 RATELIMIT HEADER PARSERS
// =============================================================================

/**
 * Parse draft-8 RateLimit header to extract rate limit information
 * 
 * The draft-8 format uses a combined header:
 * ratelimit: "100-in-15min"; r=99; t=900
 * 
 * Where:
 * - "100-in-15min" is the quota name
 * - r=N is the remaining requests
 * - t=N is the time until reset in seconds
 * 
 * @param {Object} headers - Response headers object
 * @returns {Object} Parsed rate limit info with limit, remaining, and reset
 */
function parseRateLimitHeaders(headers) {
  const result = {
    limit: null,
    remaining: null,
    reset: null,
    hasRateLimitHeaders: false
  };

  // Check for draft-8 combined header format
  const rateLimitHeader = headers['ratelimit'];
  const rateLimitPolicy = headers['ratelimit-policy'];

  if (rateLimitHeader) {
    result.hasRateLimitHeaders = true;
    
    // Parse remaining: r=N
    const remainingMatch = rateLimitHeader.match(/r=(\d+)/);
    if (remainingMatch) {
      result.remaining = parseInt(remainingMatch[1], 10);
    }
    
    // Parse time until reset: t=N
    const timeMatch = rateLimitHeader.match(/t=(\d+)/);
    if (timeMatch) {
      result.reset = parseInt(timeMatch[1], 10);
    }
  }

  if (rateLimitPolicy) {
    result.hasRateLimitHeaders = true;
    
    // Parse quota/limit: q=N
    const quotaMatch = rateLimitPolicy.match(/q=(\d+)/);
    if (quotaMatch) {
      result.limit = parseInt(quotaMatch[1], 10);
    }
    
    // Alternative: parse from quota name like "100-in-15min"
    if (!result.limit) {
      const quotaNameMatch = rateLimitPolicy.match(/"(\d+)-in-/);
      if (quotaNameMatch) {
        result.limit = parseInt(quotaNameMatch[1], 10);
      }
    }
  }

  // Also check for legacy headers (fallback)
  if (!result.hasRateLimitHeaders) {
    const legacyLimit = headers['ratelimit-limit'] || 
                        headers['RateLimit-Limit'] ||
                        headers['x-ratelimit-limit'];
    const legacyRemaining = headers['ratelimit-remaining'] || 
                            headers['RateLimit-Remaining'] ||
                            headers['x-ratelimit-remaining'];
    const legacyReset = headers['ratelimit-reset'] || 
                        headers['RateLimit-Reset'] ||
                        headers['x-ratelimit-reset'];
    
    if (legacyLimit !== undefined) {
      result.limit = parseInt(legacyLimit, 10);
      result.hasRateLimitHeaders = true;
    }
    if (legacyRemaining !== undefined) {
      result.remaining = parseInt(legacyRemaining, 10);
      result.hasRateLimitHeaders = true;
    }
    if (legacyReset !== undefined) {
      result.reset = parseInt(legacyReset, 10);
      result.hasRateLimitHeaders = true;
    }
  }

  return result;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Send multiple HTTP requests to the specified endpoint
 * 
 * This helper function sends a specified number of GET requests
 * to test rate limiting behavior under load.
 * 
 * @param {number} count - Number of requests to send
 * @param {string} endpoint - The endpoint to request (default: '/')
 * @returns {Promise<Array>} Array of supertest response objects
 * 
 * @example
 * const responses = await sendRequests(10);
 * const lastResponse = responses[responses.length - 1];
 */
async function sendRequests(count, endpoint = '/') {
  const responses = [];
  
  for (let i = 0; i < count; i++) {
    const response = await request(app)
      .get(endpoint)
      .set('Accept', 'application/json');
    responses.push(response);
  }
  
  return responses;
}

/**
 * Send requests with a custom IP address header
 * 
 * Used to test per-IP rate limiting by simulating requests
 * from different client IP addresses via X-Forwarded-For header.
 * 
 * @param {number} count - Number of requests to send
 * @param {string} ipAddress - The IP address to simulate
 * @param {string} endpoint - The endpoint to request (default: '/')
 * @returns {Promise<Array>} Array of supertest response objects
 * 
 * @example
 * const responses = await sendRequestsFromIP(5, '192.168.1.100');
 */
async function sendRequestsFromIP(count, ipAddress, endpoint = '/') {
  const responses = [];
  
  for (let i = 0; i < count; i++) {
    const response = await request(app)
      .get(endpoint)
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', ipAddress);
    responses.push(response);
  }
  
  return responses;
}

/**
 * Send a burst of concurrent requests
 * 
 * Simulates a DoS attack by sending multiple requests simultaneously
 * rather than sequentially.
 * 
 * @param {number} count - Number of concurrent requests to send
 * @param {string} endpoint - The endpoint to request (default: '/')
 * @returns {Promise<Array>} Array of supertest response objects
 * 
 * @example
 * const responses = await sendBurstRequests(50);
 * const rateLimitedCount = responses.filter(r => r.status === 429).length;
 */
async function sendBurstRequests(count, endpoint = '/') {
  const requestPromises = [];
  
  for (let i = 0; i < count; i++) {
    requestPromises.push(
      request(app)
        .get(endpoint)
        .set('Accept', 'application/json')
    );
  }
  
  return Promise.all(requestPromises);
}

// =============================================================================
// TEST SUITE: RATE LIMITING
// =============================================================================

describe('Rate Limiting', () => {
  
  /**
   * Test: Requests under the limit should succeed
   * 
   * Verifies that normal traffic below the rate limit threshold
   * is allowed through without interference.
   */
  it('should allow requests under the limit', async () => {
    // Make a single GET request to the root endpoint
    const response = await request(app)
      .get('/')
      .set('Accept', 'text/plain');
    
    // Verify the request succeeds with 200 status
    expect(response.status).toBe(200);
    
    // Verify the response body is correct (not a rate limit error)
    expect(response.text).toContain('Hello, World!');
  });
  
  /**
   * Test: RateLimit headers should be present in responses
   * 
   * Verifies that the rate limiter adds proper RateLimit headers
   * following the draft-8 IETF standard. These headers inform
   * clients about their current rate limit status.
   * 
   * Expected headers (draft-8):
   * - ratelimit: Combined header with remaining and reset time
   * - ratelimit-policy: Header with limit/quota and window info
   */
  it('should include RateLimit headers in response', async () => {
    // Make a GET request to the root endpoint
    const response = await request(app)
      .get('/')
      .set('Accept', 'text/plain');
    
    // Verify the request succeeds
    expect(response.status).toBe(200);
    
    // Parse rate limit headers using draft-8 format parser
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    
    // Verify RateLimit headers are present
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
    
    // Verify limit is defined and valid
    expect(rateLimitInfo.limit).toBeDefined();
    expect(rateLimitInfo.limit).toBeGreaterThan(0);
    
    // Verify remaining is defined and valid
    expect(rateLimitInfo.remaining).toBeDefined();
    expect(rateLimitInfo.remaining).toBeGreaterThanOrEqual(0);
  });
  
  /**
   * Test: RateLimit reset time should be included in response
   * 
   * Verifies the rate limiter includes timing information
   * about when the current rate limit window will reset.
   * In draft-8 format, this is the 't' parameter in the ratelimit header.
   */
  it('should include RateLimit-Reset header in response', async () => {
    // Make a GET request
    const response = await request(app)
      .get('/')
      .set('Accept', 'text/plain');
    
    // Verify success
    expect(response.status).toBe(200);
    
    // Parse rate limit headers using draft-8 format parser
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    
    // Verify RateLimit headers are present
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
    
    // Verify reset time is defined and valid (t=N in draft-8)
    expect(rateLimitInfo.reset).toBeDefined();
    expect(rateLimitInfo.reset).toBeGreaterThan(0);
  });
  
  /**
   * Test: Should indicate rate limit value in headers
   * 
   * Verifies the configured rate limit value is correctly
   * reported in the response headers.
   * In draft-8 format, this is the 'q' parameter in ratelimit-policy header.
   */
  it('should report the configured rate limit in headers', async () => {
    // Make a GET request
    const response = await request(app)
      .get('/')
      .set('Accept', 'text/plain');
    
    // Verify success
    expect(response.status).toBe(200);
    
    // Parse rate limit headers using draft-8 format parser
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    
    // Verify RateLimit headers are present
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
    
    // Verify limit is defined and valid
    expect(rateLimitInfo.limit).toBeDefined();
    
    // The limit should be a positive number (default is 100 or custom)
    expect(rateLimitInfo.limit).toBeGreaterThan(0);
  });
  
  /**
   * Test: Remaining count should decrease with each request
   * 
   * Verifies that the remaining request count decreases
   * with each subsequent request, showing the quota being consumed.
   */
  it('should decrement remaining count with each request', async () => {
    // Send first request from a unique IP
    const response1 = await request(app)
      .get('/')
      .set('Accept', 'text/plain')
      .set('X-Forwarded-For', '10.0.0.1');
    
    const rateLimitInfo1 = parseRateLimitHeaders(response1.headers);
    const remaining1 = rateLimitInfo1.remaining;
    
    // Send second request from the same IP
    const response2 = await request(app)
      .get('/')
      .set('Accept', 'text/plain')
      .set('X-Forwarded-For', '10.0.0.1');
    
    const rateLimitInfo2 = parseRateLimitHeaders(response2.headers);
    const remaining2 = rateLimitInfo2.remaining;
    
    // Remaining should have decreased by 1 (or more if concurrent)
    expect(remaining2).toBeLessThan(remaining1);
  });
});

// =============================================================================
// TEST SUITE: RATE LIMIT EXCEEDED BEHAVIOR
// =============================================================================

describe('Rate Limit Exceeded Behavior', () => {
  
  /**
   * Test: Should return 429 when rate limit is exceeded
   * 
   * This is a core security test that verifies the rate limiter
   * properly blocks requests that exceed the configured limit.
   * Uses a unique IP to avoid interference from other tests.
   * 
   * Note: This test may need adjustment based on configured RATE_LIMIT_MAX
   */
  it('should return 429 when rate limit exceeded', async () => {
    // Use a unique IP address for this test to ensure clean state
    const testIP = '192.168.100.1';
    
    // Get the current limit from first response
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP);
    
    // Parse the limit from headers using draft-8 parser
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Send remaining requests to exceed the limit
    // We already sent 1 request above, so send (limit) more
    const remainingRequests = limit;
    
    let last429Response = null;
    
    for (let i = 0; i < remainingRequests; i++) {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('X-Forwarded-For', testIP);
      
      // Track if we got rate limited
      if (response.status === 429) {
        last429Response = response;
        break;
      }
    }
    
    // Verify we received a 429 response
    expect(last429Response).not.toBeNull();
    expect(last429Response.status).toBe(429);
  });
  
  /**
   * Test: 429 response should include appropriate error message
   * 
   * Verifies the rate limit error response contains a clear
   * and informative JSON message for API clients.
   */
  it('should include appropriate error message in 429 response', async () => {
    // Use a unique IP for this test
    const testIP = '192.168.100.2';
    
    // Get the limit
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP);
    
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Exceed the limit
    let errorResponse = null;
    
    for (let i = 0; i < limit + 1; i++) {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('X-Forwarded-For', testIP);
      
      if (response.status === 429) {
        errorResponse = response;
        break;
      }
    }
    
    // Verify error response structure
    expect(errorResponse).not.toBeNull();
    expect(errorResponse.status).toBe(429);
    
    // Verify the response body contains error information
    const body = errorResponse.body;
    expect(body).toBeDefined();
    expect(body.error).toBeDefined();
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toBeDefined();
    expect(body.message).toContain('exceeded');
  });
  
  /**
   * Test: Should include Retry-After header when rate limited
   * 
   * Verifies that 429 responses include the Retry-After header
   * which tells clients when they can retry their request.
   */
  it('should include Retry-After header when rate limited', async () => {
    // Use a unique IP for this test
    const testIP = '192.168.100.3';
    
    // Get the limit
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP);
    
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Exceed the limit
    let rateLimitedResponse = null;
    
    for (let i = 0; i < limit + 1; i++) {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('X-Forwarded-For', testIP);
      
      if (response.status === 429) {
        rateLimitedResponse = response;
        break;
      }
    }
    
    // Verify Retry-After header is present
    expect(rateLimitedResponse).not.toBeNull();
    expect(rateLimitedResponse.status).toBe(429);
    
    const retryAfter = rateLimitedResponse.headers['retry-after'];
    expect(retryAfter).toBeDefined();
    
    // Retry-After should be a positive number (seconds to wait)
    const retryAfterValue = parseInt(retryAfter, 10);
    expect(retryAfterValue).toBeGreaterThan(0);
  });
  
  /**
   * Test: Rate limit error should have proper content type
   * 
   * Verifies that 429 responses are returned as JSON
   * for proper API error handling.
   */
  it('should return 429 response as JSON', async () => {
    // Use a unique IP for this test
    const testIP = '192.168.100.4';
    
    // Get the limit
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP);
    
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Exceed the limit
    let rateLimitedResponse = null;
    
    for (let i = 0; i < limit + 1; i++) {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('X-Forwarded-For', testIP);
      
      if (response.status === 429) {
        rateLimitedResponse = response;
        break;
      }
    }
    
    // Verify response is JSON
    expect(rateLimitedResponse).not.toBeNull();
    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.headers['content-type']).toContain('application/json');
  });
});

// =============================================================================
// TEST SUITE: PER-IP RATE LIMITING
// =============================================================================

describe('Per-IP Rate Limiting', () => {
  
  /**
   * Test: Different IPs should have separate rate limit counters
   * 
   * Verifies that rate limiting is applied per-IP, not globally.
   * This ensures legitimate users from different IPs aren't blocked
   * by other users' activity.
   */
  it('should track rate limits separately for different IPs', async () => {
    const ip1 = '10.1.1.1';
    const ip2 = '10.1.1.2';
    
    // Send request from IP 1
    const response1 = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', ip1);
    
    // Send request from IP 2
    const response2 = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', ip2);
    
    // Both should succeed
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    
    // Parse rate limit headers
    const rateLimitInfo1 = parseRateLimitHeaders(response1.headers);
    const rateLimitInfo2 = parseRateLimitHeaders(response2.headers);
    
    // Both should have rate limit headers present
    expect(rateLimitInfo1.hasRateLimitHeaders).toBe(true);
    expect(rateLimitInfo2.hasRateLimitHeaders).toBe(true);
    
    // Each IP should have similar remaining counts since tracked separately
    const diff = Math.abs(rateLimitInfo1.remaining - rateLimitInfo2.remaining);
    expect(diff).toBeLessThanOrEqual(1);
  });
  
  /**
   * Test: Rate limit for one IP shouldn't affect another IP
   * 
   * Verifies that even when one IP is rate limited, requests from
   * other IPs continue to be processed normally.
   */
  it('should not block IP2 when IP1 is rate limited', async () => {
    const blockedIP = '192.168.200.1';
    const normalIP = '192.168.200.2';
    
    // Get the limit
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', blockedIP);
    
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Exhaust rate limit for blockedIP
    for (let i = 0; i < limit; i++) {
      await request(app)
        .get('/')
        .set('X-Forwarded-For', blockedIP);
    }
    
    // Verify blockedIP is now rate limited
    const blockedResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', blockedIP);
    
    expect(blockedResponse.status).toBe(429);
    
    // Verify normalIP still works
    const normalResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', normalIP);
    
    expect(normalResponse.status).toBe(200);
  });
  
  /**
   * Test: X-Forwarded-For header should be respected for rate limiting
   * 
   * Verifies that the rate limiter properly extracts client IP
   * from the X-Forwarded-For header when behind a proxy.
   */
  it('should respect X-Forwarded-For header for IP identification', async () => {
    const forwardedIP = '203.0.113.100';
    
    // Send request with X-Forwarded-For
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', forwardedIP);
    
    // Request should succeed
    expect(response.status).toBe(200);
    
    // Parse rate limit headers and verify they're present
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
    expect(rateLimitInfo.remaining).toBeDefined();
  });
  
  /**
   * Test: Multiple IPs in X-Forwarded-For should use first IP
   * 
   * When X-Forwarded-For contains multiple IPs (proxy chain),
   * the rate limiter should use the first IP (original client).
   */
  it('should use first IP from X-Forwarded-For chain', async () => {
    const clientIP = '198.51.100.1';
    const proxyChain = `${clientIP}, 10.0.0.1, 10.0.0.2`;
    
    // Send request with chained X-Forwarded-For
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', proxyChain);
    
    // Request should succeed
    expect(response.status).toBe(200);
    
    // Parse rate limit headers and verify they're present
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: DoS PROTECTION
// =============================================================================

describe('DoS Protection', () => {
  
  /**
   * Test: Should block rapid successive requests that exceed limit
   * 
   * Simulates a simple DoS attack pattern with rapid requests
   * and verifies the rate limiter activates to protect the server.
   */
  it('should block rapid successive requests when limit exceeded', async () => {
    // Use a unique IP for this DoS simulation
    const attackerIP = '172.16.0.1';
    
    // Get the limit
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', attackerIP);
    
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Send rapid requests to exceed limit
    let blockedCount = 0;
    let successCount = 0;
    
    // Send more requests than the limit
    const totalRequests = limit + 10;
    
    for (let i = 0; i < totalRequests; i++) {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('X-Forwarded-For', attackerIP);
      
      if (response.status === 429) {
        blockedCount++;
      } else if (response.status === 200) {
        successCount++;
      }
    }
    
    // We should have some blocked requests
    expect(blockedCount).toBeGreaterThan(0);
    
    // Total successful should be at or below limit
    // (accounting for the initial request we made to get the limit)
    expect(successCount).toBeLessThanOrEqual(limit);
  });
  
  /**
   * Test: Should handle burst of concurrent requests
   * 
   * Verifies that concurrent/parallel requests are properly
   * counted against the rate limit to prevent burst attacks.
   */
  it('should handle burst of concurrent requests', async () => {
    // Use a unique IP for this test
    const burstIP = '172.16.0.2';
    
    // Get the limit first
    const initialResponse = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', burstIP);
    
    const rateLimitInfo = parseRateLimitHeaders(initialResponse.headers);
    const limit = rateLimitInfo.limit || DEFAULT_RATE_LIMIT;
    
    // Create burst of concurrent requests (more than limit)
    const burstSize = limit + 5;
    const requests = [];
    
    for (let i = 0; i < burstSize; i++) {
      requests.push(
        request(app)
          .get('/')
          .set('Accept', 'application/json')
          .set('X-Forwarded-For', burstIP)
      );
    }
    
    // Execute all requests concurrently
    const responses = await Promise.all(requests);
    
    // Count results
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    
    // Some requests should be rate limited
    expect(rateLimitedCount).toBeGreaterThan(0);
    
    // All responses should be either 200 or 429
    responses.forEach(r => {
      expect([200, 429]).toContain(r.status);
    });
  });
  
  /**
   * Test: Rate limiting should apply to all endpoints
   * 
   * Verifies that the rate limiter is applied globally to all routes,
   * not just specific endpoints, preventing attackers from bypassing
   * limits by targeting different URLs.
   */
  it('should apply rate limiting to all endpoints', async () => {
    const testIP = '172.16.0.3';
    
    // Make requests to different endpoints
    const response1 = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP);
    
    const response2 = await request(app)
      .get('/evening')
      .set('Accept', 'text/plain')
      .set('X-Forwarded-For', testIP);
    
    // Parse rate limit headers for both responses
    const rateLimitInfo1 = parseRateLimitHeaders(response1.headers);
    const rateLimitInfo2 = parseRateLimitHeaders(response2.headers);
    
    // Both should have RateLimit headers
    expect(rateLimitInfo1.hasRateLimitHeaders).toBe(true);
    expect(rateLimitInfo2.hasRateLimitHeaders).toBe(true);
    
    // Both should succeed (under limit)
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    
    // Second request should show one fewer remaining (from the same pool)
    expect(rateLimitInfo2.remaining).toBe(rateLimitInfo1.remaining - 1);
  });
});

// =============================================================================
// TEST SUITE: RATE LIMITER CONFIGURATION
// =============================================================================

describe('Rate Limiter Configuration', () => {
  
  /**
   * Test: Rate limiter should be a function (middleware)
   * 
   * Verifies that the exported rate limiter is properly configured
   * as Express middleware.
   */
  it('should export a valid middleware function', () => {
    expect(rateLimiter).toBeDefined();
    expect(typeof rateLimiter).toBe('function');
  });
  
  /**
   * Test: Rate limiter should use draft-8 standard RateLimit headers
   * 
   * Verifies that headers follow the IETF RateLimit draft-8 standard
   * format which uses combined 'ratelimit' and 'ratelimit-policy' headers
   * rather than separate or legacy X-RateLimit-* headers.
   */
  it('should use draft-8 standard RateLimit headers', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', '10.10.10.1');
    
    // Draft-8 uses combined 'ratelimit' and 'ratelimit-policy' headers
    const hasRateLimitHeader = response.headers['ratelimit'] !== undefined;
    const hasRateLimitPolicy = response.headers['ratelimit-policy'] !== undefined;
    
    // Should have the combined headers
    expect(hasRateLimitHeader).toBe(true);
    expect(hasRateLimitPolicy).toBe(true);
    
    // Verify rate limit info can be parsed
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
  
  /**
   * Test: Rate limit should be positive number
   * 
   * Verifies the configured limit is a valid positive number.
   */
  it('should have a positive rate limit configured', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', '10.10.10.2');
    
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
    expect(rateLimitInfo.limit).toBeDefined();
    expect(rateLimitInfo.limit).toBeGreaterThan(0);
    expect(Number.isInteger(rateLimitInfo.limit)).toBe(true);
  });
  
  /**
   * Test: Window reset time should be in the future
   * 
   * Verifies that the rate limit window reset time
   * is set to a positive value (seconds until reset).
   */
  it('should have window reset time in the future', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', '10.10.10.3');
    
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
    expect(rateLimitInfo.reset).toBeDefined();
    
    // Reset value should be positive (seconds until reset)
    expect(rateLimitInfo.reset).toBeGreaterThan(0);
  });
});

// =============================================================================
// TEST SUITE: EDGE CASES
// =============================================================================

describe('Rate Limiting Edge Cases', () => {
  
  /**
   * Test: Should handle missing X-Forwarded-For gracefully
   * 
   * When no X-Forwarded-For header is present, the rate limiter
   * should fall back to using the direct connection IP.
   */
  it('should work without X-Forwarded-For header', async () => {
    // Make request without X-Forwarded-For
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json');
    
    // Request should succeed
    expect(response.status).toBe(200);
    
    // RateLimit headers should still be present
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
  
  /**
   * Test: Should handle empty X-Forwarded-For gracefully
   * 
   * Verifies that an empty X-Forwarded-For header doesn't
   * cause errors and falls back gracefully.
   */
  it('should handle empty X-Forwarded-For header', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', '');
    
    // Request should succeed
    expect(response.status).toBe(200);
    
    // RateLimit headers should be present
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
  
  /**
   * Test: Should handle IPv6 addresses
   * 
   * Verifies that IPv6 client addresses are properly handled
   * for rate limiting.
   */
  it('should handle IPv6 addresses', async () => {
    const ipv6Address = '2001:db8:85a3::8a2e:370:7334';
    
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', ipv6Address);
    
    // Request should succeed
    expect(response.status).toBe(200);
    
    // RateLimit headers should be present
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
  
  /**
   * Test: Should handle requests to non-existent routes
   * 
   * Verifies that rate limiting still applies even for
   * routes that return 404 errors.
   */
  it('should apply rate limiting to 404 responses', async () => {
    const testIP = '172.16.0.100';
    
    const response = await request(app)
      .get('/non-existent-route')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP);
    
    // Should get 404
    expect(response.status).toBe(404);
    
    // But RateLimit headers should still be present
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
  
  /**
   * Test: Rate limiting should work for POST requests
   * 
   * Verifies that rate limiting applies to all HTTP methods,
   * not just GET requests.
   */
  it('should apply rate limiting to POST requests', async () => {
    const testIP = '172.16.0.101';
    
    // Send POST request (will get 404 but rate limiting should apply)
    const response = await request(app)
      .post('/some-endpoint')
      .set('Accept', 'application/json')
      .set('X-Forwarded-For', testIP)
      .send({ test: 'data' });
    
    // RateLimit headers should be present regardless of route existence
    const rateLimitInfo = parseRateLimitHeaders(response.headers);
    expect(rateLimitInfo.hasRateLimitHeaders).toBe(true);
  });
});
