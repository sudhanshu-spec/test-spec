/**
 * Menu API Module
 *
 * The three public menu-browsing calls the catalog and the item-detail screens
 * make: the categories the catalog filters by, the items it lists, and the one
 * item the detail screen shows. Each wraps exactly one `apiFetch` call and
 * returns the payload it resolved, unwrapped, so no view ever touches a
 * response envelope.
 *
 * Every path below is relative to the API root that `client/src/api/client`
 * owns: the request URL is its base plus the literal here, so these strings
 * never repeat '/api' and no call site builds an absolute origin. The three menu
 * routes are public reference data and none of them is guarded, so every call
 * here passes `credential: false` and no request of this module carries the
 * session's Bearer header, even while a session is open. Prices pass through as
 * the integer cents the API sends (`price_cents`); formatting them is
 * `client/src/api/format`'s single responsibility, not this module's.
 *
 * A failure surfaces as the transport's `ApiError`, unchanged, so a view can
 * tell `CATEGORY_NOT_FOUND` and `MENU_ITEM_NOT_FOUND` apart from a successful
 * response that happens to be empty. An empty array is only ever the result of a
 * 200 with no rows, never of a converted error.
 *
 * Endpoints:
 * - GET '/categories' returns {categories: [{id, name, slug, display_order}]}, ordered by display_order
 * - GET '/menu-items?category=<slug>' returns {items: [item]}, the category's available items or the whole available catalog
 * - GET '/menu-items/:id' returns {item: {id, name, description, price_cents, image_url, is_available, category}}
 *
 * @module client/src/api/menu
 */

import { apiFetch } from './client';
import type { CategoriesResponse, Category, ItemResponse, ItemsResponse, MenuItem } from './types';

/**
 * Lists the menu categories, in the display order the API returns them in.
 *
 * Ordering is the server's: `categories.display_order` is applied by the
 * repository, so re-sorting here would be a second source of truth for it.
 *
 * @returns The categories, or an empty array when the menu has not been seeded.
 *   An empty menu is a normal result and not an error.
 * @throws {ApiError} Only for a failure of the request itself, never for an
 *   empty menu.
 */
export async function listCategories(): Promise<Category[]> {
  const { categories } = await apiFetch<CategoriesResponse>('/categories', { credential: false });

  return categories;
}

/**
 * Lists the available menu items, optionally restricted to one category.
 *
 * `categorySlug` is sent as the `category` query parameter, and only when it is
 * not `undefined`: omitting the argument leaves the parameter out, while a
 * string — an empty one included — travels as `category=`.
 *
 * The rule that reads that parameter is the server's, and it trims what it
 * receives: an absent, empty or whitespace-only filter lists the whole
 * available catalog, so a `?category=` deep link, or a bookmark of a filter the
 * reader has since emptied, shows every available item rather than failing.
 * Only a non-blank slug that names no category is refused.
 *
 * @param categorySlug - Slug of the category to filter by, as returned by
 *   {@link listCategories}; omit it, or pass an empty or whitespace-only
 *   string, for every available item.
 * @returns The matching items, or an empty array when a known category holds
 *   none.
 * @throws {ApiError} `CATEGORY_NOT_FOUND` (404) only when `categorySlug` is a
 *   non-blank slug naming no category.
 */
export async function listItems(categorySlug?: string): Promise<MenuItem[]> {
  const { items } = await apiFetch<ItemsResponse>('/menu-items', {
    query: { category: categorySlug },
    credential: false,
  });

  return items;
}

/**
 * Fetches one menu item with the category it belongs to.
 *
 * The id is a path segment, so it is URI-encoded rather than sent as a query
 * parameter; the API validates it as a UUID before any lookup.
 *
 * @param id - Id of the item, as carried by `MenuItem.id`.
 * @returns The item, with its nested `category`.
 * @throws {ApiError} `VALIDATION_ERROR` (400) when `id` is not a UUID, and
 *   `MENU_ITEM_NOT_FOUND` (404) when it names no item.
 */
export async function getItem(id: string): Promise<MenuItem> {
  const { item } = await apiFetch<ItemResponse>(`/menu-items/${encodeURIComponent(id)}`, {
    credential: false,
  });

  return item;
}
