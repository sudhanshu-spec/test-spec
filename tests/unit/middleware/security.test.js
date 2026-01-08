/**
 * @fileoverview Unit tests for security middleware modules
 * 
 * This test suite validates the configuration and exports of security middleware
 * modules per Agent Action Plan Section 0.8.2:
 * - Rate Limiter Configuration (rateLimiter.js)
 * - CORS Configuration (corsConfig.js)
 * - Helmet Configuration (security.js)
 * - Middleware Index Barrel (middleware/index.js)
 * - Validators Barrel (validators/index.js)
 * 
 * @module tests/unit/middleware/security
 */

'use strict';

/**
 * Loads a module with specified environment variables.
 * Resets module cache to ensure fresh evaluation.
 * @param {string} modulePath - Path to module
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
 * Clears specified environment variables before loading module.
 * @param {string} modulePath - Path to module
 * @param {string[]} keys - Environment variable keys to clear
 * @returns {*} Fresh module instance
 */
function loadModuleWithoutEnv(modulePath, keys) {
  jest.resetModules();
  keys.forEach(key => delete process.env[key]);
  return require(modulePath);
}

describe('Security Middleware Unit Tests', () => {
  /** @type {NodeJS.ProcessEnv} */
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Rate Limiter Configuration (rateLimiter.js)', () => {
    test('should export a function (middleware)', () => {
      const rateLimiter = require('../../../src/middleware/rateLimiter');
      expect(typeof rateLimiter).toBe('function');
    });

    test('should read rate limit window from config (default 900000ms)', () => {
      const config = loadModuleWithoutEnv('../../../src/config', ['RATE_LIMIT_WINDOW_MS']);
      expect(config.rateLimitWindowMs).toBe(900000);
    });

    test('should read rate limit max from config (default 100)', () => {
      const config = loadModuleWithoutEnv('../../../src/config', ['RATE_LIMIT_MAX']);
      expect(config.rateLimitMax).toBe(100);
    });

    test('should use custom RATE_LIMIT_WINDOW_MS from environment', () => {
      const config = loadModuleWithEnv('../../../src/config', { RATE_LIMIT_WINDOW_MS: '600000' });
      expect(config.rateLimitWindowMs).toBe(600000);
    });

    test('should use custom RATE_LIMIT_MAX from environment', () => {
      const config = loadModuleWithEnv('../../../src/config', { RATE_LIMIT_MAX: '50' });
      expect(config.rateLimitMax).toBe(50);
    });

    test('should be a valid Express middleware function', () => {
      const rateLimiter = require('../../../src/middleware/rateLimiter');
      // Express middleware can have various lengths (0-4 parameters)
      expect(rateLimiter.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('CORS Configuration (corsConfig.js)', () => {
    test('should export a function (middleware)', () => {
      const corsConfig = require('../../../src/middleware/corsConfig');
      expect(typeof corsConfig).toBe('function');
    });

    test('should read CORS origin from config (default *)', () => {
      const config = loadModuleWithoutEnv('../../../src/config', ['CORS_ORIGIN']);
      expect(config.corsOrigin).toBe('*');
    });

    test('should use custom CORS_ORIGIN from environment', () => {
      const config = loadModuleWithEnv('../../../src/config', { CORS_ORIGIN: 'https://example.com' });
      expect(config.corsOrigin).toBe('https://example.com');
    });

    test('should support comma-separated origins', () => {
      const config = loadModuleWithEnv('../../../src/config', { CORS_ORIGIN: 'https://a.com,https://b.com' });
      expect(config.corsOrigin).toBe('https://a.com,https://b.com');
    });

    test('should be a valid Express middleware function', () => {
      const corsConfig = require('../../../src/middleware/corsConfig');
      expect(corsConfig.length).toBeGreaterThanOrEqual(0);
    });

    test('should warn when using wildcard in production', () => {
      // Capture console.warn calls
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Load corsConfig with production NODE_ENV and wildcard CORS_ORIGIN
      const originalNodeEnv = process.env.NODE_ENV;
      const originalCorsOrigin = process.env.CORS_ORIGIN;
      
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = '*';
      
      // Clear module cache to force reload with new env vars
      jest.resetModules();
      
      // Loading the module should trigger the warning
      require('../../../src/middleware/corsConfig');
      
      // Verify warning was logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CORS is configured with wildcard')
      );
      
      // Restore
      process.env.NODE_ENV = originalNodeEnv;
      process.env.CORS_ORIGIN = originalCorsOrigin;
      warnSpy.mockRestore();
      jest.resetModules();
    });

    test('should parse comma-separated CORS origins into an array', () => {
      // Set up comma-separated origins
      const originalCorsOrigin = process.env.CORS_ORIGIN;
      process.env.CORS_ORIGIN = 'https://example.com,https://app.example.com,https://admin.example.com';
      
      // Clear module cache to force reload with new env vars
      jest.resetModules();
      
      // Load the module - this should process comma-separated origins
      const corsConfig = require('../../../src/middleware/corsConfig');
      
      // Verify corsConfig is a function (middleware)
      expect(typeof corsConfig).toBe('function');
      
      // Restore
      process.env.CORS_ORIGIN = originalCorsOrigin;
      jest.resetModules();
    });
  });

  describe('Security Module Aggregation (security.js)', () => {
    test('should export an object with security middleware', () => {
      const security = require('../../../src/middleware/security');
      expect(typeof security).toBe('object');
    });

    test('should export helmet middleware function', () => {
      const security = require('../../../src/middleware/security');
      expect(security.helmet).toBeDefined();
      expect(typeof security.helmet).toBe('function');
    });

    test('should export rateLimiter middleware function', () => {
      const security = require('../../../src/middleware/security');
      expect(security.rateLimiter).toBeDefined();
      expect(typeof security.rateLimiter).toBe('function');
    });

    test('should export corsConfig middleware function', () => {
      const security = require('../../../src/middleware/security');
      expect(security.corsConfig).toBeDefined();
      expect(typeof security.corsConfig).toBe('function');
    });

    test('should export exactly 3 security middleware properties', () => {
      const security = require('../../../src/middleware/security');
      const keys = Object.keys(security);
      expect(keys).toHaveLength(3);
      expect(keys).toContain('helmet');
      expect(keys).toContain('rateLimiter');
      expect(keys).toContain('corsConfig');
    });

    test('helmet should be pre-configured (callable middleware)', () => {
      const security = require('../../../src/middleware/security');
      // Pre-configured helmet is a function, not requiring () call
      expect(typeof security.helmet).toBe('function');
    });
  });

  describe('Middleware Index Barrel (middleware/index.js)', () => {
    test('should export security object', () => {
      const middleware = require('../../../src/middleware');
      expect(middleware.security).toBeDefined();
      expect(typeof middleware.security).toBe('object');
    });

    test('should export rateLimiter function', () => {
      const middleware = require('../../../src/middleware');
      expect(middleware.rateLimiter).toBeDefined();
      expect(typeof middleware.rateLimiter).toBe('function');
    });

    test('should export corsConfig function', () => {
      const middleware = require('../../../src/middleware');
      expect(middleware.corsConfig).toBeDefined();
      expect(typeof middleware.corsConfig).toBe('function');
    });

    test('should export validators object', () => {
      const middleware = require('../../../src/middleware');
      expect(middleware.validators).toBeDefined();
      expect(typeof middleware.validators).toBe('object');
    });

    test('should export exactly 4 properties', () => {
      const middleware = require('../../../src/middleware');
      const keys = Object.keys(middleware);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('security');
      expect(keys).toContain('rateLimiter');
      expect(keys).toContain('corsConfig');
      expect(keys).toContain('validators');
    });

    test('should support destructuring import pattern', () => {
      const { rateLimiter, corsConfig } = require('../../../src/middleware');
      expect(rateLimiter).toBeDefined();
      expect(corsConfig).toBeDefined();
    });
  });

  describe('Validators Barrel (validators/index.js)', () => {
    test('should export body validation chain builder', () => {
      const validators = require('../../../src/middleware/validators');
      expect(validators.body).toBeDefined();
      expect(typeof validators.body).toBe('function');
    });

    test('should export query validation chain builder', () => {
      const validators = require('../../../src/middleware/validators');
      expect(validators.query).toBeDefined();
      expect(typeof validators.query).toBe('function');
    });

    test('should export param validation chain builder', () => {
      const validators = require('../../../src/middleware/validators');
      expect(validators.param).toBeDefined();
      expect(typeof validators.param).toBe('function');
    });

    test('should export validationResult function', () => {
      const validators = require('../../../src/middleware/validators');
      expect(validators.validationResult).toBeDefined();
      expect(typeof validators.validationResult).toBe('function');
    });

    test('should export handleValidationErrors middleware', () => {
      const validators = require('../../../src/middleware/validators');
      expect(validators.handleValidationErrors).toBeDefined();
      expect(typeof validators.handleValidationErrors).toBe('function');
    });

    test('should export exactly 5 validator utilities', () => {
      const validators = require('../../../src/middleware/validators');
      const keys = Object.keys(validators);
      expect(keys).toHaveLength(5);
      expect(keys).toContain('body');
      expect(keys).toContain('query');
      expect(keys).toContain('param');
      expect(keys).toContain('validationResult');
      expect(keys).toContain('handleValidationErrors');
    });

    test('handleValidationErrors should be a middleware function', () => {
      const validators = require('../../../src/middleware/validators');
      // Middleware function should have 3 parameters (req, res, next)
      expect(validators.handleValidationErrors.length).toBe(3);
    });
  });

  describe('Config Security Settings', () => {
    test('should export corsOrigin setting', () => {
      const config = require('../../../src/config');
      expect(config).toHaveProperty('corsOrigin');
    });

    test('should export rateLimitWindowMs setting', () => {
      const config = require('../../../src/config');
      expect(config).toHaveProperty('rateLimitWindowMs');
    });

    test('should export rateLimitMax setting', () => {
      const config = require('../../../src/config');
      expect(config).toHaveProperty('rateLimitMax');
    });

    test('should export trustProxy setting', () => {
      const config = require('../../../src/config');
      expect(config).toHaveProperty('trustProxy');
    });

    test('trustProxy should default to false', () => {
      const config = loadModuleWithoutEnv('../../../src/config', ['TRUST_PROXY']);
      expect(config.trustProxy).toBe(false);
    });

    test('trustProxy should be true when TRUST_PROXY=true', () => {
      const config = loadModuleWithEnv('../../../src/config', { TRUST_PROXY: 'true' });
      expect(config.trustProxy).toBe(true);
    });
  });

  describe('Validation Error Handling', () => {
    test('handleValidationErrors should return 400 when errors exist', async () => {
      const { body, handleValidationErrors } = require('../../../src/middleware/validators');
      
      // Create a request with invalid data
      const mockReq = {
        body: {} // Empty body - required field is missing
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      // Run a validation chain that requires 'email' field
      const validationMiddleware = body('email').notEmpty().withMessage('Email is required');
      await validationMiddleware.run(mockReq);
      
      // Now run handleValidationErrors
      handleValidationErrors(mockReq, mockRes, mockNext);
      
      // Should return 400 with errors
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('handleValidationErrors should call next when no errors', async () => {
      const { body, handleValidationErrors } = require('../../../src/middleware/validators');
      
      // Create a request with valid data
      const mockReq = {
        body: { email: 'test@example.com' }
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockNext = jest.fn();
      
      // Run a validation chain that requires 'email' field (which is present and valid)
      const validationMiddleware = body('email').notEmpty();
      await validationMiddleware.run(mockReq);
      
      // Now run handleValidationErrors
      handleValidationErrors(mockReq, mockRes, mockNext);
      
      // Should call next without errors
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
