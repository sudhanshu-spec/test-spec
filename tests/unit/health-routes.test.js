/**
 * @fileoverview Unit tests for health check route handler (src/routes/health.routes.js)
 * @module tests/unit/health-routes
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
    });

    test('should have stack array defined', () => {
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

    test('should define handler for / path (mounted at /health in app.js)', () => {
      const paths = getRoutePaths(healthRoutes);
      expect(paths).toContain('/');
    });

    test('should use GET method', () => {
      const routeLayers = getRouteLayers(healthRoutes);
      expect(routeLayers[0].route.methods).toBeDefined();
      expect(routeLayers[0].route.methods.get).toBe(true);
    });

    test('should have handler functions in route stack', () => {
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

  describe('Handler Response', () => {
    test('should return JSON with status ok and uptime', () => {
      const routeLayers = getRouteLayers(healthRoutes);
      const handler = routeLayers[0].route.stack[0].handle;
      
      const mockReq = {};
      const mockRes = {
        json: jest.fn()
      };
      
      handler(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('status', 'ok');
      expect(response).toHaveProperty('uptime');
      expect(typeof response.uptime).toBe('number');
    });
  });
});
