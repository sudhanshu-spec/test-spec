/**
 * tests/unit/routes.test.js - Route Edge Case Tests for Express.js Server
 * 
 * This test file contains comprehensive edge case tests for the Express.js
 * server routes. Tests cover boundary conditions including invalid HTTP methods,
 * query parameter handling, trailing slash variations, path case sensitivity,
 * and various URL encoding scenarios.
 * 
 * Uses Jest as the testing framework and Supertest for HTTP assertions,
 * allowing tests to run against the Express app without starting the server.
 * 
 * Test Coverage:
 *   - Invalid HTTP methods (POST, PUT, DELETE, PATCH) on defined routes
 *   - Query parameter handling (single, multiple, empty, encoded)
 *   - Trailing slash variations
 *   - Path case sensitivity behavior
 *   - URL encoding and special characters
 *   - Response encoding verification
 */

const request = require('supertest');
const app = require('../../app');

/**
 * Test suite for invalid HTTP methods on GET '/' route
 * 
 * Verifies that the root endpoint properly rejects HTTP methods other than GET.
 * Express returns 404 for undefined method/route combinations by default
 * because no handler is registered for those method/path combinations.
 */
describe('Invalid methods on /', () => {
  /**
   * Test: POST method should be rejected
   * POST to '/' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for POST /', async () => {
    const response = await request(app).post('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PUT method should be rejected
   * PUT to '/' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for PUT /', async () => {
    const response = await request(app).put('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: DELETE method should be rejected
   * DELETE to '/' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for DELETE /', async () => {
    const response = await request(app).delete('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PATCH method should be rejected
   * PATCH to '/' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for PATCH /', async () => {
    const response = await request(app).patch('/');
    expect(response.status).toBe(404);
  });

  /**
   * Test: HEAD method on '/'
   * HEAD is implicitly supported for GET routes (returns headers only)
   */
  it('should return 200 for HEAD / (implicit support for GET routes)', async () => {
    const response = await request(app).head('/');
    expect(response.status).toBe(200);
    // HEAD returns no body
    expect(response.text).toBe('');
  });

  /**
   * Test: OPTIONS method behavior
   * OPTIONS is used for CORS preflight and returns allowed methods
   */
  it('should handle OPTIONS / request', async () => {
    const response = await request(app).options('/');
    // Express handles OPTIONS with Allow header when no explicit handler
    expect([200, 204, 404]).toContain(response.status);
  });
});

/**
 * Test suite for invalid HTTP methods on GET '/evening' route
 * 
 * Verifies that the /evening endpoint properly rejects HTTP methods other than GET.
 * Express returns 404 for undefined method/route combinations by default.
 */
describe('Invalid methods on /evening', () => {
  /**
   * Test: POST method should be rejected
   * POST to '/evening' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for POST /evening', async () => {
    const response = await request(app).post('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PUT method should be rejected
   * PUT to '/evening' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for PUT /evening', async () => {
    const response = await request(app).put('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: DELETE method should be rejected
   * DELETE to '/evening' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for DELETE /evening', async () => {
    const response = await request(app).delete('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: PATCH method should be rejected
   * PATCH to '/evening' is not defined in the app, so Express returns 404.
   */
  it('should return 404 for PATCH /evening', async () => {
    const response = await request(app).patch('/evening');
    expect(response.status).toBe(404);
  });

  /**
   * Test: HEAD method on '/evening'
   * HEAD is implicitly supported for GET routes (returns headers only)
   */
  it('should return 200 for HEAD /evening (implicit support for GET routes)', async () => {
    const response = await request(app).head('/evening');
    expect(response.status).toBe(200);
    // HEAD returns no body
    expect(response.text).toBe('');
  });

  /**
   * Test: OPTIONS method behavior
   * OPTIONS is used for CORS preflight and returns allowed methods
   */
  it('should handle OPTIONS /evening request', async () => {
    const response = await request(app).options('/evening');
    // Express handles OPTIONS with Allow header when no explicit handler
    expect([200, 204, 404]).toContain(response.status);
  });
});

/**
 * Test suite for path edge cases - Query Parameters
 * 
 * Verifies proper handling of query parameters on defined routes.
 * Query parameters should not affect route matching.
 */
