/**
 * @fileoverview Integration tests for the three public menu endpoints of the
 * JSON API — `GET /api/categories`, `GET /api/menu-items` and
 * `GET /api/menu-items/:id` — driven through the real Express pipeline
 * `src/app.js` exports and against the suite's own SQLite file.
 *
 * The suite pins the menu's read contracts rather than the code behind them: the
 * category list and its `display_order` ordering, the item list filtered by
 * category slug, the unfiltered available catalog, the single item with its
 * nested category, and the four failure and empty cases — an unknown slug
 * (`CATEGORY_NOT_FOUND`), a known category holding no items (`[]`), a malformed
 * id (`VALIDATION_ERROR` naming the field) and an unknown id
 * (`MENU_ITEM_NOT_FOUND`). The final describe empties the catalog and asserts the
 * two list endpoints answer `[]` instead of failing.
 *
 * The database is this suite's own file under the operating system's temporary
 * directory: `DB_FILE` is set before the module registry is reset and before any
 * module that reads it is loaded, so the `src/config`, `src/db` and app instances
 * the suite exercises are its own and every connection they open belongs to that
 * file. The file and its WAL and shared-memory companions are removed once the
 * suite ends, and the previous `DB_FILE` value is restored. Fixture rows are
 * written through the same memoised handle the repositories use, so no second
 * connection is opened anywhere in the suite.
 *
 * @module tests/integration/api-menu
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// DB_FILE is set before the module registry is reset and before src/app is
// required, so the src/config copy the database module reads points at this
// suite's own file instead of data/app.db. No other variable is set: process.env
// is read only by src/config.
const previousDbFile = process.env.DB_FILE;
const dbFile = path.join(os.tmpdir(), `burger-api-menu-${process.pid}-${Date.now()}.db`);
process.env.DB_FILE = dbFile;

jest.resetModules();

const request = require('supertest');
const app = require('../../src/app');
const { getDb, closeDb } = require('../../src/db');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/** The four keys a category in a response body carries, in alphabetical order. */
const CATEGORY_KEYS = ['display_order', 'id', 'name', 'slug'];

/** The seven keys an item in a response body carries, in alphabetical order. */
const ITEM_KEYS = [
  'category', 'description', 'id', 'image_url', 'is_available', 'name', 'price_cents'
];

/** The three keys an item's nested category carries, in alphabetical order. */
const ITEM_CATEGORY_KEYS = ['id', 'name', 'slug'];

/** The seed floors the catalog must meet: at least five categories, twelve items. */
const MINIMUM_CATEGORIES = 5;
const MINIMUM_ITEMS = 12;

/**
 * Makes a GET request against the application and returns the response.
 *
 * Supertest binds an ephemeral socket per request and closes it, so no port is
 * declared anywhere in the suite and no run can collide with another.
 *
 * @param {string} requestPath - Request path, including any query string.
 * @returns {Promise<SupertestResponse>} Supertest response.
 */
function get(requestPath) {
  return request(app).get(requestPath);
}

/**
 * Asserts a failure response carries the documented status and error code.
 *
 * Both are checked, because the envelope's `code` and the HTTP status are paired
 * by the api's single status table and a drift between them is a contract break.
 * `details` is asserted to be present for a validation failure and absent for
 * every other code: it names fields, and a missing resource names none.
 *
 * @param {SupertestResponse} response - Supertest response object.
 * @param {number} status - Expected HTTP status code.
 * @param {string} code - Expected value of `body.error.code`.
 * @returns {void}
 */
function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body.error).toBeDefined();
  expect(response.body.error.code).toBe(code);
  expect(typeof response.body.error.message).toBe('string');
  expect(response.body.error.message.length).toBeGreaterThan(0);

  if (code === 'VALIDATION_ERROR') {
    expect(Array.isArray(response.body.error.details)).toBe(true);
    return;
  }

  // Never null and never an empty array: the key is written only for a
  // validation failure that carries field entries.
  expect(response.body.error.details).toBeUndefined();
}

/**
 * Asserts a validation failure's `details` names the given field.
 *
 * Every entry is checked for the two-key `{field, issue}` shape, so a detail
 * carrying an unexpected property or a non-string issue fails here rather than
 * passing as "some field was named".
 *
 * @param {SupertestResponse} response - Response carrying the error envelope.
 * @param {string} field - Field the failure must name.
 * @returns {void}
 */
function expectFieldError(response, field) {
  const details = response.body.error.details;

  expect(Array.isArray(details)).toBe(true);
  expect(details.map((detail) => detail.field)).toContain(field);

  for (const detail of details) {
    expect(Object.keys(detail).sort()).toEqual(['field', 'issue']);
    expect(typeof detail.issue).toBe('string');
    expect(detail.issue.length).toBeGreaterThan(0);
  }
}

