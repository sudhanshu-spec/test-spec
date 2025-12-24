'use strict';

/**
 * Configuration Test Fixtures
 * 
 * Provides predefined configuration objects for unit testing the src/config module.
 * These fixtures support testing default values, environment variable overrides,
 * and edge case handling for configuration parsing.
 * 
 * The fixtures are designed to match the actual behavior of src/config/index.js:
 * - host: process.env.HOST || '127.0.0.1'
 * - port: parseInt(process.env.PORT, 10) || 3000
 * - env: process.env.NODE_ENV || 'development'
 * 
 * @module tests/fixtures/config.fixtures
 */

module.exports = {
  /**
   * Expected default configuration values
   * These represent the fallback values when no environment variables are set.
   * Matches src/config/index.js defaults.
   */
  defaultConfig: {
    host: '127.0.0.1',
    port: 3000,
    env: 'development'
  },

  /**
   * Custom environment override configuration
   * Represents typical production deployment settings.
   * Used to test that environment variables properly override defaults.
   */
  customConfig: {
    host: '0.0.0.0',
    port: 8080,
    env: 'production'
  },

  /**
   * Test environment configuration
   * Represents configuration when NODE_ENV=test.
   * Used for test environment validation.
   */
  testConfig: {
    host: '127.0.0.1',
    port: 3000,
    env: 'test'
  },

  /**
   * Environment variable test scenarios
   * Each scenario represents a different combination of environment variable values
   * that can be set before requiring the config module to test various behaviors.
   * 
   * Note: Environment variables are always strings when set via process.env
   */
  envScenarios: {
    /**
     * Empty scenario - no environment variables set
     * Should result in all default values being used
     */
    defaults: {},

    /**
     * Custom production configuration
     * All values explicitly set to production settings
     */
    custom: {
      HOST: '0.0.0.0',
      PORT: '8080',
      NODE_ENV: 'production'
    },

    /**
     * Test environment only
     * Only NODE_ENV is set, other values use defaults
     */
    test: {
      NODE_ENV: 'test'
    },

    /**
     * Empty string HOST
     * Empty string is falsy, so should fallback to default '127.0.0.1'
     */
    emptyHost: {
      HOST: ''
    },

    /**
     * Empty string PORT
     * parseInt('', 10) returns NaN, which is falsy, so should fallback to 3000
     */
    emptyPort: {
      PORT: ''
    },

    /**
     * Invalid (non-numeric) PORT value
     * parseInt('invalid', 10) returns NaN, which is falsy, so should fallback to 3000
     */
    invalidPort: {
      PORT: 'invalid'
    },

    /**
     * Zero PORT value
     * parseInt('0', 10) returns 0, but 0 is falsy in JavaScript,
     * so the || operator causes fallback to 3000
     * Note: This is a known edge case in the config implementation
     */
    zeroPort: {
      PORT: '0'
    },

    /**
     * Maximum valid port number
     * 65535 is the maximum valid TCP port number
     * parseInt('65535', 10) returns 65535, which is truthy
     */
    maxPort: {
      PORT: '65535'
    },

    /**
     * Negative PORT value
     * parseInt('-1', 10) returns -1, which is truthy (non-zero)
     * The config will accept this value even though it's invalid for TCP
     */
    negativePort: {
      PORT: '-1'
    },

    /**
     * PORT with leading/trailing whitespace
     * parseInt handles leading whitespace, so '  3000  ' parses as 3000
     */
    whitespacePort: {
      PORT: '  3000  '
    }
  },

  /**
   * Expected values after edge case processing
   * These represent what the config module will actually return
   * for various edge case environment variable inputs.
   * 
   * Based on config logic: parseInt(process.env.PORT, 10) || 3000
   * - parseInt returns NaN for empty or invalid strings
   * - The || operator treats 0, NaN, undefined, null, '', and false as falsy
   * - Therefore, PORT=0 will fallback to 3000 (0 is falsy)
   */
  edgeCaseExpected: {
    /**
     * When HOST is empty string ('')
     * '' || '127.0.0.1' => '127.0.0.1'
     */
    emptyHostFallback: '127.0.0.1',

    /**
     * When PORT is invalid string (e.g., 'invalid')
     * parseInt('invalid', 10) => NaN
     * NaN || 3000 => 3000
     */
    invalidPortFallback: 3000,

    /**
     * When PORT is '0'
     * parseInt('0', 10) => 0
     * 0 || 3000 => 3000 (because 0 is falsy!)
     * 
     * Note: This reflects actual config behavior where PORT=0 falls back to default.
     * The naming 'zeroPortValue' is kept for schema compliance but the value
     * represents what config actually returns (3000), not the parsed value (0).
     */
    zeroPortValue: 3000,

    /**
     * When PORT is '65535' (max valid port)
     * parseInt('65535', 10) => 65535
     * 65535 || 3000 => 65535 (truthy)
     */
    maxPortValue: 65535,

    /**
     * When PORT is '-1' (negative)
     * parseInt('-1', 10) => -1
     * -1 || 3000 => -1 (truthy, non-zero)
     */
    negativePortValue: -1,

    /**
     * When PORT is empty string ('')
     * parseInt('', 10) => NaN
     * NaN || 3000 => 3000
     */
    emptyPortFallback: 3000,

    /**
     * When PORT has whitespace ('  3000  ')
     * parseInt('  3000  ', 10) => 3000 (parseInt ignores leading whitespace)
     * 3000 || 3000 => 3000
     */
    whitespacePortValue: 3000
  }
};
