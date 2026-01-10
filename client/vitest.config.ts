/**
 * @fileoverview Vitest configuration for frontend testing infrastructure
 * @module client/vitest.config
 *
 * Configures Vitest testing framework for the Burger Website frontend application.
 * This configuration establishes the complete testing environment including:
 *
 * - jsdom environment for DOM simulation in Node.js
 * - Global test functions (describe, it, expect) for cleaner test syntax
 * - V8-based code coverage with enforced thresholds
 * - MSW server integration via setup file for API mocking
 * - Parallel test execution with proper isolation
 *
 * Coverage thresholds are set to ensure high code quality:
 * - Branches: 80% minimum (conditional path coverage)
 * - Functions: 85% minimum (function execution coverage)
 * - Lines: 85% minimum (line execution coverage)
 * - Statements: 85% minimum (statement execution coverage)
 *
 * Configuration follows patterns established in jest.config.js for consistency
 * across the testing infrastructure while leveraging Vitest-specific features.
 *
 * @see {@link https://vitest.dev/config/} Vitest Configuration Reference
 * @see {@link https://vitest.dev/guide/coverage.html} Coverage Configuration
 * @see Section 0.5.3 of Agent Action Plan for configuration requirements
 * @see Section 0.9.2 for environment setup specifications
 * @see Section 0.7.1 for coverage target requirements
 */

import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration export.
 *
 * Provides comprehensive test configuration including:
 * - Test environment and globals
 * - File discovery patterns
 * - Coverage collection and thresholds
 * - Reporter configuration
 * - Execution settings (pooling, isolation)
 * - Path alias resolution
 *
 * @type {import('vitest/config').UserConfig}
 *
 * @example
 * // Run tests with this configuration
 * npx vitest run
 *
 * // Run tests in watch mode
 * npx vitest
 *
 * // Run tests with coverage
 * npx vitest run --coverage
 *
 * // Run specific test file
 * npx vitest run src/features/auth/__tests__/LoginForm.test.tsx
 */
