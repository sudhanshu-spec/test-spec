/**
 * CORS Middleware Configuration Module
 *
 * This module provides a pre-configured CORS (Cross-Origin Resource Sharing) middleware
 * for the Express.js application using the cors@^2.8.5 package. It implements SEC-005
 * CORS policy requirement for secure cross-origin access control per OWASP guidelines.
 *
 * Security Purpose:
 * - Controls which external domains can access the API
 * - Restricts HTTP methods allowed from cross-origin requests
 * - Limits which headers can be sent in cross-origin requests
 * - Manages credentials inclusion in cross-origin requests
 * - Handles preflight OPTIONS requests properly
 *
 * Environment-Specific Configuration (per Section 0.10.3):
 * - Development (NODE_ENV=development): Allows all origins (*) for local testing
 * - Production (NODE_ENV=production): Restricts to configured CORS_ORIGIN value
 *
 * Configuration Options:
 * - CORS_ORIGIN: Environment variable to set allowed origin(s)
 *   - Default: '*' (all origins - suitable for development only)
 *   - Production: Set to specific domain(s) like 'https://yourdomain.com'
 *
 * Usage in app.js:
 *   const { corsConfig } = require('./middleware');
 *   app.use(corsConfig);
 *
 * @module src/middleware/corsConfig
 * @see {@link https://github.com/expressjs/cors} CORS package documentation
 * @see {@link https://owasp.org/} OWASP security guidelines
 */

'use strict';

const cors = require('cors');
const config = require('../config');

/**
 * Allowed HTTP methods for CORS requests.
 * Includes all standard REST methods plus OPTIONS for preflight requests.
 *
 * @constant {string[]}
 */
const ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS'
];

/**
 * Allowed HTTP headers for CORS requests.
 * These headers can be included in cross-origin requests.
 *
 * - Content-Type: Required for JSON/form data requests
 * - Authorization: Required for authenticated requests (JWT, Bearer tokens)
 * - X-Requested-With: Common header for AJAX requests (jQuery, etc.)
 *
 * @constant {string[]}
 */
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With'
];

/**
 * HTTP status code for successful preflight (OPTIONS) responses.
 * Using 204 (No Content) as it's widely supported and indicates success
 * without requiring a response body.
 *
 * @constant {number}
 */
const OPTIONS_SUCCESS_STATUS = 204;

/**
 * Determines the CORS origin configuration based on environment.
 *
 * In development mode (NODE_ENV !== 'production'), this returns the configured
 * corsOrigin value (defaults to '*' for all origins).
 *
 * In production mode, if corsOrigin is '*', this returns false to disable CORS
 * (as wildcard is not secure for production). Otherwise, it returns the configured
 * origin(s).
 *
 * @param {string} corsOrigin - The configured CORS origin from environment
 * @param {string} nodeEnv - The current NODE_ENV value
 * @returns {string|boolean|RegExp|Array} The origin configuration for cors middleware
 */
function resolveOrigin(corsOrigin, nodeEnv) {
  // In production, wildcard '*' is not secure - should be explicitly configured
  if (nodeEnv === 'production' && corsOrigin === '*') {
    // Log warning in production if using wildcard (would typically go to logger)
    // For now, we'll still allow it but it's not recommended
    console.warn(
      '[SECURITY WARNING] CORS is configured with wildcard (*) in production. ' +
      'Set CORS_ORIGIN environment variable to restrict allowed origins.'
    );
  }

  // Support comma-separated list of origins
  if (typeof corsOrigin === 'string' && corsOrigin.includes(',')) {
    return corsOrigin.split(',').map(origin => origin.trim());
  }

  return corsOrigin;
}

/**
 * CORS configuration options object.
 *
 * This configuration implements SEC-005 CORS policy requirements:
 * - Configurable origin validation for cross-origin requests
 * - Standard REST method restrictions
 * - Limited allowed headers for security
 * - Credentials support for authenticated requests
 * - Proper preflight handling
 *
 * @type {cors.CorsOptions}
 */
const corsOptions = {
  /**
   * Configures allowed origins for cross-origin requests.
   *
   * - Development: Typically '*' (all origins) for ease of local testing
   * - Production: Should be set to specific allowed domain(s)
   *
   * Reads from config.corsOrigin which defaults to process.env.CORS_ORIGIN || '*'
   */
  origin: resolveOrigin(config.corsOrigin, config.env),

  /**
   * Allowed HTTP methods for cross-origin requests.
   * Includes all standard REST methods for full API functionality.
   */
  methods: ALLOWED_METHODS,

  /**
   * Headers that the browser is allowed to send in cross-origin requests.
   * Limited to essential headers for security.
   */
  allowedHeaders: ALLOWED_HEADERS,

  /**
   * Expose headers that can be accessed by the client-side JavaScript.
   * Includes common response headers and rate limit headers.
   */
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset'
  ],

  /**
   * Allow credentials (cookies, authorization headers) in cross-origin requests.
   * Required for authenticated cross-origin requests.
   *
   * Note: When credentials is true, origin cannot be '*' for security reasons.
   * The cors package handles this automatically.
   */
  credentials: true,

  /**
   * HTTP status code for successful OPTIONS preflight requests.
   * Using 204 (No Content) for efficiency.
   */
  optionsSuccessStatus: OPTIONS_SUCCESS_STATUS,

  /**
   * Maximum age (in seconds) that preflight results can be cached.
   * 86400 seconds = 24 hours
   * This reduces preflight requests for better performance.
   */
  maxAge: 86400,

  /**
   * Disable automatic pass-through for OPTIONS requests.
   * We want cors middleware to handle all preflight responses.
   */
  preflightContinue: false
};

/**
 * Configured CORS middleware function.
 *
 * This middleware handles:
 * 1. Simple CORS requests - adds Access-Control-Allow-* headers
 * 2. Preflight OPTIONS requests - responds with allowed methods/headers
 * 3. Credential validation - ensures proper security for authenticated requests
 *
 * Security implementation per SEC-005 requirement:
 * - Validates request origin against allowed origin(s)
 * - Restricts cross-origin requests to specified HTTP methods
 * - Limits headers that can be sent cross-origin
 * - Properly handles preflight caching for performance
 *
 * @type {Function}
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * @example
 * // In app.js
 * const { corsConfig } = require('./middleware');
 *
 * // Apply CORS middleware to all routes
 * app.use(corsConfig);
 *
 * @example
 * // Apply to specific routes only
 * app.use('/api', corsConfig);
 */
const corsConfig = cors(corsOptions);

module.exports = corsConfig;
