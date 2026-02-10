/**
 * @fileoverview Unit tests for API route handler (src/routes/api.routes.js)
 * @module tests/unit/api-routes
 */

'use strict';

const apiRoutes = require('../../src/routes/api.routes');
const config = require('../../src/config');

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

describe('Route Handlers - api.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(apiRoutes).toBeDefined();
      expect(typeof apiRoutes).toBe('function');
    });

    test('should have stack array defined', () => {
      expect(apiRoutes.stack).toBeDefined();
      expect(Array.isArray(apiRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      expect(typeof apiRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have exactly one route handler defined', () => {
      const routeLayers = getRouteLayers(apiRoutes);
      expect(routeLayers.length).toBe(1);
    });

    test('should define handler for /status path (mounted at /api in app.js)', () => {
      const paths = getRoutePaths(apiRoutes);
      expect(paths).toContain('/status');
    });

    test('should use GET method', () => {
      const routeLayers = getRouteLayers(apiRoutes);
      expect(routeLayers[0].route.methods).toBeDefined();
      expect(routeLayers[0].route.methods.get).toBe(true);
    });

    test('should have handler functions in route stack', () => {
      const routeLayers = getRouteLayers(apiRoutes);
      
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
    test('should return JSON with status running and environment', () => {
      const routeLayers = getRouteLayers(apiRoutes);
      const handler = routeLayers[0].route.stack[0].handle;
      
      const mockReq = {};
      const mockRes = {
        json: jest.fn()
      };
      
      handler(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('status', 'running');
      expect(response).toHaveProperty('environment');
      expect(typeof response.environment).toBe('string');
    });

    test('should include config.env as environment value', () => {
      const routeLayers = getRouteLayers(apiRoutes);
      const handler = routeLayers[0].route.stack[0].handle;
      
      const mockReq = {};
      const mockRes = {
        json: jest.fn()
      };
      
      handler(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.environment).toBe(config.env);
    });
  });
});