export default defineConfig({
  /**
   * Test-specific configuration.
   * Contains all settings related to test execution, environment, and coverage.
   */
  test: {
    // =========================================================================
    // Environment Configuration
    // =========================================================================

    /**
     * Enable global test functions without explicit imports.
     *
     * When set to true, test functions like describe, it, expect, beforeEach,
     * afterEach, beforeAll, afterAll, and vi are available globally without
     * requiring explicit imports from 'vitest'.
     *
     * This provides a cleaner testing experience similar to Jest and matches
     * the testing patterns established in the backend tests.
     *
     * @see {@link https://vitest.dev/config/#globals} Vitest Globals
     */
    globals: true,

    /**
     * DOM environment for component testing.
     *
     * Uses jsdom to provide a simulated browser DOM environment in Node.js.
     * This enables testing of React components, DOM manipulation, and browser
     * APIs without requiring an actual browser.
     *
     * jsdom 25.0.1 is configured as a dev dependency to provide:
     * - document and window objects
     * - DOM element creation and manipulation
     * - Event dispatching and handling
     * - CSS selector matching
     *
     * @see {@link https://github.com/jsdom/jsdom} jsdom Documentation
     */
    environment: 'jsdom',

    // =========================================================================
    // Test Setup Configuration
    // =========================================================================

    /**
     * Global test setup files executed before each test file.
     *
     * The setup file (./src/__tests__/setup.ts) performs:
     * - Extension of Vitest expect with @testing-library/jest-dom matchers
     * - Automatic DOM cleanup after each test via RTL cleanup()
     * - MSW server lifecycle management (start, reset, close)
     * - Browser API mocks (matchMedia, ResizeObserver, IntersectionObserver)
     * - Console error filtering for known React warnings
     *
     * This ensures consistent test environment across all test files.
     *
     * @see {@link module:tests/setup} Setup file documentation
     */
    setupFiles: ['./src/__tests__/setup.ts'],

    // =========================================================================
    // Test File Discovery
    // =========================================================================

    /**
     * Glob patterns for test file discovery.
     *
     * Matches all TypeScript and TSX files with .test. in their name:
     * - Unit tests: src/features/auth/__tests__/LoginForm.test.tsx
     * - Integration tests: src/__tests__/integration/auth.integration.test.tsx
     * - Hook tests: src/hooks/__tests__/useDebounce.test.ts
     * - Utility tests: src/utils/__tests__/formatters.test.ts
     * - API tests: src/api/__tests__/client.test.ts
     * - Component tests: src/components/__tests__/Button.test.tsx
     */
    include: ['src/**/*.test.{ts,tsx}'],

    /**
     * Patterns to exclude from test discovery.
     *
     * Excludes:
     * - node_modules: Third-party dependencies
     * - dist: Build output directory
     * - coverage: Coverage reports directory
     */
    exclude: ['node_modules', 'dist', 'coverage'],

    // =========================================================================
    // Coverage Configuration
    // =========================================================================

    /**
     * Code coverage collection and reporting configuration.
     *
     * Uses V8-based coverage for accurate metrics with the following settings:
     * - Provider: V8 for native JavaScript coverage
     * - Reporters: Text (console), HTML (interactive), LCOV (CI integration)
     * - Thresholds: Enforced minimums per Section 0.7.1
     *
     * @see {@link https://vitest.dev/guide/coverage.html} Coverage Guide
     */
    coverage: {
      /**
       * Coverage provider selection.
       *
       * Uses V8's built-in code coverage for accurate metrics.
       * V8 coverage provides:
       * - Native JavaScript coverage without instrumentation overhead
       * - Accurate branch tracking for conditional statements
       * - Source map support for TypeScript/TSX files
       *
       * Requires @vitest/coverage-v8 package.
       */
      provider: 'v8',

      /**
       * Coverage report output formats.
       *
       * Generates multiple report formats to support different use cases:
       * - text: Console output for quick review during development
       * - html: Interactive browser-based report for detailed analysis
       * - lcov: Standard format for CI/CD integration and tools like Codecov
       *
       * Matches reporter configuration from jest.config.js for consistency.
       */
      reporter: ['text', 'html', 'lcov'],

      /**
       * Directory for coverage report output.
       *
       * All coverage reports are generated in the 'coverage' directory:
       * - coverage/index.html: HTML report entry point
       * - coverage/lcov.info: LCOV report for CI tools
       * - coverage/coverage-summary.json: JSON summary data
       */
      reportsDirectory: 'coverage',

      /**
       * Source files to include in coverage collection.
       *
       * Collects coverage for all TypeScript and TSX source files:
       * - React components (*.tsx)
       * - Business logic (*.ts)
       * - Custom hooks (*.ts)
       * - Utility functions (*.ts)
       * - API client code (*.ts)
       * - Context providers (*.tsx)
       */
      include: ['src/**/*.{ts,tsx}'],

      /**
       * Files to exclude from coverage collection.
       *
       * Excludes:
       * - Test files (*.test.ts, *.test.tsx): Test code shouldn't be in coverage
       * - Test utilities (__tests__/**): Setup, fixtures, and mocks
       * - Vite type declarations (vite-env.d.ts): TypeScript ambient declarations
       * - Main entry point (main.tsx): Minimal bootstrap code
       * - Type definition files (*.d.ts): TypeScript declarations only
       */
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/**/*.d.ts',
      ],

      /**
       * Coverage threshold enforcement.
       *
       * Sets minimum coverage percentages that must be met for tests to pass.
       * Tests will fail if coverage falls below these thresholds.
       *
       * Thresholds per Section 0.7.1:
       * - branches: 80% - Conditional path coverage
       * - functions: 85% - Function execution coverage
       * - lines: 85% - Line execution coverage
       * - statements: 85% - Statement execution coverage
       *
       * These thresholds ensure high code quality for the new frontend codebase
       * while being realistic for initial development. Critical path coverage
       * (authentication, ordering, booking) should approach 100%.
       */
      thresholds: {
        /** Minimum branch coverage percentage */
        branches: 80,
        /** Minimum function coverage percentage */
        functions: 85,
        /** Minimum line coverage percentage */
        lines: 85,
        /** Minimum statement coverage percentage */
        statements: 85,
      },
    },

    // =========================================================================
    // Execution Configuration
    // =========================================================================

    /**
     * Test timeout in milliseconds.
     *
     * Sets the maximum time a test can take before timing out.
     * Matches the testTimeout from jest.config.js (10000ms) for consistency.
     *
     * 10 seconds is sufficient for:
     * - Component rendering and interaction tests
     * - Async operations with mocked APIs
     * - Complex state management tests
     *
     * Individual tests can override with test.setTimeout() if needed.
     */
    testTimeout: 10000,

    /**
     * Test reporter configuration.
     *
     * Configures output format for test results:
     * - default: Standard console output with pass/fail indicators
     * - html: Browser-based interactive report for detailed analysis
     *
     * The HTML reporter generates a report at ./html/ that can be opened
     * in a browser for detailed test result analysis.
     */
    reporters: ['default', 'html'],

    /**
     * Test execution pool configuration.
     *
     * Uses threads pool for parallel test execution:
     * - Tests run in worker threads for isolation
     * - Maximum parallelization based on CPU cores
     * - Faster test execution for large test suites
     *
     * Alternative: 'forks' for process-based isolation (heavier but more isolated)
     */
    pool: 'threads',

    /**
     * Test isolation mode.
     *
     * When true, each test file runs in a fresh environment:
     * - Module cache is reset between test files
     * - Global state is isolated
     * - Prevents test pollution between files
     *
     * This ensures reliable, deterministic test results.
     */
    isolate: true,

    // =========================================================================
    // Dependency Handling
    // =========================================================================

    /**
     * Dependencies to inline during testing.
     *
     * Forces Vitest to transform and bundle certain dependencies that may
     * have issues with ESM resolution or contain non-standard imports.
     */
    deps: {
      /**
       * Inline specific packages that have ESM compatibility issues.
       * Add packages here if they cause "Cannot find module" errors.
       */
      inline: [],
    },
  },

  // ===========================================================================
  // Module Resolution Configuration
  // ===========================================================================

  /**
   * Path alias configuration for cleaner imports in tests.
   *
   * Allows using '@/' prefix for absolute imports from src directory:
   * - '@/components/Button' resolves to './src/components/Button'
   * - '@/features/auth/LoginForm' resolves to './src/features/auth/LoginForm'
   * - '@/utils/formatters' resolves to './src/utils/formatters'
   *
   * This keeps test imports consistent with source code imports and
   * avoids complex relative path traversal (../../..) in test files.
   */
  resolve: {
    alias: {
      /**
       * Alias '@/' to the src directory.
       * Enables clean, absolute imports in test files.
       *
       * @example
       * // In test file:
       * import { LoginForm } from '@/features/auth/LoginForm';
       * import { formatPrice } from '@/utils/formatters';
       */
      '@/': './src/',
    },
  },
});
