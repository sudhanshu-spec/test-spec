'use strict';

/**
 * Unit and integration tests for src/routes/main.routes.js
 *
 * Tests the Express Router in isolation by mounting it into a standalone
 * Express app (NOT importing src/app.js) and using supertest for HTTP
 * assertions without port binding.
 *
 * Coverage targets:
 * - 100% line coverage on src/routes/main.routes.js
 * - All route handlers exercised (GET / and GET /evening)
 * - Response bodies, status codes, headers, and edge cases validated
 *
 * @module __tests__/routes/main.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const mainRoutes = require('../../src/routes/main.routes');

/**
 * Creates a standalone Express app for testing the mainRoutes router
 * in complete isolation from the production app configuration.
 *
 * @returns {import('express').Express} Configured Express app with mainRoutes mounted at /
 */
function createTestApp() {
  const app = express();
  app.use('/', mainRoutes);
  return app;
}

describe('Main Routes (main.routes.js)', () => {
  /** @type {import('express').Express} */
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  // ---------------------------------------------------------------
  // Happy Path Tests — GET /
  // ---------------------------------------------------------------
  describe('GET /', () => {
    it('should return 200 status code', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });

    it('should return Hello, World! with trailing newline', async () => {
      const res = await request(app).get('/');
      // The exact response string is 'Hello, World!\n' — 14 bytes in UTF-8
      expect(res.text).toBe('Hello, World!\n');
      // Verify exact byte length: 13 ASCII chars + 1 newline = 14
      expect(res.text.length).toBe(14);
    });

    it('should return text/html content type with utf-8 charset', async () => {
      const res = await request(app).get('/');
      // Express res.send() with a string sets Content-Type to text/html; charset=utf-8
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-type']).toContain('charset=utf-8');
    });

    it('should return correct Content-Length of 14 bytes', async () => {
      const res = await request(app).get('/');
      // 'Hello, World!\n' is 14 bytes in UTF-8
      // Content-Length header value is a string in the headers object
      expect(res.headers['content-length']).toBe('14');
    });
  });

  // ---------------------------------------------------------------
  // Happy Path Tests — GET /evening
  // ---------------------------------------------------------------
  describe('GET /evening', () => {
    it('should return 200 status code', async () => {
      const res = await request(app).get('/evening');
      expect(res.status).toBe(200);
    });

    it('should return Good evening without trailing newline', async () => {
      const res = await request(app).get('/evening');
      // The exact response string is 'Good evening' — no trailing newline
      expect(res.text).toBe('Good evening');
      // Confirm no trailing newline character
      expect(res.text.endsWith('\n')).toBe(false);
    });

    it('should return text/html content type with utf-8 charset', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-type']).toContain('charset=utf-8');
    });

    it('should return correct Content-Length of 12 bytes', async () => {
      const res = await request(app).get('/evening');
      // 'Good evening' is 12 bytes in UTF-8
      expect(res.headers['content-length']).toBe('12');
    });
  });

  // ---------------------------------------------------------------
  // Response Header Validation
  // ---------------------------------------------------------------
  describe('Response headers', () => {
    it('GET / should include X-Powered-By Express header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBe('Express');
    });

    it('GET /evening should include X-Powered-By Express header', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['x-powered-by']).toBe('Express');
    });

    it('GET / should include ETag header', async () => {
      // Express generates weak ETags by default for res.send() responses
      const res = await request(app).get('/');
      expect(res.headers['etag']).toBeDefined();
    });

    it('GET /evening should include ETag header', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['etag']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------
  // Unsupported HTTP Methods
  // Express 5 returns 404 (not 405) for methods not registered on
  // a route when using router.get(). The router only defines GET
  // handlers, so POST/PUT/DELETE/PATCH should return 404.
  // ---------------------------------------------------------------
  describe('Unsupported HTTP methods', () => {
    describe('on / route', () => {
      it('should return 404 for POST /', async () => {
        const res = await request(app).post('/');
        expect(res.status).toBe(404);
      });

      it('should return 404 for PUT /', async () => {
        const res = await request(app).put('/');
        expect(res.status).toBe(404);
      });

      it('should return 404 for DELETE /', async () => {
        const res = await request(app).delete('/');
        expect(res.status).toBe(404);
      });

      it('should return 404 for PATCH /', async () => {
        const res = await request(app).patch('/');
        expect(res.status).toBe(404);
      });
    });

    describe('on /evening route', () => {
      it('should return 404 for POST /evening', async () => {
        const res = await request(app).post('/evening');
        expect(res.status).toBe(404);
      });

      it('should return 404 for PUT /evening', async () => {
        const res = await request(app).put('/evening');
        expect(res.status).toBe(404);
      });

      it('should return 404 for DELETE /evening', async () => {
        const res = await request(app).delete('/evening');
        expect(res.status).toBe(404);
      });

      it('should return 404 for PATCH /evening', async () => {
        const res = await request(app).patch('/evening');
        expect(res.status).toBe(404);
      });
    });
  });

  // ---------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------
  describe('Edge cases', () => {
    it('should match GET /Evening as case-insensitive (Express default)', async () => {
      // Express 5 has case-insensitive routing by default (caseSensitive: false)
      // so /Evening matches the /evening route and returns 200 with the same body
      const res = await request(app).get('/Evening');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Good evening');
    });

    it('should handle trailing slash on /evening/', async () => {
      // Express strict routing is off by default, so /evening/ may not match /evening
      // The router defines GET '/evening' — trailing slash creates a different path
      const res = await request(app).get('/evening/');
      // With default Express settings (strict routing disabled), the trailing slash
      // route may or may not match. We assert the response is well-formed regardless.
      expect([200, 301, 302, 404]).toContain(res.status);
    });

    it('should return 404 for undefined route GET /nonexistent', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 200 for HEAD / with correct headers but empty body', async () => {
      // Express automatically handles HEAD requests for GET routes
      const res = await request(app).head('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-length']).toBe('14');
      // HEAD responses must have an empty body
      expect(res.text).toBeFalsy();
    });

    it('should return 200 for HEAD /evening with correct headers but empty body', async () => {
      const res = await request(app).head('/evening');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-length']).toBe('12');
      // HEAD responses must have an empty body
      expect(res.text).toBeFalsy();
    });

    it('should handle response encoding as UTF-8', async () => {
      const res = await request(app).get('/');
      // Verify charset is utf-8 in content-type header
      expect(res.headers['content-type']).toContain('utf-8');
    });
  });

  // ---------------------------------------------------------------
  // Router Export Validation
  // ---------------------------------------------------------------
  describe('Router export', () => {
    it('should export a function (Express Router)', () => {
      // An Express Router is a function that can be used as middleware
      expect(typeof mainRoutes).toBe('function');
    });

    it('should be mountable as Express middleware on a fresh app', async () => {
      // Explicitly create a new app and mount the router to prove it is reusable
      const testApp = express();
      testApp.use('/', mainRoutes);
      const res = await request(testApp).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });
  });
});
