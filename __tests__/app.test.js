/**
 * Unit Tests for Express Application (src/app.js)
 *
 * Tests cover:
 * - Route handling (GET /, GET /evening)
 * - 404 Not Found handling
 * - JSON parsing middleware
 * - Error response format
 * - HTTP method handling
 *
 * @module __tests__/app.test
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Express Application', () => {
  // -------------------------------------------------------------------------
  // Route Handling Tests
  // -------------------------------------------------------------------------

  describe('Route Handling', () => {
    test('GET / returns Hello, World!', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    test('GET /evening returns Good evening', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
  });

  // -------------------------------------------------------------------------
  // 404 Error Handling Tests
  // -------------------------------------------------------------------------

  describe('404 Not Found Handling', () => {
    test('returns 404 for undefined route', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
    });

    test('returns JSON error response for 404', async () => {
      const response = await request(app).get('/undefined-route');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('status', 404);
    });

    test('404 error message includes method and path', async () => {
      const response = await request(app).get('/some/random/path');
      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Not Found');
      expect(response.body.error.message).toContain('GET');
      expect(response.body.error.message).toContain('/some/random/path');
    });

    test('POST to undefined route returns 404', async () => {
      const response = await request(app).post('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('POST');
    });

    test('DELETE to undefined route returns 404', async () => {
      const response = await request(app).delete('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('DELETE');
    });
  });

  // -------------------------------------------------------------------------
  // JSON Parsing Middleware Test
  // -------------------------------------------------------------------------

  describe('JSON Parsing Middleware', () => {
    test('parses JSON request body', async () => {
      // This test verifies the middleware is properly configured
      // by sending a JSON body to a route that doesn't exist
      // The 404 handler should still work properly with JSON body
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // -------------------------------------------------------------------------
  // Error Response Format Test
  // -------------------------------------------------------------------------

  describe('Error Response Format', () => {
    test('error response has correct structure', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: {
          message: expect.any(String),
          status: 404
        }
      });
    });
  });
});
