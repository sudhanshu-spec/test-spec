/**
 * @fileoverview Configuration Management Module
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
 * - LOG_LEVEL: Set Winston logging level (error, warn, info, http, verbose, debug, silly)
 * - APP_NAME: Set application identifier for log entries
 * - CORS_ORIGIN: Set allowed CORS origin(s) (* for all, or specific URL)
 *
 * @module src/config
 */

'use strict';

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
   * Winston logging level
   * Controls the minimum severity of messages that are logged.
   * Levels: error (0), warn (1), info (2), http (3), verbose (4), debug (5), silly (6)
   * @type {string}
   * @default 'info'
   */
  logLevel: process.env.LOG_LEVEL || 'info',

  /**
   * Application name used in log entries and process identification
   * @type {string}
   * @default 'hello_world'
   */
  appName: process.env.APP_NAME || 'hello_world',

  /**
   * Allowed CORS origin(s)
   * Use '*' to allow all origins, or specify a specific URL for production
   * @type {string}
   * @default '*'
   */
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
