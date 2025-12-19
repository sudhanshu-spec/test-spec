/**
 * tests/unit/server.test.js - Core Unit Tests for Express Route Handlers
 * 
 * This test file contains comprehensive unit tests for the Express.js server
 * route handlers. Tests verify correct response bodies, HTTP status codes,
 * and response headers for both GET '/' and GET '/evening' endpoints.
 * 
 * Uses Jest as the testing framework and Supertest for HTTP assertions,
 * allowing tests to run against the Express app without starting the server.
 * 
 * Test Coverage:
 *   - GET / route: Response body, status code, headers
 *   - GET /evening route: Response body, status code, headers
 */

const request = require('supertest');
const app = require('../../app');

/**
 * Test suite for GET '/' route handler
 * 
 * Verifies the root endpoint returns the correct greeting message,
 * including the trailing newline character, with appropriate HTTP status
 * and headers.
 */
describe('GET /', () => {
  /**
   * Test: Response body exact match
   * Verifies that the response body is exactly 'Hello, World!\n' including
   * the trailing newline character as specified in requirements.
   */
  it('should return "Hello, World!\\n" with exact match including trailing newline', async () => {
    const response = await request(app).get('/');
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: HTTP status code
   * Verifies that the endpoint returns HTTP 200 OK status for successful requests.
   */
  it('should return status 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  /**
   * Test: Content-Type header
   * Verifies that the response includes the correct Content-Type header.
   * Express.send() with a string sets Content-Type to text/html by default.
   */
  it('should return correct Content-Type header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  /**
   * Test: Content-Length header
   * Verifies that the response includes a Content-Length header matching
   * the response body length (14 bytes for 'Hello, World!\n').
   */
  it('should return correct Content-Length header', async () => {
    const response = await request(app).get('/');
    // 'Hello, World!\n' is 14 characters
    expect(response.headers['content-length']).toBe('14');
  });

  /**
   * Test: Combined status and body verification
   * Verifies both status code and response body in a single assertion chain.
   */
  it('should return status 200 with correct body in single request', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });
});

/**
 * Test suite for GET '/evening' route handler
 * 
 * Verifies the evening endpoint returns the correct greeting message
 * without a trailing newline, with appropriate HTTP status and headers.
 */
describe('GET /evening', () => {
  /**
   * Test: Response body exact match
   * Verifies that the response body is exactly 'Good evening' without
   * a trailing newline character.
   */
  it('should return "Good evening" with exact match', async () => {
    const response = await request(app).get('/evening');
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: HTTP status code
   * Verifies that the endpoint returns HTTP 200 OK status for successful requests.
   */
  it('should return status 200', async () => {
    const response = await request(app).get('/evening');
    expect(response.status).toBe(200);
  });

  /**
   * Test: Content-Type header
   * Verifies that the response includes the correct Content-Type header.
   * Express.send() with a string sets Content-Type to text/html by default.
   */
  it('should return correct Content-Type header', async () => {
    const response = await request(app).get('/evening');
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  /**
   * Test: Content-Length header
   * Verifies that the response includes a Content-Length header matching
   * the response body length (12 bytes for 'Good evening').
   */
  it('should return correct Content-Length header', async () => {
    const response = await request(app).get('/evening');
    // 'Good evening' is 12 characters
    expect(response.headers['content-length']).toBe('12');
  });

  /**
   * Test: Combined status and body verification
   * Verifies both status code and response body in a single assertion chain.
   */
  it('should return status 200 with correct body in single request', async () => {
    const response = await request(app).get('/evening');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });
});
