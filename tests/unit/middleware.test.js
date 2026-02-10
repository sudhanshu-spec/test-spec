/**
 * @fileoverview Unit tests for middleware pipeline, error handler, and request logger
 *
 * Tests the middleware layer consisting of:
 * - src/middleware/index.js — applyMiddleware pipeline orchestrator
 * - src/middleware/errorHandler.js — centralized Express error handler
 * - src/middleware/requestLogger.js — Morgan/Winston HTTP request logger
 *
 * Validates that:
 * - applyMiddleware registers exactly 5 middleware in the correct order
 * - errorHandler has the 4-argument Express error handler signature
 * - errorHandler returns structured JSON error responses with correct status codes
 * - errorHandler sanitizes 500-level errors in production environments
 * - errorHandler logs all errors through the Winston structured logging pipeline
 * - requestLogger is a configured Morgan middleware function instance
 *
 * @module tests/unit/middleware
 */

'use strict';

// ---------- Module mocks (hoisted by Jest before all require() calls) ----------

// Mock Winston logger to isolate tests from file/console transports and
// to verify that errorHandler calls logger.error() during error handling
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
  stream: {
    write: jest.fn()
  }
}));

// Mock helmet to return an identifiable middleware sentinel for order verification.
// The factory returns a unique jest.fn() so we can assert it was passed to app.use
// at the correct position in the middleware registration sequence.
jest.mock('helmet', () => {
  const helmetMiddleware = jest.fn();
  const helmet = jest.fn(() => helmetMiddleware);
  return helmet;
});

// Mock cors to return an identifiable middleware sentinel for order verification.
// Allows assertion that cors() was called with the correct origin config and
// that its return value was registered at position 2 in the middleware sequence.
jest.mock('cors', () => {
  const corsMiddleware = jest.fn();
  const cors = jest.fn(() => corsMiddleware);
  return cors;
});

// ---------- Module imports ----------

const { applyMiddleware } = require('../../src/middleware');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { requestLogger } = require('../../src/middleware/requestLogger');
const logger = require('../../src/utils/logger');

// ---------- Test helper functions ----------

/**
 * Creates a mock Express application object with a jest.fn() for the use method.
 * Used to capture and verify middleware registration calls made by applyMiddleware.
 *
 * @returns {{ use: jest.Mock }} Mock Express application object
 */
function createMockApp() {
  return {
    use: jest.fn()
  };
}

/**
 * Creates a mock Express response object with chainable status() and json() methods.
 * The status() method returns `this` to support Express's fluent chaining pattern:
 * res.status(500).json({ error: 'message' })
 *
 * @returns {{ status: jest.Mock, json: jest.Mock }} Mock Express response object
 */
function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  return res;
}

/**
 * Creates a mock Express request object with standard HTTP request properties.
 * Properties match those accessed by errorHandler: method, originalUrl.
 *
 * @param {Object} [overrides] - Optional property overrides for specific test scenarios
 * @returns {Object} Mock Express request object
 */
function createMockReq(overrides) {
  return {
    method: 'GET',
    originalUrl: '/test',
    ip: '127.0.0.1',
    ...overrides
  };
}

// ---------- Test lifecycle ----------

// Clear all mock call counts and instances between tests to ensure
// each test runs with a clean mock state and no cross-test pollution
beforeEach(() => {
  jest.clearAllMocks();
});

// ---------- Middleware Pipeline Tests ----------

