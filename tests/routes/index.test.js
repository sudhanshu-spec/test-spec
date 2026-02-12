'use strict';

/**
 * Unit Tests — Route Aggregator (src/routes/index.js)
 *
 * Validates the barrel export pattern of the route aggregator module.
 * The module re-exports the Express Router from src/routes/main.routes.js
 * as { mainRoutes } for centralized route imports in src/app.js.
 *
 * Verified behaviours:
 *   - Exports an object with a 'mainRoutes' property
 *   - mainRoutes is a function (Express Router)
 *   - Exactly one property is exported (no extraneous exports)
 *   - mainRoutes is the same reference as the directly-required main.routes module
 */

const routes = require('../../src/routes');
const directRouter = require('../../src/routes/main.routes');

describe('Route Aggregator (src/routes/index.js)', () => {

  // =========================================================================
  // 1. Barrel Export Verification — Happy Path
  // =========================================================================
  describe('Barrel Export Verification', () => {
    it('should export an object', () => {
      expect(typeof routes).toBe('object');
      expect(routes).not.toBeNull();
    });

    it('should have a mainRoutes property', () => {
      expect(routes).toHaveProperty('mainRoutes');
    });

    it('should export mainRoutes as a function (Express Router)', () => {
      expect(typeof routes.mainRoutes).toBe('function');
    });

    it('should export exactly one property', () => {
      expect(Object.keys(routes)).toHaveLength(1);
    });

    it('should export mainRoutes that is the same reference as requiring main.routes directly', () => {
      // Verifies identity (===), not just shape — confirms the barrel
      // re-exports the original module without wrapping or modifying it
      expect(routes.mainRoutes).toBe(directRouter);
    });
  });

  // =========================================================================
  // 2. No Extraneous Exports — Edge Cases
  // =========================================================================
  describe('No Extraneous Exports', () => {
    it('should not export any unexpected properties', () => {
      expect(Object.keys(routes)).toEqual(['mainRoutes']);
    });

    it('should not have prototype pollution or inherited enumerable properties', () => {
      // Object.keys only returns own enumerable properties
      const ownKeys = Object.keys(routes);
      expect(ownKeys).toHaveLength(1);
      expect(ownKeys[0]).toBe('mainRoutes');
    });
  });
});
