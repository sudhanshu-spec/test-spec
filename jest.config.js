/**
 * Jest Configuration for Express.js Server Testing
 * 
 * This configuration file sets up Jest for testing the Express.js server application.
 * It configures the Node.js test environment (disabling jsdom), defines test file patterns,
 * specifies test directory roots, and configures coverage thresholds for quality assurance.
 * 
 * Usage:
 *   npm test              - Run all tests
 *   npm run test:coverage - Run tests with coverage report
 *   npm run test:watch    - Run tests in watch mode
 *   npm run test:verbose  - Run tests with detailed output
 * 
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  /**
   * Test Environment Configuration
   * 
   * Set to 'node' to disable jsdom and run tests in a Node.js environment.
   * This is required for testing Express.js server-side applications where
   * browser APIs (DOM, window, document) are not needed.
   * 
   * @see https://jestjs.io/docs/configuration#testenvironment-string
   */
  testEnvironment: 'node',

  /**
   * Test Roots Configuration
   * 
   * Specifies the directories Jest should scan for test files.
   * Using <rootDir>/tests ensures Jest only looks in the tests/ directory,
   * improving test discovery performance and preventing accidental test
   * execution from other directories.
   * 
   * @see https://jestjs.io/docs/configuration#roots-arraystring
   */
  roots: ['<rootDir>/tests'],

  /**
   * Test Match Patterns
   * 
   * Defines glob patterns Jest uses to detect test files.
   * This pattern matches any file ending with .test.js in any subdirectory.
   * Convention: unit tests in tests/unit/, integration tests in tests/integration/
   * 
   * @see https://jestjs.io/docs/configuration#testmatch-arraystring
   */
  testMatch: ['**/*.test.js'],

  /**
   * Coverage Collection Toggle
   * 
   * Set to false by default - coverage collection is enabled via CLI using
   * the --coverage flag (npm run test:coverage). This keeps regular test
   * runs fast while allowing coverage analysis on demand.
   * 
   * @see https://jestjs.io/docs/configuration#collectcoverage-boolean
   */
  collectCoverage: false,

  /**
   * Coverage Output Directory
   * 
   * Specifies where Jest should output coverage reports.
   * The 'coverage' directory is the standard location and should be
   * added to .gitignore to prevent committing generated reports.
   * 
   * @see https://jestjs.io/docs/configuration#coveragedirectory-string
   */
  coverageDirectory: 'coverage',

  /**
   * Coverage Threshold Configuration
   * 
   * Enforces minimum code coverage percentages. Tests will fail if coverage
   * falls below these thresholds, ensuring code quality standards are maintained.
   * 
   * Thresholds set per Agent Action Plan requirements:
   * - statements: 80% - Percentage of statements executed
   * - branches: 80%   - Percentage of conditional branches covered
   * - functions: 90%  - Percentage of functions called (higher for testability)
   * - lines: 80%      - Percentage of executable lines covered
   * 
   * @see https://jestjs.io/docs/configuration#coveragethreshold-object
   */
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 90,
      lines: 80
    }
  },

  /**
   * Verbose Output Configuration
   * 
   * When true, displays individual test results with the test suite hierarchy.
   * Useful for debugging and understanding test execution order.
   * Can also be enabled via CLI with --verbose flag.
   * 
   * @see https://jestjs.io/docs/configuration#verbose-boolean
   */
  verbose: true,

  /**
   * Test Timeout Configuration
   * 
   * Default timeout for each test in milliseconds.
   * Set to 5000ms (5 seconds) which is sufficient for HTTP endpoint tests
   * while preventing tests from hanging indefinitely.
   * 
   * @see https://jestjs.io/docs/configuration#testtimeout-number
   */
  testTimeout: 5000,

  /**
   * Clear Mocks Configuration
   * 
   * Automatically clears mock calls, instances, contexts, and results
   * before every test. This ensures test isolation and prevents mock
   * state from leaking between tests.
   * 
   * @see https://jestjs.io/docs/configuration#clearmocks-boolean
   */
  clearMocks: true
};
