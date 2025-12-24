/**
 * Global Test Setup Configuration
 * 
 * This module provides global test setup, teardown, and utility functions
 * for the Jest test suite. It handles environment variable management,
 * mock cleanup, and common test utilities.
 * 
 * @module tests/setup
 */

'use strict';

// Store original environment variables for restoration
const originalEnv = { ...process.env };

/**
 * Global setup before each test
 * Ensures clean state for every test
 */
beforeEach(() => {
  // Clear all mock call history
  jest.clearAllMocks();
});

/**
 * Global teardown after each test
 * Restores environment variables and cleans up mocks
 */
afterEach(() => {
  // Restore original environment variables
  process.env = { ...originalEnv };
});

/**
 * Global teardown after all tests in a file
 * Resets module cache and restores all mocks
 */
afterAll(() => {
  // Reset module cache for fresh imports
  jest.resetModules();
  // Restore all mocked implementations
  jest.restoreAllMocks();
});

/**
 * Utility: Set test environment variables
 * @param {Object} envVars - Key-value pairs of environment variables
 */
global.setTestEnv = (envVars) => {
  Object.assign(process.env, envVars);
};

/**
 * Utility: Clear specific environment variables
 * @param {string[]} keys - Array of environment variable keys to delete
 */
global.clearTestEnv = (keys) => {
  keys.forEach(key => delete process.env[key]);
};

/**
 * Utility: Reset environment to original state
 */
global.resetTestEnv = () => {
  process.env = { ...originalEnv };
};
