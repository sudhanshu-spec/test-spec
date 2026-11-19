/**
 * Display Formatting Module
 *
 * This module owns how a stored value becomes the text a customer reads. It holds
 * the client's one money formatter and its one timestamp formatter, and no view
 * formats either kind of value for itself.
 *
 * Money: every price that crosses the API is an integer number of cents
 * (`price_cents`, `unit_price_cents`, `line_total_cents`, `total_cents`); the
 * server never sends a formatted or floating-point currency value. Rendering
 * happens here and only here, so the catalog, item detail, cart and both
 * confirmation views cannot drift apart, and no caller is ever handed a decimal
 * currency amount it could send back to the API.
 *
 * The money output is fixed by contract rather than by locale: a leading `$`,
 * exactly two decimals and no thousands separator. Locale-aware formatting is
 * deliberately not used, because its output depends on the environment's locale.
 *
 * Timestamps: the order confirmation and the reservation confirmation present the
 * same kind of field — the `created_at` instant the server wrote — on two screens
 * of one application, so both render it through `formatTimestamp` here. A
 * formatter kept private to the screen that needed it first left the second
 * screen printing the raw ISO-8601 string, which is why this module, consumed by
 * every such screen, is the shared home rather than any single view.
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

/**
 * Formats an API timestamp as a local date and time for a human reader.
 *
 * The server writes an ISO-8601 UTC instant with a trailing `Z`, so `Date` parses
 * it unambiguously; showing it in the reader's own timezone is the only
 * conversion performed. A value that does not parse is returned exactly as the
 * API sent it, so a malformed field reads as its stored value instead of the
 * words `Invalid Date`.
 *
 * @param {string} value The timestamp string the API returned, such as the
 *   `created_at` of an order or a reservation.
 * @returns {string} The timestamp as a local date and time, or the original
 *   string when it does not parse.
 * @example
 * formatTimestamp('2026-11-19T14:03:06.344Z'); // 'Nov 19, 2026, 02:03 PM' in a US locale
 */
export function formatTimestamp(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
