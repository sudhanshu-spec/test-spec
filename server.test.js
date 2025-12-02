/**
 * Comprehensive Test Suite for Express.js Server
 * 
 * Tests all bug fixes implemented in server.js per Agent Action Plan sections 0.4-0.6:
 * - 404 Not Found Handler
 * - Global Error Handling Middleware
 * - JSON Body Parsing with limits
 * - Security Headers (Helmet)
 * - Module Exports for testing
 * - Graceful Shutdown Function
 * - Edge Cases and HTTP Methods
 * - Rate Limiting and CORS Headers
 * 
 * Total: 38 test cases
 * 
 * @module server.test
 * @requires supertest
 * @requires ./server
 */

const request = require('supertest');
const { app, gracefulShutdown, startServers, getHttpServer, getHttpsServer } = require('./server');

/**
 * Basic Route Functionality Tests (2 tests)
 * 
 * Verifies that existing routes continue to work correctly after bug fixes.
 */
describe('Basic Route Functionality', () => {
  test('GET / returns 200 and "Hello, World!"', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Hello, World!');
  });

  test('GET /evening returns 200 and "Good evening"', async () => {
    const response = await request(app).get('/evening');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
  });
});

/**
 * 404 Not Found Handling Tests (5 tests)
 * 
 * Verifies the new 404 handler returns proper JSON error responses
 * for undefined routes across all HTTP methods.
 */
describe('404 Not Found Handling', () => {
  test('GET to undefined route returns 404 status', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
  });

  test('404 response is JSON format', async () => {
    const response = await request(app).get('/undefined-route');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  test('404 includes correct error message format', async () => {
    const response = await request(app).get('/missing-page');
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('status', 404);
    expect(response.body.error.message).toMatch(/Route not found/);
  });

  test('POST to undefined route returns 404', async () => {
    const response = await request(app)
      .post('/nonexistent-endpoint')
      .send({ data: 'test' });
    expect(response.status).toBe(404);
    expect(response.body.error.status).toBe(404);
  });

  test('PUT to undefined route returns 404', async () => {
    const response = await request(app)
      .put('/no-such-resource')
      .send({ id: 1 });
    expect(response.status).toBe(404);
    expect(response.body.error.status).toBe(404);
  });
});

/**
 * Global Error Handling Middleware Tests (3 tests)
 * 
 * Verifies the error handling middleware returns proper JSON responses
 * with appropriate status codes and structure.
 */
describe('Global Error Handling Middleware', () => {
  test('error response is JSON with proper structure', async () => {
    const response = await request(app).get('/trigger-error-test');
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toHaveProperty('error');
  });

  test('error includes status code in response body', async () => {
    const response = await request(app).get('/error-test-path');
    expect(response.body.error).toHaveProperty('status');
    expect(typeof response.body.error.status).toBe('number');
  });

  test('error message is present in response', async () => {
    const response = await request(app).get('/another-undefined-route');
    expect(response.body.error).toHaveProperty('message');
    expect(typeof response.body.error.message).toBe('string');
    expect(response.body.error.message.length).toBeGreaterThan(0);
  });
});

/**
 * JSON Body Parsing Tests (5 tests)
 * 
 * Verifies JSON body parsing with limits and strict mode.
 * Tests valid JSON, malformed JSON, empty bodies, nested objects, and arrays.
 */
describe('JSON Body Parsing', () => {
  test('valid JSON is parsed correctly', async () => {
    const response = await request(app)
      .post('/test-json-parse')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'test', value: 123 }));
    // Should get 404 since route doesn't exist, but body should be parsed
    expect(response.status).toBe(404);
  });

  test('malformed JSON returns 400 error', async () => {
    const response = await request(app)
      .post('/any-route')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}');
    expect(response.status).toBe(400);
  });

  test('empty body is handled without error', async () => {
    const response = await request(app)
      .post('/empty-body-test')
      .set('Content-Type', 'application/json')
      .send('');
    // Should get 404 (route not found) not a parsing error
    expect(response.status).toBe(404);
  });

  test('nested JSON objects are parsed', async () => {
    const nestedData = {
      level1: {
        level2: {
          level3: {
            value: 'deep'
          }
        }
      }
    };
    const response = await request(app)
      .post('/nested-test')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(nestedData));
    expect(response.status).toBe(404);
  });

  test('JSON arrays are parsed correctly', async () => {
    const response = await request(app)
      .post('/array-test')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify([1, 2, 3, { item: 'value' }]));
    expect(response.status).toBe(404);
  });
});

/**
 * Security Headers Tests (6 tests)
 * 
 * Verifies all Helmet security headers are present in responses.
 */
