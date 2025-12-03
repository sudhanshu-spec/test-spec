/**
 * @fileoverview Centralized security middleware configuration module for Express.js application.
 * Provides pre-configured security middleware including helmet.js for HTTP security headers,
 * CORS for cross-origin resource sharing control, and express-rate-limit for DoS protection.
 * 
 * This module exports individual configuration objects and a factory function that returns
 * an array of configured middleware in the correct execution order per OWASP best practices:
 * 1. Rate limiting (first - blocks abusive IPs before processing)
 * 2. Helmet (second - adds security headers to all responses)
 * 3. CORS (third - controls cross-origin access)
 * 
 * @module middleware/security
 * @requires helmet - HTTP security headers middleware (^8.1.0)
 * @requires cors - CORS middleware (^2.8.5)
 * @requires express-rate-limit - Rate limiting middleware (^8.2.1)
 * @requires ../config/security - Security configuration loader
 * 
 * @exports helmetConfig - Helmet.js configuration object with CSP and HSTS settings
 * @exports corsConfig - CORS configuration object with origin and credentials settings
 * @exports rateLimitConfig - Rate limiting configuration object with window and limit settings
 * @exports createSecurityMiddleware - Factory function returning configured middleware array
 * @exports securityMiddleware - Pre-configured array of security middleware
 * 
 * @description Security middleware chain implementing defense-in-depth strategy:
 * - Rate limiting prevents DoS attacks and brute force attempts
 * - Helmet adds security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
 * - CORS enforces cross-origin access policies
 * 
 * @author hxu
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Import and use pre-configured middleware array
 * const { securityMiddleware } = require('./middleware/security');
 * app.use(securityMiddleware);
 * 
 * @example
 * // Use factory function for custom configuration
 * const { createSecurityMiddleware } = require('./middleware/security');
 * const customMiddleware = createSecurityMiddleware();
 * app.use(customMiddleware);
 * 
 * @example
 * // Access individual configurations for customization
 * const { helmetConfig, corsConfig, rateLimitConfig } = require('./middleware/security');
 * console.log(helmetConfig.contentSecurityPolicy.directives.defaultSrc);
 */

'use strict';

// External security middleware packages
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

// Internal configuration loader
const { loadSecurityConfig } = require('../config/security');

/**
 * Helmet.js configuration object for HTTP security headers.
 * Implements OWASP recommended headers to mitigate XSS, clickjacking,
 * MIME sniffing, and other common web vulnerabilities.
 * 
 * @constant {Object} helmetConfig
 * @property {Object} contentSecurityPolicy - Content Security Policy configuration
 * @property {Object} contentSecurityPolicy.directives - CSP directive definitions
 * @property {Array<string>} contentSecurityPolicy.directives.defaultSrc - Default source directive ["'self'"]
 * @property {Array<string>} contentSecurityPolicy.directives.scriptSrc - Script source directive ["'self'"]
 * @property {Object} hsts - HTTP Strict Transport Security settings
 * @property {number} hsts.maxAge - HSTS max-age in seconds (31536000 = 1 year)
 * 
 * @description Security headers provided by helmet with this configuration:
 * - Content-Security-Policy: Restricts resource loading to same origin
 * - Strict-Transport-Security: Forces HTTPS for 1 year
 * - X-Content-Type-Options: nosniff - prevents MIME sniffing attacks
 * - X-Frame-Options: DENY - prevents clickjacking via iframe embedding
 * - X-XSS-Protection: 0 - disabled in favor of CSP (modern approach)
 * - X-DNS-Prefetch-Control: off - prevents DNS prefetching
 * - X-Download-Options: noopen - prevents IE from executing downloads
 * - X-Permitted-Cross-Domain-Policies: none - prevents Adobe cross-domain policy
 * 
 * @see https://helmetjs.github.io/
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 * 
 * @example
 * // Use with helmet middleware
 * const helmet = require('helmet');
 * app.use(helmet(helmetConfig));
 */
