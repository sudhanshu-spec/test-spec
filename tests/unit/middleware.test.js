/**
 * Middleware Unit Tests
 * 
 * Tests for the middleware modules:
 * - security.middleware.js (Helmet configuration)
 * - logging.middleware.js (Morgan configuration)
 * - error.middleware.js (404 and error handlers)
 * - middleware/index.js (barrel export)
 * 
 * @module tests/unit/middleware.test
 */

'use strict';

describe('Middleware Modules', () => {
  // Store original environment
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Reset environment after each test
    process.env.NODE_ENV = originalEnv;
    // Clear module cache to test different environments
    jest.resetModules();
  });

  describe('Middleware Barrel Export (middleware/index.js)', () => {
    test('should export securityMiddleware', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.securityMiddleware).toBeDefined();
      expect(typeof middleware.securityMiddleware).toBe('function');
    });

    test('should export morganMiddleware', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.morganMiddleware).toBeDefined();
      expect(typeof middleware.morganMiddleware).toBe('function');
    });

    test('should export notFoundHandler', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.notFoundHandler).toBeDefined();
      expect(typeof middleware.notFoundHandler).toBe('function');
    });

    test('should export errorHandler', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.errorHandler).toBeDefined();
      expect(typeof middleware.errorHandler).toBe('function');
    });

    test('should export exactly 4 middleware functions', () => {
      const middleware = require('../../src/middleware');
      expect(Object.keys(middleware)).toHaveLength(4);
    });
  });

  describe('Security Middleware (security.middleware.js)', () => {
    test('should export securityMiddleware function', () => {
      const { securityMiddleware } = require('../../src/middleware/security.middleware');
      expect(securityMiddleware).toBeDefined();
      expect(typeof securityMiddleware).toBe('function');
    });

    test('should be a valid Express middleware (3 parameters)', () => {
      const { securityMiddleware } = require('../../src/middleware/security.middleware');
      // Helmet middleware accepts req, res, next parameters
      expect(securityMiddleware.length).toBe(3);
    });
  });

  describe('Logging Middleware (logging.middleware.js)', () => {
    test('should export morganMiddleware function', () => {
      const { morganMiddleware } = require('../../src/middleware/logging.middleware');
      expect(morganMiddleware).toBeDefined();
      expect(typeof morganMiddleware).toBe('function');
    });

    test('should be a valid Express middleware', () => {
      const { morganMiddleware } = require('../../src/middleware/logging.middleware');
      // Morgan middleware is a function
      expect(typeof morganMiddleware).toBe('function');
    });
  });

  describe('Error Middleware (error.middleware.js)', () => {
    describe('notFoundHandler', () => {
      test('should export notFoundHandler function', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        expect(notFoundHandler).toBeDefined();
        expect(typeof notFoundHandler).toBe('function');
      });

      test('should be a valid Express middleware (3 parameters)', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        expect(notFoundHandler.length).toBe(3);
      });

      test('should return 404 status with JSON error', () => {
        const { notFoundHandler } = require('../../src/middleware/error.middleware');
        
        const req = {};
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        notFoundHandler(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not Found' });
      });
    });

    describe('errorHandler', () => {
      test('should export errorHandler function', () => {
        const { errorHandler } = require('../../src/middleware/error.middleware');
        expect(errorHandler).toBeDefined();
        expect(typeof errorHandler).toBe('function');
      });

      test('should be a valid Express error middleware (4 parameters)', () => {
        const { errorHandler } = require('../../src/middleware/error.middleware');
        // Error handlers must have exactly 4 parameters for Express to recognize them
        expect(errorHandler.length).toBe(4);
      });

      test('should return 500 status for generic errors in development', () => {
        process.env.NODE_ENV = 'development';
        jest.resetModules();
        
        const { errorHandler } = require('../../src/middleware/error.middleware');
        
        const err = new Error('Test error');
        const req = { url: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String)
        }));
      });

      test('should return generic error message in production', () => {
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        
        const { errorHandler } = require('../../src/middleware/error.middleware');
        
        const err = new Error('Sensitive error details');
        const req = { url: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      });

      test('should use error statusCode if provided', () => {
        process.env.NODE_ENV = 'development';
        jest.resetModules();
        
        const { errorHandler } = require('../../src/middleware/error.middleware');
        
        const err = new Error('Bad Request');
        err.statusCode = 400;
        const req = { url: '/test', method: 'POST' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      test('should use error status if statusCode not provided', () => {
        process.env.NODE_ENV = 'development';
        jest.resetModules();
        
        const { errorHandler } = require('../../src/middleware/error.middleware');
        
        const err = new Error('Not Found');
        err.status = 404;
        const req = { url: '/test', method: 'GET' };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
      });
    });
  });
});
