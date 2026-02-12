/**
 * @fileoverview Unit tests for health route handler (src/routes/health.routes.js)
 * @module tests/unit/health.routes
 */

'use strict';

const healthRoutes = require('../../src/routes/health.routes');

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

describe('Route Handlers - health.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(healthRoutes).toBeDefined();
      expect(typeof healthRoutes).toBe('function');
      expect(healthRoutes.stack).toBeDefined();
      expect(Array.isArray(healthRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof healthRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have exactly one route handler defined', () => {
      const routeLayers = getRouteLayers(healthRoutes);
      expect(routeLayers.length).toBe(1);
    });

    test('should define handler for /health path', () => {
      const paths = getRoutePaths(healthRoutes);
      expect(paths).toContain('/health');
    });

    test('should define GET method handler for health route', () => {
      const routeLayers = getRouteLayers(healthRoutes);
      routeLayers.forEach(layer => {
        expect(layer.route.methods).toBeDefined();
        expect(layer.route.methods.get).toBe(true);
      });
    });

    test('should have handler function in route stack', () => {
      const routeLayers = getRouteLayers(healthRoutes);
      routeLayers.forEach(layer => {
        expect(layer.route.stack).toBeDefined();
        expect(layer.route.stack.length).toBeGreaterThan(0);
        layer.route.stack.forEach(handler => {
          expect(typeof handler.handle).toBe('function');
        });
      });
    });
  });
});
