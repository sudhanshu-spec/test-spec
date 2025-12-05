/**
 * @fileoverview Environment variable fixtures for server configuration testing.
 * Provides standardized test data and helper functions for testing server.js
 * configuration handling including port validation, HTTPS settings, trust proxy
 * configuration, and environment isolation utilities.
 * 
 * This module supports comprehensive testing of:
 * - Port number validation (valid and invalid values)
 * - Default environment variable configurations
 * - HTTPS mode configuration with SSL certificate paths
 * - Trust proxy configuration scenarios
 * - Environment isolation between tests
 * 
 * @module tests/fixtures/env_fixtures
 * 
 * @description Environment fixture categories:
 * - VALID_PORTS: Array of valid port numbers for server binding
 * - INVALID_PORTS: Array of invalid port values for edge case testing
 * - DEFAULT_ENV_VALUES: Standard environment defaults for test isolation
 * - HTTPS_ENV_CONFIG: Configuration for HTTPS mode testing
 * - TRUST_PROXY_CONFIGS: Scenarios for proxy trust configuration
 * 
 * @author Blitzy Test Team
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Import fixtures and helpers
 * const {
 *   VALID_PORTS,
 *   INVALID_PORTS,
 *   DEFAULT_ENV_VALUES,
 *   storeEnv,
 *   restoreEnv
 * } = require('../fixtures/env_fixtures');
 * 
 * // Use in test setup
 * let originalEnv;
 * beforeAll(() => {
 *   originalEnv = storeEnv();
 * });
 * afterAll(() => {
 *   restoreEnv(originalEnv);
 * });
 * 
 * @see tests/security/test_rate_limit.js - Pattern reference for environment manipulation
 */

'use strict';

// =============================================================================
// Port Configuration Fixtures
// =============================================================================

/**
 * Array of valid port numbers for server binding tests.
 * These ports represent commonly used values and boundary conditions
 * within the valid port range (1-65535 for non-privileged ports).
 * 
 * @constant {number[]}
 * @property {number} 3000 - Default development port used by Express applications
 * @property {number} 8080 - Common alternative HTTP port
 * @property {number} 9000 - Another common development server port
 * @property {number} 65535 - Maximum valid port number (upper boundary)
 * 
 * @example
 * // Iterate through valid ports for testing
 * VALID_PORTS.forEach(port => {
 *   process.env.PORT = String(port);
 *   // Test server binding...
 * });
 */
const VALID_PORTS = [3000, 8080, 9000, 65535];

/**
 * Array of invalid port values for edge case and error handling tests.
 * These values should trigger validation errors or fallback behavior
 * when used as the PORT environment variable.
 * 
 * @constant {Array<number|string|null>}
 * @property {number} -1 - Negative port number (invalid)
 * @property {number} 0 - Port zero (reserved, typically invalid for binding)
 * @property {number} 65536 - Exceeds maximum valid port (65535)
 * @property {string} 'abc' - Non-numeric string value
 * @property {null} null - Null value (undefined/missing)
 * 
 * @example
 * // Test error handling for invalid ports
 * INVALID_PORTS.forEach(port => {
 *   process.env.PORT = port === null ? '' : String(port);
 *   // Verify error handling or default fallback...
 * });
 */
const INVALID_PORTS = [-1, 0, 65536, 'abc', null];

// =============================================================================
// Environment Configuration Objects
// =============================================================================

/**
 * Default environment variable values for standard server configuration.
 * Represents a baseline test environment with all security features
 * in their default/disabled states for isolated unit testing.
 * 
 * @constant {Object}
 * @property {string} PORT - Default server port ('3000')
 * @property {string} NODE_ENV - Test environment identifier ('test')
 * @property {string} ENABLE_HTTPS - HTTPS mode disabled ('false')
 * @property {string} TRUST_PROXY - Trust proxy disabled ('false')
 * 
 * @example
 * // Apply default environment values before tests
 * Object.assign(process.env, DEFAULT_ENV_VALUES);
 */
const DEFAULT_ENV_VALUES = {
  /** Default server port for HTTP binding */
  PORT: '3000',
  /** Node environment set to test mode */
  NODE_ENV: 'test',
  /** HTTPS disabled for standard HTTP testing */
  ENABLE_HTTPS: 'false',
  /** Trust proxy disabled for direct connection testing */
  TRUST_PROXY: 'false'
};

/**
 * Environment configuration for HTTPS mode testing.
 * Contains settings required to enable HTTPS server startup
 * with SSL/TLS certificate paths.
 * 
 * @constant {Object}
 * @property {string} ENABLE_HTTPS - HTTPS mode enabled ('true')
 * @property {string} SSL_KEY_PATH - Path to SSL private key file
 * @property {string} SSL_CERT_PATH - Path to SSL certificate file
 * 
 * @example
 * // Enable HTTPS mode for testing
 * Object.assign(process.env, HTTPS_ENV_CONFIG);
 * // Server should attempt to load SSL certificates...
 */
