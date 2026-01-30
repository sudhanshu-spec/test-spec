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
 * Security Configuration:
 * This module also provides security-related configuration consumed by:
 * - src/middleware/security.js: Uses rateLimit and cors config for middleware setup
 * - server.js: Uses httpsEnabled, sslKeyPath, sslCertPath for HTTPS server creation
 * 
 * Environment variable overrides:
 * - HOST: Override default host binding
 * - PORT: Override default port number
 * - NODE_ENV: Set application environment (development, production, test)
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds (default: 900000 = 15 min)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * - CORS_ALLOWED_ORIGINS: Comma-separated allowed origins (default: '*' for all)
 * - HTTPS_ENABLED: Enable HTTPS server (default: false)
 * - SSL_KEY_PATH: Path to SSL private key file (default: './certs/server.key')
 * - SSL_CERT_PATH: Path to SSL certificate file (default: './certs/server.cert')
 * 
 * Configuration Rationale:
 * - Rate limiting defaults (100 requests/15 min) provide reasonable DoS protection
 *   without impacting legitimate users
 * - CORS defaults to permissive in development ('*') but should be restricted
 *   in production via CORS_ALLOWED_ORIGINS environment variable
 * - HTTPS is disabled by default to allow graceful fallback when certificates
 *   are not available; production deployments should enable HTTPS or use
 *   a reverse proxy (nginx) for TLS termination
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
   * Rate limiting configuration for DoS prevention
   * Configures express-rate-limit middleware to protect against
   * denial-of-service attacks by limiting request frequency per IP
   * @type {Object}
   */
  rateLimit: {
    /**
     * Time window for rate limiting in milliseconds
     * Requests are counted within this rolling window
     * @type {number}
     * @default 900000 (15 minutes)
     */
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

    /**
     * Maximum number of requests allowed per window per IP
     * Exceeding this limit returns HTTP 429 Too Many Requests
     * @type {number}
     * @default 100
     */
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  /**
   * CORS (Cross-Origin Resource Sharing) configuration
   * Controls which origins can access the API endpoints
   * Used by cors middleware in src/middleware/security.js
   * @type {Object}
   */
  cors: {
    /**
     * Allowed origins for cross-origin requests
     * Use comma-separated values for multiple origins in production
     * (e.g., 'https://example.com,https://app.example.com')
     * Use '*' for development to allow all origins
     * @type {string}
     * @default '*'
     */
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*'
  },

  /**
   * Whether HTTPS server is enabled
   * When true, server.js will create an HTTPS server instead of HTTP
   * using the SSL certificate and key files specified below
   * Set via HTTPS_ENABLED=true environment variable
   * @type {boolean}
   * @default false
   */
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',

  /**
   * Path to SSL private key file for HTTPS
   * Only used when httpsEnabled is true
   * Should point to a PEM-formatted private key file
   * Do not commit actual key files to version control
   * @type {string}
   * @default './certs/server.key'
   */
  sslKeyPath: process.env.SSL_KEY_PATH || './certs/server.key',

  /**
   * Path to SSL certificate file for HTTPS
   * Only used when httpsEnabled is true
   * Should point to a PEM-formatted certificate file
   * For production, use certificates from a trusted CA
   * @type {string}
   * @default './certs/server.cert'
   */
  sslCertPath: process.env.SSL_CERT_PATH || './certs/server.cert'
};