describe('Middleware Pipeline - index.js', () => {
  describe('applyMiddleware Export', () => {
    test('should be defined and be a function', () => {
      expect(applyMiddleware).toBeDefined();
      expect(typeof applyMiddleware).toBe('function');
    });
  });

  describe('Middleware Registration', () => {
    test('should register exactly 5 middleware on the app', () => {
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      // 5 middleware: helmet, cors, express.json, express.urlencoded, requestLogger
      expect(mockApp.use).toHaveBeenCalledTimes(5);
    });

    test('should pass a function to app.use for each middleware registration', () => {
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      mockApp.use.mock.calls.forEach((call) => {
        expect(typeof call[0]).toBe('function');
      });
    });

    test('should not throw when called with a valid app object', () => {
      const mockApp = createMockApp();

      expect(() => applyMiddleware(mockApp)).not.toThrow();
    });
  });

  describe('Middleware Ordering', () => {
    test('should register helmet as the first middleware', () => {
      const helmet = require('helmet');
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      expect(helmet).toHaveBeenCalledTimes(1);
      expect(mockApp.use.mock.calls[0][0]).toBe(helmet.mock.results[0].value);
    });

    test('should register cors as the second middleware with origin config', () => {
      const cors = require('cors');
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      expect(cors).toHaveBeenCalledTimes(1);
      expect(cors).toHaveBeenCalledWith(
        expect.objectContaining({ origin: expect.anything() })
      );
      expect(mockApp.use.mock.calls[1][0]).toBe(cors.mock.results[0].value);
    });

    test('should register body parser middleware as third and fourth', () => {
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      // express.json() and express.urlencoded() produce real middleware functions
      expect(typeof mockApp.use.mock.calls[2][0]).toBe('function');
      expect(typeof mockApp.use.mock.calls[3][0]).toBe('function');
    });

    test('should register request logger as the last middleware', () => {
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      expect(mockApp.use.mock.calls[4][0]).toBe(requestLogger);
    });

    test('should register all middleware in correct order: helmet, cors, json, urlencoded, requestLogger', () => {
      const helmet = require('helmet');
      const cors = require('cors');
      const mockApp = createMockApp();

      applyMiddleware(mockApp);

      // Verify complete ordering in a single assertion sequence
      const calls = mockApp.use.mock.calls;
      expect(calls).toHaveLength(5);

      // Position 0: helmet() return value
      expect(calls[0][0]).toBe(helmet.mock.results[0].value);

      // Position 1: cors() return value
      expect(calls[1][0]).toBe(cors.mock.results[0].value);

      // Position 2: express.json() middleware (real function)
      expect(typeof calls[2][0]).toBe('function');

      // Position 3: express.urlencoded() middleware (real function)
      expect(typeof calls[3][0]).toBe('function');

      // Position 4: requestLogger (Morgan middleware reference)
      expect(calls[4][0]).toBe(requestLogger);
    });
  });
});

// ---------- Error Handler Tests ----------

describe('Error Handler - errorHandler.js', () => {
  describe('Function Signature', () => {
    test('should be defined and be a function', () => {
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe('function');
    });

    test('should have 4-argument signature for Express error handler recognition', () => {
      // Express identifies error-handling middleware by checking that
      // the function has exactly 4 parameters (err, req, res, next).
      // If the function.length is not 4, Express skips it as a regular handler.
      expect(errorHandler.length).toBe(4);
    });
  });

  describe('Error Response', () => {
    test('should return 500 status for errors without status property', () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(new Error('test error'), mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should return structured JSON error response with error property', () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(new Error('test error'), mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
      expect(response.error).toBe('test error');
    });

    test('should use err.status when provided', () => {
      const err = new Error('Not Found');
      err.status = 404;

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not Found' });
    });

    test('should use err.statusCode when err.status is not set', () => {
      const err = new Error('Bad Gateway');
      err.statusCode = 502;

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(502);
    });

    test('should prefer err.status over err.statusCode when both are set', () => {
      const err = new Error('Conflict');
      err.status = 409;
      err.statusCode = 500;

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    test('should use fallback message when err.message is empty', () => {
      const err = { status: 500, message: '', stack: 'Error\n    at test' };

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Internal Server Error');
    });

    test('should include original error message in non-production environment', () => {
      const err = new Error('Detailed error description');

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Detailed error description');
    });

    test('should not include stack trace in JSON response', () => {
      const err = new Error('test error');

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('stack');
    });

    test('should handle error objects without stack property', () => {
      const err = { status: 400, message: 'Bad Request' };

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Bad Request');
      expect(response).not.toHaveProperty('stack');
    });
  });

  describe('Winston Logging Integration', () => {
    test('should log error via Winston logger.error', () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(new Error('test error'), mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalled();
    });

    test('should log error message as the first argument', () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(new Error('database failure'), mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'database failure',
        expect.any(Object)
      );
    });

    test('should log error with context metadata including statusCode, method, and url', () => {
      const err = new Error('service unavailable');
      err.status = 503;

      const mockReq = createMockReq({ method: 'POST', originalUrl: '/api/data' });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'service unavailable',
        expect.objectContaining({
          statusCode: 503,
          method: 'POST',
          url: '/api/data',
          stack: expect.any(String)
        })
      );
    });

    test('should include stack trace in log metadata when available', () => {
      const err = new Error('stack trace test');

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const loggedMetadata = logger.error.mock.calls[0][1];
      expect(loggedMetadata).toHaveProperty('stack');
      expect(typeof loggedMetadata.stack).toBe('string');
    });

    test('should handle undefined stack in log metadata gracefully', () => {
      const err = { status: 422, message: 'Unprocessable Entity' };

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Unprocessable Entity',
        expect.objectContaining({
          statusCode: 422,
          stack: undefined
        })
      );
    });
  });

  describe('Production Environment Behavior', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should sanitize 500-level error messages in production', () => {
      process.env.NODE_ENV = 'production';

      const err = new Error('Sensitive database connection string leaked');

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Internal Server Error');
    });

    test('should pass through 4xx error messages in production', () => {
      process.env.NODE_ENV = 'production';

      const err = new Error('Resource not found');
      err.status = 404;

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Resource not found');
    });

    test('should not include stack trace in production response', () => {
      process.env.NODE_ENV = 'production';

      const err = new Error('Server error');

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('stack');
    });

    test('should sanitize custom statusCode 500+ errors in production', () => {
      process.env.NODE_ENV = 'production';

      const err = new Error('Internal scheduler failure details');
      err.statusCode = 503;

      const mockReq = createMockReq();
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Internal Server Error');
    });
  });
});