describe('Path edge cases - Query Parameters', () => {
  /**
   * Test: Single query parameter on GET /
   * Route should still return correct response when query parameters are provided.
   */
  it('should handle single query parameter on GET / and return correct response', async () => {
    const response = await request(app).get('/?foo=bar');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Multiple query parameters on GET /
   * Route should still return correct response when multiple query parameters are provided.
   */
  it('should handle multiple query parameters on GET /', async () => {
    const response = await request(app).get('/?foo=bar&baz=qux&param=value');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Query parameters on GET /evening
   * Route should still return correct response when query parameters are provided.
   */
  it('should handle query parameters on GET /evening and return correct response', async () => {
    const response = await request(app).get('/evening?name=user');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Multiple query parameters on GET /evening
   * Route should handle multiple query parameters correctly.
   */
  it('should handle multiple query parameters on GET /evening', async () => {
    const response = await request(app).get('/evening?name=user&time=now&format=text');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Empty query string
   * Route should handle empty query string (just ?) correctly.
   */
  it('should handle empty query string on GET /', async () => {
    const response = await request(app).get('/?');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Empty query string on /evening
   * Route should handle empty query string correctly.
   */
  it('should handle empty query string on GET /evening', async () => {
    const response = await request(app).get('/evening?');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Query parameter with empty value
   * Route should handle query parameters with empty values.
   */
  it('should handle query parameter with empty value on GET /', async () => {
    const response = await request(app).get('/?key=');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Query parameter without value (flag style)
   * Route should handle query parameters without values (flag-style).
   */
  it('should handle flag-style query parameter on GET /', async () => {
    const response = await request(app).get('/?debug');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });
});

/**
 * Test suite for trailing slash handling
 * 
 * Verifies how the server handles trailing slashes on routes.
 * By default, Express treats routes as strict (no trailing slash matching).
 */
describe('Path edge cases - Trailing Slashes', () => {
  /**
   * Test: Root route without trailing slash
   * The defined route GET '/' should work without trailing slash issues.
   */
  it('should handle GET / without trailing slash (standard root)', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: /evening with trailing slash
   * By default Express strict routing means /evening/ is different from /evening.
   * This tests the actual behavior of the server.
   */
  it('should handle GET /evening/ with trailing slash', async () => {
    const response = await request(app).get('/evening/');
    // Express strict routing: /evening/ may or may not match /evening
    // We verify the server handles it gracefully (either 200 or 404/301)
    expect([200, 301, 302, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.text).toBe('Good evening');
    }
  });

  /**
   * Test: Double slash at root
   * Verifies behavior with double slashes which could indicate path issues.
   */
  it('should handle double slash // in path', async () => {
    const response = await request(app).get('//');
    // Double slash may be normalized or treated as different path
    expect([200, 404]).toContain(response.status);
  });

  /**
   * Test: Path with multiple trailing slashes
   * Verifies handling of paths with multiple trailing slashes.
   */
  it('should handle multiple trailing slashes on /evening', async () => {
    const response = await request(app).get('/evening//');
    // Multiple slashes may be normalized or return 404
    expect([200, 404]).toContain(response.status);
  });

  /**
   * Test: Path with internal double slash
   * Verifies handling of paths with double slashes in the middle.
   */
  it('should handle path with internal double slash', async () => {
    const response = await request(app).get('/even//ing');
    // This is not a defined route
    expect(response.status).toBe(404);
  });
});

/**
 * Test suite for case sensitivity behavior
 * 
 * Tests how the server handles different case variations in paths.
 * Express routing is case-sensitive by default.
 */
describe('Path edge cases - Case Sensitivity', () => {
  /**
   * Test: Uppercase path /EVENING
   * Express has case-sensitive routing by default, but this behavior
   * can be affected by Express version and configuration.
   */
  it('should handle uppercase path /EVENING', async () => {
    const response = await request(app).get('/EVENING');
    // Case sensitivity depends on Express configuration
    // We test that the server handles it gracefully
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.text).toBe('Good evening');
    }
  });

  /**
   * Test: Mixed case path /Evening
   * Tests mixed case variation of the route.
   */
  it('should handle mixed case path /Evening', async () => {
    const response = await request(app).get('/Evening');
    // Case sensitivity depends on Express configuration
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.text).toBe('Good evening');
    }
  });

  /**
   * Test: Mixed case path /EVENING with query params
   * Tests case sensitivity with query parameters added.
   */
  it('should handle mixed case path /EVENING with query params', async () => {
    const response = await request(app).get('/EVENING?test=value');
    // Case sensitivity depends on Express configuration
    expect([200, 404]).toContain(response.status);
  });

  /**
   * Test: Root path is always just /
   * The root path should always work regardless of case sensitivity settings.
   */
  it('should always match root path /', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });
});

/**
 * Test suite for URL encoding and special characters
 * 
 * Verifies handling of URL-encoded characters and special characters
 * in query parameters and paths.
 */
describe('Path edge cases - URL Encoding', () => {
  /**
   * Test: URL encoded space in query parameter
   * Route should handle %20 (space) in query parameters.
   */
  it('should handle URL encoded space in query parameters', async () => {
    const response = await request(app).get('/?message=Hello%20World');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Plus sign as space in query parameter
   * Route should handle + (plus sign representing space) in query parameters.
   */
  it('should handle plus sign as space in query parameters', async () => {
    const response = await request(app).get('/?message=Hello+World');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: URL encoded special characters
   * Route should handle various URL encoded special characters.
   */
  it('should handle URL encoded special characters in query parameters', async () => {
    const response = await request(app).get('/evening?data=%21%40%23%24%25');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: URL encoded emoji
   * Route should handle URL encoded emoji characters.
   */
  it('should handle URL encoded emoji in query parameters', async () => {
    const response = await request(app).get('/evening?emoji=%F0%9F%98%80');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: URL encoded ampersand in parameter value
   * Route should handle %26 (ampersand) in query parameter values.
   */
  it('should handle URL encoded ampersand in query parameter value', async () => {
    const response = await request(app).get('/?company=Ben%26Jerry');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: URL encoded equals sign in parameter value
   * Route should handle %3D (equals) in query parameter values.
   */
  it('should handle URL encoded equals sign in query parameter value', async () => {
    const response = await request(app).get('/?equation=2%2B2%3D4');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Unicode characters in query parameters
   * Route should handle unicode characters.
   */
  it('should handle unicode characters in query parameters', async () => {
    const response = await request(app).get('/evening?greeting=%E4%BD%A0%E5%A5%BD');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });
});

/**
 * Test suite for response encoding verification
 * 
 * Verifies that responses are properly encoded with correct headers.
 */
describe('Response encoding', () => {
  /**
   * Test: Content-Type header includes charset for GET /
   * Verifies the Content-Type header includes charset=utf-8.
   */
  it('should return response with charset in Content-Type for GET /', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
  });

  /**
   * Test: Content-Type header includes charset for GET /evening
   * Verifies the Content-Type header includes charset=utf-8.
   */
  it('should return response with charset in Content-Type for GET /evening', async () => {
    const response = await request(app).get('/evening');
    expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
  });

  /**
   * Test: Content-Type indicates text/html for GET /
   * Express res.send() defaults to text/html content type.
   */
  it('should return text/html Content-Type for GET /', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  /**
   * Test: Content-Type indicates text/html for GET /evening
   * Express res.send() defaults to text/html content type.
   */
  it('should return text/html Content-Type for GET /evening', async () => {
    const response = await request(app).get('/evening');
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  /**
   * Test: Response body byte length for GET /
   * Verifies that the response body has correct byte length (14 bytes for "Hello, World!\n").
   */
  it('should return response body with correct byte length for GET /', async () => {
    const response = await request(app).get('/');
    expect(typeof response.text).toBe('string');
    expect(Buffer.byteLength(response.text, 'utf8')).toBe(14);
  });

  /**
   * Test: Response body byte length for GET /evening
   * Verifies that the response body has correct byte length (12 bytes for "Good evening").
   */
  it('should return response body with correct byte length for GET /evening', async () => {
    const response = await request(app).get('/evening');
    expect(typeof response.text).toBe('string');
    expect(Buffer.byteLength(response.text, 'utf8')).toBe(12);
  });

  /**
   * Test: Content-Length header present
   * Verifies that Content-Length header is set correctly.
   */
  it('should include Content-Length header for GET /', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-length']).toBeDefined();
    expect(parseInt(response.headers['content-length'], 10)).toBe(14);
  });

  /**
   * Test: Content-Length header for /evening
   * Verifies that Content-Length header is set correctly.
   */
  it('should include Content-Length header for GET /evening', async () => {
    const response = await request(app).get('/evening');
    expect(response.headers['content-length']).toBeDefined();
    expect(parseInt(response.headers['content-length'], 10)).toBe(12);
  });
});

/**
 * Test suite for request body handling on GET routes
 * 
 * GET requests typically shouldn't have bodies, but we verify
 * the server handles various scenarios gracefully.
 */
describe('Request handling edge cases', () => {
  /**
   * Test: GET request with request body (unusual but possible)
   * Server should ignore request body for GET requests.
   */
  it('should ignore request body for GET /', async () => {
    const response = await request(app)
      .get('/')
      .send({ data: 'should be ignored' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: GET request with request body for /evening
   * Server should ignore request body for GET requests.
   */
  it('should ignore request body for GET /evening', async () => {
    const response = await request(app)
      .get('/evening')
      .send({ data: 'should be ignored' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });

  /**
   * Test: Request with custom headers
   * Server should accept requests with custom headers.
   */
  it('should accept custom headers on GET /', async () => {
    const response = await request(app)
      .get('/')
      .set('X-Custom-Header', 'custom-value')
      .set('X-Another-Header', 'another-value');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Request with Accept header
   * Server should respond regardless of Accept header.
   */
  it('should respond regardless of Accept header', async () => {
    const response = await request(app)
      .get('/')
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
  });

  /**
   * Test: Request with User-Agent header
   * Server should respond with various User-Agent headers.
   */
  it('should respond with various User-Agent headers', async () => {
    const response = await request(app)
      .get('/evening')
      .set('User-Agent', 'TestBot/1.0');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });
});
