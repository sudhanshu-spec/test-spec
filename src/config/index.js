/**
 * Configuration Management Module
 * 
 * This module centralizes all application configuration values with environment
 * variable support following the Twelve-Factor App methodology for configuration
 * externalization within the Express.js application architecture.
 * 
 * Provides synchronous configuration for Express.js server binding via app.listen():
 * - host: '127.0.0.1' (default loopback address for Express.js server binding)
 * - port: 3000 (default port for Express.js HTTP listener)
 * 
 * Environment variable overrides:
 * - HOST: Override default host binding address
 * - PORT: Override default port number (parsed with parseInt radix 10)
 * - NODE_ENV: Set application environment (development, production, test)
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
  env: process.env.NODE_ENV || 'development'
};
