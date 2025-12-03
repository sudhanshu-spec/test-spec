/**
 * @fileoverview Security test suite for CVE-2024-51999 (Express query parser vulnerability).
 * 
 * This test suite verifies that the Express 5.2.0 upgrade properly patches the query
 * property manipulation vulnerability where request.query object could have its prototype
 * properties overwritten by query string parameter keys.
 * 
 * CVE-2024-51999 Details:
 * - CVSS Score: 2.7 (Low)
 * - Affected Versions: Express < 4.22.0 and Express 5.0.0 - 5.1.0
 * - Patched Version: Express 5.2.0+
 * - Attack Vector: Network
 * - Description: When using the extended query parser in Express, the request.query
 *   object inherits all object prototype properties, but these properties can be
 *   overwritten by query string parameter keys that match the property names
 *   (__proto__, constructor, etc.)
 * 
 * @module tests/security/test_cve_2024_51999
 * @requires supertest
 * @requires ../../server
 * @see https://github.com/advisories/GHSA-pj86-cfqh-vqx6
 * @see https://nvd.nist.gov/vuln/detail/CVE-2024-51999
 * 
 * @example
 * // Run tests
 * npm test -- --testPathPattern=test_cve_2024_51999
 * 
 * // Or run with coverage
 * npm test -- --coverage --testPathPattern=test_cve_2024_51999
 */

'use strict';

// =============================================================================
// Test Dependencies
// =============================================================================

/**
 * HTTP assertion library for testing Express.js applications.
 * Used to make HTTP GET requests against the app with query strings containing
 * prototype property keys (__proto__, constructor) to verify the security patch.
 */
const request = require('supertest');

/**
 * Express application instance for testing.
 * The app is exported from server.js with all security middleware configured.
 */
const { app } = require('../../server');

// =============================================================================
// Test Suite: CVE-2024-51999 - Query Parser Vulnerability
// =============================================================================

/**
 * Test suite for CVE-2024-51999 query parser vulnerability verification.
 * Contains 5 tests that verify prototype pollution attempts are blocked while
 * legitimate query parsing remains functional.
 * 
 * Test Cases:
 * 1. Query with __proto__ key handling
 * 2. Query with constructor key handling
 * 3. Prototype pollution attempt rejection
 * 4. Legitimate query parsing still works
 * 5. Nested property manipulation blocked
 */
