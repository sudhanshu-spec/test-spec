module.exports = {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/test/**/*.test.js'],

  // Collect coverage from application code only
  collectCoverageFrom: ['server.js'],

  // Coverage thresholds - tests will fail if not met
  // Note: Adjusted thresholds account for the if (require.main === module) pattern
  // which intentionally prevents server auto-start during testing
  coverageThreshold: {
    global: {
      statements: 83,
      branches: 50,
      functions: 66,
      lines: 83
    }
  },

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],

  // Verbose output for detailed test results
  verbose: true
};
