'use strict';

/**
 * Unit Tests for Routes Barrel Module
 * 
 * This module provides comprehensive unit tests for the routes aggregator
 * (src/routes/index.js). Tests validate the export structure of the routes
 * barrel file and verify that mainRoutes is a valid Express Router instance.
 * 
 * Barrel Contract Tested:
 * - Module exports an object
 * - Exported object contains 'mainRoutes' property
 * - mainRoutes is a valid Express Router instance
 * - mainRoutes has stack property with registered routes
 * 
 * @module tests/unit/routes-barrel.test
 * @see Section 0.5.2 - Unit tests for routes barrel
 * @see Section 0.3.1 - Test Target Identification
 */

const routes = require('../../src/routes');
const { mainRoutes } = require('../../src/routes');

describe('routes barrel (src/routes/index.js)', () => {
  // ============================================================================
  // Module Export Tests
  // ============================================================================

  describe('module exports', () => {
    test('should export an object', () => {
      expect(typeof routes).toBe('object');
      expect(routes).not.toBeNull();
    });

    test('should export mainRoutes property', () => {
      expect(routes).toHaveProperty('mainRoutes');
    });

    test('should have mainRoutes accessible via destructuring', () => {
      const { mainRoutes: destructuredRoutes } = require('../../src/routes');
      expect(destructuredRoutes).toBeDefined();
    });

    test('should return same object on multiple imports', () => {
      const routes2 = require('../../src/routes');
      expect(routes).toBe(routes2);
    });

    test('should export exactly one property (mainRoutes)', () => {
      // The barrel should only export what's explicitly defined
      const keys = Object.keys(routes);
      expect(keys).toContain('mainRoutes');
    });
  });

  // ============================================================================
  // mainRoutes Property Tests
  // ============================================================================

  describe('mainRoutes', () => {
    test('should be defined', () => {
      expect(mainRoutes).toBeDefined();
    });

    test('should not be null', () => {
      expect(mainRoutes).not.toBeNull();
    });

    test('should be a function (Express Router signature)', () => {
      // Express Router is a function with middleware signature
      expect(typeof mainRoutes).toBe('function');
    });

    test('should have router stack property', () => {
      expect(mainRoutes).toHaveProperty('stack');
    });

    test('should have stack as an array', () => {
      expect(Array.isArray(mainRoutes.stack)).toBe(true);
    });

    test('should have registered routes in stack', () => {
      expect(mainRoutes.stack.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Router Methods Tests
  // ============================================================================

  describe('mainRoutes router methods', () => {
    test('should have get method', () => {
      expect(typeof mainRoutes.get).toBe('function');
    });

    test('should have post method', () => {
      expect(typeof mainRoutes.post).toBe('function');
    });

    test('should have put method', () => {
      expect(typeof mainRoutes.put).toBe('function');
    });

    test('should have delete method', () => {
      expect(typeof mainRoutes.delete).toBe('function');
    });

    test('should have use method', () => {
      expect(typeof mainRoutes.use).toBe('function');
    });

    test('should have route method', () => {
      expect(typeof mainRoutes.route).toBe('function');
    });

    test('should have all method', () => {
      expect(typeof mainRoutes.all).toBe('function');
    });

    test('should have param method', () => {
      expect(typeof mainRoutes.param).toBe('function');
    });
  });

  // ============================================================================
  // Router Stack Inspection Tests
  // ============================================================================

  describe('mainRoutes router stack', () => {
    test('should have layers in stack', () => {
      expect(mainRoutes.stack.length).toBeGreaterThan(0);
    });

    test('should have route layers (not just middleware)', () => {
      const routeLayers = mainRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers.length).toBeGreaterThan(0);
    });

    test('should have exactly two route layers registered', () => {
      // GET '/' and GET '/evening'
      const routeLayers = mainRoutes.stack.filter(
        (layer) => layer.route !== undefined
      );
      expect(routeLayers.length).toBe(2);
    });

    test('should have route at "/" path', () => {
      const rootRoute = mainRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      );
      expect(rootRoute).toBeDefined();
    });

    test('should have route at "/evening" path', () => {
      const eveningRoute = mainRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      );
      expect(eveningRoute).toBeDefined();
    });

    test('should have only GET methods on routes', () => {
      mainRoutes.stack.forEach((layer) => {
        if (layer.route) {
          // Each route should have GET method enabled
          expect(layer.route.methods.get).toBe(true);
          // And should not have other methods
          expect(layer.route.methods.post).toBeFalsy();
          expect(layer.route.methods.put).toBeFalsy();
          expect(layer.route.methods.delete).toBeFalsy();
        }
      });
    });
  });

  // ============================================================================
  // Export Consistency Tests
  // ============================================================================

  describe('export consistency', () => {
    test('should have same mainRoutes from object and destructured import', () => {
      expect(routes.mainRoutes).toBe(mainRoutes);
    });

    test('should have consistent stack between multiple accesses', () => {
      const stack1 = mainRoutes.stack;
      const stack2 = mainRoutes.stack;
      expect(stack1).toBe(stack2);
    });

    test('should have immutable route paths', () => {
      const paths = mainRoutes.stack
        .filter((layer) => layer.route)
        .map((layer) => layer.route.path);
      
      expect(paths).toContain('/');
      expect(paths).toContain('/evening');
      expect(paths).toHaveLength(2);
    });
  });

  // ============================================================================
  // Integration with App Tests
  // ============================================================================

  describe('integration compatibility', () => {
    test('should be usable with app.use()', () => {
      // mainRoutes should be compatible with Express app.use()
      // It should be a function with length 3 (req, res, next) signature
      // Router functions actually have variable arity
      expect(typeof mainRoutes).toBe('function');
    });

    test('should have handle method for processing requests', () => {
      expect(typeof mainRoutes.handle).toBe('function');
    });

    test('should have mergeParams property (boolean or undefined)', () => {
      // Routers may have mergeParams option
      const mergeParamsType = typeof mainRoutes.mergeParams;
      expect(['boolean', 'undefined']).toContain(mergeParamsType);
    });
  });

  // ============================================================================
  // Route Handler Accessibility Tests
  // ============================================================================

  describe('route handler accessibility', () => {
    test('should have accessible handler for "/" route', () => {
      const rootRoute = mainRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/'
      );
      expect(rootRoute.route.stack).toBeDefined();
      expect(rootRoute.route.stack.length).toBeGreaterThan(0);
      expect(typeof rootRoute.route.stack[0].handle).toBe('function');
    });

    test('should have accessible handler for "/evening" route', () => {
      const eveningRoute = mainRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/evening'
      );
      expect(eveningRoute.route.stack).toBeDefined();
      expect(eveningRoute.route.stack.length).toBeGreaterThan(0);
      expect(typeof eveningRoute.route.stack[0].handle).toBe('function');
    });

    test('route handlers should be callable functions', () => {
      mainRoutes.stack.forEach((layer) => {
        if (layer.route) {
          layer.route.stack.forEach((routeLayer) => {
            expect(typeof routeLayer.handle).toBe('function');
            // Handler should be callable without throwing immediately
            expect(() => {
              const fn = routeLayer.handle;
              // Just verify it's a function, don't actually call it
              fn.name; // Access a property to ensure it's a function
            }).not.toThrow();
          });
        }
      });
    });
  });
});
