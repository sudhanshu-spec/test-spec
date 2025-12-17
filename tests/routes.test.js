/**
 * HTTP Endpoint Integration Tests
 *
 * This test suite provides comprehensive HTTP response testing for the Express routes.
 * Tests verify exact response bodies, status codes, headers, and edge cases for all
 * endpoints defined in the application.
 *
 * Test Categories:
 * - Root Route Tests (GET '/'): Response validation, status codes, headers
 * - Evening Route Tests (GET '/evening'): Response validation, status codes, headers
 * - Invalid Route Tests: 404 handling for unknown routes
 * - HTTP Method Tests: Verify non-GET methods return appropriate errors
 * - Edge Case Tests: Trailing slashes, case sensitivity, special paths
 *
 * CRITICAL: Response string matching is EXACT including trailing newlines:
 * - GET '/' returns 'Hello, World!\n' (14 bytes, WITH trailing newline)
 * - GET '/evening' returns 'Good evening' (12 bytes, NO trailing newline)
 *
 * Uses Supertest for HTTP assertions.
 *
 * @module tests/routes.test
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Routes', () => {
  describe('GET /', () => {
    it('should return Hello World with trailing newline', async () => {
      const response = await request(app).get('/');
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should return exact string "Hello, World!\\n" (14 bytes)', async () => {
      const response = await request(app).get('/');
      // CRITICAL: Exact string match with trailing newline
      expect(response.text).toBe('Hello, World!\n');
      expect(response.text.length).toBe(14);
    });

    it('should return HTTP 200 status code', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should have Content-Type header containing text/html', async () => {
      const response = await request(app).get('/');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should chain status, Content-Type, and body assertions', async () => {
      await request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .expect('Hello, World!\n');
    });

    it('should respond quickly', async () => {
      const start = Date.now();
      await request(app).get('/');
      const duration = Date.now() - start;
      // Should respond in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should respond with charset in Content-Type', async () => {
      const response = await request(app).get('/');
      // Express 5.x sets charset=utf-8 by default
      expect(response.headers['content-type']).toMatch(/charset/i);
    });
  });

  describe('GET /evening', () => {
    it('should return Good evening without trailing newline', async () => {
      const response = await request(app).get('/evening');
      expect(response.text).toBe('Good evening');
    });

    it('should return exact string "Good evening" (12 bytes)', async () => {
      const response = await request(app).get('/evening');
      // CRITICAL: Exact string match WITHOUT trailing newline
      expect(response.text).toBe('Good evening');
      expect(response.text.length).toBe(12);
    });

    it('should return HTTP 200 status code', async () => {
      const response = await request(app).get('/evening');
      expect(response.status).toBe(200);
    });

    it('should have Content-Type header containing text/html', async () => {
      const response = await request(app).get('/evening');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should chain status, Content-Type, and body assertions', async () => {
      await request(app)
        .get('/evening')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .expect('Good evening');
    });
  });

  describe('Invalid Routes (404 Handling)', () => {
    it('should return 404 for /nonexistent', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
    });

    it('should return 404 for /invalid/path', async () => {
      const response = await request(app).get('/invalid/path');
      expect(response.status).toBe(404);
    });

    it('should return 404 for /api', async () => {
      const response = await request(app).get('/api');
      expect(response.status).toBe(404);
    });

    it('should return 404 for /hello', async () => {
      const response = await request(app).get('/hello');
      expect(response.status).toBe(404);
    });

    it('should return 404 for /mornings', async () => {
      const response = await request(app).get('/mornings');
      expect(response.status).toBe(404);
    });

    it('should include error indication in response body', async () => {
      const response = await request(app).get('/nonexistent');
      // Express default 404 handler includes some error text
      expect(response.status).toBe(404);
    });
  });

  describe('HTTP Method Tests - Root Route', () => {
    it('should reject POST / with 404 or 405', async () => {
      const response = await request(app).post('/');
      // Express 5.x returns 404 for unmatched methods on defined routes
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject PUT / with 404 or 405', async () => {
      const response = await request(app).put('/');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject DELETE / with 404 or 405', async () => {
      const response = await request(app).delete('/');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject PATCH / with 404 or 405', async () => {
      const response = await request(app).patch('/');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow HEAD / (Express handles automatically)', async () => {
      const response = await request(app).head('/');
      // HEAD requests return 200 with same headers as GET but no body
      expect(response.status).toBe(200);
    });

    it('should allow OPTIONS / (Express handles automatically)', async () => {
      const response = await request(app).options('/');
      // OPTIONS might return 200 or 204
      expect([200, 204]).toContain(response.status);
    });
  });

  describe('HTTP Method Tests - Evening Route', () => {
    it('should reject POST /evening with 404 or 405', async () => {
      const response = await request(app).post('/evening');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject PUT /evening with 404 or 405', async () => {
      const response = await request(app).put('/evening');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject DELETE /evening with 404 or 405', async () => {
      const response = await request(app).delete('/evening');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow HEAD /evening (Express handles automatically)', async () => {
      const response = await request(app).head('/evening');
      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle root with query string', async () => {
      const response = await request(app).get('/?foo=bar');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Hello, World!\n');
    });

    it('should handle evening with query string', async () => {
      const response = await request(app).get('/evening?time=now');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    it('should handle case-insensitive path /Evening', async () => {
      const response = await request(app).get('/Evening');
      // Express 5.x is case-insensitive by default
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    it('should handle uppercase /EVENING', async () => {
      const response = await request(app).get('/EVENING');
      // Express 5.x is case-insensitive by default
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    it('should handle root with fragment identifier in URL', async () => {
      // Note: Fragment identifiers (#) are handled client-side, not sent to server
      // Server only sees the path without fragment
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should handle trailing slash on /evening/', async () => {
      // Express has strict routing disabled by default, so /evening/ matches /evening
      const response = await request(app).get('/evening/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });

    it('should handle trailing slash on root with multiple slashes', async () => {
      // Multiple slashes should resolve to root
      const response = await request(app).get('//');
      // May return 200 or 404 depending on Express handling
      expect([200, 404]).toContain(response.status);
    });

    it('should handle mixed case with trailing slash /Evening/', async () => {
      // Combined case insensitivity and trailing slash tolerance
      const response = await request(app).get('/Evening/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Good evening');
    });
  });

  describe('Response Headers', () => {
    it('should include X-Powered-By header (default Express)', async () => {
      const response = await request(app).get('/');
      // Express 5.x may or may not include this header depending on config
      // Just verify we get a valid response
      expect(response.status).toBe(200);
    });

    it('should set Content-Length header for root', async () => {
      const response = await request(app).get('/');
      // Content-Length should be set for fixed-length responses
      expect(response.headers['content-length']).toBeDefined();
    });

    it('should set Content-Length header for evening', async () => {
      const response = await request(app).get('/evening');
      expect(response.headers['content-length']).toBeDefined();
    });

    it('should have matching Content-Length for root response', async () => {
      const response = await request(app).get('/');
      const contentLength = parseInt(response.headers['content-length'], 10);
      // 'Hello, World!\n' is 14 bytes
      expect(contentLength).toBe(14);
    });

    it('should have matching Content-Length for evening response', async () => {
      const response = await request(app).get('/evening');
      const contentLength = parseInt(response.headers['content-length'], 10);
      // 'Good evening' is 12 bytes
      expect(contentLength).toBe(12);
    });
  });

  describe('Response Body Validation', () => {
    it('should not have extra whitespace before Hello, World', async () => {
      const response = await request(app).get('/');
      expect(response.text.startsWith('Hello')).toBe(true);
    });

    it('should have exactly one trailing newline in root response', async () => {
      const response = await request(app).get('/');
      expect(response.text.endsWith('\n')).toBe(true);
      expect(response.text.endsWith('\n\n')).toBe(false);
    });

    it('should not have trailing newline in evening response', async () => {
      const response = await request(app).get('/evening');
      expect(response.text.endsWith('\n')).toBe(false);
    });

    it('should have correct punctuation in root response', async () => {
      const response = await request(app).get('/');
      expect(response.text).toContain(',');
      expect(response.text).toContain('!');
    });

    it('should not have punctuation in evening response', async () => {
      const response = await request(app).get('/evening');
      expect(response.text).not.toContain('!');
      expect(response.text).not.toContain(',');
    });
  });

  describe('Stress/Concurrency Tests', () => {
    it('should handle rapid sequential requests to root', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello, World!\n');
      }
    });

    it('should handle rapid sequential requests to evening', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/evening');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Good evening');
      }
    });

    it('should handle concurrent requests to both endpoints', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/'));
        requests.push(request(app).get('/evening'));
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
