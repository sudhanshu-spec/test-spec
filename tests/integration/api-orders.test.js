/**
 * @fileoverview HTTP integration tests for the three authenticated order
 * endpoints — POST /api/orders, GET /api/orders and GET /api/orders/:id —
 * driven through Supertest against the application src/app.js exports, over a
 * database file of this suite's own under the operating system's temporary
 * directory.
 *
 * The suite pins the three contracts and the two rules that make ordering safe:
 *
 * - Prices are computed server-side. Each line is priced from the stored
 *   `menu_items.price_cents` inside the order transaction, so a client-supplied
 *   unit price, line total or order total is inert (R-3).
 * - Every read and write is scoped to the caller the Bearer token resolves to,
 *   so another caller's order is answered exactly like an id that names no order
 *   at all, never with 403 (R-5).
 *
 * A request that mixes a valid line with an unknown item is the rollback proof:
 * it is answered 404 and leaves the caller's order count unchanged, because the
 * order and its lines are written in one transaction.
 *
 * DB_FILE is set before jest.resetModules() and before any module that reads it
 * is loaded, so this suite's configuration, database connection and app are its
 * own; nothing here reads, writes or assumes the existence of `data/app.db` or
 * any other suite's state. The file and its WAL and shared-memory companions are
 * removed once the suite ends, and the previous DB_FILE value is restored.
 *
 * @module tests/integration/api-orders
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** The order keys the API contract fixes, in alphabetical order. */
const ORDER_KEYS = ['created_at', 'id', 'lines', 'notes', 'status', 'total_cents'];

/** The line keys the API contract fixes, in alphabetical order. */
const LINE_KEYS = ['id', 'line_total_cents', 'menu_item_id', 'name', 'quantity', 'unit_price_cents'];

/** The keys every error envelope carries, in alphabetical order. */
const ERROR_KEYS = ['code', 'message'];

/** The keys a validation failure's envelope carries, in alphabetical order. */
const VALIDATION_ERROR_KEYS = ['code', 'details', 'message'];

/** Smallest quantity one order line may carry, as the router and service bound it. */
const MIN_QUANTITY = 1;

/** Largest quantity one order line may carry, as the router and service bound it. */
const MAX_QUANTITY = 20;

/** Shape of an id minted by `crypto.randomUUID()`, which the API issues. */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * The DB_FILE this suite's process already carried, restored once the suite ends
 * so a later suite in the same worker inherits what it would have seen.
 * @type {string|undefined}
 */
const previousDbFile = process.env.DB_FILE;

/**
 * The database file this suite owns: a unique name under the operating system's
 * temporary directory, so it is outside the checkout and cannot collide with
 * another suite's file.
 * @type {string}
 */
const dbFile = path.join(os.tmpdir(), `burger-api-orders-${process.pid}-${Date.now()}.db`);

// Set before the module registry is reset and before anything that reads the
// configuration is required: src/config/index.js evaluates DB_FILE when it is
// required, so the value must be in place first. DB_FILE is the only environment
// variable this suite sets.
process.env.DB_FILE = dbFile;

jest.resetModules();

const request = require('supertest');
const app = require('../../src/app');
const { closeDb, getDb } = require('../../src/db');
const { ERROR_CODES } = require('../../src/errors');

/**
 * The three accounts this suite registers, each `{token, user}` once the
 * beforeAll hook has run: A and B place orders, C never does, so its empty
 * history proves that a caller who holds no order is not an error.
 * @type {{A: (Object|null), B: (Object|null), C: (Object|null)}}
 */
const sessions = { A: null, B: null, C: null };

/**
 * Ids of the orders this suite created successfully, by account label, so a
 * history response can be compared with what the suite placed rather than with a
 * count another test could disturb.
 * @type {{A: Array<string>, B: Array<string>, C: Array<string>}}
 */
const placedOrderIds = { A: [], B: [], C: [] };

/** Number of addresses minted so far, so no registration repeats another's. */
let emailSequence = 0;

/**
 * An address no other registration in this suite used.
 * @param {string} label - Account label, kept in the address to aid diagnosis.
 * @returns {string} A unique email address.
 */
function nextEmail(label) {
  emailSequence += 1;
  return `api.orders.${label}.${process.pid}.${emailSequence}@example.com`;
}

