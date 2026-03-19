'use strict';

/**
 * Unit Tests for src/routes/index.js — Route Aggregator Barrel Export
 *
 * This test file validates the barrel/aggregator export pattern in
 * src/routes/index.js. It verifies that the module correctly re-exports
 * the mainRoutes Express Router and that the exported object shape matches
 * the contract consumed by src/app.js.
 *
 * Test categories:
 * - Barrel export (happy path): validates module exports an object with
 *   mainRoutes property that is a function (Express Router)
 * - Export shape: validates own-property status, reference equality with
 *   direct require, and destructured import pattern compatibility
 *
 * @module __tests__/routes/index.test
 */

// Static imports — src/routes/index.js has no side effects, so top-level
// require is safe and does not need jest.resetModules()
const routeExports = require('../../src/routes');
const directRouter = require('../../src/routes/main.routes');

describe('src/routes/index.js', () => {
  describe('Barrel export', () => {
    it('should export an object', () => {
      expect(routeExports).toBeDefined();
      expect(typeof routeExports).toBe('object');
      expect(routeExports).not.toBeNull();
    });

    it('should export a mainRoutes property', () => {
      expect(routeExports).toHaveProperty('mainRoutes');
    });

    it('should export mainRoutes as a function (Express Router)', () => {
      // Express Router instances are functions — they can be used as
      // middleware via app.use(). This verifies the barrel correctly
      // exposes a usable Router.
      expect(typeof routeExports.mainRoutes).toBe('function');
    });

    it('should allow destructured import of mainRoutes', () => {
      // Verify the destructuring pattern used by src/app.js:
      //   const { mainRoutes } = require('./routes');
      const { mainRoutes } = require('../../src/routes');

      expect(mainRoutes).toBeDefined();
      expect(typeof mainRoutes).toBe('function');
    });
  });

  describe('Export shape', () => {
    it('should have mainRoutes as an own property', () => {
      // Verify mainRoutes is a direct own property of the exports object,
      // not inherited from the prototype chain
      expect(
        Object.prototype.hasOwnProperty.call(routeExports, 'mainRoutes')
      ).toBe(true);
    });

    it('mainRoutes should be the same object as requiring main.routes directly', () => {
      // The barrel module should re-export the exact same Router instance
      // that main.routes.js exports — strict reference equality (===)
      expect(routeExports.mainRoutes).toBe(directRouter);
    });

    it('should not export unexpected additional properties', () => {
      // The barrel module should only export { mainRoutes } — no extra
      // properties should be present on the exports object
      const exportedKeys = Object.keys(routeExports);

      expect(exportedKeys).toHaveLength(1);
      expect(exportedKeys).toContain('mainRoutes');
    });

    it('should export a plain object (not an array or function)', () => {
      // The module.exports should be a plain object literal, not an
      // array, function, or other type
      expect(Array.isArray(routeExports)).toBe(false);
      expect(typeof routeExports).toBe('object');
      expect(routeExports).not.toBeNull();
      expect(routeExports.constructor).toBe(Object);
    });
  });
});
