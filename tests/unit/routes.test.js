/**
 * @fileoverview Unit tests for route handlers and barrel exports
 * Tests main.routes.js route definitions and routes/index.js barrel exports
 * @module tests/unit/routes
 */

'use strict';

const mainRoutes = require('../../src/routes/main.routes');
const routes = require('../../src/routes');

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
    test('should export an Express Router instance', () => {
      expect(mainRoutes).toBeDefined();
      expect(typeof mainRoutes).toBe('function');
      expect(mainRoutes.stack).toBeDefined();
      expect(Array.isArray(mainRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof mainRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have two route handlers defined', () => {
      const routeLayers = getRouteLayers(mainRoutes);
      expect(routeLayers.length).toBe(2);
    });

    test('should define handlers for / and /evening paths', () => {
      const paths = getRoutePaths(mainRoutes);
      expect(paths).toContain('/');
      expect(paths).toContain('/evening');
    });

    test('should define GET method handlers for both routes', () => {
      const routeLayers = getRouteLayers(mainRoutes);
      
      routeLayers.forEach(layer => {
        expect(layer.route.methods).toBeDefined();
        expect(layer.route.methods.get).toBe(true);
      });
    });

    test('should have handler functions in route stack', () => {
      const routeLayers = getRouteLayers(mainRoutes);
      
      routeLayers.forEach(layer => {
        expect(layer.route.stack).toBeDefined();
        expect(layer.route.stack.length).toBeGreaterThan(0);
        
        layer.route.stack.forEach(handler => {
          expect(typeof handler.handle).toBe('function');
        });
      });
    });
  });

  describe('Route Path Ordering', () => {
    test('should define root path (/) before /evening path', () => {
      const paths = getRoutePaths(mainRoutes);
      const rootIndex = paths.indexOf('/');
      const eveningIndex = paths.indexOf('/evening');
      
      expect(rootIndex).toBeLessThan(eveningIndex);
    });
  });
});

describe('Route Barrel Exports - index.js', () => {
  test('should export mainRoutes', () => {
    expect(routes).toHaveProperty('mainRoutes');
    expect(typeof routes.mainRoutes).toBe('function');
  });

  test('should export healthRoutes', () => {
    expect(routes).toHaveProperty('healthRoutes');
    expect(typeof routes.healthRoutes).toBe('function');
  });

  test('should export apiRoutes', () => {
    expect(routes).toHaveProperty('apiRoutes');
    expect(typeof routes.apiRoutes).toBe('function');
  });

  test('should export routers with stack arrays', () => {
    expect(Array.isArray(routes.mainRoutes.stack)).toBe(true);
    expect(Array.isArray(routes.healthRoutes.stack)).toBe(true);
    expect(Array.isArray(routes.apiRoutes.stack)).toBe(true);
  });

  test('should export routers with handle functions', () => {
    expect(typeof routes.mainRoutes.handle).toBe('function');
    expect(typeof routes.healthRoutes.handle).toBe('function');
    expect(typeof routes.apiRoutes.handle).toBe('function');
  });
});
