/**
 * Jest configuration for the Express.js hello_world application.
 * 
 * Configuration implements:
 * - Node test environment for Express server testing
 * - Test discovery in tests/ folder hierarchy
 * - Coverage collection and thresholds matching project targets
 * - 10-second timeout for server lifecycle tests
 * - Verbose output for detailed test results
 */
module.exports = {
  // Node.js test environment for server-side testing without DOM
  testEnvironment: 'node',
  
  // Test file discovery pattern - finds all *.test.js files in tests/ folder
  testMatch: ['**/tests/**/*.test.js'],
  
  // Enable coverage collection
  collectCoverage: true,
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds per Section 0.7.1
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 80,
      statements: 80
    }
  },
  
  // Source files to collect coverage from
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!node_modules/**'
  ],
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: ['/node_modules/'],
  
  // Verbose test output
  verbose: true,
  
  // Test timeout (10 seconds for lifecycle tests)
  testTimeout: 10000
};
