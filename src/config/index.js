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
 * Security environment variable overrides:
 * - RATE_LIMIT_WINDOW_MS: Rate limit window duration in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per rate limit window (default: 100)
 * - CORS_ORIGINS: Allowed CORS origins, comma-separated for multiple (default: '*')
 * - HTTPS_ENABLED: Enable HTTPS mode ('true' to enable, default: false)
 * - SSL_KEY_PATH: Path to SSL private key file (required if HTTPS_ENABLED=true)
 * - SSL_CERT_PATH: Path to SSL certificate file (required if HTTPS_ENABLED=true)
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
   * Rate limit window duration in milliseconds
   * @type {number}
   * @default 900000 (15 minutes)
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,

  /**
   * Maximum requests per rate limit window
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * CORS allowed origins (comma-separated for multiple)
   * @type {string}
   * @default '*' (all origins in development)
   */
  corsOrigins: process.env.CORS_ORIGINS || '*',

  /**
   * Enable HTTPS mode
   * @type {boolean}
   * @default false
   */
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',

  /**
   * Path to SSL private key file
   * @type {string|undefined}
   * @default undefined
   */
  sslKeyPath: process.env.SSL_KEY_PATH || undefined,

  /**
   * Path to SSL certificate file
   * @type {string|undefined}
   * @default undefined
   */
  sslCertPath: process.env.SSL_CERT_PATH || undefined
};
