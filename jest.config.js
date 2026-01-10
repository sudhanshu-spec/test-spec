/**
 * @fileoverview Jest configuration for Express.js hello_world application
 * @description Backend test configuration using Jest. Frontend tests use Vitest
 * and are located in the client directory, which is explicitly excluded here
 * to ensure clean separation between Jest (backend) and Vitest (frontend) test runners.
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
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
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!node_modules/**',
    '!client/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/client/'],
  testPathIgnorePatterns: ['/node_modules/', '/client/'],
  verbose: true,
  testTimeout: 10000
};
