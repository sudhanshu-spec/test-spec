/**
 * @fileoverview Integration tests for the cross-cutting API contract: the single
 * JSON error envelope, every one of the thirteen documented error codes, the
 * '/api'-scoped not-found and error terminals, the preserved non-API default
 * 404, the three frozen tutorial routes, the absent cart route and the
 * configured CORS origin.
 *
 * Supertest drives the real application exported by src/app, so no port is bound
 * and nothing collides with another suite. The database is the suite's own file
 * under the operating system's temporary directory: DB_FILE is set before
 * jest.resetModules() and before any module that reads it is loaded, so this
 * suite's config, database module and routers belong to it alone and every
 * connection they open lands in that file. The file and its WAL and
 * shared-memory companions are removed once the suite ends, and the previous
 * DB_FILE value is restored.
 *
 * @module tests/integration/api-contract
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// DB_FILE is set before the module registry is reset and before src/app,
// src/config and src/db are required, so the config copy they read points at
// this suite's own file instead of data/app.db. No other variable is set.
const previousDbFile = process.env.DB_FILE;
const dbFile = path.join(os.tmpdir(), `burger-api-contract-${process.pid}-${Date.now()}.db`);
process.env.DB_FILE = dbFile;

jest.resetModules();

const request = require('supertest');

const app = require('../../src/app');
const config = require('../../src/config');
const { getDb, closeDb } = require('../../src/db');
const { errorHandler } = require('../../src/middleware/error-handler');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** Code every rejected request body is answered with; the only code that may carry `details`. */
const VALIDATION_ERROR = 'VALIDATION_ERROR';

/** Credential every fixture account is created with; above the 8-character floor. */
const ACCOUNT_PASSWORD = 'contract-fixture-passphrase';

/** Slot the conflict fixture books: 18:00 is a 30-minute slot inside the 17:00-22:00 window. */
const FIXTURE_RESERVATION_TIME = '18:00';

/** Days ahead the conflict fixture books; inside the 90-day horizon with room to spare. */
const FIXTURE_RESERVATION_DAYS_AHEAD = 8;

/** Party size the conflict fixture books; inside the 1-12 range. */
const FIXTURE_PARTY_SIZE = 2;

/**
 * Assert the shape of one error envelope payload — the object written as the body
 * of a failure response. The rule it encodes is the contract itself: exactly one
 * top-level key `error`; `code` and `message` always present and non-empty; a
 * `stack` never present; `details` only on a validation failure, and then one
 * `{field, issue}` entry per failing field.
 *
 * @param {Object} body - Parsed response body, or a stub's recorded payload.
 * @param {string} code - Expected `error.code`.
 * @param {{expectDetails?: boolean}} [options] - `expectDetails` defaults to true
 *   for a validation failure; pass false for the parse failure, which names no
 *   field and so carries no details.
 * @returns {void}
 */
function expectEnvelopePayload(body, code, options = {}) {
  const { expectDetails = code === VALIDATION_ERROR } = options;

  expect(Object.keys(body)).toEqual(['error']);
  expect(Object.keys(body.error)).toEqual(expect.arrayContaining(['code', 'message']));
  expect(body.error.code).toBe(code);
  expect(typeof body.error.message).toBe('string');
  expect(body.error.message.length).toBeGreaterThan(0);
  expect(body.error.stack).toBeUndefined();

  if (expectDetails) {
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details.length).toBeGreaterThan(0);

    for (const detail of body.error.details) {
      expect(Object.keys(detail).sort()).toEqual(['field', 'issue']);
      expect(typeof detail.field).toBe('string');
      expect(detail.field.length).toBeGreaterThan(0);
      expect(typeof detail.issue).toBe('string');
      expect(detail.issue.length).toBeGreaterThan(0);
    }
  } else {
    expect('details' in body.error).toBe(false);
  }
}

/**
 * Assert that a response is one documented failure: its HTTP status, its single
 * envelope key, and the code the contract pairs with that status.
 *
 * @param {SupertestResponse} response - Supertest response.
 * @param {number} status - Expected HTTP status.
 * @param {string} code - Expected `error.code`.
 * @param {{expectDetails?: boolean}} [options] - Passed through to
 *   {@link expectEnvelopePayload}.
 * @returns {void}
 */
