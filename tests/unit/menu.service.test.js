/**
 * @fileoverview Unit tests for the menu service (src/services/menu.service.js).
 * Every case builds the service over stubbed category and item repositories, so
 * no database, no HTTP request and no port is involved; the connection module is
 * stubbed for the whole suite, so the SQLite binding never loads and no file is
 * created. What is pinned here is the category ordering, the slug filtering, the
 * two not-found mappings (R-6) and the item projection the three menu endpoints
 * answer with: integer cents carried unformatted (R-3) and no user identity taken
 * by a public read (R-5).
 * @module tests/unit/menu.service
 */

'use strict';

// The service's singleton is built at load over the real repository modules, and
// both of those require the connection module, which loads the SQLite binding and
// evaluates the configuration on the way in. Replacing the connection module for
// the whole suite is what keeps both out of these cases: getDb throws, so a read
// that slipped past the stubs fails the case that caused it instead of opening a
// file. Fresh stubs come from buildMenuService per test, so no per-case module
// reset is needed to isolate one case from the next.
jest.mock('../../src/db', () => ({
  getDb: jest.fn(() => {
    throw new Error('Unit tests must not open the database');
  }),
  closeDb: jest.fn()
}));

const { getDb } = require('../../src/db');
const { AppError } = require('../../src/errors');
const {
  createMenuService,
  menuService,
  toPublicItem
} = require('../../src/services/menu.service');

/** The contract keys of a category, sorted for comparison. @type {string[]} */
const CATEGORY_KEYS = ['display_order', 'id', 'name', 'slug'];

/** The contract keys of an item, sorted for comparison. @type {string[]} */
const ITEM_KEYS = [
  'category',
  'description',
  'id',
  'image_url',
  'is_available',
  'name',
  'price_cents'
];

/**
 * The item contract, written out independently of toPublicItem, so the
 * projection is pinned by the specification rather than by the implementation.
 *
 * @type {Object}
 */
const PUBLIC_ITEM = {
  id: 'item-cheeseburger',
  name: 'Cheeseburger',
  description: 'Beef patty, cheddar and pickles',
  price_cents: 899,
  image_url: '/images/cheeseburger.png',
  is_available: true,
  category: { id: 'cat-classics', name: 'Classics', slug: 'classics' }
};

/**
 * Build a category row shaped as categoryRepository.listOrdered returns it,
 * carrying columns the API does not expose so projection is proven, not assumed.
 *
 * @param {Object} [overrides] - Columns to replace.
 * @returns {Object} Stored category row.
 */
