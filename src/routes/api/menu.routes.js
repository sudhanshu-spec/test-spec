/**
 * Menu API Routes Module
 *
 * The three public menu-browsing endpoints of the JSON API: the categories the
 * catalog filters by, the items it lists, and the single item the detail view
 * shows.
 *
 * These paths are mounted at the API root: src/routes/api/index.js mounts this
 * router at '/', and src/app.js mounts that aggregator at '/api'. The literals
 * below are therefore relative to '/api' and never repeat it, no route is
 * defined at this router's own '/', and nothing here can match or shadow the
 * tutorial routes at '/', '/evening' or '/good-evening'.
 *
 * Each handler validates only the request shape it owns, calls exactly one
 * menuService method, and answers with the documented wrapped body. Failures —
 * VALIDATION_ERROR raised here, CATEGORY_NOT_FOUND and MENU_ITEM_NOT_FOUND
 * raised by the service — are left to propagate to the `/api`-scoped error
 * handler, the single writer of the JSON error envelope. The menu is public
 * reference data, so no route carries authentication.
 *
 * Route contracts:
 * - GET '/categories' returns {categories: [{id, name, slug, display_order}]} as JSON, ordered by display_order
 * - GET '/menu-items' returns {items: [item]} as JSON, all available items or the ones in ?category=<slug>
 * - GET '/menu-items/:id' returns {item} as JSON, or 400 VALIDATION_ERROR when the id is not a UUID
 *
 * @module src/routes/api/menu.routes
 */

const express = require('express');
const { AppError } = require('../../errors');
const { menuService } = require('../../services/menu.service');

/**
 * Shape of the id accepted by GET '/menu-items/:id'.
 *
 * The service trusts a well-formed id, so a malformed one is rejected here
 * before any lookup: it is a VALIDATION_ERROR (400) naming the field, never a
 * MENU_ITEM_NOT_FOUND. Case-insensitive because UUIDs are hex, and the id then
 * reaches the service exactly as the client wrote it: ids are opaque and issued
 * in lower case, so a differently-cased variant of a known id names no row.
 *
 * @type {RegExp}
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = express.Router();

/**
 * Category list handler
 * Responds with every menu category in display order
 *
 * An unseeded database yields an empty array, which is a normal result and
 * never an error.
 *
 * @route GET /categories
 * @returns {Object} {categories: [{id, name, slug, display_order}]}
 */
router.get('/categories', async (req, res) => {
  const categories = await menuService.listCategories();

  res.json({ categories });
});

/**
 * Menu item list handler
 * Responds with the available items, optionally restricted to one category
 *
 * The filter is read only when it is a non-blank string: Express 5's query
 * parser can yield an array or object for a repeated or bracketed parameter,
 * and such a value must reach neither the service nor a SQL comparison.
 * Omitting the filter lists the whole available catalog; an unknown slug is
 * the service's CATEGORY_NOT_FOUND.
 *
 * @route GET /menu-items
 * @returns {Object} {items: [{id, name, description, price_cents, image_url, is_available, category}]}
 */
router.get('/menu-items', async (req, res) => {
  const categorySlug =
    typeof req.query.category === 'string' && req.query.category.trim() !== ''
      ? req.query.category
      : undefined;

  const items = await menuService.listItems({ categorySlug });

  res.json({ items });
});

/**
 * Menu item detail handler
 * Responds with one item and the category it belongs to
 *
 * The id is validated before the lookup, so malformed input is answered 400
 * VALIDATION_ERROR with the field detail rather than a 404. An unknown but
 * well-formed id is the service's MENU_ITEM_NOT_FOUND.
 *
 * @route GET /menu-items/:id
 * @returns {Object} {item: {id, name, description, price_cents, image_url, is_available, category}}
 */
router.get('/menu-items/:id', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'The menu item id must be a valid UUID.',
      [{ field: 'id', issue: 'not_a_valid_uuid' }]
    );
  }

  const item = await menuService.getItem({ id: req.params.id });

  res.json({ item });
});

module.exports = router;
