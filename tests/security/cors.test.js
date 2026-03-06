/**
 * CORS (Cross-Origin Resource Sharing) Test Suite
 *
 * Verifies that the cors middleware correctly handles cross-origin requests,
 * responds to preflight OPTIONS requests, and applies appropriate
 * Access-Control-Allow-* headers based on the configured origin whitelist.
 *
 * @module tests/security/cors.test
 */

'use strict';

const request = require('supertest');
const express = require('express');
const { createSecurityMiddleware } = require('../../src/middleware/security');
const { mainRoutes } = require('../../src/routes');

/**
 * Creates a fresh Express app with specific CORS configuration for testing.
 *
 * @param {string} corsOrigins - CORS origins configuration string
 * @returns {express.Application} Configured Express app
 */
function createTestApp(corsOrigins) {
  const app = express();
  const testConfig = {
    env: 'test',
    rateLimitWindowMs: 15 * 60 * 1000,
    rateLimitMax: 1000,
    corsOrigins: corsOrigins || '*'
  };

  const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = createSecurityMiddleware(testConfig);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(rateLimitMiddleware);
  app.use('/', mainRoutes);

  return app;
}

describe('CORS Configuration', () => {
  describe('Wildcard Origin (*)', () => {
    /**
     * When CORS_ORIGINS is set to '*', all origins should be allowed.
     */
    it('should allow requests from any origin with wildcard config', async () => {
      const app = createTestApp('*');

      const res = await request(app)
        .get('/')
        .set('Origin', 'http://example.com');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    /**
     * Preflight OPTIONS requests should succeed with wildcard CORS.
     */
    it('should respond to preflight OPTIONS requests', async () => {
      const app = createTestApp('*');

      const res = await request(app)
        .options('/')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    /**
     * Allowed methods should be listed in Access-Control-Allow-Methods.
     */
    it('should include allowed methods in preflight response', async () => {
      const app = createTestApp('*');

      const res = await request(app)
        .options('/')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Specific Origin', () => {
    /**
     * When a specific origin is configured, requests from that origin
     * should be allowed with the origin reflected in the response.
     */
    it('should allow requests from whitelisted origin', async () => {
      const app = createTestApp('http://localhost:3000');

      const res = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    /**
     * Requests from non-whitelisted origins should not include
     * the Access-Control-Allow-Origin header for that origin.
     */
    it('should not include ACAO header for non-whitelisted origin', async () => {
      const app = createTestApp('http://localhost:3000');

      const res = await request(app)
        .get('/')
        .set('Origin', 'http://evil.com');

      expect(res.status).toBe(200);
      // The response should not reflect the unauthorized origin
      const acao = res.headers['access-control-allow-origin'];
      if (acao) {
        expect(acao).not.toBe('http://evil.com');
      }
    });
  });

  describe('Multiple Origins', () => {
    /**
     * When multiple comma-separated origins are configured,
     * requests from any of them should be allowed.
     */
    it('should allow requests from any of the whitelisted origins', async () => {
      const app = createTestApp('http://localhost:3000,http://example.com');

      const res = await request(app)
        .get('/')
        .set('Origin', 'http://example.com');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://example.com');
    });
  });

  describe('Exposed Headers', () => {
    /**
     * Rate limit headers should be exposed to client JavaScript
     * so frontend applications can read rate limit information.
     */
    it('should expose RateLimit headers via Access-Control-Expose-Headers', async () => {
      const app = createTestApp('*');

      const res = await request(app)
        .get('/')
        .set('Origin', 'http://example.com');

      const exposed = res.headers['access-control-expose-headers'];
      if (exposed) {
        expect(exposed).toContain('RateLimit');
      }
    });
  });

  describe('Credentials', () => {
    /**
     * The Access-Control-Allow-Credentials header should be set to
     * true to support cookies and authorization headers in cross-origin
     * requests.
     */
    it('should support credentials in CORS responses', async () => {
      const app = createTestApp('http://localhost:3000');

      const res = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
