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
 * Environment variable overrides:
 * - HOST: Override default host binding
 * - PORT: Override default port number
 * - NODE_ENV: Set application environment (development, production, test)
 * - LOG_LEVEL: Set logging verbosity (error, warn, info, http, verbose, debug, silly)
 * - RATE_LIMIT_WINDOW_MS: Rate limiting window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per rate limit window (default: 100)
 * - COMPRESSION_THRESHOLD: Minimum response size in bytes to compress (default: 1024)
 * - CORS_ORIGIN: Allowed origin(s) for CORS requests (default: '*')
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
   * Application log level
   * @type {string}
   * @default 'info'
   */
  logLevel: process.env.LOG_LEVEL || 'info',

  /**
   * Rate limiting configuration
   * @type {Object}
   * @property {number} windowMs - Rate limit window in milliseconds (default: 15 minutes)
   * @property {number} max - Maximum requests per window (default: 100)
   */
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  /**
   * Response compression configuration
   * @type {Object}
   * @property {number} threshold - Minimum response size to compress in bytes (default: 1KB)
   * @property {number} level - Compression level 0-9 (default: 6, balanced)
   */
  compression: {
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD, 10) || 1024,
    level: 6
  },

  /**
   * CORS configuration
   * @type {Object}
   * @property {string} origin - Allowed origin(s) for CORS (default: '*')
   */
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
