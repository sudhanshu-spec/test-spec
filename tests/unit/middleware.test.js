/**
 * @fileoverview Unit tests for middleware modules (src/middleware/errorHandler.js
 * and src/middleware/requestLogger.js)
 *
 * Tests the structural contracts of both middleware:
 * - errorHandler: Express 4-argument signature, JSON error responses, status codes
 * - requestLogger: Morgan middleware instance definition and function type
 *
 * @module tests/unit/middleware
 */

'use strict';

// Mock the Winston logger singleton BEFORE requiring middleware modules
// to isolate middleware behavior from actual Winston logging and prevent
// file system side effects from File transports.
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const errorHandler = require('../../src/middleware/errorHandler');
const requestLogger = require('../../src/middleware/requestLogger');

describe('Middleware - errorHandler', () => {
  test('should be a function', () => {
    expect(typeof errorHandler).toBe('function');
  });

  test('should have 4-argument signature (err, req, res, next)', () => {
    expect(errorHandler.length).toBe(4);
  });

  test('should send JSON error response with default 500 status', () => {
    const err = new Error('Test error');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('status', 'error');
    expect(responseBody).toHaveProperty('statusCode', 500);
    expect(responseBody).toHaveProperty('message', 'Test error');
  });

  test('should use err.status when provided', () => {
    const err = new Error('Not found');
    err.status = 404;
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('statusCode', 404);
  });

  test('should use err.statusCode when provided', () => {
    const err = new Error('Bad request');
    err.statusCode = 400;
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should include status, statusCode, and message in response', () => {
    const err = new Error('Server error');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody).toHaveProperty('status');
    expect(responseBody).toHaveProperty('statusCode');
    expect(responseBody).toHaveProperty('message');
  });
});

describe('Middleware - requestLogger', () => {
  test('should be defined', () => {
    expect(requestLogger).toBeDefined();
  });

  test('should be a function', () => {
    expect(typeof requestLogger).toBe('function');
  });
});
