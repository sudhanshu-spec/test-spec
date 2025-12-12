/**
 * Jest Configuration
 * 
 * Configuration file for Jest test runner.
 * Defines test environment, file patterns, coverage settings, and thresholds.
 * 
 * @see https://jestjs.io/docs/configuration
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],

  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!src/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,
      lines: 80,
      statements: 80
    }
  },

  // Module handling
  moduleFileExtensions: ['js', 'json', 'node'],

  // Test timeout
  testTimeout: 5000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true
};
