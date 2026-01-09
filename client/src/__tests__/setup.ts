/**
 * @fileoverview Global test setup for frontend testing infrastructure
 * @module tests/setup
 *
 * Configures the testing environment for all frontend tests in the Burger Website
 * application. This file is automatically executed before each test file as
 * specified in vitest.config.ts setupFiles configuration.
 *
 * Setup responsibilities:
 * - Extends Vitest expect with Testing Library DOM-specific matchers
 * - Configures automatic DOM cleanup after each test
 * - Manages MSW (Mock Service Worker) server lifecycle for API mocking
 * - Provides global mocks for browser APIs not available in jsdom
 *
 * Follows patterns established in tests/lifecycle/server.test.js for:
 * - JSDoc documentation standards
 * - Lifecycle hook organization
 * - Mock factory patterns
 *
 * @see {@link https://testing-library.com/docs/react-testing-library/setup} RTL Setup
 * @see {@link https://mswjs.io/docs/integrations/node} MSW Node.js Integration
 * @see {@link https://vitest.dev/guide/common-errors.html#cannot-find-module-css} Vitest Setup
 */

// ============================================================================
// External Imports
// ============================================================================

/**
 * Extends Vitest expect with DOM-specific matchers from jest-dom.
 * This import automatically extends the expect API with matchers like:
 * - toBeInTheDocument()
 * - toHaveTextContent()
 * - toBeVisible()
 * - toBeDisabled()
 * - toHaveAttribute()
 * - toHaveClass()
 * - toHaveStyle()
 * - toContainElement()
 * - toBeEmptyDOMElement()
 * - toHaveFocus()
 * - toBeChecked()
 * - toBePartiallyChecked()
 * - toHaveValue()
 * - toHaveDisplayValue()
 * - toBeRequired()
 * - toBeValid()
 * - toBeInvalid()
 *
 * @see {@link https://github.com/testing-library/jest-dom} jest-dom documentation
 */
import '@testing-library/jest-dom';

/**
 * Import cleanup function from React Testing Library.
 * Cleanup unmounts React trees that were mounted with render() and removes
 * any DOM elements that were created by those React trees.
 *
 * @see {@link https://testing-library.com/docs/react-testing-library/api/#cleanup} RTL Cleanup
 */
import { cleanup } from '@testing-library/react';

/**
 * Import Vitest lifecycle hooks and mock utilities.
 * - beforeAll: Run once before all tests in a file
 * - beforeEach: Run before each test in a file
 * - afterEach: Run after each test in a file
 * - afterAll: Run once after all tests in a file
 * - vi: Mock utilities for creating spies, stubs, and mocks
 *
 * @see {@link https://vitest.dev/api/} Vitest API Reference
 */
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';

// ============================================================================
// Internal Imports
// ============================================================================

/**
 * Import MSW server instance for API mocking lifecycle management.
 * The server is configured with handlers for all API endpoints:
 * - Authentication (/api/auth/*)
 * - Menu (/api/menu/*)
 * - Orders (/api/orders/*)
 * - Bookings (/api/bookings/*)
 *
 * @see {@link module:tests/mocks/server} Server configuration
 */
import { server } from './mocks/server';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extended Window interface for global mock definitions.
 * Provides type safety for mocked browser APIs.
 *
 * @interface ExtendedWindow
 * @extends Window
 */
interface MockMediaQueryList {
  /** Whether the media query matches */
  matches: boolean;
  /** The media query string */
  media: string;
  /** Callback for changes (deprecated) */
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null;
  /** Add deprecated listener (for legacy support) */
  addListener: (callback: (e: MediaQueryListEvent) => void) => void;
  /** Remove deprecated listener (for legacy support) */
  removeListener: (callback: (e: MediaQueryListEvent) => void) => void;
  /** Add event listener */
  addEventListener: (type: string, listener: EventListener) => void;
  /** Remove event listener */
  removeEventListener: (type: string, listener: EventListener) => void;
  /** Dispatch event */
  dispatchEvent: (event: Event) => boolean;
}

/**
 * Mock ResizeObserver interface for testing responsive components.
 *
 * @interface MockResizeObserver
 */
interface MockResizeObserver {
  /** Start observing an element */
  observe: ReturnType<typeof vi.fn>;
  /** Stop observing an element */
  unobserve: ReturnType<typeof vi.fn>;
  /** Disconnect all observations */
  disconnect: ReturnType<typeof vi.fn>;
}

