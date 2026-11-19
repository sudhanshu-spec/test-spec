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
 * - PORT: Server port number
 * - NODE_ENV: Application environment (development, production, test)
 * - DB_FILE: Path to the SQLite database file
 * - CORS_ORIGIN: The single allowed browser origin
 * - TOKEN_TTL_HOURS: Session-token lifetime in hours
 * - SERVICE_OPEN_TIME: Reservation service window opening time (HH:MM)
 * - SERVICE_CLOSE_TIME: Reservation service window closing time (HH:MM)
 * - MAX_PARTY_SIZE: Largest reservable party size
 * - RESERVATION_HORIZON_DAYS: How many days ahead a reservation may be booked
 * 
 * @module src/config
 */

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
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Application environment
   * @type {string}
   * @default 'development'
   */
  env: process.env.NODE_ENV || 'development',

  /**
   * Path to the SQLite database file, relative to the repository root
   * @type {string}
   * @default 'data/app.db'
   */
  dbFile: process.env.DB_FILE || 'data/app.db',

  /**
   * The single browser origin allowed to call the API
   * @type {string}
   * @default 'http://localhost:5173'
   */
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  /**
   * Session-token lifetime in hours
   * @type {number}
   * @default 24
   */
  tokenTtlHours: parseInt(process.env.TOKEN_TTL_HOURS, 10) || 24,

  /**
   * Reservation service window opening time (HH:MM)
   * @type {string}
   * @default '17:00'
   */
  serviceOpenTime: process.env.SERVICE_OPEN_TIME || '17:00',

  /**
   * Reservation service window closing time (HH:MM)
   * @type {string}
   * @default '22:00'
   */
  serviceCloseTime: process.env.SERVICE_CLOSE_TIME || '22:00',

  /**
   * Largest party size a single reservation may book
   * @type {number}
   * @default 12
   */
  maxPartySize: parseInt(process.env.MAX_PARTY_SIZE, 10) || 12,

  /**
   * How many days ahead a reservation may be booked
   * @type {number}
   * @default 90
   */
  reservationHorizonDays: parseInt(process.env.RESERVATION_HORIZON_DAYS, 10) || 90
};
