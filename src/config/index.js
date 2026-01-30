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
 * Security Configuration:
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds (default: 900000 / 15 min)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * - CORS_ALLOWED_ORIGINS: Comma-separated allowed origins (default: '*')
 * 
 * HTTPS Configuration:
 * - HTTPS_ENABLED: Set to 'true' to enable HTTPS server (default: false)
 * - SSL_KEY_PATH: Path to SSL private key file
 * - SSL_CERT_PATH: Path to SSL certificate file
 * 
 * @module src/config
 */

'use strict';

/**
 * Parses a boolean from an environment variable string.
 * Recognizes 'true', '1', 'yes' as true values (case-insensitive).
 * @param {string|undefined} value - The environment variable value
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

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

  // =========================================================================
  // Rate Limiting Configuration
  // =========================================================================

  /**
   * Rate limit window in milliseconds
   * @type {number}
   * @default 900000 (15 minutes)
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum requests per rate limit window
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  // =========================================================================
  // CORS Configuration
  // =========================================================================

  /**
   * Allowed CORS origins (comma-separated string or '*' for all)
   * In production, should be set to specific trusted origins.
   * @type {string}
   * @default '*'
   */
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*',

  // =========================================================================
  // HTTPS Configuration
  // =========================================================================

  /**
   * Enable HTTPS server with TLS/SSL encryption.
   * When enabled, requires valid SSL certificate and key paths.
   * @type {boolean}
   * @default false
   */
  httpsEnabled: parseBoolean(process.env.HTTPS_ENABLED, false),

  /**
   * Path to SSL private key file.
   * Required when httpsEnabled is true.
   * @type {string}
   * @default './certs/server.key'
   */
  sslKeyPath: process.env.SSL_KEY_PATH || './certs/server.key',

  /**
   * Path to SSL certificate file.
   * Required when httpsEnabled is true.
   * @type {string}
   * @default './certs/server.cert'
   */
  sslCertPath: process.env.SSL_CERT_PATH || './certs/server.cert'
};