/**
 * Inserts a category row into this suite's database and returns its id.
 *
 * Written through `getDb()` so the row lands on the connection the repositories
 * read through, and so no second handle is opened. Only the four columns the
 * table requires are bound.
 *
 * @param {Object} category - Row values.
 * @param {string} [category.id] - Id to store; a fresh UUID when omitted.
 * @param {string} category.name - Display name.
 * @param {string} category.slug - Unique URL slug.
 * @param {number} category.displayOrder - Position in the menu.
 * @returns {string} The inserted category's id.
 */
function insertCategory({ id = crypto.randomUUID(), name, slug, displayOrder }) {
  getDb()
    .prepare('INSERT INTO categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)')
    .run(id, name, slug, displayOrder);

  return id;
}

/**
 * Reads the seeded categories once through the public endpoint.
 *
 * Every test that needs slugs or ids starts from this response rather than a
 * hard-coded name, so the suite keeps working if the illustrative seed content
 * changes.
 *
 * @returns {Promise<Array<{id: string, name: string, slug: string, display_order: number}>>}
 *   The seeded categories, in display order.
 */
async function listCategories() {
  const response = await get('/api/categories').expect(200);

  return response.body.categories;
}

afterAll(() => {
  closeDb();

  for (const artifact of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    try {
      fs.unlinkSync(artifact);
    } catch (error) {
      // Absent by design: a handle that was closed cleanly leaves no WAL or
      // shared-memory file behind, and a connection never opened leaves none.
      // Only that expected absence is tolerated, so a file that could not be
      // removed fails the suite instead of being left behind silently.
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (previousDbFile === undefined) {
    delete process.env.DB_FILE;
  } else {
    process.env.DB_FILE = previousDbFile;
  }
});

describe('Menu API', () => {
  describe('GET /api/categories', () => {
    test('answers 200 with categories as the only body key', async () => {
      const response = await get('/api/categories').expect(200);

      expect(Object.keys(response.body)).toEqual(['categories']);
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    test('lists at least five seeded categories, each with exactly the contract keys', async () => {
      const categories = await listCategories();

      expect(categories.length).toBeGreaterThanOrEqual(MINIMUM_CATEGORIES);

      for (const category of categories) {
        expect(Object.keys(category).sort()).toEqual(CATEGORY_KEYS);
        expect(category.id).toEqual(expect.any(String));
        expect(category.name).toEqual(expect.any(String));
        expect(category.slug).toEqual(expect.any(String));
        expect(Number.isInteger(category.display_order)).toBe(true);
      }
    });

    test('orders the categories by non-decreasing display_order', async () => {
      const categories = await listCategories();
      const displayOrders = categories.map((category) => category.display_order);

      // Asserted as monotonicity rather than one hard-coded order, so the
      // illustrative seed content may change without weakening the check.
      expect(displayOrders).toEqual([...displayOrders].sort((left, right) => left - right));
      expect(new Set(categories.map((category) => category.slug)).size).toBe(categories.length);
    });
  });

  describe('GET /api/menu-items filtered by category slug', () => {
    test('restricts every seeded slug to its own category and covers at least twelve items', async () => {
      const categories = await listCategories();
      const distinctIds = new Set();

      for (const category of categories) {
        const response = await get(
          `/api/menu-items?category=${encodeURIComponent(category.slug)}`
        ).expect(200);

        expect(Object.keys(response.body)).toEqual(['items']);

        // The requested slug is carried into the assertion because the loop
        // covers every category and the received value alone would not say
        // which filter a foreign item came from.
        const foreignItems = response.body.items.filter(
          (item) => item.category.slug !== category.slug || item.category.id !== category.id
        );
        expect({ slug: category.slug, foreignItems }).toEqual({ slug: category.slug, foreignItems: [] });

        for (const item of response.body.items) {
          distinctIds.add(item.id);
        }
      }

      expect(distinctIds.size).toBeGreaterThanOrEqual(MINIMUM_ITEMS);
    });
  });

  describe('GET /api/menu-items without a filter', () => {
    test('answers 200 with every available item and a strict boolean is_available', async () => {
      const response = await get('/api/menu-items').expect(200);

      expect(Object.keys(response.body)).toEqual(['items']);
      expect(response.body.items.length).toBeGreaterThanOrEqual(MINIMUM_ITEMS);

      for (const item of response.body.items) {
        expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
        // A JSON boolean, never SQLite's 0 or 1: truthiness would accept both.
        expect(typeof item.is_available).toBe('boolean');
        expect(item.is_available).toBe(true);
        expect(Number.isInteger(item.price_cents)).toBe(true);
        expect(item.price_cents).toBeGreaterThan(0);
        expect(Object.keys(item.category).sort()).toEqual(ITEM_CATEGORY_KEYS);
      }
    });

    test('covers every item the per-category filters return', async () => {
      const categories = await listCategories();
      const response = await get('/api/menu-items').expect(200);
      const unfilteredIds = new Set(response.body.items.map((item) => item.id));
      const filteredIds = new Set();

      for (const category of categories) {
        const filtered = await get(
          `/api/menu-items?category=${encodeURIComponent(category.slug)}`
        ).expect(200);

        for (const item of filtered.body.items) {
          filteredIds.add(item.id);
        }
      }

      // The unfiltered catalog is the whole available set, so no item a filter
      // returned may be missing from it.
      expect([...filteredIds].filter((id) => !unfilteredIds.has(id))).toEqual([]);
      expect(unfilteredIds.size).toBeGreaterThanOrEqual(MINIMUM_ITEMS);
    });
  });

  describe('GET /api/menu-items unknown and empty cases', () => {
    test('answers 404 CATEGORY_NOT_FOUND for a slug no category carries', async () => {
      const response = await get('/api/menu-items?category=does-not-exist');

      expectError(response, 404, 'CATEGORY_NOT_FOUND');
    });

    test('answers 200 with an empty items array for a known category holding no items', async () => {
      const slug = `no-items-${crypto.randomUUID().slice(0, 8)}`;
      insertCategory({ name: 'No Items Yet', slug, displayOrder: 99 });

      const response = await get(`/api/menu-items?category=${encodeURIComponent(slug)}`).expect(200);

      expect(Object.keys(response.body)).toEqual(['items']);
      // An empty catalog for a real category is a normal result, not an error.
      expect(response.body.items).toEqual([]);
    });
  });

  describe('GET /api/menu-items/:id', () => {
    test('answers 200 with the seeded item, its price in integer cents and its category', async () => {
      const categories = await listCategories();
      const category = categories[0];
      // Read from the category's own list rather than hard-coded, so the detail
      // route is exercised with an id the catalog actually offers.
      const listed = await get(
        `/api/menu-items?category=${encodeURIComponent(category.slug)}`
      ).expect(200);
      const seeded = listed.body.items[0];

      expect(seeded).toBeDefined();

      const response = await get(`/api/menu-items/${seeded.id}`).expect(200);

      expect(Object.keys(response.body)).toEqual(['item']);

      const { item } = response.body;

      expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
      expect(item.id).toBe(seeded.id);
      expect(item.name).toBe(seeded.name);
      expect(item.description).toBe(seeded.description);
      expect(Number.isInteger(item.price_cents)).toBe(true);
      expect(item.price_cents).toBe(seeded.price_cents);
      expect(typeof item.is_available).toBe('boolean');
      expect(item.is_available).toBe(true);
      expect(Object.keys(item.category).sort()).toEqual(ITEM_CATEGORY_KEYS);
      expect(item.category).toEqual({ id: category.id, name: category.name, slug: category.slug });
    });

    test('answers 400 VALIDATION_ERROR naming the id when it is not a UUID', async () => {
      const response = await get('/api/menu-items/abc');

      expectError(response, 400, 'VALIDATION_ERROR');
      expectFieldError(response, 'id');
    });

    test('answers 404 MENU_ITEM_NOT_FOUND for a well-formed id no item carries', async () => {
      const response = await get(`/api/menu-items/${crypto.randomUUID()}`);

      expectError(response, 404, 'MENU_ITEM_NOT_FOUND');
    });
  });

  // Declared last on purpose: these rows empty the two seeded tables, and Jest
  // runs the tests of a file in declaration order, so anything after them would
  // see an empty catalog. The seed only runs when categories is empty at first
  // open, so the tables stay empty for the rest of this suite's life.
  describe('empty menu', () => {
    beforeAll(() => {
      getDb().prepare('DELETE FROM menu_items').run();
      getDb().prepare('DELETE FROM categories').run();

      const remaining = getDb().prepare('SELECT COUNT(*) AS total FROM categories').get().total;
      expect(remaining).toBe(0);
    });

    test('answers 200 with an empty categories list once the catalog is empty', async () => {
      const response = await get('/api/categories').expect(200);

      expect(Object.keys(response.body)).toEqual(['categories']);
      expect(response.body.categories).toEqual([]);
    });

    test('answers 200 with an empty items list once the catalog is empty', async () => {
      const response = await get('/api/menu-items').expect(200);

      expect(Object.keys(response.body)).toEqual(['items']);
      expect(response.body.items).toEqual([]);
    });
  });
});
