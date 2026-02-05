/**
 * Health Endpoint Integration Tests
 * 
 * Tests for the /health endpoint that provides system status
 * information for PM2 and load balancer monitoring.
 * 
 * @module tests/integration/health.test
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    test('should return 200 status code', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    test('should return application/json Content-Type', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should return JSON response with status field', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    test('should return JSON response with timestamp field', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('timestamp');
      // Timestamp should be a valid ISO 8601 date string
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    test('should return JSON response with uptime field', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('should return exactly 3 fields in response', async () => {
      const response = await request(app).get('/health');
      expect(Object.keys(response.body)).toHaveLength(3);
    });

    test('should handle query parameters gracefully', async () => {
      const response = await request(app).get('/health?verbose=true');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Health Endpoint Security', () => {
    test('should include security headers from Helmet', async () => {
      const response = await request(app).get('/health');
      // Helmet sets various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should have X-Frame-Options header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('Health Endpoint Error Cases', () => {
    test('should return 404 for POST /health', async () => {
      const response = await request(app).post('/health');
      expect(response.status).toBe(404);
    });

    test('should return 404 for PUT /health', async () => {
      const response = await request(app).put('/health');
      expect(response.status).toBe(404);
    });

    test('should return 404 for DELETE /health', async () => {
      const response = await request(app).delete('/health');
      expect(response.status).toBe(404);
    });

    test('should return 404 for /health/nonexistent subpath', async () => {
      const response = await request(app).get('/health/nonexistent');
      expect(response.status).toBe(404);
    });
  });
});

describe('Health Routes Module', () => {
  test('should export an Express Router', () => {
    const healthRoutes = require('../../src/routes/health.routes');
    expect(healthRoutes).toBeDefined();
    expect(typeof healthRoutes).toBe('function');
    // Express routers have a handle method
    expect(typeof healthRoutes.handle).toBe('function');
  });

  test('should have a GET route registered', () => {
    const healthRoutes = require('../../src/routes/health.routes');
    const stack = healthRoutes.stack;
    expect(stack.length).toBeGreaterThan(0);
    
    // Find GET / route
    const getRoute = stack.find(layer => 
      layer.route && 
      layer.route.path === '/' && 
      layer.route.methods.get
    );
    expect(getRoute).toBeDefined();
  });
});
