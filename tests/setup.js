'use strict';

/**
 * Global Jest Test Setup Configuration
 * 
 * This module provides global test setup, teardown, and utility functions
 * for the Jest test suite. It handles environment variable management,
 * mock cleanup, and common test utilities to ensure consistent test
 * isolation and environment state management across all unit and
 * integration tests.
 * 
 * Loaded via Jest's setupFilesAfterEnv configuration and executed
 * before each test file to ensure proper test isolation.
 * 
 * Features:
 * - Environment variable backup/restore utilities
 * - Mock cleanup handlers (clearAllMocks, resetModules, restoreAllMocks)
 * - Test isolation via module cache reset
 * - Global test helper functions
 * 
 * @module tests/setup
 * @see Section 0.5.2 - Global test setup file specifications
 * @see Section 0.4.6 - Test isolation strategy
 * @see Section 0.9.8 - Mock reset strategy
 */

// ============================================================================
// Environment Management
// ============================================================================

/**
 * Store original environment variables for restoration after tests.
 * This creates a shallow copy of process.env at module load time,
 * before any tests have modified the environment.
 * @type {Object}
 */
const originalEnv = { ...process.env };

/**
 * Set NODE_ENV to 'test' by default for all test executions.
 * This ensures consistent behavior across all test files and
 * allows application code to detect test environment.
 */
process.env.NODE_ENV = 'test';

// ============================================================================
// Jest Lifecycle Hooks
// ============================================================================

/**
 * Before all tests in each file.
 * Executed once before all tests in a test file run.
 * 
 * This hook can be used for:
 * - Suppressing console output during tests (optional, uncomment if desired)
 * - Setting up shared test fixtures
 * - Initializing test-specific configurations
 * 
 * @see Section 0.5.2 - Setup functions
 */
beforeAll(() => {
  // Optional: Suppress console.log during tests for cleaner test output.
  // Uncomment the following line if you want to suppress console output:
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'info').mockImplementation(() => {});
  // jest.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Ensure NODE_ENV is set to 'test' at the start of each test file
  process.env.NODE_ENV = 'test';
});

/**
 * After each individual test.
 * Executed after every single test case completes.
 * 
 * Performs cleanup operations:
 * - Clears mock call history to prevent cross-test contamination
 * - Restores environment variables to their original state
 * - Maintains NODE_ENV as 'test' for consistency
 * 
 * @see Section 0.9.8 - Mock Reset Strategy: "Clear mock call history between tests"
 * @see Section 0.10.2 - Test Isolation Requirements
 */
afterEach(() => {
  // Clear mock call history between tests
  // This clears the mock.calls, mock.instances, and mock.results arrays
  // but does not restore original implementations
  jest.clearAllMocks();
  
  // Restore environment variables to original state
  // This prevents environment modifications from one test affecting another
  process.env = { ...originalEnv };
  
  // Re-establish NODE_ENV as 'test' since we restored original env
  // which may have had a different NODE_ENV value
  process.env.NODE_ENV = 'test';
});

/**
 * After all tests in each file.
 * Executed once after all tests in a test file have completed.
 * 
 * Performs final cleanup operations:
 * - Resets the module cache to ensure fresh imports in subsequent test files
 * - Restores all mocked implementations to their original functions
 * - Fully restores the original environment state
 * 
 * @see Section 0.9.8 - Mock Reset Strategy: "Reset module cache to ensure clean state"
 * @see Section 0.4.6 - Test Isolation Strategy
 */
afterAll(() => {
  // Reset module cache to ensure clean state for subsequent test files
  // This forces re-import of modules, important for testing module-level behavior
  jest.resetModules();
  
  // Restore all mocked implementations to their original functions
  // This undoes any jest.spyOn() or manual mock assignments
  jest.restoreAllMocks();
  
  // Fully restore original environment variables
  // This ensures the global process.env is returned to its pre-test state
  process.env = { ...originalEnv };
});

// ============================================================================
// Global Test Utility Functions
// ============================================================================

