/**
 * @fileoverview Unit tests for middleware modules
 *
 * Tests for errorHandler (src/middleware/errorHandler.js) and
 * notFound (src/middleware/notFound.js) middleware functions.
 *
 * Uses mock request/response objects and mocks the Winston logger
 * to verify middleware behavior without actual HTTP connections.
 *
 * @module tests/unit/middleware
 */

'use strict';

// Mock the Winston logger to prevent actual log output during tests
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn()
}));

/**
 * Creates a mock Express request object.
 * @param {Object} [overrides={}] - Properties to override on the mock request
 * @returns {Object} Mock request object
 */
function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/test-path',
    url: '/test-path',
    headers: {},
    ...overrides
  };
}

/**
 * Creates a mock Express response object with chainable methods.
 * @returns {Object} Mock response object with jest.fn() methods
 */
function createMockResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    headersSent: false
  };
  // Enable method chaining: res.status(404).json(...)
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

/**
 * Creates a mock Express next function.
 * @returns {jest.Mock} Mock next function
 */
function createMockNext() {
  return jest.fn();
}

describe('Middleware Modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('errorHandler Middleware', () => {
    /** @type {Function} */
    let errorHandler;
    /** @type {Object} */
    let mockLogger;

    beforeEach(() => {
      jest.resetModules();
      // Re-mock after resetModules
      jest.mock('../../src/utils/logger', () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn()
      }));
      errorHandler = require('../../src/middleware/errorHandler');
      mockLogger = require('../../src/utils/logger');
    });

    test('should be a function with 4 parameters (Express error middleware signature)', () => {
      expect(typeof errorHandler).toBe('function');
      expect(errorHandler.length).toBe(4);
    });

    test('should return 500 status for errors without status code', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Something went wrong');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          message: 'Something went wrong'
        })
      );
    });

    test('should use err.status when provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Bad Request');
      err.status = 400;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'Bad Request'
        })
      );
    });

    test('should use err.statusCode when provided', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Not Found');
      err.statusCode = 404;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should log the error via Winston logger', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Test error');

      errorHandler(err, req, res, next);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('500'),
        expect.objectContaining({
          method: 'GET',
          url: '/test-path'
        })
      );
    });

    test('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      jest.mock('../../src/utils/logger', () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn()
      }));
      errorHandler = require('../../src/middleware/errorHandler');

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Dev error');

      errorHandler(err, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('stack');
    });

    test('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      jest.mock('../../src/utils/logger', () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn()
      }));
      errorHandler = require('../../src/middleware/errorHandler');

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Prod error');

      errorHandler(err, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
    });

    test('should return JSON response with status and message properties', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error('Validation failed');
      err.statusCode = 422;

      errorHandler(err, req, res, next);

      const jsonBody = res.json.mock.calls[0][0];
      expect(jsonBody).toHaveProperty('status');
      expect(jsonBody).toHaveProperty('message');
      expect(jsonBody.status).toBe(422);
      expect(jsonBody.message).toBe('Validation failed');
    });

    test('should delegate to Express default handler when headers already sent', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      res.headersSent = true;
      const next = createMockNext();
      const err = new Error('After headers sent');

      errorHandler(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should default message to Internal Server Error when err.message is empty', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const err = new Error();
      err.message = '';

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal Server Error'
        })
      );
    });
  });

  describe('notFound Middleware', () => {
    /** @type {Function} */
    let notFound;

    beforeEach(() => {
      jest.resetModules();
      jest.mock('../../src/utils/logger', () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn()
      }));
      notFound = require('../../src/middleware/notFound');
    });

    test('should be a function with 3 parameters', () => {
      expect(typeof notFound).toBe('function');
      expect(notFound.length).toBe(3);
    });

    test('should return 404 status code', () => {
      const req = createMockRequest({ originalUrl: '/nonexistent' });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return JSON response with error details', () => {
      const req = createMockRequest({ originalUrl: '/nonexistent' });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
          error: 'Not Found',
          path: '/nonexistent'
        })
      );
    });

    test('should include the requested path in the response', () => {
      const req = createMockRequest({ originalUrl: '/api/v1/missing' });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.path).toBe('/api/v1/missing');
    });

    test('should include a descriptive message', () => {
      const req = createMockRequest({ originalUrl: '/test' });
      const res = createMockResponse();
      const next = createMockNext();

      notFound(req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.message).toContain('/test');
      expect(jsonCall.message).toContain('not found');
    });
  });

  describe('Middleware Barrel Export', () => {
    test('should export errorHandler, notFound, and requestLogger from barrel', () => {
      jest.resetModules();
      jest.mock('../../src/utils/logger', () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn()
      }));
      const middleware = require('../../src/middleware');
      expect(middleware).toHaveProperty('errorHandler');
      expect(middleware).toHaveProperty('notFound');
      expect(middleware).toHaveProperty('requestLogger');
      expect(typeof middleware.errorHandler).toBe('function');
      expect(typeof middleware.notFound).toBe('function');
      expect(typeof middleware.requestLogger).toBe('function');
    });
  });
});
