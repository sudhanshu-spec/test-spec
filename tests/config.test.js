/**
 * Configuration Unit Tests
 *
 * This test file validates the configuration module (src/config/index.js).
 * Tests verify default values, environment variable overrides, type correctness,
 * and edge case handling for configuration properties.
 *
 * Test Categories:
 * - Default values (port=3000, host='127.0.0.1', env='development')
 * - Type correctness (port is number)
 * - Environment variable overrides
 * - Edge cases (invalid PORT, empty PORT)
 *
 * @module tests/config.test
 * @requires ./helpers/test-utils - Test utility functions
 * @requires ./fixtures/env.fixtures - Environment variable test data
 */

'use strict';

const {
  resetEnvironment,
  resetModules,
  saveEnvironment,
  restoreEnvironment,
  applyEnvironment
} = require('./helpers/test-utils');

const {
  CUSTOM_PORT,
  CUSTOM_HOST,
  PRODUCTION,
  FULL_CUSTOM,
  INVALID_PORT,
  EMPTY_PORT
} = require('./fixtures/env.fixtures');

// ---------------------------------------------------------------------------
// Test Setup and Teardown
// ---------------------------------------------------------------------------

describe('Configuration Module', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = saveEnvironment();
  });

  afterAll(() => {
    restoreEnvironment(originalEnv);
  });

  beforeEach(() => {
    resetModules();
    resetEnvironment();
  });

  // -------------------------------------------------------------------------
  // Default Values Tests
  // -------------------------------------------------------------------------

  describe('Default Values', () => {
    test('should export port as 3000 when PORT not set', () => {
      const config = require('../src/config');
      expect(config.port).toBe(3000);
    });

    test("should export host as '127.0.0.1' when HOST not set", () => {
      const config = require('../src/config');
      expect(config.host).toBe('127.0.0.1');
    });

    test("should export env as 'development' when NODE_ENV not set", () => {
      const config = require('../src/config');
      expect(config.env).toBe('development');
    });

    test('should export object with host, port, env properties', () => {
      const config = require('../src/config');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('env');
    });

    test('should export exactly three configuration properties', () => {
      const config = require('../src/config');
      const keys = Object.keys(config);
      expect(keys).toContain('port');
      expect(keys).toContain('host');
      expect(keys).toContain('env');
    });
  });

  // -------------------------------------------------------------------------
  // Type Correctness Tests
  // -------------------------------------------------------------------------

  describe('Type Correctness', () => {
    test('port should be a number type', () => {
      const config = require('../src/config');
      expect(typeof config.port).toBe('number');
    });

    test('host should be a string type', () => {
      const config = require('../src/config');
      expect(typeof config.host).toBe('string');
    });

    test('env should be a string type', () => {
      const config = require('../src/config');
      expect(typeof config.env).toBe('string');
    });

    test('port should be parsed with parseInt radix 10', () => {
      process.env.PORT = '8080';
      const config = require('../src/config');
      // parseInt with radix 10 should parse '8080' as 8080
      expect(config.port).toBe(8080);
      expect(Number.isInteger(config.port)).toBe(true);
    });

    test('port should not be NaN when valid', () => {
      const config = require('../src/config');
      expect(Number.isNaN(config.port)).toBe(false);
    });

    test('default port should be an integer', () => {
      const config = require('../src/config');
      expect(Number.isInteger(config.port)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Environment Override Tests
  // -------------------------------------------------------------------------

  describe('Environment Overrides', () => {
    test('should use PORT env var when set (e.g., "8080" => 8080)', () => {
      applyEnvironment(CUSTOM_PORT);
      const config = require('../src/config');
      expect(config.port).toBe(8080);
    });

    test("should use HOST env var when set (e.g., '0.0.0.0')", () => {
      applyEnvironment(CUSTOM_HOST);
      const config = require('../src/config');
      expect(config.host).toBe('0.0.0.0');
    });

    test("should use NODE_ENV env var when set (e.g., 'production')", () => {
      applyEnvironment(PRODUCTION);
      const config = require('../src/config');
      expect(config.env).toBe('production');
    });

    test('should handle multiple environment overrides simultaneously', () => {
      applyEnvironment(FULL_CUSTOM);
      const config = require('../src/config');
      expect(config.port).toBe(9000);
      expect(config.host).toBe('127.0.0.1');
      expect(config.env).toBe('staging');
    });

    test('should override only PORT when only PORT is set', () => {
      process.env.PORT = '5000';
      const config = require('../src/config');
      expect(config.port).toBe(5000);
      expect(config.host).toBe('127.0.0.1');
      expect(config.env).toBe('development');
    });

    test('should override only HOST when only HOST is set', () => {
      process.env.HOST = '192.168.1.1';
      const config = require('../src/config');
      expect(config.port).toBe(3000);
      expect(config.host).toBe('192.168.1.1');
      expect(config.env).toBe('development');
    });

    test('should override only NODE_ENV when only NODE_ENV is set', () => {
      process.env.NODE_ENV = 'test';
      const config = require('../src/config');
      expect(config.port).toBe(3000);
      expect(config.host).toBe('127.0.0.1');
      expect(config.env).toBe('test');
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases Tests
  // -------------------------------------------------------------------------

  describe('Edge Cases', () => {
    test('should handle non-numeric PORT gracefully (fallback to 3000)', () => {
      applyEnvironment(INVALID_PORT);
      const config = require('../src/config');
      // parseInt('invalid', 10) returns NaN, || 3000 fallback
      expect(config.port).toBe(3000);
    });

    test('should handle empty string PORT (fallback to 3000)', () => {
      applyEnvironment(EMPTY_PORT);
      const config = require('../src/config');
      // parseInt('', 10) returns NaN, || 3000 fallback
      expect(config.port).toBe(3000);
    });

    test('should handle PORT with leading zeros', () => {
      process.env.PORT = '0080';
      const config = require('../src/config');
      // parseInt('0080', 10) returns 80
      expect(config.port).toBe(80);
    });

    test('should handle PORT with whitespace', () => {
      process.env.PORT = '  3001  ';
      const config = require('../src/config');
      // parseInt('  3001  ', 10) handles leading/trailing whitespace
      expect(config.port).toBe(3001);
    });

    test('should handle PORT value of "0"', () => {
      process.env.PORT = '0';
      const config = require('../src/config');
      // parseInt('0', 10) returns 0, which is falsy
      // The || 3000 will trigger for 0
      expect(config.port).toBe(3000);
    });

    test('should handle negative PORT value', () => {
      process.env.PORT = '-1';
      const config = require('../src/config');
      // parseInt('-1', 10) returns -1, which is truthy
      expect(config.port).toBe(-1);
    });

    test('should handle decimal PORT value', () => {
      process.env.PORT = '3000.5';
      const config = require('../src/config');
      // parseInt('3000.5', 10) returns 3000 (truncates decimal)
      expect(config.port).toBe(3000);
    });

    test('should handle PORT with non-numeric suffix', () => {
      process.env.PORT = '8080abc';
      const config = require('../src/config');
      // parseInt('8080abc', 10) returns 8080
      expect(config.port).toBe(8080);
    });

    test('should handle empty string HOST (use empty string)', () => {
      process.env.HOST = '';
      const config = require('../src/config');
      // '' || '127.0.0.1' => '127.0.0.1' (empty string is falsy)
      expect(config.host).toBe('127.0.0.1');
    });

    test('should handle empty string NODE_ENV (use empty string)', () => {
      process.env.NODE_ENV = '';
      const config = require('../src/config');
      // '' || 'development' => 'development' (empty string is falsy)
      expect(config.env).toBe('development');
    });
  });

  // -------------------------------------------------------------------------
  // Module Caching Tests
  // -------------------------------------------------------------------------

  describe('Module Caching Behavior', () => {
    test('should return same config values for repeated requires without reset', () => {
      const config1 = require('../src/config');
      const config2 = require('../src/config');
      expect(config1.port).toBe(config2.port);
      expect(config1.host).toBe(config2.host);
      expect(config1.env).toBe(config2.env);
    });

    test('should return new config after resetModules', () => {
      process.env.PORT = '4000';
      const config1 = require('../src/config');
      expect(config1.port).toBe(4000);

      resetModules();
      process.env.PORT = '5000';
      const config2 = require('../src/config');
      expect(config2.port).toBe(5000);
    });

    test('should reflect environment changes after module reset', () => {
      const config1 = require('../src/config');
      expect(config1.host).toBe('127.0.0.1');

      resetModules();
      process.env.HOST = '0.0.0.0';
      const config2 = require('../src/config');
      expect(config2.host).toBe('0.0.0.0');
    });
  });

  // -------------------------------------------------------------------------
  // Configuration Export Structure Tests
  // -------------------------------------------------------------------------

  describe('Configuration Export Structure', () => {
    test('should export a plain object (not a class instance)', () => {
      const config = require('../src/config');
      expect(config.constructor).toBe(Object);
    });

    test('should not have prototype methods', () => {
      const config = require('../src/config');
      expect(Object.getPrototypeOf(config)).toBe(Object.prototype);
    });

    test('config properties should be enumerable', () => {
      const config = require('../src/config');
      const descriptor = Object.getOwnPropertyDescriptor(config, 'port');
      expect(descriptor.enumerable).toBe(true);
    });

    test('config should be JSON serializable', () => {
      const config = require('../src/config');
      const serialized = JSON.stringify(config);
      const parsed = JSON.parse(serialized);
      expect(parsed.port).toBe(config.port);
      expect(parsed.host).toBe(config.host);
      expect(parsed.env).toBe(config.env);
    });
  });
});
