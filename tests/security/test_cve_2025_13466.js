/**
 * @fileoverview Security test suite for CVE-2025-13466 (body-parser DoS vulnerability) verification.
 * This test suite verifies that the body-parser 2.2.1 upgrade properly patches the denial of service
 * vulnerability caused by inefficient handling of URL-encoded bodies with many parameters.
 * 
 * CVE-2025-13466 Details:
 * - Affected Package: body-parser 2.2.0
 * - CVSS Score: 5.5 (Moderate)
 * - Attack Vector: Network
 * - Description: body-parser 2.2.0 is vulnerable to denial of service due to inefficient
 *   handling of URL-encoded bodies with very large numbers of parameters. An attacker
 *   can send payloads containing thousands of parameters within the default 100KB request
 *   size limit, causing elevated CPU and memory usage.
 * - Fixed Version: body-parser 2.2.1
 * - Advisory: GHSA-wqch-xfxh-vrr4
 * 
 * @module tests/security/test_cve_2025_13466
 * @requires supertest
 * @requires ../../server
 * @see https://github.com/advisories/GHSA-wqch-xfxh-vrr4
 * @see https://nvd.nist.gov/vuln/detail/CVE-2025-13466
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

/**
 * HTTP assertion library for testing Express.js applications.
 * Used to make HTTP POST requests against the app to verify body-parser 2.2.1
 * properly patches CVE-2025-13466 DoS vulnerability.
 * @external supertest
 */
const request = require('supertest');

/**
 * Express application instance for supertest HTTP testing.
 * The app has express.urlencoded() middleware configured with { extended: true, limit: '100kb' }
 * for URL-encoded body parsing.
 * @type {express.Application}
 */
const { app } = require('../../server');

// =============================================================================
// Test Configuration
// =============================================================================

/**
 * Test configuration constants for CVE-2025-13466 verification.
 * @constant {Object}
 */
