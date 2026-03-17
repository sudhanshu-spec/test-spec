/**
 * @fileoverview Unit tests for route handlers (src/routes/main.routes.js)
 * @module tests/unit/routes
 */

'use strict';

const mainRouter = require('../../src/routes/main.routes');
const { configureRoutes } = require('../../src/routes');

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
      expect(mainRouter).toBeDefined();
      expect(typeof mainRouter).toBe('function');
      expect(mainRouter.stack).toBeDefined();
      expect(Array.isArray(mainRouter.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof mainRouter.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have two route handlers defined', () => {
      const routeLayers = getRouteLayers(mainRouter);
      expect(routeLayers.length).toBe(2);
    });

    test('should define handlers for / and /evening paths', () => {
      const paths = getRoutePaths(mainRouter);
      expect(paths).toContain('/');
      expect(paths).toContain('/evening');
    });

    test('should define GET method handlers for both routes', () => {
      const routeLayers = getRouteLayers(mainRouter);
      
      routeLayers.forEach(layer => {
        expect(layer.route.methods).toBeDefined();
        expect(layer.route.methods.get).toBe(true);
      });
    });

    test('should have handler functions in route stack', () => {
      const routeLayers = getRouteLayers(mainRouter);
      
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
      const paths = getRoutePaths(mainRouter);
      const rootIndex = paths.indexOf('/');
      const eveningIndex = paths.indexOf('/evening');
      
      expect(rootIndex).toBeLessThan(eveningIndex);
    });
  });
});

describe('Route Barrel - index.js', () => {
  test('should export configureRoutes as a function', () => {
    expect(configureRoutes).toBeDefined();
    expect(typeof configureRoutes).toBe('function');
  });

  test('should mount mainRouter on root path when configureRoutes is called', () => {
    const mockApp = { use: jest.fn() };
    configureRoutes(mockApp);
    expect(mockApp.use).toHaveBeenCalledWith('/', mainRouter);
  });
});