/**
 * Mock IntersectionObserver interface for testing lazy-loaded components.
 *
 * @interface MockIntersectionObserver
 */
interface MockIntersectionObserver {
  /** Start observing an element */
  observe: ReturnType<typeof vi.fn>;
  /** Stop observing an element */
  unobserve: ReturnType<typeof vi.fn>;
  /** Disconnect all observations */
  disconnect: ReturnType<typeof vi.fn>;
  /** Root element for intersection */
  root: Element | Document | null;
  /** Root margin for intersection calculations */
  rootMargin: string;
  /** Threshold values for triggering callback */
  thresholds: ReadonlyArray<number>;
}

// ============================================================================
// Console Error Management
// ============================================================================

/**
 * Store reference to original console.error for restoration.
 * This allows us to filter known warnings during tests while preserving
 * the ability to debug real issues.
 *
 * @constant {Function} originalConsoleError
 */
const originalConsoleError = console.error;

/**
 * List of known warning patterns to suppress during testing.
 * These are typically harmless React/DOM warnings that clutter test output.
 *
 * @constant {string[]} SUPPRESSED_WARNINGS
 */
const SUPPRESSED_WARNINGS: string[] = [
  'Warning: ReactDOM.render is no longer supported',
  'Warning: An update to %s inside a test was not wrapped in act',
  'Warning: Cannot update a component',
];

/**
 * Determines if a console message should be suppressed.
 * Checks the message against known warning patterns.
 *
 * @param {unknown[]} args - Arguments passed to console.error
 * @returns {boolean} True if the message should be suppressed
 */
function shouldSuppressWarning(args: unknown[]): boolean {
  const firstArg = args[0];
  if (typeof firstArg !== 'string') {
    return false;
  }

  return SUPPRESSED_WARNINGS.some((warning) => firstArg.includes(warning));
}

// ============================================================================
// MSW Server Lifecycle Management
// ============================================================================

/**
 * Start MSW request interception before all tests.
 *
 * Configures the server with strict error handling for unmatched requests:
 * - 'error' mode throws when a request doesn't match any handler
 * - This helps catch missing mock handlers during testing
 * - Ensures all API calls are properly mocked for deterministic tests
 *
 * Following pattern from tests/lifecycle/server.test.js for lifecycle setup.
 *
 * @example
 * // With this configuration, unmocked requests will throw:
 * // Error: [MSW] Cannot bypass a request when using the "error" strategy
 */
