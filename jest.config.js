/**
 * Jest Configuration
 *
 * Testing framework configuration for the hello_world Express application.
 * Specifies the Node.js test environment, test file match patterns,
 * coverage collection settings, and global coverage thresholds.
 *
 * @see https://jestjs.io/docs/configuration
 */

'use strict';

module.exports = {
  // Use Node.js environment for server-side testing (no DOM)
  testEnvironment: 'node',

  // Match all test files under the tests/ directory
  testMatch: ['**/tests/**/*.test.js'],

  // Enable coverage collection by default
  collectCoverage: true,

  // Standard coverage output directory
  coverageDirectory: 'coverage',

  // Exclude dependencies from coverage
  coveragePathIgnorePatterns: ['/node_modules/'],

  // Enforce minimum coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 80,
      statements: 80
    }
  },

  // Detailed test output for clarity
  verbose: true
};