function expectEnvelope(response, status, code, options = {}) {
  expect(response.status).toBe(status);
  expectEnvelopePayload(response.body, code, options);
}

/**
 * Build an address no other row in this suite's database can hold.
 *
 * @param {string} [label] - Readable prefix naming the row's purpose.
 * @returns {string} A unique, lower-case address.
 */
function uniqueEmail(label = 'account') {
  return `${label}-${crypto.randomUUID()}@example.com`;
}

/**
 * Register a fresh account and return the credential issued with it.
 *
 * @param {string} [name] - Display name for the new account.
 * @returns {Promise<{email: string, password: string, user: Object, token: string}>}
 *   The fixture account and its raw token.
 */
async function registerUser(name = 'Contract Tester') {
  const email = uniqueEmail('contract');
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: ACCOUNT_PASSWORD });

  expect(response.status).toBe(201);

  return { email, password: ACCOUNT_PASSWORD, user: response.body.user, token: response.body.token };
}

/**
 * Log an account in and return the raw credential the response carries.
 *
 * @param {string} email - Registered address.
 * @param {string} [password] - Credential to present.
 * @returns {Promise<string>} The issued token.
 */
async function loginToken(email, password = ACCOUNT_PASSWORD) {
  const response = await request(app).post('/api/auth/login').send({ email, password });

  expect(response.status).toBe(200);

  return response.body.token;
}

/**
 * Build the Authorization header a protected route is called with.
 *
 * @param {string} token - Raw opaque token issued by register or login.
 * @returns {{Authorization: string}} Header object for Supertest's `.set()`.
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Digest a raw token the way the application stores and looks it up.
 *
 * @param {string} value - Raw token.
 * @returns {string} 64-character hex SHA-256 digest.
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Format a calendar date a number of days from today in the server's local
 * timezone. Local arithmetic, never toISOString(), so the date the suite books is
 * the date the service compares and a run near midnight cannot shift by a day.
 *
 * @param {number} daysAhead - Whole days from today.
 * @returns {string} `YYYY-MM-DD`.
 */
function localIsoDate(daysAhead) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Read the id of a seeded item that is currently orderable, so the availability
 * row withdraws an item it can restore without disturbing any other one.
 *
 * @returns {string} A `menu_items.id` whose `is_available` is 1.
 */
function findAvailableItemId() {
  const row = getDb()
    .prepare('SELECT id FROM menu_items WHERE is_available = 1 ORDER BY name LIMIT 1')
    .get();

  expect(row).toBeDefined();

  return row.id;
}

/**
 * Build the minimal Express response double the error handler writes through,
 * recording what it was asked to send instead of sending it.
 *
 * @param {{headersSent?: boolean}} [options] - `headersSent` true models a
 *   response whose first byte is already on the wire.
 * @returns {{response: Object, recorded: {statusCode: (number|null), payload: (Object|undefined)}}}
 *   The double and the record of what it was asked to write.
 */
function createResponseStub({ headersSent = false } = {}) {
  const recorded = { statusCode: null, payload: undefined };
  const response = {
    headersSent,
    status(code) {
      recorded.statusCode = code;
      return response;
    },
    json(payload) {
      recorded.payload = payload;
      return response;
    }
  };

  return { response, recorded };
}

afterAll(() => {
  // The handle must close before any file is unlinked: while it is open, WAL
  // keeps the database, its -wal and its -shm files in use.
  closeDb();

  for (const target of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    try {
      fs.unlinkSync(target);
    } catch {
      // Already gone: a clean close removes the WAL sidecars, and the one
      // remaining failure mode is a sidecar the operating system has not
      // released yet. No assertion depends on it.
    }
  }

  if (previousDbFile === undefined) {
    delete process.env.DB_FILE;
  } else {
    process.env.DB_FILE = previousDbFile;
  }
});


