'use strict';

/**
 * Unit Tests for 404 Not Found Handler Middleware
 *
 * Tests the src/middleware/notFoundHandler.js module which provides a
 * catch-all middleware that intercepts requests matching no defined route
 * and responds with a structured 404 JSON response. This replaces the
 * Express default 'Cannot GET /path' text response with consistent,
 * machine-parseable error formatting.
 *
 * Test coverage includes:
 * - Structured JSON response format verification
 * - HTTP 404 status code setting
 * - Middleware function signature validation (3-argument, not 4)
 * - Request termination behavior (next() not called)
 * - Various URL path patterns including query strings
 *
 * @module tests/middleware/notFoundHandler.test
 */

const notFoundHandler = require('../../src/middleware/notFoundHandler');

describe('notFoundHandler middleware', () => {
  /**
   * Mock objects for Express request, response, and next function.
   * Reset before each test to ensure full isolation.
   */
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Fresh mock request object with a default originalUrl
    mockReq = {
      originalUrl: '/nonexistent-path'
    };

    // Mock response object with chainable status() and json() methods
    // Mimics Express response chaining pattern: res.status(code).json(body)
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function to verify it is NOT called
    mockNext = jest.fn();
  });

  // ---------------------------------------------------------------------------
  // Test Suite 1: Response Format
  // ---------------------------------------------------------------------------
  describe('Response Format', () => {
    test('returns structured JSON 404 response for unknown paths', () => {
      mockReq.originalUrl = '/some/unknown/path';

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          status: 404,
          message: 'Not Found',
          path: '/some/unknown/path'
        }
      });
    });

    test('response includes path property matching req.originalUrl', () => {
      mockReq.originalUrl = '/api/v2/missing-endpoint';

      notFoundHandler(mockReq, mockRes, mockNext);

      // Extract the argument passed to res.json()
      const jsonCallArg = mockRes.json.mock.calls[0][0];
      expect(jsonCallArg.error.path).toBe('/api/v2/missing-endpoint');
      // Confirm path exactly matches the req.originalUrl value
      expect(jsonCallArg.error.path).toBe(mockReq.originalUrl);
    });

    test('handles root-level unknown paths', () => {
      mockReq.originalUrl = '/unknown';

      notFoundHandler(mockReq, mockRes, mockNext);

      const jsonCallArg = mockRes.json.mock.calls[0][0];
      expect(jsonCallArg.error.path).toBe('/unknown');
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 2: HTTP Status Code
  // ---------------------------------------------------------------------------
  describe('HTTP Status Code', () => {
    test('sets HTTP 404 status code on the response', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      // status() must be called exactly once with 404
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      // json() must be called exactly once (response body sent once)
      expect(mockRes.json).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 3: Middleware Signature
  // ---------------------------------------------------------------------------
  describe('Middleware Signature', () => {
    test('notFoundHandler is a function with 3 parameters', () => {
      // Verify it is a callable function
      expect(typeof notFoundHandler).toBe('function');
      // Express identifies error-handling middleware by 4 parameters.
      // This middleware must have exactly 3 parameters so Express treats
      // it as regular middleware, not an error handler.
      expect(notFoundHandler.length).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 4: Does not call next()
  // ---------------------------------------------------------------------------
  describe('Request Termination', () => {
    test('notFoundHandler does not call next() — it terminates the request', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      // The middleware sends a response, ending the request cycle.
      // next() must NOT be called — doing so would pass control to the
      // error handler or the next middleware in the stack.
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 5: Various Path Patterns
  // ---------------------------------------------------------------------------
  describe('Various Path Patterns', () => {
    test('handles paths with query strings in originalUrl', () => {
      mockReq.originalUrl = '/missing?foo=bar';

      notFoundHandler(mockReq, mockRes, mockNext);

      const jsonCallArg = mockRes.json.mock.calls[0][0];
      // originalUrl preserves the query string; path property must match
      expect(jsonCallArg.error.path).toBe('/missing?foo=bar');
    });

    test('handles deeply nested unknown paths', () => {
      mockReq.originalUrl = '/api/v3/users/123/settings/preferences';

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      const jsonCallArg = mockRes.json.mock.calls[0][0];
      expect(jsonCallArg.error.path).toBe('/api/v3/users/123/settings/preferences');
      expect(jsonCallArg.error.status).toBe(404);
      expect(jsonCallArg.error.message).toBe('Not Found');
    });

    test('handles paths with hash fragments in originalUrl', () => {
      mockReq.originalUrl = '/page#section';

      notFoundHandler(mockReq, mockRes, mockNext);

      const jsonCallArg = mockRes.json.mock.calls[0][0];
      expect(jsonCallArg.error.path).toBe('/page#section');
    });

    test('handles paths with encoded characters in originalUrl', () => {
      mockReq.originalUrl = '/search?q=hello%20world';

      notFoundHandler(mockReq, mockRes, mockNext);

      const jsonCallArg = mockRes.json.mock.calls[0][0];
      expect(jsonCallArg.error.path).toBe('/search?q=hello%20world');
    });
  });
});
