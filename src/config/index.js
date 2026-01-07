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
 * - VIEWS_DIR: Override default views directory path (default: './views')
 * - PUBLIC_DIR: Override default public assets directory path (default: './public')
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
   * Views directory path for EJS templates
   * @type {string}
   * @default './views'
   */
  viewsDir: process.env.VIEWS_DIR || './views',

  /**
   * Public directory path for static assets (CSS, JS, images)
   * @type {string}
   * @default './public'
   */
  publicDir: process.env.PUBLIC_DIR || './public'
};
