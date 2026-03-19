'use strict';

/**
 * Unit tests for src/config/index.js — Configuration Management Module
 *
 * Tests validate default values, environment variable overrides via
 * HOST/PORT/NODE_ENV, parseInt coercion behavior, and edge cases for
 * invalid or boundary PORT values.
 *
 * CRITICAL: The config module reads process.env at module evaluation time.
 * Every test MUST:
 *   1. Use jest.resetModules() (done in beforeEach) to clear cached modules
 *   2. Manipulate process.env BEFORE calling require('../src/config')
 *   3. Call require('../src/config') INSIDE the test body, not at file top level
 */

describe('src/config/index.js', () => {
  let originalEnv;

  beforeEach(() => {
    // Save the entire process.env so we can restore it after each test
    originalEnv = { ...process.env };
    // Clear the module cache so require() re-evaluates the config module
    jest.resetModules();
  });

  afterEach(() => {
    // Restore the original environment to ensure complete test isolation
    process.env = originalEnv;
  });

  // ---------------------------------------------------------------------------
  // Default Values
  // ---------------------------------------------------------------------------
  describe('Default values', () => {
    it('should default host to 127.0.0.1 when HOST env var is not set', () => {
      delete process.env.HOST;

      const config = require('../src/config');

      expect(config.host).toBe('127.0.0.1');
    });

    it('should default port to 3000 when PORT env var is not set', () => {
      delete process.env.PORT;

      const config = require('../src/config');

      expect(config.port).toBe(3000);
      expect(typeof config.port).toBe('number');
    });

    it('should default env to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const config = require('../src/config');

      expect(config.env).toBe('development');
    });

    it('should export an object with exactly host, port, and env properties', () => {
      const config = require('../src/config');

      expect(Object.keys(config).sort()).toEqual(['env', 'host', 'port']);
    });

    it('should return port as a number type', () => {
      delete process.env.PORT;

      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Environment Variable Overrides
  // ---------------------------------------------------------------------------
  describe('Environment variable overrides', () => {
    it('should use HOST env var when set', () => {
      process.env.HOST = '0.0.0.0';

      const config = require('../src/config');

      expect(config.host).toBe('0.0.0.0');
    });

    it('should use PORT env var when set to valid number string', () => {
      process.env.PORT = '8080';

      const config = require('../src/config');

      expect(config.port).toBe(8080);
      expect(typeof config.port).toBe('number');
    });

    it('should use NODE_ENV env var when set', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(config.env).toBe('production');
    });

    it('should use NODE_ENV test when set', () => {
      process.env.NODE_ENV = 'test';

      const config = require('../src/config');

      expect(config.env).toBe('test');
    });

    it('should override all three values simultaneously', () => {
      process.env.HOST = '192.168.1.1';
      process.env.PORT = '9090';
      process.env.NODE_ENV = 'staging';

      const config = require('../src/config');

      expect(config.host).toBe('192.168.1.1');
      expect(config.port).toBe(9090);
      expect(config.env).toBe('staging');
    });
  });

  // ---------------------------------------------------------------------------
  // PORT parseInt Coercion
  // ---------------------------------------------------------------------------
  describe('PORT parseInt coercion', () => {
    it('should parse PORT string to integer', () => {
      process.env.PORT = '3000';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
      expect(config.port).toStrictEqual(3000);
    });

    it('should truncate decimal PORT values via parseInt', () => {
      // parseInt truncates the fractional part — it does NOT round
      process.env.PORT = '3000.5';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should parse PORT with leading zeros using radix 10', () => {
      // radix 10 prevents octal interpretation: '0080' → 80, not an error
      process.env.PORT = '0080';

      const config = require('../src/config');

      expect(config.port).toBe(80);
    });

    it('should use parseInt with radix 10 (not octal)', () => {
      // '010' with radix 10 → 10, NOT 8 (which would be octal interpretation)
      process.env.PORT = '010';

      const config = require('../src/config');

      expect(config.port).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('should fall through to default 3000 when PORT is 0', () => {
      // parseInt('0', 10) → 0, which is falsy.
      // The || operator evaluates: 0 || 3000 → 3000
      // This is documented behavior of the || fallback operator.
      process.env.PORT = '0';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should fall through to default 3000 when PORT is non-numeric string', () => {
      // parseInt('abc', 10) → NaN, which is falsy.
      // NaN || 3000 → 3000
      process.env.PORT = 'abc';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should fall through to default 3000 when PORT is empty string', () => {
      // parseInt('', 10) → NaN, which is falsy.
      // NaN || 3000 → 3000
      process.env.PORT = '';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should fall through to default host when HOST is empty string', () => {
      // '' is falsy, so '' || '127.0.0.1' → '127.0.0.1'
      process.env.HOST = '';

      const config = require('../src/config');

      expect(config.host).toBe('127.0.0.1');
    });

    it('should fall through to default env when NODE_ENV is empty string', () => {
      // '' is falsy, so '' || 'development' → 'development'
      process.env.NODE_ENV = '';

      const config = require('../src/config');

      expect(config.env).toBe('development');
    });

    it('should accept HOST with special characters', () => {
      process.env.HOST = 'my-host.example.com';

      const config = require('../src/config');

      expect(config.host).toBe('my-host.example.com');
    });

    it('should accept large port numbers', () => {
      process.env.PORT = '65535';

      const config = require('../src/config');

      expect(config.port).toBe(65535);
    });

    it('should handle negative PORT by using the parsed value', () => {
      // parseInt('-1', 10) → -1, which is truthy (any non-zero number is truthy).
      // So -1 || 3000 → -1
      // The config module does NOT validate port ranges; it only parses.
      process.env.PORT = '-1';

      const config = require('../src/config');

      expect(config.port).toBe(-1);
    });
  });
});