/**
 * Registration input that satisfies every documented rule.
 * @param {string} label - Account label, kept in the name to aid diagnosis.
 * @returns {{name: string, email: string, password: string}} The credentials.
 */
function credentialsFor(label) {
  return { name: `Order Caller ${label}`, email: nextEmail(label), password: 'orders-and-burgers' };
}

/**
 * Registers an account and opens a session on it.
 *
 * Registration issues a token of its own; logging in afterwards is what proves
 * the suite authenticates with a credential obtained the way a returning visitor
 * obtains one, so every order request below carries a login token.
 *
 * @param {string} label - Account label used in the address and the name.
 * @returns {Promise<{token: string, user: Object}>} The login token and the
 *   public user projection it belongs to.
 */
async function openSession(label) {
  const credentials = credentialsFor(label);
  const registered = await request(app).post('/api/auth/register').send(credentials);

  expect(registered.status).toBe(201);
  expect(typeof registered.body.token).toBe('string');

  const loggedIn = await request(app)
    .post('/api/auth/login')
    .send({ email: credentials.email, password: credentials.password });

  expect(loggedIn.status).toBe(200);
  expect(typeof loggedIn.body.token).toBe('string');

  return { token: loggedIn.body.token, user: loggedIn.body.user };
}

/**
 * The `Authorization` header value carrying `token`.
 * @param {string} token - Raw session token.
 * @returns {string} The header value, `Bearer <token>`.
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

/**
 * Posts an order body on the given account's credential.
 * @param {string} token - Raw session token of the caller.
 * @param {Object} payload - Request body, sent exactly as built.
 * @returns {Promise<SupertestResponse>} The create-order response.
 */
function postOrder(token, payload) {
  return request(app).post('/api/orders').set('Authorization', authHeader(token)).send(payload);
}

/**
 * Requests the caller's own order history.
 * @param {string} token - Raw session token of the caller.
 * @returns {Promise<SupertestResponse>} The list-orders response.
 */
function listOrders(token) {
  return request(app).get('/api/orders').set('Authorization', authHeader(token));
}

/**
 * Requests one order by id on the given account's credential.
 * @param {string} token - Raw session token of the caller.
 * @param {string} id - Order id to read from the path.
 * @returns {Promise<SupertestResponse>} The read-order response.
 */
function getOrder(token, id) {
  return request(app).get(`/api/orders/${id}`).set('Authorization', authHeader(token));
}

/**
 * How many orders the caller's history holds now, counted over HTTP so it is the
 * number a client sees.
 * @param {string} token - Raw session token of the caller.
 * @returns {Promise<number>} Length of the caller's `orders` array.
 */
async function orderCount(token) {
  const response = await listOrders(token);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.orders)).toBe(true);

  return response.body.orders.length;
}

/**
 * Places an order for the named account, remembering the id of each order that
 * was actually created so a later history assertion can compare sets.
 * @param {string} label - Account label, a key of {@link sessions}.
 * @param {Object} payload - Request body for POST /api/orders.
 * @returns {Promise<SupertestResponse>} The create-order response.
 */
async function placeOrder(label, payload) {
  const response = await postOrder(sessions[label].token, payload);

  if (response.status === 201) {
    placedOrderIds[label].push(response.body.order.id);
  }

  return response;
}

/**
 * The id of an order the named account holds, placing one when it holds none, so
 * a test that needs an existing order does not depend on another test having run.
 * @param {string} label - Account label, a key of {@link sessions}.
 * @returns {Promise<string>} An order id that account owns.
 */
async function orderIdFor(label) {
  if (placedOrderIds[label].length === 0) {
    const { items } = await menuIndex();
    const created = await placeOrder(label, { items: [{ menu_item_id: items[0].id, quantity: 1 }] });

    expect(created.status).toBe(201);
  }

  return placedOrderIds[label][0];
}

/**
 * The orders rows currently stored, counted directly on this suite's connection,
 * so the rollback proof does not rest on the same read path it complements.
 * @returns {number} Number of rows in `orders`.
 */
function storedOrderCount() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM orders').get().total;
}

