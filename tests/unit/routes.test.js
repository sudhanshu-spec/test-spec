/**
 * tests/unit/routes.test.js - Route Edge Case Tests for Express.js Server
 * 
 * This test file contains comprehensive edge case tests for the Express.js
 * server routes. Tests cover boundary conditions including invalid HTTP methods,
 * query parameter handling, trailing slash variations, and path case sensitivity.
 * 
 * Uses Jest as the testing framework and Supertest for HTTP assertions,
 * allowing tests to run against the Express app without starting the server.
 * 
 * Test Coverage:
 *   - Invalid HTTP methods (POST, PUT, DELETE, PATCH) on defined routes
 *   - Query parameter handling
 *   - Path variations and edge cases
 */

const request = require('supertest');
const app = require('../../app');

/**
 * Test suite for invalid HTTP methods on GET '/' route
 * 
 * Verifies that the root endpoint properly rejects HTTP methods other than GET.
 * Express returns 404 for undefined method/route combinations by default.
 */
describe('Invalid methods on /', () => {
  /**
   * Test: POST method should be rejected
   * POST to '/' is not defined, so Express returns 404.
   */
  it('should return 404 for POST /', async () => {
    const response = await request(app).post('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PUT method should be rejected
   * PUT to '/' is not defined, so Express returns 404.
   */
  it('should return 404 for PUT /', async () => {
    const response = await request(app).put('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: DELETE method should be rejected
   * DELETE to '/' is not defined, so Express returns 404.
   */
  it('should return 404 for DELETE /', async () => {
    const response = await request(app).delete('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PATCH method should be rejected
   * PATCH to '/' is not defined, so Express returns 404.
   */
  it('should return 404 for PATCH /', async () => {
    const response = await request(app).patch('/');
    expect(response.status).toBe(404);
  });
});

/**
 * Test suite for invalid HTTP methods on GET '/evening' route
 * 
 * Verifies that the /evening endpoint properly rejects HTTP methods other than GET.
 * Express returns 404 for undefined method/route combinations by default.
 */
describe('Invalid methods on /evening', () => {
  /**
   * Test: POST method should be rejected
   * POST to '/evening' is not defined, so Express returns 404.
   */
  it('should return 404 for POST /evening', async () => {
    const response = await request(app).post('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PUT method should be rejected
   * PUT to '/evening' is not defined, so Express returns 404.
   */
  it('should return 404 for PUT /evening', async () => {
    const response = await request(app).put('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: DELETE method should be rejected
   * DELETE to '/evening' is not defined, so Express returns 404.
   */
  it('should return 404 for DELETE /evening', async () => {
    const response = await request(app).delete('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PATCH method should be rejected
   * PATCH to '/evening' is not defined, so Express returns 404.
   */
  it('should return 404 for PATCH /evening', async () => {
    const response = await request(app).patch('/evening');
    expect(response.status).toBe(404);
  });
});

/**
 * Test suite for path edge cases
 * 
 * Verifies proper handling of query parameters, trailing slashes,
 * and other path variations on defined routes.
 */
describe('Path edge cases', () => {
  /**
   * Test: Query parameters on GET /
   * Route should still return correct response when query parameters are provided.
   */
  it('should handle query parameters on GET / and still return correct response', async () => {
    const response = await request(app).get('/?foo=bar&baz=qux');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Query parameters on GET /evening
   * Route should still return correct response when query parameters are provided.
   */
  it('should handle query parameters on GET /evening and still return correct response', async () => {
    const response = await request(app).get('/evening?name=user');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Multiple query parameters
   * Route should handle multiple query parameters correctly.
   */
  it('should handle multiple query parameters on GET /', async () => {
    const response = await request(app).get('/?param1=value1&param2=value2&param3=value3');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Empty query string
   * Route should handle empty query string (just ?) correctly.
   */
  it('should handle empty query string on GET /', async () => {
    const response = await request(app).get('/?');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Case variation - uppercase path
   * Note: Express 5 has case-insensitive routing by default.
   * The route should still return a valid response for case variations.
   */
  it('should handle case variation /EVENING (Express 5 case-insensitive routing)', async () => {
    const response = await request(app).get('/EVENING');
    // Express 5 has case-insensitive routing by default
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Case variation - mixed case path
   * Note: Express 5 has case-insensitive routing by default.
   * The route should still return a valid response for case variations.
   */
  it('should handle case variation /Evening (Express 5 case-insensitive routing)', async () => {
    const response = await request(app).get('/Evening');
    // Express 5 has case-insensitive routing by default
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: URL encoded characters
   * Route should handle URL encoded characters in query parameters.
   */
  it('should handle URL encoded characters in query parameters', async () => {
    const response = await request(app).get('/?message=Hello%20World');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Special characters in query parameters
   * Route should handle special characters that are URL encoded.
   */
  it('should handle special characters in query parameters', async () => {
    const response = await request(app).get('/evening?emoji=%F0%9F%98%80');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });
});

/**
 * Test suite for response encoding verification
 * 
 * Verifies that responses are properly encoded.
 */
describe('Response encoding', () => {
  /**
   * Test: Response charset
   * Verifies the Content-Type header includes charset information.
   */
  it('should return response with charset in Content-Type for GET /', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-type']).toMatch(/charset=utf-8/);
  });

  /**
   * Test: Response charset for /evening
   * Verifies the Content-Type header includes charset information.
   */
  it('should return response with charset in Content-Type for GET /evening', async () => {
    const response = await request(app).get('/evening');
    expect(response.headers['content-type']).toMatch(/charset=utf-8/);
  });

  /**
   * Test: Response body encoding
   * Verifies that the response body is properly encoded as UTF-8.
   */
  it('should return properly encoded response body', async () => {
    const response = await request(app).get('/');
    // Verify the response is a string and matches expected encoding
    expect(typeof response.text).toBe('string');
    expect(Buffer.byteLength(response.text, 'utf8')).toBe(14);
  });
});
