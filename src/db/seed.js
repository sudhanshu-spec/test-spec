/**
 * Database Seed Module
 *
 * This module holds the menu reference data the application ships with: the
 * categories and the items a freshly created database is populated with, plus
 * the single function that inserts them while the tables are still empty. It
 * owns reference data and nothing else, so no DDL, no connection creation, no
 * pragmas and no SQL for any other table lives here.
 *
 * src/db/index.js opens the connection, applies the schema and invokes
 * seedIfEmpty on the first open of the database file; this module is also the
 * `npm run seed` entry point declared in the root manifest.
 *
 * @module src/db/seed
 */

const { randomUUID } = require('node:crypto');

/**
 * Categories the menu is organised into, in display order.
 *
 * @type {ReadonlyArray<{slug: string, name: string, displayOrder: number}>}
 */
const CATEGORIES = [
  { slug: 'classics', name: 'Classics', displayOrder: 1 },
  { slug: 'chicken', name: 'Chicken', displayOrder: 2 },
  { slug: 'vegetarian', name: 'Vegetarian', displayOrder: 3 },
  { slug: 'sides', name: 'Sides', displayOrder: 4 },
  { slug: 'drinks', name: 'Drinks', displayOrder: 5 },
  { slug: 'desserts', name: 'Desserts', displayOrder: 6 }
];

/**
 * Menu items, each attached to a category by that category's slug. `priceCents`
 * is an integer number of cents and `isAvailable` is the 1 or 0 the column
 * stores; two items are seeded unavailable and every category still offers at
 * least one available item.
 *
 * @type {ReadonlyArray<{categorySlug: string, name: string, priceCents: number,
 *   imageUrl: string|null, isAvailable: number, description: string}>}
 */
const MENU_ITEMS = [
  { categorySlug: 'classics', name: 'Classic Cheeseburger', priceCents: 899, isAvailable: 1,
    imageUrl: '/images/classic-cheeseburger.jpg',
    description: 'Beef patty with aged cheddar, pickles, onion and house sauce in a brioche bun.' },
  { categorySlug: 'classics', name: 'Double Smash Burger', priceCents: 1199, isAvailable: 1,
    imageUrl: '/images/double-smash-burger.jpg',
    description: 'Two smashed beef patties with American cheese, caramelised onion and mustard.' },
  { categorySlug: 'classics', name: 'Bacon BBQ Burger', priceCents: 1099, isAvailable: 1,
    imageUrl: '/images/bacon-bbq-burger.jpg',
    description: 'Beef patty with smoked bacon, sharp cheddar, crispy onions and hickory BBQ sauce.' },
  { categorySlug: 'chicken', name: 'Crispy Chicken Burger', priceCents: 999, isAvailable: 1,
    imageUrl: '/images/crispy-chicken-burger.jpg',
    description: 'Buttermilk-fried chicken thigh with slaw and chipotle mayo in a sesame bun.' },
  { categorySlug: 'chicken', name: 'Grilled Chicken Wrap', priceCents: 849, isAvailable: 1,
    imageUrl: '/images/grilled-chicken-wrap.jpg',
    description: 'Grilled chicken breast, lettuce, tomato and garlic yoghurt in a warm tortilla.' },
  { categorySlug: 'vegetarian', name: 'Bean and Beet Burger', priceCents: 949, isAvailable: 1,
    imageUrl: '/images/bean-beet-burger.jpg',
    description: 'House-made black bean and beetroot patty with avocado and vegan mayo.' },
  { categorySlug: 'vegetarian', name: 'Halloumi Stack', priceCents: 899, isAvailable: 1,
    imageUrl: '/images/halloumi-stack.jpg',
    description: 'Grilled halloumi with roasted pepper, rocket and a honey-lemon dressing.' },
  { categorySlug: 'vegetarian', name: 'Mushroom Swiss Burger', priceCents: 879, isAvailable: 0,
    imageUrl: '/images/mushroom-swiss-burger.jpg',
    description: 'Portobello mushroom with melted swiss cheese, rocket and truffled mayonnaise.' },
  { categorySlug: 'sides', name: 'Skin-On Fries', priceCents: 349, isAvailable: 1,
    imageUrl: '/images/skin-on-fries.jpg',
    description: 'Hand-cut skin-on fries seasoned with sea salt.' },
  { categorySlug: 'sides', name: 'Onion Rings', priceCents: 449, isAvailable: 1,
    imageUrl: '/images/onion-rings.jpg',
    description: 'Six beer-battered onion rings served with a smoky dipping sauce.' },
  { categorySlug: 'drinks', name: 'Classic Cola', priceCents: 299, isAvailable: 1,
    imageUrl: '/images/classic-cola.jpg',
    description: 'Chilled cola served over ice in a 330 ml glass bottle.' },
  { categorySlug: 'drinks', name: 'Fresh Lemonade', priceCents: 349, isAvailable: 1,
    imageUrl: '/images/fresh-lemonade.jpg',
    description: 'Cloudy lemonade pressed in house and served over ice.' },
  { categorySlug: 'desserts', name: 'Salted Caramel Shake', priceCents: 599, isAvailable: 1,
    imageUrl: '/images/salted-caramel-shake.jpg',
    description: 'Thick vanilla shake swirled with salted caramel sauce.' },
  { categorySlug: 'desserts', name: 'Chocolate Brownie', priceCents: 549, isAvailable: 0,
    imageUrl: null,
    description: 'Warm fudgy brownie with a scoop of vanilla ice cream.' }
];

