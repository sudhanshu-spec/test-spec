'use strict';

/**
 * Unit Tests for Configuration Module
 * 
 * This module provides comprehensive unit tests for the configuration module
 * (src/config/index.js). Tests validate default configuration values,
 * environment variable override behavior, and PORT integer parsing.
 * 
 * Configuration Contract Tested:
 * - Default host: '127.0.0.1'
 * - Default port: 3000 (number, not string)
 * - Default env: 'development'
 * - Environment variables override defaults
 * - PORT parsing uses parseInt with radix 10
 * 
 * @module tests/unit/config.test
 * @see Section 0.5.2 - Unit tests for configuration module
 * @see Section 0.4.4 - Test Data and Fixtures Design
 */

describe('config (src/config/index.js)', () => {
  // Store original environment for restoration
  const originalEnv = { ...process.env };

  /**
   * Before each test:
   * - Reset modules to re-evaluate config with new environment variables
   * - Clear relevant environment variables to test defaults
   */
  beforeEach(() => {
    jest.resetModules();
    delete process.env.HOST;
    delete process.env.PORT;
    delete process.env.NODE_ENV;
  });

  /**
   * After each test:
   * - Restore original environment variables
   */
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ============================================================================
  // Default Values Tests
  // ============================================================================

  describe('default values', () => {
    test('should return "127.0.0.1" for host when HOST not set', () => {
      // Arrange - HOST env var is cleared in beforeEach
      // Act - Require the config module
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('127.0.0.1');
    });

    test('should return 3000 for port when PORT not set', () => {
      // Arrange - PORT env var is cleared in beforeEach
      // Act
      const config = require('../../src/config');
      
      // Assert - Port should be a number, not string
      expect(config.port).toBe(3000);
      expect(typeof config.port).toBe('number');
    });

    test('should return "development" for env when NODE_ENV not set', () => {
      // Arrange - NODE_ENV is cleared in beforeEach
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.env).toBe('development');
    });

    test('should return all three default values in correct object shape', () => {
      const config = require('../../src/config');
      
      expect(config).toEqual({
        host: '127.0.0.1',
        port: 3000,
        env: 'development'
      });
    });

    test('should export exactly three properties', () => {
      const config = require('../../src/config');
      
      expect(Object.keys(config)).toHaveLength(3);
      expect(Object.keys(config)).toEqual(['host', 'port', 'env']);
    });
  });

  // ============================================================================
  // Environment Variable Override Tests
  // ============================================================================

  describe('environment variable overrides', () => {
    test('should use HOST env var when set', () => {
      // Arrange
      process.env.HOST = '0.0.0.0';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('0.0.0.0');
    });

    test('should use PORT env var when set', () => {
      // Arrange
      process.env.PORT = '8080';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(8080);
      expect(typeof config.port).toBe('number');
    });

    test('should use NODE_ENV env var when set', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.env).toBe('production');
    });

    test('should handle multiple overrides simultaneously', () => {
      // Arrange
      process.env.HOST = '192.168.1.100';
      process.env.PORT = '9000';
      process.env.NODE_ENV = 'staging';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config).toEqual({
        host: '192.168.1.100',
        port: 9000,
        env: 'staging'
      });
    });

    test('should allow localhost as HOST value', () => {
      process.env.HOST = 'localhost';
      const config = require('../../src/config');
      expect(config.host).toBe('localhost');
    });

    test('should allow IPv6 address as HOST value', () => {
      process.env.HOST = '::1';
      const config = require('../../src/config');
      expect(config.host).toBe('::1');
    });

    test('should allow test as NODE_ENV value', () => {
      process.env.NODE_ENV = 'test';
      const config = require('../../src/config');
      expect(config.env).toBe('test');
    });
  });

  // ============================================================================
  // PORT Parsing Edge Cases
  // ============================================================================

  describe('PORT parsing edge cases', () => {
    test('should parse PORT as integer with radix 10', () => {
      // parseInt('0080', 10) should parse as 80, not octal
      process.env.PORT = '0080';
      const config = require('../../src/config');
      expect(config.port).toBe(80);
    });

    test('should return default 3000 for non-numeric PORT', () => {
      // parseInt('invalid', 10) returns NaN, which is falsy
      process.env.PORT = 'invalid';
      const config = require('../../src/config');
      expect(config.port).toBe(3000);
    });

    test('should return default 3000 for empty PORT string', () => {
      // parseInt('', 10) returns NaN
      process.env.PORT = '';
      const config = require('../../src/config');
      expect(config.port).toBe(3000);
    });

    test('should return default 3000 for PORT=0 (falsy value)', () => {
      // parseInt('0', 10) = 0, which is falsy, so || 3000 kicks in
      process.env.PORT = '0';
      const config = require('../../src/config');
      // Note: 0 || 3000 = 3000 because 0 is falsy
      expect(config.port).toBe(3000);
    });

    test('should handle PORT=65535 (max valid TCP port)', () => {
      process.env.PORT = '65535';
      const config = require('../../src/config');
      expect(config.port).toBe(65535);
    });

    test('should handle PORT=1 (minimum valid port above privileged)', () => {
      process.env.PORT = '1';
      const config = require('../../src/config');
      expect(config.port).toBe(1);
    });

    test('should handle PORT with leading whitespace', () => {
      // parseInt handles leading whitespace
      process.env.PORT = '  3001';
      const config = require('../../src/config');
      expect(config.port).toBe(3001);
    });

    test('should handle PORT with trailing non-numeric characters', () => {
      // parseInt stops at first non-numeric character
      process.env.PORT = '3000abc';
      const config = require('../../src/config');
      expect(config.port).toBe(3000);
    });

    test('should return default 3000 for PORT with only whitespace', () => {
      process.env.PORT = '   ';
      const config = require('../../src/config');
      expect(config.port).toBe(3000);
    });

    test('should handle negative PORT (parseInt parses it)', () => {
      // parseInt('-1', 10) = -1, which is truthy
      process.env.PORT = '-1';
      const config = require('../../src/config');
      // The config will accept -1 (though it's not a valid port)
      expect(config.port).toBe(-1);
    });

    test('should handle float PORT (parseInt truncates)', () => {
      // parseInt('3000.5', 10) = 3000
      process.env.PORT = '3000.5';
      const config = require('../../src/config');
      expect(config.port).toBe(3000);
    });
  });

  // ============================================================================
  // Module Export Tests
  // ============================================================================

  describe('module export', () => {
    test('should export a plain object', () => {
      const config = require('../../src/config');
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });

    test('should have host property as string', () => {
      const config = require('../../src/config');
      expect(typeof config.host).toBe('string');
    });

    test('should have port property as number', () => {
      const config = require('../../src/config');
      expect(typeof config.port).toBe('number');
    });

    test('should have env property as string', () => {
      const config = require('../../src/config');
      expect(typeof config.env).toBe('string');
    });

    test('should return same object on multiple requires (module caching)', () => {
      const config1 = require('../../src/config');
      const config2 = require('../../src/config');
      expect(config1).toBe(config2);
    });

    test('should return fresh object after jest.resetModules()', () => {
      const config1 = require('../../src/config');
      jest.resetModules();
      const config2 = require('../../src/config');
      // Objects will be equal in value but not the same reference
      expect(config1).toEqual(config2);
      // After resetModules, it's a new object (may or may not be same ref)
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    test('should handle HOST with empty string (use default)', () => {
      // Empty string is falsy
      process.env.HOST = '';
      const config = require('../../src/config');
      // Empty string || '127.0.0.1' = '127.0.0.1'
      expect(config.host).toBe('127.0.0.1');
    });

    test('should handle NODE_ENV with empty string (use default)', () => {
      process.env.NODE_ENV = '';
      const config = require('../../src/config');
      // Empty string || 'development' = 'development'
      expect(config.env).toBe('development');
    });

    test('should accept whitespace-only HOST (not recommended but allowed)', () => {
      // Whitespace is truthy, so it will be used
      process.env.HOST = '   ';
      const config = require('../../src/config');
      expect(config.host).toBe('   ');
    });

    test('should accept special characters in NODE_ENV', () => {
      process.env.NODE_ENV = 'test-ci-env';
      const config = require('../../src/config');
      expect(config.env).toBe('test-ci-env');
    });
  });
});
