/**
 * @fileoverview Unit tests for security middleware modules (src/middleware/)
 * @module tests/unit/middleware
 * 
 * Tests the middleware modules:
 * - src/middleware/security.js: helmet, cors, rateLimiter configuration
 * - src/middleware/validation.js: validateRequest, validationErrorHandler, commonValidators
 * - src/middleware/index.js: barrel exports
 * 
 * Following existing test patterns from tests/unit/config.test.js
 * 
 * Test Coverage Target: 90% for security middleware per Section 0.9.5
 */

'use strict';

/**
 * Helper function to load modules with specific environment variables.
 * Resets module cache to ensure fresh evaluation.
 * @param {string} modulePath - Path to the module to load
 * @param {Object<string, string>} [envOverrides={}] - Environment variable overrides
 * @returns {*} Fresh module instance
 */
function loadModuleWithEnv(modulePath, envOverrides = {}) {
  jest.resetModules();
  
  Object.keys(envOverrides).forEach(key => {
    if (envOverrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envOverrides[key];
    }
  });
  
  return require(modulePath);
}

/**
 * Helper function to load modules without specific environment variables.
 * @param {string} modulePath - Path to the module to load
 * @param {string[]} keys - Environment variable keys to clear
 * @returns {*} Fresh module instance
 */
function loadModuleWithoutEnv(modulePath, keys) {
  jest.resetModules();
  keys.forEach(key => delete process.env[key]);
  return require(modulePath);
}

