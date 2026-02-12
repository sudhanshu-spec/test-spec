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
 * - LOG_LEVEL: Set Winston logging level (info, warn, error, debug)
 * - CORS_ORIGIN: Set allowed CORS origin(s)
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
   * Winston logging level
   * @type {string}
   * @default 'info'
   */
  logLevel: process.env.LOG_LEVEL || 'info',

  /**
   * Allowed CORS origin(s)
   * @type {string}
   * @default '*'
   */
  corsOrigin: process.env.CORS_ORIGIN || '*',

  /**
   * Explicit Node environment identifier
   * @type {string}
   * @default 'development'
   */
  nodeEnv: process.env.NODE_ENV || 'development'
};
