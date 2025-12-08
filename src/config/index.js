// Load environment variables from .env file FIRST
require('dotenv').config();

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
 * - LOG_LEVEL: Logging level (error, warn, info, debug)
 * - LOG_FORMAT: Request log format (combined, common, dev, short, tiny)
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds
 * - RATE_LIMIT_MAX: Maximum requests per window
 * - CORS_ORIGIN: Allowed CORS origins
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
   * Logging configuration
   * @type {Object}
   * @property {string} level - Log level (error, warn, info, debug)
   * @property {string} format - Request log format
   */
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  /**
   * Rate limiting configuration
   * @type {Object}
   * @property {number} windowMs - Time window in milliseconds
   * @property {number} max - Maximum requests per window
   */
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  /**
   * CORS configuration
   * @type {Object}
   * @property {string} origin - Allowed origins
   */
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
