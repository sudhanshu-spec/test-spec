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
 * - LOG_LEVEL: Set logging verbosity (error, warn, info, http, debug)
 * 
 * @module src/config
 */

'use strict';

/**
 * Validates environment configuration and logs warnings for missing recommended variables
 * Does not throw errors - only logs warnings for transparency
 * 
 * @returns {void}
 */
const validateEnvironment = () => {
  const recommended = ['NODE_ENV', 'LOG_LEVEL'];
  const missing = recommended.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Warning: Missing recommended environment variables: ${missing.join(', ')}`);
  }
};

// Run validation (only logs warnings, does not throw)
validateEnvironment();

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
   * Controls Winston logger verbosity
   * @type {string}
   * @default 'debug'
   */
  logLevel: process.env.LOG_LEVEL || 'debug'
};
