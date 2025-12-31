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
 * Security Environment Variables:
 * - CORS_ORIGIN: Comma-separated list of allowed CORS origins (default: '' - disabled)
 * - RATE_LIMIT_WINDOW_MS: Rate limiting window in milliseconds (default: 900000 - 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * - HTTPS_ENABLED: Enable HTTPS server mode (default: false)
 * - TLS_CERT_PATH: Path to TLS certificate file for HTTPS
 * - TLS_KEY_PATH: Path to TLS private key file for HTTPS
 * 
 * Security Configuration Rationale:
 * - CORS_ORIGIN empty by default for security (must explicitly enable)
 * - RATE_LIMIT_WINDOW_MS 15 minutes per OWASP recommendations
 * - RATE_LIMIT_MAX 100 requests is a reasonable default for rate limiting
 * - HTTPS_ENABLED false requires explicit opt-in for secure transport
 * - TLS paths empty as they are deployment-specific
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
   * Comma-separated list of allowed CORS origins.
   * Empty string disables CORS (most restrictive default for security).
   * @type {string}
   * @default ''
   * @example 'https://example.com,https://app.example.com'
   */
  corsOrigin: process.env.CORS_ORIGIN || '',

  /**
   * Rate limiting window duration in milliseconds.
   * Default is 15 minutes (900000ms) per OWASP recommendations.
   * @type {number}
   * @default 900000
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum number of requests allowed per rate limiting window.
   * Default is 100 requests per window.
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * Enable HTTPS server mode.
   * When true, the server will attempt to use TLS certificates.
   * Requires TLS_CERT_PATH and TLS_KEY_PATH to be configured.
   * @type {boolean}
   * @default false
   */
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',

  /**
   * Path to TLS certificate file (PEM format) for HTTPS.
   * Required when HTTPS_ENABLED is true.
   * @type {string}
   * @default ''
   */
  tlsCertPath: process.env.TLS_CERT_PATH || '',

  /**
   * Path to TLS private key file (PEM format) for HTTPS.
   * Required when HTTPS_ENABLED is true.
   * @type {string}
   * @default ''
   */
  tlsKeyPath: process.env.TLS_KEY_PATH || ''
};
