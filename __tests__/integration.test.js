/**
 * Integration Tests for HTTP Request Processing
 *
 * Tests cover:
 * - HTTP method handling (GET, POST, PUT, DELETE, HEAD, OPTIONS)
 * - Edge cases (URL encoding, empty bodies)
 * - Request body handling
 *
 * @module __tests__/integration.test
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('HTTP Request Processing', () => {
  // -------------------------------------------------------------------------
  // HTTP Method Handling Tests
  // -------------------------------------------------------------------------

  describe('HTTP Method Handling', () => {
    test('HEAD request to / returns 200 without body', async () => {
      const response = await request(app).head('/');
      expect(response.status).toBe(200);
      // HEAD requests don't have response body, text is undefined
      expect(response.text).toBeFalsy();
    });

    test('OPTIONS request to undefined route returns 404', async () => {
      const response = await request(app).options('/nonexistent');
      expect(response.status).toBe(404);
    });

    test('PUT request to undefined route returns 404', async () => {
      const response = await request(app).put('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('PUT');
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases Tests
  // -------------------------------------------------------------------------

  describe('Edge Cases', () => {
    test('handles URL-encoded path segments', async () => {
      const response = await request(app).get('/path%20with%20spaces');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    test('handles query string parameters', async () => {
      const response = await request(app).get('/?param=value');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('handles multiple query parameters', async () => {
      const response = await request(app).get('/?a=1&b=2&c=3');
      expect(response.status).toBe(200);
    });

    test('handles deep nested paths', async () => {
      const response = await request(app).get('/a/b/c/d/e/f');
      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('/a/b/c/d/e/f');
    });

    test('handles special characters in path', async () => {
      const response = await request(app).get('/test-route_123');
      expect(response.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // Request Body Handling Tests
  // -------------------------------------------------------------------------

  describe('Request Body Handling', () => {
    test('handles empty JSON body', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    test('handles JSON body with data', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ name: 'test', value: 123 });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // -------------------------------------------------------------------------
  // Response Content Tests
  // -------------------------------------------------------------------------

  describe('Response Content', () => {
    test('GET / returns correct content type', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /evening returns correct content type', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });
});
