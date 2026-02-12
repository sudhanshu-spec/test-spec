/**
 * Express App Factory Unit Tests
 *
 * Tests for src/app.js — validates that the module exports a valid Express
 * application instance using the factory pattern (no listen() call), confirms
 * standard Express methods exist, and verifies that routes are mounted.
 *
 * No mocking is required — tests exercise the real module because the factory
 * pattern in src/app.js creates a configured app without initiating network binding.
 *
 * @module tests/unit/app.test
 */

'use strict';

const app = require('../../src/app');

describe('Express App Factory', () => {
  test('should export a function (Express app)', () => {
    // Express application instances are callable request handler functions
    expect(typeof app).toBe('function');
  });

  test('should have request handler properties (get, post, use)', () => {
    // Verify standard Express Application methods exist on the exported instance
    expect(app.get).toBeDefined();
    expect(app.post).toBeDefined();
    expect(app.use).toBeDefined();
  });

  test('should have routes mounted on the application', () => {
    // Express 5 exposes the internal router via app.router (not app._router
    // as in Express 4). The router property is a function with a stack array.
    expect(app.router).toBeDefined();
    // The router stack should contain layers representing the mounted middleware
    expect(app.router.stack.length).toBeGreaterThan(0);

    // The main routes (GET / and GET /evening) are mounted via
    // app.use('/', mainRoutes) in src/app.js line 25. This creates a
    // nested router layer in the app's stack.
    const hasRouterLayer = app.router.stack.some(
      (layer) => layer.name === 'router' || layer.route !== undefined
    );
    expect(hasRouterLayer).toBe(true);
  });
});
