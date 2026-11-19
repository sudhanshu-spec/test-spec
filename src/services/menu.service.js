/**
 * Menu Service Module
 *
 * The read model behind the three menu endpoints: the category list the catalog
 * filters by, the item list it renders, and the item the detail view shows.
 * Every statement belongs to the two read-only repositories this service is
 * built over; what lives here is which failure an absent row becomes, and the
 * exact shape an item leaves in.
 *
 * Deliberately clock-free and configuration-free, because the menu is static
 * reference data, and read-only: menu content is seed-only in this scope.
 *
 * Failures are AppError from src/errors, both answered 404 and neither carrying
 * `details`: CATEGORY_NOT_FOUND for a filter slug that names no category, and
 * MENU_ITEM_NOT_FOUND for an id that names no item. The UUID-shape check on a
 * path parameter belongs to the router, which answers VALIDATION_ERROR (400).
 *
 * price_cents passes through as the raw integer cent value with no arithmetic
 * here (formatting is the client's), and is_available leaves as a JSON boolean
 * rather than SQLite's 0/1, because the API contract types it as a boolean.
 *
 * @module src/services/menu.service
 */

const { AppError } = require('../errors');
const categoryRepository = require('../repositories/category.repository');
const menuItemRepository = require('../repositories/menu-item.repository');

/*
 * Failures are raised by code name, never by status number: AppError resolves
 * the 404 from the one status table in src/errors and rejects a name that is not
 * a key of it, so no status number is written here.
 */

/**
 * Project a joined menu_items row onto the API's `item` contract.
 *
 * Built key by key rather than spread, so an unexpected column cannot leak into
 * a response, and it needs the category columns every read in
 * menu-item.repository joins in.
 *
 * @param {Object} row - Item row with category_name and category_slug joined in.
 * @returns {Object} {id, name, description, price_cents, image_url,
 *   is_available, category: {id, name, slug}}.
 */
function toPublicItem(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price_cents: row.price_cents,
    image_url: row.image_url,
    is_available: Boolean(row.is_available),
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug
    }
  };
}

/**
 * Reduce a caller's category filter to the slug worth resolving.
 *
 * Every spelling of "no filter" — undefined, null, empty, whitespace — reduces
 * to '' and skips the category lookup; undefined and null come first so
 * String() cannot invent the slug "undefined". Trimming and case folding of a
 * real slug stay in category.repository.findBySlug.
 *
 * @param {*} categorySlug - Raw filter value, typically req.query.category.
 * @returns {string} The trimmed slug, or '' when no filter was requested.
 */
function normaliseSlug(categorySlug) {
  if (categorySlug === undefined || categorySlug === null) {
    return '';
  }

  return String(categorySlug).trim();
}

/**
 * Build a menu service over the repositories it reads through.
 *
 * The factory takes stub repositories and needs no HTTP request, no database and
 * no clock, which is what makes the ordering, filtering and projection rules
 * testable in isolation. There is no `now` parameter because nothing in the menu
 * depends on the time.
 *
 * @param {Object} dependencies - The service's collaborators.
 * @param {Object} dependencies.categories - Category reader: listOrdered() and
 *   findBySlug(slug).
 * @param {Object} dependencies.items - Item reader: listAvailable(),
 *   listByCategoryId(id) and findById(id).
 * @returns {{listCategories: Function, listItems: Function, getItem: Function}}
 *   The menu service bound to those repositories.
 */
function createMenuService({ categories, items }) {
  /**
   * List the menu's categories in display order; an unseeded database yields
   * [], a normal result and never an error.
   *
   * @returns {Array<{id: string, name: string, slug: string, display_order: number}>}
   *   Every category, ordered by display_order.
   * @throws {Error} If the underlying read fails.
   */
  function listCategories() {
    return categories.listOrdered().map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      display_order: category.display_order
    }));
  }

  /**
   * List the available menu items, optionally restricted to one category slug.
   *
   * A filtered list is the available catalog restricted to the resolved
   * category. A known category with no available items yields [], which is a
   * normal result and never an error.
   *
   * @param {Object} [options] - Filter options.
   * @param {*} [options.categorySlug] - Category slug from the query string; an
   *   absent, empty or whitespace value lists the whole catalog.
   * @returns {Array<Object>} The matching items, projected by
   *   {@link toPublicItem}.
   * @throws {AppError} CATEGORY_NOT_FOUND (404) when the slug names no category.
   */
  function listItems({ categorySlug } = {}) {
    const slug = normaliseSlug(categorySlug);

    if (slug === '') {
      return items.listAvailable().map(toPublicItem);
    }

    const category = categories.findBySlug(slug);

    if (!category) {
      // No `details`: an unknown slug is a missing resource, not malformed input.
      throw new AppError(
        'CATEGORY_NOT_FOUND',
        `No menu category matches the slug "${slug}"`
      );
    }

    return items.listByCategoryId(category.id).map(toPublicItem);
  }

  /**
   * Read one menu item by id.
   *
   * The id is trusted well formed — the router rejects a non-UUID path parameter
   * with VALIDATION_ERROR first. A lookup that finds nothing, including for a
   * string that is not an id at all, is mapped here rather than thrown by the
   * repository, so no read can crash on a stray id.
   *
   * @param {Object} options - Lookup options.
   * @param {string} options.id - Id of the item to read.
   * @returns {Object} The item, projected by {@link toPublicItem}.
   * @throws {AppError} MENU_ITEM_NOT_FOUND (404) when no item carries the id.
   */
  function getItem({ id }) {
    const row = items.findById(id);

    if (!row) {
      throw new AppError(
        'MENU_ITEM_NOT_FOUND',
        `No menu item matches the id "${String(id)}"`
      );
    }

    return toPublicItem(row);
  }

  return { listCategories, listItems, getItem };
}

/**
 * The menu service the API router uses, wired to the two repository modules.
 * Neither opens a connection: the database opens on the first read, not here.
 *
 * @type {{listCategories: Function, listItems: Function, getItem: Function}}
 */
const menuService = createMenuService({
  categories: categoryRepository,
  items: menuItemRepository
});

module.exports = { createMenuService, menuService, toPublicItem };
