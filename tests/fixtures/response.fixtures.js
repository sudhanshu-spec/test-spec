'use strict';

/**
 * HTTP Response Test Fixtures Module
 * 
 * Provides expected response data for endpoint validation in integration tests.
 * Contains exact response body strings, HTTP status codes, header definitions,
 * regex patterns for header matching, complete endpoint definitions, and
 * undefined route paths for 404 testing.
 * 
 * Response body values are derived from src/routes/main.routes.js to ensure
 * exact behavioral compatibility in tests.
 * 
 * @module tests/fixtures/response.fixtures
 * @see Section 0.4.4 - Test Data and Fixtures Design
 * @see Section 0.10.4 - Response Validation Rules
 */

/**
 * HTTP Response Test Fixtures
 * 
 * @typedef {Object} ResponseFixtures
 * @property {Object} bodies - Exact response body strings for each endpoint
 * @property {Object} statusCodes - HTTP status codes for different response types
 * @property {Object} headers - Expected HTTP header values
 * @property {Object} patterns - Regex patterns for header matching (supertest compatible)
 * @property {Object} endpoints - Complete endpoint definitions for integration tests
 * @property {string[]} undefinedRoutes - Array of undefined route paths for 404 testing
 */

/**
 * Exact response body strings for endpoint validation.
 * Values must match exactly what the route handlers return,
 * including any whitespace or newline characters.
 * 
 * @type {Object}
 * @property {string} root - Response body for GET / endpoint (14 characters with trailing newline)
 * @property {string} evening - Response body for GET /evening endpoint (12 characters, no newline)
 */
const bodies = {
  /**
   * Root endpoint response body
   * Exact match to src/routes/main.routes.js line 27: res.send('Hello, World!\n')
   * Length: 14 characters including trailing newline character
   */
  root: 'Hello, World!\n',

  /**
   * Evening endpoint response body
   * Exact match to src/routes/main.routes.js line 38: res.send('Good evening')
   * Length: 12 characters without trailing newline
   */
  evening: 'Good evening'
};

/**
 * HTTP status codes for response validation.
 * Standard HTTP status codes used across the application.
 * 
 * @type {Object}
 * @property {number} ok - 200 OK - Successful request
 * @property {number} notFound - 404 Not Found - Route not defined
 * @property {number} serverError - 500 Internal Server Error - Server-side error
 */
const statusCodes = {
  /**
   * 200 OK - Standard response for successful HTTP requests
   */
  ok: 200,

  /**
   * 404 Not Found - Route does not exist
   */
  notFound: 404,

  /**
   * 500 Internal Server Error - Generic server error
   */
  serverError: 500
};

/**
 * Expected HTTP header values for response validation.
 * Express default Content-Type headers for different response types.
 * 
 * @type {Object}
 * @property {string} contentTypeHtml - Content-Type for res.send() with string body
 * @property {string} contentTypeJson - Content-Type for res.json() responses
 */
const headers = {
  /**
   * Content-Type header for HTML text responses
   * Express default for res.send() with string body
   */
  contentTypeHtml: 'text/html; charset=utf-8',

  /**
   * Content-Type header for JSON responses
   * Express default for res.json() responses
   */
  contentTypeJson: 'application/json; charset=utf-8'
};

/**
 * Regex patterns for HTTP header matching.
 * Compatible with supertest's expect() header assertions.
 * Use these patterns for flexible header validation that doesn't
 * require exact string matching.
 * 
 * @type {Object}
 * @property {RegExp} contentTypeHtml - Pattern to match text/html content type
 * @property {RegExp} charset - Pattern to match UTF-8 charset declaration
 */
const patterns = {
  /**
   * Matches Content-Type headers containing text/html
   * Use with supertest: .expect('Content-Type', patterns.contentTypeHtml)
   */
  contentTypeHtml: /text\/html/,

  /**
   * Matches headers containing UTF-8 charset declaration
   * Use with supertest: .expect('Content-Type', patterns.charset)
   */
  charset: /charset=utf-8/
};

/**
 * Complete endpoint definitions for integration tests.
 * Combines path, method, expected body, status, and content type
 * for comprehensive endpoint validation.
 * 
 * @type {Object}
 * @property {Object} root - Definition for GET / endpoint
 * @property {Object} evening - Definition for GET /evening endpoint
 * @property {Object} notFound - Definition for 404 response testing
 */
const endpoints = {
  /**
   * Root endpoint definition
   * GET / - Returns Hello World greeting with newline
   */
  root: {
    path: '/',
    method: 'GET',
    expectedBody: 'Hello, World!\n',
    expectedStatus: 200,
    expectedContentType: /text\/html/
  },

  /**
   * Evening endpoint definition
   * GET /evening - Returns evening greeting without newline
   */
  evening: {
    path: '/evening',
    method: 'GET',
    expectedBody: 'Good evening',
    expectedStatus: 200,
    expectedContentType: /text\/html/
  },

  /**
   * Not Found endpoint definition
   * Used to test 404 responses for undefined routes
   */
  notFound: {
    path: '/nonexistent',
    method: 'GET',
    expectedStatus: 404
  }
};

/**
 * Array of undefined route paths for 404 testing.
 * These paths do not exist in the application and should
 * return 404 Not Found responses.
 * 
 * @type {string[]}
 */
const undefinedRoutes = [
  '/undefined',
  '/api',
  '/users',
  '/test',
  '/hello',
  '/notfound',
  '/random',
  '/missing'
];

/**
 * Response fixtures export object
 * Combines all fixture categories for easy import in test files
 */
module.exports = {
  /**
   * Exact response body strings
   * @see bodies
   */
  bodies,

  /**
   * HTTP status codes
   * @see statusCodes
   */
  statusCodes,

  /**
   * Expected HTTP headers
   * @see headers
   */
  headers,

  /**
   * Regex patterns for header matching
   * @see patterns
   */
  patterns,

  /**
   * Complete endpoint definitions
   * @see endpoints
   */
  endpoints,

  /**
   * Undefined route paths for 404 testing
   * @see undefinedRoutes
   */
  undefinedRoutes
};
