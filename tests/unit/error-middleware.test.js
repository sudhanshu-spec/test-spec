/**
 * @fileoverview Unit tests for the centralized error-handling middleware
 * (src/middleware/error.middleware.js)
 * @module tests/unit/error-middleware
 */

'use strict';

describe('Error Handling Middleware', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  /** @type {Function} */
  let errorHandler;

  /** @type {import('winston').Logger} */
  let logger;

  /** @type {import('express').Request} */
  let mockReq;

  /** @type {import('express').Response} */
  let mockRes;

  /** @type {import('express').NextFunction} */
  let mockNext;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    // Load fresh instances
    logger = require('../../src/utils/logger');
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    errorHandler = require('../../src/middleware/error.middleware');

    // Create mock request
    mockReq = {
      originalUrl: '/test-path',
      method: 'GET'
    };

    // Create mock response with chaining
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Create mock next function
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Function Signature', () => {
    test('should export a function', () => {
      expect(typeof errorHandler).toBe('function');
    });

    test('should have 4 parameters (Express error middleware signature)', () => {
      expect(errorHandler.length).toBe(4);
    });
  });

  describe('Error Logging', () => {
    test('should log the error via Winston logger.error', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          stack: expect.any(String),
          statusCode: 500,
          url: '/test-path',
          method: 'GET'
        })
      );
    });

    test('should log with the error status code when provided', () => {
      const error = new Error('Not Found');
      error.status = 404;
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Not Found',
        expect.objectContaining({
          statusCode: 404
        })
      );
    });
  });

  describe('Error Response', () => {
    test('should respond with 500 status code for generic errors', () => {
      const error = new Error('Something went wrong');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should use error.status when provided', () => {
      const error = new Error('Not Found');
      error.status = 404;
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should use error.statusCode when provided', () => {
      const error = new Error('Bad Request');
      error.statusCode = 400;
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should return structured JSON response body', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          statusCode: 500,
          message: 'Test error'
        })
      );
    });

    test('should return "Internal Server Error" when error has no message', () => {
      const error = new Error();
      errorHandler(error, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.statusCode).toBe(500);
    });
  });

  describe('Stack Trace Exposure', () => {
    test('should include stack trace in non-production environment', () => {
      jest.resetModules();
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      logger = require('../../src/utils/logger');
      jest.spyOn(logger, 'error').mockImplementation(() => {});
      errorHandler = require('../../src/middleware/error.middleware');

      const error = new Error('Dev error');
      errorHandler(error, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeDefined();
      expect(typeof jsonCall.stack).toBe('string');
    });

    test('should NOT include stack trace in production environment', () => {
      jest.resetModules();
      process.env = { ...originalEnv, NODE_ENV: 'production' };
      logger = require('../../src/utils/logger');
      jest.spyOn(logger, 'error').mockImplementation(() => {});
      errorHandler = require('../../src/middleware/error.middleware');

      const error = new Error('Production error');
      errorHandler(error, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle error with both status and statusCode properties', () => {
      const error = new Error('Conflict');
      error.status = 409;
      error.statusCode = 400;
      errorHandler(error, mockReq, mockRes, mockNext);

      // status takes precedence over statusCode
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    test('should handle error without stack property', () => {
      const error = { message: 'Custom error object', status: 500 };
      expect(() => errorHandler(error, mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
