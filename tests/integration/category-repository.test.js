/**
 * @fileoverview Integration tests for the categories table accessor
 * (src/repositories/category.repository.js), exercised only through its public
 * API { listOrdered, findBySlug } against a real SQLite database. The suite
 * covers the seeded listing and its row shape, the display_order ordering with
 * the name tie-break and its independence from insertion order, the empty table
 * answer, and every slug lookup: an exact slug, a slug carrying surrounding
 * whitespace and upper case, an unknown slug, and the non-string and blank
 * arguments that resolve to null without a query.
 *
 * Every test points config.dbFile at a directory created under the operating
 * system's temporary directory — outside the repository — so no run writes a
 * database file into the checkout.
 *
 * @module tests/integration/category-repository
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The categories columns every returned row carries, in the statements' select order. */
const CATEGORY_COLUMNS = ['id', 'name', 'slug', 'display_order'];

/** Every module instance the suite loaded, closed together once the file ends. */
const loadedModules = [];

/** Temporary directory the suite's database files live in. */
let workDir;

/**
 * Loads a pristine instance of src/repositories/category.repository.js opening
 * `file`.
 *
 * jest.resetModules() gives the suite its own copies of the configuration, the
 * database module and the repository, so the memoised connection is its own. The
 * configuration object is mutated rather than replaced, because src/db/index.js
 * reads config.dbFile off it on every getDb() call.
 *
 * @param {string} file - Absolute path the module must open as its database.
 * @returns {{repository: Object, getDb: Function}} The repository and the accessor.
 */
function loadCategoryRepository(file) {
  jest.resetModules();

  const config = require('../../src/config');
  config.dbFile = file;

  const databaseModule = require('../../src/db');
  loadedModules.push({ closeDb: databaseModule.closeDb });

  return {
    repository: require('../../src/repositories/category.repository'),
    getDb: databaseModule.getDb
  };
}

/**
 * Reads one category row straight from the table, every column included, so a
 * returned row can be compared against what is actually stored.
 *
 * @param {Function} getDb - The loaded module's connection accessor.
 * @param {string} id - Primary key of the row to read.
 * @returns {Object|undefined} The stored row, or undefined when no row has that id.
 */
const storedRow = (getDb, id) => getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);

/**
 * Reads one category row straight from the table by its slug, every column
 * included, so a lookup result can be compared against what is actually stored.
 *
 * @param {Function} getDb - The loaded module's connection accessor.
 * @param {string} slug - Slug of the row to read.
 * @returns {Object|undefined} The stored row, or undefined when no row has that slug.
 */
const storedRowBySlug = (getDb, slug) =>
  getDb().prepare('SELECT * FROM categories WHERE slug = ?').get(slug);

