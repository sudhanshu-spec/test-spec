/**
 * Money Formatting Module
 *
 * This module holds the client's one and only money formatter. Every price that
 * crosses the API is an integer number of cents (`price_cents`,
 * `unit_price_cents`, `line_total_cents`, `total_cents`); the server never sends
 * a formatted or floating-point currency value. Rendering happens here and only
 * here, so the catalog, item detail, cart and both confirmation views cannot
 * drift apart, and no caller is ever handed a decimal currency amount it could
 * send back to the API.
 *
 * The output is fixed by contract rather than by locale: a leading `$`, exactly
 * two decimals and no thousands separator. Locale-aware formatting is
 * deliberately not used, because its output depends on the environment's locale.
 *
 * @module client/src/api/format
 */

/**
 * Formats an integer count of cents as a `$`-prefixed string with two decimals.
 *
 * @param {number} cents Non-negative integer count of cents, as produced by the
 *   API. The domain never supplies a negative value: `menu_items.price_cents`
 *   carries a `> 0` check and `orders.total_cents` a `>= 0` check.
 * @returns {string} The amount as `$` followed by two decimals, without a
 *   thousands separator.
 * @example
 * formatCents(1250); // '$12.50'
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
