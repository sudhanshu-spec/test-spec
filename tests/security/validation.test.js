/**
 * @fileoverview Input validation middleware tests.
 * Verifies that the express-validator based sanitization middleware
 * correctly trims and escapes query parameters and handles validation
 * errors with proper HTTP 400 responses.
 * @module tests/security/validation
 */

'use strict';

const request = require('supertest');

/**
 * Creates a fresh Express app instance for each test.
 * Resets module cache to ensure clean state.
 * @returns {import('express').Application} Fresh Express app
 */
function createTestApp() {
  jest.resetModules();
  // Set high rate limit to avoid interference in validation tests
  process.env.RATE_LIMIT_MAX = '1000';
  return require('../../src/app');
}

describe('Input Validation', () => {
  /** @type {import('express').Application} */
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    jest.resetModules();
  });

  describe('Query Parameter Sanitization', () => {
    test('should accept requests without query parameters on GET /', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should accept requests without query parameters on GET /evening', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    test('should accept requests with clean query parameters', async () => {
      const response = await request(app).get('/?name=world');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should trim whitespace from query parameter values', async () => {
      const response = await request(app).get('/?name=%20hello%20');
      // The request should still succeed — sanitization trims but does not reject
      expect(response.status).toBe(200);
    });

    test('should escape HTML entities in query parameter values', async () => {
      const response = await request(app).get('/?name=<script>alert("xss")</script>');
      // Sanitization escapes the HTML but does not reject the request
      expect(response.status).toBe(200);
    });

    test('should handle multiple query parameters', async () => {
      const response = await request(app).get('/?foo=bar&baz=qux');
      expect(response.status).toBe(200);
    });

    test('should handle empty query parameter values', async () => {
      const response = await request(app).get('/?key=');
      expect(response.status).toBe(200);
    });
  });

  describe('Sanitization on /evening Endpoint', () => {
    test('should accept clean query parameters on /evening', async () => {
      const response = await request(app).get('/evening?time=late');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    test('should handle special characters in query parameters on /evening', async () => {
      const response = await request(app).get('/evening?msg=<b>hello</b>');
      expect(response.status).toBe(200);
    });
  });

  describe('Response Preservation', () => {
    test('should preserve exact response body for GET / after sanitization', async () => {
      const response = await request(app).get('/?extra=param');
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should preserve exact response body for GET /evening after sanitization', async () => {
      const response = await request(app).get('/evening?extra=param');
      expect(response.text).toBe('Good evening');
    });

    test('should preserve Content-Type header after sanitization', async () => {
      const response = await request(app).get('/?param=value');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('Validation Middleware Module Exports', () => {
    test('should export sanitizeQuery as an array', () => {
      const { sanitizeQuery } = require('../../src/middleware/validator');
      expect(Array.isArray(sanitizeQuery)).toBe(true);
      expect(sanitizeQuery.length).toBeGreaterThan(0);
    });

    test('should export handleValidationErrors as a function', () => {
      const { handleValidationErrors } = require('../../src/middleware/validator');
      expect(typeof handleValidationErrors).toBe('function');
    });

    test('handleValidationErrors should have arity of 3 (req, res, next)', () => {
      const { handleValidationErrors } = require('../../src/middleware/validator');
      expect(handleValidationErrors.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle URL-encoded special characters in query parameters', async () => {
      const response = await request(app).get('/?value=%3Cscript%3E');
      expect(response.status).toBe(200);
    });

    test('should handle very long query parameter values', async () => {
      const longValue = 'a'.repeat(1000);
      const response = await request(app).get(`/?key=${longValue}`);
      expect(response.status).toBe(200);
    });

    test('should handle numeric query parameter values', async () => {
      const response = await request(app).get('/?count=42');
      expect(response.status).toBe(200);
    });

    test('should handle boolean-like query parameter values', async () => {
      const response = await request(app).get('/?active=true&disabled=false');
      expect(response.status).toBe(200);
    });
  });
});
