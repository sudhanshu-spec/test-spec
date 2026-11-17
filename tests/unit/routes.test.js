/**
 * @fileoverview Unit tests for route handlers (src/routes/main.routes.js)
 * @module tests/unit/routes
 */

'use strict';

const mainRoutes = require('../../src/routes/main.routes');

/**
 * @typedef {Object} RouteLayer
 * @property {Object} route - Route configuration
 * @property {string} route.path - Route path
 * @property {Object} route.methods - HTTP methods object
 * @property {Object[]} route.stack - Handler stack
 */

/**
 * Extracts route layers from Express Router stack.
 * @param {import('express').Router} router - Express Router instance
 * @returns {RouteLayer[]} Array of route layers with route definitions
 */
function getRouteLayers(router) {
  return router.stack.filter(layer => layer.route);
}

/**
 * Extracts route paths from Express Router.
 * @param {import('express').Router} router - Express Router instance
 * @returns {string[]} Array of route paths
 */
function getRoutePaths(router) {
  return getRouteLayers(router).map(layer => layer.route.path);
}

describe('Route Handlers - main.routes.js', () => {
  describe('Router Export', () => {
    test('exports an Express Router as a function with an array stack', () => {
      expect(typeof mainRoutes).toBe('function');
      expect(Array.isArray(mainRoutes.stack)).toBe(true);
    });

    test('exposes the router request handler as a function', () => {
      expect(typeof mainRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('registers exactly three route layers', () => {
      expect(getRouteLayers(mainRoutes)).toHaveLength(3);
    });

    test("registers exactly the paths '/', '/evening' and '/good-evening' in that order", () => {
      expect(getRoutePaths(mainRoutes)).toEqual(['/', '/evening', '/good-evening']);
    });

    test('registers GET as the only method and a handler function on each of the three routes', () => {
      const registrations = getRouteLayers(mainRoutes).map(layer => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods || {}),
        handlers: (layer.route.stack || []).map(handler => typeof handler.handle)
      }));

      expect(registrations).toEqual([
        { path: '/', methods: ['get'], handlers: ['function'] },
        { path: '/evening', methods: ['get'], handlers: ['function'] },
        { path: '/good-evening', methods: ['get'], handlers: ['function'] }
      ]);
    });
  });
});
