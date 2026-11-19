/**
 * Error Vocabulary Module
 *
 * This module is the single source of the application's error vocabulary: the
 * throwable that carries a failure's code, HTTP status and optional field
 * details; the one table pairing every code with the status it is answered
 * with; and the two reservation issue strings the API contract fixes verbatim.
 *
 * Consumers: the four API routers, the four services, the authentication
 * middleware, the API-scoped not-found and error-handler middleware, and the
 * HTTP entry point. No other module defines a code, a status number or an
 * issue string, so the envelope's `code` field and its status can never drift
 * apart across routers.
 *
 * @module src/errors
 */

/**
 * Field-level detail attached to a validation failure.
 *
 * @typedef {Object} ErrorDetail
 * @property {string} field - Request field the failure concerns.
 * @property {string} issue - Short machine-readable issue identifier.
 */

/**
 * The complete error vocabulary: every code the API may answer with, paired
 * with its HTTP status.
 *
 * The table is frozen so no module can introduce a fourteenth code at runtime.
 * A failure that cannot be expressed by one of these codes is a defect in the
 * caller, never a reason to extend the table.
 *
 * @type {Readonly<Object<string, number>>}
 */
const ERROR_CODES = Object.freeze({
  /** Malformed, missing or out-of-range request input (400). */
  VALIDATION_ERROR: 400,

  /** Login email unknown or password mismatched; the two are indistinguishable (401). */
  INVALID_CREDENTIALS: 401,

  /** Protected route called without an Authorization: Bearer header (401). */
  TOKEN_REQUIRED: 401,

  /** Presented token is unknown or has been revoked (401). */
  TOKEN_INVALID: 401,

  /** Presented token is past its expiry (401). */
  TOKEN_EXPIRED: 401,

  /** Registration email already exists, compared case-insensitively (409). */
  EMAIL_ALREADY_REGISTERED: 409,

  /** Menu filter slug names no known category (404). */
  CATEGORY_NOT_FOUND: 404,

  /** Menu item id names no known item, in reads and in order lines (404). */
  MENU_ITEM_NOT_FOUND: 404,

  /** Order references an item that is not available (409). */
  MENU_ITEM_UNAVAILABLE: 409,

  /** Order id is unknown or is not owned by the caller (404). */
  ORDER_NOT_FOUND: 404,

  /** The caller already holds a reservation for that date and time (409). */
  RESERVATION_CONFLICT: 409,

  /** No route matches the requested path under the API mount point (404). */
  ROUTE_NOT_FOUND: 404,

  /** Unhandled failure; the stack is logged server-side and never returned (500). */
  INTERNAL_ERROR: 500
});

/**
 * The two reservation validation issue strings the API contract fixes verbatim,
 * one member name per string: `DATETIME_IN_PAST` and
 * `TIME_OUTSIDE_SERVICE_HOURS`. Each value is the contract string the API emits
 * verbatim in `details[].issue`.
 *
 * @type {Readonly<Object<string, string>>}
 */
const RESERVATION_ISSUES = Object.freeze({
  /** Checkpoint: the requested local datetime is before now. */
  DATETIME_IN_PAST: 'reservation_datetime_in_past',

  /** Checkpoint: the requested time is not a 30-minute slot inside the service window, or falls past the last seating. */
  TIME_OUTSIDE_SERVICE_HOURS: 'reservation_time_outside_service_hours'
});

/**
 * A failure belonging to the application's error vocabulary.
 *
 * The HTTP status is resolved from {@link ERROR_CODES} rather than accepted
 * from the caller, so a code can never be answered with a status that does not
 * belong to it. An unknown code throws a TypeError at construction instead of
 * surfacing later as a status-less failure.
 *
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} code - One of the keys of {@link ERROR_CODES}.
   * @param {string} message - Human-readable description; it must never carry
   *   a password, a token, a hash, a salt or a stack trace.
   * @param {ErrorDetail[]} [details] - Field-level details, supplied only for
   *   validation failures.
   * @throws {TypeError} When `code` is not a key of {@link ERROR_CODES}.
   */
  constructor(code, message, details = undefined) {
    const status = ERROR_CODES[code];

    if (!Number.isInteger(status)) {
      throw new TypeError(`Unknown error code: ${String(code)}`);
    }

    super(message);

    /**
     * Error class name, so the stack header names this class rather than Error.
     * @type {string}
     */
    this.name = 'AppError';

    /**
     * Vocabulary code the failure is answered with.
     * @type {string}
     */
    this.code = code;

    /**
     * HTTP status paired with the code in {@link ERROR_CODES}.
     * @type {number}
     */
    this.status = status;

    /**
     * Field-level details for a validation failure.
     * @type {ErrorDetail[]|undefined}
     * @default undefined
     */
    this.details = details;
  }
}

module.exports = {
  AppError,
  ERROR_CODES,
  RESERVATION_ISSUES
};
