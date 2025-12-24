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
 * Test Isolation Strategy:
 * - jest.resetModules() called in beforeEach to ensure config is re-evaluated
 * - Environment variables cleared before each test
 * - Original environment restored after each test
 * 
 * @module tests/unit/config.test
 * @see Section 0.5.2 - Unit tests for configuration module
 * @see Section 0.4.4 - Test Data and Fixtures Design
 * @see Section 0.4.6 - Test Isolation Strategy
 */

describe('config (src/config/index.js)', () => {
  // Store original environment for restoration
  const originalEnv = { ...process.env };

  /**
   * Before each test:
   * - Reset modules to re-evaluate config with new environment variables
   * - Clear relevant environment variables to test defaults
   * 
   * @see Section 0.4.6 - Use jest.resetModules() for module isolation
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
   * 
   * @see Section 0.9.8 - Environment Variable Cleanup
   */
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ============================================================================
  // Default Values Tests
  // ============================================================================

  describe('default values', () => {
    /**
     * Test: Default host value
     * @see Section 0.5.2 - Test default host is '127.0.0.1'
     */
    test('should return "127.0.0.1" for host when HOST not set', () => {
      // Arrange - HOST env var is cleared in beforeEach
      // Act - Require the config module
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('127.0.0.1');
    });

    /**
     * Test: Default port value
     * @see Section 0.5.2 - Test default port is 3000 (numeric)
     */
    test('should return 3000 for port when PORT not set', () => {
      // Arrange - PORT env var is cleared in beforeEach
      // Act
      const config = require('../../src/config');
      
      // Assert - Port should be a number, not string
      expect(config.port).toBe(3000);
      expect(typeof config.port).toBe('number');
    });

    /**
     * Test: Default env value
     * @see Section 0.5.2 - Test default env is 'development'
     */
    test('should return "development" for env when NODE_ENV not set', () => {
      // Arrange - NODE_ENV is cleared in beforeEach
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.env).toBe('development');
    });

    /**
     * Test: Complete object shape with defaults
     */
    test('should return all three default values in correct object shape', () => {
      // Arrange - All env vars cleared in beforeEach
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config).toEqual({
        host: '127.0.0.1',
        port: 3000,
        env: 'development'
      });
    });

    /**
     * Test: Export structure verification
     */
    test('should export exactly three properties', () => {
      // Arrange
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(Object.keys(config)).toHaveLength(3);
      expect(Object.keys(config)).toEqual(['host', 'port', 'env']);
    });
  });

  // ============================================================================
  // Environment Variable Override Tests
  // ============================================================================

  describe('environment variable overrides', () => {
    /**
     * Test: HOST environment variable override
     * @see Section 0.5.2 - Test environment variables override defaults
     */
    test('should use HOST env var when set', () => {
      // Arrange
      process.env.HOST = '0.0.0.0';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('0.0.0.0');
    });

    /**
     * Test: PORT environment variable override
     * @see Section 0.5.2 - Test environment variables override defaults
     */
    test('should use PORT env var when set', () => {
      // Arrange
      process.env.PORT = '8080';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(8080);
      expect(typeof config.port).toBe('number');
    });

    /**
     * Test: NODE_ENV environment variable override
     * @see Section 0.5.2 - Test environment variables override defaults
     */
    test('should use NODE_ENV env var when set', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.env).toBe('production');
    });

    /**
     * Test: Multiple simultaneous overrides
     */
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

    /**
     * Test: localhost as HOST value
     */
    test('should allow localhost as HOST value', () => {
      // Arrange
      process.env.HOST = 'localhost';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('localhost');
    });

    /**
     * Test: IPv6 address as HOST value
     */
    test('should allow IPv6 address as HOST value', () => {
      // Arrange
      process.env.HOST = '::1';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('::1');
    });

    /**
     * Test: test as NODE_ENV value
     */
    test('should allow test as NODE_ENV value', () => {
      // Arrange
      process.env.NODE_ENV = 'test';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.env).toBe('test');
    });
  });

  // ============================================================================
  // PORT Parsing Edge Cases
  // ============================================================================

  describe('PORT parsing edge cases', () => {
    /**
     * Test: PORT parsing with radix 10 (leading zeros)
     * @see Section 0.5.2 - Test PORT parsing uses radix 10
     */
    test('should parse PORT as integer with radix 10', () => {
      // Arrange - parseInt('0080', 10) should parse as 80, not octal
      process.env.PORT = '0080';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(80);
    });

    /**
     * Test: Non-numeric PORT fallback
     * @see Section 0.4.2 - Test edge cases: invalid PORT
     */
    test('should return default 3000 for non-numeric PORT', () => {
      // Arrange - parseInt('invalid', 10) returns NaN, which is falsy
      process.env.PORT = 'invalid';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(3000);
    });

    /**
     * Test: Empty PORT string fallback
     * @see Section 0.4.2 - Test edge cases: empty string env vars
     */
    test('should return default 3000 for empty PORT string', () => {
      // Arrange - parseInt('', 10) returns NaN
      process.env.PORT = '';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(3000);
    });

    /**
     * Test: PORT=0 behavior (falsy value)
     * @see Section 0.5.2 - Test PORT=0 boundary value
     */
    test('should return default 3000 for PORT=0 (falsy value)', () => {
      // Arrange - parseInt('0', 10) = 0, which is falsy, so || 3000 kicks in
      process.env.PORT = '0';
      
      // Act
      const config = require('../../src/config');
      
      // Assert - 0 || 3000 = 3000 because 0 is falsy in JavaScript
      expect(config.port).toBe(3000);
    });

    /**
     * Test: PORT=65535 (max valid TCP port)
     * @see Section 0.5.2 - Test PORT=65535 boundary value
     */
    test('should handle PORT=65535 (max valid TCP port)', () => {
      // Arrange
      process.env.PORT = '65535';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(65535);
    });

    /**
     * Test: PORT=1 (minimum valid port above privileged)
     */
    test('should handle PORT=1 (minimum valid port above privileged)', () => {
      // Arrange
      process.env.PORT = '1';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(1);
    });

    /**
     * Test: PORT with leading whitespace
     */
    test('should handle PORT with leading whitespace', () => {
      // Arrange - parseInt handles leading whitespace
      process.env.PORT = '  3001';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(3001);
    });

    /**
     * Test: PORT with trailing non-numeric characters
     */
    test('should handle PORT with trailing non-numeric characters', () => {
      // Arrange - parseInt stops at first non-numeric character
      process.env.PORT = '3000abc';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(3000);
    });

    /**
     * Test: PORT with only whitespace
     */
    test('should return default 3000 for PORT with only whitespace', () => {
      // Arrange
      process.env.PORT = '   ';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(3000);
    });

    /**
     * Test: Negative PORT value
     */
    test('should handle negative PORT (parseInt parses it)', () => {
      // Arrange - parseInt('-1', 10) = -1, which is truthy
      process.env.PORT = '-1';
      
      // Act
      const config = require('../../src/config');
      
      // Assert - The config will accept -1 (though it's not a valid port)
      expect(config.port).toBe(-1);
    });

    /**
     * Test: Float PORT value (parseInt truncates)
     */
    test('should handle float PORT (parseInt truncates)', () => {
      // Arrange - parseInt('3000.5', 10) = 3000
      process.env.PORT = '3000.5';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.port).toBe(3000);
    });
  });

  // ============================================================================
  // Module Export Tests
  // ============================================================================

  describe('module export', () => {
    /**
     * Test: Export is a plain object
     */
    test('should export a plain object', () => {
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });

    /**
     * Test: host property type
     */
    test('should have host property as string', () => {
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(typeof config.host).toBe('string');
    });

    /**
     * Test: port property type
     */
    test('should have port property as number', () => {
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(typeof config.port).toBe('number');
    });

    /**
     * Test: env property type
     */
    test('should have env property as string', () => {
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(typeof config.env).toBe('string');
    });

    /**
     * Test: Module caching behavior
     */
    test('should return same object on multiple requires (module caching)', () => {
      // Act
      const config1 = require('../../src/config');
      const config2 = require('../../src/config');
      
      // Assert - Same reference due to Node.js module caching
      expect(config1).toBe(config2);
    });

    /**
     * Test: Fresh object after jest.resetModules()
     * @see Section 0.4.6 - Use jest.resetModules() for module isolation
     */
    test('should return fresh object after jest.resetModules()', () => {
      // Arrange
      const config1 = require('../../src/config');
      jest.resetModules();
      
      // Act
      const config2 = require('../../src/config');
      
      // Assert - Objects will be equal in value but potentially different references
      expect(config1).toEqual(config2);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    /**
     * Test: Empty string HOST fallback
     * @see Section 0.4.2 - Test edge cases: empty string env vars
     */
    test('should handle HOST with empty string (use default)', () => {
      // Arrange - Empty string is falsy
      process.env.HOST = '';
      
      // Act
      const config = require('../../src/config');
      
      // Assert - Empty string || '127.0.0.1' = '127.0.0.1'
      expect(config.host).toBe('127.0.0.1');
    });

    /**
     * Test: Empty string NODE_ENV fallback
     * @see Section 0.4.2 - Test edge cases: empty string env vars
     */
    test('should handle NODE_ENV with empty string (use default)', () => {
      // Arrange
      process.env.NODE_ENV = '';
      
      // Act
      const config = require('../../src/config');
      
      // Assert - Empty string || 'development' = 'development'
      expect(config.env).toBe('development');
    });

    /**
     * Test: Whitespace-only HOST (truthy but unusual)
     * @see Section 0.4.2 - Test edge cases: whitespace in configuration values
     */
    test('should accept whitespace-only HOST (not recommended but allowed)', () => {
      // Arrange - Whitespace is truthy, so it will be used
      process.env.HOST = '   ';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('   ');
    });

    /**
     * Test: Special characters in NODE_ENV
     */
    test('should accept special characters in NODE_ENV', () => {
      // Arrange
      process.env.NODE_ENV = 'test-ci-env';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.env).toBe('test-ci-env');
    });

    /**
     * Test: Very large PORT number
     */
    test('should handle very large PORT number', () => {
      // Arrange - Port beyond valid TCP range
      process.env.PORT = '99999';
      
      // Act
      const config = require('../../src/config');
      
      // Assert - Config accepts it (validation would be app responsibility)
      expect(config.port).toBe(99999);
    });

    /**
     * Test: Unicode characters in HOST
     */
    test('should accept unicode characters in HOST', () => {
      // Arrange
      process.env.HOST = 'localhost\u200B';
      
      // Act
      const config = require('../../src/config');
      
      // Assert
      expect(config.host).toBe('localhost\u200B');
    });
  });
});
