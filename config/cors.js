/**
 * CORS (Cross-Origin Resource Sharing) Configuration Module
 * 
 * This module exports CORS middleware options for the Express application.
 * It implements explicit origin whitelisting from the ALLOWED_ORIGINS environment
 * variable to control cross-origin access according to security best practices.
 * 
 * Environment Variables:
 *   - ALLOWED_ORIGINS: Comma-separated list of allowed origins
 *     Example: 'https://example.com,https://app.example.com'
 *     If not set, cross-origin requests are blocked (origin: false)
 * 
 * Security Considerations:
 *   - Uses explicit origin whitelisting rather than wildcards
 *   - Restricts methods to GET and POST only
 *   - Enables credentials support for authenticated requests
 *   - Implements preflight caching for performance
 * 
 * @module config/cors
 * @see https://github.com/expressjs/cors
 */

'use strict';

/**
 * Parse the ALLOWED_ORIGINS environment variable into an array of allowed origins.
 * Filters out empty strings and trims whitespace from each origin.
 * 
 * @returns {string[]|null} Array of allowed origin URLs, or null if not configured
 */
const parseAllowedOrigins = () => {
  const originsEnv = process.env.ALLOWED_ORIGINS;
  
  if (!originsEnv || originsEnv.trim() === '') {
    return null;
  }
  
  // Split by comma, trim whitespace, and filter out empty entries
  const origins = originsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
  
  return origins.length > 0 ? origins : null;
};

/**
 * Determines if the application is running in production mode
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Dynamic origin validation callback for the CORS middleware.
 * Validates incoming request origins against the whitelist from environment variables.
 * 
 * This callback function provides flexibility by:
 * - Allowing requests with no origin (same-origin, server-to-server)
 * - Checking origins against the configured whitelist
 * - In development mode, allowing all origins if no whitelist configured
 * - In production mode, rejecting requests from non-whitelisted origins
 * 
 * @param {string|undefined} requestOrigin - The origin of the incoming request
 * @param {Function} callback - Callback function with signature (error, allow)
 */
const originCallback = (requestOrigin, callback) => {
  const allowedOrigins = parseAllowedOrigins();
  
  // Allow requests with no origin (same-origin requests, Postman, curl, etc.)
  if (!requestOrigin) {
    return callback(null, true);
  }
  
  // If no origins configured
  if (!allowedOrigins) {
    // In development mode, allow all origins for easier testing
    if (!isProduction) {
      return callback(null, true);
    }
    // In production, block cross-origin requests when no whitelist is configured
    return callback(new Error('CORS not allowed: No origins configured'), false);
  }
  
  // Check if the request origin is in the allowed list
  if (allowedOrigins.includes(requestOrigin)) {
    return callback(null, true);
  }
  
  // In development mode, allow localhost origins even if not explicitly whitelisted
  if (!isProduction && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
    return callback(null, true);
  }
  
  // Reject requests from non-whitelisted origins
  return callback(new Error(`CORS not allowed for origin: ${requestOrigin}`), false);
};

/**
 * CORS Configuration Options
 * 
 * Comprehensive CORS middleware configuration object implementing
 * security best practices for Express.js applications.
 * 
 * @type {Object}
 * @property {Function} origin - Dynamic origin validation callback
 * @property {string[]} methods - Allowed HTTP methods (restricted to GET, POST)
 * @property {boolean} credentials - Enable credentials (cookies, authorization headers)
 * @property {string[]} allowedHeaders - Allowed request headers
 * @property {string[]} exposedHeaders - Headers exposed to the client
 * @property {number} maxAge - Preflight cache duration in seconds (24 hours)
 * @property {number} optionsSuccessStatus - Status code for preflight responses
 */
const corsOptions = {
  /**
   * Origin Configuration
   * 
   * Uses a dynamic callback function to validate request origins against
   * the ALLOWED_ORIGINS environment variable whitelist.
   * 
   * Security: Implements explicit origin whitelisting rather than wildcards
   * to prevent unauthorized cross-origin access.
   */
  origin: originCallback,

  /**
   * Allowed HTTP Methods
   * 
   * Restricts cross-origin requests to safe methods only.
   * GET: Read-only operations
   * POST: Form submissions and API calls
   * 
   * Security: Limits potential attack surface by excluding PUT, DELETE, PATCH
   */
  methods: ['GET', 'POST'],

  /**
   * Credentials Support
   * 
   * When true, allows the browser to send credentials (cookies, HTTP authentication,
   * client-side SSL certificates) with cross-origin requests.
   * 
   * Required for authenticated API endpoints accessed from different origins.
   * Note: When credentials is true, origin cannot be '*'
   */
  credentials: true,

  /**
   * Allowed Request Headers
   * 
   * Specifies which headers can be used in the actual cross-origin request.
   * These headers are safe and commonly needed for API interactions.
   * 
   * - Content-Type: Required for JSON/form submissions
   * - Authorization: Required for authenticated requests
   * - X-Requested-With: Identifies AJAX requests
   * - Accept: Content negotiation
   * - Origin: Origin header (automatically included by browsers)
   * - Cache-Control: Caching directives
   */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control'
  ],

  /**
   * Exposed Response Headers
   * 
   * Specifies which response headers should be exposed to the client-side
   * JavaScript code. By default, only CORS-safelisted headers are accessible.
   * 
   * - Content-Length: Allows client to know response size
   * - X-Request-Id: Enables request tracking/correlation
   * - RateLimit-Limit: Rate limit information
   * - RateLimit-Remaining: Remaining requests in current window
   * - RateLimit-Reset: When the rate limit window resets
   */
  exposedHeaders: [
    'Content-Length',
    'X-Request-Id',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset'
  ],

  /**
   * Preflight Cache Duration (in seconds)
   * 
   * Specifies how long the results of a preflight request can be cached.
   * 86400 seconds = 24 hours
   * 
   * Performance: Reduces the number of preflight OPTIONS requests by allowing
   * browsers to cache the CORS approval for subsequent requests.
   */
  maxAge: 86400,

  /**
   * Preflight Success Status Code
   * 
   * Some legacy browsers (IE11, various SmartTVs) choke on status 204.
   * Setting this to 200 ensures broader compatibility while still
   * indicating success for OPTIONS preflight requests.
   */
  optionsSuccessStatus: 200
};

/**
 * Export the CORS options configuration object.
 * This is imported by server.js to configure the cors middleware.
 * 
 * Usage:
 *   const cors = require('cors');
 *   const corsOptions = require('./config/cors');
 *   app.use(cors(corsOptions));
 */
module.exports = corsOptions;
