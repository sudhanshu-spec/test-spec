/**
 * Jest Configuration
 * 
 * Configuration file for Jest test runner.
 * Defines test environment, file patterns, coverage settings,
 * and global setup for the test suite.
 * 
 * @module jest.config
 */

'use strict';

module.exports = {
  // Node.js test environment for Express/HTTP testing
  testEnvironment: 'node',
  
  // Test file discovery pattern
  testMatch: ['**/tests/**/*.test.js'],
  
  // Coverage collection configuration
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Multiple coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Global test setup file
  setupFilesAfterEnv: ['./tests/setup.js'],
  
  // Test timeout (5 seconds default)
  testTimeout: 5000
};
