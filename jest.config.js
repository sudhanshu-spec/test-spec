/**
 * @fileoverview Jest configuration for Express.js hello_world application.
 *
 * Configures test coverage for the Express.js layered architecture:
 * - Entry Point Layer: server.js (HTTP binding)
 * - Application Core Layer: src/app.js (Express factory)
 * - Configuration Layer: src/config/index.js (environment-driven config)
 * - Routing Layer: src/routes/index.js, src/routes/main.routes.js
 *
 * Test discovery pattern covers integration, lifecycle, and unit test directories.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  // Use Node.js test environment for Express.js server-side testing
  testEnvironment: 'node',

  // Discover tests in integration, lifecycle, and unit test directories
  testMatch: ['**/tests/**/*.test.js'],

  // Enable coverage collection for test verification
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds per refactoring rules R-027
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 80,
      statements: 80
    }
  },

  // Coverage patterns for Express.js layered architecture
  // Includes: server.js, src/app.js, src/config/index.js,
  //           src/routes/index.js, src/routes/main.routes.js
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!node_modules/**'
  ],

  // Exclude node_modules from coverage analysis
  coveragePathIgnorePatterns: ['/node_modules/'],

  // Enable verbose output for detailed test results
  verbose: true,

  // Set timeout for async operations (10 seconds)
  testTimeout: 10000
};
