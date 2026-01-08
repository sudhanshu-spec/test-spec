/**
 * @fileoverview Health Check Endpoints Integration Test Suite
 * 
 * Comprehensive test suite for health check endpoints (/health and /ready).
 * Tests verify that operational monitoring endpoints function correctly for:
 * 
 * - Load balancer health checks (AWS ALB/ELB, nginx, HAProxy)
 * - Container orchestration (Kubernetes liveness/readiness probes)
 * - PM2 process manager health monitoring
 * - Docker HEALTHCHECK instruction support
 * 
 * Test Coverage:
 * - Liveness probe (GET /health): Basic application availability check
 * - Readiness probe (GET /ready): Dependency and resource availability check
 * - Response format validation: JSON schema verification
 * - HTTP status code verification: 200 for healthy, 503 for not ready
 * - Response time validation: Health checks should be lightweight
 * - Error handling: Graceful handling of invalid requests
 * - Security validation: No sensitive information leakage
 * 
 * @module tests/health/health.test
 * @requires supertest
 * @requires ../../server
 * @see {@link https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/}
 * @see {@link https://microservices.io/patterns/observability/health-check-api.html}
 */

'use strict';

// =============================================================================
// TEST DEPENDENCIES
// =============================================================================

/**
 * Supertest HTTP assertion library for Express application testing
 * Enables making simulated HTTP requests without starting an actual server
 * @see https://www.npmjs.com/package/supertest
 */
const request = require('supertest');

/**
 * Express application instance with health check routes configured
 * Contains /health and /ready endpoints via routes/health.js
 * @see ../../server.js
 */
const app = require('../../server');

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * Expected health status values matching HEALTH_STATUS constants in routes/health.js
 * @type {Object}
 * @property {string} HEALTHY - Status for successful liveness probe
 * @property {string} READY - Status for successful readiness probe
 * @property {string} NOT_READY - Status for failed readiness probe
 * @property {string} UNHEALTHY - Status for failed liveness probe
 */
const EXPECTED_HEALTH_STATUS = Object.freeze({
  HEALTHY: 'healthy',
  READY: 'ready',
  NOT_READY: 'not_ready',
  UNHEALTHY: 'unhealthy'
});

/**
 * Health check endpoint paths
 * @type {Object}
 * @property {string} HEALTH - Liveness probe endpoint path
 * @property {string} READY - Readiness probe endpoint path
 */
const TEST_ENDPOINTS = Object.freeze({
  HEALTH: '/health',
  READY: '/ready'
});

/**
 * Expected HTTP status codes for health check responses
 * @type {Object}
 */
const HTTP_STATUS = Object.freeze({
  OK: 200,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  SERVICE_UNAVAILABLE: 503
});

/**
 * Maximum acceptable response time for health checks (milliseconds)
 * Health probes should be lightweight and respond quickly
 * @type {number}
 */
const MAX_RESPONSE_TIME_MS = 100;

/**
 * Content-Type header value for JSON responses
 * @type {string}
 */
const JSON_CONTENT_TYPE = 'application/json';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates that a string is a valid ISO 8601 timestamp
 * @param {string} timestamp - The timestamp string to validate
 * @returns {boolean} True if valid ISO 8601 format
 */
