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
 * - SHUTDOWN_TIMEOUT: Maximum wait time (ms) for graceful shutdown (default: 5000)
 * - REQUEST_TIMEOUT: HTTP request timeout (ms) to prevent hung connections (default: 30000)
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
   * Maximum wait time in milliseconds for graceful shutdown before force-killing the process
   * @type {number}
   * @default 5000
   */
  shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT, 10) || 5000,

  /**
   * HTTP request timeout in milliseconds to prevent hung connections
   * @type {number}
   * @default 30000
   */
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000
};
