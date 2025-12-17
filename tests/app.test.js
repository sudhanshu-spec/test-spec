/**
 * Express App Factory Integration Tests
 *
 * This test suite provides comprehensive coverage for src/app.js.
 * Tests verify the exported app is a valid Express application instance,
 * routes are properly mounted at correct paths, the app exports a function
 * with standard Express methods, and middleware chain is correctly configured.
 *
 * Test Categories:
 * - App Instance Tests: Verify app is a valid Express application
 * - Route Mounting Tests: Verify routes are accessible at correct paths
 * - Middleware Chain Tests: Verify Express handles requests correctly
 * - Error Handling Tests: Verify 404 handler for unknown routes
 * - Module Export Tests: Verify module export behavior
 *
 * Uses Supertest for HTTP-level integration testing.
 *
 * @module tests/app.test
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Express App Factory', () => {
  describe('App Instance', () => {
    it('should export a function (Express apps are functions)', () => {
      expect(typeof app).toBe('function');
    });

    it('should have use method', () => {
      expect(typeof app.use).toBe('function');
    });

    it('should have listen method', () => {
      expect(typeof app.listen).toBe('function');
    });

    it('should have get method', () => {
      expect(typeof app.get).toBe('function');
    });

    it('should have post method', () => {
      expect(typeof app.post).toBe('function');
    });

    it('should have put method', () => {
      expect(typeof app.put).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof app.delete).toBe('function');
    });

    it('should not be null or undefined', () => {
      expect(app).not.toBeNull();
      expect(app).not.toBeUndefined();
    });
  });

  describe('Route Mounting', () => {
    it('should mount root route at "/" path', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should mount evening route at "/evening" path', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
    });

    it('should return expected response for root route', async () => {
      const response = await request(app).get('/');
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should return expected response for evening route', async () => {
      const response = await request(app).get('/evening');
      expect(response.text).toBe('Good evening');
    });

    it('should preserve route path for root route', async () => {
      // Verify the route is accessible at exactly '/'
      const response = await request(app).get('/');
      expect(response.status).not.toBe(404);
    });

    it('should preserve route path for evening route', async () => {
      // Verify the route is accessible at exactly '/evening'
      const response = await request(app).get('/evening');
      expect(response.status).not.toBe(404);
    });
  });

  describe('Middleware Chain', () => {
    it('should handle requests without errors', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBeDefined();
    });

    it('should handle multiple sequential requests', async () => {
      const response1 = await request(app).get('/');
      const response2 = await request(app).get('/evening');
      const response3 = await request(app).get('/');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
    });

    it('should handle concurrent requests', async () => {
      const responses = await Promise.all([
        request(app).get('/'),
        request(app).get('/evening'),
        request(app).get('/'),
        request(app).get('/evening')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should process request headers correctly', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'text/html');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
    });

    it('should return 404 for deeply nested unknown routes', async () => {
      const response = await request(app).get('/invalid/deep/path');
      expect(response.status).toBe(404);
    });

    it('should not crash on invalid request paths', async () => {
      const response = await request(app).get('/some/unknown/route');
      expect(response.status).toBeDefined();
    });

    it('should return proper HTTP error for unknown routes', async () => {
      const response = await request(app).get('/404route');
      // Express returns 404 for unknown routes
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Module Export', () => {
    it('should export the app instance directly (module.exports = app)', () => {
      const exportedApp = require('../src/app');
      expect(exportedApp).toBe(app);
    });

    it('should return same app instance on multiple requires (Node caching)', () => {
      const app1 = require('../src/app');
      const app2 = require('../src/app');
      expect(app1).toBe(app2);
    });

    it('should export app that can be used with Supertest', async () => {
      const exportedApp = require('../src/app');
      const response = await request(exportedApp).get('/');
      expect(response.status).toBe(200);
    });
  });

  describe('Express Application Properties', () => {
    it('should have settings property', () => {
      expect(app.settings).toBeDefined();
    });

    it('should have router functionality indicating routes are mounted', async () => {
      // Express 5.x may not expose _router directly, verify routing works instead
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should have request and response prototypes', () => {
      expect(app.request).toBeDefined();
      expect(app.response).toBeDefined();
    });
  });

  describe('Content Handling', () => {
    it('should respond with text content from root route', async () => {
      const response = await request(app).get('/');
      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
    });

    it('should respond with text content from evening route', async () => {
      const response = await request(app).get('/evening');
      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
    });

    it('should handle Content-Type for text responses', async () => {
      const response = await request(app).get('/');
      expect(response.headers['content-type']).toBeDefined();
    });
  });
});
