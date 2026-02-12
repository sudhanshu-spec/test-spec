/**
 * Configuration Module Unit Tests
 *
 * Tests for src/config/index.js — validates default configuration values,
 * environment variable overrides, and parseInt edge cases for the PORT setting.
 *
 * CRITICAL PATTERN: The config module evaluates process.env at require-time
 * (module load), not at function call time. Each test MUST:
 *   1. Call jest.resetModules() to clear the module cache
 *   2. Set desired process.env values BEFORE requiring the config module
 *   3. Use a fresh require('../../src/config') inside each test block
 *
 * @module tests/unit/config.test
 */

'use strict';

describe('Configuration Module', () => {
  /**
   * Saved copy of the original process.env to restore after each test,
   * preventing cross-test pollution of environment variable state.
   * @type {NodeJS.ProcessEnv}
   */
  let originalEnv;

  beforeEach(() => {
    // Save the entire process.env state before each test
    originalEnv = { ...process.env };
    // Clear the module cache so the next require() re-evaluates process.env
    jest.resetModules();
  });

  afterEach(() => {
    // Restore the original process.env state after each test
    process.env = originalEnv;
  });

  // ===========================================================================
  // Default Values
  // ===========================================================================

  describe('Default Values', () => {
    test('should return default host 127.0.0.1 when HOST is not set', () => {
      // Remove HOST to test the fallback path: process.env.HOST || '127.0.0.1'
      delete process.env.HOST;

      const config = require('../../src/config');

      expect(config.host).toBe('127.0.0.1');
    });

    test('should return default port 3000 when PORT is not set', () => {
      // Remove PORT to test the fallback path: parseInt(process.env.PORT, 10) || 3000
      delete process.env.PORT;

      const config = require('../../src/config');

      expect(config.port).toBe(3000);
    });

    test('should return default env development when NODE_ENV is not set', () => {
      // Remove NODE_ENV to test the fallback path: process.env.NODE_ENV || 'development'
      delete process.env.NODE_ENV;

      const config = require('../../src/config');

      expect(config.env).toBe('development');
    });
  });

  // ===========================================================================
  // Environment Variable Overrides
  // ===========================================================================

  describe('Environment Variable Overrides', () => {
    test('should use HOST environment variable when set', () => {
      process.env.HOST = '0.0.0.0';

      const config = require('../../src/config');

      expect(config.host).toBe('0.0.0.0');
    });

    test('should use PORT environment variable when set (parsed as integer)', () => {
      process.env.PORT = '8080';

      const config = require('../../src/config');

      // Verify port is parsed as an integer, not kept as a string
      expect(config.port).toBe(8080);
      expect(typeof config.port).toBe('number');
    });

    test('should use NODE_ENV environment variable when set', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../../src/config');

      expect(config.env).toBe('production');
    });
  });

  // ===========================================================================
  // PORT Edge Cases
  // ===========================================================================

  describe('PORT Edge Cases', () => {
    test('should fall back to 3000 when PORT is non-numeric string', () => {
      // parseInt('abc', 10) returns NaN; NaN || 3000 evaluates to 3000
      process.env.PORT = 'abc';

      const config = require('../../src/config');

      expect(config.port).toBe(3000);
    });

    test('should fall back to 3000 when PORT is empty string', () => {
      // parseInt('', 10) returns NaN; NaN || 3000 evaluates to 3000
      process.env.PORT = '';

      const config = require('../../src/config');

      expect(config.port).toBe(3000);
    });

    test('should fall back to 3000 when PORT is 0', () => {
      // parseInt('0', 10) returns 0; 0 is falsy, so 0 || 3000 evaluates to 3000
      process.env.PORT = '0';

      const config = require('../../src/config');

      expect(config.port).toBe(3000);
    });

    test('should parse PORT as integer truncating decimals', () => {
      // parseInt('3000.5', 10) returns 3000 (truncates decimal);
      // 3000 is truthy, so 3000 || 3000 remains 3000
      process.env.PORT = '3000.5';

      const config = require('../../src/config');

      expect(config.port).toBe(3000);
    });
  });
});
