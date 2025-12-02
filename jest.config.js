/**
 * Jest Configuration File
 * 
 * Configures Jest testing framework for the Express.js server application.
 * Defines test file discovery patterns, coverage collection settings,
 * and minimum coverage thresholds.
 * 
 * Usage:
 *   npm test           - Run tests with coverage
 *   npm run test:watch - Run tests in watch mode
 * 
 * @see https://jestjs.io/docs/configuration
 */
module.exports = {
  // Use Node.js runtime environment (not jsdom for browser simulation)
  testEnvironment: 'node',

  // Pattern for discovering test files
  // Matches all .test.js files within the tests/ directory
  testMatch: ['**/tests/**/*.test.js'],

  // Enable code coverage collection during test runs
  collectCoverage: true,

  // Output directory for coverage reports (HTML, LCOV, text)
  coverageDirectory: 'coverage',

  // Source files to measure coverage for
  // Only includes server.js as it's the main application file
  collectCoverageFrom: ['server.js'],

  // Minimum coverage thresholds that must be met
  // Tests will fail if coverage falls below these percentages
  coverageThreshold: {
    global: {
      branches: 80,    // 80% branch coverage required
      functions: 100,  // 100% function coverage required
      lines: 90,       // 90% line coverage required
      statements: 90   // 90% statement coverage required
    }
  },

  // Enable verbose output to show individual test results
  verbose: true
};