beforeAll(() => {
  // Start the MSW server with strict request handling
  server.listen({ onUnhandledRequest: 'error' });

  // Configure filtered console.error to suppress known warnings
  console.error = (...args: unknown[]): void => {
    if (shouldSuppressWarning(args)) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

/**
 * Reset state before each test for proper isolation.
 *
 * Performs the following cleanup operations:
 * - Clears all Vitest mock call history while preserving implementations
 *
 * Note: We use vi.clearAllMocks() instead of vi.resetAllMocks() to preserve
 * the global browser API mock implementations (matchMedia, ResizeObserver,
 * IntersectionObserver, etc.) while still clearing call history between tests.
 *
 * Following Section 0.10.1 requirement for mock isolation between tests.
 */
beforeEach(() => {
  // Clear all mock function call history while preserving implementations
  // This ensures global mocks (matchMedia, ResizeObserver, etc.) remain functional
  vi.clearAllMocks();
});

/**
 * Clean up after each test to ensure test isolation.
 *
 * Performs the following cleanup operations:
 * - Unmounts any React trees mounted during the test
 * - Cleans up any DOM elements created by tests
 * - Resets MSW handlers to initial state (removes runtime handlers)
 *
 * Following Section 0.10.1 requirement:
 * "Reset MSW handlers with server.resetHandlers()"
 *
 * This ensures that:
 * - Each test starts with a clean DOM
 * - Runtime handler overrides don't leak between tests
 * - Memory is properly freed between tests
 */
afterEach(() => {
  // Clean up React Testing Library mounted components
  cleanup();

  // Reset MSW handlers to initial state, removing any runtime handlers
  // This ensures that server.use() handlers from individual tests
  // don't affect subsequent tests
  server.resetHandlers();
});

/**
 * Clean up resources after all tests complete.
 *
 * Performs final cleanup operations:
 * - Stops MSW request interception
 * - Restores original console.error
 * - Frees up resources used by the mock server
 *
 * Following pattern from tests/lifecycle/server.test.js for proper teardown.
 */
afterAll(() => {
  // Stop MSW server and clean up request interception
  server.close();

  // Restore original console.error
  console.error = originalConsoleError;
});

// ============================================================================
// Browser API Mocks
// ============================================================================

/**
 * Mock window.matchMedia for components using media queries.
 *
 * jsdom does not implement window.matchMedia, so we need to provide a mock
 * for components that use responsive design patterns or CSS media queries.
 *
 * Default behavior returns matches: false for all queries. Tests can override
 * this mock to simulate different viewport sizes.
 *
 * @example
 * // In a test, to simulate a mobile viewport:
 * vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
 *   matches: query.includes('max-width: 768px'),
 *   media: query,
 *   // ... other properties
 * }));
 *
 * @see {@link https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom}
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string): MockMediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated but still used by some libraries
    removeListener: vi.fn(), // Deprecated but still used by some libraries
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })),
});

/**
 * Mock ResizeObserver for components observing element size changes.
 *
 * jsdom does not implement ResizeObserver, which is commonly used for:
 * - Responsive components that adjust based on container size
 * - Chart/visualization libraries
 * - Virtual scroll implementations
 *
 * This mock provides a no-op implementation that won't trigger callbacks.
 * Tests needing to verify resize behavior should manually trigger updates.
 *
 * @example
 * // In a test, to trigger a resize callback:
 * const resizeObserverCallback = vi.fn();
 * const MockResizeObserver = vi.fn((cb) => {
 *   resizeObserverCallback.mockImplementation(cb);
 *   return {
 *     observe: vi.fn(),
 *     unobserve: vi.fn(),
 *     disconnect: vi.fn(),
 *   };
 * });
 * global.ResizeObserver = MockResizeObserver;
 */
class MockResizeObserverClass implements MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  
  constructor(_callback: ResizeObserverCallback) {
    // Callback stored for potential use in tests
  }
}
global.ResizeObserver = MockResizeObserverClass as unknown as typeof ResizeObserver;

/**
 * Mock IntersectionObserver for components using viewport intersection detection.
 *
 * jsdom does not implement IntersectionObserver, which is commonly used for:
 * - Lazy loading images and components
 * - Infinite scroll implementations
 * - Analytics tracking (visibility tracking)
 * - Sticky header behaviors
 *
 * This mock provides a no-op implementation. Tests needing to verify
 * intersection behavior should manually trigger the observer callback.
 *
 * @example
 * // In a test, to simulate an element entering the viewport:
 * const intersectionCallback = vi.fn();
 * const MockIntersectionObserver = vi.fn((cb) => {
 *   intersectionCallback.mockImplementation(cb);
 *   return {
 *     observe: vi.fn(),
 *     unobserve: vi.fn(),
 *     disconnect: vi.fn(),
 *     root: null,
 *     rootMargin: '',
 *     thresholds: [],
 *   };
 * });
 * global.IntersectionObserver = MockIntersectionObserver;
 *
 * // Then trigger the callback:
 * intersectionCallback([{ isIntersecting: true, target: element }]);
 */
class MockIntersectionObserverClass implements MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root: Element | Document | null = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
  
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    // Callback and options stored for potential use in tests
  }
}
global.IntersectionObserver = MockIntersectionObserverClass as unknown as typeof IntersectionObserver;

// ============================================================================
// Additional Browser API Mocks (if needed)
// ============================================================================

/**
 * Mock scrollTo for components that scroll the window.
 *
 * jsdom does not implement window.scrollTo, which can cause test failures
 * when components try to scroll to specific positions.
 */
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

/**
 * Mock requestAnimationFrame for components using animation frames.
 *
 * While jsdom has a basic implementation, this mock provides more control
 * and consistent behavior across tests.
 */
if (typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(Date.now()), 0) as unknown as number;
  });
}

/**
 * Mock cancelAnimationFrame for proper animation cleanup.
 */
if (typeof window.cancelAnimationFrame === 'undefined') {
  window.cancelAnimationFrame = vi.fn((handle: number): void => {
    clearTimeout(handle);
  });
}

/**
 * Configure URL.createObjectURL mock for file handling tests.
 *
 * Used when testing file upload components or any component that creates
 * object URLs for blob/file data.
 */
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'mock-object-url');
}

/**
 * Configure URL.revokeObjectURL mock for proper cleanup.
 */
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn();
}
