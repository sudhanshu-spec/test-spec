/**
 * CORS (Cross-Origin Resource Sharing) Configuration Module
 * 
 * This module provides centralized CORS policy configuration for the Express application.
 * It implements environment-based origin whitelisting, configures allowed HTTP methods,
 * permitted headers, and credential handling to control cross-origin resource access.
 * 
 * Security Considerations:
 * - Never use wildcard '*' for origin in production environments
 * - Credentials mode requires explicit origin list (not wildcard)
 * - Methods are restricted to necessary HTTP verbs only
 * - Default to blocking cross-origin requests when ALLOWED_ORIGINS is not configured
 * 
 * Environment Variables:
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins
 *   Example: 'http://localhost:3000,https://myapp.com,https://api.myapp.com'
 * - NODE_ENV: Environment mode ('development' or 'production')
 * 
 * Usage in server.js:
 *   const corsOptions = require('./config/cors');
 *   const cors = require('cors');
 *   app.use(cors(corsOptions));
 * 
 * @module config/cors
 * @see https://github.com/expressjs/cors
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */

'use strict';

/**
 * Parse and validate the ALLOWED_ORIGINS environment variable.
 * 
 * This function handles the parsing of comma-separated origin strings
 * from the environment variable and returns an appropriate origin configuration.
 * 
 * @returns {boolean|string|string[]|Function} Origin configuration for CORS
 *   - false: Block all cross-origin requests (secure default)
 *   - string: Single allowed origin
 *   - string[]: Multiple allowed origins
 *   - Function: Dynamic origin validation (for advanced use cases)
 */
const parseAllowedOrigins = () => {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  
  // Security: Default to blocking all cross-origin requests if not configured
  // This follows the principle of "secure by default"
  if (!allowedOriginsEnv || allowedOriginsEnv.trim() === '') {
    return false;
  }
  
  // Parse comma-separated origins, trim whitespace, and filter empty strings
  const origins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
  
  // Return false if no valid origins remain after parsing
  if (origins.length === 0) {
    return false;
  }
  
  // Return single origin as string, multiple origins as array
  // This optimization allows for simpler origin checking when there's only one allowed origin
  return origins.length === 1 ? origins[0] : origins;
};

/**
 * CORS configuration options object.
 * 
 * This configuration implements secure defaults while allowing environment-based
 * customization for different deployment scenarios.
 * 
 * @type {Object}
 * @property {boolean|string|string[]} origin - Allowed origin(s) for cross-origin requests
 * @property {string[]} methods - Allowed HTTP methods for cross-origin requests
 * @property {string[]} allowedHeaders - Headers that can be used in the actual request
 * @property {boolean} credentials - Whether to include credentials (cookies, auth headers)
 * @property {number} optionsSuccessStatus - Status code for successful OPTIONS preflight
 */
const corsOptions = {
  /**
   * Origin Configuration
   * 
   * Controls which origins are allowed to make cross-origin requests.
   * 
   * Security Notes:
   * - Uses environment-based whitelist via ALLOWED_ORIGINS variable
   * - Defaults to false (block all cross-origin) when not configured
   * - Never uses wildcard '*' when credentials are enabled (browser security requirement)
   * - Supports single origin (string), multiple origins (array), or dynamic validation (function)
   * 
   * Examples of ALLOWED_ORIGINS values:
   * - Single origin: 'https://myapp.com'
   * - Multiple origins: 'http://localhost:3000,https://myapp.com,https://staging.myapp.com'
   * 
   * @type {boolean|string|string[]}
   */
  origin: parseAllowedOrigins(),
  
  /**
   * Allowed HTTP Methods
   * 
   * Specifies which HTTP methods are permitted for cross-origin requests.
   * Following the principle of least privilege, only essential methods are enabled.
   * 
   * Included Methods:
   * - GET: Read resources (safe, idempotent)
   * - POST: Create resources
   * - PUT: Update/replace resources (idempotent)
   * - DELETE: Remove resources (idempotent)
   * 
   * Excluded Methods (can be added if needed):
   * - OPTIONS: Handled automatically by preflight
   * - HEAD: Can be enabled if needed for resource metadata checks
   * - PATCH: Can be enabled if partial updates are needed
   * 
   * @type {string[]}
   */
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  
  /**
   * Allowed Request Headers
   * 
   * Specifies which headers can be included in cross-origin requests.
   * Following security best practices, only necessary headers are permitted.
   * 
   * Included Headers:
   * - Content-Type: Required for JSON/form data submission
   * - Authorization: Required for Bearer token authentication (JWT, etc.)
   * 
   * Simple Headers (always allowed, not listed):
   * - Accept
   * - Accept-Language
   * - Content-Language
   * 
   * Additional headers can be added based on application requirements:
   * - X-Requested-With: For AJAX detection
   * - X-Custom-Header: For application-specific needs
   * 
   * @type {string[]}
   */
  allowedHeaders: ['Content-Type', 'Authorization'],
  
  /**
   * Credentials Support
   * 
   * When set to true, allows cross-origin requests to include credentials:
   * - Cookies
   * - Authorization headers
   * - TLS client certificates
   * 
   * Important Security Notes:
   * - When credentials is true, origin CANNOT be set to '*' (wildcard)
   * - The browser enforces this restriction for security
   * - Explicit origin whitelisting is required with credentials enabled
   * 
   * Use Cases:
   * - Session-based authentication
   * - Cookie-based CSRF tokens
   * - JWT in Authorization header
   * 
   * @type {boolean}
   */
  credentials: true,
  
  /**
   * Preflight Options Success Status
   * 
   * The HTTP status code to send for successful OPTIONS preflight requests.
   * 
   * Value Explanation:
   * - 200: Used for legacy browser compatibility (IE11, some Smart TVs)
   * - 204: Standard "No Content" status (modern browsers prefer this)
   * 
   * We use 200 for maximum compatibility while not affecting functionality.
   * Modern browsers handle both status codes correctly.
   * 
   * @type {number}
   */
  optionsSuccessStatus: 200
};

/**
 * Freeze the configuration object to prevent runtime modifications.
 * This ensures the CORS policy cannot be accidentally or maliciously altered
 * after the application starts.
 */
Object.freeze(corsOptions);

/**
 * Export the CORS configuration as the default module export.
 * 
 * Usage:
 *   const corsOptions = require('./config/cors');
 *   // or with ES6 imports:
 *   // import corsOptions from './config/cors';
 */
module.exports = corsOptions;
