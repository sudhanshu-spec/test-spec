/**
 * @fileoverview MSW (Mock Service Worker) server setup for frontend testing
 * @module tests/mocks/server
 *
 * Configures and exports the MSW server instance for Node.js test environment.
 * This server intercepts outgoing HTTP requests during tests and returns mock
 * responses defined by the handler modules.
 *
 * The server aggregates all API mock handlers from the handlers directory:
 * - Authentication handlers (login, logout, register, refresh, profile)
 * - Menu handlers (items, categories, search)
 * - Orders handlers (create, get, history, status updates)
 * - Bookings handlers (create, get, slots, cancel)
 *
 * Usage in test files:
 * The server is typically started and managed in the global test setup file
 * (client/src/__tests__/setup.ts) using the following lifecycle hooks:
 *
 * @example
 * // In setup.ts:
 * import { server } from './mocks/server';
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 *
 * @example
 * // In individual test files, add custom handlers for specific scenarios:
 * import { server } from '../mocks/server';
 * import { http, HttpResponse } from 'msw';
 *
 * it('handles server error', async () => {
 *   server.use(
 *     http.get('/api/menu/items', () => {
 *       return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 *     })
 *   );
 *   // ... test error handling
 * });
 *
 * @see {@link https://mswjs.io/docs/api/setup-server} MSW setupServer documentation
 * @see {@link https://mswjs.io/docs/integrations/node} MSW Node.js integration
 *
 * Follows patterns established in tests/lifecycle/server.test.js for:
 * - JSDoc documentation standards
 * - Module organization
 * - Helper function patterns
 */

import { setupServer } from 'msw/node';

// Import all API mock handlers from the handlers directory
import { authHandlers } from './handlers/auth';
import { menuHandlers } from './handlers/menu';
import { ordersHandlers } from './handlers/orders';
import { bookingsHandlers } from './handlers/bookings';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration options for the MSW server's listen() method.
 * Controls how the server handles unmatched requests during testing.
 *
 * @interface ServerListenOptions
 */
interface ServerListenOptions {
  /**
   * Determines behavior when a request doesn't match any handler.
   * - 'warn': Log a warning but allow the request (useful during development)
   * - 'error': Throw an error (recommended for CI to catch missing handlers)
   * - 'bypass': Silently let the request through
   * - Custom function: Handle unmatched requests with custom logic
   */
  onUnhandledRequest?: 'warn' | 'error' | 'bypass' | ((req: Request) => void);
}

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * All combined API mock handlers for the application.
 *
 * This array aggregates handlers from all feature domains:
 * - authHandlers: Authentication endpoints (/api/auth/*)
 * - menuHandlers: Menu data endpoints (/api/menu/*)
 * - ordersHandlers: Order management endpoints (/api/orders/*)
 * - bookingsHandlers: Table booking endpoints (/api/bookings/*)
 *
 * Handlers are combined in a specific order to ensure proper route matching.
 * More specific routes should generally come before wildcard routes.
 *
 * @constant {Array} handlers - Combined array of all MSW request handlers
 */
const handlers = [
  ...authHandlers,
  ...menuHandlers,
  ...ordersHandlers,
  ...bookingsHandlers,
];

// ============================================================================
// Server Instance
// ============================================================================

/**
 * MSW server instance for intercepting HTTP requests in Node.js test environment.
 *
 * This server uses the Node.js request interception mechanism to mock API
 * responses during testing, eliminating the need for actual network calls
 * while maintaining realistic API interaction patterns.
 *
 * The server provides the following lifecycle methods:
 *
 * - **listen(options?)**: Starts the request interception.
 *   Call in `beforeAll` hook to enable mocking for all tests.
 *   ```typescript
 *   server.listen({ onUnhandledRequest: 'error' })
 *   ```
 *
 * - **resetHandlers(...handlers?)**: Resets handlers to initial state.
 *   Call in `afterEach` hook to clean up any runtime handler additions.
 *   Can optionally accept new handlers to replace existing ones.
 *   ```typescript
 *   server.resetHandlers()
 *   ```
 *
 * - **close()**: Stops request interception and cleans up resources.
 *   Call in `afterAll` hook to properly teardown the server.
 *   ```typescript
 *   server.close()
 *   ```
 *
 * - **use(...handlers)**: Adds runtime handlers for specific test scenarios.
 *   These handlers take precedence over the default handlers.
 *   ```typescript
 *   server.use(
 *     http.get('/api/menu/items', () => HttpResponse.error())
 *   )
 *   ```
 *
 * @example
 * // Complete test setup pattern:
 * import { server } from './mocks/server';
 *
 * describe('Feature tests', () => {
 *   beforeAll(() => {
 *     // Start intercepting requests with strict error handling
 *     server.listen({ onUnhandledRequest: 'error' });
 *   });
 *
 *   afterEach(() => {
 *     // Reset any runtime handlers added during tests
 *     server.resetHandlers();
 *   });
 *
 *   afterAll(() => {
 *     // Clean up and stop intercepting requests
 *     server.close();
 *   });
 *
 *   it('fetches menu items', async () => {
 *     // Test uses default handlers from menuHandlers
 *     const response = await fetch('/api/menu/items');
 *     expect(response.ok).toBe(true);
 *   });
 *
 *   it('handles API errors', async () => {
 *     // Add a one-off error handler for this test
 *     server.use(
 *       http.get('/api/menu/items', () => {
 *         return HttpResponse.json(
 *           { error: 'Service unavailable' },
 *           { status: 503 }
 *         );
 *       })
 *     );
 *
 *     const response = await fetch('/api/menu/items');
 *     expect(response.status).toBe(503);
 *   });
 * });
 *
 * @see {@link authHandlers} Authentication API handlers
 * @see {@link menuHandlers} Menu API handlers
 * @see {@link ordersHandlers} Orders API handlers
 * @see {@link bookingsHandlers} Bookings API handlers
 */
export const server = setupServer(...handlers);

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Re-export the handlers array for advanced testing scenarios.
 *
 * This can be useful when you need to:
 * - Inspect the configured handlers
 * - Create a custom server instance with modified handlers
 * - Test handler configuration
 *
 * @example
 * import { handlers } from './mocks/server';
 *
 * // Create a custom server with additional handlers
 * const customServer = setupServer(
 *   ...handlers,
 *   ...additionalHandlers
 * );
 */
export { handlers };

/**
 * Re-export individual handler arrays for selective testing.
 *
 * Use these when you need to test with only specific API domains
 * or create custom server configurations.
 *
 * @example
 * import { authHandlers, menuHandlers } from './mocks/server';
 * import { setupServer } from 'msw/node';
 *
 * // Create a server with only auth and menu handlers
 * const limitedServer = setupServer(...authHandlers, ...menuHandlers);
 */
export { authHandlers, menuHandlers, ordersHandlers, bookingsHandlers };
