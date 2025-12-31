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
 * - CORS_ORIGIN: Comma-separated list of allowed CORS origins
 *   Default: '' (empty string - CORS disabled by default for security)
 * - RATE_LIMIT_WINDOW_MS: Time window for rate limiting in milliseconds
 *   Default: 900000 (15 minutes per OWASP recommendations)
 * - RATE_LIMIT_MAX: Maximum number of requests allowed per window
 *   Default: 100 requests (reasonable default for rate limiting)
 * - HTTPS_ENABLED: Enable HTTPS server mode
 *   Default: false (requires explicit opt-in for secure transport)
 * - TLS_CERT_PATH: Path to TLS certificate file for HTTPS
 *   Default: '' (deployment-specific, must be configured for HTTPS)
 * - TLS_KEY_PATH: Path to TLS private key file for HTTPS
 *   Default: '' (deployment-specific, must be configured for HTTPS)
 * 
 * Security Configuration Rationale:
 * - CORS_ORIGIN empty by default for security (must explicitly enable cross-origin access)
 * - RATE_LIMIT_WINDOW_MS 15 minutes per OWASP recommendations for DoS protection
 * - RATE_LIMIT_MAX 100 requests is a reasonable default to prevent brute-force attacks
 * - HTTPS_ENABLED false requires explicit opt-in for secure transport configuration
 * - TLS paths empty as they are deployment-specific and should not have defaults
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
   * When set, allows cross-origin requests from the specified origins only.
   * @type {string}
   * @default ''
   * @example 'https://example.com,https://app.example.com'
   */
  corsOrigin: process.env.CORS_ORIGIN || '',

  /**
   * Rate limiting window duration in milliseconds.
   * Default is 15 minutes (900000ms) per OWASP recommendations for DoS protection.
   * Requests exceeding the limit within this window will receive 429 Too Many Requests.
   * @type {number}
   * @default 900000
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum number of requests allowed per rate limiting window.
   * Default is 100 requests per window to prevent brute-force and DoS attacks.
   * Adjust based on application requirements and expected legitimate traffic.
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * Enable HTTPS server mode.
   * When true, the server will attempt to use TLS certificates for secure transport.
   * Requires TLS_CERT_PATH and TLS_KEY_PATH to be configured with valid certificate paths.
   * @type {boolean}
   * @default false
   */
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',

  /**
   * Path to TLS certificate file (PEM format) for HTTPS.
   * Required when HTTPS_ENABLED is true.
   * Should point to a valid SSL/TLS certificate file.
   * @type {string}
   * @default ''
   * @example '/etc/ssl/certs/server.crt'
   */
  tlsCertPath: process.env.TLS_CERT_PATH || '',

  /**
   * Path to TLS private key file (PEM format) for HTTPS.
   * Required when HTTPS_ENABLED is true.
   * Should point to a valid SSL/TLS private key file.
   * Keep this file secure with restricted permissions (0600 recommended).
   * @type {string}
   * @default ''
   * @example '/etc/ssl/private/server.key'
   */
  tlsKeyPath: process.env.TLS_KEY_PATH || ''
};