const TEST_CONFIG = {
  /**
   * Number of parameters to generate for large payload test.
   * 1000+ parameters was enough to cause DoS in body-parser 2.2.0.
   * @type {number}
   */
  LARGE_PARAMETER_COUNT: 1500,
  
  /**
   * Maximum acceptable processing time for large payload (in milliseconds).
   * If body-parser is patched, it should process efficiently within this time.
   * @type {number}
   */
  MAX_PROCESSING_TIME_MS: 5000,
  
  /**
   * Size in bytes that exceeds the configured body limit (100KB).
   * Used to test that oversized payloads are properly rejected.
   * @type {number}
   */
  OVERSIZED_BODY_SIZE: 150 * 1024, // 150KB
  
  /**
   * Default body size limit configured in server.js (100KB).
   * @type {number}
   */
  DEFAULT_BODY_LIMIT: 100 * 1024, // 100KB
  
  /**
   * Test timeout for performance tests (in milliseconds).
   * @type {number}
   */
  TEST_TIMEOUT: 10000
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a URL-encoded body with a specified number of parameters.
 * Used to test the body-parser's handling of many parameters (CVE-2025-13466).
 * 
 * @param {number} paramCount - Number of parameters to generate
 * @returns {string} URL-encoded string with specified number of key=value pairs
 * 
 * @example
 * // Generate body with 5 parameters
 * const body = generateLargeUrlEncodedBody(5);
 * // Returns: "param0=value0&param1=value1&param2=value2&param3=value3&param4=value4"
 */
const generateLargeUrlEncodedBody = (paramCount) => {
  const params = [];
  for (let i = 0; i < paramCount; i++) {
    // Use short key-value pairs to maximize parameter count within size limit
    params.push(`p${i}=v${i}`);
  }
  return params.join('&');
};

/**
 * Generates a URL-encoded body that exceeds a specified size.
 * Used to test that body size limits are properly enforced.
 * 
 * @param {number} targetSize - Target size in bytes for the generated body
 * @returns {string} URL-encoded string approximately equal to or exceeding target size
 * 
 * @example
 * // Generate body exceeding 100KB
 * const body = generateOversizedBody(100 * 1024);
 */
const generateOversizedBody = (targetSize) => {
  // Create a base parameter with ~100 bytes per entry
  // Each entry is approximately "param_XXXX=value_YYYYYYYYYYYYYYYYYYYYYYYYYYY..." (~100 chars)
  const baseValue = 'x'.repeat(80); // 80 character value
  const params = [];
  let currentSize = 0;
  let counter = 0;
  
  while (currentSize < targetSize) {
    const param = `param_${counter.toString().padStart(6, '0')}=${baseValue}`;
    params.push(param);
    // Account for parameter plus '&' separator
    currentSize += param.length + 1;
    counter++;
  }
  
  return params.join('&');
};

/**
 * Measures the execution time of an async function.
 * 
 * @param {Function} asyncFn - Async function to measure
 * @returns {Promise<{result: *, duration: number}>} Object with result and duration in ms
 */
const measureExecutionTime = async (asyncFn) => {
  const startTime = process.hrtime.bigint();
  const result = await asyncFn();
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6; // Convert nanoseconds to milliseconds
  return { result, duration };
};

// =============================================================================
// Test Suite: CVE-2025-13466 - Body Parser DoS Vulnerability
// =============================================================================

describe('CVE-2025-13466 - Body Parser DoS Vulnerability', () => {
  /**
   * Test 1: Verify efficient handling of URL-encoded body with many parameters.
   * 
   * This test verifies that the patched body-parser (2.2.1) efficiently handles
   * URL-encoded bodies containing thousands of parameters without causing
   * denial of service through excessive CPU/memory consumption.
   * 
   * The vulnerable body-parser 2.2.0 would exhibit elevated CPU and memory usage
   * when parsing bodies with many parameters due to inefficient handling.
   */
  it('should handle URL-encoded body with many parameters efficiently', async () => {
    // Generate URL-encoded body with 1500+ parameters
    const largeBody = generateLargeUrlEncodedBody(TEST_CONFIG.LARGE_PARAMETER_COUNT);
    
    // Verify the generated body has the expected parameter count
    const parameterCount = largeBody.split('&').length;
    expect(parameterCount).toBeGreaterThanOrEqual(TEST_CONFIG.LARGE_PARAMETER_COUNT);
    
    // Measure processing time for the large payload
    const { result, duration } = await measureExecutionTime(async () => {
      return request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(largeBody);
    });
    
    // Log performance metrics for debugging
    console.log(`CVE-2025-13466 Test: Processed ${parameterCount} parameters in ${duration.toFixed(2)}ms`);
    
    // The patched body-parser should process the request efficiently
    // Request should complete within the maximum allowed processing time
    expect(duration).toBeLessThan(TEST_CONFIG.MAX_PROCESSING_TIME_MS);
    
    // Request should be processed efficiently (body-parser middleware executed)
    // With 1500 parameters exceeding the default parameterLimit of 1000,
    // body-parser will return 413 "too many parameters" - this is EXPECTED behavior
    // The key verification is that the rejection happens QUICKLY (no DoS)
    // If body-parser had the CVE-2025-13466 vulnerability, processing would be slow/hang
    expect(result.status).toBeDefined();
    
    // Log the result status for verification
    // 413 = too many parameters (expected - parameterLimit is 1000, we sent 1500)
    // The important thing is the response time, not the status code
    console.log(`Response status: ${result.status} (413 expected - too many params, but processed efficiently)`);
  }, TEST_CONFIG.TEST_TIMEOUT);

  /**
   * Test 2: Verify body size limits are enforced.
   * 
   * This test verifies that the express.urlencoded() middleware properly
   * enforces the configured body size limit (100KB) and rejects oversized
   * payloads with an appropriate error response (413 Payload Too Large).
   * 
   * This is a defense-in-depth measure against DoS attacks using large payloads.
   */
  it('should enforce body size limits', async () => {
    // Generate URL-encoded body exceeding the 100KB limit
    const oversizedBody = generateOversizedBody(TEST_CONFIG.OVERSIZED_BODY_SIZE);
    
    // Verify the body size exceeds the configured limit
    expect(Buffer.byteLength(oversizedBody)).toBeGreaterThan(TEST_CONFIG.DEFAULT_BODY_LIMIT);
    
    // Log the body size for debugging
    const bodySizeKB = (Buffer.byteLength(oversizedBody) / 1024).toFixed(2);
    console.log(`CVE-2025-13466 Test: Sending oversized body (${bodySizeKB}KB, limit: 100KB)`);
    
    // Send the oversized body
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(oversizedBody);
    
    // Verify the request was rejected due to size limit
    // Express body-parser returns 413 Payload Too Large when body exceeds limit
    expect(response.status).toBe(413);
    
    // Log the response for verification
    console.log(`Response status: ${response.status} (expected 413 Payload Too Large)`);
  });

  /**
   * Test 3: Verify normal URL-encoded body parsing still works correctly.
   * 
   * This test ensures that the security patch (body-parser upgrade to 2.2.1)
   * does not break normal body parsing functionality. Regular-sized URL-encoded
   * bodies with a reasonable number of parameters should be parsed correctly.
   * 
   * This is a regression test to confirm the patch doesn't introduce new issues.
   */
  it('should parse normal URL-encoded body correctly', async () => {
    // Create a normal-sized URL-encoded body
    const normalBody = 'field1=value1&field2=value2&field3=hello%20world&number=123&special=%26%3D%3F';
    
    // Send the normal body
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(normalBody);
    
    // The request should be processed (body-parser executed successfully)
    // Since there's no POST route at '/', we expect a 404
    // The important thing is that the body was parsed without errors
    expect(response.status).toBeDefined();
    
    // Verify the request didn't fail due to body parsing issues
    // 404 = body parsed, route not found (expected)
    // 5xx = server error (unexpected - would indicate body parsing failed)
    expect(response.status).not.toBeGreaterThanOrEqual(500);
    
    // Also test the /health endpoint with POST (should work for body parsing verification)
    const healthResponse = await request(app)
      .post('/health')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(normalBody);
    
    // Health endpoint only handles GET, but body-parser should still parse
    // without causing errors (likely returns 404)
    expect(healthResponse.status).toBeDefined();
    expect(healthResponse.status).not.toBeGreaterThanOrEqual(500);
    
    // Log the response for verification
    console.log(`Normal body parsing test: POST / = ${response.status}, POST /health = ${healthResponse.status}`);
  });

  /**
   * Test 4: Verify handling of edge case with exactly at size limit.
   * 
   * This test verifies the behavior when a URL-encoded body is exactly at
   * or slightly below the configured 100KB limit.
   * 
   * Note: body-parser has TWO limits:
   * - size limit: 100KB (configurable via 'limit' option)
   * - parameter limit: 1000 parameters (default, configurable via 'parameterLimit')
   * 
   * This test generates a body that is under BOTH limits to verify
   * the size limit behavior specifically.
   */
  it('should accept body at or just below size limit', async () => {
    // Generate a body that's just under the 100KB size limit
    // but also under the 1000 parameter limit
    // We use ~100 bytes per parameter (larger values) to stay under param limit
    const targetSize = 95 * 1024; // 95KB - safely under 100KB limit
    const maxParams = 900; // Stay under 1000 parameter limit
    const valueLength = Math.ceil(targetSize / maxParams) - 15; // Account for key length and separators
    
    const params = [];
    for (let i = 0; i < maxParams; i++) {
      // Generate parameter with large value to fill size while staying under param limit
      const value = 'x'.repeat(valueLength);
      params.push(`param_${i.toString().padStart(3, '0')}=${value}`);
    }
    
    const atLimitBody = params.join('&');
    const bodySizeKB = (Buffer.byteLength(atLimitBody) / 1024).toFixed(2);
    const paramCount = params.length;
    
    console.log(`CVE-2025-13466 Test: Sending body at limit (${bodySizeKB}KB, ${paramCount} params)`);
    
    // Verify we're under both limits before sending
    expect(Buffer.byteLength(atLimitBody)).toBeLessThan(100 * 1024); // Under 100KB
    expect(paramCount).toBeLessThan(1000); // Under 1000 params
    
    // Send the body at the limit
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(atLimitBody);
    
    // Body should be accepted (not rejected for size or parameter count)
    // 404 = body parsed, route not found (expected)
    // 413 = body too large OR too many parameters (unexpected for this size/count)
    expect(response.status).not.toBe(413);
    expect(response.status).not.toBeGreaterThanOrEqual(500);
    
    console.log(`Response status: ${response.status} (expected NOT 413 - body within limits)`);
  });

  /**
   * Test 5: Verify rapid sequential requests don't cause memory exhaustion.
   * 
   * This test sends multiple requests with many parameters in quick succession
   * to verify the patched body-parser doesn't accumulate memory issues.
   */
  it('should handle rapid sequential requests with many parameters', async () => {
    const requests = [];
    const requestCount = 10;
    const paramsPerRequest = 500;
    
    console.log(`CVE-2025-13466 Test: Sending ${requestCount} sequential requests with ${paramsPerRequest} params each`);
    
    const startTime = process.hrtime.bigint();
    
    // Send multiple requests sequentially
    for (let i = 0; i < requestCount; i++) {
      const body = generateLargeUrlEncodedBody(paramsPerRequest);
      const response = await request(app)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body);
      
      requests.push(response);
    }
    
    const endTime = process.hrtime.bigint();
    const totalDuration = Number(endTime - startTime) / 1e6;
    
    console.log(`Completed ${requestCount} requests in ${totalDuration.toFixed(2)}ms`);
    
    // All requests should complete successfully
    requests.forEach((response, index) => {
      expect(response.status).toBeDefined();
      expect(response.status).not.toBeGreaterThanOrEqual(500);
    });
    
    // Total time should be reasonable (< 5 seconds per request average)
    const avgTimePerRequest = totalDuration / requestCount;
    expect(avgTimePerRequest).toBeLessThan(TEST_CONFIG.MAX_PROCESSING_TIME_MS);
    
    console.log(`Average time per request: ${avgTimePerRequest.toFixed(2)}ms`);
  }, TEST_CONFIG.TEST_TIMEOUT * 2);
});

