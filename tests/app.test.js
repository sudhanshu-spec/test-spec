'use strict';

/**
 * Integration Tests — Express Application (src/app.js)
 *
 * Validates the Express application's HTTP behavior via Supertest without
 * binding to a network port. The app is imported directly from src/app.js
 * (which exports a configured Express instance without calling listen()).
 *
 * Test categories:
 *   1. GET /         — Happy path: 200 status, exact body ('Hello, World!\n'), headers
 *   2. GET /evening  — Happy path: 200 status, exact body ('Good evening'), headers
 *   3. 404 Not Found — Error handling for undefined routes
 *   4. Unsupported HTTP Methods — POST, PUT, DELETE on defined routes
 *   5. Edge Cases    — Query strings on valid routes
 */

const request = require('supertest');
const app = require('../src/app');

// ---------------------------------------------------------------------------
// Expected response body constants (mirrors src/routes/main.routes.js)
// ---------------------------------------------------------------------------

/** Exact response body for GET / — 14 bytes with trailing newline */
const HELLO_WORLD_RESPONSE = 'Hello, World!\n';

/** Exact response body for GET /evening — 12 bytes without trailing newline */
const GOOD_EVENING_RESPONSE = 'Good evening';

describe('Express Application (src/app.js)', () => {

  // =========================================================================
  // 1. GET / — Happy Path
  // =========================================================================
  describe('GET /', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
    });

    it('should return exact response body with trailing newline', async () => {
      const response = await request(app).get('/');

      expect(response.text).toBe(HELLO_WORLD_RESPONSE);
    });

    it('should return 14 bytes response body', async () => {
      const response = await request(app).get('/');

      expect(Buffer.byteLength(response.text, 'utf8')).toBe(14);
    });

    it('should return text/html content-type', async () => {
      const response = await request(app).get('/');

      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should include Content-Length header matching body size', async () => {
      const response = await request(app).get('/');
      const expectedLength = Buffer.byteLength(HELLO_WORLD_RESPONSE, 'utf8');

      expect(response.headers['content-length']).toBe(String(expectedLength));
    });

    it('should include X-Powered-By Express header', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-powered-by']).toBe('Express');
    });
  });

  // =========================================================================
  // 2. GET /evening — Happy Path
  // =========================================================================
  describe('GET /evening', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/evening');

      expect(response.status).toBe(200);
    });

    it('should return exact response body without trailing newline', async () => {
      const response = await request(app).get('/evening');

      expect(response.text).toBe(GOOD_EVENING_RESPONSE);
    });

    it('should return 12 bytes response body', async () => {
      const response = await request(app).get('/evening');

      expect(Buffer.byteLength(response.text, 'utf8')).toBe(12);
    });

    it('should return text/html content-type', async () => {
      const response = await request(app).get('/evening');

      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should include Content-Length header matching body size', async () => {
      const response = await request(app).get('/evening');
      const expectedLength = Buffer.byteLength(GOOD_EVENING_RESPONSE, 'utf8');

      expect(response.headers['content-length']).toBe(String(expectedLength));
    });
  });

  // =========================================================================
  // 3. 404 Not Found — Error Handling
  // =========================================================================
  describe('404 Not Found', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 404 for /notaroute', async () => {
      const response = await request(app).get('/notaroute');

      expect(response.status).toBe(404);
    });
  });

  // =========================================================================
  // 4. Unsupported HTTP Methods
  // =========================================================================
  describe('Unsupported HTTP Methods', () => {
    it('should handle POST on / appropriately (not 200)', async () => {
      const response = await request(app).post('/');

      expect(response.status).not.toBe(200);
    });

    it('should handle PUT on / appropriately (not 200)', async () => {
      const response = await request(app).put('/');

      expect(response.status).not.toBe(200);
    });

    it('should handle DELETE on / appropriately (not 200)', async () => {
      const response = await request(app).delete('/');

      expect(response.status).not.toBe(200);
    });
  });

  // =========================================================================
  // 5. Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle query strings on valid routes', async () => {
      const response = await request(app).get('/?key=value');

      expect(response.status).toBe(200);
      expect(response.text).toBe(HELLO_WORLD_RESPONSE);
    });

    it('should handle query strings on /evening', async () => {
      const response = await request(app).get('/evening?time=now');

      expect(response.status).toBe(200);
      expect(response.text).toBe(GOOD_EVENING_RESPONSE);
    });
  });
});
