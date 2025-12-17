/**
 * Configuration Module Unit Tests
 *
 * This test suite provides comprehensive coverage for src/config/index.js.
 * Tests verify default values, environment variable overrides, edge cases,
 * and type validation for all configuration properties.
 *
 * Test Categories:
 * - Default Values Tests: Verify default host, port, and env values
 * - Environment Override Tests: Verify process.env overrides work correctly
 * - Edge Case Tests: Handle empty strings, invalid values, edge conditions
 * - Type Validation Tests: Ensure correct data types for all config properties
 *
 * Special Setup Requirements:
 * - Uses jest.resetModules() to clear module cache between tests
 * - Saves and restores process.env to ensure test isolation
 *
 * @module tests/config.test
 */

'use strict';

describe('config', () => {
  // Store original process.env to restore after each test
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset Jest's module cache to ensure fresh config require
    jest.resetModules();
    // Create a shallow copy of original environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env after each test
    process.env = originalEnv;
  });

  describe('Default Values', () => {
    it('should use default HOST of 127.0.0.1 when HOST env is not set', () => {
      // Ensure HOST is not set
      delete process.env.HOST;

      // Fresh require to get config with current environment
      const config = require('../src/config');

      expect(config.host).toBe('127.0.0.1');
    });

    it('should use default PORT of 3000 when PORT env is not set', () => {
      // Ensure PORT is not set
      delete process.env.PORT;

      // Fresh require to get config with current environment
      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should use default NODE_ENV of development when NODE_ENV is not set', () => {
      // Ensure NODE_ENV is not set
      delete process.env.NODE_ENV;

      // Fresh require to get config with current environment
      const config = require('../src/config');

      expect(config.env).toBe('development');
    });

    it('should have all three default properties when no env vars are set', () => {
      // Clear all relevant environment variables
      delete process.env.HOST;
      delete process.env.PORT;
      delete process.env.NODE_ENV;

      // Fresh require to get config with current environment
      const config = require('../src/config');

      expect(config).toEqual({
        host: '127.0.0.1',
        port: 3000,
        env: 'development'
      });
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should override HOST when HOST env is set', () => {
      process.env.HOST = '0.0.0.0';

      const config = require('../src/config');

      expect(config.host).toBe('0.0.0.0');
    });

    it('should override PORT when PORT env is set', () => {
      process.env.PORT = '8080';

      const config = require('../src/config');

      expect(config.port).toBe(8080);
    });

    it('should parse PORT as integer', () => {
      process.env.PORT = '4567';

      const config = require('../src/config');

      expect(config.port).toBe(4567);
      expect(typeof config.port).toBe('number');
      expect(Number.isInteger(config.port)).toBe(true);
    });

    it('should override NODE_ENV when NODE_ENV env is set to production', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(config.env).toBe('production');
    });

    it('should override NODE_ENV when NODE_ENV env is set to test', () => {
      process.env.NODE_ENV = 'test';

      const config = require('../src/config');

      expect(config.env).toBe('test');
    });

    it('should accept custom NODE_ENV values', () => {
      process.env.NODE_ENV = 'staging';

      const config = require('../src/config');

      expect(config.env).toBe('staging');
    });

    it('should override all values when all env vars are set', () => {
      process.env.HOST = '192.168.1.100';
      process.env.PORT = '9000';
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(config).toEqual({
        host: '192.168.1.100',
        port: 9000,
        env: 'production'
      });
    });

    it('should accept localhost as HOST value', () => {
      process.env.HOST = 'localhost';

      const config = require('../src/config');

      expect(config.host).toBe('localhost');
    });

    it('should accept IPv6 address as HOST value', () => {
      process.env.HOST = '::1';

      const config = require('../src/config');

      expect(config.host).toBe('::1');
    });
  });

  describe('Edge Cases - HOST', () => {
    it('should fall back to default when HOST is empty string', () => {
      // Empty string is falsy in JavaScript, so || should trigger default
      process.env.HOST = '';

      const config = require('../src/config');

      // Empty string is falsy, so it should fall back to default
      expect(config.host).toBe('127.0.0.1');
    });

    it('should accept whitespace-only HOST as valid', () => {
      // Whitespace is truthy (non-empty string), so it should be used
      process.env.HOST = '   ';

      const config = require('../src/config');

      // Whitespace is truthy, so it will be used (even though not a valid host)
      expect(config.host).toBe('   ');
    });

    it('should accept HOST with special characters', () => {
      process.env.HOST = 'my-server.example.com';

      const config = require('../src/config');

      expect(config.host).toBe('my-server.example.com');
    });
  });

  describe('Edge Cases - PORT', () => {
    it('should fall back to default when PORT is empty string', () => {
      // parseInt('', 10) returns NaN, and NaN is falsy
      process.env.PORT = '';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should fall back to default when PORT is non-numeric string', () => {
      // parseInt('invalid', 10) returns NaN, and NaN is falsy
      process.env.PORT = 'invalid';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should handle PORT with leading zeros correctly', () => {
      // parseInt('0080', 10) returns 80 (base 10 parsing ignores leading zeros)
      process.env.PORT = '0080';

      const config = require('../src/config');

      expect(config.port).toBe(80);
    });

    it('should handle PORT with trailing spaces', () => {
      // parseInt trims leading whitespace and parses until non-digit
      process.env.PORT = '8080  ';

      const config = require('../src/config');

      expect(config.port).toBe(8080);
    });

    it('should handle PORT with leading spaces', () => {
      // parseInt trims leading whitespace
      process.env.PORT = '  8080';

      const config = require('../src/config');

      expect(config.port).toBe(8080);
    });

    it('should handle PORT with mixed valid and invalid characters', () => {
      // parseInt('80abc', 10) returns 80 (stops at first non-digit)
      process.env.PORT = '80abc';

      const config = require('../src/config');

      expect(config.port).toBe(80);
    });

    it('should fall back to default when PORT starts with non-digit', () => {
      // parseInt('abc80', 10) returns NaN
      process.env.PORT = 'abc80';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should handle PORT of 0', () => {
      // parseInt('0', 10) returns 0, but 0 is falsy, so should fall back to default
      process.env.PORT = '0';

      const config = require('../src/config');

      // 0 is falsy in JavaScript, so || 3000 evaluates to 3000
      expect(config.port).toBe(3000);
    });

    it('should handle negative PORT values', () => {
      // parseInt('-80', 10) returns -80, which is truthy
      process.env.PORT = '-80';

      const config = require('../src/config');

      // -80 is truthy (negative numbers are truthy except -0)
      expect(config.port).toBe(-80);
    });

    it('should handle decimal PORT values', () => {
      // parseInt('3000.5', 10) returns 3000 (stops at decimal point)
      process.env.PORT = '3000.5';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });

    it('should handle very large PORT values', () => {
      process.env.PORT = '65535';

      const config = require('../src/config');

      expect(config.port).toBe(65535);
    });

    it('should handle hexadecimal-like strings as decimal', () => {
      // parseInt('0x50', 10) with radix 10 returns 0 (stops at 'x')
      // 0 is falsy, so falls back to default
      process.env.PORT = '0x50';

      const config = require('../src/config');

      expect(config.port).toBe(3000);
    });
  });

  describe('Edge Cases - NODE_ENV', () => {
    it('should fall back to default when NODE_ENV is empty string', () => {
      // Empty string is falsy
      process.env.NODE_ENV = '';

      const config = require('../src/config');

      expect(config.env).toBe('development');
    });

    it('should accept whitespace-only NODE_ENV as valid', () => {
      // Whitespace is truthy
      process.env.NODE_ENV = '  ';

      const config = require('../src/config');

      expect(config.env).toBe('  ');
    });

    it('should accept lowercase environment names', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(config.env).toBe('production');
    });

    it('should accept uppercase environment names', () => {
      process.env.NODE_ENV = 'PRODUCTION';

      const config = require('../src/config');

      expect(config.env).toBe('PRODUCTION');
    });

    it('should accept mixed case environment names', () => {
      process.env.NODE_ENV = 'Production';

      const config = require('../src/config');

      expect(config.env).toBe('Production');
    });
  });

  describe('Type Validation', () => {
    it('should always return host as a string', () => {
      delete process.env.HOST;

      const config = require('../src/config');

      expect(typeof config.host).toBe('string');
    });

    it('should return host as string when HOST env is set', () => {
      process.env.HOST = '0.0.0.0';

      const config = require('../src/config');

      expect(typeof config.host).toBe('string');
    });

    it('should always return port as a number', () => {
      delete process.env.PORT;

      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });

    it('should return port as number when PORT env is set', () => {
      process.env.PORT = '8080';

      const config = require('../src/config');

      expect(typeof config.port).toBe('number');
    });

    it('should always return env as a string', () => {
      delete process.env.NODE_ENV;

      const config = require('../src/config');

      expect(typeof config.env).toBe('string');
    });

    it('should return env as string when NODE_ENV is set', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../src/config');

      expect(typeof config.env).toBe('string');
    });

    it('should have only host, port, and env properties', () => {
      delete process.env.HOST;
      delete process.env.PORT;
      delete process.env.NODE_ENV;

      const config = require('../src/config');

      const keys = Object.keys(config);
      expect(keys).toHaveLength(3);
      expect(keys).toContain('host');
      expect(keys).toContain('port');
      expect(keys).toContain('env');
    });

    it('should return port as integer when valid PORT string is provided', () => {
      process.env.PORT = '8080';

      const config = require('../src/config');

      expect(Number.isInteger(config.port)).toBe(true);
    });

    it('should return port as integer for default value', () => {
      delete process.env.PORT;

      const config = require('../src/config');

      expect(Number.isInteger(config.port)).toBe(true);
    });
  });

  describe('Module Export Behavior', () => {
    it('should export an object', () => {
      const config = require('../src/config');

      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });

    it('should export a plain object (not an array)', () => {
      const config = require('../src/config');

      expect(Array.isArray(config)).toBe(false);
    });

    it('should be the same cached instance on multiple requires within same test', () => {
      // Note: Within the same test, jest.resetModules has already run,
      // so multiple requires will return the same cached instance
      const config1 = require('../src/config');
      const config2 = require('../src/config');

      expect(config1).toBe(config2);
    });

    it('should return fresh instance after jest.resetModules', () => {
      // First require
      const config1 = require('../src/config');

      // Reset modules to clear cache
      jest.resetModules();

      // Modify environment
      process.env.PORT = '9999';

      // Second require should get new instance with new env
      const config2 = require('../src/config');

      // Values should differ due to different environment at time of require
      expect(config1.port).toBe(3000); // Original default
      expect(config2.port).toBe(9999); // New value after env change
    });
  });

  describe('Configuration Value Boundaries', () => {
    it('should handle minimum valid port (1)', () => {
      process.env.PORT = '1';

      const config = require('../src/config');

      expect(config.port).toBe(1);
    });

    it('should handle maximum valid port (65535)', () => {
      process.env.PORT = '65535';

      const config = require('../src/config');

      expect(config.port).toBe(65535);
    });

    it('should handle port values beyond standard range', () => {
      // parseInt will still parse it, even if it's beyond valid port range
      process.env.PORT = '70000';

      const config = require('../src/config');

      expect(config.port).toBe(70000);
    });

    it('should handle very long HOST strings', () => {
      const longHost = 'a'.repeat(1000);
      process.env.HOST = longHost;

      const config = require('../src/config');

      expect(config.host).toBe(longHost);
    });

    it('should handle very long NODE_ENV strings', () => {
      const longEnv = 'test'.repeat(100);
      process.env.NODE_ENV = longEnv;

      const config = require('../src/config');

      expect(config.env).toBe(longEnv);
    });
  });
});
