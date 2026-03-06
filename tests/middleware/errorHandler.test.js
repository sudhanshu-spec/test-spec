'use strict';

/**
 * Centralized Error Handler Middleware — Test Suite
 *
 * Unit tests for src/middleware/errorHandler.js, the centralized Express
 * error-handling middleware. Tests verify structured JSON error responses,
 * stack trace suppression in production, status code propagation, default
 * 500 behavior, error logging, Express 4-argument middleware signature,
 * and correct request-response cycle termination.
 *
 * All tests use mock objects for Express req/res/next — no HTTP server
 * or supertest required.
 *
 * @module tests/middleware/errorHandler.test
 */

const errorHandler = require('../../src/middleware/errorHandler');

describe('errorHandler', () => {
  /**
   * Preserve the original NODE_ENV so every test can safely mutate it
   * and afterEach will always restore the original value, preventing
   * cross-test pollution.
   */
  const originalNodeEnv = process.env.NODE_ENV;

  /** @type {Object} Minimal mock Express request object */
  let mockReq;

  /** @type {Object} Mock Express response object with chainable status() and json() */
  let mockRes;

  /** @type {jest.Mock} Mock Express next function */
  let mockNext;

  /** @type {jest.SpyInstance} Spy on console.error for verifying error logging */
  let consoleErrorSpy;

  beforeEach(() => {
    // Minimal mock request — errorHandler does not inspect req properties
    mockReq = {};

    // Mock response with chainable status() and json() methods.
    // headersSent defaults to false for normal flow tests.
    mockRes = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function to verify it is NOT called in normal flow
    mockNext = jest.fn();

    // Spy on console.error to verify error logging without polluting test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original NODE_ENV to prevent inter-test pollution
    process.env.NODE_ENV = originalNodeEnv;

    // Restore console.error to its original implementation
    consoleErrorSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Test Suite 6: Express Error Middleware Signature
  // ---------------------------------------------------------------------------
  describe('Express Error Middleware Signature', () => {
    test('errorHandler is a function with exactly 4 parameters', () => {
      expect(typeof errorHandler).toBe('function');
      // Express identifies error-handling middleware by its arity (parameter count).
      // If the function has fewer than 4 parameters, Express will NOT route errors to it.
      expect(errorHandler.length).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 1: Structured JSON Error Response Format
  // ---------------------------------------------------------------------------
  describe('Structured JSON Error Response Format', () => {
    test('returns structured JSON error response with status and message', () => {
      const err = { message: 'Something went wrong', status: 400, stack: 'Error: ...' };

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            status: 400,
            message: 'Something went wrong'
          })
        })
      );
    });

    test('returns consistent error envelope structure', () => {
      const err = { message: 'Test error', status: 422, stack: 'Error: ...' };

      errorHandler(err, mockReq, mockRes, mockNext);

      const responseBody = mockRes.json.mock.calls[0][0];

      // The top-level key must be 'error'
      expect(responseBody).toHaveProperty('error');

      // The 'error' value must be a plain object (not a string, array, or null)
      expect(typeof responseBody.error).toBe('object');
      expect(Array.isArray(responseBody.error)).toBe(false);
      expect(responseBody.error).not.toBeNull();

      // The error object must contain 'status' and 'message' properties
      expect(responseBody.error).toHaveProperty('status');
      expect(responseBody.error).toHaveProperty('message');
    });

    test('uses fallback message when err.message is falsy', () => {
      const err = { status: 503 };

      errorHandler(err, mockReq, mockRes, mockNext);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.message).toBe('Internal Server Error');
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 2: Stack Trace Suppression in Production Mode
  // ---------------------------------------------------------------------------
  describe('Stack Trace Suppression in Production Mode', () => {
    test('suppresses stack trace when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      const err = {
        message: 'Server Error',
        status: 500,
        stack: 'Error: Server Error\n    at Object.<anonymous> (/app/src/handler.js:10:15)'
      };

      errorHandler(err, mockReq, mockRes, mockNext);

      const responseBody = mockRes.json.mock.calls[0][0];

      // Stack trace must NOT be present in production
      expect(responseBody.error).not.toHaveProperty('stack');

      // Only safe fields should be returned
      expect(responseBody).toEqual({
        error: { status: 500, message: 'Server Error' }
      });
    });

    test('includes stack trace when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';

      const stackTrace = 'Error: Dev Error\n    at Object.<anonymous> (/app/src/handler.js:5:11)';
      const err = { message: 'Dev Error', status: 500, stack: stackTrace };

      errorHandler(err, mockReq, mockRes, mockNext);

      const responseBody = mockRes.json.mock.calls[0][0];

      // Stack trace MUST be present in non-production environments
      expect(responseBody.error).toHaveProperty('stack');
      expect(responseBody.error.stack).toBe(stackTrace);
    });

    test('includes stack trace when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';

      const stackTrace = 'Error: Test Error\n    at suite (/app/tests/test.js:3:7)';
      const err = { message: 'Test Error', status: 500, stack: stackTrace };

      errorHandler(err, mockReq, mockRes, mockNext);

      const responseBody = mockRes.json.mock.calls[0][0];

      // Non-production (test) must include stack trace
      expect(responseBody.error).toHaveProperty('stack');
      expect(responseBody.error.stack).toBe(stackTrace);
    });

    test('includes stack trace when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;

      const stackTrace = 'Error: Undefined Env\n    at fn (/app/src/index.js:1:1)';
      const err = { message: 'Undefined Env', status: 500, stack: stackTrace };

      errorHandler(err, mockReq, mockRes, mockNext);

      const responseBody = mockRes.json.mock.calls[0][0];

      // undefined !== 'production', so stack should be included
      expect(responseBody.error).toHaveProperty('stack');
      expect(responseBody.error.stack).toBe(stackTrace);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 3: Status Code Propagation
  // ---------------------------------------------------------------------------
  describe('Status Code Propagation', () => {
    test('uses err.status when available', () => {
      const err = { message: 'Bad Request', status: 400 };

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.status).toBe(400);
    });

    test('uses err.statusCode when err.status is not available', () => {
      const err = { message: 'Unauthorized', statusCode: 401 };

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.status).toBe(401);
    });

    test('err.status takes precedence over err.statusCode when both present', () => {
      // Per AAP Section 0.5.2: err.status || err.statusCode || 500
      // err.status is checked first, so 409 wins over 422
      const err = { message: 'Conflict', status: 409, statusCode: 422 };

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.status).toBe(409);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 4: Default 500 Status
  // ---------------------------------------------------------------------------
  describe('Default 500 Status', () => {
    test('defaults to 500 when error has no status or statusCode', () => {
      const err = { message: 'Unknown Error' };

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.status).toBe(500);
      expect(responseBody.error.message).toBe('Unknown Error');
    });

    test('defaults to 500 when both status and statusCode are undefined', () => {
      const err = new Error('Test error');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.error.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 5: Error Logging
  // ---------------------------------------------------------------------------
  describe('Error Logging', () => {
    test('logs the error to console.error', () => {
      const err = new Error('Logged error');

      errorHandler(err, mockReq, mockRes, mockNext);

      // The implementation calls console.error(err) with the full error object
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Suite 7: Does not call next()
  // ---------------------------------------------------------------------------
  describe('Does not call next()', () => {
    test('errorHandler does not call next() — it terminates the error handling chain', () => {
      const err = { message: 'Terminal error', status: 400 };

      errorHandler(err, mockReq, mockRes, mockNext);

      // The middleware sends a JSON response, ending the request-response cycle.
      // next() should NOT be called because the response is sent directly.
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Case: Headers Already Sent
  // ---------------------------------------------------------------------------
  describe('Headers Already Sent Edge Case', () => {
    test('delegates to next(err) when headers have already been sent', () => {
      // When res.headersSent is true, the errorHandler cannot send
      // a new response — it delegates to Express finalhandler via next(err).
      mockRes.headersSent = true;

      const err = new Error('Headers already sent');

      errorHandler(err, mockReq, mockRes, mockNext);

      // next(err) should be called to delegate to Express built-in handler
      expect(mockNext).toHaveBeenCalledWith(err);

      // res.status and res.json should NOT be called since headers are already sent
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('does not log error when headers have already been sent', () => {
      mockRes.headersSent = true;

      const err = new Error('Already sent');

      errorHandler(err, mockReq, mockRes, mockNext);

      // console.error should NOT be called — the error is delegated, not handled
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
