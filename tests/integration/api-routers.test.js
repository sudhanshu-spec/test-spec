/**
 * @fileoverview Integration tests for the three API routers that
 * src/app.js does not mount yet — src/routes/api/menu.routes.js,
 * src/routes/api/auth.routes.js and src/routes/api/reservations.routes.js —
 * together with the order service behind the order endpoints,
 * src/services/order.service.js.
 *
 * The routers are exercised over a real Express pipeline assembled in this suite
 * in the order the application registers it: the JSON body parser, the tutorial
 * router at '/', the three API mounts under '/api', then the '/api'-scoped
 * not-found and error-handler middleware. Supertest drives the pipeline, so no
 * port is bound and nothing collides with another suite. The order service is
 * driven through createOrderService over injected doubles, and its clock is
 * injected too, so its rules are asserted without HTTP or a database.
 *
 * The database is the suite's own file under the operating system's temporary
 * directory: DB_FILE is set before jest.resetModules() and before any module
 * that reads it is loaded, so this suite's src/config, src/db and routers are its
 * own and every connection they open belongs to that file. The file and its WAL
 * and shared-memory companions are removed once the suite ends, and the previous
 * DB_FILE value is restored.
 *
 * @module tests/integration/api-routers
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** The four fields a user projection carries, in alphabetical order. */
const PUBLIC_USER_KEYS = ['created_at', 'email', 'id', 'name'];

/** The column names no response body may carry, in stored or digest form. */
const SECRET_KEYS = ['password_hash', 'password_salt', 'token_hash'];

/** Shape of the opaque session token the auth endpoints issue. */
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** Shape of an id minted by crypto.randomUUID(). */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A bookable slot inside the 17:00-22:00 service window of the seed settings. */
const BOOKABLE_TIME = '18:00';

/**
 * The clock the order service is injected with, so a created order's timestamp is
 * an exact value rather than whatever the test run happened to read.
 * @type {Date}
 */
const FIXED_NOW = new Date('2025-06-01T12:00:00.000Z');

/** Suite state: the temporary database file, the app, the order-service factory. */
let dbFile;
let previousDbFile;
let app;
let createOrderService;
let AppError;

/** Number of addresses this suite has minted, so none repeats another's. */
let emailSequence = 0;

/**
 * Loads a pristine copy of the application's modules over `file` as the database
 * and assembles the API pipeline src/app.js does not mount yet.
 *
 * DB_FILE is set first and jest.resetModules() runs before any module that reads
 * it is required, so this suite gets its own configuration, database connection
 * and routers: the memoised handle they open belongs to `file`, not to another
 * suite and not to data/app.db.
 *
 * @param {string} file - Absolute path this suite's database must live at.
 * @returns {{app: Object, createOrderService: Function, AppError: Function}} The
 *   assembled pipeline, the order-service factory and the error class those
 *   modules raise, so assertions can use the same instance they do.
 */
function loadApplication(file) {
  process.env.DB_FILE = file;
  jest.resetModules();

  const express = require('express');
  const mainRoutes = require('../../src/routes/main.routes');
  const menuRoutes = require('../../src/routes/api/menu.routes');
  const authRoutes = require('../../src/routes/api/auth.routes');
  const reservationsRoutes = require('../../src/routes/api/reservations.routes');
  const { notFound } = require('../../src/middleware/not-found');
  const { errorHandler } = require('../../src/middleware/error-handler');
  const { createOrderService: factory } = require('../../src/services/order.service');
  const errors = require('../../src/errors');

  const application = express();

  // The application's pipeline: body parsing, the tutorial router at '/', the API
  // mounts, then the two '/api'-scoped terminals, so an unknown path outside /api
  // keeps Express's own 404.
  application.use(express.json());
  application.use('/', mainRoutes);
  application.use('/api', menuRoutes);
  application.use('/api/auth', authRoutes);
  application.use('/api/reservations', reservationsRoutes);
  application.use('/api', notFound);
  application.use('/api', errorHandler);

  return { app: application, createOrderService: factory, AppError: errors.AppError };
}

/**
 * Formats an instant as the YYYY-MM-DD reservation date the API takes.
 * @param {Date} date - Instant to format.
 * @returns {string} The calendar date, in the server's local timezone.
 */
