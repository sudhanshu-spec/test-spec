/**
 * @fileoverview Integration tests for the database connection module
 * (src/db/index.js), exercised only through its public API { getDb, closeDb }
 * against a real SQLite file. The suite covers the lazy open, the creation of
 * the missing parent directory, the connection pragmas, the schema application,
 * the seed of the menu reference data, the memoised handle, the close and
 * re-open cycle, and the recovery of a failed open.
 *
 * Every test points config.dbFile at a directory created under the operating
 * system's temporary directory — outside the repository — so no run writes a
 * database file into the checkout.
 *
 * @module tests/integration/db-connection
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Module specifiers the suite loads fresh for each test. */
const CONFIG_MODULE = '../../src/config';
const DATABASE_MODULE = '../../src/db';
const SQLITE_MODULE = 'better-sqlite3';

/** The seven tables src/db/schema.sql declares, in the order sqlite_master lists them. */
const EXPECTED_TABLES = [
  'auth_tokens', 'categories', 'menu_items', 'order_line_items', 'orders', 'reservations', 'users'
];

/** Seed floor the specification fixes: at least five categories and twelve items. */
const MINIMUM_CATEGORIES = 5;
const MINIMUM_ITEMS = 12;

const TABLE_QUERY =
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name";

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Temporary directory the suite's database files live in. */
let workDir;

/**
 * Loads a pristine instance of src/db/index.js configured to open `dbFile`.
 *
 * jest.resetModules() gives the test its own copy of the module and therefore
 * its own empty connection memo, while the copy of src/config it reads is the
 * one this function mutates and the copy of better-sqlite3 it captures is the
 * one the database module itself loads — which is what lets a spy installed on
 * that class reach the handle the module opens.
 *
 * @param {string} dbFile - Absolute path the module must open as its database.
 * @returns {{getDb: Function, closeDb: Function, config: Object, Database: Function, dbFile: string}}
 *   The loaded module's two functions, its configuration object and its driver class.
 */
function loadDatabaseModule(dbFile) {
  jest.resetModules();

  // The configuration is mutated rather than overwritten: it is a live object
  // that src/db/index.js reads config.dbFile from on every getDb() call.
  const config = require(CONFIG_MODULE);
  config.dbFile = dbFile;

  const Database = require(SQLITE_MODULE);
  const databaseModule = require(DATABASE_MODULE);

  const loaded = {
    getDb: databaseModule.getDb,
    closeDb: databaseModule.closeDb,
    config,
    Database,
    dbFile
  };

  loadedModules.push(loaded);

  return loaded;
}

/**
 * Lists the user tables the open database holds, SQLite's own objects aside.
 * @param {Object} db - Open handle
 * @returns {string[]} Table names in ascending order
 */
const tableNames = (db) => db.prepare(TABLE_QUERY).all().map((row) => row.name);

/**
 * Counts the rows of a seeded table.
 * @param {Object} db - Open handle
 * @param {'categories'|'menu_items'} table - Seeded table to count
 * @returns {number} Row count
 */
const countRows = (db, table) => db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total;

/**
 * Snapshots a seeded table's primary keys so a later call can prove that not one
 * row was replaced. The table name is always one of the two literals the seed
 * owns; no user input reaches the statement.
 * @param {Object} db - Open handle
 * @param {'categories'|'menu_items'} table - Seeded table to read
 * @returns {string[]} Row ids in ascending order
 */
const rowIds = (db, table) =>
  db.prepare(`SELECT id FROM ${table} ORDER BY id`).all().map((row) => row.id);

