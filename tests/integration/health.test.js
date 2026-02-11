/**
 * @fileoverview Integration tests for GET /health endpoint
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
  test('should return 200 status code for GET /health', async () => {
    const response = await getHealth().expect(200);
    expect(response.status).toBe(200);
  });

  test('should return application/json Content-Type', async () => {
    const response = await getHealth();
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  test('should return status field with value "ok"', async () => {
    const response = await getHealth();
    expect(response.body.status).toBe('ok');
  });

  test('should return uptime as a number', async () => {
    const response = await getHealth();
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });

  test('should return timestamp as a valid ISO 8601 string', async () => {
    const response = await getHealth();
    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });

  test('should return environment as a string', async () => {
    const response = await getHealth();
    expect(typeof response.body.environment).toBe('string');
  });

  test('should return all required health fields', async () => {
    const response = await getHealth();
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('environment');
  });

  test('should be accessible without authentication', async () => {
    await getHealth().expect(200);
  });
});
