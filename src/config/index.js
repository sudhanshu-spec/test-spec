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
 * 
 * @example
 * // Override configuration with environment variables
 * // HOST=0.0.0.0 PORT=8080 NODE_ENV=production node server.js
 * 
 * @see module:server - Server entry point that consumes this configuration
 * @module src/config
 */

module.exports = {
  /**
   * Server host binding address
   * @type {string}
   * @default '127.0.0.1'
   * @example
   * // Bind to all network interfaces (accept external connections)
   * // HOST=0.0.0.0 node server.js
   */
  host: process.env.HOST || '127.0.0.1',

  /**
   * Server port number
   * 
   * Uses parseInt with radix 10 to ensure correct decimal parsing.
   * Falls back to 3000 if PORT is not set or is invalid (NaN).
   * 
   * @type {number}
   * @default 3000
   * @example
   * // Run server on custom port
   * // PORT=8080 node server.js
   */
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Application environment
   * 
   * Valid values: 'development', 'production', 'test'
   * 
   * @type {string}
   * @default 'development'
   * @example
   * // Run server in production mode
   * // NODE_ENV=production node server.js
   */
  env: process.env.NODE_ENV || 'development'
};
