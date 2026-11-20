/**
 * @fileoverview Integration tests for the orders + order_line_items accessor
 * (src/repositories/order.repository.js), exercised through its public API
 * { createWithLines, listByUser, findByIdForUser } against a real SQLite
 * database: the order and its lines written in one transaction with every unit
 * price taken from menu_items, the server-computed line and order totals, a
 * caller-supplied price ignored, the transaction rolled back with a refusal result —
 * never a raised domain error — when a line names an unknown or unavailable item, the
 * per-user scoping of both reads, the
 * menu-item-name ordering of a stored order's lines, the newest-first ordering of a
 * user's history with created_at ties broken by id descending, a history larger than
 * SQLite's 32766-variable ceiling returned whole, and the defaults applied to an order
 * stored without an id, status, notes or createdAt. The database
 * file lives in a directory the suite creates under the operating system's temporary
 * directory, outside the checkout.
 *
 * @module tests/integration/order-repository
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The orders columns the suite reads back independently of the repository. */
const ORDER_COLUMNS = ['id', 'user_id', 'status', 'total_cents', 'notes', 'created_at'].join(', ');

/** Shape of the UUIDv4 the module mints for an order or a line it stores. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** ISO-8601 instant with milliseconds in UTC, the form createdAt defaults to. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Temporary directory the suite's database file lives in. */
let workDir;

/** Counter that gives every users row its own id and email. */
let userSequence = 0;

/** The repository under test and the accessor it opens its connection through. */
let repository;
let getDb;

/**
 * Loads a pristine instance of src/repositories/order.repository.js configured to
 * open `file`.
 *
 * jest.resetModules() gives the suite its own copies of the configuration, the
 * database module and both repositories, so the memoised connection is its own.
 * The configuration object is mutated rather than replaced, because
 * src/db/index.js reads config.dbFile off it on every getDb() call.
 *
 * @param {string} file - Absolute path the module must open as its database.
 * @returns {{repository: Object, getDb: Function}} The repository and the accessor.
 */
function loadOrderRepository(file) {
  jest.resetModules();

  const config = require('../../src/config');
  config.dbFile = file;

  const databaseModule = require('../../src/db');
  loadedModules.push({ closeDb: databaseModule.closeDb });

  return {
    repository: require('../../src/repositories/order.repository'),
    getDb: databaseModule.getDb
  };
}

/**
 * Inserts one users row so an order has an owner to reference.
 *
 * orders.user_id is a FOREIGN KEY on users(id) and the connection enforces it, so
 * an order cannot be stored for a user that does not exist. The row is written
 * directly on the open handle: this suite tests the orders tables, and the users
 * repository has its own suite.
 *
 * @returns {string} The id of the user just created.
 */
