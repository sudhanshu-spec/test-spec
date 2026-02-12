/**
 * @fileoverview Unit tests for middleware modules
 * Tests errorHandler and requestLogger middleware
 * @module tests/unit/middleware
 */

'use strict';

describe('Middleware Module Barrel Export', () => {
  test('should export errorHandler function', () => {
    const middleware = require('../../src/middleware');
    expect(middleware).toHaveProperty('errorHandler');
    expect(typeof middleware.errorHandler).toBe('function');
  });

  test('should export requestLogger', () => {
    const middleware = require('../../src/middleware');
    expect(middleware).toHaveProperty('requestLogger');
    expect(middleware.requestLogger).toBeDefined();
  });
});

describe('Error Handler Middleware', () => {
  const errorHandler = require('../../src/middleware/errorHandler');

  test('should be a function with four parameters (Express error middleware signature)', () => {
    expect(typeof errorHandler).toBe('function');
    expect(errorHandler.length).toBe(4);
  });

  test('should return a JSON error response with status 500 for generic errors', () => {
    const err = new Error('Test error');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('status', 'error');
    expect(responseBody).toHaveProperty('message');
  });

  test('should use error statusCode if available', () => {
    const err = new Error('Not Found');
    err.statusCode = 404;
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should use error status if statusCode is not available', () => {
    const err = new Error('Bad Request');
    err.status = 400;
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should include stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Reload the module to pick up the env change
    jest.resetModules();
    const handler = require('../../src/middleware/errorHandler');

    const err = new Error('Dev error');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    handler(err, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });

  test('should NOT include stack trace in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    jest.resetModules();
    const handler = require('../../src/middleware/errorHandler');

    const err = new Error('Prod error');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    handler(err, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Request Logger Middleware', () => {
  test('should be a valid middleware function or Morgan instance', () => {
    const requestLogger = require('../../src/middleware/requestLogger');
    expect(requestLogger).toBeDefined();
    // Morgan returns a function (middleware)
    expect(typeof requestLogger).toBe('function');
  });

  test('should accept req, res, next arguments (middleware signature)', () => {
    const requestLogger = require('../../src/middleware/requestLogger');
    // Morgan middleware has length 3
    expect(requestLogger.length).toBe(3);
  });
});
