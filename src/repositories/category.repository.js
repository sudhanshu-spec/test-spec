/**
 * Category Repository Module
 *
 * This module is the read-only accessor for the `categories` table. It answers
 * exactly two questions — which categories exist, in the order the menu shows
 * them, and which single category a URL slug names — and it raises nothing:
 * "no such category" comes back as null for the caller to interpret.
 *
 * Only src/services/menu.service.js consumes it. Routers never require it, so
 * the CATEGORY_NOT_FOUND mapping that turns a null result into an API failure
 * lives in the service, and this module stays confined to SQL and row shapes.
 *
 * Every statement runs against the memoised connection owned by src/db, which
 * applies the pragmas, the schema and the seed on its first open. Nothing is
 * read at module load, so requiring this module touches no file.
 *
 * @module src/repositories/category.repository
 */

const { getDb } = require('../db');

/**
 * The column list every query here selects. The contract columns are named one
 * by one instead of using SELECT *, so a column added to the table later cannot
 * reach the API payload without a deliberate change in this module.
 *
 * @type {string}
 */
const CATEGORY_COLUMNS = 'id, name, slug, display_order';

/**
 * List every menu category in display order.
 *
 * The menu's reading order is display_order and nothing else, so that column
 * leads the sort; name only breaks a tie between two rows sharing an order,
 * which leaves every unequal pair exactly as display_order put it. An empty
 * table yields an empty array, which is what lets GET /api/categories answer
 * 200 with `{"categories": []}` on a database that has not been seeded.
 *
 * @returns {Array<{id: string, name: string, slug: string, display_order: number}>}
 *   Every category row, ordered by display_order ascending; empty when the
 *   table holds no rows.
 * @throws {Error} If the connection cannot be opened or the query fails.
 */
function listOrdered() {
  // Prepared per call rather than memoised at module scope: src/db closes its
  // handle on shutdown and reopens on the next call, which would leave a cached
  // statement bound to a closed connection.
  return getDb()
    .prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY display_order ASC, name ASC`)
    .all();
}

/**
 * Resolve one category by its URL slug.
 *
 * The slug is normalised once before it is bound — trimmed and lowercased — so
 * a caller passing ?category=Classics still matches the lowercase slug the seed
 * writes. An argument that is not a non-empty string resolves to null without
 * issuing a query, because no stored slug can match it. The slug column's
 * UNIQUE index makes the lookup a single index seek.
 *
 * @param {*} slug - The slug to resolve, expected to be a category slug.
 * @returns {{id: string, name: string, slug: string, display_order: number}|null}
 *   The matching row, or null when no category carries that slug.
 * @throws {Error} If the connection cannot be opened or the query fails.
 */
function findBySlug(slug) {
  if (typeof slug !== 'string') {
    return null;
  }

  const normalised = slug.trim().toLowerCase();

  if (normalised === '') {
    return null;
  }

  const row = getDb()
    .prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE slug = ?`)
    .get(normalised);

  // .get() reports "no row" as undefined, but this module's contract — and the
  // service that maps it to CATEGORY_NOT_FOUND — is null.
  return row === undefined ? null : row;
}

module.exports = { listOrdered, findBySlug };