const helmetConfig = {
  /**
   * Content Security Policy (CSP) configuration.
   * Restricts resource loading to prevent XSS and data injection attacks.
   * Using "'self'" restricts loading to same origin only for maximum security.
   */
  contentSecurityPolicy: {
    /**
     * CSP directives defining allowed sources for various resource types.
     * These restrictive defaults are appropriate for API-only applications.
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
   * Max-age set to 1 year (31536000 seconds) per security best practices.
   */
  hsts: {
    /**
     * Maximum age for HSTS policy in seconds.
     * Browsers will remember to only use HTTPS for this duration.
     */
    maxAge: 31536000
  }
};

/**
 * CORS (Cross-Origin Resource Sharing) configuration object.
 * Controls which origins can access API resources and how.
 * Prevents unauthorized cross-origin requests while allowing legitimate access.
 * 
 * @constant {Object} corsConfig
 * @property {string} origin - Allowed origin for CORS requests (default: 'http://localhost:3000')
 * @property {boolean} credentials - Whether to allow credentials in CORS requests (true)
 * @property {number} optionsSuccessStatus - HTTP status for successful OPTIONS requests (200)
 * 
 * @description CORS headers added to responses:
 * - Access-Control-Allow-Origin: Specifies allowed origin(s)
 * - Access-Control-Allow-Credentials: Indicates credentials are allowed
 * - Access-Control-Allow-Methods: Allowed HTTP methods (preflight response)
 * - Access-Control-Allow-Headers: Allowed request headers (preflight response)
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * @see https://www.npmjs.com/package/cors
 * 
 * @example
 * // Use with cors middleware
 * const cors = require('cors');
 * app.use(cors(corsConfig));
 */
const corsConfig = {
  /**
   * Allowed origin for CORS requests.
   * Default restricts to localhost for development security.
   * Configure via CORS_ORIGIN environment variable in production.
   */
  origin: 'http://localhost:3000',
  /**
   * Whether to include credentials (cookies, authorization headers) in CORS requests.
   * Set to true to allow authenticated cross-origin requests.
   * Requires specific origin (not '*') when enabled.
   */
  credentials: true,
  /**
   * HTTP status code for successful OPTIONS preflight requests.
   * Using 200 instead of 204 for legacy browser compatibility.
   * Some older browsers (IE11, some SmartTVs) choke on 204.
   */
  optionsSuccessStatus: 200
};

/**
 * Rate limiting configuration object for DoS and brute force protection.
 * Limits the number of requests per IP address within a time window.
 * Uses express-rate-limit middleware with standardized headers.
 * 
 * @constant {Object} rateLimitConfig
 * @property {number} windowMs - Time window in milliseconds (default: 900000 = 15 minutes)
 * @property {number} limit - Maximum requests per IP per window (default: 100)
 * @property {string} standardHeaders - Rate limit header standard ('draft-8')
 * @property {boolean} legacyHeaders - Whether to include legacy X-RateLimit headers (false)
 * @property {string} message - Error message returned when rate limit exceeded
 * 
 * @description Rate limit response headers (using draft-8 standard):
 * - RateLimit-Limit: Maximum number of requests allowed
 * - RateLimit-Remaining: Number of requests remaining in current window
 * - RateLimit-Reset: Unix timestamp when the rate limit resets
 * 
 * @see https://www.npmjs.com/package/express-rate-limit
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 * 
 * @example
 * // Use with express-rate-limit middleware
 * const { rateLimit } = require('express-rate-limit');
 * app.use(rateLimit(rateLimitConfig));
 */
const rateLimitConfig = {
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
   * Enable for backward compatibility with older clients if needed.
   */
  legacyHeaders: false,
  /**
   * Error message returned when rate limit is exceeded.
   * Provides clear feedback to clients about the rate limit policy.
   * Returned with 429 Too Many Requests status code.
   */
  message: 'Too many requests from this IP, please try again after 15 minutes.'
};

/**
 * Factory function that creates and returns an array of configured security middleware.
 * Loads configuration from environment variables via loadSecurityConfig() and applies
 * environment-specific settings to each middleware.
 * 
 * Middleware execution order follows OWASP best practices for defense-in-depth:
 * 1. Rate limiting - First to block abusive IPs before any processing
 * 2. Helmet - Second to add security headers to all responses
 * 3. CORS - Third to control cross-origin access after rate limiting
 * 
 * @function createSecurityMiddleware
 * @returns {Array<Function>} Array of Express middleware functions in correct execution order
 * 
 * @description The returned middleware array should be used with app.use():
 * ```javascript
 * const middleware = createSecurityMiddleware();
 * middleware.forEach(mw => app.use(mw));
 * // Or use spread operator:
 * app.use(...middleware);
 * ```
 * 
 * @example
 * // Basic usage
 * const express = require('express');
 * const { createSecurityMiddleware } = require('./middleware/security');
 * 
 * const app = express();
 * const securityMiddleware = createSecurityMiddleware();
 * securityMiddleware.forEach(middleware => app.use(middleware));
 * 
 * @example
 * // With environment variables
 * // Set CORS_ORIGIN=https://example.com in .env
 * // Set RATE_LIMIT_MAX=50 in .env
 * const middleware = createSecurityMiddleware();
 * // Now cors will allow https://example.com
 * // Now rate limit is 50 requests per window
 */
function createSecurityMiddleware() {
  // Load environment-based security configuration
  const config = loadSecurityConfig();

  // Build helmet configuration with loaded settings
  const helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: config.helmet.contentSecurityPolicy.directives.defaultSrc,
        scriptSrc: config.helmet.contentSecurityPolicy.directives.scriptSrc
      }
    },
    hsts: {
      maxAge: config.helmet.hsts.maxAge
    }
  };

  // Build CORS configuration with loaded settings
  const corsOptions = {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    optionsSuccessStatus: config.cors.optionsSuccessStatus
  };

  // Build rate limit configuration with loaded settings
  const rateLimitOptions = {
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.limit,
    standardHeaders: config.rateLimit.standardHeaders,
    legacyHeaders: config.rateLimit.legacyHeaders,
    message: `Too many requests from this IP, please try again after ${Math.floor(config.rateLimit.windowMs / 60000)} minutes.`
  };

  /**
   * Return middleware array in correct execution order:
   * 1. rateLimit - Block abusive IPs before processing
   * 2. helmet - Add security headers to responses
   * 3. cors - Control cross-origin access
   * 
   * This order ensures:
   * - Abusive requests are rejected immediately (rate limit first)
   * - All responses include security headers (helmet before route handlers)
   * - CORS is evaluated after rate limiting (prevents CORS header on blocked requests)
   */
  return [
    rateLimit(rateLimitOptions),
    helmet(helmetOptions),
    cors(corsOptions)
  ];
}

