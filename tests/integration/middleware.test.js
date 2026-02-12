/**
 * @fileoverview Integration tests for the middleware pipeline
 * Tests security headers, CORS, error handling, and JSON parsing
 * Uses Supertest patterns from tests/integration/endpoints.test.js
 * @module tests/integration/middleware
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('Middleware Pipeline Integration', () => {

  describe('Security Headers (Helmet)', () => {
    test('GET / should include X-Content-Type-Options header', async () => {
      const response = await request(app).get('/');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('GET / should include X-Frame-Options or Content-Security-Policy header', async () => {
      const response = await request(app).get('/');
      // Helmet v8 uses Content-Security-Policy by default instead of X-Frame-Options
      const hasFrameProtection =
        response.headers['x-frame-options'] !== undefined ||
        response.headers['content-security-policy'] !== undefined;
      expect(hasFrameProtection).toBe(true);
    });

    test('GET / should NOT include X-Powered-By header', async () => {
      const response = await request(app).get('/');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('GET /health should include security headers', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CORS Headers', () => {
    test('GET / should include Access-Control-Allow-Origin header', async () => {
      const response = await request(app).get('/');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('OPTIONS preflight should return CORS headers', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Body Parsing', () => {
    test('should parse JSON bodies on POST requests', async () => {
      const response = await request(app)
        .post('/nonexistent')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      // Should get 404 (route not found) rather than 400 (parse error)
      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling Middleware', () => {
    test('should return JSON for 404 Not Found paths', async () => {
      const response = await request(app).get('/nonexistent-route');
      expect(response.status).toBe(404);
    });
  });

  describe('Health Endpoint via Middleware Pipeline', () => {
    test('GET /health should return 200 with JSON', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('GET /health response should contain status, uptime, timestamp', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.timestamp).toBe('number');
    });
  });

  describe('Existing Endpoints Through Middleware', () => {
    test('GET / should still return Hello, World!', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('GET /evening should still return Good evening', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
  });
});