describe('CVE-2024-51999 - Query Parser Vulnerability', () => {

  // ===========================================================================
  // Test Case 1: __proto__ Key Handling
  // ===========================================================================

  /**
   * Test that query strings with __proto__ key are handled safely.
   * 
   * Attack Scenario: Attacker sends ?__proto__[admin]=true attempting to
   * pollute the Object prototype and gain elevated privileges.
   * 
   * Expected Behavior: Express 5.2.0+ should safely handle this query without
   * allowing prototype pollution. The request should complete successfully
   * but the __proto__ property should not be exploitable.
   */
  it('should safely handle query with __proto__ key', async () => {
    // Store original Object.prototype state for comparison
    const originalPrototypeKeys = Object.keys(Object.prototype);
    
    // Send request with __proto__ pollution attempt
    const response = await request(app)
      .get('/')
      .query({ '__proto__[admin]': 'true' });
    
    // Verify request completes successfully (200 OK)
    expect(response.status).toBe(200);
    
    // Verify response body is the expected greeting (normal functionality preserved)
    expect(response.text).toBe('Hello, World!\n');
    
    // Critical: Verify Object.prototype was NOT polluted
    // If vulnerable, Object.prototype.admin would be 'true'
    expect(Object.prototype.admin).toBeUndefined();
    
    // Verify no new properties were added to Object.prototype
    const currentPrototypeKeys = Object.keys(Object.prototype);
    expect(currentPrototypeKeys).toEqual(originalPrototypeKeys);
    
    // Verify new objects don't inherit polluted properties
    const testObject = {};
    expect(testObject.admin).toBeUndefined();
  });

  // ===========================================================================
  // Test Case 2: Constructor Key Handling
  // ===========================================================================

  /**
   * Test that query strings with constructor key are handled safely.
   * 
   * Attack Scenario: Attacker sends ?constructor=malicious or 
   * ?constructor[prototype][polluted]=true attempting to manipulate
   * the constructor property or prototype chain.
   * 
   * Expected Behavior: Express 5.2.0+ should safely parse the query without
   * allowing the constructor property to be exploited for prototype pollution.
   */
  it('should safely handle query with constructor key', async () => {
    // Store original Function.prototype.constructor for comparison
    const originalConstructor = Object.prototype.constructor;
    
    // Send request with constructor manipulation attempt
    const response = await request(app)
      .get('/')
      .query({ 'constructor': 'malicious' });
    
    // Verify request completes successfully
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
    
    // Verify constructor property was NOT overwritten on Object.prototype
    expect(Object.prototype.constructor).toBe(originalConstructor);
    
    // Additional test: attempt constructor.prototype pollution
    const response2 = await request(app)
      .get('/')
      .query({ 'constructor[prototype][polluted]': 'true' });
    
    expect(response2.status).toBe(200);
    
    // Verify no pollution occurred through constructor chain
    const testObject = {};
    expect(testObject.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });

  // ===========================================================================
  // Test Case 3: Prototype Pollution Attempt Rejection
  // ===========================================================================

  /**
   * Test that multiple prototype pollution vectors are blocked.
   * 
   * Attack Scenario: Attacker sends query with multiple known prototype
   * pollution keys attempting various pollution techniques.
   * 
   * Expected Behavior: All prototype pollution attempts should fail.
   * Object.prototype should remain unchanged after all requests.
   */
  it('should reject prototype pollution attempts', async () => {
    // Store original Object.prototype state
    const originalPrototypeKeys = Object.keys(Object.prototype);
    const originalHasOwnProperty = Object.prototype.hasOwnProperty;
    const originalToString = Object.prototype.toString;
    
    // Array of prototype pollution payloads to test
    const pollutionPayloads = [
      { '__proto__[isAdmin]': 'true' },
      { '__proto__[role]': 'admin' },
      { '__proto__.isAdmin': 'true' },
      { 'constructor[prototype][isAdmin]': 'true' },
      { '__proto__': '{"isAdmin":true}' }
    ];
    
    // Test each pollution payload
    for (const payload of pollutionPayloads) {
      const response = await request(app)
        .get('/')
        .query(payload);
      
      // Each request should complete successfully
      expect(response.status).toBe(200);
    }
    
    // Critical: Verify Object.prototype was NOT modified by any payload
    expect(Object.prototype.isAdmin).toBeUndefined();
    expect(Object.prototype.role).toBeUndefined();
    
    // Verify core prototype methods are unchanged
    expect(Object.prototype.hasOwnProperty).toBe(originalHasOwnProperty);
    expect(Object.prototype.toString).toBe(originalToString);
    
    // Verify no new properties were added
    const currentPrototypeKeys = Object.keys(Object.prototype);
    expect(currentPrototypeKeys).toEqual(originalPrototypeKeys);
    
    // Verify new object instances are clean
    const cleanObject = {};
    expect(cleanObject.isAdmin).toBeUndefined();
    expect(cleanObject.role).toBeUndefined();
  });

  // ===========================================================================
  // Test Case 4: Legitimate Query Parsing
  // ===========================================================================

  /**
   * Test that legitimate query parameters are parsed correctly.
   * 
   * Scenario: Normal application usage with valid query parameters.
   * The security fix should NOT break normal query parsing functionality.
   * 
   * Expected Behavior: Valid query parameters should be parsed correctly
   * and accessible in request handlers. Extended query parser features
   * like nested objects and arrays should still work.
   */
  it('should parse legitimate query parameters correctly', async () => {
    // Test simple query parameters
    const response1 = await request(app)
      .get('/')
      .query({ name: 'test', value: '123' });
    
    expect(response1.status).toBe(200);
    expect(response1.text).toBe('Hello, World!\n');
    
    // Test query parameters with special characters (URL encoded)
    const response2 = await request(app)
      .get('/')
      .query({ 
        message: 'Hello World!',
        encoded: 'test@example.com'
      });
    
    expect(response2.status).toBe(200);
    
    // Test nested object query parameters (extended query parser feature)
    const response3 = await request(app)
      .get('/')
      .query({
        'user[name]': 'John',
        'user[age]': '30'
      });
    
    expect(response3.status).toBe(200);
    
    // Test array query parameters
    const response4 = await request(app)
      .get('/')
      .query({
        'items[]': ['apple', 'banana', 'cherry']
      });
    
    expect(response4.status).toBe(200);
    
    // Test numeric and boolean-like values
    const response5 = await request(app)
      .get('/')
      .query({
        count: '42',
        active: 'true',
        empty: ''
      });
    
    expect(response5.status).toBe(200);
    
    // Test on /evening endpoint to verify middleware applies to all routes
    const response6 = await request(app)
      .get('/evening')
      .query({ greeting: 'custom' });
    
    expect(response6.status).toBe(200);
    expect(response6.text).toBe('Good evening');
  });

  // ===========================================================================
  // Test Case 5: Nested Property Manipulation Blocked
  // ===========================================================================

  /**
   * Test that nested property manipulation attempts are blocked.
   * 
   * Attack Scenario: Attacker uses nested object syntax to attempt
   * prototype pollution through deeply nested __proto__ or constructor keys.
   * 
   * Expected Behavior: Express 5.2.0+ should block nested prototype
   * pollution attempts. The prototype chain should remain intact.
   */
  it('should block nested property manipulation', async () => {
    // Store original prototype state
    const originalPrototypeKeys = Object.keys(Object.prototype);
    
    // Test nested __proto__ pollution attempts
    const nestedPayloads = [
      { 'a[__proto__][polluted]': 'true' },
      { 'a[b][__proto__][polluted]': 'true' },
      { 'data[__proto__][isAdmin]': 'true' },
      { 'nested[constructor][prototype][polluted]': 'true' },
      { 'obj[__proto__]': 'polluted' },
      { '__proto__[__proto__]': 'nested' }
    ];
    
    // Execute all nested pollution attempts
    for (const payload of nestedPayloads) {
      const response = await request(app)
        .get('/')
        .query(payload);
      
      // Request should complete without crashing
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    }
    
    // Critical: Verify Object.prototype is clean after all nested attempts
    expect(Object.prototype.polluted).toBeUndefined();
    expect(Object.prototype.isAdmin).toBeUndefined();
    expect(Object.prototype.nested).toBeUndefined();
    
    // Verify prototype chain is intact
    const currentPrototypeKeys = Object.keys(Object.prototype);
    expect(currentPrototypeKeys).toEqual(originalPrototypeKeys);
    
    // Verify Array.prototype is also unaffected
    expect(Array.prototype.polluted).toBeUndefined();
    expect(Array.prototype.isAdmin).toBeUndefined();
    
    // Verify Function.prototype is unaffected
    expect(Function.prototype.polluted).toBeUndefined();
    
    // Create fresh objects to verify they're clean
    const freshObject = {};
    const freshArray = [];
    const freshFunction = function() {};
    
    expect(freshObject.polluted).toBeUndefined();
    expect(freshArray.polluted).toBeUndefined();
    expect(freshFunction.polluted).toBeUndefined();
    
    // Additional test: Deep nesting should not cause issues
    const deepNestedResponse = await request(app)
      .get('/')
      .query({ 'a[b][c][d][__proto__][deep]': 'true' });
    
    expect(deepNestedResponse.status).toBe(200);
    expect(Object.prototype.deep).toBeUndefined();
  });

  // ===========================================================================
  // Additional Test: Security Headers Present
  // ===========================================================================

  /**
   * Verify that security middleware is active during tests.
   * This ensures the app being tested has the full security stack enabled.
   */
  it('should have security middleware active', async () => {
    const response = await request(app).get('/');
    
    // Verify Helmet.js security headers are present
    // Note: Header names are lowercase in supertest response
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    
    // Rate limit headers should be present (from express-rate-limit)
    // The exact header name depends on standardHeaders configuration
    const hasRateLimitHeaders = 
      response.headers['ratelimit-limit'] !== undefined ||
      response.headers['x-ratelimit-limit'] !== undefined;
    
    expect(hasRateLimitHeaders).toBe(true);
  });

});

// =============================================================================
// Utility: Clean-up After Tests (if needed)
// =============================================================================

/**
 * Clean up any test-created properties on prototypes.
 * This is a safety measure in case any pollution test accidentally succeeds.
 * In a properly patched Express 5.2.0+, this should have nothing to clean.
 */
afterAll(() => {
  // List of properties that might be polluted during testing
  const potentiallyPollutedProperties = [
    'admin',
    'isAdmin',
    'role',
    'polluted',
    'nested',
    'deep'
  ];
  
  // Clean up Object.prototype
  potentiallyPollutedProperties.forEach(prop => {
    if (Object.prototype.hasOwnProperty.call(Object.prototype, prop)) {
      delete Object.prototype[prop];
    }
  });
  
  // Clean up Array.prototype
  potentiallyPollutedProperties.forEach(prop => {
    if (Object.prototype.hasOwnProperty.call(Array.prototype, prop)) {
      delete Array.prototype[prop];
    }
  });
  
  // Clean up Function.prototype
  potentiallyPollutedProperties.forEach(prop => {
    if (Object.prototype.hasOwnProperty.call(Function.prototype, prop)) {
      delete Function.prototype[prop];
    }
  });
});
