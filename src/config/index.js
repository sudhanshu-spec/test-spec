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
 * - CORS_ORIGIN: Override default CORS allowed origin
 * - RATE_LIMIT_WINDOW_MS: Override rate limit window duration in milliseconds
 * - RATE_LIMIT_MAX: Override max requests per window per IP
 * - HTTPS_ENABLED: Enable HTTPS server ('true' to enable)
 * - SSL_KEY_PATH: Path to SSL private key file
 * - SSL_CERT_PATH: Path to SSL certificate file
 * - TRUST_PROXY: Enable Express trust proxy setting ('true' to enable)
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
   * CORS allowed origin for cross-origin request policy enforcement.
   * Restricts cross-origin access to known origins.
   * @type {string}
   * @default 'http://localhost:3000'
   */
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  /**
   * Rate limit window duration in milliseconds.
   * Defines the time window for rate limiting (default: 15 minutes).
   * @type {number}
   * @default 900000
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum number of requests per window per IP address.
   * Limits each IP to this many requests within the rate limit window.
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * Flag to enable HTTPS server creation.
   * When true and SSL certificate paths are configured, the server
   * creates an HTTPS connection using TLS encryption.
   * @type {boolean}
   * @default false
   */
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',

  /**
   * Path to TLS private key file for HTTPS server.
   * Required when httpsEnabled is true.
   * @type {string}
   * @default ''
   */
  sslKeyPath: process.env.SSL_KEY_PATH || '',

  /**
   * Path to TLS certificate file for HTTPS server.
   * Required when httpsEnabled is true.
   * @type {string}
   * @default ''
   */
  sslCertPath: process.env.SSL_CERT_PATH || '',

  /**
   * Enables Express trust proxy setting for correct IP resolution
   * behind reverse proxies (e.g., nginx, AWS ELB).
   * When true, Express trusts the X-Forwarded-For header for client IP.
   * @type {boolean}
   * @default false
   */
  trustProxy: process.env.TRUST_PROXY === 'true'
};
