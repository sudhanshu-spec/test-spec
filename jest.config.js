/**
 * Jest Configuration
 * 
 * Test framework configuration for Node.js/Express application testing.
 * Configures test matching patterns, coverage collection, and thresholds.
 * 
 * Configuration per Agent Action Plan sections 0.5.3 and 0.9.6:
 * - testEnvironment: 'node' for Node.js testing
 * - testMatch: patterns for test file discovery in tests/ directory
 * - verbose: true for detailed output
 * - Coverage thresholds: 80% lines/branches/statements, 100% functions
 */
module.exports = {
  // Use Node.js test environment (not jsdom/browser)
  testEnvironment: 'node',

  // Match test files in the tests/ directory with .test.js extension
  testMatch: ['**/tests/**/*.test.js'],

  // Enable verbose output for detailed test results
  verbose: true,

  // Collect coverage from source files, excluding node_modules
  collectCoverageFrom: [
    'src/**/*.js',
    'server.js',
    '!**/node_modules/**'
  ],

  // Output directory for coverage reports
  coverageDirectory: 'coverage',

  // Coverage thresholds per technical specification section 6.6.4.1
  // Tests will fail if coverage drops below these thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,
      lines: 80,
      statements: 80
    }
  }
};
