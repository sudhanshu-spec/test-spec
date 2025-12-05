/**
 * @fileoverview Centralized security configuration module for the Express.js application.
 * Provides default security settings and environment-based configuration loading for all
 * security middleware components including helmet.js, CORS, rate limiting, and HTTPS.
 * 
 * This module serves as the single source of truth for security settings, ensuring
 * consistent configuration across middleware/security.js and middleware/validation.js.
 * All security-related environment variables are parsed and validated here.
 * 
 * @module config/security
 * @requires None (pure configuration module)
 * @exports securityDefaults - Default security configuration object
 * @exports loadSecurityConfig - Function to load environment-based configuration
 * 
 * @description Security configuration following OWASP best practices:
 * - Helmet.js for HTTP security headers (CSP, HSTS, X-Frame-Options)
 * - CORS policy enforcement with configurable origin whitelist
 * - Rate limiting for DoS and brute force protection
 * - HTTPS/TLS configuration for encrypted communication
 * 
 * @author hxu
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Import and use security configuration
 * const { securityDefaults, loadSecurityConfig } = require('./config/security');
 * 
 * // Get default configuration
 * console.log(securityDefaults.rateLimit.limit); // 100
 * 
 * // Load environment-based configuration
 * const config = loadSecurityConfig();
 * console.log(config.cors.origin); // value from CORS_ORIGIN env var
 */

'use strict';

/**
 * Default security configuration object containing baseline settings for all
 * security middleware components. These defaults follow OWASP security guidelines
 * and Express.js best practices.
 * 
 * @constant {Object} securityDefaults
 * @property {Object} helmet - Helmet.js configuration for HTTP security headers
 * @property {Object} helmet.contentSecurityPolicy - Content Security Policy configuration
 * @property {Object} helmet.contentSecurityPolicy.directives - CSP directive definitions
 * @property {Array<string>} helmet.contentSecurityPolicy.directives.defaultSrc - Default source directive
 * @property {Array<string>} helmet.contentSecurityPolicy.directives.scriptSrc - Script source directive
 * @property {Object} helmet.hsts - HTTP Strict Transport Security settings
 * @property {number} helmet.hsts.maxAge - HSTS max-age in seconds (1 year = 31536000)
 * @property {Object} cors - CORS (Cross-Origin Resource Sharing) configuration
 * @property {string} cors.origin - Allowed origin for CORS requests
 * @property {boolean} cors.credentials - Whether to allow credentials in CORS requests
 * @property {number} cors.optionsSuccessStatus - HTTP status for successful OPTIONS requests
 * @property {Object} rateLimit - Rate limiting configuration for DoS protection
 * @property {number} rateLimit.windowMs - Time window in milliseconds for rate limiting
 * @property {number} rateLimit.limit - Maximum number of requests per window per IP
 * @property {string} rateLimit.standardHeaders - Rate limit headers standard to use
 * @property {boolean} rateLimit.legacyHeaders - Whether to include legacy X-RateLimit headers
 * @property {Object} https - HTTPS/TLS server configuration
 * @property {boolean} https.enabled - Whether HTTPS is enabled
 * @property {string} https.keyPath - Path to SSL private key file
 * @property {string} https.certPath - Path to SSL certificate file
 * @property {boolean} https.trustProxy - Whether to trust proxy headers (X-Forwarded-*)
 */
