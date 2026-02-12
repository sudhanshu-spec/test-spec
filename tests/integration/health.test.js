/**
 * @fileoverview Integration tests for the GET /health endpoint
 * @module tests/integration/health
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('Health Check Endpoint - GET /health', () => {
  test('should return 200 status code', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  test('should return JSON Content-Type', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  test('should return status ok in response body', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('should return uptime as a number', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThan(0);
  });

  test('should return timestamp as a valid ISO 8601 string', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('timestamp');
    const parsedDate = new Date(response.body.timestamp);
    expect(parsedDate.toISOString()).toBe(response.body.timestamp);
  });

  test('should return complete health check response schema', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String)
      })
    );
  });

  test('should include security headers from Helmet', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should include CORS headers', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});
