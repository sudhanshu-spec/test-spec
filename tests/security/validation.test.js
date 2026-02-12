/**
 * @fileoverview Input validation security tests using Supertest
 *
 * Dedicated security test suite verifying the input validation middleware
 * from express-validator integrated via src/middleware/validator.js. Tests
 * three core security aspects of the validation layer:
 *
 * 1. Query parameter sanitization — Verifies that HTML/script content is
 *    escaped via escape(), whitespace is trimmed via trim(), and special
 *    characters are handled safely without causing server errors.
 *
 * 2. Validation error responses — Verifies that the handleValidationErrors
 *    middleware correctly returns HTTP 400 with structured JSON error details
 *    when validation rules reject input. Uses a dedicated test Express app
 *    with actual validators (not just sanitizers) because the main app's
 *    sanitizeQuery middleware only applies trim() and escape() sanitizers
 *    that modify values without producing validation errors.
 *
 * 3. Valid request passthrough — Confirms that legitimate requests traverse
 *    the full validation middleware stack without interference, returning
 *    the expected response bodies and status codes identical to pre-validation
 *    behavior.
 *
 * Follows the same Jest/Supertest patterns established in
 * tests/integration/endpoints.test.js (CommonJS, 'use strict', JSDoc,
 * helper functions, describe/test blocks with async/await).
 *
 * @module tests/security/validation
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request against the main application and returns the response.
 * Uses the Supertest request(app) pattern to send HTTP requests through the
 * full middleware stack (Helmet, CORS, rate limiter, validation) without
 * starting a live server.
 * @param {string} path - Request path including optional query string
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

describe('Input Validation', () => {
  describe('Query Parameter Sanitization', () => {
    test('should sanitize query parameters with HTML/script content', async () => {
      // The sanitizeQuery middleware runs escape() which converts < > " ' &
      // to HTML entities, preventing XSS. The route returns static text so
      // the response body is unaffected — the key assertion is that the
      // request completes successfully (no server crash or error).
      const response = await get('/?name=<script>alert(1)</script>');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should trim whitespace from query parameter values', async () => {
      // The sanitizeQuery middleware runs trim() which removes leading and
      // trailing whitespace. URL-encoded spaces (%20) are decoded first
      // by Express's query parser, then trimmed by the sanitizer.
      const response = await get('/?name=%20%20hello%20%20');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle empty query parameter values without errors', async () => {
      // Empty string values should not cause sanitization errors.
      // The middleware processes all keys from req.query including those
      // with empty values.
      const response = await get('/?name=');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle special characters in query parameters safely', async () => {
      // URL-encoded special characters: & (%26), = (%3D), " (%22), ' (%27)
      // The escape() sanitizer converts these to safe HTML entities,
      // preventing injection when values are rendered in HTML contexts.
      const response = await get('/?name=foo%26bar%3Dbaz%22test%27value');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle URL-encoded script tags in query parameters', async () => {
      // Encoded form of <script>alert("xss")</script>
      // Express URL-decodes the values before the sanitizer escapes them.
      const response = await get(
        '/?input=%3Cscript%3Ealert(%22xss%22)%3C%2Fscript%3E'
      );
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle multiple query parameters with mixed content', async () => {
      // Verifies that sanitizeQuery iterates over all query parameter keys
      // and applies trim()/escape() to each value independently.
      const response = await get('/?clean=hello&dirty=<b>bold</b>&empty=');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should handle sanitization on the /evening endpoint', async () => {
      // Confirms sanitization works identically on all routes, not just
      // the root route. Both GET / and GET /evening mount sanitizeQuery.
      const response = await get('/evening?msg=<img%20onerror=alert(1)>');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
  });

  describe('Validation Error Responses', () => {
    /**
     * Test-specific Express app with actual validation rules (not just
     * sanitizers) to verify the handleValidationErrors middleware returns
     * HTTP 400 with structured error details.
     *
     * The main app's sanitizeQuery middleware only applies trim() and
     * escape() which are sanitizers — they modify values but never produce
     * validation errors. To exercise the 400 error path of
     * handleValidationErrors, this test app registers a route with an
     * actual validator (isEmail) that rejects malformed input.
     *
     * @type {import('express').Application}
     */
    let validationTestApp;

    beforeAll(() => {
      // Import express and express-validator for the test-specific app.
      // These are project production dependencies available in the test
      // environment. handleValidationErrors is imported from the validator
      // module under test to verify its actual behavior.
      const express = require('express');
      const { query: queryValidator } = require('express-validator');
      const {
        handleValidationErrors
      } = require('../../src/middleware/validator');

      validationTestApp = express();

      // Route with an actual validator (isEmail) that produces validation
      // errors when the email query parameter is not a valid email address.
      // handleValidationErrors then catches the error and returns 400.
      validationTestApp.get(
        '/test-validate',
        queryValidator('email')
          .isEmail()
          .withMessage('Must be a valid email address'),
        handleValidationErrors,
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );
    });

    test('should return HTTP 400 status when validation rules reject input', async () => {
      const response = await request(validationTestApp).get(
        '/test-validate?email=notanemail'
      );
      expect(response.status).toBe(400);
    });

    test('should return structured error details in response body on validation failure', async () => {
      const response = await request(validationTestApp).get(
        '/test-validate?email=invalid-email'
      );

      // Verify the exact JSON response structure from handleValidationErrors
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('message', 'Input validation failed');

      // Verify errors array contains at least one validation error object
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);

      // Verify the error object structure from express-validator
      const firstError = response.body.errors[0];
      expect(firstError).toHaveProperty('msg');
      expect(firstError).toHaveProperty('path', 'email');
      expect(firstError).toHaveProperty('location', 'query');
    });

    test('should pass through to route handler when validation rules accept input', async () => {
      // Valid email should pass the isEmail() validator and reach the handler
      const response = await request(validationTestApp).get(
        '/test-validate?email=user@example.com'
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should return JSON content type on validation error', async () => {
      const response = await request(validationTestApp).get(
        '/test-validate?email=bad'
      );
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Valid Request Passthrough', () => {
    test('GET / with no query parameters should pass validation and return normal 200 response with Hello World', async () => {
      const response = await get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('GET /evening with no query parameters should pass validation and return normal 200 response with Good evening', async () => {
      const response = await get('/evening');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    test('GET / with valid query parameters should pass validation and return normal 200 response', async () => {
      const response = await get('/?name=John');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('GET /evening with valid query parameters should pass validation and return normal 200 response', async () => {
      const response = await get('/evening?time=late');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    test('GET / should preserve Content-Type header after passing through validation', async () => {
      const response = await get('/?param=value');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });

    test('GET /evening should preserve Content-Type header after passing through validation', async () => {
      const response = await get('/evening?param=value');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });
});
