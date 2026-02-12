/**
 * Route Aggregator and Registration Unit Tests
 *
 * Tests for src/routes/index.js (barrel export) and src/routes/main.routes.js
 * (route handler registration). Validates that the route aggregator exports
 * the correct structure and the main router has the expected GET handlers
 * registered.
 *
 * No mocking is required — tests exercise the real modules to verify
 * export contracts and route registration.
 *
 * @module tests/unit/routes.test
 */

'use strict';

const { mainRoutes } = require('../../src/routes');
const mainRouter = require('../../src/routes/main.routes');

// =============================================================================
// Route Aggregator (src/routes/index.js)
// =============================================================================

describe('Route Aggregator (src/routes/index.js)', () => {
  test('should export an object with mainRoutes property', () => {
    // Verify the barrel export contains the mainRoutes key
    expect(mainRoutes).toBeDefined();

    // Also verify the full export object structure
    const routes = require('../../src/routes');
    expect(routes).toHaveProperty('mainRoutes');
  });

  test('should export mainRoutes as a function (Express Router)', () => {
    // Express Router instances are middleware functions (callable)
    expect(typeof mainRoutes).toBe('function');
  });
});

// =============================================================================
// Main Routes (src/routes/main.routes.js)
// =============================================================================

describe('Main Routes (src/routes/main.routes.js)', () => {
  test('mainRoutes router should have GET / handler registered', () => {
    // Express Router stores registered routes in its stack array as Layer
    // objects. Each Layer with a route property represents a registered route.
    // The route object has .path (string) and .methods (object like { get: true }).
    const rootRoute = mainRouter.stack.find(
      (layer) => layer.route && layer.route.path === '/'
    );

    expect(rootRoute).toBeDefined();
    expect(rootRoute.route.methods.get).toBeTruthy();
  });

  test('mainRoutes router should have GET /evening handler registered', () => {
    // Inspect the router stack for a layer matching /evening with GET method
    const eveningRoute = mainRouter.stack.find(
      (layer) => layer.route && layer.route.path === '/evening'
    );

    expect(eveningRoute).toBeDefined();
    expect(eveningRoute.route.methods.get).toBeTruthy();
  });
});
