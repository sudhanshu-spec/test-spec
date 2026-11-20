/**
 * @fileoverview Integration tests for the persistence contract: the tables and
 * indexes `src/db/schema.sql` declares, the foreign-key, CHECK and UNIQUE
 * constraints those tables enforce, the reference data `src/db/seed.js` inserts
 * into an empty database, and the idempotency of both across a close and
 * re-open.
 *
 * The suite reaches the database only through the two functions
 * `src/db/index.js` exports, because foreign-key enforcement is a per-connection
 * pragma: the constraints are real only on the connection the repositories use,
 * so a private handle would prove nothing about them. No HTTP and no repository
 * is involved.
 * @module tests/integration/schema
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// DB_FILE is set before the module registry is reset and before src/db is
// required, so the src/config copy the database module reads points at this
// suite's own file instead of data/app.db. No other variable is set.
const previousDbFile = process.env.DB_FILE;
const dbFile = path.join(os.tmpdir(), `burger-schema-${process.pid}-${Date.now()}.db`);
process.env.DB_FILE = dbFile;

jest.resetModules();

const { getDb, closeDb } = require('../../src/db');

/** The seven tables the schema declares — no cart table and no migration table. */
const EXPECTED_TABLES = [
  'auth_tokens',
  'categories',
  'menu_items',
  'order_line_items',
  'orders',
  'reservations',
  'users'
];

/** The three declared index access paths, with the table and columns each covers. */
const EXPECTED_INDEXES = [
  { name: 'idx_menu_items_category', table: 'menu_items', columns: ['category_id'] },
  { name: 'idx_order_line_items_order', table: 'order_line_items', columns: ['order_id'] },
  { name: 'idx_orders_user_date', table: 'orders', columns: ['user_id', 'created_at'] }
];

/**
 * The two access paths that need no declared index because a UNIQUE constraint
 * already builds one, keyed by the table that carries the constraint and valued
 * by the columns its index covers. SQLite names these indexes itself
 * (sqlite_autoindex_<table>_<n>) and that ordinal shifts as constraints are
 * added, so they are found through the table's index list, never by name.
 * @type {Readonly<Array<[string, string[]]>>}
 */
const CONSTRAINT_BACKED_INDEXES = Object.freeze([
  ['auth_tokens', ['token_hash']],
  ['reservations', ['user_id', 'reservation_date', 'reservation_time']]
]);

/** The four order statuses the orders CHECK constraint admits. */
const ORDER_STATUSES = ['confirmed', 'preparing', 'completed', 'cancelled'];

/**
 * The three constraint families this suite exercises, keyed by the name the
 * call sites pass. better-sqlite3 reports the violated family twice: in the
 * `code` of the error it raises and as the fixed prefix of that error's message.
 * Both are asserted, so a write refused for a different reason is not read as the
 * intended violation.
 * @type {Readonly<Object<string, {code: string, message: RegExp}>>}
 */
const CONSTRAINT_FAILURES = Object.freeze({
  foreignKey: { code: 'SQLITE_CONSTRAINT_FOREIGNKEY', message: /^FOREIGN KEY constraint failed/ },
  check: { code: 'SQLITE_CONSTRAINT_CHECK', message: /^CHECK constraint failed: / },
  unique: { code: 'SQLITE_CONSTRAINT_UNIQUE', message: /^UNIQUE constraint failed: / }
});

/** Seed floors: at least five categories and at least twelve menu items. */
const MINIMUM_CATEGORIES = 5;
const MINIMUM_ITEMS = 12;

/** Timestamp for the rows this suite writes by hand; both columns are NOT NULL. */
const FIXTURE_TIMESTAMP = '2024-01-01T00:00:00.000Z';

/**
 * The open, schema-applied, seeded connection.
 * @returns {Object} The memoised better-sqlite3 handle
 */
const db = () => getDb();

/**
 * Lists the tables the database holds, SQLite's own internal objects aside.
 * @returns {string[]} Table names in ascending order
 */
function tableNames() {
  return db()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
}

/**
 * Lists the named indexes the database holds. The auto-indexes SQLite creates for
 * a UNIQUE constraint carry an sqlite_autoindex prefix and are filtered out, so
 * what remains is the set schema.sql declares.
 * @returns {string[]} Index names in ascending order
 */
function indexNames() {
  return db()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
    .all()
    .map((row) => row.name)
    .filter((name) => !name.startsWith('sqlite_autoindex'));
}

