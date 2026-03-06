/**
 * Security Middleware Factory Test Suite
 *
 * Verifies that the createSecurityMiddleware factory function correctly
 * creates and configures helmet, cors, and rate-limit middleware instances
 * based on the provided configuration object.
 *
 * @module tests/security/middleware.test
 */

'use strict';

const { createSecurityMiddleware } = require('../../src/middleware/security');

describe('Security Middleware Factory (createSecurityMiddleware)', () => {
  describe('Input Validation', () => {
    /**
     * The factory should throw when called without a configuration object.
     */
    it('should throw an error when config is not provided', () => {
      expect(() => createSecurityMiddleware()).toThrow('createSecurityMiddleware requires a configuration object');
    });

    /**
     * The factory should throw when called with null.
     */
    it('should throw an error when config is null', () => {
      expect(() => createSecurityMiddleware(null)).toThrow('createSecurityMiddleware requires a configuration object');
    });

    /**
     * The factory should throw when called with a non-object argument.
     */
    it('should throw an error when config is a string', () => {
      expect(() => createSecurityMiddleware('invalid')).toThrow('createSecurityMiddleware requires a configuration object');
    });
  });

  describe('Return Value', () => {
    const validConfig = {
      env: 'development',
      rateLimitWindowMs: 900000,
      rateLimitMax: 100,
      corsOrigins: '*'
    };

    /**
     * The factory should return an object with three middleware functions.
     */
    it('should return an object with helmetMiddleware, corsMiddleware, and rateLimitMiddleware', () => {
      const result = createSecurityMiddleware(validConfig);
      expect(result).toBeDefined();
      expect(result.helmetMiddleware).toBeDefined();
      expect(result.corsMiddleware).toBeDefined();
      expect(result.rateLimitMiddleware).toBeDefined();
    });

    /**
     * Each returned middleware should be a function (Express middleware signature).
     */
    it('should return functions for all middleware', () => {
      const result = createSecurityMiddleware(validConfig);
      expect(typeof result.helmetMiddleware).toBe('function');
      expect(typeof result.corsMiddleware).toBe('function');
      expect(typeof result.rateLimitMiddleware).toBe('function');
    });
  });

  describe('Default Configuration', () => {
    /**
     * The factory should use sensible defaults when config properties
     * are missing (empty config object).
     */
    it('should work with an empty config object using defaults', () => {
      const result = createSecurityMiddleware({});
      expect(result.helmetMiddleware).toBeDefined();
      expect(result.corsMiddleware).toBeDefined();
      expect(result.rateLimitMiddleware).toBeDefined();
    });

    /**
     * The factory should work with partial config (only env specified).
     */
    it('should work with partial config', () => {
      const result = createSecurityMiddleware({ env: 'production' });
      expect(typeof result.helmetMiddleware).toBe('function');
      expect(typeof result.corsMiddleware).toBe('function');
      expect(typeof result.rateLimitMiddleware).toBe('function');
    });
  });

  describe('Environment Configurations', () => {
    /**
     * Development configuration should produce valid middleware.
     */
    it('should create middleware for development environment', () => {
      const result = createSecurityMiddleware({
        env: 'development',
        rateLimitWindowMs: 900000,
        rateLimitMax: 100,
        corsOrigins: '*'
      });
      expect(typeof result.helmetMiddleware).toBe('function');
    });

    /**
     * Production configuration should produce valid middleware.
     */
    it('should create middleware for production environment', () => {
      const result = createSecurityMiddleware({
        env: 'production',
        rateLimitWindowMs: 900000,
        rateLimitMax: 100,
        corsOrigins: 'https://example.com'
      });
      expect(typeof result.helmetMiddleware).toBe('function');
    });
  });

  describe('CORS Origins Parsing', () => {
    /**
     * Single origin string should be handled correctly.
     */
    it('should handle single origin string', () => {
      const result = createSecurityMiddleware({
        corsOrigins: 'http://localhost:3000'
      });
      expect(typeof result.corsMiddleware).toBe('function');
    });

    /**
     * Comma-separated origins should be parsed correctly.
     */
    it('should handle comma-separated origins', () => {
      const result = createSecurityMiddleware({
        corsOrigins: 'http://localhost:3000,https://example.com'
      });
      expect(typeof result.corsMiddleware).toBe('function');
    });

    /**
     * Wildcard origin should be handled correctly.
     */
    it('should handle wildcard origin', () => {
      const result = createSecurityMiddleware({
        corsOrigins: '*'
      });
      expect(typeof result.corsMiddleware).toBe('function');
    });
  });
});