describe('JSON error envelope: the thirteen documented codes', () => {
  test('VALIDATION_ERROR (400) for a registration email that is not an address', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Contract Tester', email: 'not-an-address', password: ACCOUNT_PASSWORD });

    expectEnvelope(response, 400, VALIDATION_ERROR);
  });

  test('VALIDATION_ERROR names every failing field, each with only field and issue', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'nope', password: 'short' });

    expectEnvelope(response, 400, VALIDATION_ERROR);
    expect(Array.isArray(response.body.error.details)).toBe(true);
    expect(response.body.error.details.map((detail) => detail.field)).toEqual(['name', 'email', 'password']);

    for (const detail of response.body.error.details) {
      expect(Object.keys(detail).sort()).toEqual(['field', 'issue']);
    }
  });

  test('INVALID_CREDENTIALS (401) for a login naming no account', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail('unknown'), password: ACCOUNT_PASSWORD });

    expectEnvelope(response, 401, 'INVALID_CREDENTIALS');
  });

  test('TOKEN_REQUIRED (401) when a protected route is called without a header', async () => {
    const response = await request(app).get('/api/auth/session');

    expectEnvelope(response, 401, 'TOKEN_REQUIRED');
  });

  test('TOKEN_INVALID (401) for a credential no account holds', async () => {
    const response = await request(app)
      .get('/api/auth/session')
      .set({ Authorization: 'Bearer not-a-real-token' });

    expectEnvelope(response, 401, 'TOKEN_INVALID');
  });

  test('TOKEN_EXPIRED (401) once the stored expiry is behind the clock', async () => {
    const { token } = await registerUser();
    const pastExpiry = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // The expiry is rewritten rather than waited out, so the row carries no
    // dependence on the machine's clock advancing.
    const updated = getDb()
      .prepare('UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?')
      .run(pastExpiry, sha256(token));
    expect(updated.changes).toBe(1);

    const response = await request(app).get('/api/auth/session').set(authHeader(token));

    expectEnvelope(response, 401, 'TOKEN_EXPIRED');
  });

  test('EMAIL_ALREADY_REGISTERED (409) for an address registered twice', async () => {
    const email = uniqueEmail('duplicate');
    const body = { name: 'Contract Tester', email, password: ACCOUNT_PASSWORD };

    await request(app).post('/api/auth/register').send(body).expect(201);
    const response = await request(app).post('/api/auth/register').send(body);

    expectEnvelope(response, 409, 'EMAIL_ALREADY_REGISTERED');
  });

  test('CATEGORY_NOT_FOUND (404) for a filter slug no category carries', async () => {
    const response = await request(app).get('/api/menu-items?category=does-not-exist');

    expectEnvelope(response, 404, 'CATEGORY_NOT_FOUND');
  });

  test('MENU_ITEM_NOT_FOUND (404) for an item id no row holds', async () => {
    const response = await request(app).get(`/api/menu-items/${crypto.randomUUID()}`);

    expectEnvelope(response, 404, 'MENU_ITEM_NOT_FOUND');
  });

  test('MENU_ITEM_UNAVAILABLE (409) for an order line naming a withdrawn item', async () => {
    const { token } = await registerUser();
    const itemId = findAvailableItemId();
    const db = getDb();

    try {
      db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = ?').run(itemId);

      const response = await request(app)
        .post('/api/orders')
        .set(authHeader(token))
        .send({ items: [{ menu_item_id: itemId, quantity: 1 }] });

      expectEnvelope(response, 409, 'MENU_ITEM_UNAVAILABLE');
    } finally {
      // Restored in the test that withdrew it, so no later row meets a catalog it
      // does not expect.
      db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = ?').run(itemId);
    }
  });

  test('ORDER_NOT_FOUND (404) for an order id the caller does not hold', async () => {
    const account = await registerUser();
    const token = await loginToken(account.email);

    const response = await request(app)
      .get(`/api/orders/${crypto.randomUUID()}`)
      .set(authHeader(token));

    expectEnvelope(response, 404, 'ORDER_NOT_FOUND');
  });

  test('RESERVATION_CONFLICT (409) when the same slot is booked twice', async () => {
    const { token } = await registerUser();
    const booking = {
      reservation_date: localIsoDate(FIXTURE_RESERVATION_DAYS_AHEAD),
      reservation_time: FIXTURE_RESERVATION_TIME,
      party_size: FIXTURE_PARTY_SIZE
    };

    await request(app).post('/api/reservations').set(authHeader(token)).send(booking).expect(201);
    const response = await request(app).post('/api/reservations').set(authHeader(token)).send(booking);

    expectEnvelope(response, 409, 'RESERVATION_CONFLICT');
  });

  test('ROUTE_NOT_FOUND (404) for an unknown path under /api, on GET and POST', async () => {
    const onGet = await request(app).get('/api/nope');
    expectEnvelope(onGet, 404, 'ROUTE_NOT_FOUND');

    const onPost = await request(app).post('/api/nope');
    expectEnvelope(onPost, 404, 'ROUTE_NOT_FOUND');
  });

  test('INTERNAL_ERROR (500) from the error handler itself, since no route can reach it', () => {
    const { response, recorded } = createResponseStub();
    const next = jest.fn();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      // Four arguments, or the handler is registered as ordinary middleware.
      errorHandler(new Error('boom'), { method: 'GET', originalUrl: '/api/contract' }, response, next);

      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }

    expect(recorded.statusCode).toBe(500);
    expectEnvelopePayload(recorded.payload, 'INTERNAL_ERROR');
    // The stack and the failure's own text stay server-side.
    expect(JSON.stringify(recorded.payload)).not.toContain('boom');
    expect(next).not.toHaveBeenCalled();
  });

  test('delegates to next, writing nothing, when the response has already started', () => {
    const { response, recorded } = createResponseStub({ headersSent: true });
    const next = jest.fn();
    const failure = new Error('late failure');

    errorHandler(failure, { method: 'GET', originalUrl: '/api/contract' }, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(failure);
    expect(recorded.statusCode).toBeNull();
    expect(recorded.payload).toBeUndefined();
  });
});

