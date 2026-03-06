/**
 * Route Endpoint Test Suite
 *
 * Verifies backward compatibility of existing endpoints after security
 * middleware integration. Both GET / and GET /evening must continue to
 * return their original responses with correct status codes.
 *
 * @module tests/routes.test
 */

'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Route Endpoints (Backward Compatibility)', () => {
  /**
   * GET / should return "Hello, World!\n" with HTTP 200 status.
   * This preserves the exact response from the original server.js.
   */
  it('GET / should return 200 with "Hello, World!\\n"', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  /**
   * GET /evening should return "Good evening" with HTTP 200 status.
   * This preserves the exact response from the original server.js.
   */
  it('GET /evening should return 200 with "Good evening"', async () => {
    const res = await request(app).get('/evening');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Good evening');
  });

  /**
   * Non-existent routes should return 404 status.
   */
  it('GET /nonexistent should return 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});
