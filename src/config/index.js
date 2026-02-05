/**
 * Load environment variables from .env file
 * This MUST be the first executable line to ensure environment
 * variables are available before any process.env access
 */
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
 * - LOG_LEVEL: Override default logging level (debug in development, info in production)
 * - LOG_FORMAT: Override default Morgan log format (combined)
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
   * Logging level for Winston
   * @type {string}
   * @default 'info' in production, 'debug' in development
   */
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  /**
   * Morgan log format
   * @type {string}
   * @default 'combined'
   */
  logFormat: process.env.LOG_FORMAT || 'combined'
};
