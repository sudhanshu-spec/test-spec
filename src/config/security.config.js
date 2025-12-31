/**
 * Security Configuration Module
 * 
 * Centralized security middleware configuration for the Express application.
 * This module exports configuration objects for helmet.js, express-rate-limit,
 * and cors middleware with environment-driven settings and secure defaults.
 * 
 * Configuration Sections:
 * - rateLimit: Rate limiting middleware configuration
 * - cors: Cross-Origin Resource Sharing configuration
 * - helmet: Security HTTP headers configuration
 * 
 * Environment Variables:
 * - RATE_LIMIT_WINDOW_MS: Rate limiting window in milliseconds (default: 900000)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * - CORS_ORIGIN: Comma-separated allowed origins (default: disabled)
 * 
 * Security Rationale:
 * - Rate limiting defaults follow OWASP recommendations
 * - CORS is disabled by default (most restrictive)
 * - CSP directives use 'self' for restrictive defaults
 * - HSTS configured with 1-year max-age for HTTPS enforcement
 * 
 * @module src/config/security.config
 */

'use strict';

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window for rate limiting in milliseconds
 * @property {number} limit - Maximum number of requests per window
 * @property {string} standardHeaders - Rate limit headers standard to use
 * @property {boolean} legacyHeaders - Whether to use legacy X-RateLimit-* headers
 * @property {Object} message - Response message when rate limit exceeded
 */

/**
 * @typedef {Object} CorsConfig
 * @property {string[]|boolean} origin - Allowed origins or false to disable
 * @property {string[]} methods - Allowed HTTP methods
 * @property {string[]} allowedHeaders - Allowed request headers
 * @property {boolean} credentials - Whether to allow credentials
 * @property {number} optionsSuccessStatus - Status code for preflight success
 */

/**
 * @typedef {Object} HelmetConfig
 * @property {Object} contentSecurityPolicy - CSP configuration
 * @property {Object} hsts - HTTP Strict Transport Security configuration
 */

/**
 * @typedef {Object} SecurityConfig
 * @property {RateLimitConfig} rateLimit - Rate limiting configuration
 * @property {CorsConfig} cors - CORS configuration
 * @property {HelmetConfig} helmet - Helmet security headers configuration
 */

/**
 * Rate limiting middleware configuration.
 * Protects against brute-force and denial-of-service attacks.
 * 
 * @type {RateLimitConfig}
 */
const rateLimit = {
  /**
   * Time window for rate limiting in milliseconds.
   * Default: 15 minutes (900000ms) per OWASP recommendations.
   */
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum number of requests allowed per window.
   * Default: 100 requests per 15-minute window.
   */
  limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * Use the modern draft-8 standard for rate limit headers.
   * Sets RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers.
   */
  standardHeaders: 'draft-8',

  /**
   * Disable deprecated X-RateLimit-* headers.
   */
  legacyHeaders: false,

  /**
   * Response sent when rate limit is exceeded.
   */
  message: { error: 'Too many requests, please try again later.' }
};

/**
 * CORS middleware configuration.
 * Controls cross-origin resource sharing for API access.
 * 
 * @type {CorsConfig}
 */
const cors = {
  /**
   * Allowed origins for CORS requests.
   * Parses comma-separated CORS_ORIGIN environment variable.
   * Set to false (disabled) if no origins specified for security.
   */
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : false,

  /**
   * HTTP methods allowed for CORS requests.
   */
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  /**
   * Request headers allowed for CORS requests.
   */
  allowedHeaders: ['Content-Type', 'Authorization'],

  /**
   * Allow credentials (cookies, authorization headers) in CORS requests.
   */
  credentials: true,

  /**
   * Status code for successful OPTIONS preflight requests.
   * Use 200 for legacy browser compatibility.
   */
  optionsSuccessStatus: 200
};

/**
 * Helmet security headers configuration.
 * Provides secure defaults for HTTP security headers.
 * 
 * @type {HelmetConfig}
 */
const helmet = {
  /**
   * Content Security Policy configuration.
   * Restricts resources the browser can load to mitigate XSS attacks.
   */
  contentSecurityPolicy: {
    directives: {
      /**
       * Default source for all content types not explicitly defined.
       */
      defaultSrc: ["'self'"],

      /**
       * Allowed sources for JavaScript execution.
       */
      scriptSrc: ["'self'"],

      /**
       * Allowed sources for CSS.
       * Includes 'unsafe-inline' for inline styles (common requirement).
       */
      styleSrc: ["'self'", "'unsafe-inline'"],

      /**
       * Allowed sources for images.
       * Includes data: URIs for inline images.
       */
      imgSrc: ["'self'", 'data:'],

      /**
       * Allowed sources for fetch, XMLHttpRequest, WebSocket connections.
       */
      connectSrc: ["'self'"],

      /**
       * Allowed sources for fonts.
       */
      fontSrc: ["'self'"],

      /**
       * Block all plugins (Flash, Silverlight, etc.).
       */
      objectSrc: ["'none'"],

      /**
       * Upgrade insecure requests to HTTPS.
       */
      upgradeInsecureRequests: []
    }
  },

  /**
   * HTTP Strict Transport Security configuration.
   * Forces browsers to use HTTPS for future requests.
   */
  hsts: {
    /**
     * Duration in seconds to remember HTTPS-only status.
     * 31536000 = 1 year (recommended for production).
     */
    maxAge: 31536000,

    /**
     * Apply HSTS to all subdomains.
     */
    includeSubDomains: true,

    /**
     * Allow inclusion in browser preload lists.
     */
    preload: true
  }
};

/**
 * Complete security configuration object.
 * Used by src/app.js to configure security middleware stack.
 * 
 * @type {SecurityConfig}
 */
module.exports = {
  rateLimit,
  cors,
  helmet
};
