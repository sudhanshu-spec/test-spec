'use strict';

module.exports = {
  // Use Node.js test environment (no JSDOM needed for server-only app)
  testEnvironment: 'node',

  // Test file discovery pattern — find .test.js files in __tests__/ directory
  testMatch: ['**/__tests__/**/*.test.js'],

  // Source files to collect coverage from
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js'
  ],

  // Coverage thresholds — enforced by jest --coverage
  coverageThreshold: {
    global: {
      lines: 90,
      branches: 85,
      functions: 90,
      statements: 90
    }
  }
};
