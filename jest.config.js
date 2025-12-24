/**
 * Jest Configuration
 * 
 * Configuration file for Jest test runner.
 * Defines test environment, file patterns, coverage settings,
 * and global setup for the test suite.
 * 
 * This configuration is designed for testing a Node.js/Express 5.x application
 * with comprehensive coverage requirements and supports both unit and integration tests.
 * 
 * @module jest.config
 * @see Section 0.5.3 - Test Configuration Updates
 * @see Section 0.7.6 - Coverage Configuration
 */

'use strict';

module.exports = {
  /**
   * Test Environment
   * 
   * Uses 'node' environment for Express/HTTP testing.
   * This provides a Node.js-like environment with access to Node.js globals
   * and modules, which is required for testing Express applications.
   */
  testEnvironment: 'node',

  /**
   * Test File Discovery Pattern
   * 
   * Matches all .test.js files within the tests/ directory and its subdirectories.
   * This pattern covers:
   * - tests/unit/*.test.js
   * - tests/integration/*.test.js
   * - Any nested test files
   */
  testMatch: ['**/tests/**/*.test.js'],

  /**
   * Coverage Collection Configuration
   * 
   * Specifies which files should be included in coverage reports.
   * Includes:
   * - server.js (entry point)
   * - All JavaScript files in src/ directory
   * Excludes:
   * - node_modules (third-party dependencies)
   */
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!**/node_modules/**'
  ],

  /**
   * Coverage Output Directory
   * 
   * Coverage reports will be generated in the ./coverage directory.
   * This directory should be added to .gitignore.
   */
  coverageDirectory: 'coverage',

  /**
   * Coverage Report Formats
   * 
   * Generates coverage reports in multiple formats:
   * - text: Console output summary
   * - lcov: Standard coverage format for CI/CD integration
   * - html: Interactive HTML report at ./coverage/lcov-report/index.html
   */
  coverageReporters: ['text', 'lcov', 'html'],

  /**
   * Coverage Thresholds
   * 
   * Enforces minimum coverage requirements per Section 0.7.1:
   * - branches: 80% (conditional logic coverage)
   * - functions: 90% (all exported functions should be tested)
   * - lines: 85% (industry standard for Node.js applications)
   * - statements: 85% (comprehensive statement execution)
   * 
   * Tests will fail if coverage falls below these thresholds.
   */
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },

  /**
   * Verbose Output
   * 
   * Enables detailed test output showing individual test results
   * rather than just summary information.
   */
  verbose: true,

  /**
   * Global Test Setup File
   * 
   * Runs the setup.js file after the test framework is installed
   * but before tests are executed. This file contains:
   * - Environment variable backup/restore utilities
   * - Common test helpers
   * - Global mock configurations
   * - afterEach/beforeEach hooks for cleanup
   */
  setupFilesAfterEnv: ['./tests/setup.js'],

  /**
   * Test Timeout
   * 
   * Maximum time in milliseconds that a test can run before being
   * considered as timed out. Default is 5 seconds (5000ms).
   * Individual tests can override this with a third argument to test().
   */
  testTimeout: 5000,

  /**
   * Clear Mocks Between Tests
   * 
   * Automatically clears mock calls and instances between every test.
   * This ensures test isolation and prevents mock state from leaking
   * between tests.
   */
  clearMocks: true,

  /**
   * Restore Mocks After Each Test
   * 
   * Automatically restores the original (non-mocked) implementation
   * of mocked functions after each test. This prevents mocks from
   * persisting across tests.
   */
  restoreMocks: true,

  /**
   * Module File Extensions
   * 
   * File extensions Jest will look for when resolving modules.
   * Order matters - more common extensions should be first.
   */
  moduleFileExtensions: ['js', 'json', 'node'],

  /**
   * Test Path Ignore Patterns
   * 
   * Patterns for directories or files that should be ignored
   * when looking for test files.
   */
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],

  /**
   * Coverage Path Ignore Patterns
   * 
   * Patterns for directories or files that should be excluded
   * from coverage collection.
   */
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ]
};
