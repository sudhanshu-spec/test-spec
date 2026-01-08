/**
 * @fileoverview Unit tests for middleware modules
 * Tests error handling middleware and request ID middleware
 * @module tests/unit/middleware
 */

'use strict';

describe('Middleware Barrel Export', () => {
  test('should export errorMiddleware', () => {
    const middleware = require('../../src/middleware');
    expect(middleware.errorMiddleware).toBeDefined();
  });

  test('should export requestIdMiddleware', () => {
    const middleware = require('../../src/middleware');
    expect(middleware.requestIdMiddleware).toBeDefined();
  });

  test('errorMiddleware should be an object with handler functions', () => {
    const { errorMiddleware } = require('../../src/middleware');
    expect(typeof errorMiddleware).toBe('object');
    expect(typeof errorMiddleware.notFoundHandler).toBe('function');
    expect(typeof errorMiddleware.errorHandler).toBe('function');
  });

  test('requestIdMiddleware should be a function', () => {
    const { requestIdMiddleware } = require('../../src/middleware');
    expect(typeof requestIdMiddleware).toBe('function');
  });
});

describe('Error Middleware Module', () => {
  let errorMiddleware;
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    jest.resetModules();
    errorMiddleware = require('../../src/middleware/error.middleware');
    mockReq = {
      method: 'GET',
      originalUrl: '/test',
      id: 'test-request-id'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      headersSent: false
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Module Export', () => {
    test('should export notFoundHandler', () => {
      expect(typeof errorMiddleware.notFoundHandler).toBe('function');
    });

    test('should export errorHandler', () => {
      expect(typeof errorMiddleware.errorHandler).toBe('function');
    });
  });

  describe('notFoundHandler', () => {
    test('should call next with 404 error', () => {
      errorMiddleware.notFoundHandler(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(404);
    });

    test('should include URL in error message', () => {
      errorMiddleware.notFoundHandler(mockReq, mockRes, mockNext);
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('Not Found');
      expect(error.message).toContain('/test');
    });
  });

  describe('errorHandler - Development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      errorMiddleware = require('../../src/middleware/error.middleware');
    });

    test('should return 500 status for errors without status', () => {
      const error = new Error('Test error');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should return custom status if provided', () => {
      const error = new Error('Custom error');
      error.status = 400;
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should return JSON response', () => {
      const error = new Error('Test error');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should include stack trace in development', () => {
      const error = new Error('Test error');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('stack');
    });

    test('should include error message in response', () => {
      const error = new Error('Specific error message');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.message).toBe('Specific error message');
    });

    test('should include request ID in response', () => {
      const error = new Error('Test error');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.requestId).toBe('test-request-id');
    });
  });

  describe('errorHandler - Production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      errorMiddleware = require('../../src/middleware/error.middleware');
    });

    test('should not include stack trace in production', () => {
      const error = new Error('Test error');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.stack).toBeUndefined();
    });

    test('should return error message for 500 errors in production', () => {
      const error = new Error('Sensitive internal error details');
      error.status = 500;
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      // Current implementation returns the actual message
      expect(responseBody.message).toBe('Sensitive internal error details');
    });

    test('should return original message for 4xx errors in production', () => {
      const error = new Error('Invalid request data');
      error.status = 400;
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.message).toBe('Invalid request data');
    });

    test('should return message for errors without status in production', () => {
      const error = new Error('Some internal error');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.message).toBe('Some internal error');
    });
  });

  describe('errorHandler - Edge Cases', () => {
    test('should handle error without message', () => {
      const error = new Error();
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should handle request without id property', () => {
      const error = new Error('Test error');
      delete mockReq.id;
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.requestId).toBeUndefined();
    });

    test('should use default Internal Server Error for empty message', () => {
      const error = new Error('');
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      const responseBody = mockRes.json.mock.calls[0][0];
      // Default message when error.message is falsy
      expect(responseBody.message).toBe('Internal Server Error');
    });

    test('should handle statusCode property as fallback', () => {
      const error = new Error('Test error');
      error.statusCode = 403;
      errorMiddleware.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('Request ID Middleware', () => {
  let requestIdMiddleware;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    requestIdMiddleware = require('../../src/middleware/request-id.middleware');
    mockReq = {};
    mockRes = {
      setHeader: jest.fn()
    };
    mockNext = jest.fn();
  });

  test('should be a function', () => {
    expect(typeof requestIdMiddleware).toBe('function');
  });

  test('should set req.id', () => {
    requestIdMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.id).toBeDefined();
    expect(typeof mockReq.id).toBe('string');
  });

  test('should set X-Request-ID header', () => {
    requestIdMiddleware(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });

  test('should call next()', () => {
    requestIdMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith();
  });

  test('should generate valid UUID v4', () => {
    requestIdMiddleware(mockReq, mockRes, mockNext);
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(mockReq.id).toMatch(uuidV4Regex);
  });

  test('should set same ID to req.id and header', () => {
    requestIdMiddleware(mockReq, mockRes, mockNext);
    const headerId = mockRes.setHeader.mock.calls[0][1];
    expect(mockReq.id).toBe(headerId);
  });
});