/**
 * The available menu items the catalog endpoint serves, read at test time so no
 * id and no price is hard-coded, together with an id-keyed index of them.
 * @returns {Promise<{items: Array<Object>, byId: Map<string, Object>}>} The items,
 *   in the order the endpoint returns them, and the index.
 */
async function menuIndex() {
  const response = await request(app).get('/api/menu-items');

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.items)).toBe(true);
  expect(response.body.items.length).toBeGreaterThanOrEqual(2);

  const items = response.body.items;

  return { items, byId: new Map(items.map((item) => [item.id, item])) };
}

/**
 * The total the API must compute for `lines`: each quantity multiplied by the
 * price_cents the menu endpoint reported for that item.
 * @param {Map<string, Object>} byId - Menu items indexed by id.
 * @param {Array<{menu_item_id: string, quantity: number}>} lines - Ordered lines.
 * @returns {number} The expected order total, in integer cents.
 */
function expectedTotalCents(byId, lines) {
  return lines.reduce((sum, line) => sum + byId.get(line.menu_item_id).price_cents * line.quantity, 0);
}

/**
 * The `field` values a validation failure names, in the order it names them.
 * @param {SupertestResponse} response - Response carrying the error envelope.
 * @returns {Array<string>} The named fields.
 */
function detailFields(response) {
  expect(response.body.error).toBeDefined();
  expect(Array.isArray(response.body.error.details)).toBe(true);

  return response.body.error.details.map((detail) => detail.field);
}

/**
 * Asserts that `response` is the documented failure envelope for `code`.
 *
 * Both the HTTP status and the `code` string are asserted, and the status is
 * checked against the vocabulary in src/errors.js rather than a literal, so a
 * failure can never be answered with a status that does not belong to its code.
 * `details` must be present for a validation failure and absent otherwise, and
 * must name each offending field.
 *
 * @param {SupertestResponse} response - Response to assert.
 * @param {number} status - Expected HTTP status.
 * @param {string} code - Expected member of {@link ERROR_CODES}.
 * @returns {void}
 */
function expectError(response, status, code) {
  expect(Object.prototype.hasOwnProperty.call(ERROR_CODES, code)).toBe(true);
  expect(ERROR_CODES[code]).toBe(status);
  expect(response.status).toBe(status);
  expect(response.body).toBeDefined();
  expect(Object.keys(response.body)).toEqual(['error']);

  const failure = response.body.error;

  expect(failure.code).toBe(code);
  expect(typeof failure.message).toBe('string');
  expect(failure.message.length).toBeGreaterThan(0);

  if (code === 'VALIDATION_ERROR') {
    expect(Object.keys(failure).sort()).toEqual(VALIDATION_ERROR_KEYS);
    expect(failure.details.length).toBeGreaterThan(0);
    failure.details.forEach((detail) => {
      expect(Object.keys(detail).sort()).toEqual(['field', 'issue']);
      expect(typeof detail.field).toBe('string');
      expect(typeof detail.issue).toBe('string');
    });
  } else {
    expect(Object.keys(failure).sort()).toEqual(ERROR_KEYS);
  }
}

/**
 * `body` with the requested order id blanked out of its message.
 *
 * ORDER_NOT_FOUND's human-readable message echoes the id that was asked for, so
 * two requests naming *different* ids cannot be byte-identical however the
 * ownership check behaves. Blanking that one echoed value compares everything
 * the envelope says about why the request failed, which is what ownership must
 * not change.
 *
 * @param {Object} body - Parsed response body carrying the error envelope.
 * @param {string} id - Id echoed in that body's message.
 * @returns {Object} A copy whose message no longer carries the id.
 */
function withoutEchoedId(body, id) {
  return { ...body, error: { ...body.error, message: body.error.message.split(id).join('<id>') } };
}

beforeAll(async () => {
  sessions.A = await openSession('A');
  sessions.B = await openSession('B');
  sessions.C = await openSession('C');
});