const securityDefaults = {
  /**
   * Helmet.js configuration for comprehensive HTTP security headers.
   * Implements OWASP recommended headers to mitigate XSS, clickjacking,
   * MIME sniffing, and other common web vulnerabilities.
   */
  helmet: {
    /**
     * Content Security Policy (CSP) configuration.
     * Restricts resource loading to prevent XSS and data injection attacks.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
     */
    contentSecurityPolicy: {
      /**
       * CSP directives defining allowed sources for various resource types.
       * Using "'self'" restricts loading to same origin only.
       */
      directives: {
        /**
         * Default source directive - fallback for other directives.
         * Restricts all resource loading to same origin by default.
         */
        defaultSrc: ["'self'"],
        /**
         * Script source directive - controls JavaScript loading.
         * Restricts script execution to same origin for XSS prevention.
         */
        scriptSrc: ["'self'"]
      }
    },
    /**
     * HTTP Strict Transport Security (HSTS) configuration.
     * Forces HTTPS connections to prevent protocol downgrade attacks.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
     */
    hsts: {
      /**
       * Maximum age for HSTS policy in seconds.
       * Set to 1 year (31536000 seconds) per security best practices.
       * Browsers will remember to only use HTTPS for this duration.
       */
      maxAge: 31536000
    }
  },

  /**
   * CORS (Cross-Origin Resource Sharing) configuration.
   * Controls which origins can access API resources and how.
   * Prevents unauthorized cross-origin requests while allowing legitimate access.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
   */
  cors: {
    /**
     * Allowed origin for CORS requests.
     * Default restricts to localhost for development security.
     * Should be configured via CORS_ORIGIN environment variable in production.
     */
    origin: 'http://localhost:3000',
    /**
     * Whether to include credentials (cookies, authorization headers) in CORS requests.
     * Set to true to allow authenticated cross-origin requests.
     */
    credentials: true,
    /**
     * HTTP status code for successful OPTIONS preflight requests.
     * Using 200 instead of 204 for legacy browser compatibility.
     */
    optionsSuccessStatus: 200
  },

  /**
   * Rate limiting configuration for DoS and brute force protection.
   * Limits the number of requests per IP address within a time window.
   * Uses express-rate-limit middleware with standardized headers.
   * @see https://www.npmjs.com/package/express-rate-limit
   */
  rateLimit: {
    /**
     * Time window for rate limiting in milliseconds.
     * Default is 15 minutes (900000ms) - standard window for API rate limiting.
     * Requests are counted within this sliding window.
     */
    windowMs: 900000,
    /**
     * Maximum number of requests allowed per IP per window.
     * Default is 100 requests per 15-minute window.
     * Exceeding this limit returns 429 Too Many Requests.
     */
    limit: 100,
    /**
     * Rate limit header standard to use.
     * 'draft-8' uses the latest IETF RateLimit header draft.
     * Includes RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers.
     */
    standardHeaders: 'draft-8',
    /**
     * Whether to include legacy X-RateLimit-* headers.
     * Disabled by default as standardHeaders provides modern alternatives.
     */
    legacyHeaders: false
  },

  /**
   * HTTPS/TLS server configuration for encrypted communication.
   * Enables secure HTTPS server when SSL certificates are provided.
   * Supports proxy trust configuration for deployment behind load balancers.
   */
  https: {
    /**
     * Whether HTTPS server is enabled.
     * Default is false for development; enable via ENABLE_HTTPS in production.
     */
    enabled: false,
    /**
     * Path to SSL private key file (PEM format).
     * Required when https.enabled is true.
     * Example: './certs/key.pem' or '/etc/ssl/private/server.key'
     */
    keyPath: '',
    /**
     * Path to SSL certificate file (PEM format).
     * Required when https.enabled is true.
     * Can be a certificate chain file for production deployments.
     * Example: './certs/cert.pem' or '/etc/ssl/certs/server.crt'
     */
    certPath: '',
    /**
     * Whether to trust proxy headers (X-Forwarded-For, X-Forwarded-Proto).
     * Enable when running behind a reverse proxy or load balancer.
     * Required for accurate client IP detection in rate limiting.
     */
    trustProxy: false
  }
};

