/**
 * Display Formatting Module
 *
 * This module owns how a stored value becomes the text a customer reads. It holds
 * the client's one money formatter, its one date-only formatter, its one
 * time-of-day formatter, its one timestamp formatter and its one status-label
 * formatter, and no view formats any of those kinds of value for itself.
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
 * Date-only and time-of-day: a reservation stores its date and its seating time as
 * two separate wall-clock values — `reservation_date` as `YYYY-MM-DD` and
 * `reservation_time` as `HH:MM` — and neither carries a timezone, so neither may
 * be converted. `formatCalendarDate` and `formatClockTime` are the client's one
 * date-only and one time-of-day presentation; a screen that printed the stored
 * strings instead showed a raw ISO date and a 24-hour time beside a localised
 * timestamp, three formats for two kinds of value.
 *
 * Statuses: an order is stored as one of `confirmed`, `preparing`, `completed` or
 * `cancelled` and a reservation as `confirmed`, and the API sends every one of
 * them in lower case. Both screens show the value in a badge, so both render it
 * through `formatStatusLabel` here: the order view once capitalised through a
 * label map of its own while the reservation view printed the stored string, and
 * the same badge read two ways on two screens of one application.
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

/**
 * Formats an API status value as the label its badge shows.
 *
 * The stored value is lower case; capitalising the first character is the whole
 * presentation, so the order and reservation badges read the same way. The rest
 * of the string is left exactly as the API sent it, and a value outside the
 * documented vocabulary keeps its own text rather than becoming a guess or an
 * empty label.
 *
 * @param {string} status The status string the API returned, such as the
 *   `status` of an order or of a reservation.
 * @returns {string} The status with its first character upper-cased.
 * @example
 * formatStatusLabel('confirmed'); // 'Confirmed'
 */
export function formatStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Formats an API calendar date as the local date a customer reads.
 *
 * `reservation_date` is a calendar date alone — `YYYY-MM-DD`, no time and no
 * timezone — so it names the day the table is booked for and must never be
 * shifted by a conversion. The date is built in local time from its three parts,
 * which is what keeps the same calendar day on every reader's clock, and it is
 * then shown in the reader's own date format: the date part of `formatTimestamp`'s
 * output, without a time. A value that does not contain a real date is returned
 * exactly as the API sent it, so a malformed field reads as its stored value
 * instead of the words `Invalid Date`.
 *
 * @param {string} value The `reservation_date` the API returned, such as
 *   `2026-11-20`.
 * @returns {string} The date as a local calendar date, or the original string
 *   when it does not parse.
 * @example
 * formatCalendarDate('2026-11-20'); // 'Nov 20, 2026' in a US locale
 */
export function formatCalendarDate(value: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (parts === null) {
    return value;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  // Local construction, never `new Date(value)`: the string form would be read as
  // UTC midnight and shown as the previous day west of Greenwich.
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats an API seating time as a local time of day for a human reader.
 *
 * `reservation_time` is a wall-clock time — `HH:MM`, the hour and minute a table
 * is held at — and carries no timezone and no date, so there is nothing to convert
 * and nothing that may move it by an offset. The hour and minute are placed on a
 * local date and rendered in the reader's own time format, so the seating time
 * reads the same way as the `created_at` timestamp on the same screen. A value that
 * is not an `HH:MM` time is returned exactly as the API sent it, so a malformed
 * field reads as its stored value instead of the words `Invalid Date`.
 *
 * @param {string} value The `reservation_time` the API returned, such as `19:00`.
 * @returns {string} The time as a local time of day, or the original string when
 *   it does not parse.
 * @example
 * formatClockTime('19:00'); // '07:00 PM' in a US locale
 */
export function formatClockTime(value: string): string {
  const parts = /^(\d{2}):(\d{2})$/.exec(value);

  if (parts === null) {
    return value;
  }

  const hour = Number(parts[1]);
  const minute = Number(parts[2]);

  if (hour > 23 || minute > 59) {
    return value;
  }

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    // The same hour-and-minute option set `formatTimestamp` renders, so a seating
    // time and the `created_at` beside it cannot disagree in style on one screen.
    hour: '2-digit',
    minute: '2-digit',
  });
}
