/**
 * @fileoverview Integration tests for the menu item repository
 * (src/repositories/menu-item.repository.js), exercised through its public API
 * { listAvailable, listByCategoryId, findById, findManyByIds } against a real
 * SQLite database.
 *
 * The suite covers the catalogue reads — the column set each one returns, the
 * joined category columns, the name ordering, the availability filter and the
 * empty answer; the single-item read, which deliberately does not filter
 * availability so the order service can tell an unavailable item from an unknown
 * one; and the pricing read the order transaction depends on, with its narrower
 * column set, its duplicate-id collapse and the [] it returns for anything it
 * cannot look up.
 *
 * Every test opens its own database file in a directory the suite creates under
 * the operating system's temporary directory, outside the checkout, so no run
 * writes a database file into the repository and a test that flips an item's
 * availability cannot reach another. The file is seeded by src/db/index.js on
 * first open, so the catalogue is already there to read.
 *
 * @module tests/integration/menu-item-repository
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Module specifiers the suite loads fresh for each database it opens. */
const CONFIG_MODULE = '../../src/config';
const DATABASE_MODULE = '../../src/db';
const REPOSITORY_MODULE = '../../src/repositories/menu-item.repository';

/** The catalogue reads' column set, in the statements' select order. */
const ITEM_WITH_CATEGORY_COLUMNS = [
  'id',
  'category_id',
  'name',
  'description',
  'price_cents',
  'image_url',
  'is_available',
  'category_name',
  'category_slug'
];

/** The pricing read's column set: no description, no image, no category join. */
const PRICING_COLUMNS = ['id', 'category_id', 'name', 'price_cents', 'is_available'];

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Temporary directory the suite's database files live in. */
let workDir;

/**
 * Loads a pristine instance of the repository over a database file of its own.
 *
 * jest.resetModules() gives the test its own copies of the configuration, the
 * database module and the repository, so the memoised connection and the file it
 * seeds are its own. The configuration object is mutated rather than replaced,
 * because src/db/index.js reads config.dbFile off it on every getDb() call.
 *
 * @param {string} label - Directory name, unique per test, the database file is
 *   created in under the suite's temporary directory.
 * @returns {{repository: Object, getDb: Function, closeDb: Function, dbFile: string}}
 *   The repository, the connection accessor, the closer and the file path.
 */
function loadMenuRepository(label) {
  jest.resetModules();

  const dbFile = path.join(workDir, label, 'app.db');
  const config = require(CONFIG_MODULE);
  config.dbFile = dbFile;

  const databaseModule = require(DATABASE_MODULE);
  const loaded = {
    repository: require(REPOSITORY_MODULE),
    getDb: databaseModule.getDb,
    closeDb: databaseModule.closeDb,
    dbFile
  };

  loadedModules.push(loaded);

  return loaded;
}

/**
 * Reads one category by slug, straight from the table the repository joins.
 * @param {Object} db - Open handle
 * @param {string} slug - Category slug
 * @returns {Object} The seeded category row, holding id, name and slug
 */
const categoryBySlug = (db, slug) =>
  db.prepare('SELECT id, name, slug FROM categories WHERE slug = ?').get(slug);

/**
 * Reads one menu item by name, straight from the table the repository reads.
 * @param {Object} db - Open handle
 * @param {string} name - Item name
 * @returns {Object} The seeded menu_items row
 */
const itemByName = (db, name) => db.prepare('SELECT * FROM menu_items WHERE name = ?').get(name);

/**
 * Sets one item's availability, standing in for the write the module never performs.
 * @param {Object} db - Open handle
 * @param {string} name - Item name
 * @param {number} isAvailable - The 1 or 0 the column stores
 * @returns {void}
 */
const setAvailability = (db, name, isAvailable) =>
  db.prepare('UPDATE menu_items SET is_available = ? WHERE name = ?').run(isAvailable, name);

