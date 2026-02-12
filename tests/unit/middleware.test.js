/**
 * @fileoverview Unit tests for middleware modules
 * (src/middleware/morgan.middleware.js, src/middleware/error.middleware.js)
 * @module tests/unit/middleware
 */

'use strict';

describe('Morgan Middleware Module', () => {
  test('should export a function (middleware)', () => {
    const morganMiddleware = require('../../src/middleware/morgan.middleware');
    expect(typeof morganMiddleware).toBe('function');
  });

  test('should be a valid Express middleware with correct arity', () => {
    const morganMiddleware = require('../../src/middleware/morgan.middleware');
    // Morgan middleware functions have arity of 3 (req, res, next)
    expect(morganMiddleware.length).toBe(3);
  });
});

describe('Error Middleware Module', () => {
  describe('Module Exports', () => {
    test('should export notFoundHandler function', () => {
      const errorMiddleware = require('../../src/middleware/error.middleware');
      expect(errorMiddleware).toHaveProperty('notFoundHandler');
      expect(typeof errorMiddleware.notFoundHandler).toBe('function');
    });

    test('should export errorHandler function', () => {
      const errorMiddleware = require('../../src/middleware/error.middleware');
      expect(errorMiddleware).toHaveProperty('errorHandler');
      expect(typeof errorMiddleware.errorHandler).toBe('function');
    });
  });

  describe('notFoundHandler', () => {
    test('should have 3-parameter middleware signature', () => {
      const { notFoundHandler } = require('../../src/middleware/error.middleware');
      expect(notFoundHandler.length).toBe(3);
    });

    test('should call next with a 404 error', () => {
      const { notFoundHandler } = require('../../src/middleware/error.middleware');
      const req = {};
      const res = {};
      const next = jest.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Not Found');
      expect(error.status).toBe(404);
    });
  });

  describe('errorHandler', () => {
    test('should have 4-parameter Express error-handling signature', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      expect(errorHandler.length).toBe(4);
    });

    test('should send JSON error response with correct status code', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      const err = new Error('Test Error');
      err.status = 400;

      const req = { originalUrl: '/test', method: 'GET' };
      const jsonMock = jest.fn();
      const statusMock = jest.fn(() => ({ json: jsonMock }));
      const res = { status: statusMock };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          statusCode: 400,
          message: 'Test Error'
        })
      );
    });

    test('should default to 500 status code when err.status is not set', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      const err = new Error('Internal Error');

      const req = { originalUrl: '/test', method: 'GET' };
      const jsonMock = jest.fn();
      const statusMock = jest.fn(() => ({ json: jsonMock }));
      const res = { status: statusMock };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    test('should include stack trace in non-production environment', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';

      const { errorHandler } = require('../../src/middleware/error.middleware');
      const err = new Error('Dev Error');
      err.status = 400;

      const req = { originalUrl: '/test', method: 'GET' };
      const jsonMock = jest.fn();
      const statusMock = jest.fn(() => ({ json: jsonMock }));
      const res = { status: statusMock };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      const responseBody = jsonMock.mock.calls[0][0];
      expect(responseBody).toHaveProperty('stack');
    });

    test('should NOT include stack trace in production environment', () => {
      jest.resetModules();
      process.env.NODE_ENV = 'production';

      const { errorHandler } = require('../../src/middleware/error.middleware');
      const err = new Error('Prod Error');
      err.status = 400;

      const req = { originalUrl: '/test', method: 'GET' };
      const jsonMock = jest.fn();
      const statusMock = jest.fn(() => ({ json: jsonMock }));
      const res = { status: statusMock };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      const responseBody = jsonMock.mock.calls[0][0];
      expect(responseBody).not.toHaveProperty('stack');
    });
  });
});
