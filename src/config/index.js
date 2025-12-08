require('dotenv').config();

/**
 * Configuration Management Module
 * 
 * This module centralizes all application configuration values with environment
 * variable support following the Twelve-Factor App methodology for configuration
 * externalization. dotenv integration loads environment variables from .env file
 * into process.env before configuration processing.
 * 
 * Default values preserve backward compatibility with original server.js implementation:
 * - host: '127.0.0.1' (from original server.js line 3)
 * - port: 3000 (from original server.js line 4)
 * 
 * Configuration Sections:
 * - Server: Basic server binding configuration (host, port, env)
 * - Logging: Winston logger configuration (level, format)
 * - Rate Limiting: Express rate limiter settings (windowMs, max)
 * - CORS: Cross-Origin Resource Sharing configuration (origin)
 * 
 * Environment variable overrides:
 * - HOST: Override default host binding (default: '127.0.0.1')
 * - PORT: Override default port number (default: 3000)
 * - NODE_ENV: Set application environment (default: 'development')
 * - LOG_LEVEL: Logging verbosity level - error, warn, info, debug (default: 'info')
 * - LOG_FORMAT: Request log format - combined, common, dev, short, tiny (default: 'combined')
 * - RATE_LIMIT_WINDOW_MS: Rate limit time window in milliseconds (default: 900000 = 15 min)
 * - RATE_LIMIT_MAX: Maximum requests per rate limit window (default: 100)
 * - CORS_ORIGIN: Allowed CORS origins - comma-separated or '*' (default: '*')
 * 
 * @module src/config
 */

/**
 * Application configuration object with nested configuration sections.
 * All configuration values are read-only after initial load.
 * 
 * @typedef {Object} LoggingConfig
 * @property {string} level - Logging verbosity level (error, warn, info, debug)
 * @property {string} format - Request logging format (combined, common, dev, short, tiny)
 * 
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds for rate limiting
 * @property {number} max - Maximum number of requests allowed within the window
 * 
 * @typedef {Object} CorsConfig
 * @property {string} origin - Allowed CORS origins ('*' for all, or specific origins)
 * 
 * @typedef {Object} AppConfig
 * @property {string} host - Server host binding address
 * @property {number} port - Server port number
 * @property {string} env - Application environment (development, production, test)
 * @property {LoggingConfig} logging - Logging configuration
 * @property {RateLimitConfig} rateLimit - Rate limiting configuration
 * @property {CorsConfig} cors - CORS configuration
 */

/**
 * Application configuration object exported as default.
 * Contains server settings and nested configuration for logging, rate limiting, and CORS.
 * 
 * @type {AppConfig}
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
   * Logging configuration for Winston logger and request logging middleware.
   * Controls verbosity level and output format for application logs.
   * 
   * @type {LoggingConfig}
   */
  logging: {
    /**
     * Logging verbosity level.
     * Supported levels: 'error', 'warn', 'info', 'debug'
     * In production, 'info' or 'warn' is recommended for performance.
     * @type {string}
     * @default 'info'
     */
    level: process.env.LOG_LEVEL || 'info',

    /**
     * Request logging format for HTTP request middleware.
     * Supported formats: 'combined', 'common', 'dev', 'short', 'tiny'
     * 'combined' provides Apache-style access logs with referrer and user-agent.
     * @type {string}
     * @default 'combined'
     */
    format: process.env.LOG_FORMAT || 'combined'
  },

  /**
   * Rate limiting configuration for express-rate-limit middleware.
   * Protects API endpoints from brute-force attacks and DoS attempts.
   * 
   * @type {RateLimitConfig}
   */
  rateLimit: {
    /**
     * Time window in milliseconds for rate limiting.
     * Requests are counted within this rolling window.
     * Default is 15 minutes (900000ms).
     * @type {number}
     * @default 900000
     */
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

    /**
     * Maximum number of requests allowed per windowMs.
     * After exceeding this limit, requests are rejected with 429 Too Many Requests.
     * @type {number}
     * @default 100
     */
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  },

  /**
   * CORS (Cross-Origin Resource Sharing) configuration.
   * Controls which domains can access the API from browser-based applications.
   * 
   * @type {CorsConfig}
   */
  cors: {
    /**
     * Allowed CORS origins.
     * Set to '*' to allow all origins, or specify domain(s) for stricter security.
     * In production, restrict to specific trusted domains.
     * @type {string}
     * @default '*'
     */
    origin: process.env.CORS_ORIGIN || '*'
  }
};

/**
 * Validates the configuration object to ensure all values are within acceptable ranges.
 * Throws an Error if validation fails, preventing application startup with invalid config.
 * 
 * Validation rules:
 * - port: Must be a valid integer between 0 and 65535
 * - logging.level: Must be one of 'error', 'warn', 'info', 'debug'
 * - rateLimit.windowMs: Must be a positive number
 * - rateLimit.max: Must be a positive number
 * 
 * @throws {Error} If any configuration value fails validation
 * @returns {boolean} Returns true if all validations pass
 */
function validateConfig() {
  const config = module.exports;
  const validLogLevels = ['error', 'warn', 'info', 'debug'];

  // Validate port number is within valid TCP port range
  if (isNaN(config.port) || config.port < 0 || config.port > 65535) {
    throw new Error(
      `Invalid PORT configuration: ${config.port}. Must be a number between 0 and 65535.`
    );
  }

  // Validate logging level is a recognized value
  if (!validLogLevels.includes(config.logging.level)) {
    throw new Error(
      `Invalid LOG_LEVEL configuration: ${config.logging.level}. Must be one of: ${validLogLevels.join(', ')}.`
    );
  }

  // Validate rate limit window is a positive number
  if (isNaN(config.rateLimit.windowMs) || config.rateLimit.windowMs <= 0) {
    throw new Error(
      `Invalid RATE_LIMIT_WINDOW_MS configuration: ${config.rateLimit.windowMs}. Must be a positive number.`
    );
  }

  // Validate rate limit max is a positive number
  if (isNaN(config.rateLimit.max) || config.rateLimit.max <= 0) {
    throw new Error(
      `Invalid RATE_LIMIT_MAX configuration: ${config.rateLimit.max}. Must be a positive number.`
    );
  }

  return true;
}

// Export validateConfig for optional use by consuming modules
module.exports.validateConfig = validateConfig;
