/**
 * Unit Tests for Main Application Routes Module
 * 
 * This file tests the src/routes/main.routes.js module which exports an
 * Express Router instance with route handlers for '/' and '/evening' endpoints.
 * 
 * Test Categories:
 * - Router Export Tests: Verify mainRoutes is a valid Express Router
 * - Route Handler Tests: Verify route count and path definitions
 * 
 * @module tests/unit/routes.test
 */

const mainRoutes = require('../../src/routes/main.routes');

describe('Route Handlers - main.routes.js', () => {
  describe('Router Export', () => {
    test('should export an Express Router instance', () => {
      expect(mainRoutes).toBeDefined();
      expect(typeof mainRoutes).toBe('function');
      // Express Router has stack property containing route definitions
      expect(mainRoutes.stack).toBeDefined();
      expect(Array.isArray(mainRoutes.stack)).toBe(true);
    });

    test('should have router handle method defined', () => {
      // Express Router instances have a handle method
      expect(typeof mainRoutes.handle).toBe('function');
    });
  });

  describe('Route Handler Definitions', () => {
    test('should have two route handlers defined', () => {
      // Filter stack for route layer types (layers with route property)
      const routeLayers = mainRoutes.stack.filter(layer => layer.route);
      expect(routeLayers.length).toBe(2);
    });

    test('should define handlers for / and /evening paths', () => {
      const routeLayers = mainRoutes.stack.filter(layer => layer.route);
      const paths = routeLayers.map(layer => layer.route.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/evening');
    });

    test('should define GET method handlers for both routes', () => {
      const routeLayers = mainRoutes.stack.filter(layer => layer.route);
      
      routeLayers.forEach(layer => {
        // Each route should have a GET method defined
        expect(layer.route.methods).toBeDefined();
        expect(layer.route.methods.get).toBe(true);
      });
    });

    test('should have handler functions in route stack', () => {
      const routeLayers = mainRoutes.stack.filter(layer => layer.route);
      
      routeLayers.forEach(layer => {
        // Each route layer should have a stack with handler(s)
        expect(layer.route.stack).toBeDefined();
        expect(layer.route.stack.length).toBeGreaterThan(0);
        
        // The handler should be a function
        layer.route.stack.forEach(handler => {
          expect(typeof handler.handle).toBe('function');
        });
      });
    });
  });

  describe('Route Path Ordering', () => {
    test('should define root path (/) before /evening path', () => {
      const routeLayers = mainRoutes.stack.filter(layer => layer.route);
      const paths = routeLayers.map(layer => layer.route.path);
      
      // Find indices
      const rootIndex = paths.indexOf('/');
      const eveningIndex = paths.indexOf('/evening');
      
      // Root should come before evening (as defined in source file)
      expect(rootIndex).toBeLessThan(eveningIndex);
    });
  });
});
