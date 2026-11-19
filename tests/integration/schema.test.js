/**
 * @fileoverview Integration tests for the persistence contract: the schema held
 * in `src/db/schema.sql` and the reference data `src/db/seed.js` inserts into an
 * empty database. A real better-sqlite3 file is created outside the repository
 * and the schema is applied from the file itself, because foreign-key
 * enforcement is a per-connection pragma and the table and index set is what
 * SQLite actually recorded rather than what the SQL text appears to say.
 * @module tests/integration/schema
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');
const { seedIfEmpty } = require('../../src/db/seed');

const SCHEMA_PATH = path.join(__dirname, '../../src/db/schema.sql');
const SCHEMA_SQL = fs.readFileSync(SCHEMA_PATH, 'utf8');

const EXPECTED_TABLES = [
  'auth_tokens', 'categories', 'menu_items', 'order_line_items', 'orders', 'reservations', 'users'
];

const EXPECTED_INDEXES = [
  { name: 'idx_menu_items_category', table: 'menu_items', columns: ['category_id'] },
  { name: 'idx_orders_user_date', table: 'orders', columns: ['user_id', 'created_at'] },
  { name: 'idx_reservations_user_date', table: 'reservations', columns: ['user_id', 'reservation_date'] },
  { name: 'idx_auth_tokens_token_hash', table: 'auth_tokens', columns: ['token_hash'] }
];

const FOREIGN_KEY_FAILURE = /FOREIGN KEY constraint failed/;

const TABLE_QUERY =
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name";

/**
 * Lists the user tables the database holds, SQLite's own internal objects aside.
 * @param {import('better-sqlite3').Database} db - Open handle
 * @returns {string[]} Table names in ascending order
 */
const tableNames = (db) => db.prepare(TABLE_QUERY).all().map((row) => row.name);

/**
 * Snapshots a seeded table's primary keys so a later call can prove that not one
 * row was replaced. The table name is always one of the two literals the seed
 * owns; no user input reaches the statement.
 * @param {import('better-sqlite3').Database} db - Open handle
 * @param {'categories'|'menu_items'} table - Seeded table to read
 * @returns {string[]} Row ids in ascending order
 */
const rowIds = (db, table) =>
  db.prepare(`SELECT id FROM ${table} ORDER BY id`).all().map((row) => row.id);

/**
 * Counts the rows of a seeded table.
 * @param {import('better-sqlite3').Database} db - Open handle
 * @param {'categories'|'menu_items'} table - Seeded table to count
 * @returns {number} Row count
 */
const countRows = (db, table) => db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total;

describe('SQLite schema and seed', () => {
  let workDir;
  let db;

  // One database for the whole file: the tests below run in declaration order, so
  // the schema assertions see the tables before any row exists, the foreign-key
  // case has no parent rows to borrow, and the seed assertions run last.
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-schema-'));
    db = new Database(path.join(workDir, 'schema.db'));
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_SQL);
  });

  afterAll(() => {
    if (db && db.open) {
      db.close();
    }

    if (workDir) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  });

  describe('tables', () => {
    test('creates exactly the seven declared tables and no cart, session or migration table', () => {
      expect(tableNames(db)).toEqual(EXPECTED_TABLES);
    });

    test('creates no AUTOINCREMENT sequence table alongside them', () => {
      const sequence = db.prepare("SELECT name FROM sqlite_master WHERE name = 'sqlite_sequence'");
      expect(sequence.all()).toEqual([]);
    });
  });

  describe('indexes', () => {
    test.each(EXPECTED_INDEXES)('declares $name on $table over $columns', (expected) => {
      const entry = db
        .prepare("SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = ?")
        .get(expected.name);
      const columns = db.pragma(`index_info(${expected.name})`).map((column) => column.name);

      expect(entry).toEqual({ tbl_name: expected.table });
      expect(columns).toEqual(expected.columns);
    });
  });

  describe('foreign keys', () => {
    test('are enforced on the connection', () => {
      expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    });

    test('reject a menu item whose category does not exist', () => {
      const itemId = randomUUID();
      const insert = db.prepare(
        'INSERT INTO menu_items (id, category_id, name, description, price_cents) VALUES (?, ?, ?, ?, ?)'
      );
      const countById = db.prepare('SELECT COUNT(*) AS total FROM menu_items WHERE id = ?');

      expect(() => insert.run(itemId, 'no-such-category', 'Orphan Burger', 'No category.', 899)).toThrow(
        FOREIGN_KEY_FAILURE
      );
      expect(countById.get(itemId).total).toBe(0);
    });
  });

  describe('seed', () => {
    test('fills the empty tables with the menu reference data', () => {
      const firstResult = seedIfEmpty(db);

      expect(firstResult).toEqual({ skipped: false, categories: 6, items: 14 });
      expect(countRows(db, 'categories')).toBe(6);
      expect(countRows(db, 'menu_items')).toBe(14);
      expect(firstResult.categories).toBeGreaterThanOrEqual(5);
      expect(firstResult.items).toBeGreaterThanOrEqual(12);
    });

    test('seeds only priced items that carry a description, under unique category slugs', () => {
      const unpriced = db.prepare('SELECT COUNT(*) AS total FROM menu_items WHERE price_cents <= 0');
      const undescribed = db.prepare('SELECT COUNT(*) AS total FROM menu_items WHERE description IS NULL');
      const distinctSlugs = db.prepare('SELECT COUNT(DISTINCT slug) AS total FROM categories');

      expect(unpriced.get().total).toBe(0);
      expect(undescribed.get().total).toBe(0);
      expect(distinctSlugs.get().total).toBe(countRows(db, 'categories'));
    });

    test('gives every category at least one available item', () => {
      const availableItems = db.prepare(
        `SELECT c.slug FROM categories c WHERE NOT EXISTS (
           SELECT 1 FROM menu_items m WHERE m.category_id = c.id AND m.is_available = 1
         ) ORDER BY c.slug`
      );

      expect(availableItems.all().map((row) => row.slug)).toEqual([]);
    });

    test('is idempotent: a second seed skips and leaves every row in place', () => {
      const categoryIds = rowIds(db, 'categories');
      const itemIds = rowIds(db, 'menu_items');

      expect(seedIfEmpty(db)).toEqual({
        skipped: true,
        categories: categoryIds.length,
        items: itemIds.length
      });
      expect(rowIds(db, 'categories')).toEqual(categoryIds);
      expect(rowIds(db, 'menu_items')).toEqual(itemIds);
    });
  });

  describe('re-applying the schema', () => {
    test('raises nothing and changes nothing on a populated database', () => {
      const tables = tableNames(db);
      const categoryIds = rowIds(db, 'categories');
      const itemIds = rowIds(db, 'menu_items');

      expect(() => db.exec(SCHEMA_SQL)).not.toThrow();

      expect(tableNames(db)).toEqual(tables);
      expect(rowIds(db, 'categories')).toEqual(categoryIds);
      expect(rowIds(db, 'menu_items')).toEqual(itemIds);
    });
  });
});