// ---------- Request Logger Tests ----------

describe('Request Logger - requestLogger.js', () => {
  test('should be defined', () => {
    expect(requestLogger).toBeDefined();
  });

  test('should be a function (Morgan middleware instance)', () => {
    expect(typeof requestLogger).toBe('function');
  });

  test('should not be null or undefined', () => {
    expect(requestLogger).not.toBeNull();
    expect(requestLogger).not.toBeUndefined();
  });

  test('should call next() when invoked as Express middleware', (done) => {
    const { EventEmitter } = require('events');

    // Create mock HTTP request with fields required by Morgan combined format
    const mockReq = Object.assign(new EventEmitter(), {
      method: 'GET',
      url: '/test-path',
      originalUrl: '/test-path',
      httpVersion: '1.1',
      headers: {
        'user-agent': 'jest-test-agent',
        'referer': '-'
      },
      connection: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1'
    });

    // Create mock HTTP response marked as already finished so that
    // the on-finished package triggers Morgan's log callback via setImmediate
    const mockRes = Object.assign(new EventEmitter(), {
      statusCode: 200,
      finished: true,
      _header: true,
      headersSent: true,
      getHeader: jest.fn().mockReturnValue(undefined),
      socket: { writable: false }
    });

    const mockNext = jest.fn();

    requestLogger(mockReq, mockRes, mockNext);

    // Morgan calls next() synchronously during middleware execution
    expect(mockNext).toHaveBeenCalled();
    done();
  });

  test('should pipe HTTP request logs to Winston via stream integration', (done) => {
    const { EventEmitter } = require('events');

    // Create mock HTTP request with all fields for Morgan combined format
    const mockReq = Object.assign(new EventEmitter(), {
      method: 'GET',
      url: '/stream-test',
      originalUrl: '/stream-test',
      httpVersion: '1.1',
      headers: {
        'user-agent': 'jest-stream-test',
        'referer': '-'
      },
      connection: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1'
    });

    // Create mock HTTP response that reports as already finished.
    // The on-finished package checks msg.finished and when true,
    // defers the Morgan log callback via setImmediate. This triggers
    // Morgan to format the request and call stream.write(line),
    // which in turn calls logger.http(message.trim()) to pipe the
    // HTTP access log into the Winston logging pipeline.
    const mockRes = Object.assign(new EventEmitter(), {
      statusCode: 200,
      finished: true,
      _header: true,
      headersSent: true,
      getHeader: jest.fn().mockReturnValue(undefined),
      socket: { writable: false }
    });

    const mockNext = jest.fn();

    requestLogger(mockReq, mockRes, mockNext);

    // on-finished uses setImmediate to defer the Morgan callback when
    // the response is already finished. Our assertion must run after
    // that callback executes stream.write → logger.http.
    setImmediate(() => {
      expect(logger.http).toHaveBeenCalled();
      done();
    });
  });
});
