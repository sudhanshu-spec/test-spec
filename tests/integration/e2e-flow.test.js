/**
 * @fileoverview End-to-end customer journey through the Burger Restaurant API —
 * the suite that proves success criterion 1. One file, one ordered chain:
 * register, log in, read the session, browse the categories, filter the menu by
 * category, place an order with two line items, read that order back, book a
 * table, and read the booking back.
 *
 * Each step asserts the artefact it produces — the user projection, the tokens,
 * the chosen slug and prices, the order id, the reservation id — before the next
 * step consumes it, because a later step failing on something an earlier one did
 * not produce is the correct signal for a flow.
 *
 * The database is the suite's own file in the operating system's temporary
 * directory: DB_FILE is set before jest.resetModules() and before src/app is
 * required, so the configuration, the connection and the seed rows belong to this
 * suite alone and never to data/app.db. Nothing else is set, so the booking is
 * made under the default service window and horizon. The file and its WAL
 * companions are removed once the connection is closed.
 *
 * @module tests/integration/e2e-flow
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const previousDbFile = process.env.DB_FILE;
const dbFile = path.join(os.tmpdir(), `burger-e2e-${process.pid}-${Date.now()}.db`);
process.env.DB_FILE = dbFile;

jest.resetModules();

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** The four fields a user projection carries, in alphabetical order. */
const USER_KEYS = ['created_at', 'email', 'id', 'name'];

/** The four fields a category carries, in alphabetical order. */
const CATEGORY_KEYS = ['display_order', 'id', 'name', 'slug'];

/** The seven fields a menu item carries, in alphabetical order. */
const ITEM_KEYS = ['category', 'description', 'id', 'image_url', 'is_available', 'name', 'price_cents'];

/** The six fields an order carries, in alphabetical order. */
const ORDER_KEYS = ['created_at', 'id', 'lines', 'notes', 'status', 'total_cents'];

/** The six fields an order line carries, in alphabetical order. */
const LINE_KEYS = ['id', 'line_total_cents', 'menu_item_id', 'name', 'quantity', 'unit_price_cents'];

/** The seven fields a reservation carries, in alphabetical order. */
const RESERVATION_KEYS = [
  'created_at',
  'id',
  'notes',
  'party_size',
  'reservation_date',
  'reservation_time',
  'status'
];

/**
 * The column names no response body may carry, in stored or digest form. A
 * password hash, its salt and a token digest are server-side only (R-4).
 * @type {string[]}
 */
const SECRET_KEYS = ['password_hash', 'password_salt', 'token_hash'];

/**
 * The complete error vocabulary of src/errors.js, restated here because that
 * module is not this suite's to import. No code outside this list may appear in
 * a response this journey provokes (R-6).
 * @type {string[]}
 */
const ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'TOKEN_REQUIRED',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'EMAIL_ALREADY_REGISTERED',
  'CATEGORY_NOT_FOUND',
  'MENU_ITEM_NOT_FOUND',
  'MENU_ITEM_UNAVAILABLE',
  'ORDER_NOT_FOUND',
  'RESERVATION_CONFLICT',
  'ROUTE_NOT_FOUND',
  'INTERNAL_ERROR'
];

/** Shape of the opaque session token the authentication endpoints issue. */
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** Category floor the seeded catalog clears (six are seeded). */
const MINIMUM_CATEGORIES = 5;

/** Credentials the journey registers with and then logs in with. */
const ACCOUNT = { name: 'E2E Diner', password: 'burger-e2e-password' };

/** The note carried by the order and the booking, so the echo proves the round trip. */
const NOTE = 'e2e';

/** A bookable slot: on the half hour, inside 17:00-22:00 and before the 21:30 last seating. */
const BOOKING_TIME = '18:00';
const BOOKING_DAYS_AHEAD = 7;
const PARTY_SIZE = 2;

/** Quantities of the two ordered lines, so the totals assertion has one source. */
const FIRST_QUANTITY = 2;
const SECOND_QUANTITY = 1;

/** Response bodies the journey collects, one per successful call it makes. */
const EXPECTED_JOURNEY_BODIES = 10;

/** Number of addresses this suite has minted, so none repeats another's. */
let emailSequence = 0;

/**
 * An address no other suite and no earlier step of this journey uses.
 * @returns {string} A unique email address.
 */
function uniqueEmail() {
  emailSequence += 1;
  return `burger-e2e-${process.pid}-${Date.now()}-${emailSequence}@example.test`;
}

/** The account the whole journey runs as. */
const email = uniqueEmail();

/**
 * The value of the Authorization header carrying one token.
 * @param {string} token - Raw opaque token as the API issued it.
 * @returns {string} `Bearer <token>`.
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

/**
 * Formats a calendar date offset from today as YYYY-MM-DD.
 *
 * The local date getters are used deliberately: toISOString() renders the UTC
 * day, which can shift a booking into the past or outside the service window
 * depending on the machine's timezone.
 *
 * @param {number} offsetDays - Whole days from today.
 * @returns {string} The date, YYYY-MM-DD.
 */
function localIsoDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Journey state: what each step produces and the following steps consume.
 * @type {{user: (Object|null), registrationToken: string, token: string,
 *   categorySlug: string, items: Array<{id: string, price_cents: number}>,
 *   order: (Object|null), reservation: (Object|null), bodies: Object[]}}
 */
const state = {
  user: null,
  registrationToken: '',
  token: '',
  categorySlug: '',
  items: [],
  order: null,
  reservation: null,
  bodies: []
};

/**
 * Keeps a response body for the secret-hygiene step and returns it.
 * @param {SupertestResponse} response - Response whose body is kept.
 * @returns {Object} The parsed body.
 */
function captureBody(response) {
  state.bodies.push(response.body);
  return response.body;
}

/**
 * Asserts the single error envelope, the code it carries and that the code
 * belongs to the vocabulary. A missing resource carries no `details`, so the
 * `error` object holds the code and the message only.
 * @param {SupertestResponse} response - Failed response.
 * @param {string} expectedCode - Code the failure must carry.
 * @returns {void}
 */
function expectErrorEnvelope(response, expectedCode) {
  const { body } = response;

  expect(Object.keys(body)).toEqual(['error']);
  expect(Object.keys(body.error).sort()).toEqual(['code', 'message']);
  expect(body.error.code).toBe(expectedCode);
  expect(ERROR_CODES).toContain(body.error.code);
  expect(typeof body.error.message).toBe('string');
  expect(body.error.message.length).toBeGreaterThan(0);

  state.bodies.push(body);
}