const HTTPS_ENV_CONFIG = {
  /** Enable HTTPS server mode */
  ENABLE_HTTPS: 'true',
  /** Path to SSL private key file (relative to project root) */
  SSL_KEY_PATH: './certs/key.pem',
  /** Path to SSL certificate file (relative to project root) */
  SSL_CERT_PATH: './certs/cert.pem'
};

/**
 * Trust proxy configuration scenarios for testing different proxy modes.
 * Express.js trust proxy setting affects IP address resolution and
 * X-Forwarded-* header handling.
 * 
 * @constant {Object}
 * @property {Object} enabled - Configuration with trust proxy enabled
 * @property {string} enabled.TRUST_PROXY - Set to 'true' to enable trust proxy
 * @property {Object} disabled - Configuration with trust proxy explicitly disabled
 * @property {string} disabled.TRUST_PROXY - Set to 'false' to disable trust proxy
 * @property {Object} unset - Configuration without TRUST_PROXY property (undefined state)
 * 
 * @example
 * // Test trust proxy enabled scenario
 * Object.assign(process.env, TRUST_PROXY_CONFIGS.enabled);
 * // req.ip should use X-Forwarded-For header...
 * 
 * @example
 * // Test trust proxy disabled scenario
 * Object.assign(process.env, TRUST_PROXY_CONFIGS.disabled);
 * // req.ip should use direct connection IP...
 * 
 * @example
 * // Test unset scenario (default behavior)
 * delete process.env.TRUST_PROXY;
 * // Server should use default trust proxy setting...
 */
const TRUST_PROXY_CONFIGS = {
  /** Trust proxy enabled - X-Forwarded-For headers are trusted */
  enabled: {
    TRUST_PROXY: 'true'
  },
  /** Trust proxy explicitly disabled - direct connection IP used */
  disabled: {
    TRUST_PROXY: 'false'
  },
  /** Trust proxy unset - tests default/undefined behavior */
  unset: {}
};

// =============================================================================
// Environment Helper Functions
// =============================================================================

/**
 * Creates a shallow copy of the current process.env for later restoration.
 * This function captures the environment state at the time of calling,
 * allowing tests to modify process.env and restore it after completion.
 * 
 * Pattern adapted from tests/security/test_rate_limit.js environment handling.
 * 
 * @function storeEnv
 * @returns {Object} Shallow copy of process.env at time of invocation
 * 
 * @example
 * // Store environment in beforeAll hook
 * let originalEnv;
 * beforeAll(() => {
 *   originalEnv = storeEnv();
 *   // Now safe to modify process.env...
 * });
 * 
 * @example
 * // Inline usage for temporary environment changes
 * const saved = storeEnv();
 * process.env.PORT = '9999';
 * // ... perform test ...
 * restoreEnv(saved);
 * 
 * @see restoreEnv - Companion function for environment restoration
 */
function storeEnv() {
  return { ...process.env };
}

/**
 * Restores process.env to a previously stored state.
 * This function replaces the entire process.env with the provided object,
 * ensuring complete restoration of the environment after test modifications.
 * 
 * Pattern adapted from tests/security/test_rate_limit.js environment handling.
 * 
 * @function restoreEnv
 * @param {Object} originalEnv - Previously stored environment object from storeEnv()
 * @returns {void}
 * 
 * @example
 * // Restore environment in afterAll hook
 * afterAll(() => {
 *   restoreEnv(originalEnv);
 * });
 * 
 * @example
 * // Complete test isolation pattern
 * let originalEnv;
 * 
 * beforeAll(() => {
 *   originalEnv = storeEnv();
 * });
 * 
 * beforeEach(() => {
 *   // Apply test defaults
 *   Object.assign(process.env, DEFAULT_ENV_VALUES);
 * });
 * 
 * afterAll(() => {
 *   restoreEnv(originalEnv);
 * });
 * 
 * @see storeEnv - Companion function for environment capture
 * @throws {TypeError} If originalEnv is not an object (runtime protection)
 */
function restoreEnv(originalEnv) {
  if (originalEnv === null || typeof originalEnv !== 'object') {
    throw new TypeError('restoreEnv requires an object parameter (use storeEnv() to capture environment)');
  }
  process.env = originalEnv;
}

// =============================================================================
// Module Exports
// =============================================================================

/**
 * Export all fixtures and helper functions for use in test files.
 * 
 * @exports VALID_PORTS - Valid port numbers for positive test cases
 * @exports INVALID_PORTS - Invalid port values for edge case testing
 * @exports DEFAULT_ENV_VALUES - Standard environment defaults
 * @exports HTTPS_ENV_CONFIG - HTTPS mode configuration
 * @exports TRUST_PROXY_CONFIGS - Trust proxy scenario configurations
 * @exports storeEnv - Environment capture function
 * @exports restoreEnv - Environment restoration function
 */
module.exports = {
  // Port configuration fixtures
  VALID_PORTS,
  INVALID_PORTS,
  
  // Environment configuration objects
  DEFAULT_ENV_VALUES,
  HTTPS_ENV_CONFIG,
  TRUST_PROXY_CONFIGS,
  
  // Environment helper functions
  storeEnv,
  restoreEnv
};
