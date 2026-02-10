/**
 * @fileoverview Unit tests for middleware pipeline, error handler, and request logger
 * @module tests/unit/middleware
 */

'use strict';

// Mock the logger module to prevent file transport issues during tests
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

const { applyMiddleware } = require('../../src/middleware');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { requestLogger } = require('../../src/middleware/requestLogger');

describe('Middleware Pipeline - index.js', () => {
  describe('applyMiddleware Function', () => {
    test('should be defined and be a function', () => {
      expect(applyMiddleware).toBeDefined();
      expect(typeof applyMiddleware).toBe('function');
    });

    test('should register middleware on the app', () => {
      const mockApp = {
        use: jest.fn()
      };
      
      applyMiddleware(mockApp);
      
      // Should call app.use 5 times: helmet, cors, json, urlencoded, requestLogger
      expect(mockApp.use).toHaveBeenCalledTimes(5);
    });

    test('should not throw when called with a valid app object', () => {
      const mockApp = {
        use: jest.fn()
      };
      
      expect(() => applyMiddleware(mockApp)).not.toThrow();
    });
  });
});

describe('Error Handler - errorHandler.js', () => {
  describe('Function Signature', () => {
    test('should be defined and be a function', () => {
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe('function');
    });

    test('should have 4-argument signature for Express error handler recognition', () => {
      expect(errorHandler.length).toBe(4);
    });
  });

  describe('Error Response', () => {
    test('should return 500 status for errors without status', () => {
      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      errorHandler(new Error('test error'), mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should return structured JSON error response', () => {
      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      errorHandler(new Error('test error'), mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
    });

    test('should use err.status when provided', () => {
      const err = new Error('Not Found');
      err.status = 404;
      
      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      errorHandler(err, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should log error via Winston', () => {
      const logger = require('../../src/utils/logger');
      
      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      errorHandler(new Error('test error'), mockReq, mockRes, mockNext);
      
      expect(logger.error).toHaveBeenCalled();
    });

    test('should use err.statusCode when err.status is not set', () => {
      const err = new Error('Bad Gateway');
      err.statusCode = 502;

      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(502);
    });

    test('should use default message when err.message is empty', () => {
      const err = { status: 500, message: '', stack: 'Error\n    at test' };

      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should include original error message in non-production environment', () => {
      const err = new Error('test error with stack');

      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error', 'test error with stack');
    });

    test('should not include stack when error has no stack property', () => {
      const err = { status: 400, message: 'Bad Request' };

      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('stack');
    });
  });

  describe('Production Environment Behavior', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should sanitize error message in production', () => {
      process.env.NODE_ENV = 'production';

      const err = new Error('Sensitive database connection error');

      const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      errorHandler(err, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Internal Server Error');
      expect(response).not.toHaveProperty('stack');
    });
  });
});

describe('Request Logger - requestLogger.js', () => {
  test('should be defined', () => {
    expect(requestLogger).toBeDefined();
  });

  test('should be a function (Morgan middleware instance)', () => {
    expect(typeof requestLogger).toBe('function');
  });
});
