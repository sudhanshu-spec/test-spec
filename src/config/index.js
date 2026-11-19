/**
 * Configuration Management Module
 * 
 * This module centralizes all application configuration values with environment
 * variable support following the Twelve-Factor App methodology for configuration
 * externalization.
 * 
 * Default values preserve backward compatibility with original server.js implementation:
 * - host: '127.0.0.1' (from original server.js line 3)
 * - port: 3000 (from original server.js line 4)
 * 
 * This module is the only reader of process.env in the application; every other
 * module reads the already-evaluated values off the exported object.
 * 
 * Environment variable overrides:
 * - HOST: Server binding address
 * - PORT: Server port number (integer 1-65535)
 * - NODE_ENV: Application environment (development, production, test)
 * - DB_FILE: Path to the SQLite database file
 * - CORS_ORIGIN: The single allowed browser origin, never the '*' wildcard
 * - TOKEN_TTL_HOURS: Session-token lifetime in hours (integer >= 1)
 * - SERVICE_OPEN_TIME: Reservation service window opening time (HH:MM)
 * - SERVICE_CLOSE_TIME: Service window closing time (HH:MM), later than the opening
 * - MAX_PARTY_SIZE: Largest reservable party size (integer 1-12)
 * - RESERVATION_HORIZON_DAYS: Days ahead a reservation may be booked (integer >= 1)
 * 
 * A variable that is unset, empty, unparsable or parses to zero keeps its
 * documented default; a parsed value outside its domain throws at require time,
 * naming the variable.
 * 
 * @module src/config
 */

// Zero-padded 24-hour times only. They compare correctly as plain strings, which
// is what keeps the window order check in readServiceWindow() exact.
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Read an integer setting from the environment.
 * An unset, empty or unparsable value keeps the documented default; a parsed
 * value outside [min, max] throws with a message naming the variable.
 * @param {string|undefined} raw - Raw value of the environment variable
 * @param {number} fallback - Documented default
 * @param {string} name - Environment variable name, used in the error message
 * @param {number} min - Smallest accepted value
 * @param {number} [max] - Largest accepted value; unbounded when omitted
 * @returns {number} The validated setting
 * @throws {Error} When the parsed value lies outside [min, max]
 */
function readInteger(raw, fallback, name, min, max) {
  const value = parseInt(raw, 10) || fallback;
  const expected = max === undefined ? `an integer of at least ${min}` : `an integer between ${min} and ${max}`;
  if (value < min || (max !== undefined && value > max)) {
    throw new Error(`Invalid ${name}: ${value}. Expected ${expected}.`);
  }
  return value;
}

/**
 * Read one end of the reservation service window.
 * An unset, empty or blank value keeps the documented default; anything else
 * must be a zero-padded 24-hour HH:MM time.
 * @param {string|undefined} raw - Raw value of the environment variable
 * @param {string} fallback - Documented default
 * @param {string} name - Environment variable name, used in the error message
 * @returns {string} The validated HH:MM time
 * @throws {Error} When the value is not an HH:MM time
 */
function readClockTime(raw, fallback, name) {
  const value = (raw || '').trim() || fallback;
  if (!HH_MM_PATTERN.test(value)) {
    throw new Error(`Invalid ${name}: ${value}. Expected a 24-hour HH:MM time.`);
  }
  return value;
}

/**
 * Resolve the reservation service window, whose two ends are only meaningful
 * together: an inverted or zero-length window puts every slot outside it, which
 * would answer every reservation with a 400 and no diagnostic at startup.
 * @param {string|undefined} rawOpen - Raw SERVICE_OPEN_TIME value
 * @param {string|undefined} rawClose - Raw SERVICE_CLOSE_TIME value
 * @returns {{open: string, close: string}} The validated window
 * @throws {Error} When either end is not HH:MM, or the window is not positive
 */
