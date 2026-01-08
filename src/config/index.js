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
 * - LOG_LEVEL: Log level for winston logger (error, warn, info, http, debug)
 * - LOG_FORMAT: Morgan log format (combined, common, dev, short, tiny)
 * - CORS_ORIGIN: CORS allowed origins
 * - PM2_INSTANCES: PM2 cluster instance count (0 = auto based on CPU cores)
 * 
 * @module src/config
 */

'use strict';

// Load environment variables from .env file
require('dotenv').config();

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
   * Logging level for winston
   * Levels: error, warn, info, http, verbose, debug, silly
   * @type {string}
   * @default 'info'
   */
  logLevel: process.env.LOG_LEVEL || 'info',

  /**
   * HTTP request log format for morgan
   * Formats: combined, common, dev, short, tiny
   * @type {string}
   * @default 'combined'
   */
  logFormat: process.env.LOG_FORMAT || 'combined',

  /**
   * CORS allowed origins
   * Use '*' to allow all origins (not recommended for production)
   * @type {string}
   * @default '*'
   */
  corsOrigin: process.env.CORS_ORIGIN || '*',

  /**
   * PM2 cluster instance count
   * 0 = auto based on CPU cores (uses 'max')
   * @type {number}
   * @default 0
   */
  pm2Instances: parseInt(process.env.PM2_INSTANCES, 10) || 0
};
