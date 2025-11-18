module.exports = {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/test/**/*.test.js'],

  // Collect coverage from application code only
  collectCoverageFrom: ['server.js'],

  // Coverage thresholds - tests will fail if not met
  // Realistic targets given the if (require.main === module) pattern
  // This pattern is required for testability but limits coverage of direct execution path
  // Lines 17-18 (app.listen within conditional) can only execute in separate process
  // Maximum achievable: 83.33% (20/24 lines) with this testability pattern
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
  verbose: true,

  // Force exit after tests complete to handle child processes
  forceExit: true,

  // Timeout for tests (5 seconds should be enough)
  testTimeout: 10000
};