function readServiceWindow(rawOpen, rawClose) {
  const open = readClockTime(rawOpen, '17:00', 'SERVICE_OPEN_TIME');
  const close = readClockTime(rawClose, '22:00', 'SERVICE_CLOSE_TIME');
  if (open >= close) {
    throw new Error(`Invalid SERVICE_OPEN_TIME: ${open} with SERVICE_CLOSE_TIME: ${close}. `
      + 'Expected SERVICE_OPEN_TIME earlier than SERVICE_CLOSE_TIME.');
  }
  return { open, close };
}

/**
 * Read the single browser origin allowed to call the API.
 * An unset, empty or blank value keeps the documented default; the '*' wildcard
 * is rejected, because it would widen the one-configured-origin policy into
 * allow-every-origin through configuration alone.
 * @param {string|undefined} raw - Raw CORS_ORIGIN value
 * @returns {string} The validated origin
 * @throws {Error} When the value is the '*' wildcard
 */
function readCorsOrigin(raw) {
  const value = (raw || '').trim();
  if (value === '') {
    return 'http://localhost:5173';
  }
  if (value === '*') {
    throw new Error("Invalid CORS_ORIGIN: '*'. Expected a single origin, not a wildcard.");
  }
  return value;
}

// Resolved once, here, because both ends of the window are only meaningful
// together and an invalid window must stop the process before it serves a slot.
const serviceWindow = readServiceWindow(process.env.SERVICE_OPEN_TIME, process.env.SERVICE_CLOSE_TIME);

module.exports = {
  /**
   * Server host binding address
   * @type {string}
   * @default '127.0.0.1'
   */
  host: process.env.HOST || '127.0.0.1',

  /**
   * Server port number
   * @type {number}
   * @default 3000
   */
  port: readInteger(process.env.PORT, 3000, 'PORT', 1, 65535),

  /**
   * Application environment
   * @type {string}
   * @default 'development'
   */
  env: process.env.NODE_ENV || 'development',

  /**
   * Path to the SQLite database file. src/db/index.js resolves it with
   * path.resolve(config.dbFile), so a relative path is resolved against the
   * process working directory, not against the repository root.
   * @type {string}
   * @default 'data/app.db'
   */
  dbFile: process.env.DB_FILE || 'data/app.db',

  /**
   * The single browser origin allowed to call the API
   * @type {string}
   * @default 'http://localhost:5173'
   */
  corsOrigin: readCorsOrigin(process.env.CORS_ORIGIN),

  /**
   * Session-token lifetime in hours. Below one, every minted token would be
   * already expired, so that range is rejected at load time.
   * @type {number}
   * @default 24
   */
  tokenTtlHours: readInteger(process.env.TOKEN_TTL_HOURS, 24, 'TOKEN_TTL_HOURS', 1),

  /**
   * Reservation service window opening time (HH:MM)
   * @type {string}
   * @default '17:00'
   */
  serviceOpenTime: serviceWindow.open,

  /**
   * Reservation service window closing time (HH:MM)
   * @type {string}
   * @default '22:00'
   */
  serviceCloseTime: serviceWindow.close,

  /**
   * Largest party size a single reservation may book. The ceiling is the
   * schema's own CHECK (party_size BETWEEN 1 AND 12): a larger configured value
   * could only be rejected by the database, turning a 400 into a 500, so it is
   * refused when the configuration is read. Checkpoint 4 of the reservation
   * service bounds the party size by this setting and by that same schema bound.
   * @type {number}
   * @default 12
   */
  maxPartySize: readInteger(process.env.MAX_PARTY_SIZE, 12, 'MAX_PARTY_SIZE', 1, 12),

  /**
   * How many days ahead a reservation may be booked. Below one, every date
   * would fall outside the horizon and be rejected.
   * @type {number}
   * @default 90
   */
  reservationHorizonDays: readInteger(process.env.RESERVATION_HORIZON_DAYS, 90, 'RESERVATION_HORIZON_DAYS', 1)
};
