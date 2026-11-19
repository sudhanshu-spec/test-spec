/**
 * @fileoverview Integration tests for the API error-handler middleware, which
 * is the single writer of the error envelope. Each branch of the handler is
 * asserted through a real Express pipeline, so the envelope is proven as it is
 * mounted under `/api` rather than only in isolation; the already-started
 * branch is also invoked directly, since the HTTP outcome alone cannot show
 * whether the handler wrote a second response.
 * @module tests/integration/error-handler
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { errorHandler } = require('../../src/middleware/error-handler');
const { AppError, ERROR_CODES, RESERVATION_ISSUES } = require('../../src/errors');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

const STACK_PATTERN = /\bat \S+:\d+/;

/**
 * Builds an Express app whose routes fail in each of the ways the handler must
 * classify, with the handler mounted under `/api` exactly as `src/app.js` does.
 * @returns {import('express').Express} Configured application
 */
function createFailingApp() {
  const app = express();

  app.use(express.json());

  app.post('/api/echo', (req, res) => res.json({ ok: true }));

  app.get('/api/boom', () => {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found.');
  });

  app.get('/api/boom-details', () => {
    throw new AppError('VALIDATION_ERROR', 'One field failed validation.', [
      { field: 'reservation_time', issue: RESERVATION_ISSUES.TIME_OUTSIDE_SERVICE_HOURS },
      { field: 'reservation_date', issue: RESERVATION_ISSUES.DATETIME_IN_PAST }
    ]);
  });

  app.get('/api/boom-empty-details', () => {
    throw new AppError('TOKEN_EXPIRED', 'Session token has expired.', []);
  });

  app.get('/api/crash', () => {
    throw new Error('kaboom internal detail');
  });

  app.get('/api/plain-syntax-error', () => {
    throw new SyntaxError('not a body parse failure');
  });

  app.get('/api/parser-shaped-syntax-error', () => {
    const failure = new SyntaxError('Unexpected end of JSON input');
    failure.status = ERROR_CODES.VALIDATION_ERROR;
    failure.body = '{"broken":';
    throw failure;
  });

  app.get('/api/headers-sent', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('partial');
    throw new Error('failure after the response started');
  });

  app.use('/api', errorHandler);

  return app;
}

/**
 * Creates a minimal response double for calling the handler outside a pipeline.
 * @returns {Object} Response double recording the status and body it receives
 */
function createResponseDouble() {
  const res = {
    headersSent: false,
    statusCode: null,
    body: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    }
  };

  return res;
}

/**
 * Creates a response double whose headers are already sent, for calling the
 * handler directly. Every write method is a Jest mock function, so an attempt
 * to write a second response is recorded rather than thrown and can be asserted
 * against.
 * @returns {Object} Response double with `headersSent` true and recording writers
 */
function createStartedResponseDouble() {
  const res = {
    headersSent: true,
    status: jest.fn(() => res),
    json: jest.fn(),
    send: jest.fn(),
    end: jest.fn()
  };

  return res;
}