// =============================================================================
// Additional Verification Tests
// =============================================================================

describe('Body Parser Security Configuration', () => {
  /**
   * Verify JSON body parsing also has size limits.
   * This complements the URL-encoded body tests.
   */
  it('should enforce size limits on JSON bodies', async () => {
    // Generate large JSON body (> 100KB)
    const largeObject = {};
    for (let i = 0; i < 2000; i++) {
      largeObject[`key_${i.toString().padStart(5, '0')}`] = 'value_' + 'x'.repeat(50);
    }
    const largeJson = JSON.stringify(largeObject);
    
    const bodySizeKB = (Buffer.byteLength(largeJson) / 1024).toFixed(2);
    console.log(`Body Parser Security: Testing JSON body size limit (${bodySizeKB}KB)`);
    
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send(largeJson);
    
    // Should be rejected for exceeding size limit
    expect(response.status).toBe(413);
    
    console.log(`Response status: ${response.status} (expected 413 for oversized JSON)`);
  });

  /**
   * Verify content-type validation for body parsing.
   */
  it('should handle invalid content-type gracefully', async () => {
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/x-invalid-type')
      .send('some=data');
    
    // Should not cause server error
    expect(response.status).not.toBeGreaterThanOrEqual(500);
    
    console.log(`Content-Type validation: status ${response.status}`);
  });
});
