/**
 * @fileoverview Jest configuration for Express.js hello_world application.
 *
 * Coverage collection encompasses the server entry point and all source
 * modules under src/ including config, routes, and middleware layers.
 * Test discovery spans unit, integration, and lifecycle test tiers.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',

  // Discovers tests across all tiers: tests/unit/, tests/integration/, tests/lifecycle/
  testMatch: ['**/tests/**/*.test.js'],

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 80,
      statements: 80
    }
  },

  // Covers server.js entry point and all src/ modules:
  // src/config/ (index.js, logger.js), src/routes/ (*.routes.js, index.js),
  // src/middleware/ (errorHandler.js, requestLogger.js, index.js), src/app.js
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!node_modules/**'
  ],

  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  testTimeout: 10000
};
