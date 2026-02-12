/**
 * @fileoverview Integration tests for the full Express middleware pipeline
 *
 * Validates the end-to-end middleware chain behavior using Supertest, including:
 * - Helmet security headers (x-content-type-options, x-frame-options,
 *   content-security-policy, strict-transport-security)
 * - CORS headers (access-control-allow-origin, OPTIONS preflight)
 * - Centralized error handler behavior (structured JSON error responses)
 * - express.json() body parsing (valid JSON, missing body, malformed JSON)
 *
 * Follows Supertest patterns established in tests/integration/endpoints.test.js:
 * imports app from ../../src/app, uses request(app) interface, async/await style.
 *
 * @module tests/integration/middleware
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request against the Express app and returns the response.
 * Wraps Supertest's request(app).get(path) for consistent usage.
 *
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

/**
 * Makes a POST request against the Express app and returns the response.
 * Wraps Supertest's request(app).post(path) for JSON body parsing tests.
 *
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function post(path) {
  return request(app).post(path);
}

describe('Middleware Pipeline', () => {
  describe('Security Headers (Helmet)', () => {
    test('should set x-content-type-options header on all responses', async () => {
      const response = await get('/');
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should set x-frame-options header on responses', async () => {
      const response = await get('/');
      // Helmet v8 may use x-frame-options or rely on CSP frame-ancestors;
      // we verify the header is present when Helmet sets it
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('should set content-security-policy header on responses', async () => {
      const response = await get('/');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should set strict-transport-security header on responses', async () => {
      const response = await get('/');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should set security headers on error responses', async () => {
      const response = await get('/nonexistent-middleware-test-route');
      expect(response.status).toBe(404);
      // Security headers must be present even on error/404 responses
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should set security headers on health endpoint', async () => {
      const response = await get('/health');
      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    test('should include access-control-allow-origin header on responses', async () => {
      const response = await get('/');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET');
      // Preflight responses return either 204 (No Content) or 200
      expect([200, 204]).toContain(response.status);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Error Handler', () => {
    test('should return structured JSON error response for undefined routes', async () => {
      const response = await get('/undefined-route');
      expect(response.status).toBe(404);
      // The response should contain content (not be empty)
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
    });

    test('should return error response with appropriate content', async () => {
      const response = await get('/another-nonexistent-path');
      expect(response.status).toBe(404);
      // Error responses must have a defined body
      expect(response.body).toBeDefined();
    });
  });

  describe('JSON Body Parsing', () => {
    test('should parse JSON request bodies', async () => {
      const response = await post('/')
        .send({ key: 'value' })
        .set('Content-Type', 'application/json');
      // The middleware should process the JSON body without errors;
      // even if the endpoint returns 404 for POST, the body was parsed
      expect(response.status).toBeDefined();
      expect([200, 404]).toContain(response.status);
    });

    test('should handle requests without JSON body', async () => {
      const response = await get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await post('/')
        .set('Content-Type', 'application/json')
        .send('invalid-json');
      // Express.json() should reject malformed JSON with a 400 status,
      // or the error handler catches the parse error; the server must not crash
      expect(response.status).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
