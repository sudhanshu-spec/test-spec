/**
 * @fileoverview Integration tests for health check endpoint
 * @module tests/integration/health
 */

'use strict';

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Makes a GET request and returns the response.
 * @param {string} path - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(path) {
  return request(app).get(path);
}

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    test('should return 200 status code', async () => {
      const response = await get('/health');
      expect(response.status).toBe(200);
    });

    test('should return JSON Content-Type', async () => {
      const response = await get('/health');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should return response body with status field set to ok', async () => {
      const response = await get('/health');
      expect(response.body.status).toBe('ok');
    });

    test('should return response body with uptime as a non-negative number', async () => {
      const response = await get('/health');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should return response body with timestamp as valid ISO 8601 string', async () => {
      const response = await get('/health');
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    test('should contain all required response schema fields', async () => {
      const response = await get('/health');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