afterAll(() => {
  // The connection has to be released before the file can be removed, and the
  // WAL and shared-memory companions follow the database file.
  closeDb();

  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${dbFile}${suffix}`, { force: true });
  }

  if (previousDbFile === undefined) {
    delete process.env.DB_FILE;
  } else {
    process.env.DB_FILE = previousDbFile;
  }
});

describe('POST /api/orders', () => {
  describe('placing an order', () => {
    test('prices every line from the menu and sums the order total', async () => {
      const { items, byId } = await menuIndex();
      const lines = [
        { menu_item_id: items[0].id, quantity: 2 },
        { menu_item_id: items[1].id, quantity: 3 }
      ];

      const response = await placeOrder('A', { items: lines });

      expect(response.status).toBe(201);
      expect(typeof response.headers['content-type']).toBe('string');
      expect(response.headers['content-type']).toMatch(/application\/json/);

      const order = response.body.order;

      expect(Object.keys(order).sort()).toEqual(ORDER_KEYS);
      expect(order.id).toMatch(UUID_V4_PATTERN);
      expect(order.status).toBe('confirmed');
      expect(order.notes).toBeNull();
      expect(typeof order.created_at).toBe('string');
      expect(Number.isInteger(order.total_cents)).toBe(true);
      expect(order.total_cents).toBe(expectedTotalCents(byId, lines));
      expect(order.lines).toHaveLength(lines.length);
      expect(order.lines.map((line) => line.menu_item_id).sort())
        .toEqual(lines.map((line) => line.menu_item_id).sort());

      order.lines.forEach((line) => {
        const ordered = byId.get(line.menu_item_id);

        expect(Object.keys(line).sort()).toEqual(LINE_KEYS);
        expect(line.id).toMatch(UUID_V4_PATTERN);
        expect(line.name).toBe(ordered.name);
        expect(Number.isInteger(line.unit_price_cents)).toBe(true);
        expect(Number.isInteger(line.line_total_cents)).toBe(true);
        expect(line.unit_price_cents).toBe(ordered.price_cents);
        expect(line.line_total_cents).toBe(line.quantity * line.unit_price_cents);
      });
    });

    test('ignores a client-supplied unit price, line total and order total', async () => {
      const { items, byId } = await menuIndex();
      const lines = [
        { menu_item_id: items[0].id, quantity: 1 },
        { menu_item_id: items[1].id, quantity: 2 }
      ];
      const serverTotal = expectedTotalCents(byId, lines);
      const tamperedItems = lines.map((line) => ({
        menu_item_id: line.menu_item_id,
        quantity: line.quantity,
        unit_price_cents: 1,
        price_cents: 1,
        line_total_cents: 1
      }));

      const response = await placeOrder('A', { items: tamperedItems, total_cents: 1 });

      expect(response.status).toBe(201);

      const order = response.body.order;

      // R-3: the posted amounts are inert, so every figure is the stored price.
      expect(order.total_cents).toBe(serverTotal);
      expect(serverTotal).toBeGreaterThan(1);
      order.lines.forEach((line) => {
        expect(line.unit_price_cents).toBe(byId.get(line.menu_item_id).price_cents);
        expect(line.unit_price_cents).toBeGreaterThan(1);
        expect(line.line_total_cents).toBe(line.quantity * line.unit_price_cents);
      });
    });

    test('echoes the notes it was given', async () => {
      const { items } = await menuIndex();
      const notes = 'No onions, extra pickles, knocks twice.';

      const response = await placeOrder('A', {
        items: [{ menu_item_id: items[0].id, quantity: 1 }],
        notes
      });

      expect(response.status).toBe(201);
      expect(response.body.order.notes).toBe(notes);
    });

    test('stores the order so the caller reads it back unchanged', async () => {
      const { items } = await menuIndex();
      const created = await placeOrder('A', { items: [{ menu_item_id: items[0].id, quantity: 2 }] });

      expect(created.status).toBe(201);

      const read = await getOrder(sessions.A.token, created.body.order.id);

      expect(read.status).toBe(200);
      expect(read.body.order).toEqual(created.body.order);
    });
  });

  describe('rejecting an invalid request', () => {
    test('rejects an empty items array', async () => {
      const response = await postOrder(sessions.B.token, { items: [] });

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(detailFields(response)).toContain('items');
    });

    test('rejects a body with no items key', async () => {
      const response = await postOrder(sessions.B.token, { notes: 'nothing to order' });

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(detailFields(response)).toContain('items');
    });

    test('rejects a request that carries no body at all', async () => {
      const response = await request(app).post('/api/orders').set('Authorization', authHeader(sessions.B.token));

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(detailFields(response)).toContain('items');
    });

    test('rejects a menu item id that is not a UUID', async () => {
      const response = await postOrder(sessions.B.token, { items: [{ menu_item_id: 'not-a-uuid', quantity: 1 }] });

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(detailFields(response)).toEqual(['items[0].menu_item_id']);
    });

    test.each([
      ['below the minimum', MIN_QUANTITY - 1],
      ['above the maximum', MAX_QUANTITY + 1],
      ['not a whole number', 2.5]
    ])('rejects a quantity %s', async (_label, quantity) => {
      const { items } = await menuIndex();

      const response = await postOrder(sessions.B.token, {
        items: [{ menu_item_id: items[0].id, quantity }]
      });

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(detailFields(response)).toEqual(['items[0].quantity']);
    });

    test('reports every offending line in one response', async () => {
      const response = await postOrder(sessions.B.token, {
        items: [
          { menu_item_id: 'not-a-uuid', quantity: 0 },
          { menu_item_id: crypto.randomUUID(), quantity: MAX_QUANTITY + 1 }
        ]
      });

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(detailFields(response)).toEqual(['items[0].menu_item_id', 'items[0].quantity', 'items[1].quantity']);
    });

    test('creates no order for a rejected request', async () => {
      const before = await orderCount(sessions.B.token);

      const response = await postOrder(sessions.B.token, { items: [] });

      expectError(response, 400, 'VALIDATION_ERROR');
      expect(await orderCount(sessions.B.token)).toBe(before);
    });
  });

  describe('refusing items the menu cannot supply', () => {
    test('answers MENU_ITEM_NOT_FOUND for an id that names no item', async () => {
      const before = await orderCount(sessions.B.token);
      const storedBefore = storedOrderCount();

      const response = await postOrder(sessions.B.token, {
        items: [{ menu_item_id: crypto.randomUUID(), quantity: 1 }]
      });

      expectError(response, 404, 'MENU_ITEM_NOT_FOUND');
      expect(await orderCount(sessions.B.token)).toBe(before);
      expect(storedOrderCount()).toBe(storedBefore);
    });

    test('answers MENU_ITEM_UNAVAILABLE for an item that is not available', async () => {
      const { items } = await menuIndex();
      const unavailable = items[0];
      const db = getDb();

      db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = ?').run(unavailable.id);

      try {
        const response = await postOrder(sessions.B.token, {
          items: [{ menu_item_id: unavailable.id, quantity: 1 }]
        });

        expectError(response, 409, 'MENU_ITEM_UNAVAILABLE');
        expect(db.prepare('SELECT is_available FROM menu_items WHERE id = ?').get(unavailable.id).is_available)
          .toBe(0);
      } finally {
        // A leaked zero would make every later test fail for the wrong reason.
        db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = ?').run(unavailable.id);
      }

      expect(db.prepare('SELECT is_available FROM menu_items WHERE id = ?').get(unavailable.id).is_available)
        .toBe(1);
    });

    test('writes nothing when one line names an unknown item', async () => {
      const { items } = await menuIndex();
      const before = await orderCount(sessions.B.token);
      const storedBefore = storedOrderCount();

      const response = await postOrder(sessions.B.token, {
        items: [
          { menu_item_id: items[0].id, quantity: 1 },
          { menu_item_id: crypto.randomUUID(), quantity: 2 }
        ]
      });

      // The rollback proof: the valid line must not survive the unknown one.
      expectError(response, 404, 'MENU_ITEM_NOT_FOUND');
      expect(await orderCount(sessions.B.token)).toBe(before);
      expect(storedOrderCount()).toBe(storedBefore);
    });
  });

  describe('requiring a session', () => {
    /**
     * The three order routes, each built without a credential so the two guards
     * below differ only in the header they add.
     * @type {Array<[string, function(): Object]>}
     */
    const protectedRoutes = [
      ['POST /api/orders', () => request(app).post('/api/orders').send({ items: [] })],
      ['GET /api/orders', () => request(app).get('/api/orders')],
      ['GET /api/orders/:id', () => request(app).get(`/api/orders/${crypto.randomUUID()}`)]
    ];

    test.each(protectedRoutes)('%s answers TOKEN_REQUIRED without a credential', async (_route, build) => {
      const response = await build();

      expectError(response, 401, 'TOKEN_REQUIRED');
    });

    test.each(protectedRoutes)('%s answers TOKEN_INVALID for an unknown credential', async (_route, build) => {
      const response = await build().set('Authorization', authHeader('not-a-real-token'));

      expectError(response, 401, 'TOKEN_INVALID');
    });
  });
});

describe('GET /api/orders', () => {
  test('lists exactly the caller\'s own orders and none belonging to anyone else', async () => {
    const ownedByA = await orderIdFor('A');
    const ownedByB = await orderIdFor('B');

    const responseA = await listOrders(sessions.A.token);
    const responseB = await listOrders(sessions.B.token);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(Object.keys(responseA.body)).toEqual(['orders']);
    expect(Object.keys(responseB.body)).toEqual(['orders']);

    const idsA = responseA.body.orders.map((order) => order.id);
    const idsB = responseB.body.orders.map((order) => order.id);

    expect([...idsA].sort()).toEqual([...placedOrderIds.A].sort());
    expect([...idsB].sort()).toEqual([...placedOrderIds.B].sort());
    expect(idsA).toContain(ownedByA);
    expect(idsB).toContain(ownedByB);
    idsB.forEach((id) => expect(idsA).not.toContain(id));
    idsA.forEach((id) => expect(idsB).not.toContain(id));
    responseA.body.orders.forEach((order) => {
      expect(Object.keys(order).sort()).toEqual(ORDER_KEYS);
    });
  });

  test('lists the caller\'s orders newest first', async () => {
    const { items } = await menuIndex();

    await orderIdFor('A');

    const latest = await placeOrder('A', { items: [{ menu_item_id: items[0].id, quantity: 1 }] });

    expect(latest.status).toBe(201);

    const response = await listOrders(sessions.A.token);

    expect(response.status).toBe(200);
    expect(response.body.orders.length).toBeGreaterThanOrEqual(2);

    const timestamps = response.body.orders.map((order) => Date.parse(order.created_at));

    timestamps.forEach((instant) => expect(Number.isNaN(instant)).toBe(false));
    for (let index = 1; index < timestamps.length; index += 1) {
      expect(timestamps[index - 1]).toBeGreaterThanOrEqual(timestamps[index]);
    }
  });

  test('answers an empty array for a caller who has never ordered', async () => {
    const response = await listOrders(sessions.C.token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ orders: [] });
  });
});

describe('GET /api/orders/:id', () => {
  test('returns one of the caller\'s own orders in the documented shape', async () => {
    const orderId = await orderIdFor('A');

    const response = await getOrder(sessions.A.token, orderId);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(['order']);
    expect(Object.keys(response.body.order).sort()).toEqual(ORDER_KEYS);
    expect(response.body.order.id).toBe(orderId);
    expect(response.body.order.lines.length).toBeGreaterThan(0);
    response.body.order.lines.forEach((line) => {
      expect(Object.keys(line).sort()).toEqual(LINE_KEYS);
    });
  });

  test('answers another caller\'s order exactly like an id that names no order', async () => {
    const foreignId = await orderIdFor('B');
    const missingId = crypto.randomUUID();

    const foreign = await getOrder(sessions.A.token, foreignId);
    const missing = await getOrder(sessions.A.token, missingId);

    expectError(foreign, 404, 'ORDER_NOT_FOUND');
    expectError(missing, 404, 'ORDER_NOT_FOUND');

    // R-5: for the same id, an owner's peer and a caller who owns nothing must be
    // answered byte for byte alike, so ownership leaves no trace in the response.
    const asOtherNonOwner = await getOrder(sessions.C.token, foreignId);

    expect(asOtherNonOwner.status).toBe(404);
    expect(asOtherNonOwner.body).toEqual(foreign.body);

    // The message echoes the id that was asked for, so the two ids above cannot
    // match byte for byte; with that one value blanked, nothing else may differ.
    expect(withoutEchoedId(foreign.body, foreignId)).toEqual(withoutEchoedId(missing.body, missingId));
  });

  test('rejects an id that is not a UUID', async () => {
    const response = await getOrder(sessions.A.token, 'not-a-uuid');

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(detailFields(response)).toEqual(['id']);
  });
});
