/**
 * @fileoverview Dedicated security header verification tests.
 * Validates that Helmet.js middleware correctly sets all expected
 * protective HTTP response headers and removes identifying headers.
 * @module tests/security/headers
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * Makes a GET request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<import('supertest').Response>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

describe('Security Headers (Helmet)', () => {
  describe('Content-Security-Policy', () => {
    test('should include Content-Security-Policy header on root endpoint', async () => {
      const response = await get('/');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(typeof response.headers['content-security-policy']).toBe('string');
      expect(response.headers['content-security-policy'].length).toBeGreaterThan(0);
    });

    test('should include Content-Security-Policy header on /evening endpoint', async () => {
      const response = await get('/evening');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should include Content-Security-Policy header on 404 responses', async () => {
      const response = await get('/nonexistent');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should include directive keywords in Content-Security-Policy', async () => {
      const response = await get('/');
      const csp = response.headers['content-security-policy'];
      // Helmet default CSP includes at least default-src and script-src
      expect(csp).toMatch(/default-src/);
    });
  });

  describe('X-Content-Type-Options', () => {
    test('should set X-Content-Type-Options to nosniff on GET /', async () => {
      const response = await get('/');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should set X-Content-Type-Options to nosniff on GET /evening', async () => {
      const response = await get('/evening');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should set X-Content-Type-Options to nosniff on 404 responses', async () => {
      const response = await get('/nonexistent');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('X-Powered-By Removal', () => {
    test('should not expose X-Powered-By header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should not expose X-Powered-By header on GET /evening', async () => {
      const response = await get('/evening');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should not expose X-Powered-By header on 404 responses', async () => {
      const response = await get('/nonexistent');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('X-Frame-Options', () => {
    test('should include X-Frame-Options header on GET /', async () => {
      const response = await get('/');
      expect(response.headers['x-frame-options']).toBeDefined();
      // Helmet defaults to SAMEORIGIN
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    test('should include X-Frame-Options header on GET /evening', async () => {
      const response = await get('/evening');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('Cross-Origin-Opener-Policy', () => {
    test('should include Cross-Origin-Opener-Policy header', async () => {
      const response = await get('/');
      expect(response.headers['cross-origin-opener-policy']).toBeDefined();
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });
  });

  describe('Cross-Origin-Resource-Policy', () => {
    test('should include Cross-Origin-Resource-Policy header', async () => {
      const response = await get('/');
      expect(response.headers['cross-origin-resource-policy']).toBeDefined();
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
    });
  });

  describe('X-DNS-Prefetch-Control', () => {
    test('should include X-DNS-Prefetch-Control header set to off', async () => {
      const response = await get('/');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('Strict-Transport-Security', () => {
    test('should include Strict-Transport-Security header', async () => {
      const response = await get('/');
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      // HSTS should include max-age directive
      expect(hsts).toMatch(/max-age=/);
    });
  });

  describe('Header Consistency Across Endpoints', () => {
    test('should set consistent security headers on all endpoints', async () => {
      const rootResponse = await get('/');
      const eveningResponse = await get('/evening');

      // Both endpoints should share the same set of security headers
      const securityHeaders = [
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy',
        'x-dns-prefetch-control',
        'strict-transport-security'
      ];

      securityHeaders.forEach((header) => {
        expect(rootResponse.headers[header]).toBeDefined();
        expect(eveningResponse.headers[header]).toBeDefined();
        expect(rootResponse.headers[header]).toBe(eveningResponse.headers[header]);
      });
    });

    test('should not include X-Powered-By on any endpoint', async () => {
      const rootResponse = await get('/');
      const eveningResponse = await get('/evening');
      const notFoundResponse = await get('/does-not-exist');

      expect(rootResponse.headers['x-powered-by']).toBeUndefined();
      expect(eveningResponse.headers['x-powered-by']).toBeUndefined();
      expect(notFoundResponse.headers['x-powered-by']).toBeUndefined();
    });
  });
});
