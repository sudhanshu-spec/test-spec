/**
 * HTTP Endpoint Integration Tests
 * 
 * This module contains integration tests for the Express application's HTTP endpoints.
 * Tests verify HTTP response behavior including status codes, response bodies, and headers
 * without starting an actual HTTP server by importing the app module directly.
 * 
 * Test coverage includes:
 * - GET / endpoint (Hello World)
 * - GET /evening endpoint (Good evening)
 * - 404 error handling for undefined routes
 * - 404 responses for unsupported HTTP methods
 * - Edge cases (query parameters, trailing slashes)
 * 
 * @module tests/integration/endpoints
 * @requires supertest
 * @requires ../../src/app
 */

const request = require('supertest');
const app = require('../../src/app');

describe('HTTP Endpoints', () => {
  /**
   * Test suite for the root endpoint (GET /)
   * Verifies the Hello World response with correct status, body, and headers
   */
  describe('GET /', () => {
    test('should return 200 status code', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      // Additional assertion for status verification
      expect(response.status).toBe(200);
    });

    test('should return "Hello, World!\\n" in response body', async () => {
      const response = await request(app)
        .get('/');
      
      // Verify exact response body including trailing newline
      expect(response.text).toBe('Hello, World!\n');
      expect(response.status).toBe(200);
    });

    test('should return text/html Content-Type header', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /text\/html/);
      
      // Verify charset is included in Content-Type
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  /**
   * Test suite for the evening endpoint (GET /evening)
   * Verifies the Good evening response with correct status, body, and headers
   */
  describe('GET /evening', () => {
    test('should return 200 status code', async () => {
      const response = await request(app)
        .get('/evening')
        .expect(200);
      
      // Additional assertion for status verification
      expect(response.status).toBe(200);
    });

    test('should return "Good evening" in response body', async () => {
      const response = await request(app)
        .get('/evening');
      
      // Verify exact response body (no trailing newline)
      expect(response.text).toBe('Good evening');
      expect(response.status).toBe(200);
    });

    test('should return text/html Content-Type header', async () => {
      const response = await request(app)
        .get('/evening')
        .expect('Content-Type', /text\/html/);
      
      // Verify charset is included in Content-Type
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  /**
   * Test suite for error handling
   * Verifies 404 responses for undefined routes and unsupported HTTP methods
   */
  describe('Error Handling', () => {
    test('should return 404 for undefined routes (GET /invalid)', async () => {
      const response = await request(app)
        .get('/invalid')
        .expect(404);
      
      // Verify 404 status code
      expect(response.status).toBe(404);
    });

    test('should return 404 for POST / (unsupported method)', async () => {
      const response = await request(app)
        .post('/')
        .expect(404);
      
      // Verify 404 status and response exists
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
    });

    test('should return 404 for PUT /evening (unsupported method)', async () => {
      const response = await request(app)
        .put('/evening')
        .expect(404);
      
      // Verify 404 status and response exists
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
    });

    test('should return 404 for DELETE / (unsupported method)', async () => {
      const response = await request(app)
        .delete('/')
        .expect(404);
      
      // Verify 404 status for DELETE method
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
    });
  });

  /**
   * Test suite for edge cases
   * Verifies handling of query parameters, trailing slashes, and other edge conditions
   */
  describe('Edge Cases', () => {
    test('should return 200 with unchanged body when query parameters are present (GET /?param=value)', async () => {
      const response = await request(app)
        .get('/?param=value')
        .expect(200);
      
      // Query parameters should be ignored, response body unchanged
      expect(response.text).toBe('Hello, World!\n');
      expect(response.status).toBe(200);
    });

    test('should handle multiple query parameters on root endpoint', async () => {
      const response = await request(app)
        .get('/?foo=bar&baz=qux')
        .expect(200);
      
      // Multiple query parameters should be ignored
      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should handle query parameters on /evening endpoint', async () => {
      const response = await request(app)
        .get('/evening?time=late')
        .expect(200);
      
      // Query parameters should be ignored on /evening route
      expect(response.text).toBe('Good evening');
      expect(response.status).toBe(200);
    });

    test('should handle double slash path (GET //)', async () => {
      // Note: Express typically normalizes double slashes
      const response = await request(app)
        .get('//');
      
      // Verify the request completes (behavior may vary based on Express version)
      expect(response.status).toBeDefined();
      // Double slash may normalize to single slash (200) or be treated as different path (404)
      expect([200, 404]).toContain(response.status);
    });
  });
});
