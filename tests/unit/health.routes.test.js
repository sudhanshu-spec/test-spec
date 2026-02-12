/**
 * @fileoverview Unit tests for the health route module
 * Uses stack inspection pattern from tests/unit/routes.test.js
 * @module tests/unit/health.routes
 */

'use strict';

describe('Health Routes Module', () => {
  /** @type {import('express').Router} */
  let healthRouter;

  beforeAll(() => {
    healthRouter = require('../../src/routes/health.routes');
  });

  describe('Module Export', () => {
    test('should export a router instance', () => {
      expect(healthRouter).toBeDefined();
    });

    test('should have a stack property (Express Router)', () => {
      expect(healthRouter.stack).toBeDefined();
      expect(Array.isArray(healthRouter.stack)).toBe(true);
    });
  });

  describe('Route Stack Inspection', () => {
    test('should have at least one route layer', () => {
      expect(healthRouter.stack.length).toBeGreaterThanOrEqual(1);
    });

    test('should define a GET /health route', () => {
      const healthRoute = healthRouter.stack.find(layer => {
        if (layer.route) {
          return layer.route.path === '/health' || layer.route.path === '/';
        }
        return false;
      });
      expect(healthRoute).toBeDefined();
      expect(healthRoute.route.methods.get).toBe(true);
    });

    test('GET /health should have exactly one handler', () => {
      const healthRoute = healthRouter.stack.find(layer => {
        if (layer.route) {
          return layer.route.path === '/health' || layer.route.path === '/';
        }
        return false;
      });
      expect(healthRoute).toBeDefined();
      expect(healthRoute.route.stack.length).toBe(1);
    });
  });

  describe('Barrel Export', () => {
    test('should be accessible via routes barrel export', () => {
      const { healthRoutes } = require('../../src/routes');
      expect(healthRoutes).toBeDefined();
      expect(healthRoutes.stack).toBeDefined();
    });
  });
});