/**
 * Lists the available item names in the order the table holds them, which is what
 * a statement without its ORDER BY clause would return.
 * @param {Object} db - Open handle
 * @returns {string[]} Available item names in table order
 */
const availableNames = (db) =>
  db
    .prepare('SELECT name FROM menu_items WHERE is_available = 1')
    .all()
    .map((row) => row.name);

/**
 * Lists one category's available item names in the order the table holds them.
 * @param {Object} db - Open handle
 * @param {string} categoryId - Id of the category to list
 * @returns {string[]} Available item names of that category in table order
 */
const availableNamesOfCategory = (db, categoryId) =>
  db
    .prepare('SELECT name FROM menu_items WHERE category_id = ? AND is_available = 1')
    .all(categoryId)
    .map((row) => row.name);

/**
 * Names of the rows a repository read returned.
 * @param {Array<Object>} rows - Rows a read returned
 * @returns {string[]} Their names
 */
const names = (rows) => rows.map((row) => row.name);

/**
 * Sorts names ascending, independently of the database's collation.
 * @param {string[]} list - Names to sort
 * @returns {string[]} The same names in ascending order
 */
const ascending = (list) => [...list].sort();

describe('menu item repository module (src/repositories/menu-item.repository.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-menu-item-repository-'));
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every instance the suite loaded is safe.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe('listAvailable()', () => {
    test('returns every available item with the catalogue columns and the joined category columns', () => {
      const { repository, getDb } = loadMenuRepository('list-available-columns');
      const db = getDb();

      const rows = repository.listAvailable();
      const availableTotal = db
        .prepare('SELECT COUNT(*) AS total FROM menu_items WHERE is_available = 1')
        .get().total;
      const heldTotal = db.prepare('SELECT COUNT(*) AS total FROM menu_items').get().total;

      expect(rows).toHaveLength(availableTotal);
      // The seeded catalogue holds unavailable items too, so a dropped filter
      // would return more rows than the available count.
      expect(heldTotal).toBeGreaterThan(availableTotal);

      for (const row of rows) {
        expect(Object.keys(row)).toEqual(ITEM_WITH_CATEGORY_COLUMNS);
        expect(row.is_available).toBe(1);

        const stored = itemByName(db, row.name);
        expect(row.id).toBe(stored.id);
        expect(row.category_id).toBe(stored.category_id);
        expect(row.description).toBe(stored.description);
        expect(row.image_url).toBe(stored.image_url);
        expect(row.name).toBe(stored.name);
        // price_cents leaves the module as the raw integer cent value the order
        // lines are priced from: not a formatted string, not a float.
        expect(Number.isInteger(row.price_cents)).toBe(true);
        expect(row.price_cents).toBe(stored.price_cents);

        const category = db
          .prepare('SELECT name, slug FROM categories WHERE id = ?')
          .get(row.category_id);
        expect(row.category_name).toBe(category.name);
        expect(row.category_slug).toBe(category.slug);
      }
    });

    test('orders the catalogue by name ascending, which the table order is not', () => {
      const { repository, getDb } = loadMenuRepository('list-available-order');
      const db = getDb();

      const returnedNames = names(repository.listAvailable());
      const tableOrder = availableNames(db);

      expect(returnedNames).toEqual(ascending(tableOrder));
      expect(returnedNames).toHaveLength(tableOrder.length);
      // The seeded rows are stored in category order rather than in name order,
      // so this is the sequence a dropped ORDER BY clause would return instead.
      expect(returnedNames).not.toEqual(tableOrder);
    });

    test('excludes an item once its is_available is set to 0, leaving the row in place', () => {
      const { repository, getDb } = loadMenuRepository('list-available-excluded');
      const db = getDb();
      const target = itemByName(db, 'Onion Rings');
      const before = repository.listAvailable();

      expect(target.is_available).toBe(1);
      expect(before.map((row) => row.id)).toContain(target.id);

      setAvailability(db, target.name, 0);

      const after = repository.listAvailable();

      expect(after).toHaveLength(before.length - 1);
      expect(after.map((row) => row.id)).not.toContain(target.id);
      expect(names(after)).not.toContain(target.name);
      // The row is still there; only its availability changed.
      expect(itemByName(db, target.name).is_available).toBe(0);
    });

    test('returns [] when no item is available', () => {
      const { repository, getDb } = loadMenuRepository('list-available-none');
      const db = getDb();

      db.prepare('UPDATE menu_items SET is_available = 0').run();

      expect(repository.listAvailable()).toEqual([]);
    });
  });

  describe('listByCategoryId()', () => {
    test("returns only that category's available items, ordered by name, with its joined columns", () => {
      const { repository, getDb } = loadMenuRepository('by-category-classics');
      const db = getDb();
      const category = categoryBySlug(db, 'classics');

      const rows = repository.listByCategoryId(category.id);
      const tableOrder = availableNamesOfCategory(db, category.id);

      expect(rows.length).toBeGreaterThan(1);
      expect(names(rows)).toEqual(ascending(tableOrder));
      expect(rows).toHaveLength(tableOrder.length);
      // As above: the category's rows are not stored in name order.
      expect(names(rows)).not.toEqual(tableOrder);

      for (const row of rows) {
        expect(Object.keys(row)).toEqual(ITEM_WITH_CATEGORY_COLUMNS);
        expect(row.category_id).toBe(category.id);
        expect(row.category_name).toBe(category.name);
        expect(row.category_slug).toBe(category.slug);
        expect(row.is_available).toBe(1);
        expect(Number.isInteger(row.price_cents)).toBe(true);
      }
    });

    test("excludes that category's unavailable item", () => {
      const { repository, getDb } = loadMenuRepository('by-category-unavailable');
      const db = getDb();
      const category = categoryBySlug(db, 'vegetarian');
      const unavailable = itemByName(db, 'Mushroom Swiss Burger');
      const held = db
        .prepare('SELECT COUNT(*) AS total FROM menu_items WHERE category_id = ?')
        .get(category.id).total;

      expect(unavailable.category_id).toBe(category.id);
      expect(unavailable.is_available).toBe(0);

      const rows = repository.listByCategoryId(category.id);

      expect(names(rows)).toEqual(ascending(availableNamesOfCategory(db, category.id)));
      expect(names(rows)).not.toContain(unavailable.name);
      expect(rows.map((row) => row.id)).not.toContain(unavailable.id);
      // One row of the category is held back by the filter, and no other is.
      expect(rows).toHaveLength(held - 1);
    });

    test('returns [] for a category whose items are all unavailable', () => {
      const { repository, getDb } = loadMenuRepository('by-category-none-available');
      const db = getDb();
      const category = categoryBySlug(db, 'desserts');

      expect(repository.listByCategoryId(category.id).length).toBeGreaterThan(0);

      db.prepare('UPDATE menu_items SET is_available = 0 WHERE category_id = ?').run(category.id);

      const held = db
        .prepare('SELECT COUNT(*) AS total FROM menu_items WHERE category_id = ?')
        .get(category.id).total;

      // The category still holds its items; only the availability filter empties the read.
      expect(held).toBeGreaterThan(0);
      expect(repository.listByCategoryId(category.id)).toEqual([]);
    });

    test('returns [] for a category id no category carries', () => {
      const { repository } = loadMenuRepository('by-category-unknown');

      expect(repository.listByCategoryId('4e0b1f4c-0000-4000-8000-000000000000')).toEqual([]);
    });
  });

  describe('findById()', () => {
    test('returns the item with its joined category columns for a known id', () => {
      const { repository, getDb } = loadMenuRepository('find-by-id-known');
      const db = getDb();
      const stored = itemByName(db, 'Double Smash Burger');
      const category = db
        .prepare('SELECT name, slug FROM categories WHERE id = ?')
        .get(stored.category_id);

      const row = repository.findById(stored.id);

      expect(Object.keys(row)).toEqual(ITEM_WITH_CATEGORY_COLUMNS);
      // Every menu_items column comes back exactly as stored, plus the two
      // category columns the contract's nested category object is built from.
      expect(row).toEqual({
        ...stored,
        category_name: category.name,
        category_slug: category.slug
      });
      expect(Number.isInteger(row.price_cents)).toBe(true);
    });

    test('returns an item whose is_available is 0, because availability is not filtered here', () => {
      const { repository, getDb } = loadMenuRepository('find-by-id-unavailable');
      const db = getDb();
      const unavailable = itemByName(db, 'Mushroom Swiss Burger');

      expect(unavailable.is_available).toBe(0);
      // The catalogue read hides it, and this read must still find it: the order
      // service tells an unavailable item apart from an unknown one by this row.
      expect(names(repository.listAvailable())).not.toContain(unavailable.name);

      const row = repository.findById(unavailable.id);

      expect(row).not.toBeNull();
      expect(row.id).toBe(unavailable.id);
      expect(row.name).toBe(unavailable.name);
      expect(row.is_available).toBe(0);
      expect(row.category_name).toBe(
        db.prepare('SELECT name FROM categories WHERE id = ?').get(unavailable.category_id).name
      );
    });

    test('returns null for an id no item carries', () => {
      const { repository } = loadMenuRepository('find-by-id-unknown');

      expect(repository.findById('0b8b0a3c-0000-4000-8000-000000000000')).toBeNull();
    });
  });

  describe('findManyByIds()', () => {
    test('returns the matching rows with only the pricing columns', () => {
      const { repository, getDb } = loadMenuRepository('find-many-columns');
      const db = getDb();
      const fries = itemByName(db, 'Skin-On Fries');
      const cola = itemByName(db, 'Classic Cola');

      const rows = repository.findManyByIds([fries.id, cola.id]);

      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.id).sort()).toEqual([fries.id, cola.id].sort());

      for (const row of rows) {
        const stored = row.id === fries.id ? fries : cola;
        // No description, no image_url and no joined category columns: the one
        // consumer prices line items and checks availability.
        expect(Object.keys(row)).toEqual(PRICING_COLUMNS);
        expect(row.category_id).toBe(stored.category_id);
        expect(row.name).toBe(stored.name);
        expect(Number.isInteger(row.price_cents)).toBe(true);
        expect(row.price_cents).toBe(stored.price_cents);
        expect(row.is_available).toBe(stored.is_available);
      }
    });

    test('collapses duplicate ids so a repeated id yields one row', () => {
      const { repository, getDb } = loadMenuRepository('find-many-duplicates');
      const db = getDb();
      const fries = itemByName(db, 'Skin-On Fries');
      const cola = itemByName(db, 'Classic Cola');

      const rows = repository.findManyByIds([fries.id, fries.id, cola.id, fries.id]);

      expect(rows).toHaveLength(2);
      expect(rows.filter((row) => row.id === fries.id)).toHaveLength(1);
      expect(rows.map((row) => row.id).sort()).toEqual([fries.id, cola.id].sort());
    });

    describe('a caller with nothing to look up', () => {
      let repository;

      beforeAll(() => {
        ({ repository } = loadMenuRepository('find-many-nothing-to-look-up'));
      });

      test.each([
        ['an empty array', []],
        ['undefined', undefined],
        ['null', null],
        ['a bare id string', '2b0a0a3c-0000-4000-8000-000000000000'],
        ['a number', 42]
      ])('returns [] without throwing for %s', (_description, ids) => {
        expect(() => repository.findManyByIds(ids)).not.toThrow();
        expect(repository.findManyByIds(ids)).toEqual([]);
      });

      test('returns [] for ids that match no row', () => {
        expect(
          repository.findManyByIds([
            '2b0a0a3c-0000-4000-8000-000000000000',
            '3c1b1b4d-0000-4000-8000-000000000000'
          ])
        ).toEqual([]);
      });
    });
  });
});