/**
 * Utility: Set environment variables for testing.
 * 
 * This helper function allows tests to easily set multiple environment
 * variables at once. The changes will be automatically cleaned up
 * after each test by the afterEach hook.
 * 
 * @param {Object} envVars - Key-value pairs of environment variables to set
 * @example
 * // Set custom configuration for a test
 * setTestEnv({
 *   HOST: '0.0.0.0',
 *   PORT: '8080',
 *   NODE_ENV: 'production'
 * });
 * 
 * @see Section 0.4.4 - Test Data and Fixtures Design
 * @see Section 0.5.2 - Setup functions: "Environment variable backup/restore utilities"
 */
global.setTestEnv = (envVars) => {
  if (!envVars || typeof envVars !== 'object') {
    throw new Error('setTestEnv requires an object parameter');
  }
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value === undefined) {
      // If value is undefined, delete the variable
      delete process.env[key];
    } else {
      // Convert value to string as env vars are always strings
      process.env[key] = String(value);
    }
  });
};

/**
 * Utility: Clear specific environment variables.
 * 
 * This helper function removes environment variables from process.env.
 * Useful for testing default value fallbacks in configuration modules.
 * The changes will be automatically restored after each test by the afterEach hook.
 * 
 * @param {string[]} keys - Array of environment variable keys to clear/delete
 * @example
 * // Clear PORT to test default port fallback
 * clearTestEnv(['PORT', 'HOST']);
 * 
 * @see Section 0.4.4 - Test Data and Fixtures Design
 * @see Section 0.5.2 - Setup functions: "Environment variable backup/restore utilities"
 */
global.clearTestEnv = (keys) => {
  if (!Array.isArray(keys)) {
    throw new Error('clearTestEnv requires an array parameter');
  }
  
  keys.forEach((key) => {
    if (typeof key !== 'string') {
      throw new Error('clearTestEnv keys must be strings');
    }
    delete process.env[key];
  });
};

/**
 * Utility: Reset environment to original state.
 * 
 * This helper function immediately restores all environment variables
 * to their original state (as captured at module load time).
 * Useful when a test needs to reset mid-execution.
 * 
 * Note: This preserves NODE_ENV as 'test' after restoration.
 * 
 * @example
 * // Reset environment during a test
 * resetTestEnv();
 * 
 * @see Section 0.4.4 - Test Data and Fixtures Design
 */
global.resetTestEnv = () => {
  process.env = { ...originalEnv };
  process.env.NODE_ENV = 'test';
};

/**
 * Utility: Get the original environment variable value.
 * 
 * Returns the original value of an environment variable as it was
 * when the test suite started, before any test modifications.
 * 
 * @param {string} key - The environment variable key to retrieve
 * @returns {string|undefined} The original value or undefined if not set
 * @example
 * // Get the original PORT value
 * const originalPort = getOriginalEnv('PORT');
 * 
 * @see Section 0.4.4 - Test Data and Fixtures Design
 */
global.getOriginalEnv = (key) => {
  if (typeof key !== 'string') {
    throw new Error('getOriginalEnv requires a string parameter');
  }
  return originalEnv[key];
};

/**
 * Utility: Create a mock console for capturing console output.
 * 
 * Returns an object with methods to spy on all console methods.
 * Call the returned restore function to clean up spies.
 * 
 * @returns {Object} Object containing mock references and restore function
 * @example
 * const consoleMocks = mockConsole();
 * // ... run code that logs ...
 * expect(consoleMocks.log).toHaveBeenCalledWith('expected message');
 * consoleMocks.restore();
 * 
 * @see Section 0.10.3 - Mocking Strategy
 */
global.mockConsole = () => {
  const mocks = {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
  };
  
  mocks.restore = () => {
    Object.values(mocks).forEach((mock) => {
      if (mock && typeof mock.mockRestore === 'function') {
        mock.mockRestore();
      }
    });
  };
  
  return mocks;
};

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export utility functions for use in test files that may need to
 * require this module directly (though globals are preferred).
 * 
 * Note: These functions are also available as globals (e.g., global.setTestEnv)
 * and do not need to be imported in most test files.
 */
module.exports = {
  setTestEnv: global.setTestEnv,
  clearTestEnv: global.clearTestEnv,
  resetTestEnv: global.resetTestEnv,
  getOriginalEnv: global.getOriginalEnv,
  mockConsole: global.mockConsole,
};
