/**
 * @fileoverview Dedicated security header verification tests using Supertest.
 *
 * Validates that Helmet.js middleware (src/middleware/helmet.js) correctly
 * sets all expected protective HTTP response headers on every response and
 * removes the X-Powered-By header that would otherwise leak Express framework
 * identification. Tests cover the 13 default Helmet security headers across
 * all application endpoints (GET /, GET /evening) and 404 responses.
 *
 * Security headers verified:
 *   - Content-Security-Policy (restricts resource loading sources)
 *   - Strict-Transport-Security (enforces HTTPS connections)
 *   - X-Content-Type-Options (prevents MIME-type sniffing, value: 'nosniff')
 *   - X-Frame-Options (prevents clickjacking, value: 'SAMEORIGIN')
 *   - Cross-Origin-Opener-Policy (isolates browsing context)
 *   - Cross-Origin-Resource-Policy (restricts cross-origin resource loading)
 *   - X-DNS-Prefetch-Control (controls DNS prefetching)
 *   - X-Download-Options (prevents IE file execution)
 *   - X-Permitted-Cross-Domain-Policies (restricts Adobe cross-domain policies)
 *
 * Anti-patterns verified:
 *   - X-Powered-By header must be absent on all responses
 *
 * Follows the same Jest/Supertest patterns established in
 * tests/integration/endpoints.test.js (CommonJS, 'use strict', helper
 * functions, describe/test blocks with async/await).
 *
 * @module tests/security/headers
 * @see {@link module:src/middleware/helmet} Helmet configuration under test
 * @see {@link module:tests/integration/endpoints} Pattern reference
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request to the given path through the full Express middleware
 * stack (including Helmet) and returns the Supertest response.
 * @param {string} path - Request path (e.g. '/', '/evening', '/nonexistent')
 * @returns {Promise<SupertestResponse>} Supertest response with headers
 */
function get(path) {
  return request(app).get(path);
}

/**
 * List of security response headers that Helmet sets by default.
 * Used by the 'Headers on All Endpoints' suite to assert consistent
 * presence across every endpoint and error response.
 * @type {string[]}
 */
const EXPECTED_SECURITY_HEADERS = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-dns-prefetch-control',
  'x-download-options',
  'x-frame-options',
  'x-permitted-cross-domain-policies'
];

/**
 * Asserts that all expected security headers are present on the given
 * Supertest response.
 * @param {SupertestResponse} response - The HTTP response to inspect
 */
function assertAllSecurityHeadersPresent(response) {
  EXPECTED_SECURITY_HEADERS.forEach((header) => {
    expect(response.headers[header]).toBeDefined();
    expect(typeof response.headers[header]).toBe('string');
    expect(response.headers[header].length).toBeGreaterThan(0);
  });

  // X-Powered-By must always be absent
  expect(response.headers['x-powered-by']).toBeUndefined();
}

describe('Security Headers', () => {
  describe('Helmet Default Headers', () => {
    test('Response should include Content-Security-Policy header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(typeof response.headers['content-security-policy']).toBe('string');
      expect(response.headers['content-security-policy'].length).toBeGreaterThan(0);
      // Verify CSP contains at least the default-src directive configured in helmet.js
      expect(response.headers['content-security-policy']).toMatch(/default-src/);
      expect(response.headers['content-security-policy']).toMatch(/script-src/);
    });

    test('Response should include Strict-Transport-Security header on GET /', async () => {
      const response = await get('/');
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(typeof hsts).toBe('string');
      // HSTS must include max-age directive per the helmet.js configuration (31536000 seconds / 365 days)
      expect(hsts).toMatch(/max-age=\d+/);
      // Verify includeSubDomains is present as configured in helmet.js
      expect(hsts.toLowerCase()).toMatch(/includesubdomains/i);
    });

    test('Response should include X-Content-Type-Options header with value nosniff on GET /', async () => {
      const response = await get('/');
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Response should include X-Frame-Options header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['x-frame-options']).toBeDefined();
      // Helmet defaults to SAMEORIGIN to prevent clickjacking
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    test('Response should include Cross-Origin-Opener-Policy header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['cross-origin-opener-policy']).toBeDefined();
      // Helmet defaults to same-origin to isolate browsing context
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });

    test('Response should include Cross-Origin-Resource-Policy header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['cross-origin-resource-policy']).toBeDefined();
      // Helmet defaults to same-origin to restrict cross-origin resource loading
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
    });
  });

  describe('X-Powered-By Removal', () => {
    test('Response should NOT include X-Powered-By header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('Response should NOT include X-Powered-By header on GET /evening', async () => {
      const response = await get('/evening');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Headers on All Endpoints', () => {
    test('Security headers present on GET / response', async () => {
      const response = await get('/');
      expect(response.status).toBe(200);
      assertAllSecurityHeadersPresent(response);
    });

    test('Security headers present on GET /evening response', async () => {
      const response = await get('/evening');
      expect(response.status).toBe(200);
      assertAllSecurityHeadersPresent(response);
    });

    test('Security headers present on 404 responses', async () => {
      const response = await get('/nonexistent-path');
      expect(response.status).toBe(404);
      assertAllSecurityHeadersPresent(response);
    });
  });
});