function createUser() {
  const index = ++userSequence;
  const id = `user-${index}`;

  getDb()
    .prepare(
      'INSERT INTO users (id, name, email, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, `Diner ${index}`, `diner.${index}@example.com`, 'a'.repeat(64), 'b'.repeat(32));

  return id;
}

/**
 * Reads `limit` available menu items straight from the seeded menu.
 *
 * The seeded catalogue is what prices an order, so the suite reads the same rows
 * the repository will read rather than hard-coding names or prices.
 *
 * @param {number} [limit] - How many items to take.
 * @returns {Array<Object>} Rows of id, name and price_cents, by name.
 */
function availableItems(limit = 2) {
  return getDb()
    .prepare(
      'SELECT id, name, price_cents FROM menu_items WHERE is_available = 1 ORDER BY name ASC LIMIT ?'
    )
    .all(limit);
}

/**
 * Reads the seeded menu item the catalogue marks unavailable.
 *
 * @returns {Object} Row of id, name and price_cents for an unavailable item.
 */
function unavailableItem() {
  return getDb()
    .prepare('SELECT id, name, price_cents FROM menu_items WHERE is_available = 0 ORDER BY name ASC')
    .get();
}

/**
 * Reads one orders row independently of the repository.
 *
 * @param {string} id - Order id to read.
 * @returns {Object|undefined} The stored row, or undefined when nothing was written.
 */
const storedOrder = (id) =>
  getDb().prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`).get(id);

/**
 * Counts the line items one order holds.
 *
 * @param {string} orderId - Order to count for.
 * @returns {number} Line count; 0 when no line was written.
 */
const countLines = (orderId) =>
  getDb()
    .prepare('SELECT COUNT(*) AS total FROM order_line_items WHERE order_id = ?')
    .get(orderId).total;

/**
 * Counts the orders one user holds.
 *
 * @param {string} userId - Owner to count for.
 * @returns {number} Order count.
 */
const countOrdersFor = (userId) =>
  getDb().prepare('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?').get(userId).total;

/**
 * Runs `operation` and returns the error it threw, or null when it threw nothing.
 *
 * @param {Function} operation - The call expected to throw.
 * @returns {Error|null} The thrown error, or null.
 */
const captureError = (operation) => {
  try {
    operation();
    return null;
  } catch (error) {
    return error;
  }
};

describe('order repository module (src/repositories/order.repository.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-order-repository-'));
    ({ repository, getDb } = loadOrderRepository(path.join(workDir, 'app.db')));
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every instance the suite loaded is safe.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  test('exports exactly the three accessors its consumer calls', () => {
    expect(Object.keys(repository)).toEqual(['createWithLines', 'listByUser', 'findByIdForUser']);
  });

  describe('createWithLines()', () => {
    test('stores the order and its lines, pricing every line from menu_items', () => {
      const userId = createUser();
      const [first, second] = availableItems(2);

      const order = repository.createWithLines({
        userId,
        lines: [
          { menuItemId: first.id, quantity: 2 },
          { menuItemId: second.id, quantity: 3 }
        ]
      });

      const expectedTotal = first.price_cents * 2 + second.price_cents * 3;
      const row = storedOrder(order.id);

      expect(row.total_cents).toBe(expectedTotal);
      expect(order.total_cents).toBe(expectedTotal);
      expect(order.status).toBe('confirmed');
      expect(order.notes).toBeNull();
      expect(order.lines).toHaveLength(2);
      expect(order.lines.map((line) => line.menu_item_id).sort()).toEqual(
        [first.id, second.id].sort()
      );

      const linesByName = new Map(
        [first, second].map((item) => [item.id, item])
      );

      for (const line of order.lines) {
        const item = linesByName.get(line.menu_item_id);

        expect(line.name).toBe(item.name);
        expect(line.quantity).toBe(item.id === first.id ? 2 : 3);
        expect(line.unit_price_cents).toBe(item.price_cents);
        expect(line.line_total_cents).toBe(item.price_cents * line.quantity);
        expect(line.id).toMatch(UUID_V4);
      }

      expect(countLines(order.id)).toBe(2);
    });

    test('applies the documented defaults for id, status, notes and createdAt', () => {
      const userId = createUser();
      const [item] = availableItems(1);

      const order = repository.createWithLines({
        userId,
        lines: [{ menuItemId: item.id, quantity: 1 }]
      });

      expect(order.id).toMatch(UUID_V4);
      expect(order.status).toBe('confirmed');
      expect(order.notes).toBeNull();
      expect(order.created_at).toMatch(ISO_INSTANT);
      expect(storedOrder(order.id)).toMatchObject({ id: order.id, user_id: userId });
    });

    test('stores a supplied id, status, notes and createdAt verbatim', () => {
      const userId = createUser();
      const [item] = availableItems(1);

      const order = repository.createWithLines({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        userId,
        status: 'preparing',
        notes: 'No pickles.',
        createdAt: '2099-03-04T05:06:07.890Z',
        lines: [{ menuItemId: item.id, quantity: 4 }]
      });

      expect(order).toMatchObject({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        status: 'preparing',
        notes: 'No pickles.',
        created_at: '2099-03-04T05:06:07.890Z',
        total_cents: item.price_cents * 4
      });
    });

    test('ignores a caller-supplied price, line total and order total', () => {
      const userId = createUser();
      const [item] = availableItems(1);

      const order = repository.createWithLines({
        userId,
        total_cents: 1,
        lines: [{ menuItemId: item.id, quantity: 2, price_cents: 1, unit_price_cents: 1 }]
      });

      expect(order.total_cents).toBe(item.price_cents * 2);
      expect(order.lines[0].unit_price_cents).toBe(item.price_cents);
      expect(order.lines[0].line_total_cents).toBe(item.price_cents * 2);
      expect(storedOrder(order.id).total_cents).toBe(item.price_cents * 2);
    });

    test('prices repeated lines for the same item independently', () => {
      const userId = createUser();
      const [item] = availableItems(1);

      const order = repository.createWithLines({
        userId,
        lines: [
          { menuItemId: item.id, quantity: 1 },
          { menuItemId: item.id, quantity: 2 }
        ]
      });

      expect(order.lines).toHaveLength(2);
      expect(order.total_cents).toBe(item.price_cents * 3);
      expect(order.lines.map((line) => line.unit_price_cents)).toEqual([
        item.price_cents,
        item.price_cents
      ]);
    });

    test('stores an order with no lines as an empty line list', () => {
      const userId = createUser();

      const order = repository.createWithLines({ userId });

      expect(order.lines).toEqual([]);
      expect(order.total_cents).toBe(0);
      expect(countLines(order.id)).toBe(0);
    });

    test('writes no order when the call carries no owner at all', () => {
      const ordersBefore = getDb().prepare('SELECT COUNT(*) AS total FROM orders').get().total;

      const error = captureError(() => repository.createWithLines());

      // The schema's NOT NULL user_id rejects it; the transaction leaves no row.
      // Asserted through the driver's code, not instanceof: the native driver's
      // error comes from another realm, so a realm comparison is not reliable.
      expect(error.code).toBe('SQLITE_CONSTRAINT_NOTNULL');
      expect(getDb().prepare('SELECT COUNT(*) AS total FROM orders').get().total).toBe(ordersBefore);
    });

    test('leaves no order behind and refuses with NOT_FOUND for a line naming an unknown item', () => {
      const userId = createUser();
      const [item] = availableItems(1);
      const unknownId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const ordersBefore = countOrdersFor(userId);

      // The repository raises no domain error: it answers with the refusal the
      // service maps to the documented 404, and the rollback leaves no row.
      const refusal = repository.createWithLines({
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        userId,
        lines: [
          { menuItemId: item.id, quantity: 1 },
          { menuItemId: unknownId, quantity: 1 }
        ]
      });

      expect(refusal).toMatchObject({ ok: false, reason: 'MENU_ITEM_NOT_FOUND', menuItemId: unknownId });
      expect(countOrdersFor(userId)).toBe(ordersBefore);
      expect(storedOrder('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e')).toBeUndefined();
      expect(countLines('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e')).toBe(0);
    });

    test('leaves no order behind and refuses with UNAVAILABLE for a line naming an unavailable item', () => {
      const userId = createUser();
      const [item] = availableItems(1);
      const unavailable = unavailableItem();
      const ordersBefore = countOrdersFor(userId);

      const refusal = repository.createWithLines({
        id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
        userId,
        lines: [
          { menuItemId: item.id, quantity: 1 },
          { menuItemId: unavailable.id, quantity: 1 }
        ]
      });

      expect(refusal).toMatchObject({
        ok: false,
        reason: 'MENU_ITEM_UNAVAILABLE',
        menuItemId: unavailable.id,
        itemName: unavailable.name
      });
      expect(countOrdersFor(userId)).toBe(ordersBefore);
      expect(storedOrder('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f')).toBeUndefined();
    });

    test('refuses with NOT_FOUND, and writes nothing, when both kinds are named', () => {
      const userId = createUser();
      const unavailable = unavailableItem();
      const unknownId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const ordersBefore = countOrdersFor(userId);

      // The unavailable item is named first, so only an existence pass over every
      // id before any availability decision yields the documented 404.
      const refusal = repository.createWithLines({
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
        userId,
        lines: [
          { menuItemId: unavailable.id, quantity: 1 },
          { menuItemId: unknownId, quantity: 1 }
        ]
      });

      expect(refusal).toMatchObject({ ok: false, reason: 'MENU_ITEM_NOT_FOUND', menuItemId: unknownId });
      expect(countOrdersFor(userId)).toBe(ordersBefore);
      expect(storedOrder('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80')).toBeUndefined();
      expect(countLines('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80')).toBe(0);
    });
  });

  describe('line order of a stored order', () => {
    test('returns the lines sorted by menu item name, the same way on every placement', () => {
      const userId = createUser();
      // availableItems() reads the seeded catalogue in name order, so the cart
      // below names the very same items in the opposite order.
      const byName = availableItems(3);
      const expectedNames = byName.map((item) => item.name);
      const cart = byName
        .slice()
        .reverse()
        .map((item, index) => ({ menuItemId: item.id, quantity: index + 1 }));

      expect(expectedNames).toHaveLength(3);

      const placements = [0, 1, 2].map(() => repository.createWithLines({ userId, lines: cart }));
      const nameSequences = placements.map((order) => order.lines.map((line) => line.name));

      // Cart order does not decide line order, and the same cart never varies.
      nameSequences.forEach((names) => expect(names).toEqual(expectedNames));

      // The single-order read behind GET /api/orders/:id reports the same order.
      expect(
        repository.findByIdForUser(placements[0].id, userId).lines.map((line) => line.name)
      ).toEqual(expectedNames);
    });
  });

  describe('findByIdForUser()', () => {
    test('returns the order with its lines to its owner', () => {
      const userId = createUser();
      const [item] = availableItems(1);
      const created = repository.createWithLines({
        userId,
        lines: [{ menuItemId: item.id, quantity: 2 }]
      });

      const found = repository.findByIdForUser(created.id, userId);

      expect(found).toEqual(created);
    });

    test('returns null for another user and for an unknown id', () => {
      const ownerId = createUser();
      const otherId = createUser();
      const [item] = availableItems(1);
      const created = repository.createWithLines({
        userId: ownerId,
        lines: [{ menuItemId: item.id, quantity: 1 }]
      });

      expect(repository.findByIdForUser(created.id, otherId)).toBeNull();
      expect(repository.findByIdForUser('ffffffff-ffff-4fff-8fff-ffffffffffff', ownerId)).toBeNull();
    });
  });

  describe('listByUser()', () => {
    test('lists only the caller\u2019s orders, newest first', () => {
      const ownerId = createUser();
      const otherId = createUser();
      const [item] = availableItems(1);

      const older = repository.createWithLines({
        userId: ownerId,
        createdAt: '2099-01-01T10:00:00.000Z',
        lines: [{ menuItemId: item.id, quantity: 1 }]
      });
      const newer = repository.createWithLines({
        userId: ownerId,
        createdAt: '2099-01-02T10:00:00.000Z',
        lines: [{ menuItemId: item.id, quantity: 2 }]
      });
      const foreign = repository.createWithLines({
        userId: otherId,
        lines: [{ menuItemId: item.id, quantity: 3 }]
      });

      const ownerOrders = repository.listByUser(ownerId);
      const otherOrders = repository.listByUser(otherId);

      expect(ownerOrders.map((order) => order.id)).toEqual([newer.id, older.id]);
      expect(ownerOrders[0].lines).toHaveLength(1);
      expect(otherOrders.map((order) => order.id)).toEqual([foreign.id]);
      expect(ownerOrders.map((order) => order.id)).not.toContain(foreign.id);
    });

    test('breaks a created_at tie by id descending', () => {
      const userId = createUser();
      const [item] = availableItems(1);
      const lowerId = '11111111-1111-4111-8111-111111111111';
      const higherId = '99999999-9999-4999-8999-999999999999';
      const createdAt = '2099-02-02T08:00:00.000Z';

      // The higher id is written first, so insertion order and id order disagree:
      // only the tie-break makes which of the two is reported first predictable.
      repository.createWithLines({
        id: higherId,
        userId,
        createdAt,
        lines: [{ menuItemId: item.id, quantity: 1 }]
      });
      repository.createWithLines({
        id: lowerId,
        userId,
        createdAt,
        lines: [{ menuItemId: item.id, quantity: 1 }]
      });

      expect(repository.listByUser(userId).map((order) => order.id)).toEqual([higherId, lowerId]);
    });

    test('returns an empty array for a user with no orders', () => {
      expect(repository.listByUser(createUser())).toEqual([]);
    });

    test('returns a history past SQLite\u2019s 32766-variable ceiling with every line', () => {
      const userId = createUser();
      const [item] = availableItems(1);
      // 32767 is one more than SQLITE_MAX_VARIABLE_NUMBER (32766), so an unbatched
      // IN list of this user's own order ids would exceed the bound and fail.
      const total = 32767;
      const orderId = (index) => `ffffffff-0000-4000-8000-${String(index).padStart(12, '0')}`;

      // Written straight on the open handle, the way createUser() writes its row:
      // 32767 createWithLines calls would take far longer than this one insert loop.
      getDb().transaction(() => {
        const insertOrder = getDb().prepare(
          'INSERT INTO orders (id, user_id, status, total_cents, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const insertLine = getDb().prepare(
          'INSERT INTO order_line_items (id, order_id, menu_item_id, quantity, unit_price_cents, '
            + 'line_total_cents) VALUES (?, ?, ?, ?, ?, ?)'
        );

        for (let index = 0; index < total; index += 1) {
          insertOrder.run(orderId(index), userId, 'confirmed', item.price_cents, null,
            new Date(Date.UTC(2050, 0, 1) + index).toISOString());
          insertLine.run(
            `eeeeeeee-0000-4000-8000-${String(index).padStart(12, '0')}`, orderId(index),
            item.id, 1, item.price_cents, item.price_cents
          );
        }
      })();

      expect(countOrdersFor(userId)).toBe(total);

      const orders = repository.listByUser(userId);
      const misreported = orders.filter((order) => order.lines.some(
        (line) => line.name !== item.name || line.quantity !== 1
          || line.unit_price_cents !== item.price_cents
      ));

      // No order of the history is dropped and none comes back with a partial line list.
      expect(orders).toHaveLength(total);
      expect(orders.reduce((count, order) => count + order.lines.length, 0)).toBe(total);
      expect(misreported).toEqual([]);
    });
  });
});
