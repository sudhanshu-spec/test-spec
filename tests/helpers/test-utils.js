/**
 * Test Utilities Module
 *
 * Shared test utility functions for Jest test suites. Provides helper functions
 * for proper test isolation including environment variable management, module
 * cache clearing, and console spying capabilities.
 *
 * These utilities ensure that tests run independently without interference
 * from environment state or module caching, which is critical when testing
 * configuration-dependent modules like src/config/index.js.
 *
 * @module tests/helpers/test-utils
 */

'use strict';

/**
 * Environment variable keys used by the application configuration.
 * These are the variables that need to be cleared/managed during testing
 * to ensure proper test isolation.
 *
 * @constant {string[]}
 * @private
 */
const CONFIG_ENV_VARS = ['PORT', 'HOST', 'NODE_ENV'];

/**
 * Clears all environment variables used by the application configuration.
 *
 * This function removes PORT, HOST, and NODE_ENV from process.env to ensure
 * a clean state for testing configuration defaults. Should be called in
 * beforeEach hooks when testing the configuration module.
 *
 * @example
 * beforeEach(() => {
 *   resetEnvironment();
 *   resetModules();
 * });
 *
 * test('should use default port', () => {
 *   const config = require('../src/config');
 *   expect(config.port).toBe(3000);
 * });
 *
 * @returns {void}
 */
function resetEnvironment() {
  delete process.env.PORT;
  delete process.env.HOST;
  delete process.env.NODE_ENV;
}

/**
 * Clears the Node.js module cache to enable fresh imports.
 *
 * This is a wrapper around jest.resetModules() that ensures modules are
 * re-evaluated on next require(). Essential when testing configuration
 * modules after changing environment variables, as Node.js caches module
 * exports on first require.
 *
 * @example
 * beforeEach(() => {
 *   resetModules();
 *   resetEnvironment();
 * });
 *
 * test('should use custom port', () => {
 *   process.env.PORT = '8080';
 *   const config = require('../src/config');
 *   expect(config.port).toBe(8080);
 * });
 *
 * @returns {void}
 */
function resetModules() {
  jest.resetModules();
}

/**
 * Creates and returns spy objects for console methods.
 *
 * Sets up Jest spies on console.log, console.error, and console.warn
 * to enable verification of console output in tests. Useful for testing
 * server startup messages and error logging.
 *
 * @example
 * describe('Server Startup', () => {
 *   let spies;
 *
 *   beforeEach(() => {
 *     spies = mockConsole();
 *   });
 *
 *   afterEach(() => {
 *     spies.log.mockRestore();
 *     spies.error.mockRestore();
 *     spies.warn.mockRestore();
 *   });
 *
 *   test('should log startup message', () => {
 *     // ... trigger server startup ...
 *     expect(spies.log).toHaveBeenCalledWith(
 *       expect.stringContaining('Server running')
 *     );
 *   });
 * });
 *
 * @returns {{log: jest.SpyInstance, error: jest.SpyInstance, warn: jest.SpyInstance}}
 *   Object containing spy instances for log, error, and warn console methods
 */
function mockConsole() {
  return {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
  };
}

/**
 * Saves the current state of configuration-related environment variables.
 *
 * Creates a snapshot of PORT, HOST, and NODE_ENV values that can be
 * restored later using restoreEnvironment(). Useful for beforeAll/afterAll
 * patterns where the original environment state needs to be preserved
 * across an entire test suite.
 *
 * @example
 * describe('Config Tests', () => {
 *   let savedEnv;
 *
 *   beforeAll(() => {
 *     savedEnv = saveEnvironment();
 *   });
 *
 *   afterAll(() => {
 *     restoreEnvironment(savedEnv);
 *   });
 *
 *   // ... tests that modify env vars ...
 * });
 *
 * @returns {{PORT: string|undefined, HOST: string|undefined, NODE_ENV: string|undefined}}
 *   Object containing the current values of configuration environment variables
 */
function saveEnvironment() {
  return {
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV
  };
}

/**
 * Restores environment variables from a previously saved state.
 *
 * Takes a snapshot object created by saveEnvironment() and restores
 * the environment variables to their saved values. Variables that were
 * undefined in the saved state are deleted from process.env.
 *
 * @example
 * describe('Config Tests', () => {
 *   let savedEnv;
 *
 *   beforeAll(() => {
 *     savedEnv = saveEnvironment();
 *   });
 *
 *   afterAll(() => {
 *     restoreEnvironment(savedEnv);
 *   });
 *
 *   test('modifies env', () => {
 *     process.env.PORT = '9999';
 *     // ... test code ...
 *   });
 * });
 *
 * @param {{PORT?: string, HOST?: string, NODE_ENV?: string}} saved
 *   Object containing saved environment variable values from saveEnvironment()
 * @returns {void}
 */
function restoreEnvironment(saved) {
  if (!saved || typeof saved !== 'object') {
    throw new Error('restoreEnvironment requires a saved environment object');
  }

  CONFIG_ENV_VARS.forEach((key) => {
    if (saved[key] !== undefined) {
      process.env[key] = saved[key];
    } else {
      delete process.env[key];
    }
  });
}

/**
 * Sets multiple environment variables from a fixture object.
 *
 * Convenience function for applying environment variable fixtures
 * to process.env. Works well with the fixtures defined in
 * tests/fixtures/env.fixtures.js.
 *
 * @example
 * const fixtures = require('../fixtures/env.fixtures');
 *
 * test('should handle custom port', () => {
 *   resetModules();
 *   resetEnvironment();
 *   applyEnvironment(fixtures.CUSTOM_PORT);
 *
 *   const config = require('../src/config');
 *   expect(config.port).toBe(8080);
 * });
 *
 * @param {{[key: string]: string}} envObject
 *   Object containing environment variable key-value pairs to apply
 * @returns {void}
 */
function applyEnvironment(envObject) {
  if (!envObject || typeof envObject !== 'object') {
    return;
  }

  Object.entries(envObject).forEach(([key, value]) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  });
}

/**
 * Creates a complete test environment setup function.
 *
 * Returns a function that combines resetModules(), resetEnvironment(),
 * and optionally applies a fixture. Useful for creating reusable
 * beforeEach hooks with different environment configurations.
 *
 * @example
 * const fixtures = require('../fixtures/env.fixtures');
 *
 * describe('Production Config', () => {
 *   beforeEach(createTestSetup(fixtures.PRODUCTION));
 *
 *   test('should be production env', () => {
 *     const config = require('../src/config');
 *     expect(config.env).toBe('production');
 *   });
 * });
 *
 * @param {{[key: string]: string}} [fixture]
 *   Optional environment fixture to apply after reset
 * @returns {function(): void}
 *   Setup function suitable for use in beforeEach
 */
function createTestSetup(fixture) {
  return function setup() {
    resetModules();
    resetEnvironment();
    if (fixture) {
      applyEnvironment(fixture);
    }
  };
}

module.exports = {
  resetEnvironment,
  resetModules,
  mockConsole,
  saveEnvironment,
  restoreEnvironment,
  applyEnvironment,
  createTestSetup
};