/**
 * Result of the most recent in-process `seedIfEmpty` call. src/db/index.js seeds
 * inside `getDb()`, so the CLI branch has no return value of its own to inspect
 * and reports from this record whether the rows it finds were inserted by this
 * process or were already present.
 *
 * @type {{skipped: boolean, categories: number, items: number}|null}
 */
let lastSeedResult = null;

/**
 * Insert the menu reference data when the categories table is empty.
 *
 * The emptiness check and every insert run inside one transaction, so the seed
 * either lands entirely or not at all: a constraint failure rolls the whole set
 * back and propagates, and a database that already holds categories is left
 * untouched after one count. Silent by design, because the connection owner
 * calls it on the first open, test runs included.
 *
 * @param {Object} db - Open handle whose schema has already been applied. Both
 *   seeded tables must exist; a missing one is a caller defect and throws.
 * @returns {{skipped: boolean, categories: number, items: number}} Whether any
 *   row was inserted, with the counts read from the database.
 * @throws {Error} If a statement fails or an item names an unknown category.
 */
function seedIfEmpty(db) {
  const countCategories = db.prepare('SELECT COUNT(*) AS total FROM categories');
  const countItems = db.prepare('SELECT COUNT(*) AS total FROM menu_items');
  const insertCategory = db.prepare('INSERT INTO categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)');
  const insertItem = db.prepare(
    'INSERT INTO menu_items (id, category_id, name, description, price_cents, image_url, is_available) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const seed = db.transaction(() => {
    const existing = countCategories.get().total;
    if (existing > 0) {
      return { skipped: true, categories: existing, items: countItems.get().total };
    }

    const categoryIdsBySlug = new Map();

    for (const category of CATEGORIES) {
      const id = randomUUID();
      categoryIdsBySlug.set(category.slug, id);
      insertCategory.run(id, category.name, category.slug, category.displayOrder);
    }

    for (const item of MENU_ITEMS) {
      const categoryId = categoryIdsBySlug.get(item.categorySlug);

      if (!categoryId) {
        throw new Error(
          `Seed item "${item.name}" references unknown category slug "${item.categorySlug}"`
        );
      }

      insertItem.run(
        randomUUID(),
        categoryId,
        item.name,
        item.description,
        item.priceCents,
        item.imageUrl,
        item.isAvailable
      );
    }

    return {
      skipped: false, categories: countCategories.get().total, items: countItems.get().total
    };
  });

  lastSeedResult = seed();

  return lastSeedResult;
}

// Assigned before the CLI branch below because that branch loads src/db/index.js,
// which requires this module in turn and must find the function on the exports
// object rather than on a module that is still initialising.
module.exports = { seedIfEmpty };

if (require.main === module) {
  // Required lazily: src/db/index.js requires this module at its top, so a
  // top-level require here would read index.js's not-yet-assigned exports.
  const { getDb, closeDb } = require('./index');

  try {
    const db = getDb();
    const categories = db.prepare('SELECT COUNT(*) AS total FROM categories').get().total;
    const items = db.prepare('SELECT COUNT(*) AS total FROM menu_items').get().total;
    const outcome = lastSeedResult && !lastSeedResult.skipped
      ? 'rows inserted on this run'
      : 'rows already present, nothing inserted';

    console.log(`Menu seed complete: ${outcome}; ${categories} categories, ${items} menu items.`);
  } catch (error) {
    process.exitCode = 1;
    console.error(`Menu seed failed: ${error.message}`);
  } finally {
    closeDb();
  }
}