describe('category repository module (src/repositories/category.repository.js)', () => {
  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzy-category-repository-'));
  });

  afterAll(() => {
    // closeDb() is idempotent, so closing every instance the suite loaded is safe.
    for (const loaded of loadedModules) {
      loaded.closeDb();
    }

    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe('listOrdered() on the seeded database', () => {
    let repository;
    let getDb;

    beforeAll(() => {
      ({ repository, getDb } = loadCategoryRepository(path.join(workDir, 'seeded', 'app.db')));
    });

    test('returns every stored category row with exactly the four contract columns', () => {
      const rows = repository.listOrdered();
      const storedRows = getDb().prepare('SELECT * FROM categories').all();

      expect(rows).toHaveLength(storedRows.length);
      expect(rows.map((row) => row.slug).sort()).toEqual(storedRows.map((row) => row.slug).sort());

      for (const row of rows) {
        // Named columns only: a row that carried a column beyond the contract, or
        // lost one, would not match the list here.
        expect(Object.keys(row)).toEqual(CATEGORY_COLUMNS);
        // SELECT * reads every column the table holds, so this also rules out a
        // stored column the statement failed to project.
        expect(row).toEqual(storedRow(getDb, row.id));
      }
    });

    test('orders by display_order ascending', () => {
      const orders = repository.listOrdered().map((row) => row.display_order);

      expect(orders).toEqual([...orders].sort((left, right) => left - right));
    });
  });

  describe('listOrdered() ordering of rows it did not seed', () => {
    let repository;
    let getDb;

    beforeAll(() => {
      ({ repository, getDb } = loadCategoryRepository(path.join(workDir, 'ordering', 'app.db')));

      const insert = getDb().prepare(
        'INSERT INTO categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)'
      );

      // Two rows sharing one display_order, inserted in the reverse of the name
      // order they must come back in.
      insert.run('ordering-zulu', 'Zulu', 'zulu', 900);
      insert.run('ordering-alpha', 'Alpha', 'alpha', 900);
      // Inserted last, ordered first: display_order leads the sort and insertion
      // order has no say in it.
      insert.run('ordering-lead', 'Inserted Last', 'inserted-last', 7);
    });

    test('breaks a display_order tie by name', () => {
      const rows = repository.listOrdered();
      const slugs = rows.map((row) => row.slug);

      expect(rows.filter((row) => row.display_order === 900)).toHaveLength(2);
      expect(slugs.indexOf('alpha')).toBeGreaterThanOrEqual(0);
      expect(slugs.indexOf('alpha')).toBeLessThan(slugs.indexOf('zulu'));
      expect(slugs.slice(-2)).toEqual(['alpha', 'zulu']);
    });

    test('places a lower display_order ahead of a higher one regardless of insertion order', () => {
      const rows = repository.listOrdered();
      const slugs = rows.map((row) => row.slug);
      const insertedLast = rows.find((row) => row.slug === 'inserted-last');

      expect(insertedLast.display_order).toBe(7);
      expect(slugs.indexOf('inserted-last')).toBeLessThan(slugs.indexOf('alpha'));
      expect(slugs.indexOf('inserted-last')).toBeLessThan(slugs.indexOf('zulu'));
      expect(slugs[slugs.length - 3]).toBe('inserted-last');
    });
  });

  describe('listOrdered() on a database whose categories table was emptied', () => {
    let repository;
    let getDb;

    beforeAll(() => {
      ({ repository, getDb } = loadCategoryRepository(path.join(workDir, 'emptied', 'app.db')));

      // menu_items references categories, so the items go first; with the
      // connection's foreign-key enforcement on, the reverse order is refused.
      getDb().prepare('DELETE FROM menu_items').run();
      getDb().prepare('DELETE FROM categories').run();
    });

    test('returns an empty array', () => {
      expect(repository.listOrdered()).toEqual([]);
    });
  });

  describe('findBySlug()', () => {
    let repository;
    let getDb;

    beforeAll(() => {
      ({ repository, getDb } = loadCategoryRepository(path.join(workDir, 'lookup', 'app.db')));
    });

    test('resolves an exact seeded slug to the row as stored', () => {
      const row = repository.findBySlug('classics');

      expect(row).not.toBeNull();
      expect(Object.keys(row)).toEqual(CATEGORY_COLUMNS);
      expect(row.slug).toBe('classics');
      expect(row).toEqual(storedRowBySlug(getDb, 'classics'));
    });

    test.each([
      ['  classics  ', 'classics'],
      ['CLASSICS', 'classics'],
      ['\tDesserts\n ', 'desserts']
    ])('trims and lowercases %p to resolve the %p row', (supplied, slug) => {
      const row = repository.findBySlug(supplied);

      expect(row).not.toBeNull();
      expect(row.slug).toBe(slug);
      expect(row).toEqual(storedRowBySlug(getDb, slug));
    });

    test('returns null for a slug no category carries', () => {
      expect(repository.findBySlug('no-such-category')).toBeNull();
    });

    test.each([undefined, null, 42])(
      'returns null without throwing for the non-string %p',
      (value) => {
        expect(() => repository.findBySlug(value)).not.toThrow();
        expect(repository.findBySlug(value)).toBeNull();
      }
    );

    test.each(['', '   '])('returns null without throwing for the blank string %p', (value) => {
      expect(() => repository.findBySlug(value)).not.toThrow();
      expect(repository.findBySlug(value)).toBeNull();
    });
  });
});