/**
 * Returns the current security configuration object.
 * Useful for logging, debugging, or exposing configuration to health endpoints.
 * 
 * @function getSecurityConfig
 * @returns {Object} Current security configuration object
 * @returns {Object} return.helmet - Helmet configuration
 * @returns {Object} return.cors - CORS configuration
 * @returns {Object} return.rateLimit - Rate limit configuration
 * 
 * @description Configuration values reflect:
 * - Default values from helmetConfig, corsConfig, rateLimitConfig
 * - Environment overrides loaded via loadSecurityConfig()
 * 
 * @example
 * // Log current security settings
 * const { getSecurityConfig } = require('./middleware/security');
 * const config = getSecurityConfig();
 * console.log('CORS Origin:', config.cors.origin);
 * console.log('Rate Limit:', config.rateLimit.limit, 'requests per', config.rateLimit.windowMs, 'ms');
 */
function getSecurityConfig() {
  const config = loadSecurityConfig();
  return {
    helmet: {
      contentSecurityPolicy: helmetConfig.contentSecurityPolicy,
      hsts: helmetConfig.hsts
    },
    cors: {
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      optionsSuccessStatus: config.cors.optionsSuccessStatus
    },
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      limit: config.rateLimit.limit,
      standardHeaders: config.rateLimit.standardHeaders,
      legacyHeaders: config.rateLimit.legacyHeaders,
      message: rateLimitConfig.message
    }
  };
}

/**
 * Pre-configured security middleware array ready for immediate use.
 * Created using createSecurityMiddleware() with default/environment configuration.
 * 
 * @constant {Array<Function>} securityMiddleware
 * 
 * @description Provides convenience access to configured middleware without
 * calling the factory function. Middleware order:
 * 1. Rate limiting middleware
 * 2. Helmet middleware  
 * 3. CORS middleware
 * 
 * @example
 * // Simple usage - apply all security middleware
 * const { securityMiddleware } = require('./middleware/security');
 * securityMiddleware.forEach(mw => app.use(mw));
 * 
 * @example
 * // Apply with spread operator
 * const { securityMiddleware } = require('./middleware/security');
 * app.use(...securityMiddleware);
 */
const securityMiddleware = createSecurityMiddleware();

// Export security middleware configuration using CommonJS module.exports
module.exports = {
  /**
   * Helmet.js configuration object with CSP directives and HSTS settings.
   * Use with helmet() middleware for HTTP security headers.
   */
  helmetConfig,

  /**
   * CORS configuration object with origin whitelist and credentials handling.
   * Use with cors() middleware for cross-origin access control.
   */
  corsConfig,

  /**
   * Rate limiting configuration object with window, limit, and header settings.
   * Use with rateLimit() middleware for DoS protection.
   */
  rateLimitConfig,

  /**
   * Factory function that creates configured security middleware array.
   * Loads environment configuration and returns middleware in correct order.
   */
  createSecurityMiddleware,

  /**
   * Pre-configured security middleware array ready for immediate use.
   * Contains [rateLimit, helmet, cors] middleware in correct execution order.
   */
  securityMiddleware,

  /**
   * Helper function to retrieve current security configuration.
   * Useful for logging, debugging, or health check endpoints.
   */
  getSecurityConfig
};
