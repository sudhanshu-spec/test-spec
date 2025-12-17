/**
 * Jest Configuration
 * 
 * Test framework configuration for Node.js/Express application testing.
 * Configures test matching patterns, coverage collection, and thresholds.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    'server.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,
      lines: 80,
      statements: 80
    }
  }
};
