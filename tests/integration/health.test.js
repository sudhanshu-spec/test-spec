/**
 * @fileoverview Integration tests for the health check endpoint (GET /health)
 *
 * Uses Supertest to make HTTP requests against the Express app instance
 * and verify response status, headers, and JSON body content.
 *
 * @module tests/integration/health
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request to the health endpoint.
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function getHealth() {
  return request(app).get('/health');
}

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    test('should return 200 status code', async () => {
      const response = await getHealth();
      expect(response.status).toBe(200);
    });

    test('should return application/json content type', async () => {
      const response = await getHealth();
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should return JSON response body', async () => {
      const response = await getHealth();
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    test('should return status ok in response body', async () => {
      const response = await getHealth();
      expect(response.body.status).toBe('ok');
    });

    test('should include uptime as a number', async () => {
      const response = await getHealth();
      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should include timestamp as a valid ISO string', async () => {
      const response = await getHealth();
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
      // Verify it's a valid date string
      const date = new Date(response.body.timestamp);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    test('should include environment in response body', async () => {
      const response = await getHealth();
      expect(response.body.environment).toBeDefined();
      expect(typeof response.body.environment).toBe('string');
    });

    test('should return all required fields in response body', async () => {
      const response = await getHealth();
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });

    test('should handle query parameters without affecting response', async () => {
      const response = await request(app).get('/health?check=true');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Health Endpoint Error Handling', () => {
    test('should return 404 for POST /health (unsupported method)', async () => {
      const response = await request(app).post('/health');
      expect(response.status).toBe(404);
    });

    test('should return 404 for PUT /health (unsupported method)', async () => {
      const response = await request(app).put('/health');
      expect(response.status).toBe(404);
    });

    test('should return 404 for DELETE /health (unsupported method)', async () => {
      const response = await request(app).delete('/health');
      expect(response.status).toBe(404);
    });
  });
});
