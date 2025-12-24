'use strict';

/**
 * Integration Tests for Error Handling
 * 
 * This module contains integration tests for error handling scenarios,
 * specifically testing 404 responses for undefined routes. Uses Jest
 * with supertest library to make HTTP requests to the Express app and
 * validate proper error responses.
 * 
 * Test Coverage:
 * - 404 Not Found responses for undefined routes
 * - Various HTTP methods (GET, POST, PUT, DELETE) on undefined paths
 * - Error response body validation
 * - Error response header validation
 * 
 * @module tests/integration/error-handling.test
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Error Handling', () => {
  /**
   * Test Suite: 404 Not Found
   * 
   * Validates that undefined routes return proper 404 status codes
   * and appropriate error responses across all HTTP methods.
   */
  describe('404 Not Found', () => {
    /**
     * Test Suite: GET Requests to Undefined Routes
     * 
     * Validates that GET requests to non-existent routes
     * return 404 status codes.
     */
    describe('GET requests to undefined routes', () => {
      test('should return 404 for GET /undefined', async () => {
        // Arrange & Act
        const response = await request(app).get('/undefined');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET /nonexistent', async () => {
        // Arrange & Act
        const response = await request(app).get('/nonexistent');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET /foo', async () => {
        // Arrange & Act
        const response = await request(app).get('/foo');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET /bar', async () => {
        // Arrange & Act
        const response = await request(app).get('/bar');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET /api/users', async () => {
        // Arrange & Act
        const response = await request(app).get('/api/users');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET /random', async () => {
        // Arrange & Act
        const response = await request(app).get('/random');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET with nested path /api/v1/resource', async () => {
        // Arrange & Act
        const response = await request(app).get('/api/v1/resource');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for GET with special characters /route-with-dashes', async () => {
        // Arrange & Act
        const response = await request(app).get('/route-with-dashes');

        // Assert
        expect(response.status).toBe(404);
      });
    });

    /**
     * Test Suite: POST Requests to Undefined Routes
     * 
     * Validates that POST requests to non-existent routes
     * return 404 status codes.
     */
    describe('POST requests to undefined routes', () => {
      test('should return 404 for POST /nonexistent', async () => {
        // Arrange & Act
        const response = await request(app).post('/nonexistent');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for POST /undefined', async () => {
        // Arrange & Act
        const response = await request(app).post('/undefined');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for POST /api/users', async () => {
        // Arrange & Act
        const response = await request(app).post('/api/users');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for POST /submit', async () => {
        // Arrange & Act
        const response = await request(app).post('/submit');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for POST to root path (only GET defined)', async () => {
        // Arrange & Act
        // Note: Root route is defined for GET only, not POST
        const response = await request(app).post('/');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for POST to evening path (only GET defined)', async () => {
        // Arrange & Act
        // Note: /evening route is defined for GET only, not POST
        const response = await request(app).post('/evening');

        // Assert
        expect(response.status).toBe(404);
      });
    });

    /**
     * Test Suite: PUT Requests to Undefined Routes
     * 
     * Validates that PUT requests to non-existent routes
     * return 404 status codes.
     */
    describe('PUT requests to undefined routes', () => {
      test('should return 404 for PUT /nonexistent', async () => {
        // Arrange & Act
        const response = await request(app).put('/nonexistent');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for PUT /undefined', async () => {
        // Arrange & Act
        const response = await request(app).put('/undefined');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for PUT /api/users/1', async () => {
        // Arrange & Act
        const response = await request(app).put('/api/users/1');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for PUT /update', async () => {
        // Arrange & Act
        const response = await request(app).put('/update');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for PUT to root path (only GET defined)', async () => {
        // Arrange & Act
        const response = await request(app).put('/');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for PUT to evening path (only GET defined)', async () => {
        // Arrange & Act
        const response = await request(app).put('/evening');

        // Assert
        expect(response.status).toBe(404);
      });
    });

    /**
     * Test Suite: DELETE Requests to Undefined Routes
     * 
     * Validates that DELETE requests to non-existent routes
     * return 404 status codes.
     */
    describe('DELETE requests to undefined routes', () => {
      test('should return 404 for DELETE /nonexistent', async () => {
        // Arrange & Act
        const response = await request(app).delete('/nonexistent');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for DELETE /undefined', async () => {
        // Arrange & Act
        const response = await request(app).delete('/undefined');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for DELETE /api/users/1', async () => {
        // Arrange & Act
        const response = await request(app).delete('/api/users/1');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for DELETE /remove', async () => {
        // Arrange & Act
        const response = await request(app).delete('/remove');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for DELETE to root path (only GET defined)', async () => {
        // Arrange & Act
        const response = await request(app).delete('/');

        // Assert
        expect(response.status).toBe(404);
      });

      test('should return 404 for DELETE to evening path (only GET defined)', async () => {
        // Arrange & Act
        const response = await request(app).delete('/evening');

        // Assert
        expect(response.status).toBe(404);
      });
    });
  });

  /**
   * Test Suite: Error Response Validation
   * 
   * Validates that 404 error responses contain appropriate
   * body content and headers.
   */
  describe('Error Response Content', () => {
    test('should return error body indicating route not found', async () => {
      // Arrange & Act
      const response = await request(app).get('/nonexistent');

      // Assert - Express 5 default 404 behavior returns HTML with "Cannot GET /path"
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
      // Express returns "Cannot GET /path" message for undefined routes
      expect(response.text).toContain('Cannot GET');
    });

    test('should return error body for POST to undefined route', async () => {
      // Arrange & Act
      const response = await request(app).post('/nonexistent');

      // Assert - Express 5 default 404 behavior
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
      expect(response.text).toContain('Cannot POST');
    });

    test('should return error body for PUT to undefined route', async () => {
      // Arrange & Act
      const response = await request(app).put('/nonexistent');

      // Assert - Express 5 default 404 behavior
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
      expect(response.text).toContain('Cannot PUT');
    });

    test('should return error body for DELETE to undefined route', async () => {
      // Arrange & Act
      const response = await request(app).delete('/nonexistent');

      // Assert - Express 5 default 404 behavior
      expect(response.status).toBe(404);
      expect(response.text).toBeDefined();
      expect(response.text).toContain('Cannot DELETE');
    });

    test('should include path in error response body', async () => {
      // Arrange & Act
      const response = await request(app).get('/specific-undefined-path');

      // Assert
      expect(response.status).toBe(404);
      expect(response.text).toContain('/specific-undefined-path');
    });
  });

  /**
   * Test Suite: Error Response Headers
   * 
   * Validates that 404 error responses include appropriate headers.
   */
  describe('Error Response Headers', () => {
    test('should include Content-Type header for 404 response', async () => {
      // Arrange & Act
      const response = await request(app).get('/nonexistent');

      // Assert - Express returns text/html for 404 responses
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toBeDefined();
    });

    test('should return HTML content type for GET 404 response', async () => {
      // Arrange & Act & Assert - using supertest chainable expect
      await request(app)
        .get('/nonexistent')
        .expect(404)
        .expect('Content-Type', /text\/html/);
    });

    test('should return HTML content type for POST 404 response', async () => {
      // Arrange & Act & Assert - using supertest chainable expect
      await request(app)
        .post('/nonexistent')
        .expect(404)
        .expect('Content-Type', /text\/html/);
    });

    test('should return HTML content type for PUT 404 response', async () => {
      // Arrange & Act & Assert - using supertest chainable expect
      await request(app)
        .put('/nonexistent')
        .expect(404)
        .expect('Content-Type', /text\/html/);
    });

    test('should return HTML content type for DELETE 404 response', async () => {
      // Arrange & Act & Assert - using supertest chainable expect
      await request(app)
        .delete('/nonexistent')
        .expect(404)
        .expect('Content-Type', /text\/html/);
    });
  });

  /**
   * Test Suite: Edge Cases for Error Handling
   * 
   * Validates error handling for unusual or edge case paths.
   */
  describe('Edge Cases', () => {
    test('should return 404 for path with trailing slash /nonexistent/', async () => {
      // Arrange & Act
      const response = await request(app).get('/nonexistent/');

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 404 for path with query string /nonexistent?param=value', async () => {
      // Arrange & Act
      const response = await request(app).get('/nonexistent?param=value');

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 404 for path with URL encoded characters /hello%20world', async () => {
      // Arrange & Act
      const response = await request(app).get('/hello%20world');

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 404 for deeply nested undefined path /a/b/c/d/e', async () => {
      // Arrange & Act
      const response = await request(app).get('/a/b/c/d/e');

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 404 for path with numeric segments /users/123/posts/456', async () => {
      // Arrange & Act
      const response = await request(app).get('/users/123/posts/456');

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 404 for path with mixed case /NonExistent', async () => {
      // Arrange & Act
      const response = await request(app).get('/NonExistent');

      // Assert
      expect(response.status).toBe(404);
    });

    test('should return 404 for path starting with valid route prefix but invalid full path /evening/extra', async () => {
      // Arrange & Act
      // /evening is valid but /evening/extra should not be
      const response = await request(app).get('/evening/extra');

      // Assert
      expect(response.status).toBe(404);
    });
  });
});
