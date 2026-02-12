'use strict';

/**
 * Unit Tests — Main Routes (src/routes/main.routes.js)
 *
 * Tests the Express Router handlers in isolation by mounting the router on
 * a minimal Express app (separate from src/app.js) and using Supertest for
 * HTTP assertions. This verifies route handler behavior independently of
 * any middleware or configuration applied in src/app.js.
 *
 * Route contracts under test:
 *   - GET /        → 'Hello, World!\n' (14 bytes, trailing newline)
 *   - GET /evening → 'Good evening'    (12 bytes, no trailing newline)
 */

const request = require('supertest');
const express = require('express');
const mainRouter = require('../../src/routes/main.routes');

// ---------------------------------------------------------------------------
// Expected response body constants (mirrors src/routes/main.routes.js)
// ---------------------------------------------------------------------------

/** Exact response body for GET / — 14 bytes with trailing newline */
const HELLO_WORLD_RESPONSE = 'Hello, World!\n';

/** Exact response body for GET /evening — 12 bytes without trailing newline */
const GOOD_EVENING_RESPONSE = 'Good evening';

// ---------------------------------------------------------------------------
// Minimal Express test harness — isolates the router from src/app.js
// ---------------------------------------------------------------------------
const app = express();
app.use('/', mainRouter);

describe('Main Routes (src/routes/main.routes.js)', () => {

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
  // 3. Router Export Verification
  // =========================================================================
  describe('Router Export', () => {
    it('should export a function (Express Router)', () => {
      expect(typeof mainRouter).toBe('function');
    });
  });
});