function toDateString(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A calendar date `daysAhead` days from today, so a booking made from it is
 * neither in the past nor outside the reservation horizon.
 * @param {number} daysAhead - Whole days from today.
 * @returns {string} The date, YYYY-MM-DD.
 */
function futureDate(daysAhead) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return toDateString(date);
}

/**
 * An address no earlier test in this suite used.
 * @returns {string} A unique email address.
 */
function nextEmail() {
  emailSequence += 1;
  return `api.routers.${process.pid}.${emailSequence}@example.com`;
}

/**
 * Registration and login input that satisfies every documented rule.
 * @param {Object} [overrides] - Fields that replace the defaults.
 * @returns {{name: string, email: string, password: string}} The credentials.
 */
function newCredentials(overrides = {}) {
  return { name: 'Grace Hopper', email: nextEmail(), password: 'cobol-and-beyond', ...overrides };
}

/**
 * Registers an account through the API and returns its response and token.
 * @param {Object} [overrides] - Credential fields that replace the defaults.
 * @returns {Promise<{credentials: Object, response: SupertestResponse}>} The
 *   credentials used and the register response.
 */
async function registerAccount(overrides = {}) {
  const credentials = newCredentials(overrides);
  const response = await request(app).post('/api/auth/register').send(credentials);

  return { credentials, response };
}

/**
 * Runs `operation` and returns the error it threw, or null when it threw nothing.
 * @param {Function} operation - The call expected to throw.
 * @returns {Error|null} The thrown error, or null.
 */
function captureError(operation) {
  try {
    operation();
    return null;
  } catch (error) {
    return error;
  }
}

/**
 * The item rows the order-service doubles answer findManyByIds with.
 * @type {{id: string, name: string, price_cents: number, is_available: number}}
 */
const ITEM_A = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Classic Cheeseburger',
  price_cents: 899,
  is_available: 1
};

/**
 * A second orderable item row, priced differently from {@link ITEM_A}.
 * @type {{id: string, name: string, price_cents: number, is_available: number}}
 */
const ITEM_B = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Skin-On Fries',
  price_cents: 349,
  is_available: 1
};

/** Id of the order the order-service doubles report as stored. */
const ORDER_ID = '33333333-3333-4333-8333-333333333333';

/** Owner the order-service calls are made for. */
const USER_ID = '44444444-4444-4444-8444-444444444444';


/**
 * The order row the order repository would return for ITEM_A twice and ITEM_B
 * once: priced from the stored price_cents, which is the total the service must
 * pass through untouched.
 * @param {Object} [overrides] - Columns that replace the defaults.
 * @returns {Object} The stored order, lines included.
 */
function storedOrder(overrides = {}) {
  return {
    id: ORDER_ID,
    status: 'confirmed',
    total_cents: 2147,
    notes: null,
    created_at: FIXED_NOW.toISOString(),
    lines: [
      {
        id: 'line-1', menu_item_id: ITEM_A.id, name: ITEM_A.name,
        quantity: 2, unit_price_cents: 899, line_total_cents: 1798
      },
      {
        id: 'line-2', menu_item_id: ITEM_B.id, name: ITEM_B.name,
        quantity: 1, unit_price_cents: 349, line_total_cents: 349
      }
    ],
    ...overrides
  };
}

/**
 * Builds an order service over fresh doubles, so each test starts from a service
 * no earlier test's calls reached.
 * @param {Object} [options] - Fixture options.
 * @param {Array<Object>} [options.itemRows] - Rows findManyByIds answers with.
 * @returns {{service: Object, orders: Object, items: Object}} The service and the
 *   two doubles it was built over.
 */
function createServiceFixture({ itemRows = [ITEM_A, ITEM_B] } = {}) {
  const orders = {
    createWithLines: jest.fn(() => storedOrder()),
    listByUser: jest.fn(() => []),
    findByIdForUser: jest.fn(() => null)
  };
  const items = { findManyByIds: jest.fn(() => itemRows) };
  const service = createOrderService({ orders, items, now: () => FIXED_NOW });

  return { service, orders, items };
}

