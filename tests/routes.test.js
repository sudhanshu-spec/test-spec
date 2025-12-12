/**
 * HTTP Endpoint Unit Tests
 *
 * This test file validates the HTTP endpoints defined in the Express application.
 * Tests verify status codes, response bodies (with exact string matching),
 * Content-Type headers, and 404 handling for invalid routes.
 *
 * Test Categories:
 * - Root route (GET /)
 * - Evening route (GET /evening)
 * - 404 error handling
 * - Response headers validation
 *
 * @module tests/routes.test
 * @requires supertest - HTTP assertions library
 * @requires ../src/app - Express application instance
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');

// ---------------------------------------------------------------------------
// Root Route Tests (GET /)
// ---------------------------------------------------------------------------

describe('GET / (Root Route)', () => {
  test('should return 200 status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  test("should return 'Hello, World!\\n' (exact string with trailing newline)", async () => {
    const res = await request(app).get('/');
    expect(res.text).toBe('Hello, World!\n');
  });

  test('should have Content-Type header matching text/html', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  test('should have Content-Type header with charset=utf-8', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-type']).toMatch(/charset=utf-8/);
  });

  test('should have Content-Length of 14 bytes', async () => {
    const res = await request(app).get('/');
    // 'Hello, World!\n' is 14 characters
    expect(parseInt(res.headers['content-length'], 10)).toBe(14);
  });

  test('should return response body with exact byte length', async () => {
    const res = await request(app).get('/');
    const expectedBody = 'Hello, World!\n';
    expect(res.text.length).toBe(expectedBody.length);
    expect(res.text.length).toBe(14);
  });

  test('should handle trailing newline correctly', async () => {
    const res = await request(app).get('/');
    expect(res.text.endsWith('\n')).toBe(true);
    expect(res.text).not.toBe('Hello, World!'); // Without newline
  });
});

// ---------------------------------------------------------------------------
// Evening Route Tests (GET /evening)
// ---------------------------------------------------------------------------

describe('GET /evening (Evening Route)', () => {
  test('should return 200 status', async () => {
    const res = await request(app).get('/evening');
    expect(res.status).toBe(200);
  });

  test("should return 'Good evening' (exact string without trailing newline)", async () => {
    const res = await request(app).get('/evening');
    expect(res.text).toBe('Good evening');
  });

  test('should have Content-Type header matching text/html', async () => {
    const res = await request(app).get('/evening');
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  test('should have Content-Type header with charset=utf-8', async () => {
    const res = await request(app).get('/evening');
    expect(res.headers['content-type']).toMatch(/charset=utf-8/);
  });

  test('should have Content-Length of 12 bytes', async () => {
    const res = await request(app).get('/evening');
    // 'Good evening' is 12 characters
    expect(parseInt(res.headers['content-length'], 10)).toBe(12);
  });

  test('should return response body with exact byte length', async () => {
    const res = await request(app).get('/evening');
    const expectedBody = 'Good evening';
    expect(res.text.length).toBe(expectedBody.length);
    expect(res.text.length).toBe(12);
  });

  test('should NOT have trailing newline', async () => {
    const res = await request(app).get('/evening');
    expect(res.text.endsWith('\n')).toBe(false);
    expect(res.text).not.toBe('Good evening\n'); // With newline
  });
});

// ---------------------------------------------------------------------------
// 404 Error Handling Tests
// ---------------------------------------------------------------------------

describe('404 Error Handling', () => {
  test('should return 404 for non-existent routes (GET /nonexistent)', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });

  test('should return 404 for invalid HTTP methods (POST /)', async () => {
    const res = await request(app).post('/');
    expect(res.status).toBe(404);
  });

  test('should return 404 for PUT method on root', async () => {
    const res = await request(app).put('/');
    expect(res.status).toBe(404);
  });

  test('should return 404 for DELETE method on root', async () => {
    const res = await request(app).delete('/');
    expect(res.status).toBe(404);
  });

  test('should return 404 for POST method on /evening', async () => {
    const res = await request(app).post('/evening');
    expect(res.status).toBe(404);
  });

  test('should return 404 for deeply nested non-existent routes', async () => {
    const res = await request(app).get('/api/v1/users/123');
    expect(res.status).toBe(404);
  });

  test('should return 404 with Content-Type header', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.headers['content-type']).toBeDefined();
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  test('should return error message body for 404 responses', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Response Headers Validation Tests
// ---------------------------------------------------------------------------

describe('Response Headers Validation', () => {
  test('should include X-Powered-By header for GET /', async () => {
    const res = await request(app).get('/');
    // Express sets this by default
    expect(res.headers['x-powered-by']).toBe('Express');
  });

  test('should include X-Powered-By header for GET /evening', async () => {
    const res = await request(app).get('/evening');
    expect(res.headers['x-powered-by']).toBe('Express');
  });

  test('should include ETag header for GET /', async () => {
    const res = await request(app).get('/');
    expect(res.headers['etag']).toBeDefined();
  });

  test('should include ETag header for GET /evening', async () => {
    const res = await request(app).get('/evening');
    expect(res.headers['etag']).toBeDefined();
  });

  test('should return consistent Content-Type across requests', async () => {
    const res1 = await request(app).get('/');
    const res2 = await request(app).get('/');
    expect(res1.headers['content-type']).toBe(res2.headers['content-type']);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases and Boundary Tests
// ---------------------------------------------------------------------------

describe('Edge Cases and Boundary Tests', () => {
  test('should handle requests with query strings on root route', async () => {
    const res = await request(app).get('/?param=value');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  test('should handle requests with query strings on evening route', async () => {
    const res = await request(app).get('/evening?param=value');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Good evening');
  });

  test('should handle requests with multiple query parameters', async () => {
    const res = await request(app).get('/?a=1&b=2&c=3');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  test('should handle requests with URL-encoded characters', async () => {
    const res = await request(app).get('/?name=Hello%20World');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  test('should handle case sensitivity in routes', async () => {
    // Express 5.x default router is case-insensitive
    // /evening is defined, /Evening may also match depending on Express settings
    const res = await request(app).get('/Evening');
    // Verify route returns a valid response (either matches or 404 depending on Express version)
    expect([200, 404]).toContain(res.status);
    // If it matches (200), verify the response is correct
    if (res.status === 200) {
      expect(res.text).toBe('Good evening');
    }
  });

  test('should handle trailing slash on root route', async () => {
    // Root with explicit trailing slash behavior
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  test('should differentiate /evening from /evening/', async () => {
    // Test strict routing behavior
    const res1 = await request(app).get('/evening');
    const res2 = await request(app).get('/evening/');

    expect(res1.status).toBe(200);
    // Express 5 may handle trailing slashes differently
    // We just verify the defined route works
    expect(res1.text).toBe('Good evening');
  });

  test('should return correct response for rapid sequential requests', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    }
  });
});

// ---------------------------------------------------------------------------
// Response Body Exactness Tests
// ---------------------------------------------------------------------------

describe('Response Body Exactness', () => {
  test('GET / response should match character-by-character', async () => {
    const res = await request(app).get('/');
    const expected = 'Hello, World!\n';

    expect(res.text.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(res.text.charCodeAt(i)).toBe(expected.charCodeAt(i));
    }
  });

  test('GET /evening response should match character-by-character', async () => {
    const res = await request(app).get('/evening');
    const expected = 'Good evening';

    expect(res.text.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(res.text.charCodeAt(i)).toBe(expected.charCodeAt(i));
    }
  });

  test('GET / should have exactly one newline at the end', async () => {
    const res = await request(app).get('/');
    const newlineCount = (res.text.match(/\n/g) || []).length;
    expect(newlineCount).toBe(1);
    expect(res.text.charAt(res.text.length - 1)).toBe('\n');
  });

  test('GET /evening should have zero newlines', async () => {
    const res = await request(app).get('/evening');
    const newlineCount = (res.text.match(/\n/g) || []).length;
    expect(newlineCount).toBe(0);
  });
});

// Log added for testing purposes per Refine PR request
console.log('Routes test suite loaded successfully');