describe('API error handler middleware', () => {
  let app;

  beforeEach(() => {
    app = createFailingApp();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('exports a four-argument middleware, the arity Express needs', () => {
    expect(Object.keys(require('../../src/middleware/error-handler'))).toEqual(['errorHandler']);
    expect(typeof errorHandler).toBe('function');
    expect(errorHandler.length).toBe(4);
  });

  describe('malformed JSON body', () => {
    test('answers 400 VALIDATION_ERROR with the fixed envelope and no details', async () => {
      const response = await request(app)
        .post('/api/echo')
        .set('Content-Type', 'application/json')
        .send('{"broken":');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body is not valid JSON.'
        }
      });
    });

    test('leaks neither the parser message nor a stack', async () => {
      const response = await request(app)
        .post('/api/echo')
        .set('Content-Type', 'application/json')
        .send('{"broken":');

      const serialised = JSON.stringify(response.body);
      expect(serialised).not.toMatch(STACK_PATTERN);
      expect(serialised).not.toMatch(/Unexpected token|JSON at position/);
    });

    test('logs nothing for a client mistake', async () => {
      await request(app)
        .post('/api/echo')
        .set('Content-Type', 'application/json')
        .send('{"broken":');

      expect(console.error).not.toHaveBeenCalled();
    });

    test('recognises a parser-shaped SyntaxError that carries the body marker', async () => {
      const response = await request(app).get('/api/parser-shaped-syntax-error');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body is not valid JSON.'
        }
      });
    });
  });

  describe('domain failures', () => {
    test('passes an AppError status, code and message through unchanged', async () => {
      const response = await request(app).get('/api/boom');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    });

    test('carries field details through verbatim, including the fixed reservation issues', async () => {
      const response = await request(app).get('/api/boom-details');

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual([
        { field: 'reservation_time', issue: 'reservation_time_outside_service_hours' },
        { field: 'reservation_date', issue: 'reservation_datetime_in_past' }
      ]);
    });

    test('omits the details key when the failure carries no entries', async () => {
      const response = await request(app).get('/api/boom-empty-details');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
      expect('details' in response.body.error).toBe(false);
    });

    test('logs nothing for an expected failure', async () => {
      await request(app).get('/api/boom');

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('unexpected failures', () => {
    test('answers 500 INTERNAL_ERROR with only a code and a generic message', async () => {
      const response = await request(app).get('/api/crash');

      expect(response.status).toBe(500);
      expect(Object.keys(response.body.error).sort()).toEqual(['code', 'message']);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('An unexpected error occurred.');
    });

    test('keeps the original message and the stack out of the response', async () => {
      const response = await request(app).get('/api/crash');

      const serialised = JSON.stringify(response.body);
      expect(serialised).not.toMatch(/kaboom/);
      expect(serialised).not.toMatch(STACK_PATTERN);
    });

    test('logs the stack server-side with the request method and path', async () => {
      await request(app).get('/api/crash?probe=1');

      expect(console.error).toHaveBeenCalledTimes(1);
      const logged = console.error.mock.calls[0].map(String).join(' ');
      expect(logged).toMatch(/GET \/api\/crash\?probe=1/);
      expect(logged).toMatch(/kaboom internal detail/);
    });

    test('treats a SyntaxError without the body marker as an internal failure', async () => {
      const response = await request(app).get('/api/plain-syntax-error');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('a response that has already started', () => {
    test('delegates to next instead of writing a second response', async () => {
      // Pinned outcome: Express's default handler closes the connection after
      // the delegate, so the started response is never written to a second time
      // and the client sees the socket reset instead of a status line or a body.
      await expect(async () => {
        await request(app).get('/api/headers-sent');
      }).rejects.toMatchObject({ code: 'ECONNRESET' });

      const logged = console.error.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
      expect(logged).not.toMatch(/ERR_HTTP_HEADERS_SENT/);
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('API error while handling'),
        expect.anything()
      );
    });

    test('hands the identical failure to next and touches no write method', () => {
      const res = createStartedResponseDouble();
      const next = jest.fn();
      const failure = new Error('failure after the response started');

      errorHandler(failure, { method: 'GET', originalUrl: '/api/headers-sent' }, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBe(failure);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('failures that carry no error object', () => {
    test('answers a generic 500 for a falsy failure', () => {
      const res = createResponseDouble();
      const next = jest.fn();

      errorHandler(undefined, { method: 'GET', originalUrl: '/api/upsert' }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(console.error).toHaveBeenCalled();
    });

    test('answers a generic 500 for a non-object failure and falls back to req.url when logging', () => {
      const res = createResponseDouble();

      errorHandler('not an error object', { method: 'POST', url: '/api/cart' }, res, jest.fn());

      expect(res.statusCode).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      const logged = console.error.mock.calls[0].map(String).join(' ');
      expect(logged).toMatch(/POST \/api\/cart/);
    });
  });
});