function categoryRow(overrides = {}) {
  return {
    id: 'cat-classics',
    name: 'Classics',
    slug: 'classics',
    display_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * Build an item row shaped as the menu-item repository returns it, with the two
 * joined category columns and the timestamps the API never exposes.
 *
 * @param {Object} [overrides] - Columns to replace.
 * @returns {Object} Stored item row.
 */
function itemRow(overrides = {}) {
  return {
    id: 'item-cheeseburger',
    category_id: 'cat-classics',
    name: 'Cheeseburger',
    description: 'Beef patty, cheddar and pickles',
    price_cents: 899,
    image_url: '/images/cheeseburger.png',
    is_available: 1,
    category_name: 'Classics',
    category_slug: 'classics',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * Build the service over stubbed repositories, so every collaborator call can be
 * asserted and nothing reaches a database.
 *
 * @param {Object} [options] - Stub outcomes.
 * @param {Array<Object>} [options.categories] - Rows listOrdered returns.
 * @param {Object|null} [options.category] - Row findBySlug returns.
 * @param {Array<Object>} [options.available] - Rows listAvailable returns.
 * @param {Array<Object>} [options.categoryItems] - Rows listByCategoryId returns.
 * @param {Object|null} [options.item] - Row findById returns.
 * @returns {{service: Object, repositories: Object}} The service and its stubs.
 */
function buildMenuService({
  categories = [],
  category = null,
  available = [],
  categoryItems = [],
  item = null
} = {}) {
  const repositories = {
    categories: {
      listOrdered: jest.fn(() => categories),
      findBySlug: jest.fn(() => category)
    },
    items: {
      listAvailable: jest.fn(() => available),
      listByCategoryId: jest.fn(() => categoryItems),
      findById: jest.fn(() => item)
    }
  };

  return { service: createMenuService(repositories), repositories };
}

/**
 * Invoke a call that is expected to fail and return the error it raised.
 *
 * Awaits the invocation, so a failure raised synchronously and a rejected promise
 * are both captured: the service raises synchronously today, and a case must not
 * quietly pass if that ever becomes asynchronous.
 *
 * @param {Function} invoke - Call expected to throw or reject.
 * @returns {Promise<Error>} The error the call raised.
 * @throws {Error} When the call returns instead of failing.
 */
async function captureError(invoke) {
  try {
    await invoke();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the call to raise an AppError, but it returned a value');
}

describe('Menu service - menu.service.js', () => {
  test('exports the factory, the wired singleton and the item projection', () => {
    expect(typeof createMenuService).toBe('function');
    expect(typeof toPublicItem).toBe('function');
    expect(Object.keys(menuService).sort()).toEqual(['getItem', 'listCategories', 'listItems']);
  });

  test('wires the singleton to exactly the three read operations', () => {
    // The singleton is bound to the real repositories, so it is inspected here
    // and never called: its reads would reach the connection module, which this
    // suite stubs to throw.
    expect(typeof menuService.listCategories).toBe('function');
    expect(typeof menuService.listItems).toBe('function');
    expect(typeof menuService.getItem).toBe('function');
  });

  describe('listCategories', () => {
    test('projects every row onto exactly the four contract columns', () => {
      const { service, repositories } = buildMenuService({ categories: [categoryRow()] });

      const categories = service.listCategories();

      expect(repositories.categories.listOrdered).toHaveBeenCalledTimes(1);
      expect(repositories.categories.listOrdered).toHaveBeenCalledWith();
      expect(categories).toEqual([
        { id: 'cat-classics', name: 'Classics', slug: 'classics', display_order: 1 }
      ]);
      expect(Object.keys(categories[0]).sort()).toEqual(CATEGORY_KEYS);
      expect(JSON.stringify(categories)).not.toMatch(/created_at|updated_at/);
    });

    test('keeps the order the repository returns instead of sorting again', () => {
      const { service } = buildMenuService({
        categories: [
          categoryRow({ id: 'cat-desserts', name: 'Desserts', slug: 'desserts', display_order: 3 }),
          categoryRow({ id: 'cat-classics', name: 'Classics', slug: 'classics', display_order: 1 }),
          categoryRow({ id: 'cat-sides', name: 'Sides', slug: 'sides', display_order: 2 })
        ]
      });

      const categories = service.listCategories();

      expect(categories.map((category) => category.slug)).toEqual([
        'desserts',
        'classics',
        'sides'
      ]);
      expect(categories.map((category) => category.display_order)).toEqual([3, 1, 2]);
    });

    test('is empty, not an error, on a database holding no category', () => {
      const { service } = buildMenuService({ categories: [] });

      expect(service.listCategories()).toEqual([]);
    });
  });

  describe('listItems with no filter', () => {
    test('lists the whole available catalogue when no options are given at all', () => {
      const { service, repositories } = buildMenuService({
        available: [itemRow()],
        category: categoryRow()
      });

      const items = service.listItems();

      expect(repositories.items.listAvailable).toHaveBeenCalledTimes(1);
      expect(repositories.categories.findBySlug).not.toHaveBeenCalled();
      expect(repositories.items.listByCategoryId).not.toHaveBeenCalled();
      expect(items).toEqual([PUBLIC_ITEM]);
    });

    test.each([
      ['an empty options object', {}],
      ['an undefined filter', { categorySlug: undefined }],
      ['a null filter', { categorySlug: null }],
      ['an empty string filter', { categorySlug: '' }],
      ['a whitespace-only filter', { categorySlug: '   ' }]
    ])('treats %s as no filter at all', (_case, options) => {
      const { service, repositories } = buildMenuService({
        available: [itemRow()],
        category: categoryRow()
      });

      const items = service.listItems(options);

      expect(repositories.items.listAvailable).toHaveBeenCalledTimes(1);
      expect(repositories.categories.findBySlug).not.toHaveBeenCalled();
      expect(repositories.items.listByCategoryId).not.toHaveBeenCalled();
      expect(items).toEqual([PUBLIC_ITEM]);
    });

    test('projects every listed row, adding no column the row carried', () => {
      const { service } = buildMenuService({
        available: [
          itemRow(),
          itemRow({ id: 'item-fries', name: 'Fries', price_cents: 399, is_available: 1 })
        ]
      });

      const items = service.listItems();

      expect(items).toHaveLength(2);
      expect(Object.keys(items[0]).sort()).toEqual(ITEM_KEYS);
      expect(items[1].id).toBe('item-fries');
      expect(items[1].price_cents).toBe(399);
      expect(JSON.stringify(items)).not.toMatch(
        /category_id|category_name|category_slug|created_at|updated_at/
      );
    });

    test('is empty, not an error, when nothing is available', () => {
      const { service } = buildMenuService({ available: [] });

      expect(service.listItems()).toEqual([]);
    });
  });

  describe('listItems filtered by category slug', () => {
    test("lists the resolved category's items", () => {
      const { service, repositories } = buildMenuService({
        category: categoryRow(),
        categoryItems: [itemRow()]
      });

      const items = service.listItems({ categorySlug: 'classics' });

      expect(repositories.categories.findBySlug).toHaveBeenCalledTimes(1);
      expect(repositories.categories.findBySlug).toHaveBeenCalledWith('classics');
      expect(repositories.items.listByCategoryId).toHaveBeenCalledTimes(1);
      expect(repositories.items.listByCategoryId).toHaveBeenCalledWith('cat-classics');
      expect(repositories.items.listAvailable).not.toHaveBeenCalled();
      expect(items).toEqual([PUBLIC_ITEM]);
    });

    test('trims the slug it resolves and leaves case folding to the repository', () => {
      const { service, repositories } = buildMenuService({
        category: categoryRow(),
        categoryItems: [itemRow()]
      });

      service.listItems({ categorySlug: '  ClassiCs  ' });

      expect(repositories.categories.findBySlug).toHaveBeenCalledWith('ClassiCs');
    });

    test('refuses a repeated query parameter instead of coercing it to a slug', async () => {
      // Express parses ?category=a&category=b into an array. The service must not
      // weld it into the slug "a,b": the value is delegated as it arrived, the
      // lookup resolves nothing, and the filter is refused rather than widened.
      const { service, repositories } = buildMenuService({ category: null });

      const error = await captureError(() =>
        service.listItems({ categorySlug: ['classics', 'chicken'] })
      );

      expect(repositories.categories.findBySlug).toHaveBeenCalledTimes(1);
      expect(repositories.categories.findBySlug).toHaveBeenCalledWith(['classics', 'chicken']);
      expect(repositories.items.listByCategoryId).not.toHaveBeenCalled();
      expect(repositories.items.listAvailable).not.toHaveBeenCalled();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: 'CATEGORY_NOT_FOUND', status: 404 });
      expect(error.details).toBeUndefined();
    });

    test('ignores a caller-supplied user id, because reading the menu takes no identity', () => {
      // R-5: menu reads are public, so the filter object is the only input the
      // service accepts and an id travelling beside it changes nothing.
      const { service, repositories } = buildMenuService({
        category: categoryRow(),
        categoryItems: [itemRow()]
      });

      const items = service.listItems({ categorySlug: 'classics', userId: 'user-elsewhere' });

      expect(repositories.categories.findBySlug).toHaveBeenCalledWith('classics');
      expect(repositories.items.listByCategoryId).toHaveBeenCalledWith('cat-classics');
      expect(items).toEqual([PUBLIC_ITEM]);
    });

    test('is empty, not an error, for a known category holding no available item', () => {
      const { service, repositories } = buildMenuService({
        category: categoryRow(),
        categoryItems: []
      });

      expect(service.listItems({ categorySlug: 'classics' })).toEqual([]);
      expect(repositories.items.listByCategoryId).toHaveBeenCalledWith('cat-classics');
    });
  });

  describe('listItems with a slug that names no category', () => {
    test.each([
      ['a slug no category carries', 'missing'],
      ['a slug that only matches once trimmed', '  pastries  ']
    ])('raises CATEGORY_NOT_FOUND for %s', async (_case, categorySlug) => {
      const { service, repositories } = buildMenuService({ category: null });

      const error = await captureError(() => service.listItems({ categorySlug }));

      expect(repositories.categories.findBySlug).toHaveBeenCalledTimes(1);
      expect(repositories.items.listByCategoryId).not.toHaveBeenCalled();
      expect(repositories.items.listAvailable).not.toHaveBeenCalled();
      expect(error).toBeInstanceOf(AppError);
      // R-6: the documented code and its status travel together, and a missing
      // resource carries no `details` — those belong to validation failures only.
      expect(error).toMatchObject({ code: 'CATEGORY_NOT_FOUND', status: 404 });
      expect(error.details).toBeUndefined();
      // Fixed text: the caller-chosen filter is never echoed back in the envelope.
      expect(error.message).toBe('No menu category matches that slug.');
      expect(error.message).not.toContain(categorySlug.trim());
    });
  });

  describe('getItem', () => {
    test('returns the projected item for the id it is given', () => {
      const { service, repositories } = buildMenuService({ item: itemRow() });

      const item = service.getItem({ id: 'item-cheeseburger' });

      expect(repositories.items.findById).toHaveBeenCalledTimes(1);
      expect(repositories.items.findById).toHaveBeenCalledWith('item-cheeseburger');
      expect(item).toEqual(PUBLIC_ITEM);
      expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
    });

    test('reports an unavailable item rather than hiding it', () => {
      const { service } = buildMenuService({ item: itemRow({ is_available: 0 }) });

      expect(service.getItem({ id: 'item-cheeseburger' }).is_available).toBe(false);
    });

    test('raises MENU_ITEM_NOT_FOUND for an id that names no item', async () => {
      const { service, repositories } = buildMenuService({ item: null });

      const error = await captureError(() => service.getItem({ id: 'item-missing' }));

      expect(repositories.items.findById).toHaveBeenCalledWith('item-missing');
      expect(error).toBeInstanceOf(AppError);
      // R-6: code and status together, and no `details` on a missing resource.
      expect(error).toMatchObject({ code: 'MENU_ITEM_NOT_FOUND', status: 404 });
      expect(error.details).toBeUndefined();
      expect(error.message).toContain('item-missing');
    });
  });

  describe('toPublicItem', () => {
    test.each([
      [1, true],
      [0, false]
    ])('converts SQLite is_available %s to the boolean %s', (stored, expected) => {
      const item = toPublicItem(itemRow({ is_available: stored }));

      expect(item.is_available).toBe(expected);
      expect(typeof item.is_available).toBe('boolean');
    });

    test('builds the nested category from the joined columns', () => {
      const item = toPublicItem(itemRow());

      expect(item.category).toEqual({ id: 'cat-classics', name: 'Classics', slug: 'classics' });
      expect(Object.keys(item.category).sort()).toEqual(['id', 'name', 'slug']);
    });

    test('passes price_cents through as the raw integer cent value', () => {
      const item = toPublicItem(itemRow({ price_cents: 1234 }));

      expect(item.price_cents).toBe(1234);
      expect(typeof item.price_cents).toBe('number');
    });

    test('leaves money unformatted, so no currency string reaches a response', () => {
      // R-3: the server carries integer cents and never renders them; the single
      // formatter lives in the client, so a currency symbol here is a defect.
      const item = toPublicItem(itemRow({ price_cents: 1299 }));
      const strings = Object.values(item).filter((value) => typeof value === 'string');

      expect(item.price_cents).toBe(1299);
      expect(JSON.stringify(item)).not.toMatch(/[$€£¥]/);
      expect(strings.some((value) => /[$€£¥]/.test(value))).toBe(false);
    });

    test('names exactly the contract keys, so no extra column reaches a response', () => {
      const item = toPublicItem(itemRow());

      expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
      expect(JSON.stringify(item)).not.toMatch(
        /category_id|category_name|category_slug|created_at|updated_at/
      );
    });
  });

  test('opens no database and binds no port for any case above', () => {
    // The connection mock throws, so this proves every case reached its stubs and
    // none of them fell through to the connection module.
    expect(getDb).not.toHaveBeenCalled();
  });
});
