/**
 * Environment Variable Test Fixtures Module
 *
 * This module provides predefined environment variable configuration objects
 * for Jest test suites. These fixtures enable consistent, reusable test data
 * when testing the configuration module (src/config/index.js) for environment
 * variable handling and default value behavior.
 *
 * Fixture Categories:
 * - Default configurations (DEFAULT_ENV)
 * - Single variable overrides (CUSTOM_PORT, CUSTOM_HOST, PRODUCTION, TEST_ENV)
 * - Full customization (FULL_CUSTOM)
 * - Edge case testing (INVALID_PORT, EMPTY_PORT)
 *
 * Usage:
 * ```javascript
 * const { CUSTOM_PORT, PRODUCTION } = require('./fixtures/env.fixtures');
 *
 * beforeEach(() => {
 *   jest.resetModules();
 *   Object.assign(process.env, CUSTOM_PORT);
 * });
 * ```
 *
 * Note: All PORT values are strings since environment variables are always strings.
 * The config module uses parseInt() to convert PORT to a number.
 *
 * @module tests/fixtures/env.fixtures
 * @see src/config/index.js - Configuration module being tested
 */

/**
 * Empty environment configuration representing default/unset environment variables.
 * Used to test that the config module correctly falls back to default values:
 * - port: 3000
 * - host: '127.0.0.1'
 * - env: 'development'
 *
 * @constant {Object}
 * @default {}
 */
const DEFAULT_ENV = {};

/**
 * Custom PORT environment variable fixture.
 * Used to test PORT environment variable override behavior.
 * When applied, config.port should equal 8080 (parsed as integer).
 *
 * @constant {Object}
 * @property {string} PORT - Server port as string '8080'
 */
const CUSTOM_PORT = {
  PORT: '8080'
};

/**
 * Custom HOST environment variable fixture.
 * Used to test HOST environment variable override behavior.
 * When applied, config.host should equal '0.0.0.0' (bind to all interfaces).
 *
 * @constant {Object}
 * @property {string} HOST - Server host binding address '0.0.0.0'
 */
const CUSTOM_HOST = {
  HOST: '0.0.0.0'
};

/**
 * Production environment configuration fixture.
 * Used to test NODE_ENV environment variable override behavior.
 * When applied, config.env should equal 'production'.
 *
 * @constant {Object}
 * @property {string} NODE_ENV - Application environment mode 'production'
 */
const PRODUCTION = {
  NODE_ENV: 'production'
};

/**
 * Fully customized environment configuration fixture.
 * Used to test multiple environment variable overrides simultaneously.
 * When applied:
 * - config.port should equal 9000
 * - config.host should equal '127.0.0.1'
 * - config.env should equal 'staging'
 *
 * @constant {Object}
 * @property {string} PORT - Server port as string '9000'
 * @property {string} HOST - Server host binding address '127.0.0.1'
 * @property {string} NODE_ENV - Application environment mode 'staging'
 */
const FULL_CUSTOM = {
  PORT: '9000',
  HOST: '127.0.0.1',
  NODE_ENV: 'staging'
};

/**
 * Test environment configuration fixture.
 * Standard test environment configuration used in test setup scenarios.
 * When applied, config.env should equal 'test'.
 *
 * @constant {Object}
 * @property {string} NODE_ENV - Application environment mode 'test'
 */
const TEST_ENV = {
  NODE_ENV: 'test'
};

/**
 * Invalid PORT environment variable fixture for edge case testing.
 * Contains a non-numeric string to test parseInt() fallback behavior.
 * When applied, parseInt('invalid', 10) returns NaN, causing OR fallback
 * to default port 3000.
 *
 * @constant {Object}
 * @property {string} PORT - Non-numeric string 'invalid'
 */
const INVALID_PORT = {
  PORT: 'invalid'
};

/**
 * Empty PORT environment variable fixture for edge case testing.
 * Contains an empty string to test parseInt() handling of empty values.
 * When applied, parseInt('', 10) returns NaN, causing OR fallback
 * to default port 3000.
 *
 * @constant {Object}
 * @property {string} PORT - Empty string ''
 */
const EMPTY_PORT = {
  PORT: ''
};

module.exports = {
  DEFAULT_ENV,
  CUSTOM_PORT,
  CUSTOM_HOST,
  PRODUCTION,
  FULL_CUSTOM,
  TEST_ENV,
  INVALID_PORT,
  EMPTY_PORT
};
