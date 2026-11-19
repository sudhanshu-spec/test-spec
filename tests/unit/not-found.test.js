/**
 * @fileoverview Unit tests for the API not-found middleware (src/middleware/not-found.js)
 * @module tests/unit/not-found
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { notFound } = require('../../src/middleware/not-found');

/**
 * The contract code an unmatched path under the API mount point is answered
 * with.
 * @type {string}
 */
const ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND';

/** The HTTP status the contract pairs with {@link ROUTE_NOT_FOUND}. @type {number} */
const NOT_FOUND_STATUS = 404;

/**
 * Builds a throwaway application that mounts the middleware the way the
 * application factory does — `app.use('/api', notFound)` — with one real API
 * route registered ahead of it so a matched path is proven to pass through
 * untouched, and no route at the application root so the mount scoping is
 * observable.
 *
 * @returns {import('express').Express} Configured Express application.
 */
function buildApp() {
  const app = express();

  app.get('/api/categories', (req, res) => res.json({ categories: [] }));
  app.use('/api', notFound);

  return app;
}

describe('API Not-Found Middleware - not-found.js', () => {
  describe('mounted at the API mount point', () => {
    test.each([['/api/anything'], ['/api/anything/deeper']])(
      'answers the unmatched path %s with 404 and the ROUTE_NOT_FOUND envelope',
      async path => {
        const response = await request(buildApp()).get(path);

        expect(response.status).toBe(NOT_FOUND_STATUS);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(Object.keys(response.body)).toEqual(['error']);
        expect(response.body.error.code).toBe(ROUTE_NOT_FOUND);
        expect(typeof response.body.error.message).toBe('string');
        expect(response.body.error.message.length).toBeGreaterThan(0);
      }
    );

    test('writes exactly the code and message, since details belong only to validation failures', async () => {
      const response = await request(buildApp()).get('/api/anything');

      expect(Object.keys(response.body.error).sort()).toEqual(['code', 'message']);
      expect(response.body.error).not.toHaveProperty('details');
    });

    test('keeps the message free of request-derived text, so nothing the caller sent is echoed back', async () => {
      const first = await request(buildApp()).get('/api/anything');
      const second = await request(buildApp()).get('/api/secret-token-xyz/deeper');

      expect(second.body.error.message).toBe(first.body.error.message);
      expect(first.body.error.message).not.toContain('anything');
      expect(second.body.error.message).not.toContain('secret-token-xyz');
    });

    test('leaves a matched API route untouched, answering it instead of 404', async () => {
      const response = await request(buildApp()).get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ categories: [] });
    });

    test('never handles a path outside the API mount point, which keeps Express\'s own 404', async () => {
      const response = await request(buildApp()).get('/not-api');

      expect(response.status).toBe(NOT_FOUND_STATUS);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).not.toContain(ROUTE_NOT_FOUND);
    });
  });

  describe('called directly', () => {
    test('sets status 404, writes the envelope and never invokes next', () => {
      const req = { method: 'GET', originalUrl: '/api/anything', path: '/api/anything' };
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status };
      const next = jest.fn();

      notFound(req, res, next);

      expect(status).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(NOT_FOUND_STATUS);
      expect(json).toHaveBeenCalledTimes(1);

      const [body] = json.mock.calls[0];

      expect(Object.keys(body)).toEqual(['error']);
      expect(Object.keys(body.error).sort()).toEqual(['code', 'message']);
      expect(body.error.code).toBe(ROUTE_NOT_FOUND);
      expect(typeof body.error.message).toBe('string');
      expect(body.error.message.length).toBeGreaterThan(0);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
