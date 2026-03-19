'use strict';

const request = require('supertest');
const app = require('../src/app');

/**
 * HTTP Integration Tests for Express Application (src/app.js)
 *
 * Tests exercise the full Express middleware and routing stack via supertest
 * without port binding. The app exports a configured Express instance with
 * two GET routes mounted at root:
 *   GET /        → 'Hello, World!\n'  (14 bytes, trailing newline)
 *   GET /evening → 'Good evening'     (12 bytes, no trailing newline)
 *
 * Test categories:
 *   - Happy path: response bodies, status codes, content types, content lengths
 *   - Response headers: X-Powered-By, ETag, Content-Type, Content-Length
 *   - Error handling: 404 for undefined routes
 *   - Unsupported HTTP methods: POST, PUT, DELETE, PATCH on GET-only routes
 *   - HEAD requests: auto-handled by Express for GET routes
 *   - Edge cases: case sensitivity, trailing slashes, long URLs, concurrent requests
 */
describe('Express Application (src/app.js)', () => {

  // ─── Happy Path: GET / ──────────────────────────────────────────────────────

  describe('GET /', () => {
    it('should return 200 status code', async () => {
      await request(app).get('/').expect(200);
    });

    it('should return Hello, World! with trailing newline', async () => {
      const res = await request(app).get('/');
      expect(res.text).toBe('Hello, World!\n');
    });

    it('should return response body that is exactly 14 bytes', async () => {
      const res = await request(app).get('/');
      expect(Buffer.byteLength(res.text, 'utf8')).toBe(14);
    });

    it('should return correct Content-Type header as text/html', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-type']).toMatch(/charset=utf-8/);
    });

    it('should return correct Content-Length header of 14', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-length']).toBe('14');
    });
  });

  // ─── Happy Path: GET /evening ───────────────────────────────────────────────

  describe('GET /evening', () => {
    it('should return 200 status code', async () => {
      await request(app).get('/evening').expect(200);
    });

    it('should return Good evening without trailing newline', async () => {
      const res = await request(app).get('/evening');
      expect(res.text).toBe('Good evening');
    });

    it('should return response body that is exactly 12 bytes', async () => {
      const res = await request(app).get('/evening');
      expect(Buffer.byteLength(res.text, 'utf8')).toBe(12);
    });

    it('should return correct Content-Type header as text/html', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-type']).toMatch(/charset=utf-8/);
    });

    it('should return correct Content-Length header of 12', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['content-length']).toBe('12');
    });
  });

  // ─── Response Headers ───────────────────────────────────────────────────────

  describe('Response headers', () => {
    it('should include X-Powered-By header set to Express on GET /', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBe('Express');
    });

    it('should include X-Powered-By header set to Express on GET /evening', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['x-powered-by']).toBe('Express');
    });

    it('should include ETag header on GET /', async () => {
      const res = await request(app).get('/');
      expect(res.headers['etag']).toBeDefined();
      expect(res.headers['etag']).toMatch(/^W\//);
    });

    it('should include ETag header on GET /evening', async () => {
      const res = await request(app).get('/evening');
      expect(res.headers['etag']).toBeDefined();
      expect(res.headers['etag']).toMatch(/^W\//);
    });

    it('should include Date header on responses', async () => {
      const res = await request(app).get('/');
      expect(res.headers['date']).toBeDefined();
    });

    it('should include Connection header on responses', async () => {
      const res = await request(app).get('/');
      expect(res.headers['connection']).toBeDefined();
    });
  });

  // ─── Undefined Routes (404) ─────────────────────────────────────────────────

  describe('Undefined routes (404)', () => {
    it('should return 404 for GET /nonexistent', async () => {
      await request(app).get('/nonexistent').expect(404);
    });

    it('should return 404 for GET /api/unknown', async () => {
      await request(app).get('/api/unknown').expect(404);
    });

    it('should return 404 with HTML response body for undefined route', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.text).toBeTruthy();
      expect(res.text.length).toBeGreaterThan(0);
    });

    it('should return 404 for GET /foo/bar/baz', async () => {
      await request(app).get('/foo/bar/baz').expect(404);
    });
  });

  // ─── Unsupported HTTP Methods ───────────────────────────────────────────────

  describe('Unsupported HTTP methods', () => {
    describe('on / root route', () => {
      it('should return 404 for POST /', async () => {
        await request(app).post('/').expect(404);
      });

      it('should return 404 for PUT /', async () => {
        await request(app).put('/').expect(404);
      });

      it('should return 404 for DELETE /', async () => {
        await request(app).delete('/').expect(404);
      });

      it('should return 404 for PATCH /', async () => {
        await request(app).patch('/').expect(404);
      });
    });

    describe('on /evening route', () => {
      it('should return 404 for POST /evening', async () => {
        await request(app).post('/evening').expect(404);
      });

      it('should return 404 for PUT /evening', async () => {
        await request(app).put('/evening').expect(404);
      });

      it('should return 404 for DELETE /evening', async () => {
        await request(app).delete('/evening').expect(404);
      });

      it('should return 404 for PATCH /evening', async () => {
        await request(app).patch('/evening').expect(404);
      });
    });
  });

  // ─── HEAD Requests ──────────────────────────────────────────────────────────

  describe('HEAD requests', () => {
    it('should return 200 for HEAD / with empty body', async () => {
      const res = await request(app).head('/');
      expect(res.status).toBe(200);
      expect(res.text).toBeFalsy();
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-length']).toBe('14');
    });

    it('should return 200 for HEAD /evening with empty body', async () => {
      const res = await request(app).head('/evening');
      expect(res.status).toBe(200);
      expect(res.text).toBeFalsy();
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-length']).toBe('12');
    });

    it('should include X-Powered-By header on HEAD /', async () => {
      const res = await request(app).head('/');
      expect(res.headers['x-powered-by']).toBe('Express');
    });

    it('should include ETag header on HEAD /', async () => {
      const res = await request(app).head('/');
      expect(res.headers['etag']).toBeDefined();
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('should handle case-insensitive route matching for /Evening', async () => {
      // Express 5 defaults to case-insensitive routing
      const res = await request(app).get('/Evening');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Good evening');
    });

    it('should handle case-insensitive route matching for /EVENING', async () => {
      const res = await request(app).get('/EVENING');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Good evening');
    });

    it('should handle trailing slash on /evening/ route', async () => {
      // Express 5 defaults to non-strict routing (trailing slashes tolerated)
      const res = await request(app).get('/evening/');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Good evening');
    });

    it('should return 404 for deeply nested undefined path', async () => {
      await request(app).get('/a/b/c/d/e/f/g').expect(404);
    });

    it('should return 404 for URL-encoded special characters in path', async () => {
      const res = await request(app).get('/hello%20world');
      expect(res.status).toBe(404);
    });

    it('should handle very long URL path gracefully', async () => {
      const longPath = '/' + 'a'.repeat(4000);
      const res = await request(app).get(longPath);
      // Express handles long paths with 404; extremely long may yield 414
      expect([404, 414]).toContain(res.status);
    });

    it('should handle concurrent requests successfully', async () => {
      const promises = Array.from({ length: 10 }, () => request(app).get('/'));
      const responses = await Promise.all(promises);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.text).toBe('Hello, World!\n');
      });
    });

    it('should handle concurrent requests to different routes', async () => {
      const rootPromises = Array.from({ length: 5 }, () => request(app).get('/'));
      const eveningPromises = Array.from({ length: 5 }, () =>
        request(app).get('/evening')
      );
      const responses = await Promise.all([...rootPromises, ...eveningPromises]);
      responses.slice(0, 5).forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.text).toBe('Hello, World!\n');
      });
      responses.slice(5).forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.text).toBe('Good evening');
      });
    });

    it('should return 404 for path with query string on undefined route', async () => {
      const res = await request(app).get('/nonexistent?key=value');
      expect(res.status).toBe(404);
    });

    it('should handle request with query string on valid route', async () => {
      const res = await request(app).get('/?key=value');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });

    it('should handle request with query string on /evening route', async () => {
      const res = await request(app).get('/evening?time=now');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Good evening');
    });

    it('should return 404 for path with fragment-like characters', async () => {
      const res = await request(app).get('/test%23fragment');
      expect(res.status).toBe(404);
    });

    it('should return consistent ETag values for identical requests', async () => {
      const res1 = await request(app).get('/');
      const res2 = await request(app).get('/');
      expect(res1.headers['etag']).toBe(res2.headers['etag']);
    });

    it('should return different ETag values for different routes', async () => {
      const res1 = await request(app).get('/');
      const res2 = await request(app).get('/evening');
      expect(res1.headers['etag']).not.toBe(res2.headers['etag']);
    });
  });
});