describe('database connection module (src/db/index.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-db-connection-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every module the suite loaded is safe
    // whether or not a test already closed it.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe('requiring the module', () => {
    test('opens nothing and creates no file before the first getDb() call', () => {
      const dbFile = path.join(workDir, 'lazy', 'nested', 'app.db');
      const { getDb, closeDb } = loadDatabaseModule(dbFile);

      expect(typeof getDb).toBe('function');
      expect(typeof closeDb).toBe('function');
      expect(fs.existsSync(path.dirname(dbFile))).toBe(false);
      expect(fs.existsSync(dbFile)).toBe(false);
    });
  });

  describe('closeDb() before anything was opened', () => {
    test('is a no-op and creates no database file', () => {
      const dbFile = path.join(workDir, 'never-opened', 'app.db');
      const { closeDb } = loadDatabaseModule(dbFile);

      expect(() => {
        closeDb();
        closeDb();
      }).not.toThrow();
      expect(fs.existsSync(dbFile)).toBe(false);
    });
  });

  describe('getDb() on the first call', () => {
    let module;
    let db;

    beforeAll(() => {
      module = loadDatabaseModule(path.join(workDir, 'first-open', 'nested', 'app.db'));
      db = module.getDb();
    });

    test('creates the missing parent directory and the database file', () => {
      expect(fs.statSync(path.dirname(module.dbFile)).isDirectory()).toBe(true);
      expect(fs.existsSync(module.dbFile)).toBe(true);
    });

    test('applies schema.sql so exactly the seven declared tables exist', () => {
      expect(tableNames(db)).toEqual(EXPECTED_TABLES);
    });

    test('journals in WAL mode', () => {
      expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    });

    test('enforces foreign keys on the connection', () => {
      expect(db.pragma('foreign_keys', { simple: true })).toBe(1);

      const insert = db.prepare(
        'INSERT INTO menu_items (id, category_id, name, description, price_cents) VALUES (?, ?, ?, ?, ?)'
      );

      expect(() => insert.run('orphan-item', 'no-such-category', 'Orphan', 'No category.', 100)).toThrow(
        /FOREIGN KEY constraint failed/
      );
    });

    test('seeds the menu reference data of an empty database', () => {
      const unpriced = db
        .prepare('SELECT COUNT(*) AS total FROM menu_items WHERE price_cents <= 0')
        .get().total;

      expect(countRows(db, 'categories')).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);
      expect(countRows(db, 'menu_items')).toBeGreaterThanOrEqual(MINIMUM_ITEMS);
      expect(unpriced).toBe(0);
    });

    test('hands back the same memoised handle on every later call', () => {
      expect(module.getDb()).toBe(db);
      expect(module.getDb()).toBe(db);
      expect(db.open).toBe(true);
    });
  });

  describe('closeDb() after an open', () => {
    let module;
    let firstHandle;
    let categoryIds;
    let itemIds;

    // One database for both tests: the first closes it and the second proves the
    // next getDb() re-opens that same file instead of starting over.
    beforeAll(() => {
      module = loadDatabaseModule(path.join(workDir, 'reopen', 'app.db'));
      firstHandle = module.getDb();
      categoryIds = rowIds(firstHandle, 'categories');
      itemIds = rowIds(firstHandle, 'menu_items');
    });

    test('closes the open handle, clears the memo and is safe to call twice', () => {
      module.closeDb();

      expect(firstHandle.open).toBe(false);
      expect(() => firstHandle.prepare('SELECT 1')).toThrow(/connection is not open/);
      expect(() => module.closeDb()).not.toThrow();
      expect(firstHandle.open).toBe(false);
    });

    test('re-opens the file on the next getDb() without seeding it again', () => {
      const reopened = module.getDb();

      expect(reopened).not.toBe(firstHandle);
      expect(reopened.open).toBe(true);
      expect(tableNames(reopened)).toEqual(EXPECTED_TABLES);
      expect(rowIds(reopened, 'categories')).toEqual(categoryIds);
      expect(rowIds(reopened, 'menu_items')).toEqual(itemIds);
    });
  });

  describe('a failed open', () => {
    test('closes the partially opened handle, rethrows and retries from a clean state', () => {
      const module = loadDatabaseModule(path.join(workDir, 'failed-open', 'nested', 'app.db'));
      const closeSpy = jest.spyOn(module.Database.prototype, 'close');
      const realReadFileSync = fs.readFileSync;
      const schemaSuffix = path.join('db', 'schema.sql');

      // Only the schema read fails. Every other read still reaches the real
      // function, so nothing but the schema-application step is disturbed.
      jest.spyOn(fs, 'readFileSync').mockImplementation((target, ...rest) => {
        if (String(target).endsWith(schemaSuffix)) {
          throw new Error('schema.sql could not be read');
        }

        return realReadFileSync(target, ...rest);
      });

      expect(() => module.getDb()).toThrow('schema.sql could not be read');
      expect(closeSpy).toHaveBeenCalledTimes(1);

      fs.readFileSync.mockRestore();

      // The memo stayed empty, so this call opens the file again and completes
      // the schema application and the seed the failed attempt abandoned.
      const reopened = module.getDb();

      expect(reopened.open).toBe(true);
      expect(tableNames(reopened)).toEqual(EXPECTED_TABLES);
      expect(countRows(reopened, 'categories')).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);
      expect(countRows(reopened, 'menu_items')).toBeGreaterThanOrEqual(MINIMUM_ITEMS);
    });
  });
});