describe('/api terminals and body parsing', () => {
  test('answers a malformed JSON body as VALIDATION_ERROR through the envelope', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    // A parser rejection names no field, so this one validation failure is the
    // only one whose body carries no details.
    expectEnvelope(response, 400, VALIDATION_ERROR, { expectDetails: false });
  });

  test('advertises the single configured browser origin on an API response', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(config.corsOrigin);
  });
});

describe('framework fingerprint', () => {
  test('omits the x-powered-by banner on a tutorial route and on an API envelope', async () => {
    const tutorial = await request(app).get('/');
    const api = await request(app).get('/api/nope');

    expect(tutorial.status).toBe(200);
    expectEnvelope(api, 404, 'ROUTE_NOT_FOUND');
    expect(tutorial.headers['x-powered-by']).toBeUndefined();
    expect(api.headers['x-powered-by']).toBeUndefined();
  });
});

describe('cart routes', () => {
  const CART_REQUESTS = [
    { method: 'get', path: '/api/cart' },
    { method: 'post', path: '/api/cart' },
    { method: 'get', path: '/api/cart/items' }
  ];

  test.each(CART_REQUESTS)(
    'answers $method $path as ROUTE_NOT_FOUND, because the cart lives in client state',
    async ({ method, path: target }) => {
      const response = await request(app)[method](target);

      // Under '/api', so the API not-found terminal answers — not Express's own.
      expectEnvelope(response, 404, 'ROUTE_NOT_FOUND');
    }
  );
});

describe('non-API paths stay with Express own handler', () => {
  const NON_API_REQUESTS = [
    { method: 'get', path: '/invalid' },
    { method: 'post', path: '/' },
    { method: 'put', path: '/evening' },
    { method: 'delete', path: '/' }
  ];

  test.each(NON_API_REQUESTS)(
    'answers $method $path with Express own 404 and no JSON envelope',
    async ({ method, path: target }) => {
      const response = await request(app)[method](target);

      expect(response.status).toBe(404);
      expect(response.body.error).toBeUndefined();
      expect(response.text).toBeDefined();
    }
  );

  test('answers a malformed JSON body with Express own 404, never a stack or a path', async () => {
    // No body parser is mounted outside '/api', so this body is never read: the
    // request is an ordinary unknown POST '/', answered by Express's own handler.
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(404);
    expect(response.body.error).toBeUndefined();
    expect(response.text).not.toMatch(/\bat \S+:\d+/);
    expect(response.text).not.toMatch(/node_modules\//);
    expect(response.text).not.toMatch(/src\//);
  });
});

describe('frozen tutorial routes beside the API surface', () => {
  test('GET / answers exactly "Hello, World!\\n" as text/html', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!\n');
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
  });

  test('GET /evening answers exactly "Good evening" as text/html', async () => {
    const response = await request(app).get('/evening');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
  });

  test('GET /good-evening answers exactly "Good evening" as text/plain', async () => {
    const response = await request(app).get('/good-evening');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Good evening');
    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
  });
});