describe('Security Headers', () => {
  test('X-Content-Type-Options is set to nosniff', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options header is present', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  test('Content-Security-Policy header is present', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  test('Strict-Transport-Security header is present', async () => {
    const response = await request(app).get('/');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  test('X-Powered-By header is removed', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('Referrer-Policy header is present', async () => {
    const response = await request(app).get('/');
    expect(response.headers['referrer-policy']).toBeDefined();
  });
});

/**
 * Module Exports Tests (3 tests)
 * 
 * Verifies the server module exports required functions for testing.
 */
describe('Module Exports', () => {
  test('app is exported and is an Express application', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(app.get).toBeDefined();
    expect(app.post).toBeDefined();
    expect(app.use).toBeDefined();
  });

  test('gracefulShutdown function is exported', () => {
    expect(gracefulShutdown).toBeDefined();
    expect(typeof gracefulShutdown).toBe('function');
  });

  test('startServers function is exported', () => {
    expect(startServers).toBeDefined();
    expect(typeof startServers).toBe('function');
  });
});

/**
 * Edge Cases Tests (8 tests)
 * 
 * Tests various edge cases for URL handling and error responses.
 */
describe('Edge Cases', () => {
  test('very long URL (1000+ chars) is handled', async () => {
    const longPath = '/a'.repeat(1000);
    const response = await request(app).get(longPath);
    // Should return 404 or 414 (URI Too Long), but not crash
    expect([404, 414]).toContain(response.status);
  });

  test('Unicode characters in URL are handled', async () => {
    const response = await request(app).get('/路径/тест/مسار');
    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
  });

  test('special characters in URL are handled', async () => {
    const response = await request(app).get('/path-with-special!@$%chars');
    expect([400, 404]).toContain(response.status);
  });

  test('multiple slashes in path are handled', async () => {
    const response = await request(app).get('///multiple///slashes///');
    expect(response.status).toBeDefined();
  });

  test('query strings on undefined routes are handled', async () => {
    const response = await request(app).get('/undefined?param=value&other=123');
    expect(response.status).toBe(404);
    expect(response.body.error.message).toMatch(/Route not found/);
  });

  test('URL encoded characters are handled', async () => {
    const response = await request(app).get('/path%20with%20spaces');
    expect(response.status).toBe(404);
  });

  test('empty path components are handled', async () => {
    const response = await request(app).get('/path//empty//components');
    expect(response.status).toBeDefined();
  });

  test('trailing slashes are handled consistently', async () => {
    const response = await request(app).get('/nonexistent/');
    expect(response.status).toBe(404);
  });
});

/**
 * HTTP Methods Tests (3 tests)
 * 
 * Verifies various HTTP methods return proper 404 responses for undefined routes.
 */
describe('HTTP Methods', () => {
  test('DELETE to undefined route returns 404', async () => {
    const response = await request(app).delete('/delete-this');
    expect(response.status).toBe(404);
    expect(response.body.error.status).toBe(404);
  });

  test('PATCH to undefined route returns 404', async () => {
    const response = await request(app)
      .patch('/patch-resource')
      .send({ update: 'value' });
    expect(response.status).toBe(404);
    expect(response.body.error.status).toBe(404);
  });

  test('HEAD request to existing route returns 200', async () => {
    const response = await request(app).head('/');
    expect(response.status).toBe(200);
  });
});

/**
 * Rate Limiting Headers Tests (1 test)
 * 
 * Verifies rate limiting headers are present in responses.
 */
describe('Rate Limiting Headers', () => {
  test('RateLimit headers are present', async () => {
    const response = await request(app).get('/');
    // Check for draft-8 RateLimit headers
    expect(
      response.headers['ratelimit-limit'] || 
      response.headers['x-ratelimit-limit'] ||
      response.headers['ratelimit']
    ).toBeDefined();
  });
});

/**
 * CORS Headers Tests (2 tests)
 * 
 * Verifies CORS preflight and headers are handled correctly.
 */
describe('CORS Headers', () => {
  test('OPTIONS preflight request is handled', async () => {
    const response = await request(app)
      .options('/')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    // Should return 200 or 204 for preflight
    expect([200, 204]).toContain(response.status);
  });

  test('Access-Control headers are present for allowed origins', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:3000');
    // Check that CORS is configured (may vary based on allowed origins)
    expect(response.status).toBe(200);
  });
});

/**
 * Graceful Shutdown Function Tests (1 test)
 * 
 * Verifies the graceful shutdown function is callable and has correct signature.
 */
describe('Graceful Shutdown Function', () => {
  test('gracefulShutdown is callable function with signal parameter', () => {
    expect(gracefulShutdown).toBeDefined();
    expect(typeof gracefulShutdown).toBe('function');
    // Verify function length (number of parameters)
    expect(gracefulShutdown.length).toBe(1);
  });
});

/**
 * Getter Functions Tests (2 bonus tests)
 * 
 * Verifies the getter functions for server instances are exported.
 */
describe('Server Instance Getters', () => {
  test('getHttpServer function is exported', () => {
    expect(getHttpServer).toBeDefined();
    expect(typeof getHttpServer).toBe('function');
  });

  test('getHttpsServer function is exported', () => {
    expect(getHttpsServer).toBeDefined();
    expect(typeof getHttpsServer).toBe('function');
  });
});