/**
 * Loads security configuration by merging default values with environment variables.
 * Provides environment-based configuration overrides for all security settings.
 * 
 * Environment variables supported:
 * - CORS_ORIGIN: Allowed CORS origin (string)
 * - RATE_LIMIT_WINDOW_MS: Rate limit window in milliseconds (integer)
 * - RATE_LIMIT_MAX: Maximum requests per window (integer)
 * - ENABLE_HTTPS: Enable HTTPS server ('true' or 'false')
 * - SSL_KEY_PATH: Path to SSL private key file (string)
 * - SSL_CERT_PATH: Path to SSL certificate file (string)
 * - TRUST_PROXY: Trust proxy headers ('true' or 'false')
 * 
 * @function loadSecurityConfig
 * @returns {Object} Merged security configuration object with structure matching securityDefaults
 * @returns {Object} return.helmet - Helmet.js configuration (defaults preserved)
 * @returns {Object} return.cors - CORS configuration with environment overrides
 * @returns {Object} return.rateLimit - Rate limiting configuration with environment overrides
 * @returns {Object} return.https - HTTPS configuration with environment overrides
 * 
 * @example
 * // With environment variables set:
 * // CORS_ORIGIN=https://example.com
 * // RATE_LIMIT_MAX=50
 * // ENABLE_HTTPS=true
 * 
 * const config = loadSecurityConfig();
 * console.log(config.cors.origin); // 'https://example.com'
 * console.log(config.rateLimit.limit); // 50
 * console.log(config.https.enabled); // true
 * 
 * @example
 * // Without environment variables (uses defaults):
 * const config = loadSecurityConfig();
 * console.log(config.cors.origin); // 'http://localhost:3000'
 * console.log(config.rateLimit.limit); // 100
 * console.log(config.https.enabled); // false
 */
function loadSecurityConfig() {
  /**
   * Parse boolean environment variable value.
   * Converts string 'true'/'false' to boolean, with fallback default.
   * 
   * @param {string|undefined} value - Environment variable value
   * @param {boolean} defaultValue - Default value if env var is not set
   * @returns {boolean} Parsed boolean value
   */
  const parseBoolean = (value, defaultValue) => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  };

  /**
   * Parse integer environment variable value with fallback.
   * Uses parseInt and falls back to default on invalid/missing values.
   * 
   * @param {string|undefined} value - Environment variable value
   * @param {number} defaultValue - Default value if env var is not set or invalid
   * @returns {number} Parsed integer value
   */
  const parseInteger = (value, defaultValue) => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Read environment variables
  const corsOrigin = process.env.CORS_ORIGIN;
  const rateLimitWindowMs = process.env.RATE_LIMIT_WINDOW_MS;
  const rateLimitMax = process.env.RATE_LIMIT_MAX;
  const enableHttps = process.env.ENABLE_HTTPS;
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;
  const trustProxy = process.env.TRUST_PROXY;

  // Build merged configuration object
  return {
    /**
     * Helmet configuration - uses defaults as these are standard security headers.
     * Can be extended here if environment-specific CSP or HSTS settings are needed.
     */
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: securityDefaults.helmet.contentSecurityPolicy.directives.defaultSrc,
          scriptSrc: securityDefaults.helmet.contentSecurityPolicy.directives.scriptSrc
        }
      },
      hsts: {
        maxAge: securityDefaults.helmet.hsts.maxAge
      }
    },

    /**
     * CORS configuration with environment override for origin.
     * Allows CORS_ORIGIN environment variable to set allowed origin.
     */
    cors: {
      origin: corsOrigin || securityDefaults.cors.origin,
      credentials: securityDefaults.cors.credentials,
      optionsSuccessStatus: securityDefaults.cors.optionsSuccessStatus
    },

    /**
     * Rate limiting configuration with environment overrides.
     * RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX can customize throttling.
     */
    rateLimit: {
      windowMs: parseInteger(rateLimitWindowMs, securityDefaults.rateLimit.windowMs),
      limit: parseInteger(rateLimitMax, securityDefaults.rateLimit.limit),
      standardHeaders: securityDefaults.rateLimit.standardHeaders,
      legacyHeaders: securityDefaults.rateLimit.legacyHeaders
    },

    /**
     * HTTPS configuration with environment overrides.
     * ENABLE_HTTPS, SSL_KEY_PATH, SSL_CERT_PATH, and TRUST_PROXY can be configured.
     */
    https: {
      enabled: parseBoolean(enableHttps, securityDefaults.https.enabled),
      keyPath: sslKeyPath || securityDefaults.https.keyPath,
      certPath: sslCertPath || securityDefaults.https.certPath,
      trustProxy: parseBoolean(trustProxy, securityDefaults.https.trustProxy)
    }
  };
}

// Export security configuration using CommonJS module.exports
module.exports = {
  securityDefaults,
  loadSecurityConfig
};
