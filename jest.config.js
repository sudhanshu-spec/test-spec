module.exports = {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/test/**/*.test.js'],

  // Collect coverage from application code only
  collectCoverageFrom: ['server.js'],

  // Coverage thresholds - tests will fail if not met
  // Comprehensive coverage targets per Agent Action Plan section 0.10
  // These thresholds ensure high-quality test coverage for the Express application
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 100,
      lines: 95
    }
  },

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],

  // Verbose output for detailed test results
  verbose: true
};
