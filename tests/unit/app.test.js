'use strict';

/**
 * Unit Tests for Express Application Factory Module
 * 
 * This module provides comprehensive unit tests for the Express application
 * factory (src/app.js). Tests validate module export verification,
 * route mounting validation, and Express app method availability.
 * 
 * Application Contract Tested:
 * - Module exports a valid Express application instance
 * - Application has standard Express methods (use, listen, get, post, etc.)
 * - Routes are properly mounted at root path
 * - Module caching behavior returns same instance
 * 
 * @module tests/unit/app.test
 * @see Section 0.5.2 - Unit tests for Express app factory
 * @see Section 0.3.1 - Test Target Identification
 */

const app = require('../../src/app');

describe('app (src/app.js)', () => {
  // ============================================================================
  // Module Export Tests
  // ============================================================================

  describe('module export', () => {
    test('should export a function (Express app)', () => {
      // Express applications are functions with middleware signature
      expect(typeof app).toBe('function');
    });

    test('should return same instance on multiple imports', () => {
      // Node.js module caching should return same object
      const app2 = require('../../src/app');
      expect(app).toBe(app2);
    });

    test('should be an Express application (has app.name)', () => {
      // Express apps have a name property
      expect(app.name).toBe('app');
    });

    test('should have settings property', () => {
      // Express apps have settings for configuration
      expect(app.settings).toBeDefined();
    });

    test('should have mountpath property', () => {
      // Express apps have mountpath property (default "/")
      expect(app.mountpath).toBeDefined();
    });
  });

  // ============================================================================
  // Express Application Methods Tests
  // ============================================================================

  describe('Express application methods', () => {
    test('should have use method', () => {
      expect(typeof app.use).toBe('function');
    });

    test('should have listen method', () => {
      expect(typeof app.listen).toBe('function');
    });

    test('should have get method', () => {
      expect(typeof app.get).toBe('function');
    });

    test('should have post method', () => {
      expect(typeof app.post).toBe('function');
    });

    test('should have put method', () => {
      expect(typeof app.put).toBe('function');
    });

    test('should have delete method', () => {
      expect(typeof app.delete).toBe('function');
    });

    test('should have route method', () => {
      expect(typeof app.route).toBe('function');
    });

    test('should have set method', () => {
      expect(typeof app.set).toBe('function');
    });

    test('should have enable method', () => {
      expect(typeof app.enable).toBe('function');
    });

    test('should have disable method', () => {
      expect(typeof app.disable).toBe('function');
    });

    test('should have all method', () => {
      expect(typeof app.all).toBe('function');
    });
  });

  // ============================================================================
  // Route Mounting Tests
  // ============================================================================

  describe('route mounting', () => {
    test('should have router initialized', () => {
      // Express 5.x uses app.router instead of app._router
      expect(app.router).toBeDefined();
    });

    test('should have routes in router stack', () => {
      // Router stack should contain registered middleware/routes
      expect(app.router.stack).toBeDefined();
      expect(app.router.stack.length).toBeGreaterThan(0);
    });

    test('should have at least one router layer mounted', () => {
      // Check for mounted routers in the stack
      const routerLayers = app.router.stack.filter(
        (layer) => layer.name === 'router'
      );
      expect(routerLayers.length).toBeGreaterThan(0);
    });

    test('should have route handler for "/" path available', () => {
      // The app should have routes that can handle GET /
      // We verify this by checking the router stack has appropriate handlers
      const hasRootHandler = app.router.stack.some((layer) => {
        if (layer.handle && layer.handle.stack) {
          return layer.handle.stack.some(
            (routeLayer) => routeLayer.route && routeLayer.route.path === '/'
          );
        }
        return false;
      });
      expect(hasRootHandler).toBe(true);
    });

    test('should have route handler for "/evening" path available', () => {
      // The app should have routes that can handle GET /evening
      const hasEveningHandler = app.router.stack.some((layer) => {
        if (layer.handle && layer.handle.stack) {
          return layer.handle.stack.some(
            (routeLayer) => routeLayer.route && routeLayer.route.path === '/evening'
          );
        }
        return false;
      });
      expect(hasEveningHandler).toBe(true);
    });
  });

  // ============================================================================
  // Express Settings Tests
  // ============================================================================

  describe('Express settings', () => {
    test('should have default view engine setting available', () => {
      // Settings should be accessible via app.get()
      // Express allows getting settings that may not be explicitly set
      expect(() => app.get('view engine')).not.toThrow();
    });

    test('should be able to set and get custom settings', () => {
      // Test that settings API works
      const originalValue = app.get('test-setting');
      app.set('test-setting', 'test-value');
      expect(app.get('test-setting')).toBe('test-value');
      // Restore original value
      if (originalValue === undefined) {
        app.set('test-setting', undefined);
      } else {
        app.set('test-setting', originalValue);
      }
    });

    test('should have env setting as function', () => {
      // app.get('env') returns NODE_ENV or 'development'
      const envValue = app.get('env');
      expect(typeof envValue).toBe('string');
    });
  });

  // ============================================================================
  // Application Instance Tests
  // ============================================================================

  describe('application instance', () => {
    test('should have locals object', () => {
      // Express apps have locals for app-level variables
      expect(app.locals).toBeDefined();
      expect(typeof app.locals).toBe('object');
    });

    test('should be a valid Express app with handle method', () => {
      // Express apps have handle for processing requests
      expect(typeof app.handle).toBe('function');
    });

    test('should have render method for template rendering', () => {
      expect(typeof app.render).toBe('function');
    });

    test('should have engine method for template engine setup', () => {
      expect(typeof app.engine).toBe('function');
    });

    test('should have param method for route parameters', () => {
      expect(typeof app.param).toBe('function');
    });
  });

  // ============================================================================
  // Application Behavior Tests
  // ============================================================================

  describe('application behavior', () => {
    test('should not throw when inspecting router stack', () => {
      expect(() => {
        app.router.stack.forEach((layer) => {
          // Accessing layer properties should not throw
          const name = layer.name;
          const handle = layer.handle;
        });
      }).not.toThrow();
    });

    test('should have consistent router after multiple accesses', () => {
      const router1 = app.router;
      const router2 = app.router;
      expect(router1).toBe(router2);
    });

    test('should have immutable route paths after initialization', () => {
      // Get current routes
      const routes = [];
      app.router.stack.forEach((layer) => {
        if (layer.handle && layer.handle.stack) {
          layer.handle.stack.forEach((routeLayer) => {
            if (routeLayer.route) {
              routes.push(routeLayer.route.path);
            }
          });
        }
      });

      // Should have the expected routes
      expect(routes).toContain('/');
      expect(routes).toContain('/evening');
    });
  });
});
