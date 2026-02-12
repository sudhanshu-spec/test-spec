/**
 * @fileoverview Unit tests for middleware modules
 * (src/middleware/morgan.middleware.js, src/middleware/error.middleware.js)
 *
 * Validates that the Morgan middleware exports a valid Express middleware
 * function, and that the error middleware exports notFoundHandler
 * (3-parameter middleware that creates 404 errors) and errorHandler
 * (4-parameter Express error-handling middleware that logs errors and
 * sends JSON responses).
 *
 * @module tests/unit/middleware
 */

'use strict';

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

  describe('Morgan Middleware', () => {
    test('should export a function', () => {
      const morganMiddleware = require('../../src/middleware/morgan.middleware');
      expect(morganMiddleware).toBeDefined();
      expect(typeof morganMiddleware).toBe('function');
    });

    test('should be a valid Express middleware (callable function)', () => {
      const morganMiddleware = require('../../src/middleware/morgan.middleware');
      expect(typeof morganMiddleware).toBe('function');
      // Standard Express middleware has a 3-parameter signature (req, res, next)
      expect(morganMiddleware.length).toBe(3);
    });
  });

  describe('Error Middleware', () => {
    test('should export notFoundHandler function', () => {
      const { notFoundHandler } = require('../../src/middleware/error.middleware');
      expect(notFoundHandler).toBeDefined();
      expect(typeof notFoundHandler).toBe('function');
    });

    test('should export errorHandler function', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe('function');
    });

    test('notFoundHandler should have 3-parameter middleware signature', () => {
      const { notFoundHandler } = require('../../src/middleware/error.middleware');
      expect(notFoundHandler.length).toBe(3); // (req, res, next)
    });

    test('errorHandler should have 4-parameter error middleware signature', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      expect(errorHandler.length).toBe(4); // (err, req, res, next)
    });

    test('notFoundHandler should call next with 404 error', () => {
      const { notFoundHandler } = require('../../src/middleware/error.middleware');
      const req = {};
      const res = {};
      const next = jest.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(404);
    });

    test('notFoundHandler should create error with "Not Found" message', () => {
      const { notFoundHandler } = require('../../src/middleware/error.middleware');
      const req = {};
      const res = {};
      const next = jest.fn();

      notFoundHandler(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Not Found');
    });

    test('errorHandler should send JSON error response', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const testError = new Error('Test error');
      testError.status = 500;

      errorHandler(testError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('status');
      expect(responseBody).toHaveProperty('message');
    });

    test('errorHandler should include error status and message in response body', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      const req = { originalUrl: '/test', method: 'GET' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const testError = new Error('Bad Request');
      testError.status = 400;

      errorHandler(testError, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          statusCode: 400,
          message: 'Bad Request'
        })
      );
    });

    test('errorHandler should default to 500 when error has no status', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      const req = { originalUrl: '/unknown', method: 'POST' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const testError = new Error('Internal failure');

      errorHandler(testError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          statusCode: 500,
          message: 'Internal failure'
        })
      );
    });

    test('errorHandler should use err.statusCode when err.status is not set', () => {
      const { errorHandler } = require('../../src/middleware/error.middleware');
      const req = { originalUrl: '/test', method: 'PUT' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const testError = new Error('Unprocessable');
      testError.statusCode = 422;

      errorHandler(testError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
    });

    test('errorHandler should include stack trace in non-production environment', () => {
      process.env.NODE_ENV = 'development';

      const { errorHandler } = require('../../src/middleware/error.middleware');
      const req = { originalUrl: '/dev-path', method: 'GET' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const testError = new Error('Dev error');
      testError.status = 400;

      errorHandler(testError, req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('stack');
    });

    test('errorHandler should NOT include stack trace in production environment', () => {
      process.env.NODE_ENV = 'production';

      const { errorHandler } = require('../../src/middleware/error.middleware');
      const req = { originalUrl: '/prod-path', method: 'GET' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      const testError = new Error('Prod error');
      testError.status = 400;

      errorHandler(testError, req, res, next);

      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).not.toHaveProperty('stack');
    });
  });
});
