'use strict';

/**
 * HTTP Endpoints Integration Tests
 * 
 * This module provides comprehensive integration tests for the Express application's
 * HTTP endpoints. Tests validate response status codes, response bodies (with exact
 * string matching), and Content-Type headers using supertest library.
 * 
 * Tested Endpoints:
 * - GET / : Returns 'Hello, World!\n' (14 characters with trailing newline)
 * - GET /evening : Returns 'Good evening' (12 characters, no trailing newline)
 * 
 * @module tests/integration/endpoints.test
 */

const request = require('supertest');
const app = require('../../src/app');

/**
 * HTTP Endpoints Test Suite
 * 
 * Integration tests for all HTTP endpoints defined in the Express application.
 * Uses supertest to make HTTP requests without starting an actual server,
 * ensuring fast and isolated test execution.
 */
describe('HTTP Endpoints', () => {
  /**
   * GET / (Root Endpoint) Test Suite
   * 
   * Validates the root endpoint behavior:
   * - Returns HTTP 200 status code
   * - Response body is exactly 'Hello, World!\n' (14 chars with newline)
   * - Content-Type header is text/html with utf-8 charset
   */
  describe('GET /', () => {
    test('should return 200 status code', async () => {
      // Arrange & Act
      const response = await request(app).get('/');
      
      // Assert
      expect(response.status).toBe(200);
    });

    test('should return "Hello, World!" with trailing newline', async () => {
      // Arrange & Act
      const response = await request(app).get('/');
      
      // Assert - exact string match including trailing newline (14 characters total)
      expect(response.text).toBe('Hello, World!\n');
    });

    test('should return response body with exactly 14 characters', async () => {
      // Arrange & Act
      const response = await request(app).get('/');
      
      // Assert - verify character count (important: includes newline)
      expect(response.text.length).toBe(14);
    });

    test('should return text/html content type', async () => {
      // Act & Assert using supertest chainable expect
      await request(app)
        .get('/')
        .expect('Content-Type', /text\/html/);
    });

    test('should return utf-8 charset in content type header', async () => {
      // Act & Assert
      await request(app)
        .get('/')
        .expect('Content-Type', /charset=utf-8/);
    });

    test('should return correct content type with charset combined', async () => {
      // Act & Assert - validate full content type header
      await request(app)
        .get('/')
        .expect('Content-Type', /text\/html; charset=utf-8/);
    });

    test('should return 200 status using supertest expect chain', async () => {
      // Act & Assert using supertest chainable expect
      await request(app)
        .get('/')
        .expect(200);
    });
  });

  /**
   * GET /evening Endpoint Test Suite
   * 
   * Validates the evening endpoint behavior:
   * - Returns HTTP 200 status code
   * - Response body is exactly 'Good evening' (12 chars, NO trailing newline)
   * - Content-Type header is text/html with utf-8 charset
   */
  describe('GET /evening', () => {
    test('should return 200 status code', async () => {
      // Arrange & Act
      const response = await request(app).get('/evening');
      
      // Assert
      expect(response.status).toBe(200);
    });

    test('should return "Good evening" without trailing newline', async () => {
      // Arrange & Act
      const response = await request(app).get('/evening');
      
      // Assert - exact string match WITHOUT trailing newline (12 characters)
      expect(response.text).toBe('Good evening');
    });

    test('should return response body with exactly 12 characters', async () => {
      // Arrange & Act
      const response = await request(app).get('/evening');
      
      // Assert - verify character count (no newline character)
      expect(response.text.length).toBe(12);
    });

    test('should NOT have trailing newline in response', async () => {
      // Arrange & Act
      const response = await request(app).get('/evening');
      
      // Assert - explicitly verify no trailing newline
      expect(response.text.endsWith('\n')).toBe(false);
    });

    test('should return text/html content type', async () => {
      // Act & Assert using supertest chainable expect
      await request(app)
        .get('/evening')
        .expect('Content-Type', /text\/html/);
    });

    test('should return utf-8 charset in content type header', async () => {
      // Act & Assert
      await request(app)
        .get('/evening')
        .expect('Content-Type', /charset=utf-8/);
    });

    test('should return correct content type with charset combined', async () => {
      // Act & Assert - validate full content type header
      await request(app)
        .get('/evening')
        .expect('Content-Type', /text\/html; charset=utf-8/);
    });

    test('should return 200 status using supertest expect chain', async () => {
      // Act & Assert using supertest chainable expect
      await request(app)
        .get('/evening')
        .expect(200);
    });
  });

  /**
   * Combined Endpoint Tests
   * 
   * Additional tests that validate behavior across multiple endpoints
   * or test edge cases related to the endpoint responses.
   */
  describe('Combined Endpoint Validation', () => {
    test('should return different responses for / and /evening', async () => {
      // Arrange & Act
      const rootResponse = await request(app).get('/');
      const eveningResponse = await request(app).get('/evening');
      
      // Assert - responses should be different
      expect(rootResponse.text).not.toBe(eveningResponse.text);
    });

    test('should handle multiple concurrent requests to /', async () => {
      // Arrange & Act - make multiple concurrent requests
      const requests = [
        request(app).get('/'),
        request(app).get('/'),
        request(app).get('/')
      ];
      const responses = await Promise.all(requests);
      
      // Assert - all responses should be identical
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
      });
    });

    test('should handle multiple concurrent requests to /evening', async () => {
      // Arrange & Act - make multiple concurrent requests
      const requests = [
        request(app).get('/evening'),
        request(app).get('/evening'),
        request(app).get('/evening')
      ];
      const responses = await Promise.all(requests);
      
      // Assert - all responses should be identical
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('Good evening');
      });
    });

    test('should return consistent headers for both endpoints', async () => {
      // Arrange & Act
      const rootResponse = await request(app).get('/');
      const eveningResponse = await request(app).get('/evening');
      
      // Assert - both should have text/html content type
      expect(rootResponse.headers['content-type']).toMatch(/text\/html/);
      expect(eveningResponse.headers['content-type']).toMatch(/text\/html/);
    });
  });
});