describe('API routers over an in-process Express pipeline', () => {
  beforeAll(() => {
    previousDbFile = process.env.DB_FILE;
    dbFile = path.join(os.tmpdir(), `burger-api-routers-${process.pid}-${Date.now()}.db`);
    ({ app, createOrderService, AppError } = loadApplication(dbFile));
  });

  afterAll(() => {
    require('../../src/db').closeDb();

    for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        // Already absent, or never created: there is nothing left to remove.
      }
    }

    if (previousDbFile === undefined) {
      delete process.env.DB_FILE;
    } else {
      process.env.DB_FILE = previousDbFile;
    }
  });

  describe('tutorial routes mounted at /', () => {
    test('GET / answers Hello, World! as HTML, unchanged', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.text).toBe('Hello, World!\n');
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });

    test('GET /evening answers Good evening as HTML, unchanged', async () => {
      const response = await request(app).get('/evening').expect(200);

      expect(response.text).toBe('Good evening');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('GET /good-evening answers Good evening as plain text, unchanged', async () => {
      const response = await request(app).get('/good-evening').expect(200);

      expect(response.text).toBe('Good evening');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('menu router mounted at /api', () => {
    /** Every available item the seeded catalog offers, read once for the suite. */
    let availableItems;

    /** Id of the first available item, the detail route's seeded subject. */
    let seededItemId;

    beforeAll(async () => {
      const response = await request(app).get('/api/menu-items').expect(200);

      availableItems = response.body.items;
      seededItemId = availableItems[0].id;
    });

    describe('GET /api/categories', () => {
      test('answers 200 with at least five seeded categories in display order', async () => {
        const response = await request(app).get('/api/categories').expect(200);

        expect(Object.keys(response.body)).toEqual(['categories']);

        const { categories } = response.body;
        expect(categories.length).toBeGreaterThanOrEqual(5);
        for (const category of categories) {
          expect(Object.keys(category).sort()).toEqual(['display_order', 'id', 'name', 'slug']);
        }

        const displayOrders = categories.map((category) => category.display_order);
        expect(displayOrders).toEqual([...displayOrders].sort((left, right) => left - right));
        expect(categories.map((category) => category.slug)).toContain('classics');
      });
    });

    describe('GET /api/menu-items', () => {
      test('answers 200 with the available items and a boolean is_available', async () => {
        const response = await request(app).get('/api/menu-items').expect(200);

        expect(Object.keys(response.body)).toEqual(['items']);
        expect(response.body.items.length).toBeGreaterThanOrEqual(12);

        for (const item of response.body.items) {
          expect(Object.keys(item).sort()).toEqual([
            'category', 'description', 'id', 'image_url', 'is_available', 'name', 'price_cents'
          ]);
          expect(item.is_available).toBe(true);
          expect(Number.isInteger(item.price_cents)).toBe(true);
          expect(item.price_cents).toBeGreaterThan(0);
          expect(item.category.slug).toEqual(expect.any(String));
        }
      });

      test('restricts the list to one seeded category slug', async () => {
        const response = await request(app).get('/api/menu-items?category=classics').expect(200);

        expect(Object.keys(response.body)).toEqual(['items']);
        expect(response.body.items.length).toBeGreaterThan(0);
        expect(response.body.items.length).toBeLessThan(availableItems.length);
        for (const item of response.body.items) {
          expect(item.category.slug).toBe('classics');
        }
      });

      test('lists the whole catalog when the filter is blank or not a single string', async () => {
        const blank = await request(app).get('/api/menu-items?category=%20').expect(200);
        expect(blank.body.items.map((item) => item.id)).toEqual(availableItems.map((item) => item.id));

        const repeated = await request(app)
          .get('/api/menu-items?category=classics&category=chicken')
          .expect(200);
        expect(repeated.body.items.map((item) => item.id)).toEqual(availableItems.map((item) => item.id));
      });

      test('answers 404 CATEGORY_NOT_FOUND for a slug no category carries', async () => {
        const response = await request(app).get('/api/menu-items?category=does-not-exist').expect(404);

        expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
        expect('details' in response.body.error).toBe(false);
      });
    });

    describe('GET /api/menu-items/:id', () => {
      test('answers 200 with the seeded item and its category', async () => {
        const response = await request(app).get(`/api/menu-items/${seededItemId}`).expect(200);

        expect(Object.keys(response.body)).toEqual(['item']);

        const { item } = response.body;
        expect(item.id).toBe(seededItemId);
        expect(Number.isInteger(item.price_cents)).toBe(true);
        expect(item.is_available).toBe(true);
        expect(Object.keys(item.category).sort()).toEqual(['id', 'name', 'slug']);
      });

      test('answers 400 VALIDATION_ERROR naming the id when it is not a UUID', async () => {
        const response = await request(app).get('/api/menu-items/abc').expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual([{ field: 'id', issue: 'not_a_valid_uuid' }]);
      });

      test('answers 404 MENU_ITEM_NOT_FOUND for a well-formed id no item carries', async () => {
        const response = await request(app).get(`/api/menu-items/${crypto.randomUUID()}`).expect(404);

        expect(response.body.error.code).toBe('MENU_ITEM_NOT_FOUND');
        expect('details' in response.body.error).toBe(false);
      });

      test('answers 404 for a differently-cased spelling of a known id', async () => {
        const response = await request(app).get(`/api/menu-items/${seededItemId.toUpperCase()}`).expect(404);

        expect(response.body.error.code).toBe('MENU_ITEM_NOT_FOUND');
      });
    });
  });

  describe('auth router mounted at /api/auth', () => {
    describe('POST /api/auth/register', () => {
      test('answers 201 with the public user and an opaque token, and no secret', async () => {
        const credentials = newCredentials();
        const response = await request(app).post('/api/auth/register').send(credentials).expect(201);

        expect(Object.keys(response.body).sort()).toEqual(['token', 'user']);
        expect(Object.keys(response.body.user).sort()).toEqual(PUBLIC_USER_KEYS);
        expect(response.body.user.name).toBe(credentials.name);
        expect(response.body.user.email).toBe(credentials.email);
        expect(response.body.user.id).toMatch(UUID_V4_PATTERN);
        expect(response.body.token).toMatch(TOKEN_PATTERN);

        const serialised = JSON.stringify(response.body);
        for (const secret of SECRET_KEYS) {
          expect(serialised).not.toContain(secret);
        }
        expect(serialised).not.toContain(credentials.password);
      });

      test('answers 409 EMAIL_ALREADY_REGISTERED for a second account on the same address', async () => {
        const credentials = newCredentials();
        await request(app).post('/api/auth/register').send(credentials).expect(201);

        const response = await request(app).post('/api/auth/register').send(credentials).expect(409);

        expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
      });

      test('answers 409 for a differently-cased spelling of a registered address', async () => {
        const credentials = newCredentials();
        await request(app).post('/api/auth/register').send(credentials).expect(201);

        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...credentials, email: credentials.email.toUpperCase() })
          .expect(409);

        expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
      });

      test('answers 400 naming every rule a body-less request breaks', async () => {
        const response = await request(app).post('/api/auth/register').expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual([
          { field: 'name', issue: 'name_required' },
          { field: 'email', issue: 'email_required' },
          { field: 'password', issue: 'password_required' }
        ]);
      });

      test.each([
        ['a blank name', { name: '   ' }, 'name', 'name_required'],
        ['a name of the wrong type', { name: 42 }, 'name', 'name_required'],
        ['a name past the length limit', { name: 'n'.repeat(81) }, 'name', 'name_too_long'],
        ['a blank email', { email: '' }, 'email', 'email_required'],
        ['an email of the wrong type', { email: ['nobody@example.com'] }, 'email', 'email_required'],
        ['an address with no domain', { email: 'not-an-address' }, 'email', 'email_invalid'],
        ['a blank password', { password: '' }, 'password', 'password_required'],
        ['a password below the length limit', { password: 'short' }, 'password', 'password_too_short'],
        ['a password past the byte limit', { password: 'é'.repeat(40) }, 'password', 'password_too_long']
      ])('answers 400 VALIDATION_ERROR for %s', async (label, overrides, field, issue) => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(newCredentials(overrides))
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual([{ field, issue }]);
      });
    });

    describe('POST /api/auth/login', () => {
      test('answers 200 with the public user and a fresh token', async () => {
        const { credentials, response: registered } = await registerAccount();
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: credentials.email, password: credentials.password })
          .expect(200);

        expect(Object.keys(response.body).sort()).toEqual(['token', 'user']);
        expect(Object.keys(response.body.user).sort()).toEqual(PUBLIC_USER_KEYS);
        expect(response.body.user.id).toBe(registered.body.user.id);
        expect(response.body.token).toMatch(TOKEN_PATTERN);
        expect(response.body.token).not.toBe(registered.body.token);
      });

      test('answers one indistinguishable 401 INVALID_CREDENTIALS for a wrong password and an unknown address', async () => {
        const { credentials } = await registerAccount();

        const wrongPassword = await request(app)
          .post('/api/auth/login')
          .send({ email: credentials.email, password: 'not-the-password' })
          .expect(401);
        const unknownEmail = await request(app)
          .post('/api/auth/login')
          .send({ email: nextEmail(), password: credentials.password })
          .expect(401);

        expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
        expect(unknownEmail.body.error).toEqual(wrongPassword.body.error);
      });

      test('answers 400 naming both fields a body-less request leaves out', async () => {
        const response = await request(app).post('/api/auth/login').expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual([
          { field: 'email', issue: 'email_required' },
          { field: 'password', issue: 'password_required' }
        ]);
      });
    });

    describe('GET /api/auth/session and POST /api/auth/logout', () => {
      /** A registered account whose token stays live for the whole block. */
      let credentials;
      let token;
      let userId;

      beforeAll(async () => {
        const registered = await registerAccount();

        credentials = registered.credentials;
        token = registered.response.body.token;
        userId = registered.response.body.user.id;
      });

      test('GET /api/auth/session reports the caller once the token is presented', async () => {
        const response = await request(app)
          .get('/api/auth/session')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(Object.keys(response.body)).toEqual(['user']);
        expect(Object.keys(response.body.user).sort()).toEqual(PUBLIC_USER_KEYS);
        expect(response.body.user.id).toBe(userId);
        expect(response.body.user.email).toBe(credentials.email);
      });

      test('GET /api/auth/session answers 401 TOKEN_REQUIRED without a header', async () => {
        const response = await request(app).get('/api/auth/session').expect(401);

        expect(response.body.error.code).toBe('TOKEN_REQUIRED');
      });

      test('POST /api/auth/logout answers 204 with no body', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(204);

        expect(response.text).toBe('');
        expect(response.body).toEqual({});
      });

      test('the revoked token is TOKEN_INVALID for the session read that follows', async () => {
        const response = await request(app)
          .get('/api/auth/session')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error.code).toBe('TOKEN_INVALID');
      });

      test('a second logout with the same token answers 401 TOKEN_INVALID', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error.code).toBe('TOKEN_INVALID');
      });
    });
  });

  describe('reservations router mounted at /api/reservations', () => {
    /** The caller every booking below is made for. */
    let token;

    /** A second caller, whose list must never contain the first caller's booking. */
    let otherToken;

    /** The slot the first booking takes, reused by the conflict case. */
    const bookedDate = futureDate(1);

    /** A slot no earlier case books, so the validation rows cannot collide. */
    const validationDate = futureDate(3);

    /**
     * A reservation request body that passes every checkpoint.
     * @param {Object} [overrides] - Fields that replace the defaults.
     * @returns {Object} The request body.
     */
    const bookingBody = (overrides = {}) => ({
      reservation_date: bookedDate,
      reservation_time: BOOKABLE_TIME,
      party_size: 2,
      notes: 'Window seat please',
      ...overrides
    });

    beforeAll(async () => {
      token = (await registerAccount()).response.body.token;
      otherToken = (await registerAccount()).response.body.token;
    });

    test('both routes are closed without an Authorization header', async () => {
      const list = await request(app).get('/api/reservations').expect(401);
      const create = await request(app).post('/api/reservations').send(bookingBody()).expect(401);

      expect(list.body.error.code).toBe('TOKEN_REQUIRED');
      expect(create.body.error.code).toBe('TOKEN_REQUIRED');
    });

    test('POST / answers 201 with the confirmed reservation', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingBody())
        .expect(201);

      expect(Object.keys(response.body)).toEqual(['reservation']);

      const { reservation } = response.body;
      expect(Object.keys(reservation).sort()).toEqual([
        'created_at', 'id', 'notes', 'party_size', 'reservation_date', 'reservation_time', 'status'
      ]);
      expect(reservation.id).toMatch(UUID_V4_PATTERN);
      expect(reservation.reservation_date).toBe(bookedDate);
      expect(reservation.reservation_time).toBe(BOOKABLE_TIME);
      expect(reservation.party_size).toBe(2);
      expect(reservation.notes).toBe('Window seat please');
      expect(reservation.status).toBe('confirmed');
    });

    test('POST / answers 409 RESERVATION_CONFLICT for the slot the caller already holds', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingBody())
        .expect(409);

      expect(response.body.error.code).toBe('RESERVATION_CONFLICT');
    });

    test('POST / answers 400 naming every field a body-less request leaves out', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual([
        { field: 'reservation_date', issue: 'required' },
        { field: 'reservation_time', issue: 'required' },
        { field: 'party_size', issue: 'invalid_party_size' }
      ]);
    });

    test.each([
      ['a party size above the maximum', { party_size: 13 }, 'party_size', 'out_of_range'],
      ['a party size of zero', { party_size: 0 }, 'party_size', 'out_of_range'],
      ['a party size that is not an integer', { party_size: 'four' }, 'party_size', 'invalid_party_size'],
      ['a malformed date', { reservation_date: '02/03/2026' }, 'reservation_date', 'invalid_date_format'],
      ['a malformed time', { reservation_time: '1800' }, 'reservation_time', 'invalid_time_format'],
      ['a date in the past', { reservation_date: '2000-01-01' }, 'reservation_date', 'reservation_datetime_in_past'],
      ['a time before the service window', { reservation_time: '16:30' }, 'reservation_time', 'reservation_time_outside_service_hours'],
      ['a time past the last seating', { reservation_time: '22:00' }, 'reservation_time', 'reservation_time_outside_service_hours'],
      ['a time off the 30-minute grid', { reservation_time: '18:15' }, 'reservation_time', 'reservation_time_outside_service_hours']
    ])('POST / answers 400 VALIDATION_ERROR for %s', async (label, overrides, field, issue) => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingBody({ reservation_date: validationDate, ...overrides }))
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual([{ field, issue }]);
    });

    test('GET / answers 200 with the bookings the caller holds, earliest first', async () => {
      const later = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingBody({ reservation_date: futureDate(2), reservation_time: '20:30', notes: null }))
        .expect(201);

      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Object.keys(response.body)).toEqual(['reservations']);

      const { reservations } = response.body;
      expect(reservations.map((reservation) => reservation.id)).toContain(later.body.reservation.id);
      expect(reservations).toEqual(expect.arrayContaining([
        expect.objectContaining({ reservation_date: bookedDate, reservation_time: BOOKABLE_TIME })
      ]));

      const slots = reservations.map((reservation) => `${reservation.reservation_date} ${reservation.reservation_time}`);
      expect(slots).toEqual([...slots].sort());
    });

    test('GET / answers an empty list for a caller who holds no booking, never 403', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(response.body).toEqual({ reservations: [] });
    });
  });

  describe('API-scoped terminal handlers', () => {
    test('GET on an unknown path under /api answers 404 ROUTE_NOT_FOUND', async () => {
      const response = await request(app).get('/api/unknown-path').expect(404);

      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(response.body.error.message).toBe('The requested API route does not exist.');
      expect('details' in response.body.error).toBe(false);
    });

    test('an unsupported method on an API path answers 404 ROUTE_NOT_FOUND', async () => {
      const response = await request(app).post('/api/categories').expect(404);

      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    test('an unknown path outside /api keeps the Express default 404', async () => {
      const response = await request(app).get('/not-an-api-path').expect(404);

      expect(response.body.error).toBeUndefined();
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('order service with injected doubles', () => {
    test('prices the order from the item rows and returns the projection', () => {
      const { service, orders, items } = createServiceFixture();
      orders.createWithLines.mockReturnValue(storedOrder());

      const order = service.createOrder({
        userId: USER_ID,
        items: [
          { menu_item_id: ITEM_A.id, quantity: 2, unit_price_cents: 1 },
          { menu_item_id: ITEM_B.id, quantity: 1 }
        ]
      });

      expect(items.findManyByIds).toHaveBeenCalledWith([ITEM_A.id, ITEM_B.id]);

      // Only the two accepted fields travel, so the client's price has no path in.
      expect(orders.createWithLines).toHaveBeenCalledWith({
        id: expect.stringMatching(UUID_V4_PATTERN),
        userId: USER_ID,
        status: 'confirmed',
        notes: null,
        createdAt: FIXED_NOW.toISOString(),
        lines: [
          { menuItemId: ITEM_A.id, quantity: 2 },
          { menuItemId: ITEM_B.id, quantity: 1 }
        ]
      });

      expect(Object.keys(order).sort()).toEqual(['created_at', 'id', 'lines', 'notes', 'status', 'total_cents']);
      expect(order).toEqual({
        id: ORDER_ID,
        status: 'confirmed',
        total_cents: 2147,
        notes: null,
        created_at: FIXED_NOW.toISOString(),
        lines: [
          {
            id: 'line-1', menu_item_id: ITEM_A.id, name: ITEM_A.name,
            quantity: 2, unit_price_cents: 899, line_total_cents: 1798
          },
          {
            id: 'line-2', menu_item_id: ITEM_B.id, name: ITEM_B.name,
            quantity: 1, unit_price_cents: 349, line_total_cents: 349
          }
        ]
      });
    });

    test('looks the distinct item ids up once when a line repeats an item', () => {
      const { service, orders, items } = createServiceFixture();

      service.createOrder({
        userId: USER_ID,
        items: [
          { menu_item_id: ITEM_A.id, quantity: 1 },
          { menu_item_id: ITEM_A.id, quantity: 2 }
        ]
      });

      expect(items.findManyByIds).toHaveBeenCalledWith([ITEM_A.id]);
      expect(orders.createWithLines.mock.calls[0][0].lines).toEqual([
        { menuItemId: ITEM_A.id, quantity: 1 },
        { menuItemId: ITEM_A.id, quantity: 2 }
      ]);
    });

    test('stores a non-string note as text and an absent note as null', () => {
      const { service, orders } = createServiceFixture();
      const lines = [{ menu_item_id: ITEM_A.id, quantity: 1 }];

      service.createOrder({ userId: USER_ID, items: lines, notes: 42 });
      expect(orders.createWithLines.mock.calls[0][0].notes).toBe('42');

      service.createOrder({ userId: USER_ID, items: lines, notes: null });
      expect(orders.createWithLines.mock.calls[1][0].notes).toBeNull();
    });

    test('reads the system clock when no clock is injected', () => {
      const orders = { createWithLines: jest.fn(() => storedOrder()) };
      const items = { findManyByIds: jest.fn(() => [ITEM_A]) };
      const service = createOrderService({ orders, items });

      service.createOrder({ userId: USER_ID, items: [{ menu_item_id: ITEM_A.id, quantity: 1 }] });

      const { createdAt } = orders.createWithLines.mock.calls[0][0];
      expect(Number.isNaN(Date.parse(createdAt))).toBe(false);
      expect(Math.abs(Date.now() - Date.parse(createdAt))).toBeLessThan(60000);
    });

    test('answers 409 MENU_ITEM_UNAVAILABLE for an item the menu switched off', () => {
      const { service, orders } = createServiceFixture({
        itemRows: [{ ...ITEM_B, is_available: 0 }]
      });

      const error = captureError(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_B.id, quantity: 1 }]
      }));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('MENU_ITEM_UNAVAILABLE');
      expect(error.status).toBe(409);
      expect(error.message).toContain(ITEM_B.name);
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });

    test('answers 404 MENU_ITEM_NOT_FOUND for an id no item carries', () => {
      const { service, orders } = createServiceFixture({ itemRows: [ITEM_A] });

      const error = captureError(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_B.id, quantity: 1 }]
      }));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('MENU_ITEM_NOT_FOUND');
      expect(error.status).toBe(404);
      expect(error.message).toContain(ITEM_B.id);
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });

    test('reports the unknown item, not the unavailable one, when a request names both', () => {
      const { service } = createServiceFixture({
        itemRows: [{ ...ITEM_A, is_available: 0 }]
      });

      const error = captureError(() => service.createOrder({
        userId: USER_ID,
        items: [
          { menu_item_id: ITEM_A.id, quantity: 1 },
          { menu_item_id: ITEM_B.id, quantity: 1 }
        ]
      }));

      expect(error.code).toBe('MENU_ITEM_NOT_FOUND');
    });

    test.each([
      ['no line set at all', undefined, [{ field: 'items', issue: 'must_be_a_non_empty_array' }]],
      ['an empty line set', [], [{ field: 'items', issue: 'must_be_a_non_empty_array' }]],
      ['a line set that is not an array', 'one burger', [{ field: 'items', issue: 'must_be_a_non_empty_array' }]],
      ['a line that is not an object', [null], [
        { field: 'items[0].menu_item_id', issue: 'invalid_uuid' },
        { field: 'items[0].quantity', issue: 'must_be_an_integer_between_1_and_20' }
      ]],
      ['a line naming a malformed id and no usable quantity', [{ menu_item_id: 'abc', quantity: 0 }], [
        { field: 'items[0].menu_item_id', issue: 'invalid_uuid' },
        { field: 'items[0].quantity', issue: 'must_be_an_integer_between_1_and_20' }
      ]],
      ['a line past the quantity limit', [{ menu_item_id: ITEM_A.id, quantity: 21 }], [
        { field: 'items[0].quantity', issue: 'must_be_an_integer_between_1_and_20' }
      ]],
      ['a line with a fractional quantity', [{ menu_item_id: ITEM_A.id, quantity: 1.5 }], [
        { field: 'items[0].quantity', issue: 'must_be_an_integer_between_1_and_20' }
      ]]
    ])('answers 400 VALIDATION_ERROR for %s', (label, requestedLines, details) => {
      const { service, orders, items } = createServiceFixture();

      const error = captureError(() => service.createOrder({ userId: USER_ID, items: requestedLines }));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual(details);
      expect(items.findManyByIds).not.toHaveBeenCalled();
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });

    test('lists the orders the caller holds newest first, projecting every line', () => {
      const { service, orders } = createServiceFixture();
      const withoutLines = {
        id: 'older-order', status: 'completed', total_cents: 0, notes: 'no notes',
        created_at: '2025-05-01T10:00:00.000Z'
      };
      orders.listByUser.mockReturnValue([storedOrder(), withoutLines]);

      const listed = service.listOrders({ userId: USER_ID });

      expect(orders.listByUser).toHaveBeenCalledWith(USER_ID);
      expect(listed[0].lines).toEqual(storedOrder().lines.map((line) => ({
        id: line.id,
        menu_item_id: line.menu_item_id,
        name: line.name,
        quantity: line.quantity,
        unit_price_cents: line.unit_price_cents,
        line_total_cents: line.line_total_cents
      })));
      // An order the repository assembled without lines still projects an array.
      expect(listed[1]).toEqual({
        id: 'older-order', status: 'completed', total_cents: 0, notes: 'no notes',
        created_at: '2025-05-01T10:00:00.000Z', lines: []
      });
    });

    test('reads one order through the user-scoped lookup', () => {
      const { service, orders } = createServiceFixture();
      orders.findByIdForUser.mockReturnValue(storedOrder());

      const order = service.getOrder({ id: ORDER_ID, userId: USER_ID });

      expect(orders.findByIdForUser).toHaveBeenCalledWith(ORDER_ID, USER_ID);
      expect(Object.keys(order).sort()).toEqual(['created_at', 'id', 'lines', 'notes', 'status', 'total_cents']);
      expect(order.id).toBe(ORDER_ID);
      expect(order.total_cents).toBe(2147);
      expect(order.lines).toHaveLength(2);
    });

    test('answers 404 ORDER_NOT_FOUND instead of 403 for an id the caller does not hold', () => {
      const { service } = createServiceFixture();

      const error = captureError(() => service.getOrder({ id: 'no-such-order', userId: USER_ID }));

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('ORDER_NOT_FOUND');
      expect(error.status).toBe(404);
      expect(error.message).toContain('no-such-order');
    });
  });

  describe('order service wired to the real repositories', () => {
    test('prices an order from the seeded menu_items row, ignoring a client price', async () => {
      const listed = await request(app).get('/api/menu-items').expect(200);
      const seeded = listed.body.items[0];
      // Real accounts: orders.user_id is a foreign key into users.
      const owner = (await registerAccount()).response.body.user;
      const stranger = (await registerAccount()).response.body.user;
      const { orderService } = require('../../src/services/order.service');

      const order = orderService.createOrder({
        userId: owner.id,
        items: [{ menu_item_id: seeded.id, quantity: 2, unit_price_cents: 1 }]
      });

      // The stored price_cents decides both figures, and the order total.
      expect(order.total_cents).toBe(seeded.price_cents * 2);
      expect(order.lines).toEqual([{
        id: expect.stringMatching(UUID_V4_PATTERN),
        menu_item_id: seeded.id,
        name: seeded.name,
        quantity: 2,
        unit_price_cents: seeded.price_cents,
        line_total_cents: seeded.price_cents * 2
      }]);

      expect(orderService.listOrders({ userId: owner.id })).toEqual([order]);
      expect(orderService.getOrder({ id: order.id, userId: owner.id })).toEqual(order);

      // The read is scoped to its owner in SQL, so another caller's id is a 404.
      const foreign = captureError(() => orderService.getOrder({ id: order.id, userId: stranger.id }));
      expect(foreign.code).toBe('ORDER_NOT_FOUND');
      expect(foreign.status).toBe(404);
    });
  });
});