/**
 * Counts the rows of a seeded table. The table name is always one of the two
 * literals the seed owns; no user input reaches the statement.
 * @param {'categories'|'menu_items'} table - Table to count
 * @returns {number} Row count
 */
function countRows(table) {
  return db().prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total;
}

/**
 * Inserts a user row and returns its id.
 * @param {string} email - Email to store; every fixture passes a distinct one
 * @returns {string} The inserted user's id
 */
function insertUser(email) {
  const id = randomUUID();

  db()
    .prepare(
      'INSERT INTO users (id, name, email, password_hash, password_salt, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      id,
      'Schema Fixture',
      email,
      'fixture-password-hash',
      'fixture-password-salt',
      FIXTURE_TIMESTAMP,
      FIXTURE_TIMESTAMP
    );

  return id;
}

/**
 * Inserts an order row and returns its id.
 * @param {{userId: string, status?: string, totalCents?: number}} order - Row values
 * @returns {string} The inserted order's id
 */
function insertOrder({ userId, status = 'confirmed', totalCents = 1499 }) {
  const id = randomUUID();

  db()
    .prepare('INSERT INTO orders (id, user_id, status, total_cents) VALUES (?, ?, ?, ?)')
    .run(id, userId, status, totalCents);

  return id;
}

/**
 * Inserts an order line row and returns its id.
 * @param {{orderId: string, menuItemId: string, quantity?: number,
 *   unitPriceCents?: number}} line - Row values
 * @returns {string} The inserted line's id
 */