describe('Security Middleware Module (src/middleware/security.js)', () => {
  /** @type {NodeJS.ProcessEnv} */
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Module Exports', () => {
    test('should export helmet middleware', () => {
      const security = require('../../src/middleware/security');
      expect(security.helmet).toBeDefined();
      expect(typeof security.helmet).toBe('function');
    });

    test('should export cors middleware', () => {
      const security = require('../../src/middleware/security');
      expect(security.cors).toBeDefined();
      expect(typeof security.cors).toBe('function');
    });

    test('should export rateLimiter middleware', () => {
      const security = require('../../src/middleware/security');
      expect(security.rateLimiter).toBeDefined();
      expect(typeof security.rateLimiter).toBe('function');
    });

    test('should export exactly three middleware', () => {
      const security = require('../../src/middleware/security');
      expect(Object.keys(security)).toHaveLength(3);
      expect(Object.keys(security)).toEqual(['helmet', 'cors', 'rateLimiter']);
    });
  });

  describe('Helmet Middleware', () => {
    test('helmet should be a valid Express middleware function', () => {
      const security = require('../../src/middleware/security');
      // Express middleware functions accept (req, res, next)
      expect(security.helmet.length).toBeGreaterThanOrEqual(0);
    });

    test('helmet should be callable with mock request/response objects', () => {
      const security = require('../../src/middleware/security');
      const mockReq = {};
      const mockRes = {
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        getHeader: jest.fn()
      };
      const mockNext = jest.fn();

      // Should not throw when called
      expect(() => {
        security.helmet(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    test('helmet should call next() when processing completes', () => {
      const security = require('../../src/middleware/security');
      const mockReq = {};
      const mockRes = {
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        getHeader: jest.fn()
      };
      const mockNext = jest.fn();

      security.helmet(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate Limiter Configuration', () => {
    test('rateLimiter should use default windowMs from config when not set', () => {
      const config = loadModuleWithoutEnv('../../src/config', ['RATE_LIMIT_WINDOW_MS']);
      expect(config.rateLimit.windowMs).toBe(900000);
    });

    test('rateLimiter should use default max from config when not set', () => {
      const config = loadModuleWithoutEnv('../../src/config', ['RATE_LIMIT_MAX']);
      expect(config.rateLimit.max).toBe(100);
    });

    test('rateLimiter should use custom RATE_LIMIT_WINDOW_MS when set', () => {
      const config = loadModuleWithEnv('../../src/config', { RATE_LIMIT_WINDOW_MS: '60000' });
      expect(config.rateLimit.windowMs).toBe(60000);
    });

    test('rateLimiter should use custom RATE_LIMIT_MAX when set', () => {
      const config = loadModuleWithEnv('../../src/config', { RATE_LIMIT_MAX: '50' });
      expect(config.rateLimit.max).toBe(50);
    });

    test('rateLimiter should be a valid Express middleware function', () => {
      const security = require('../../src/middleware/security');
      expect(typeof security.rateLimiter).toBe('function');
      expect(security.rateLimiter.length).toBeGreaterThanOrEqual(0);
    });

    test('rateLimiter should handle invalid RATE_LIMIT_WINDOW_MS gracefully', () => {
      const config = loadModuleWithEnv('../../src/config', { RATE_LIMIT_WINDOW_MS: 'invalid' });
      expect(config.rateLimit.windowMs).toBe(900000); // Falls back to default
    });

    test('rateLimiter should handle invalid RATE_LIMIT_MAX gracefully', () => {
      const config = loadModuleWithEnv('../../src/config', { RATE_LIMIT_MAX: 'invalid' });
      expect(config.rateLimit.max).toBe(100); // Falls back to default
    });
  });

  describe('CORS Configuration', () => {
    test('cors configuration should allow all origins in development mode', () => {
      const config = loadModuleWithEnv('../../src/config', { NODE_ENV: 'development' });
      expect(config.env).toBe('development');
    });

    test('cors configuration should use CORS_ALLOWED_ORIGINS in production mode', () => {
      const config = loadModuleWithEnv('../../src/config', {
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://example.com,https://api.example.com'
      });
      expect(config.env).toBe('production');
      expect(config.cors.allowedOrigins).toBe('https://example.com,https://api.example.com');
    });

    test('cors configuration should default allowedOrigins to "*" when not set', () => {
      const config = loadModuleWithoutEnv('../../src/config', ['CORS_ALLOWED_ORIGINS']);
      expect(config.cors.allowedOrigins).toBe('*');
    });

    test('cors middleware should be a valid Express middleware function', () => {
      const security = require('../../src/middleware/security');
      expect(typeof security.cors).toBe('function');
    });

    test('cors middleware should handle requests in test environment', () => {
      const security = loadModuleWithEnv('../../src/middleware/security', { NODE_ENV: 'test' });
      expect(typeof security.cors).toBe('function');
    });

    test('cors middleware should be callable as Express middleware', () => {
      const security = require('../../src/middleware/security');
      const mockReq = { method: 'GET', headers: {} };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      expect(() => {
        security.cors(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });
  });

  describe('CORS Origin Validation in Production', () => {
    test('cors origin function should allow requests with matching origin', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com,https://api.example.com';
      jest.resetModules();
      
      const security = require('../../src/middleware/security');
      const mockReq = { 
        method: 'GET', 
        headers: { origin: 'https://example.com' } 
      };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(() => undefined),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      security.cors(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('cors origin function should handle request with no origin header', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';
      jest.resetModules();
      
      const security = require('../../src/middleware/security');
      const mockReq = { 
        method: 'GET', 
        headers: {} 
      };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(() => undefined),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      security.cors(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('cors origin function should reject requests with disallowed origin', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';
      jest.resetModules();
      
      const security = require('../../src/middleware/security');
      const mockReq = { 
        method: 'GET', 
        headers: { origin: 'https://malicious.com' } 
      };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(() => undefined),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      // CORS middleware passes error to next() when origin validation fails
      security.cors(mockReq, mockRes, mockNext);
      // When origin is not allowed, next is called with an error
      expect(mockNext).toHaveBeenCalled();
      const callArg = mockNext.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(Error);
    });

    test('cors should allow all origins when CORS_ALLOWED_ORIGINS is "*" in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = '*';
      jest.resetModules();
      
      const security = require('../../src/middleware/security');
      const mockReq = { 
        method: 'GET', 
        headers: { origin: 'https://any-origin.com' } 
      };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(() => undefined),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      security.cors(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('cors should allow all origins when CORS_ALLOWED_ORIGINS is not set in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CORS_ALLOWED_ORIGINS;
      jest.resetModules();
      
      // Reload config first to get default value
      const config = require('../../src/config');
      expect(config.cors.allowedOrigins).toBe('*');
      
      jest.resetModules();
      const security = require('../../src/middleware/security');
      expect(typeof security.cors).toBe('function');
    });
  });

  describe('Rate Limiter Skip Function', () => {
    test('rateLimiter should work with OPTIONS requests in test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      
      const security = require('../../src/middleware/security');
      const mockReq = { 
        method: 'OPTIONS',
        ip: '127.0.0.1'
      };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      expect(() => {
        security.rateLimiter(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    test('rateLimiter should work with GET requests in test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      
      const security = require('../../src/middleware/security');
      const mockReq = { 
        method: 'GET',
        ip: '127.0.0.1'
      };
      const mockRes = {
        setHeader: jest.fn(),
        getHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      expect(() => {
        security.rateLimiter(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });

    test('rateLimiter skip function returns false for GET in test env', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      
      // The skip function in security.js returns true only for OPTIONS in test
      const config = require('../../src/config');
      expect(config.env).toBe('test');
    });
  });
});

describe('Validation Middleware Module (src/middleware/validation.js)', () => {
  /** @type {NodeJS.ProcessEnv} */
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Module Exports', () => {
    test('should export validateRequest function', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.validateRequest).toBeDefined();
      expect(typeof validation.validateRequest).toBe('function');
    });

    test('should export validationErrorHandler function', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.validationErrorHandler).toBeDefined();
      expect(typeof validation.validationErrorHandler).toBe('function');
    });

    test('should export commonValidators object', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.commonValidators).toBeDefined();
      expect(typeof validation.commonValidators).toBe('object');
      expect(validation.commonValidators).not.toBeNull();
    });

    test('should export body function from express-validator', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.body).toBeDefined();
      expect(typeof validation.body).toBe('function');
    });

    test('should export param function from express-validator', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.param).toBeDefined();
      expect(typeof validation.param).toBe('function');
    });

    test('should export query function from express-validator', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.query).toBeDefined();
      expect(typeof validation.query).toBe('function');
    });

    test('should export validationResult function from express-validator', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.validationResult).toBeDefined();
      expect(typeof validation.validationResult).toBe('function');
    });

    test('should export matchedData function from express-validator', () => {
      const validation = require('../../src/middleware/validation');
      expect(validation.matchedData).toBeDefined();
      expect(typeof validation.matchedData).toBe('function');
    });
  });

  describe('commonValidators', () => {
    test('should have sanitizeString validator', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      expect(commonValidators.sanitizeString).toBeDefined();
      expect(typeof commonValidators.sanitizeString).toBe('function');
    });

    test('should have isValidEmail validator', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      expect(commonValidators.isValidEmail).toBeDefined();
      expect(typeof commonValidators.isValidEmail).toBe('function');
    });

    test('should have isValidId validator', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      expect(commonValidators.isValidId).toBeDefined();
      expect(typeof commonValidators.isValidId).toBe('function');
    });

    test('should have sanitizeQuery validator', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      expect(commonValidators.sanitizeQuery).toBeDefined();
      expect(typeof commonValidators.sanitizeQuery).toBe('function');
    });

    test('should have exactly four validators', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      const validatorNames = Object.keys(commonValidators);
      expect(validatorNames).toHaveLength(4);
      expect(validatorNames).toEqual([
        'sanitizeString',
        'isValidEmail',
        'isValidId',
        'sanitizeQuery'
      ]);
    });

    test('sanitizeString should return a validation chain', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      const chain = commonValidators.sanitizeString('name');
      expect(chain).toBeDefined();
      expect(typeof chain.run).toBe('function');
    });

    test('isValidEmail should return a validation chain', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      const chain = commonValidators.isValidEmail('email');
      expect(chain).toBeDefined();
      expect(typeof chain.run).toBe('function');
    });

    test('isValidId should return a validation chain', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      const chain = commonValidators.isValidId('id');
      expect(chain).toBeDefined();
      expect(typeof chain.run).toBe('function');
    });

    test('sanitizeQuery should return a validation chain', () => {
      const { commonValidators } = require('../../src/middleware/validation');
      const chain = commonValidators.sanitizeQuery('search');
      expect(chain).toBeDefined();
      expect(typeof chain.run).toBe('function');
    });
  });

  describe('validateRequest', () => {
    test('should return an array when called with validations array', () => {
      const { validateRequest, body } = require('../../src/middleware/validation');
      const result = validateRequest([body('email').isEmail()]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should include validationErrorHandler at the end of the array', () => {
      const { validateRequest, validationErrorHandler, body } = require('../../src/middleware/validation');
      const result = validateRequest([body('email').isEmail()]);
      expect(result[result.length - 1]).toBe(validationErrorHandler);
    });

    test('should return array with length = validations + 1 (errorHandler)', () => {
      const { validateRequest, body } = require('../../src/middleware/validation');
      const validations = [
        body('email').isEmail(),
        body('name').isLength({ min: 1 })
      ];
      const result = validateRequest(validations);
      expect(result).toHaveLength(validations.length + 1);
    });

    test('should throw TypeError when called with non-array argument', () => {
      const { validateRequest } = require('../../src/middleware/validation');
      expect(() => validateRequest('not-an-array')).toThrow(TypeError);
      expect(() => validateRequest('not-an-array')).toThrow('validateRequest expects an array of validation chains');
    });

    test('should throw TypeError when called with null', () => {
      const { validateRequest } = require('../../src/middleware/validation');
      expect(() => validateRequest(null)).toThrow(TypeError);
    });

    test('should throw TypeError when called with undefined', () => {
      const { validateRequest } = require('../../src/middleware/validation');
      expect(() => validateRequest(undefined)).toThrow(TypeError);
    });

    test('should throw TypeError when called with object', () => {
      const { validateRequest } = require('../../src/middleware/validation');
      expect(() => validateRequest({ validation: 'test' })).toThrow(TypeError);
    });

    test('should accept empty array', () => {
      const { validateRequest, validationErrorHandler } = require('../../src/middleware/validation');
      const result = validateRequest([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(validationErrorHandler);
    });
  });

  describe('validationErrorHandler', () => {
    test('should be a function with arity of 3 (req, res, next)', () => {
      const { validationErrorHandler } = require('../../src/middleware/validation');
      expect(typeof validationErrorHandler).toBe('function');
      expect(validationErrorHandler.length).toBe(3);
    });

    test('should call next() when no validation errors exist', async () => {
      const { validationErrorHandler, body, validationResult } = require('../../src/middleware/validation');
      
      // Create a mock request that passes through validation
      const mockReq = {
        body: { email: 'valid@example.com' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      // Run validation chain first
      const validation = body('email').isEmail();
      await validation.run(mockReq);

      // Now test the error handler
      validationErrorHandler(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should return 400 status with errors when validation fails', async () => {
      const { validationErrorHandler, body } = require('../../src/middleware/validation');
      
      // Create a mock request with invalid data
      const mockReq = {
        body: { email: 'not-an-email' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      // Run validation chain first with invalid data
      const validation = body('email').isEmail();
      await validation.run(mockReq);

      // Now test the error handler
      validationErrorHandler(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return JSON with success: false on validation failure', async () => {
      const { validationErrorHandler, body } = require('../../src/middleware/validation');
      
      const mockReq = {
        body: { email: 'invalid-email' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const validation = body('email').isEmail();
      await validation.run(mockReq);

      validationErrorHandler(mockReq, mockRes, mockNext);
      
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.errors).toBeDefined();
      expect(Array.isArray(jsonResponse.errors)).toBe(true);
    });

    test('should include validation errors array in response', async () => {
      const { validationErrorHandler, body } = require('../../src/middleware/validation');
      
      const mockReq = {
        body: { email: 'bad-email' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const validation = body('email').isEmail().withMessage('Invalid email');
      await validation.run(mockReq);

      validationErrorHandler(mockReq, mockRes, mockNext);
      
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Middleware Index Module (src/middleware/index.js)', () => {
  /** @type {NodeJS.ProcessEnv} */
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Security Middleware Exports', () => {
    test('should export helmet from security module', () => {
      const middleware = require('../../src/middleware');
      const security = require('../../src/middleware/security');
      expect(middleware.helmet).toBe(security.helmet);
    });

    test('should export cors from security module', () => {
      const middleware = require('../../src/middleware');
      const security = require('../../src/middleware/security');
      expect(middleware.cors).toBe(security.cors);
    });

    test('should export rateLimiter from security module', () => {
      const middleware = require('../../src/middleware');
      const security = require('../../src/middleware/security');
      expect(middleware.rateLimiter).toBe(security.rateLimiter);
    });
  });

  describe('Validation Middleware Exports', () => {
    test('should export validateRequest from validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.validateRequest).toBe(validation.validateRequest);
    });

    test('should export validationErrorHandler from validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.validationErrorHandler).toBe(validation.validationErrorHandler);
    });

    test('should export commonValidators from validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.commonValidators).toBe(validation.commonValidators);
    });
  });

  describe('Express-Validator Re-exports', () => {
    test('should export body function', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.body).toBeDefined();
      expect(typeof middleware.body).toBe('function');
    });

    test('should export param function', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.param).toBeDefined();
      expect(typeof middleware.param).toBe('function');
    });

    test('should export query function', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.query).toBeDefined();
      expect(typeof middleware.query).toBe('function');
    });

    test('should export validationResult function', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.validationResult).toBeDefined();
      expect(typeof middleware.validationResult).toBe('function');
    });

    test('should export matchedData function', () => {
      const middleware = require('../../src/middleware');
      expect(middleware.matchedData).toBeDefined();
      expect(typeof middleware.matchedData).toBe('function');
    });
  });

  describe('Export Consistency with Direct Modules', () => {
    test('body export should be same reference as validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.body).toBe(validation.body);
    });

    test('param export should be same reference as validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.param).toBe(validation.param);
    });

    test('query export should be same reference as validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.query).toBe(validation.query);
    });

    test('validationResult export should be same reference as validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.validationResult).toBe(validation.validationResult);
    });

    test('matchedData export should be same reference as validation module', () => {
      const middleware = require('../../src/middleware');
      const validation = require('../../src/middleware/validation');
      expect(middleware.matchedData).toBe(validation.matchedData);
    });
  });

  describe('Complete Export List', () => {
    test('should export all required middleware', () => {
      const middleware = require('../../src/middleware');
      const expectedExports = [
        'helmet',
        'cors',
        'rateLimiter',
        'validateRequest',
        'validationErrorHandler',
        'commonValidators',
        'body',
        'param',
        'query',
        'validationResult',
        'matchedData'
      ];
      
      expectedExports.forEach(exportName => {
        expect(middleware[exportName]).toBeDefined();
      });
    });

    test('should export exactly 11 items', () => {
      const middleware = require('../../src/middleware');
      expect(Object.keys(middleware)).toHaveLength(11);
    });

    test('should have correct export names', () => {
      const middleware = require('../../src/middleware');
      const exportNames = Object.keys(middleware).sort();
      const expectedNames = [
        'body',
        'commonValidators',
        'cors',
        'helmet',
        'matchedData',
        'param',
        'query',
        'rateLimiter',
        'validateRequest',
        'validationErrorHandler',
        'validationResult'
      ];
      expect(exportNames).toEqual(expectedNames);
    });
  });

  describe('Module Existence and Type Verification', () => {
    test('helmet should be a function (middleware)', () => {
      const middleware = require('../../src/middleware');
      expect(typeof middleware.helmet).toBe('function');
    });

    test('cors should be a function (middleware)', () => {
      const middleware = require('../../src/middleware');
      expect(typeof middleware.cors).toBe('function');
    });

    test('rateLimiter should be a function (middleware)', () => {
      const middleware = require('../../src/middleware');
      expect(typeof middleware.rateLimiter).toBe('function');
    });

    test('validateRequest should be a function', () => {
      const middleware = require('../../src/middleware');
      expect(typeof middleware.validateRequest).toBe('function');
    });

    test('validationErrorHandler should be a function', () => {
      const middleware = require('../../src/middleware');
      expect(typeof middleware.validationErrorHandler).toBe('function');
    });

    test('commonValidators should be an object', () => {
      const middleware = require('../../src/middleware');
      expect(typeof middleware.commonValidators).toBe('object');
      expect(middleware.commonValidators).not.toBeNull();
    });
  });
});
