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
 * - RATE_LIMIT_WINDOW_MS: Rate limit window duration in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * - CORS_ORIGINS: Comma-separated list of allowed CORS origins (default: '*' for development)
 * 
 * HTTPS Configuration:
 * - HTTPS_ENABLED: Set to 'true' to enable HTTPS mode
 * - SSL_KEY_PATH: Path to the SSL private key file
 * - SSL_CERT_PATH: Path to the SSL certificate file
 * 
 * @module src/config
 */

'use strict';

/**
 * Parse a boolean-like environment variable value.
 * Accepts 'true', '1', 'yes' as truthy values.
 * @param {string|undefined} value - Environment variable value
 * @param {boolean} defaultValue - Default value if undefined
 * @returns {boolean} Parsed boolean value
 */
function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Parse CORS origins from environment variable.
 * Supports comma-separated list or single origin.
 * @param {string|undefined} value - Environment variable value
 * @returns {string|string[]|boolean} Parsed CORS origin configuration
 */
function parseCorsOrigins(value) {
  if (!value || value === '*') {
    return '*';
  }
  const origins = value.split(',').map(origin => origin.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

module.exports = {
  // ---------------------------------------------------------------------------
  // Server Configuration
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Rate Limiting Configuration
  // ---------------------------------------------------------------------------

  /**
   * Rate limit window duration in milliseconds.
   * Defines the time window for counting requests per IP.
   * @type {number}
   * @default 900000 (15 minutes)
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,

  /**
   * Maximum number of requests per window per IP address.
   * Exceeding this limit returns HTTP 429 Too Many Requests.
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  // ---------------------------------------------------------------------------
  // CORS Configuration
  // ---------------------------------------------------------------------------

  /**
   * Allowed CORS origins.
   * Can be a single origin string, array of origins, or '*' for all.
   * In production, specify explicit origins for security.
   * @type {string|string[]|boolean}
   * @default '*'
   */
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),

  // ---------------------------------------------------------------------------
  // HTTPS/TLS Configuration
  // ---------------------------------------------------------------------------

  /**
   * Enable HTTPS mode with TLS encryption.
   * When true, requires valid SSL_KEY_PATH and SSL_CERT_PATH.
   * @type {boolean}
   * @default false
   */
  httpsEnabled: parseBoolean(process.env.HTTPS_ENABLED, false),

  /**
   * Path to the SSL private key file (PEM format).
   * Required when HTTPS_ENABLED is true.
   * @type {string|undefined}
   * @example './certs/key.pem'
   */
  sslKeyPath: process.env.SSL_KEY_PATH || undefined,

  /**
   * Path to the SSL certificate file (PEM format).
   * Required when HTTPS_ENABLED is true.
   * @type {string|undefined}
   * @example './certs/cert.pem'
   */
  sslCertPath: process.env.SSL_CERT_PATH || undefined
};
