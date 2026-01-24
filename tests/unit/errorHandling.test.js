/**
 * tests/unit/errorHandling.test.js - Error Handling Tests for Express.js Server
 * 
 * This test file contains comprehensive tests for error handling scenarios
 * in the Express.js server. Tests verify proper 404 responses for undefined
 * routes, error response headers, and various error conditions.
 * 
 * Uses Jest as the testing framework and Supertest for HTTP assertions,
 * allowing tests to run against the Express app without starting the server.
 * 
 * Test Coverage:
 *   - 404 responses for undefined routes
 *   - Error response headers validation
 *   - Various undefined route patterns
 *   - Deeply nested paths handling
 */

const request = require('supertest');
const app = require('../../app');

/**
 * Test suite for 404 Error Handling
 * 
 * Verifies that the Express server returns appropriate 404 responses
 * for routes that are not defined in the application.
 */
describe('404 Error Handling', () => {
  /**
   * Test: Basic undefined route
   * Verifies that a non-existent route returns 404.
   */
  it('should return 404 for GET /nonexistent', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
  });

  /**
   * Test: API-style undefined route
   * Verifies that an API-style path that doesn't exist returns 404.
   */
  it('should return 404 for GET /api/missing', async () => {
    const response = await request(app).get('/api/missing');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Unknown path with hyphen
   * Verifies that paths with hyphens that don't exist return 404.
   */
  it('should return 404 for GET /unknown-path', async () => {
    const response = await request(app).get('/unknown-path');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Subpath of existing route
   * Verifies that subpaths of defined routes return 404 if not explicitly defined.
   */
  it('should return 404 for GET /evening/subpath', async () => {
    const response = await request(app).get('/evening/subpath');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Root subpath
   * Verifies that subpaths under root return 404.
   */
  it('should return 404 for GET /hello', async () => {
    const response = await request(app).get('/hello');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Numeric path
   * Verifies that numeric paths return 404.
   */
  it('should return 404 for GET /123', async () => {
    const response = await request(app).get('/123');
    expect(response.status).toBe(404);
  });
});

/**
 * Test suite for Error Response Headers
 * 
 * Verifies that error responses include appropriate headers.
 */
describe('Error Response Headers', () => {
  /**
   * Test: Content-Type header on 404
   * Verifies that 404 responses include a Content-Type header.
   */
  it('should return Content-Type header on 404 response', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toBeDefined();
  });

  /**
   * Test: Appropriate Content-Type for 404
   * Verifies that 404 responses have appropriate Content-Type.
   */
  it('should return appropriate Content-Type for 404 response', async () => {
    const response = await request(app).get('/missing-route');
    expect(response.status).toBe(404);
    // Express 5 returns HTML error page or text content type
    expect(response.headers['content-type']).toMatch(/text\/(html|plain)/);
  });

  /**
   * Test: Response body on 404
   * Verifies that 404 responses have a response body indicating the error.
   */
  it('should return a response body on 404', async () => {
    const response = await request(app).get('/undefined-route');
    expect(response.status).toBe(404);
    expect(response.text).toBeDefined();
    expect(response.text.length).toBeGreaterThan(0);
  });
});

/**
 * Test suite for Various Undefined Route Patterns
 * 
 * Tests different patterns of undefined routes to ensure consistent 404 handling.
 */
describe('Various undefined route patterns', () => {
  /**
   * Test: Deeply nested path
   * Verifies that deeply nested paths that don't exist return 404.
   */
  it('should return 404 for deeply nested path /a/b/c/d/e', async () => {
    const response = await request(app).get('/a/b/c/d/e');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Path with special characters (URL encoded)
   * Verifies that paths with URL-encoded special characters return 404.
   */
  it('should return 404 for path with encoded special characters', async () => {
    const response = await request(app).get('/path%20with%20spaces');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Path with dots
   * Verifies that paths with dots return 404.
   */
  it('should return 404 for GET /file.txt', async () => {
    const response = await request(app).get('/file.txt');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Path with underscore
   * Verifies that paths with underscores return 404.
   */
  it('should return 404 for GET /route_name', async () => {
    const response = await request(app).get('/route_name');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Path similar to existing route
   * Verifies that paths similar but not identical to existing routes return 404.
   */
  it('should return 404 for GET /evenings (similar to /evening)', async () => {
    const response = await request(app).get('/evenings');
    expect(response.status).toBe(404);
  });

  /**
   * Test: Path with query string to non-existent route
   * Verifies that adding query strings to non-existent routes still returns 404.
   */
  it('should return 404 for GET /notfound?query=value', async () => {
    const response = await request(app).get('/notfound?query=value');
    expect(response.status).toBe(404);
  });
});

/**
 * Test suite for Error Handling with Different HTTP Methods
 * 
 * Verifies 404 handling for various HTTP methods on undefined routes.
 */
describe('Error handling with different HTTP methods', () => {
  /**
   * Test: POST to undefined route
   * Verifies that POST to an undefined route returns 404.
   */
  it('should return 404 for POST /nonexistent', async () => {
    const response = await request(app).post('/nonexistent');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PUT to undefined route
   * Verifies that PUT to an undefined route returns 404.
   */
  it('should return 404 for PUT /nonexistent', async () => {
    const response = await request(app).put('/nonexistent');
    expect(response.status).toBe(404);
  });

  /**
   * Test: DELETE to undefined route
   * Verifies that DELETE to an undefined route returns 404.
   */
  it('should return 404 for DELETE /nonexistent', async () => {
    const response = await request(app).delete('/nonexistent');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PATCH to undefined route
   * Verifies that PATCH to an undefined route returns 404.
   */
  it('should return 404 for PATCH /nonexistent', async () => {
    const response = await request(app).patch('/nonexistent');
    expect(response.status).toBe(404);
  });

  /**
   * Test: HEAD to undefined route
   * Verifies that HEAD to an undefined route returns 404.
   */
  it('should return 404 for HEAD /nonexistent', async () => {
    const response = await request(app).head('/nonexistent');
    expect(response.status).toBe(404);
  });

  /**
   * Test: OPTIONS to undefined route
   * Verifies that OPTIONS to an undefined route returns 404.
   */
  it('should return 404 for OPTIONS /nonexistent', async () => {
    const response = await request(app).options('/nonexistent');
    expect(response.status).toBe(404);
  });
});
