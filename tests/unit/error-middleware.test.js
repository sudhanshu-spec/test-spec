/**
 * @fileoverview Unit tests for the error-handling middleware (src/middleware/error.middleware.js)
 *
 * Tests the centralized Express error-handling middleware for correct error
 * response structure, HTTP status code propagation, Winston logger integration,
 * production safety (stack trace suppression), and headers-already-sent delegation.
 *
 * @module tests/unit/error-middleware
 */

'use strict';

// Mock the Winston logger module before requiring error middleware.
// This prevents actual logger side effects in tests and enables
// verification of logger.error() calls with expected arguments.
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn()
}));

const errorHandler = require('../../src/middleware/error.middleware');
const logger = require('../../src/utils/logger');

/**
 * Creates a mock Express request object with standard properties.
 * @returns {{ method: string, originalUrl: string, headers: Object }} Mock request
 */
function createMockReq() {
  return {
    method: 'GET',
    originalUrl: '/test',
    headers: {}
  };
}

/**
 * Creates a mock Express response object with chainable status() and json() methods.
 * @returns {{ status: jest.Mock, json: jest.Mock, headersSent: boolean }} Mock response
 */
function createMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    headersSent: false
  };
}

/**
 * Creates a mock Express next function.
 * @returns {jest.Mock} Mock next function
 */
function createMockNext() {
  return jest.fn();
}

describe('Error Middleware', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  /** @type {Object} */
  let mockReq;
  /** @type {Object} */
  let mockRes;
  /** @type {jest.Mock} */
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockReq();
    mockRes = createMockRes();
    mockNext = createMockNext();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Export', () => {
    test('should export a function', () => {
      expect(typeof errorHandler).toBe('function');
    });

    test('should have error middleware signature (4 arguments)', () => {
      expect(errorHandler.length).toBe(4);
    });
  });

  describe('Error Response', () => {
    test('should return structured JSON error response', () => {
      const err = new Error('Test error');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          statusCode: 500,
          message: 'Test error'
        })
      );
    });

    test('should use default message for errors without message', () => {
      const err = new Error();
      err.message = '';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          statusCode: 500,
          message: 'Internal Server Error'
        })
      );
    });

    test('should delegate to next when headers already sent', () => {
      const err = new Error('Stream error');
      mockRes.headersSent = true;

      errorHandler(err, mockReq, mockRes, mockNext);

      // When headers are already sent, Express's built-in error handler
      // should be invoked via next(err) to gracefully close the connection
      expect(mockNext).toHaveBeenCalledWith(err);
      // Should NOT attempt to send a new response
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('Status Code Propagation', () => {
    test('should use err.status when provided', () => {
      const err = new Error('Not Found');
      err.status = 404;

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404
        })
      );
    });

    test('should use err.statusCode when provided', () => {
      const err = new Error('Forbidden');
      err.statusCode = 403;

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403
        })
      );
    });

    test('should default to 500 when no status code provided', () => {
      const err = new Error('Generic error');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500
        })
      );
    });

    test('should prefer err.status over err.statusCode', () => {
      const err = new Error('Conflict');
      err.status = 409;
      err.statusCode = 422;

      errorHandler(err, mockReq, mockRes, mockNext);

      // err.status takes precedence due to short-circuit evaluation
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409
        })
      );
    });
  });

  describe('Logging', () => {
    test('should log error via Winston logger', () => {
      const err = new Error('Test error');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test('should log error message', () => {
      const err = new Error('Specific error message');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Specific error message',
        expect.objectContaining({
          statusCode: 500,
          url: '/test',
          method: 'GET'
        })
      );
    });

    test('should include error stack in log metadata', () => {
      const err = new Error('Error with stack');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Error with stack',
        expect.objectContaining({
          stack: expect.any(String)
        })
      );
    });

    test('should log even when headers already sent', () => {
      const err = new Error('Late error');
      mockRes.headersSent = true;

      errorHandler(err, mockReq, mockRes, mockNext);

      // Logger should always be called regardless of headersSent state
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Late error',
        expect.objectContaining({
          statusCode: 500,
          url: '/test',
          method: 'GET'
        })
      );
    });
  });

  describe('Production Safety', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    test('should NOT include stack trace in response when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      // Re-require modules after resetting to pick up new NODE_ENV value.
      // The jest.mock() registration persists across resetModules, so the
      // logger module remains mocked with fresh jest.fn() instances.
      const freshErrorHandler = require('../../src/middleware/error.middleware');
      const freshRes = createMockRes();
      const err = new Error('Production error');

      freshErrorHandler(err, createMockReq(), freshRes, createMockNext());

      const responseBody = freshRes.json.mock.calls[0][0];
      expect(responseBody).not.toHaveProperty('stack');
      expect(responseBody).toEqual(
        expect.objectContaining({
          status: 'error',
          statusCode: 500,
          message: 'Production error'
        })
      );
    });

    test('should include stack trace in response when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';

      // Re-require modules after resetting to pick up new NODE_ENV value
      const freshErrorHandler = require('../../src/middleware/error.middleware');
      const freshRes = createMockRes();
      const err = new Error('Development error');

      freshErrorHandler(err, createMockReq(), freshRes, createMockNext());

      const responseBody = freshRes.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('stack');
      expect(typeof responseBody.stack).toBe('string');
      expect(responseBody.stack).toContain('Development error');
    });
  });
});