function insertLineItem({ orderId, menuItemId, quantity = 1, unitPriceCents = 899 }) {
  const id = randomUUID();

  db()
    .prepare(
      'INSERT INTO order_line_items ' +
        '(id, order_id, menu_item_id, quantity, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(id, orderId, menuItemId, quantity, unitPriceCents, unitPriceCents * quantity);

  return id;
}

/**
 * Inserts a reservation row and returns its id.
 * @param {{userId: string, date: string, time: string, partySize?: number}} reservation - Row values
 * @returns {string} The inserted reservation's id
 */
function insertReservation({ userId, date, time, partySize = 2 }) {
  const id = randomUUID();

  db()
    .prepare(
      'INSERT INTO reservations (id, user_id, reservation_date, reservation_time, party_size) ' +
        'VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, userId, date, time, partySize);

  return id;
}

/**
 * A category id the seed created, for the menu items that need a parent row.
 * @returns {string} Seeded category id
 */
function seededCategoryId() {
  return db().prepare('SELECT id FROM categories ORDER BY display_order, id LIMIT 1').get().id;
}

/**
 * A menu item id the seed created, for the order lines that need a parent row.
 * @returns {string} Seeded menu item id
 */
function seededMenuItemId() {
  return db().prepare('SELECT id FROM menu_items ORDER BY id LIMIT 1').get().id;
}

/**
 * Asserts that a write is refused by the named table-constraint family. The error
 * the driver raises must carry that family's `code` and open its message with that
 * family's prefix, so an FK violation, a CHECK rejection, a binding error with no
 * driver code at all, or another constraint family's rejection each fail the
 * assertion instead of passing it.
 *
 * The match is on the driver's own `code` and message text, never on the error's
 * prototype: the driver registers its `SqliteError` constructor with the native
 * addon once per process, so whichever Jest context loads it first decides the
 * realm its prototype chain is built on, and an `instanceof` check would pass or
 * fail with the order the suites happen to run in.
 * @param {Function} write - Statement bound to its arguments, not yet run
 * @param {'foreignKey'|'check'|'unique'} family - Constraint family the write must violate
 * @returns {void}
 */
function expectConstraintError(write, family) {
  const expected = CONSTRAINT_FAILURES[family];

  expect(expected).toBeDefined();

  let failure;

  try {
    write();
  } catch (error) {
    failure = error;
  }

  expect(failure).toMatchObject({ code: expected.code, message: expect.stringMatching(expected.message) });
}

describe('SQLite schema and seed', () => {
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
        // released yet. Either way there is no assertion that depends on it.
      }
    }

    if (previousDbFile === undefined) {
      delete process.env.DB_FILE;
    } else {
      process.env.DB_FILE = previousDbFile;
    }
  });

  describe('tables', () => {
    test('holds exactly the seven declared tables and no cart or migration table', () => {
      expect(tableNames()).toEqual(EXPECTED_TABLES);
    });

    test('holds no AUTOINCREMENT sequence table', () => {
      expect(db().prepare("SELECT name FROM sqlite_master WHERE name = 'sqlite_sequence'").get()).toBeUndefined();
    });
  });

  describe('indexes', () => {
    test('declares exactly the three documented indexes', () => {
      expect(indexNames()).toEqual(EXPECTED_INDEXES.map((index) => index.name).sort());
    });

    test.each(EXPECTED_INDEXES)('builds $name on $table over its documented columns', (expected) => {
      const entry = db()
        .prepare("SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = ?")
        .get(expected.name);
      const columns = db()
        .pragma(`index_info(${expected.name})`)
        .map((column) => column.name);

      expect(entry).toEqual({ tbl_name: expected.table });
      expect(columns).toEqual(expected.columns);
    });

    test.each(CONSTRAINT_BACKED_INDEXES)(
      'serves %s through the unique index its constraint builds, not a declared index',
      (table, columns) => {
        const constraintIndexes = db()
          .pragma(`index_list(${table})`)
          .filter((index) => index.unique === 1 && index.origin !== 'pk');

        // The constraint's own index is the only access path left for this
        // table now that schema.sql declares none over these columns, so its
        // presence and its column list are what keep the lookup seekable.
        expect(constraintIndexes).toHaveLength(1);

        const constraintColumns = db()
          .pragma(`index_info(${constraintIndexes[0].name})`)
          .map((column) => column.name);

        expect(constraintColumns).toEqual(columns);
      }
    );
  });

  describe('connection pragmas', () => {
    test('enforces foreign keys on the connection', () => {
      expect(db().pragma('foreign_keys', { simple: true })).toBe(1);
    });

    test('journals in WAL mode', () => {
      expect(db().pragma('journal_mode', { simple: true })).toBe('wal');
    });
  });

  describe('seed minimums', () => {
    test('provides at least five categories and twelve menu items', () => {
      expect(countRows('categories')).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);
      expect(countRows('menu_items')).toBeGreaterThanOrEqual(MINIMUM_ITEMS);
    });

    test('prices every item in whole cents above zero', () => {
      const prices = db()
        .prepare('SELECT price_cents AS priceCents FROM menu_items')
        .all()
        .map((row) => row.priceCents);

      expect(prices).toHaveLength(countRows('menu_items'));
      expect(prices.filter((cents) => !Number.isInteger(cents) || cents <= 0)).toEqual([]);
    });

    test('gives every category a lowercase, unique, non-empty slug', () => {
      const slugs = db()
        .prepare('SELECT slug FROM categories')
        .all()
        .map((row) => row.slug);

      expect(slugs.length).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);
      expect(
        slugs.filter((slug) => typeof slug !== 'string' || slug.trim() === '' || slug !== slug.toLowerCase())
      ).toEqual([]);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    test('describes every item', () => {
      const undescribed = db()
        .prepare("SELECT id FROM menu_items WHERE description IS NULL OR trim(description) = ''")
        .all();

      expect(undescribed).toEqual([]);
    });

    test('attaches every item to a category row that exists', () => {
      const orphans = db()
        .prepare('SELECT m.id FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id WHERE c.id IS NULL')
        .all();

      expect(orphans).toEqual([]);
    });

    test('offers at least one item in every category', () => {
      const unstocked = db()
        .prepare(
          'SELECT c.slug FROM categories c WHERE NOT EXISTS ' +
            '(SELECT 1 FROM menu_items m WHERE m.category_id = c.id) ORDER BY c.slug'
        )
        .all()
        .map((row) => row.slug);

      expect(unstocked).toEqual([]);
    });

    test('sets a whole-number display_order on every category', () => {
      const displayOrders = db()
        .prepare('SELECT display_order AS displayOrder FROM categories')
        .all()
        .map((row) => row.displayOrder);

      expect(displayOrders.length).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);
      expect(displayOrders.filter((order) => !Number.isInteger(order))).toEqual([]);
    });
  });

  describe('foreign-key enforcement', () => {
    test('rejects a menu item whose category does not exist', () => {
      const itemId = randomUUID();
      const insert = () =>
        db()
          .prepare('INSERT INTO menu_items (id, category_id, name, description, price_cents) VALUES (?, ?, ?, ?, ?)')
          .run(itemId, 'no-such-category', 'Orphan Burger', 'No category.', 899);

      expectConstraintError(insert, 'foreignKey');
      expect(db().prepare('SELECT COUNT(*) AS total FROM menu_items WHERE id = ?').get(itemId).total).toBe(0);
    });

    test('rejects an order whose user does not exist', () => {
      const orderId = randomUUID();
      const insert = () =>
        db()
          .prepare('INSERT INTO orders (id, user_id, total_cents) VALUES (?, ?, ?)')
          .run(orderId, 'no-such-user', 1499);

      expectConstraintError(insert, 'foreignKey');
      expect(db().prepare('SELECT COUNT(*) AS total FROM orders WHERE id = ?').get(orderId).total).toBe(0);
    });
  });

  describe('CHECK constraints', () => {
    test('rejects a menu item priced at zero cents', () => {
      const insert = () =>
        db()
          .prepare('INSERT INTO menu_items (id, category_id, name, description, price_cents) VALUES (?, ?, ?, ?, ?)')
          .run(randomUUID(), seededCategoryId(), 'Free Burger', 'Priced at nothing.', 0);

      expectConstraintError(insert, 'check');
    });

    test('rejects an order line whose quantity is zero', () => {
      const orderId = insertOrder({ userId: insertUser(`line-${randomUUID()}@example.com`) });

      expectConstraintError(() => insertLineItem({ orderId, menuItemId: seededMenuItemId(), quantity: 0 }), 'check');
    });

    test.each([0, 13])('rejects a reservation for a party of %i', (partySize) => {
      const userId = insertUser(`party-${partySize}-${randomUUID()}@example.com`);

      expectConstraintError(() => insertReservation({ userId, date: '2099-06-01', time: '18:00', partySize }), 'check');
    });

    test('rejects a negative order total', () => {
      const userId = insertUser(`total-${randomUUID()}@example.com`);

      expectConstraintError(() => insertOrder({ userId, totalCents: -1 }), 'check');
    });

    test('admits exactly the four documented order statuses', () => {
      const userId = insertUser(`status-${randomUUID()}@example.com`);
      const acceptedIds = ORDER_STATUSES.map((status) => insertOrder({ userId, status }));

      expectConstraintError(() => insertOrder({ userId, status: 'shipped' }), 'check');

      const placeholders = acceptedIds.map(() => '?').join(', ');
      const stored = db()
        .prepare(`SELECT status FROM orders WHERE id IN (${placeholders}) ORDER BY status`)
        .all(...acceptedIds)
        .map((row) => row.status);

      expect(stored).toEqual([...ORDER_STATUSES].sort());

      // These rows exist only to prove the accepted vocabulary, so they are
      // removed again to leave the table as the earlier assertions found it.
      db().prepare(`DELETE FROM orders WHERE id IN (${placeholders})`).run(...acceptedIds);
    });
  });

  describe('UNIQUE constraints', () => {
    test('rejects a second account registered with the same email', () => {
      const email = `duplicate-${randomUUID()}@example.com`;
      insertUser(email);

      expectConstraintError(() => insertUser(email), 'unique');
      expect(db().prepare('SELECT COUNT(*) AS total FROM users WHERE email = ?').get(email).total).toBe(1);
    });

    test('rejects a duplicate slot for one user and admits it for another', () => {
      const firstUser = insertUser(`slot-a-${randomUUID()}@example.com`);
      const secondUser = insertUser(`slot-b-${randomUUID()}@example.com`);
      const date = '2099-07-04';
      const time = '19:30';

      insertReservation({ userId: firstUser, date, time, partySize: 2 });
      expectConstraintError(() => insertReservation({ userId: firstUser, date, time, partySize: 4 }), 'unique');
      insertReservation({ userId: secondUser, date, time, partySize: 2 });

      const booked = db()
        .prepare(
          'SELECT user_id AS userId FROM reservations ' +
            'WHERE reservation_date = ? AND reservation_time = ? ORDER BY user_id'
        )
        .all(date, time)
        .map((row) => row.userId);

      expect(booked).toEqual([firstUser, secondUser].sort());
    });
  });

  describe('idempotency', () => {
    test('re-opening the same file leaves the tables and the seed untouched', () => {
      const tables = tableNames();
      const categories = countRows('categories');
      const items = countRows('menu_items');

      closeDb();
      const reopened = getDb();

      expect(reopened.open).toBe(true);
      expect(tableNames()).toEqual(tables);
      expect(countRows('categories')).toBe(categories);
      expect(countRows('menu_items')).toBe(items);
    });

    test('closing an already closed database does not throw', () => {
      closeDb();

      expect(() => closeDb()).not.toThrow();
    });
  });
});