const isValidISOTimestamp = (timestamp) => {
  if (typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && timestamp === date.toISOString();
};

/**
 * Measures response time of a supertest request
 * @param {Promise} requestPromise - The supertest request promise
 * @returns {Promise<{response: Object, responseTime: number}>} Response and timing
 */
const measureResponseTime = async (requestPromise) => {
  const startTime = Date.now();
  const response = await requestPromise;
  const responseTime = Date.now() - startTime;
  return { response, responseTime };
};

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Health Check Endpoints', () => {
  /**
   * Log test configuration at suite start for debugging
   */
  beforeAll(() => {
    console.log('[Health Tests] Testing health check endpoints:');
    console.log(`  Liveness probe: ${TEST_ENDPOINTS.HEALTH}`);
    console.log(`  Readiness probe: ${TEST_ENDPOINTS.READY}`);
  });

  // ===========================================================================
  // LIVENESS PROBE (GET /health) TEST SUITE
  // ===========================================================================

  describe('Health Endpoint (GET /health)', () => {
    /**
     * Test: Health endpoint returns 200 status code
     * A running application should always return 200 OK for the liveness probe
     */
    test('should return 200 status code', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    /**
     * Test: Health endpoint returns JSON content type
     * Responses must be application/json for programmatic consumption
     */
    test('should return JSON content type', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    /**
     * Test: Health response includes status field with healthy value
     * The status field indicates application liveness
     */
    test('should include status field with healthy value', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe(EXPECTED_HEALTH_STATUS.HEALTHY);
    });

    /**
     * Test: Health response includes timestamp in ISO format
     * Timestamp is required for monitoring and debugging
     */
    test('should include timestamp field in ISO format', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.body).toHaveProperty('timestamp');
      expect(isValidISOTimestamp(response.body.timestamp)).toBe(true);
    });

    /**
     * Test: Health response includes uptime as positive number
     * Uptime indicates how long the process has been running
     */
    test('should include uptime field as positive number', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    /**
     * Test: Health response includes human-readable uptimeFormatted field
     * Formatted uptime for display purposes (e.g., '1h 2m 3s')
     */
    test('should include uptimeFormatted field as string', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.body).toHaveProperty('uptimeFormatted');
      expect(typeof response.body.uptimeFormatted).toBe('string');
      // Should match pattern like '0s', '1m 30s', '2h 15m 30s'
      expect(response.body.uptimeFormatted).toMatch(/^(\d+h\s)?(\d+m\s)?\d+s$/);
    });

    /**
     * Test: Health endpoint responds within acceptable time
     * Liveness probes should be lightweight and fast
     */
    test('should respond within acceptable time', async () => {
      const { response, responseTime } = await measureResponseTime(
        request(app).get(TEST_ENDPOINTS.HEALTH)
      );
      
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });

    /**
     * Test: Health endpoint sets proper cache control headers
     * Health checks should never be cached
     */
    test('should set cache control headers to prevent caching', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  // ===========================================================================
  // READINESS PROBE (GET /ready) TEST SUITE
  // ===========================================================================

  describe('Readiness Endpoint (GET /ready)', () => {
    /**
     * Test: Readiness endpoint returns 200 status code when ready
     * A fully initialized application should return 200 OK
     */
    test('should return 200 status code when ready', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      // Should be 200 OK when all dependencies are healthy
      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE]).toContain(response.status);
      
      // If 200, verify status is 'ready'
      if (response.status === HTTP_STATUS.OK) {
        expect(response.body.status).toBe(EXPECTED_HEALTH_STATUS.READY);
      }
    });

    /**
     * Test: Readiness endpoint returns JSON content type
     * Responses must be application/json for programmatic consumption
     */
    test('should return JSON content type', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    /**
     * Test: Readiness response includes status field
     * Status can be 'ready' or 'not_ready' based on dependency checks
     */
    test('should include status field', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body).toHaveProperty('status');
      expect([EXPECTED_HEALTH_STATUS.READY, EXPECTED_HEALTH_STATUS.NOT_READY])
        .toContain(response.body.status);
    });

    /**
     * Test: Readiness response includes timestamp in ISO format
     * Timestamp is required for monitoring and debugging
     */
    test('should include timestamp field in ISO format', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body).toHaveProperty('timestamp');
      expect(isValidISOTimestamp(response.body.timestamp)).toBe(true);
    });

    /**
     * Test: Readiness response includes uptime field
     * Uptime indicates process running duration
     */
    test('should include uptime field as positive number', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    /**
     * Test: Readiness response includes uptimeFormatted field
     * Human-readable uptime for display purposes
     */
    test('should include uptimeFormatted field as string', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body).toHaveProperty('uptimeFormatted');
      expect(typeof response.body.uptimeFormatted).toBe('string');
    });

    /**
     * Test: Readiness response includes dependency checks
     * Readiness probe should verify application dependencies
     */
    test('should include checks object with dependency information', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body).toHaveProperty('checks');
      expect(typeof response.body.checks).toBe('object');
    });

    /**
     * Test: Readiness checks include memory status
     * Memory health is critical for application stability
     */
    test('should include memory check in checks object', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.memory).toHaveProperty('status');
      
      // Should have memory metrics
      if (response.body.checks.memory.status === EXPECTED_HEALTH_STATUS.HEALTHY) {
        expect(response.body.checks.memory).toHaveProperty('heapUsedMB');
        expect(response.body.checks.memory).toHaveProperty('heapTotalMB');
        expect(response.body.checks.memory).toHaveProperty('heapUsagePercent');
      }
    });

    /**
     * Test: Readiness checks include event loop status
     * Event loop responsiveness indicates Node.js health
     */
    test('should include eventLoop check in checks object', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body.checks).toHaveProperty('eventLoop');
      expect(response.body.checks.eventLoop).toHaveProperty('status');
      
      // Should have event loop metrics
      if (response.body.checks.eventLoop.status === EXPECTED_HEALTH_STATUS.HEALTHY) {
        expect(response.body.checks.eventLoop).toHaveProperty('lagMs');
        expect(typeof response.body.checks.eventLoop.lagMs).toBe('number');
      }
    });

    /**
     * Test: Readiness checks include application status
     * Application-level readiness state check
     */
    test('should include application check in checks object', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.body.checks).toHaveProperty('application');
      expect(response.body.checks.application).toHaveProperty('status');
    });

    /**
     * Test: Readiness endpoint sets proper cache control headers
     * Readiness checks should never be cached
     */
    test('should set cache control headers to prevent caching', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  // ===========================================================================
  // RESPONSE FORMAT VALIDATION TEST SUITE
  // ===========================================================================

  describe('Health Response Format Validation', () => {
    /**
     * Test: Health response is a valid JSON object
     * Response should be an object, not an array or primitive
     */
    test('should return valid JSON object for /health', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
      expect(Array.isArray(response.body)).toBe(false);
    });

    /**
     * Test: Ready response is a valid JSON object
     * Response should be an object, not an array or primitive
     */
    test('should return valid JSON object for /ready', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
      expect(Array.isArray(response.body)).toBe(false);
    });

    /**
     * Test: Health response has consistent structure
     * All required fields should be present in every response
     */
    test('should have consistent response structure for /health', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      // Required fields for liveness probe
      const requiredFields = ['status', 'timestamp', 'uptime', 'uptimeFormatted'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    });

    /**
     * Test: Ready response has consistent structure
     * All required fields should be present in every response
     */
    test('should have consistent response structure for /ready', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      // Required fields for readiness probe
      const requiredFields = ['status', 'timestamp', 'uptime', 'uptimeFormatted', 'checks'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    });

    /**
     * Test: Health response does not leak sensitive information
     * Security validation to ensure no internal paths, secrets, or debug info
     */
    test('should not leak sensitive information in /health response', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH);
      
      const responseStr = JSON.stringify(response.body);
      
      // Should not contain sensitive patterns
      expect(responseStr).not.toMatch(/password/i);
      expect(responseStr).not.toMatch(/secret/i);
      expect(responseStr).not.toMatch(/token/i);
      expect(responseStr).not.toMatch(/api[_-]?key/i);
      expect(responseStr).not.toMatch(/\/home\//);
      expect(responseStr).not.toMatch(/\/var\//);
      expect(responseStr).not.toMatch(/\/etc\//);
      expect(responseStr).not.toMatch(/node_modules/);
    });

    /**
     * Test: Ready response does not leak sensitive information
     * Security validation to ensure no internal paths, secrets, or debug info
     */
    test('should not leak sensitive information in /ready response', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY);
      
      const responseStr = JSON.stringify(response.body);
      
      // Should not contain sensitive patterns
      expect(responseStr).not.toMatch(/password/i);
      expect(responseStr).not.toMatch(/secret/i);
      expect(responseStr).not.toMatch(/token/i);
      expect(responseStr).not.toMatch(/api[_-]?key/i);
      expect(responseStr).not.toMatch(/\/home\//);
      expect(responseStr).not.toMatch(/\/var\//);
      expect(responseStr).not.toMatch(/\/etc\//);
      expect(responseStr).not.toMatch(/node_modules/);
    });

    /**
     * Test: Uptime values are consistent between responses
     * Multiple rapid requests should have increasing uptime
     */
    test('should have increasing uptime across multiple requests', async () => {
      const response1 = await request(app).get(TEST_ENDPOINTS.HEALTH);
      
      // Small delay to ensure uptime increases
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const response2 = await request(app).get(TEST_ENDPOINTS.HEALTH);
      
      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
    });
  });

  // ===========================================================================
  // ERROR SCENARIO TESTING TEST SUITE
  // ===========================================================================

  describe('Error Scenario Testing', () => {
    /**
     * Test: POST method is not allowed on /health endpoint
     * Health checks should only accept GET requests
     */
    test('should reject POST requests to /health endpoint', async () => {
      const response = await request(app)
        .post(TEST_ENDPOINTS.HEALTH);
      
      // Should return 404 (route not found for POST) or 405 (method not allowed)
      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.METHOD_NOT_ALLOWED])
        .toContain(response.status);
    });

    /**
     * Test: PUT method is not allowed on /health endpoint
     * Health checks should only accept GET requests
     */
    test('should reject PUT requests to /health endpoint', async () => {
      const response = await request(app)
        .put(TEST_ENDPOINTS.HEALTH);
      
      // Should return 404 (route not found for PUT) or 405 (method not allowed)
      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.METHOD_NOT_ALLOWED])
        .toContain(response.status);
    });

    /**
     * Test: DELETE method is not allowed on /health endpoint
     * Health checks should only accept GET requests
     */
    test('should reject DELETE requests to /health endpoint', async () => {
      const response = await request(app)
        .delete(TEST_ENDPOINTS.HEALTH);
      
      // Should return 404 (route not found for DELETE) or 405 (method not allowed)
      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.METHOD_NOT_ALLOWED])
        .toContain(response.status);
    });

    /**
     * Test: POST method is not allowed on /ready endpoint
     * Readiness checks should only accept GET requests
     */
    test('should reject POST requests to /ready endpoint', async () => {
      const response = await request(app)
        .post(TEST_ENDPOINTS.READY);
      
      // Should return 404 (route not found for POST) or 405 (method not allowed)
      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.METHOD_NOT_ALLOWED])
        .toContain(response.status);
    });

    /**
     * Test: Invalid health endpoint path returns 404
     * Non-existent health paths should return proper error
     */
    test('should return 404 for non-existent health paths', async () => {
      const response = await request(app)
        .get('/health/invalid');
      
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    /**
     * Test: Invalid ready endpoint path returns 404
     * Non-existent ready paths should return proper error
     */
    test('should return 404 for non-existent ready paths', async () => {
      const response = await request(app)
        .get('/ready/invalid');
      
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });

    /**
     * Test: Health endpoint handles request with Accept header
     * Should respect Accept header for JSON
     */
    test('should handle Accept header requesting JSON', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH)
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    /**
     * Test: Health endpoint handles query parameters gracefully
     * Query parameters should not affect health check behavior
     */
    test('should ignore query parameters on /health endpoint', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.HEALTH)
        .query({ foo: 'bar', verbose: 'true' });
      
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.status).toBe(EXPECTED_HEALTH_STATUS.HEALTHY);
    });

    /**
     * Test: Ready endpoint handles query parameters gracefully
     * Query parameters should not affect readiness check behavior
     */
    test('should ignore query parameters on /ready endpoint', async () => {
      const response = await request(app)
        .get(TEST_ENDPOINTS.READY)
        .query({ foo: 'bar', verbose: 'true' });
      
      // Should still return valid response
      expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE])
        .toContain(response.status);
      expect(response.body).toHaveProperty('status');
    });
  });

  // ===========================================================================
  // PERFORMANCE AND RELIABILITY TEST SUITE
  // ===========================================================================

  describe('Performance and Reliability', () => {
    /**
     * Test: Multiple concurrent health checks succeed
     * Health endpoint should handle concurrent requests
     */
    test('should handle multiple concurrent /health requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get(TEST_ENDPOINTS.HEALTH)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.status).toBe(EXPECTED_HEALTH_STATUS.HEALTHY);
      });
    });

    /**
     * Test: Multiple concurrent readiness checks succeed
     * Ready endpoint should handle concurrent requests
     */
    test('should handle multiple concurrent /ready requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get(TEST_ENDPOINTS.READY)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([HTTP_STATUS.OK, HTTP_STATUS.SERVICE_UNAVAILABLE])
          .toContain(response.status);
        expect(response.body).toHaveProperty('status');
      });
    });

    /**
     * Test: Health endpoint response is stable across requests
     * Response structure should remain consistent
     */
    test('should return stable response structure across multiple /health requests', async () => {
      const response1 = await request(app).get(TEST_ENDPOINTS.HEALTH);
      const response2 = await request(app).get(TEST_ENDPOINTS.HEALTH);
      const response3 = await request(app).get(TEST_ENDPOINTS.HEALTH);
      
      // All should have same structure (keys)
      const keys1 = Object.keys(response1.body).sort();
      const keys2 = Object.keys(response2.body).sort();
      const keys3 = Object.keys(response3.body).sort();
      
      expect(keys1).toEqual(keys2);
      expect(keys2).toEqual(keys3);
    });

    /**
     * Test: Ready endpoint response is stable across requests
     * Response structure should remain consistent
     */
    test('should return stable response structure across multiple /ready requests', async () => {
      const response1 = await request(app).get(TEST_ENDPOINTS.READY);
      const response2 = await request(app).get(TEST_ENDPOINTS.READY);
      
      // All should have same top-level structure
      const topKeys1 = Object.keys(response1.body).sort();
      const topKeys2 = Object.keys(response2.body).sort();
      
      expect(topKeys1).toEqual(topKeys2);
    });
  });
});
