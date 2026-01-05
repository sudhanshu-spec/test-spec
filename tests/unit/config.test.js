/**
 * Configuration Module Unit Tests
 *
 * Tests for src/config/index.js
 *
 * This test file verifies the configuration module behavior including:
 * - Default value fallbacks for HOST, PORT, and NODE_ENV
 * - Custom environment variable overrides
 * - Edge cases for invalid input handling
 * - Type checking for configuration values
 *
 * Test isolation is achieved using jest.resetModules() to force re-evaluation
 * of the configuration module with new environment variable values.
 *
 * @module tests/unit/config.test
 */

describe('Configuration Module', () => {
  /**
   * Store the original process.env to restore after tests
   * This ensures test isolation and prevents side effects
   */
  const originalEnv = process.env;

  /**
   * Before each test:
   * - Reset module cache to force fresh config evaluation
   * - Create a clean copy of process.env
   */
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  /**
   * After all tests complete:
   * - Restore the original process.env
   */
  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Default Values Tests
   *
   * Verify that the configuration module returns correct default values
   * when environment variables are not set, maintaining backward compatibility
   * with the original server.js implementation.
   */
  describe('Default Values', () => {
    test('should default host to 127.0.0.1 when HOST not set', () => {
      // Remove HOST environment variable to test default
      delete process.env.HOST;

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify default host matches original server.js default
      expect(config.host).toBe('127.0.0.1');
    });

    test('should default port to 3000 when PORT not set', () => {
      // Remove PORT environment variable to test default
      delete process.env.PORT;

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify default port matches original server.js default
      expect(config.port).toBe(3000);
    });

    test('should default env to development when NODE_ENV not set', () => {
      // Remove NODE_ENV environment variable to test default
      delete process.env.NODE_ENV;

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify default environment is 'development'
      expect(config.env).toBe('development');
    });
  });

  /**
   * Custom Values Tests
   *
   * Verify that the configuration module correctly reads and applies
   * custom values from environment variables when they are set.
   */
  describe('Custom Values', () => {
    test('should use HOST env var when set', () => {
      // Set custom HOST value
      process.env.HOST = '0.0.0.0';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify custom HOST is used
      expect(config.host).toBe('0.0.0.0');
    });

    test('should use PORT env var when set', () => {
      // Set custom PORT value as string (as environment variables are)
      process.env.PORT = '8080';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify custom PORT is parsed and used as number
      expect(config.port).toBe(8080);
    });

    test('should use NODE_ENV env var when set', () => {
      // Set custom NODE_ENV value
      process.env.NODE_ENV = 'production';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify custom NODE_ENV is used
      expect(config.env).toBe('production');
    });
  });

  /**
   * Edge Cases Tests
   *
   * Verify that the configuration module handles edge cases and invalid
   * inputs gracefully, using appropriate fallback mechanisms.
   */
  describe('Edge Cases', () => {
    test('should fallback to default port for invalid PORT string', () => {
      // Set invalid non-numeric PORT value
      process.env.PORT = 'abc';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // parseInt('abc', 10) returns NaN, which triggers || 3000 fallback
      expect(config.port).toBe(3000);
    });

    test('should fallback to default port for empty PORT string', () => {
      // Set empty PORT value
      process.env.PORT = '';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // parseInt('', 10) returns NaN, which triggers || 3000 fallback
      expect(config.port).toBe(3000);
    });

    test('should handle PORT with leading/trailing whitespace', () => {
      // Set PORT with whitespace (parseInt handles leading whitespace)
      process.env.PORT = '  9000  ';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // parseInt trims leading whitespace and parses the number
      expect(config.port).toBe(9000);
    });

    test('should parse PORT with decimal by truncating', () => {
      // Set PORT with decimal value
      process.env.PORT = '3000.5';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // parseInt stops at non-digit character, so 3000.5 becomes 3000
      expect(config.port).toBe(3000);
    });
  });

  /**
   * Type Checking Tests
   *
   * Verify that configuration values have the correct JavaScript types
   * after being processed by the configuration module.
   */
  describe('Type Checking', () => {
    test('should return port as a number type', () => {
      // Set valid PORT value
      process.env.PORT = '8080';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify port is a number type (not string)
      expect(typeof config.port).toBe('number');
    });

    test('should return host as a string type', () => {
      // Set valid HOST value
      process.env.HOST = '192.168.1.1';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify host is a string type
      expect(typeof config.host).toBe('string');
    });

    test('should return env as a string type', () => {
      // Set valid NODE_ENV value
      process.env.NODE_ENV = 'test';

      // Require fresh config module after env modification
      const config = require('../../src/config');

      // Verify env is a string type
      expect(typeof config.env).toBe('string');
    });
  });

  /**
   * Configuration Object Structure Tests
   *
   * Verify that the configuration module exports an object with all
   * expected properties.
   */
  describe('Configuration Object Structure', () => {
    test('should export an object with host, port, and env properties', () => {
      // Require fresh config module
      const config = require('../../src/config');

      // Verify all expected properties exist
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('env');
    });

    test('should not have undefined values for any configuration property', () => {
      // Require fresh config module
      const config = require('../../src/config');

      // Verify no properties are undefined
      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.env).toBeDefined();
    });
  });
});