describe('Burger Restaurant API end-to-end customer journey', () => {
  test('1. registers an account and answers a secret-free user with a fresh token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: ACCOUNT.name, email, password: ACCOUNT.password })
      .expect(201);

    const body = captureBody(response);

    expect(Object.keys(body).sort()).toEqual(['token', 'user']);
    expect(Object.keys(body.user).sort()).toEqual(USER_KEYS);
    expect(body.user.name).toBe(ACCOUNT.name);
    expect(body.user.email).toBe(email);
    expect(typeof body.user.id).toBe('string');
    expect(body.user.id.length).toBeGreaterThan(0);
    expect(body.token).toMatch(TOKEN_PATTERN);

    state.user = body.user;
    state.registrationToken = body.token;
  });

  test('2. logs in, mints a second token and reports the session that token belongs to', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: ACCOUNT.password })
      .expect(200);

    const body = captureBody(response);

    expect(Object.keys(body).sort()).toEqual(['token', 'user']);
    expect(Object.keys(body.user).sort()).toEqual(USER_KEYS);
    expect(body.user).toEqual(state.user);
    expect(body.token).toMatch(TOKEN_PATTERN);
    expect(body.token).not.toBe(state.registrationToken);

    state.token = body.token;

    const session = await request(app)
      .get('/api/auth/session')
      .set('Authorization', authHeader(state.token))
      .expect(200);
    const sessionBody = captureBody(session);

    expect(Object.keys(sessionBody)).toEqual(['user']);
    expect(sessionBody.user).toEqual(state.user);
  });

  test('3. lists the seeded categories in display order and keeps the first slug as the filter', async () => {
    const response = await request(app).get('/api/categories').expect(200);
    const body = captureBody(response);

    expect(Object.keys(body)).toEqual(['categories']);

    const { categories } = body;
    expect(categories.length).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);

    for (const category of categories) {
      expect(Object.keys(category).sort()).toEqual(CATEGORY_KEYS);
      expect(Number.isInteger(category.display_order)).toBe(true);
      expect(typeof category.slug).toBe('string');
      expect(category.slug.length).toBeGreaterThan(0);
    }

    const displayOrders = categories.map((category) => category.display_order);
    expect(displayOrders).toEqual([...displayOrders].sort((left, right) => left - right));

    state.categorySlug = categories[0].slug;
  });

  test('4. filters the menu by that category and records the two items it will order', async () => {
    const response = await request(app)
      .get('/api/menu-items')
      .query({ category: state.categorySlug })
      .expect(200);
    const body = captureBody(response);

    expect(Object.keys(body)).toEqual(['items']);

    const { items } = body;
    expect(items.length).toBeGreaterThanOrEqual(2);

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
      expect(item.category.slug).toBe(state.categorySlug);
      expect(Number.isInteger(item.price_cents)).toBe(true);
      expect(item.price_cents).toBeGreaterThan(0);
      expect(item.is_available).toBe(true);
    }

    state.items = items.slice(0, 2).map((item) => ({ id: item.id, price_cents: item.price_cents }));

    expect(state.items).toHaveLength(2);
    expect(state.items[0].id).not.toBe(state.items[1].id);
  });

  test('5. places an order whose totals the API computed from the stored prices', async () => {
    const [firstItem, secondItem] = state.items;

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', authHeader(state.token))
      .send({
        items: [
          { menu_item_id: firstItem.id, quantity: FIRST_QUANTITY },
          { menu_item_id: secondItem.id, quantity: SECOND_QUANTITY }
        ],
        notes: NOTE
      })
      .expect(201);
    const body = captureBody(response);

    expect(Object.keys(body)).toEqual(['order']);

    const { order } = body;
    expect(Object.keys(order).sort()).toEqual(ORDER_KEYS);
    expect(order.status).toBe('confirmed');
    expect(order.notes).toBe(NOTE);
    expect(typeof order.id).toBe('string');
    expect(order.total_cents).toBe(
      FIRST_QUANTITY * firstItem.price_cents + SECOND_QUANTITY * secondItem.price_cents
    );
    expect(order.lines).toHaveLength(2);

    const linesByItemId = new Map(order.lines.map((line) => [line.menu_item_id, line]));
    expect([...linesByItemId.keys()].sort()).toEqual([firstItem.id, secondItem.id].sort());

    const lines = [
      { item: firstItem, quantity: FIRST_QUANTITY },
      { item: secondItem, quantity: SECOND_QUANTITY }
    ];

    for (const { item, quantity } of lines) {
      expect(linesByItemId.get(item.id)).toEqual({
        id: expect.any(String),
        menu_item_id: item.id,
        name: expect.any(String),
        quantity,
        unit_price_cents: item.price_cents,
        line_total_cents: quantity * item.price_cents
      });
    }

    expect(Object.keys(linesByItemId.get(firstItem.id)).sort()).toEqual(LINE_KEYS);

    state.order = order;
  });

  test('6. reads the placed order back through both order reads, exactly as it was created', async () => {
    const single = await request(app)
      .get(`/api/orders/${state.order.id}`)
      .set('Authorization', authHeader(state.token))
      .expect(200);
    const singleBody = captureBody(single);

    expect(Object.keys(singleBody)).toEqual(['order']);
    expect(singleBody.order).toEqual(state.order);

    const list = await request(app)
      .get('/api/orders')
      .set('Authorization', authHeader(state.token))
      .expect(200);
    const listBody = captureBody(list);

    expect(Object.keys(listBody)).toEqual(['orders']);

    const listed = listBody.orders.find((order) => order.id === state.order.id);
    expect(listed).toEqual(state.order);
  });

  test('7. books a table inside the service window and has the booking confirmed', async () => {
    const payload = {
      reservation_date: localIsoDate(BOOKING_DAYS_AHEAD),
      reservation_time: BOOKING_TIME,
      party_size: PARTY_SIZE,
      notes: NOTE
    };

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', authHeader(state.token))
      .send(payload)
      .expect(201);
    const body = captureBody(response);

    expect(Object.keys(body)).toEqual(['reservation']);

    const { reservation } = body;
    expect(Object.keys(reservation).sort()).toEqual(RESERVATION_KEYS);
    expect(reservation.status).toBe('confirmed');
    expect(reservation.reservation_date).toBe(payload.reservation_date);
    expect(reservation.reservation_time).toBe(payload.reservation_time);
    expect(reservation.party_size).toBe(PARTY_SIZE);
    expect(reservation.notes).toBe(NOTE);

    state.reservation = reservation;
  });

  test('8. reads the booking back from the reservation list, in date-then-time order', async () => {
    const response = await request(app)
      .get('/api/reservations')
      .set('Authorization', authHeader(state.token))
      .expect(200);
    const body = captureBody(response);

    expect(Object.keys(body)).toEqual(['reservations']);

    const { reservations } = body;
    const listed = reservations.find((reservation) => reservation.id === state.reservation.id);
    expect(listed).toEqual(state.reservation);

    const slots = reservations.map(
      (reservation) => `${reservation.reservation_date} ${reservation.reservation_time}`
    );
    expect(slots).toEqual([...slots].sort());
  });

  test('9. carries no password hash, salt or token digest in any response of the journey', () => {
    expect(state.bodies).toHaveLength(EXPECTED_JOURNEY_BODIES);

    const serialised = JSON.stringify(state.bodies);
    for (const secretKey of SECRET_KEYS) {
      expect(serialised).not.toContain(secretKey);
    }
  });

  test('10. answers an unknown order id with the 404 ORDER_NOT_FOUND envelope and no other key', async () => {
    const response = await request(app)
      .get(`/api/orders/${randomUUID()}`)
      .set('Authorization', authHeader(state.token))
      .expect(404);

    expectErrorEnvelope(response, 'ORDER_NOT_FOUND');
  });

  afterAll(() => {
    require('../../src/db').closeDb();

    for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        // Never created, or already removed: there is nothing left to clean up.
      }
    }

    if (previousDbFile === undefined) {
      delete process.env.DB_FILE;
    } else {
      process.env.DB_FILE = previousDbFile;
    }
  });
});

