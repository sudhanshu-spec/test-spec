/**
 * @fileoverview Unit tests for middleware modules
 * 
 * Tests for the middleware modules:
 * - error.middleware.js (notFoundHandler and errorHandler)
 * - security.middleware.js (Helmet security headers configuration)
 * - logging.middleware.js (Morgan HTTP request logging)
 * 
 * This test suite validates:
 * - Middleware exports are correctly defined and are functions
 * - Error handlers return correct status codes and JSON responses
 * - Error handler provides environment-aware responses (dev vs production)
 * - Middleware follows Express conventions (3 params for regular, 4 for error handlers)
 * 
 * @module tests/unit/middleware
 */

'use strict';

/**
 * Creates a mock Express response object for middleware testing.
 * The mock supports method chaining via mockReturnThis().
 * 
 * @returns {Object} Mock response with status, json, and other common methods
 */
function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis()
  };
}

/**
 * Creates a mock Express request object for middleware testing.
 * Provides default values for common request properties.
 * 
 * @param {Object} [overrides={}] - Properties to override in the mock request
 * @returns {Object} Mock request object with url, method, and other common properties
 */
function createMockRequest(overrides = {}) {
  return {
    url: '/test',
    method: 'GET',
    headers: {},
    ...overrides
  };
}

/**
 * Creates a mock next function for middleware testing.
 * 
 * @returns {jest.Mock} Mock next function
 */
function createMockNext() {
  return jest.fn();
}

describe('Middleware Modules', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Error Middleware (error.middleware.js)', () => {
    describe('notFoundHandler', () => {
      test('should be a function', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        expect(typeof notFoundHandler).toBe('function');
      });

      test('should be a valid Express middleware with 3 parameters', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        expect(notFoundHandler.length).toBe(3);
      });

      test('should return 404 status', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        notFoundHandler(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      test('should return JSON response with error "Not Found"', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        notFoundHandler(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not Found' });
      });

      test('should call status before json for proper chaining', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();
        const callOrder = [];

        mockRes.status = jest.fn(() => {
          callOrder.push('status');
          return mockRes;
        });
        mockRes.json = jest.fn(() => {
          callOrder.push('json');
          return mockRes;
        });

        notFoundHandler(mockReq, mockRes, mockNext);

        expect(callOrder).toEqual(['status', 'json']);
      });

      test('should not call next function', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        notFoundHandler(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('errorHandler', () => {
      test('should be a function', () => {
        // Mock the logger to avoid side effects
        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        expect(typeof errorHandler).toBe('function');
      });

      test('should be a valid Express error middleware with 4 parameters', () => {
        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        // Express requires exactly 4 parameters to identify error handlers
        expect(errorHandler.length).toBe(4);
      });

      test('should return 500 status for errors without statusCode', () => {
        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Test error');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });

      test('should return JSON error response', () => {
        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Test error');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalled();
      });

      test('should use error.statusCode if provided', () => {
        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Bad Request');
        err.statusCode = 400;
        const mockReq = createMockRequest({ url: '/api/test', method: 'POST' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      test('should use error.status if statusCode not provided', () => {
        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Not Found');
        err.status = 404;
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      test('should include error message in development environment', () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Detailed error message');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Detailed error message'
          })
        );
      });

      test('should include stack trace in development environment', () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Test error with stack');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            stack: expect.any(String)
          })
        );
      });

      test('should return generic error message in production environment', () => {
        process.env.NODE_ENV = 'production';

        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Sensitive error details should not be exposed');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Internal Server Error'
        });
      });

      test('should not include stack trace in production environment', () => {
        process.env.NODE_ENV = 'production';

        jest.doMock('../../src/utils/logger', () => ({
          error: jest.fn(),
          stream: { write: jest.fn() }
        }));
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Test error');
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        const jsonCall = mockRes.json.mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();
      });

      test('should log error with logger.error()', () => {
        const mockLogger = {
          error: jest.fn(),
          stream: { write: jest.fn() }
        };
        jest.doMock('../../src/utils/logger', () => mockLogger);
        jest.resetModules();

        const { errorHandler } = require('../../src/middleware/error.middleware');
        const err = new Error('Error to be logged');
        const mockReq = createMockRequest({ url: '/api/resource', method: 'PUT' });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        errorHandler(err, mockReq, mockRes, mockNext);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error to be logged',
          expect.objectContaining({
            stack: expect.any(String),
            url: '/api/resource',
            method: 'PUT'
          })
        );
      });
    });
  });

  describe('Security Middleware (security.middleware.js)', () => {
    test('should export securityMiddleware', () => {
      const { securityMiddleware } = require('../../src/middleware/security.middleware');
      expect(securityMiddleware).toBeDefined();
    });

    test('securityMiddleware should be a function', () => {
      const { securityMiddleware } = require('../../src/middleware/security.middleware');
      expect(typeof securityMiddleware).toBe('function');
    });

    test('should be a valid Express middleware with 3 parameters', () => {
      const { securityMiddleware } = require('../../src/middleware/security.middleware');
      // Helmet middleware expects (req, res, next)
      expect(securityMiddleware.length).toBe(3);
    });
  });

  describe('Logging Middleware (logging.middleware.js)', () => {
    test('should export morganMiddleware', () => {
      const { morganMiddleware } = require('../../src/middleware/logging.middleware');
      expect(morganMiddleware).toBeDefined();
    });

    test('morganMiddleware should be a function', () => {
      const { morganMiddleware } = require('../../src/middleware/logging.middleware');
      expect(typeof morganMiddleware).toBe('function');
    });

    test('should be a valid Express middleware function', () => {
      const { morganMiddleware } = require('../../src/middleware/logging.middleware');
      // Morgan middleware is a function that can be used as Express middleware
      expect(typeof morganMiddleware).toBe('function');
    });
  });

  describe('Middleware Barrel Export (middleware/index.js)', () => {
    test('should export securityMiddleware from barrel', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.securityMiddleware).toBeDefined();
      expect(typeof middleware.securityMiddleware).toBe('function');
    });

    test('should export morganMiddleware from barrel', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.morganMiddleware).toBeDefined();
      expect(typeof middleware.morganMiddleware).toBe('function');
    });

    test('should export notFoundHandler from barrel', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.notFoundHandler).toBeDefined();
      expect(typeof middleware.notFoundHandler).toBe('function');
    });

    test('should export errorHandler from barrel', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.errorHandler).toBeDefined();
      expect(typeof middleware.errorHandler).toBe('function');
    });

    test('should export all 4 middleware functions', () => {
      const middleware = require('../../src/middleware');
      const exportedKeys = Object.keys(middleware);
      
      expect(exportedKeys).toContain('securityMiddleware');
      expect(exportedKeys).toContain('morganMiddleware');
      expect(exportedKeys).toContain('notFoundHandler');
      expect(exportedKeys).toContain('errorHandler');
      expect(exportedKeys).toHaveLength(4);
    });
  });
});
