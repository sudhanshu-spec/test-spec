/**
 * Jest Configuration for Node.js/Express Hello World Application
 *
 * Configures Jest as the testing framework with:
 * - Node.js test environment (no browser/DOM)
 * - Test discovery restricted to the tests/ directory
 * - Code coverage collection from server.js and src/**
 * - 90% minimum coverage thresholds for all metrics
 * - Verbose output showing individual test results
 *
 * @see https://jestjs.io/docs/configuration
 */
'use strict';

module.exports = {
  // Use Node.js environment for server-side Express testing (not jsdom)
  testEnvironment: 'node',

  // All test files reside in the tests/ directory at project root
  roots: ['<rootDir>/tests'],

  // Test file naming convention: <module-name>.test.js
  testMatch: ['**/*.test.js'],

  // Collect coverage from the server entry point and all source modules
  // Naturally excludes node_modules/, tests/, and blitzy/ by pattern scope
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js'
  ],

  // Output coverage reports to a dedicated coverage/ directory
  coverageDirectory: 'coverage',

  // Enforce 90%+ coverage across all metrics per project quality targets
  coverageThreshold: {
    global: {
      lines: 90,
      branches: 90,
      functions: 90,
      statements: 90
    }
  },

  // Show individual test results with test suite hierarchy
  verbose: true
};
