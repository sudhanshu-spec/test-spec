/**
 * Express Application Integration Tests
 *
 * This test file validates the Express application factory pattern and
 * integration behavior. Tests ensure the Express app is properly configured,
 * routes are correctly mounted, and the middleware chain processes requests.
 *
 * Test Categories:
 * - Express app export validation
 * - Route mounting verification
 * - Integration validation
 * - Factory pattern verification
 *
 * @module tests/app.test
 * @requires supertest - HTTP assertions library
 * @requires ../src/app - Express application instance
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');
const { resetModules } = require('./helpers/test-utils');

// ---------------------------------------------------------------------------
// Express App Export Tests
// ---------------------------------------------------------------------------

describe('Express Application Export', () => {
  test('should export a function (Express app)', () => {
    expect(typeof app).toBe('function');
  });

  test('should have app.get method defined', () => {
    expect(typeof app.get).toBe('function');
  });

  test('should have app.use method defined', () => {
    expect(typeof app.use).toBe('function');
  });

  test('should have app.listen method defined', () => {
    expect(typeof app.listen).toBe('function');
  });

  test('should have app.post method defined', () => {
    expect(typeof app.post).toBe('function');
  });

  test('should be callable as middleware', () => {
    // Express apps are functions that can be used as middleware
    expect(app.length).toBe(3); // (req, res, next) signature
  });
});

// ---------------------------------------------------------------------------
// Route Mounting Tests
// ---------------------------------------------------------------------------

describe('Route Mounting', () => {
  test('should respond to GET / request', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  test('should respond to GET /evening request', async () => {
    const res = await request(app).get('/evening');
    expect(res.status).toBe(200);
  });

  test('should return 404 for unmounted routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });

  test('should return 404 for invalid routes with POST method', async () => {
    const res = await request(app).post('/');
    expect(res.status).toBe(404);
  });

  test('should return 404 for deep unmounted paths', async () => {
    const res = await request(app).get('/some/deep/path');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Integration Validation Tests
// ---------------------------------------------------------------------------

describe('Integration Validation', () => {
  test('should process requests through middleware chain', async () => {
    const res = await request(app).get('/');
    // Verify response is complete and processed
    expect(res.status).toBe(200);
    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
  });

  test('should set appropriate response headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers).toBeDefined();
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  test('should handle multiple concurrent requests', async () => {
    const requests = [
      request(app).get('/'),
      request(app).get('/evening'),
      request(app).get('/'),
      request(app).get('/evening')
    ];

    const responses = await Promise.all(requests);

    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // Verify correct responses for each route
    expect(responses[0].text).toBe('Hello, World!\n');
    expect(responses[1].text).toBe('Good evening');
    expect(responses[2].text).toBe('Hello, World!\n');
    expect(responses[3].text).toBe('Good evening');
  });

  test('should handle requests with query parameters', async () => {
    const res = await request(app).get('/?foo=bar');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  test('should handle requests with headers', async () => {
    const res = await request(app)
      .get('/')
      .set('Accept', 'text/html')
      .set('X-Custom-Header', 'test');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });
});

// ---------------------------------------------------------------------------
// Factory Pattern Validation Tests
// ---------------------------------------------------------------------------

describe('Factory Pattern Validation', () => {
  test('app can be imported multiple times (module caching)', () => {
    const app1 = require('../src/app');
    const app2 = require('../src/app');
    expect(app1).toBeDefined();
    expect(app2).toBeDefined();
  });

  test('app is the same instance across imports', () => {
    const app1 = require('../src/app');
    const app2 = require('../src/app');
    expect(app1).toBe(app2);
  });

  test('routes remain registered after multiple imports', async () => {
    const app1 = require('../src/app');
    const res = await request(app1).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  test('app instance maintains state across requests', async () => {
    const firstRes = await request(app).get('/');
    const secondRes = await request(app).get('/evening');

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);
    expect(firstRes.text).toBe('Hello, World!\n');
    expect(secondRes.text).toBe('Good evening');
  });

  test('fresh import after resetModules returns working app', () => {
    // Use resetModules to clear module cache and get fresh import
    resetModules();
    
    // After reset, require returns fresh module evaluation
    const freshApp = require('../src/app');
    
    // Fresh app should still be a valid Express instance
    expect(typeof freshApp).toBe('function');
    expect(typeof freshApp.get).toBe('function');
    expect(typeof freshApp.use).toBe('function');
    expect(typeof freshApp.listen).toBe('function');
  });

  test('fresh import after resetModules has routes registered', async () => {
    // Clear module cache to ensure fresh import
    resetModules();
    
    // Import fresh app instance
    const freshApp = require('../src/app');
    
    // Routes should still be mounted on fresh import
    const rootRes = await request(freshApp).get('/');
    expect(rootRes.status).toBe(200);
    expect(rootRes.text).toBe('Hello, World!\n');
    
    const eveningRes = await request(freshApp).get('/evening');
    expect(eveningRes.status).toBe(200);
    expect(eveningRes.text).toBe('Good evening');
  });
});

// ---------------------------------------------------------------------------
// Error Handling Tests
// ---------------------------------------------------------------------------

describe('Error Handling', () => {
  test('should handle requests without crashing', async () => {
    // Send multiple types of requests to verify stability
    const responses = await Promise.all([
      request(app).get('/'),
      request(app).get('/evening'),
      request(app).get('/notfound'),
      request(app).post('/'),
      request(app).put('/'),
      request(app).delete('/')
    ]);

    // All should return some status without crashing
    responses.forEach((res) => {
      expect(typeof res.status).toBe('number');
    });
  });

  test('should return proper error for unsupported methods', async () => {
    const res = await request(app).patch('/');
    expect(res.status).toBe(404);
  });
});
