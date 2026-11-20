/**
 * @fileoverview Menu Item Repository
 *
 * The only module that reads the menu_items table, and therefore the price
 * authority of the application: price_cents leaves this file as the raw integer
 * an order line is priced from, and nothing here accepts, defaults or echoes a
 * caller-supplied price. Every statement below is a read — the customer-facing
 * menu has no administration surface — and nothing below raises: an unknown id
 * returns null and an empty result returns [], leaving the NOT_FOUND and
 * UNAVAILABLE mapping to the services that call this module.
 *
 * Exports: listAvailable, listByCategoryId, findById, findManyByIds.
 *
 * The connection is obtained from getDb() inside each method rather than at load
 * time. That keeps requiring this module free of side effects, and for
 * findManyByIds it is what makes the read join the caller's transaction: a
 * better-sqlite3 transaction is scoped to its connection, so the memoised handle
 * order.repository holds open in its immediate transaction is the one this read
 * runs on, and the price an order copies is the price in the database at commit
 * time.
 *
 * @module src/repositories/menu-item.repository
 */

const { getDb } = require('../db');

/**
 * The catalogue reads' shared select: every menu_items column the API exposes,
 * each one named explicitly rather than expanded with a wildcard, plus the two
 * category columns the contract's nested `category` object is built from.
 * price_cents stays a raw integer cent value and is_available stays the 0 or 1
 * SQLite stores; formatting and boolean shaping belong to the client and the
 * service respectively.
 *
 * @type {string}
 */
const SELECT_ITEM_WITH_CATEGORY =
  'SELECT mi.id, mi.category_id, mi.name, mi.description, mi.price_cents, mi.image_url, ' +
  'mi.is_available, c.name AS category_name, c.slug AS category_slug ' +
  'FROM menu_items mi JOIN categories c ON c.id = mi.category_id';

/**
 * List every available menu item, ordered by name.
 *
 * The unfiltered catalog behind GET /api/menu-items. An item whose is_available
 * is 0 never appears, and a catalog with nothing available yields [] rather than
 * an error, so the endpoint answers 200 with an empty list.
 *
 * @returns {Array<Object>} Rows holding the item's columns plus category_name and
 *   category_slug, ordered by name ascending; [] when no item is available.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function listAvailable() {
  return getDb()
    .prepare(`${SELECT_ITEM_WITH_CATEGORY} WHERE mi.is_available = 1 ORDER BY mi.name ASC`)
    .all();
}

/**
 * List the available menu items of one category, ordered by name.
 *
 * The filtered variant behind GET /api/menu-items?category=<slug>. Because the
 * unfiltered catalog is the available set, this is that same set restricted to
 * one category, so an unavailable item is absent here too. An id that names no
 * category, or a category with nothing available, yields [] — the caller has
 * already resolved the slug to a real category and an empty list is the contract.
 *
 * @param {string} categoryId - Id of the category to list, bound as a statement
 *   parameter.
 * @returns {Array<Object>} Rows holding the item's columns plus category_name and
 *   category_slug, ordered by name ascending; [] when nothing matches.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function listByCategoryId(categoryId) {
  return getDb()
    .prepare(
      `${SELECT_ITEM_WITH_CATEGORY} WHERE mi.category_id = ? AND mi.is_available = 1 ` +
        'ORDER BY mi.name ASC'
    )
    .all(categoryId);
}

/**
 * Read one menu item by id, whether or not it is currently available.
 *
 * Availability is deliberately not filtered here: the order service reads
 * is_available off this row to answer MENU_ITEM_UNAVAILABLE (409) for a known but
 * unavailable item and MENU_ITEM_NOT_FOUND (404) for an unknown one, and a filter
 * would collapse those two contracts into one.
 *
 * @param {string} id - Id of the item to read, bound as a statement parameter.
 * @returns {Object|null} The row holding the item's columns plus category_name
 *   and category_slug, or null when no item carries that id.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function findById(id) {
  const row = getDb()
    .prepare(`${SELECT_ITEM_WITH_CATEGORY} WHERE mi.id = ?`)
    .get(id);

  return row === undefined ? null : row;
}

/**
 * Read several menu items by id in one statement.
 *
 * The price read the order transaction depends on: one IN query against the
 * primary-key index, binding exactly one parameter per distinct id, so an order's
 * unit prices come from the database in a single round trip and the caller looks
 * the rows up by id in a Map. The select is narrower than the catalogue reads —
 * no category join, no description or image — because the only consumer prices
 * line items and checks availability. Duplicate ids are collapsed, and a caller
 * with nothing to look up gets [] without a query at all.
 *
 * @param {Array<string>} ids - Ids of the items to read, bound as statement
 *   parameters in the order given; duplicates are ignored.
 * @returns {Array<Object>} Rows of id, category_id, name, price_cents and
 *   is_available for the ids that exist, in no guaranteed order; [] when ids is
 *   not an array, is empty, or matches no row.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function findManyByIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) {
    return [];
  }

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const statement =
    'SELECT mi.id, mi.category_id, mi.name, mi.price_cents, mi.is_available ' +
    `FROM menu_items mi WHERE mi.id IN (${placeholders})`;

  return getDb().prepare(statement).all(...uniqueIds);
}

module.exports = { listAvailable, listByCategoryId, findById, findManyByIds };
