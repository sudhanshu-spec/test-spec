/**
 * @fileoverview Unit tests for middleware modules (src/middleware/)
 * @module tests/unit/middleware
 */

'use strict';

/**
 * Middleware Modules Test Suite
 * 
 * Tests for:
 * - Barrel exports verification (middleware/index.js)
 * - Error middleware (notFoundHandler and errorHandler)
 * - Request ID middleware (UUID generation and header setting)
 */
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

  describe('Barrel Exports - middleware/index.js', () => {
    test('should export errorMiddleware object', () => {
      jest.resetModules();
      const middleware = require('../../src/middleware');
      expect(middleware).toHaveProperty('errorMiddleware');
      expect(typeof middleware.errorMiddleware).toBe('object');
    });

    test('should export requestIdMiddleware function', () => {
      jest.resetModules();
      const middleware = require('../../src/middleware');
      expect(middleware).toHaveProperty('requestIdMiddleware');
      expect(typeof middleware.requestIdMiddleware).toBe('function');
    });

    test('errorMiddleware should have notFoundHandler function', () => {
      jest.resetModules();
      const { errorMiddleware } = require('../../src/middleware');
      expect(errorMiddleware).toHaveProperty('notFoundHandler');
      expect(typeof errorMiddleware.notFoundHandler).toBe('function');
    });

    test('errorMiddleware should have errorHandler function', () => {
      jest.resetModules();
      const { errorMiddleware } = require('../../src/middleware');
      expect(errorMiddleware).toHaveProperty('errorHandler');
      expect(typeof errorMiddleware.errorHandler).toBe('function');
    });
  });

  describe('Error Middleware - error.middleware.js', () => {
    describe('notFoundHandler', () => {
      test('should create error with status 404', () => {
        jest.resetModules();
        const { errorMiddleware } = require('../../src/middleware');
        const { notFoundHandler } = errorMiddleware;
        const req = { originalUrl: '/unknown' };
        const res = {};
        const next = jest.fn();

        notFoundHandler(req, res, next);

        expect(next).toHaveBeenCalled();
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.status).toBe(404);
      });

      test('should call next with error', () => {
        jest.resetModules();
        const { errorMiddleware } = require('../../src/middleware');
        const { notFoundHandler } = errorMiddleware;
        const req = { originalUrl: '/test' };
        const res = {};
        const next = jest.fn();

        notFoundHandler(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(expect.any(Error));
      });

      test('should include original URL in error message', () => {
        jest.resetModules();
        const { errorMiddleware } = require('../../src/middleware');
        const { notFoundHandler } = errorMiddleware;
        const req = { originalUrl: '/api/missing' };
        const res = {};
        const next = jest.fn();

        notFoundHandler(req, res, next);

        const error = next.mock.calls[0][0];
        expect(error.message).toContain('/api/missing');
      });

      test('should include Not Found text in error message', () => {
        jest.resetModules();
        const { errorMiddleware } = require('../../src/middleware');
        const { notFoundHandler } = errorMiddleware;
        const req = { originalUrl: '/nonexistent' };
        const res = {};
        const next = jest.fn();

        notFoundHandler(req, res, next);

        const error = next.mock.calls[0][0];
        expect(error.message).toContain('Not Found');
      });
    });

    describe('errorHandler', () => {
      test('should have (err, req, res, next) signature', () => {
        jest.resetModules();
        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        expect(errorHandler.length).toBe(4);
      });

      test('should return 500 for errors without status', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
      });

      test('should use error.status if provided', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Not Found');
        err.status = 404;
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
      });

      test('should use error.statusCode as fallback if status not set', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Forbidden');
        err.statusCode = 403;
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      test('should return JSON response', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.json).toHaveBeenCalled();
        const response = res.json.mock.calls[0][0];
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('message');
      });

      test('should include status and statusCode in response', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        err.status = 400;
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response.status).toBe('error');
        expect(response.statusCode).toBe(400);
      });

      test('should include stack trace in development', () => {
        jest.resetModules();
        process.env.NODE_ENV = 'development';
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response).toHaveProperty('stack');
      });

      test('should NOT include stack trace in production', () => {
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response).not.toHaveProperty('stack');
      });

      test('should include requestId if present on req', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET', id: 'test-request-id' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response).toHaveProperty('requestId', 'test-request-id');
      });

      test('should NOT include requestId if not present on req', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response).not.toHaveProperty('requestId');
      });

      test('should log error before sending response', () => {
        jest.resetModules();
        const mockLoggerError = jest.fn();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: mockLoggerError }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('Test error');
        const req = { originalUrl: '/test', method: 'GET', id: 'req-123' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(mockLoggerError).toHaveBeenCalled();
        const loggedData = mockLoggerError.mock.calls[0][0];
        expect(loggedData).toHaveProperty('message', 'Test error');
        expect(loggedData).toHaveProperty('url', '/test');
        expect(loggedData).toHaveProperty('method', 'GET');
        expect(loggedData).toHaveProperty('requestId', 'req-123');
      });

      test('should handle error without message with default message', () => {
        jest.resetModules();
        jest.mock('../../src/utils/logger', () => ({
          logger: { error: jest.fn() }
        }));

        const { errorMiddleware } = require('../../src/middleware');
        const { errorHandler } = errorMiddleware;
        const err = new Error('');
        const req = { originalUrl: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response.message).toBe('Internal Server Error');
      });
    });
  });

  describe('Request ID Middleware - request-id.middleware.js', () => {
    test('should generate UUID and attach to req.id', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      const req = {};
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(req.id).toBeDefined();
      expect(typeof req.id).toBe('string');
      // UUID v4 format validation
      expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should set X-Request-ID response header', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      const req = {};
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
    });

    test('should call next()', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      const req = {};
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    test('should generate unique IDs for each request', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      const ids = [];

      for (let i = 0; i < 5; i++) {
        const req = {};
        const res = { setHeader: jest.fn() };
        const next = jest.fn();

        requestIdMiddleware(req, res, next);
        ids.push(req.id);
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    test('should set same ID to req.id and X-Request-ID header', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      const req = {};
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      const headerId = res.setHeader.mock.calls[0][1];
      expect(req.id).toBe(headerId);
    });

    test('should be a function with correct arity (3 parameters)', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      expect(typeof requestIdMiddleware).toBe('function');
      expect(requestIdMiddleware.length).toBe(3);
    });

    test('should generate UUID v4 format consistently', () => {
      jest.resetModules();
      const { requestIdMiddleware } = require('../../src/middleware');
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      // Test multiple UUIDs to ensure format consistency
      for (let i = 0; i < 10; i++) {
        const req = {};
        const res = { setHeader: jest.fn() };
        const next = jest.fn();

        requestIdMiddleware(req, res, next);

        expect(req.id).toMatch(uuidV4Regex);
      }
    });
  });
});
