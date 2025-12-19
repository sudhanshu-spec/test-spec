/**
 * Centralized Security Middleware Module
 * 
 * This module consolidates and exports all security middleware components for the
 * Express.js application. It provides a unified interface for security middleware
 * including HTTP security headers (helmet), CORS policy enforcement, and rate limiting.
 * 
 * Security Features Provided:
 * - HTTP Security Headers: Via helmet middleware (Content-Security-Policy, HSTS, X-Frame-Options, etc.)
 * - CORS Policy Enforcement: Via cors middleware with environment-based origin whitelisting
 * - Rate Limiting: Via express-rate-limit to protect against DoS and brute-force attacks
 * 
 * Defense-in-Depth Strategy:
 * This module implements defense-in-depth by layering multiple security controls:
 * 1. Helmet FIRST - Security headers on ALL responses before any processing
 * 2. CORS SECOND - Cross-origin policy enforcement before request handling
 * 3. Rate Limiting THIRD - Request throttling before expensive operations
 * 
 * Usage Options:
 * 
 * Option 1: Individual middleware imports
 * ```javascript
 * const { helmetMiddleware, corsMiddleware, rateLimiter } = require('./middleware/security');
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimiter);
 * ```
 * 
 * Option 2: One-liner security setup
 * ```javascript
 * const { applySecurityMiddleware } = require('./middleware/security');
 * applySecurityMiddleware(app);
 * ```
 * 
 * Option 3: Access configurations for customization
 * ```javascript
 * const { helmetConfig, corsOptions } = require('./middleware/security');
 * // Customize as needed...
 * ```
 * 
 * @module middleware/security
 * @see https://helmetjs.github.io/
 * @see https://github.com/expressjs/cors
 * @see https://www.npmjs.com/package/express-rate-limit
 */

'use strict';

// ============================================================================
// External Dependencies
// ============================================================================

/**
 * Helmet middleware for HTTP security headers.
 * Sets 15+ security headers including Content-Security-Policy, HSTS,
 * X-Frame-Options, X-Content-Type-Options, and removes X-Powered-By.
 * 
 * @see https://helmetjs.github.io/
 */
const helmet = require('helmet');

/**
 * CORS middleware for Cross-Origin Resource Sharing policy enforcement.
 * Enables origin whitelisting, allowed methods configuration, and credential handling.
 * 
 * @see https://github.com/expressjs/cors
 */
const cors = require('cors');

// ============================================================================
// Internal Dependencies
// ============================================================================

/**
 * Pre-configured rate limiter middleware.
 * Protects against brute-force attacks and DoS attempts by throttling
 * requests per IP address within configurable time windows.
 * 
 * @see middleware/rateLimiter.js
 */
const rateLimiter = require('./rateLimiter');

/**
 * Helmet security headers configuration object.
 * Contains Content-Security-Policy directives, HSTS settings, X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, and other security header configurations
 * following OWASP Secure Headers Project guidelines.
 * 
 * Members exposed:
 * - contentSecurityPolicy: CSP directives for XSS/injection prevention
 * - hsts: HTTP Strict Transport Security configuration
 * - xFrameOptions: Clickjacking protection configuration
 * - xContentTypeOptions: MIME sniffing prevention (boolean)
 * - referrerPolicy: Referrer information control
 * - crossOriginEmbedderPolicy: Cross-origin resource loading control
 * 
 * @see config/helmet.js
 */
const helmetConfig = require('../config/helmet');

/**
 * CORS policy configuration object.
 * Contains origin whitelist, allowed HTTP methods, permitted headers,
 * and credentials handling settings for cross-origin request control.
 * 
 * Members exposed:
 * - origin: Allowed origin(s) parsed from ALLOWED_ORIGINS env var
 * - methods: Allowed HTTP methods array (GET, POST, PUT, DELETE)
 * - allowedHeaders: Permitted request headers (Content-Type, Authorization)
 * - credentials: Whether to include credentials (cookies, auth headers)
 * - optionsSuccessStatus: Status code for successful OPTIONS preflight
 * 
 * @see config/cors.js
 */
const corsOptions = require('../config/cors');

// ============================================================================
// Configured Middleware Instances
// ============================================================================

/**
 * Pre-configured helmet middleware instance.
 * 
 * This middleware sets the following security headers on all responses:
 * - Content-Security-Policy: Prevents XSS and code injection attacks
 * - Strict-Transport-Security: Enforces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - Referrer-Policy: Controls referrer information leakage
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Controls resource access from other origins
 * - X-DNS-Prefetch-Control: Disables DNS prefetching for privacy
 * - X-Download-Options: Prevents IE from executing downloads in site context
 * - X-Permitted-Cross-Domain-Policies: Controls Adobe plugin access
 * 
 * Additionally, helmet automatically removes the X-Powered-By header
 * to prevent information disclosure about the technology stack.
 * 
 * MIDDLEWARE CHAIN ORDER: helmet should be FIRST in the middleware chain
 * to ensure security headers are present on ALL responses, including error responses.
 * 
 * @type {Function} Express middleware function
 */
const helmetMiddleware = helmet(helmetConfig);

/**
 * Pre-configured CORS middleware instance.
 * 
 * This middleware enforces Cross-Origin Resource Sharing policies:
 * - Origin validation against environment-configured whitelist
 * - HTTP method restrictions (GET, POST, PUT, DELETE)
 * - Allowed headers validation (Content-Type, Authorization)
 * - Credentials support for authenticated cross-origin requests
 * 
 * MIDDLEWARE CHAIN ORDER: CORS should be SECOND, after helmet,
 * to ensure CORS headers are set before request processing begins.
 * 
 * @type {Function} Express middleware function
 */
const corsMiddleware = cors(corsOptions);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Apply all security middleware to an Express application instance.
 * 
 * This helper function provides a convenient one-liner to apply the complete
 * security middleware chain in the correct order:
 * 
 * 1. Helmet (HTTP security headers) - FIRST
 * 2. CORS (Cross-origin resource sharing) - SECOND
 * 3. Rate Limiter (Request throttling) - THIRD
 * 
 * The order is critical for defense-in-depth:
 * - Helmet first ensures security headers on ALL responses (including errors)
 * - CORS second validates cross-origin requests before processing
 * - Rate limiting third protects against abuse before expensive operations
 * 
 * Usage:
 * ```javascript
 * const express = require('express');
 * const { applySecurityMiddleware } = require('./middleware/security');
 * 
 * const app = express();
 * applySecurityMiddleware(app);
 * 
 * // Continue with route definitions...
 * app.get('/', (req, res) => res.send('Hello'));
 * ```
 * 
 * @param {Object} app - Express application instance
 * @throws {TypeError} If app is not provided or is not a valid Express app
 * @returns {Object} The Express app instance for method chaining
 */
function applySecurityMiddleware(app) {
  // Validate that app is provided and has the use method (Express app interface)
  if (!app) {
    throw new TypeError(
      'applySecurityMiddleware requires an Express application instance. ' +
      'Usage: applySecurityMiddleware(app)'
    );
  }
  
  if (typeof app.use !== 'function') {
    throw new TypeError(
      'Invalid Express application instance provided. ' +
      'The object must have a "use" method for middleware registration.'
    );
  }
  
  // Apply middleware in the correct security order
  // CRITICAL ORDER: helmet -> cors -> rateLimiter
  
  // 1. Helmet FIRST - Security headers must be on ALL responses
  // This ensures even error responses include security headers
  app.use(helmetMiddleware);
  
  // 2. CORS SECOND - Validate cross-origin requests early
  // This prevents unauthorized cross-origin access before request processing
  app.use(corsMiddleware);
  
  // 3. Rate Limiter THIRD - Throttle requests before expensive operations
  // This protects against DoS and brute-force attacks
  app.use(rateLimiter);
  
  // Log security middleware application for debugging/audit purposes
  if (process.env.NODE_ENV === 'development') {
    console.log('[SECURITY] Security middleware chain applied:');
    console.log('  1. helmet (HTTP security headers)');
    console.log('  2. cors (Cross-Origin Resource Sharing)');
    console.log('  3. rateLimiter (Request throttling)');
  }
  
  // Return app for method chaining
  return app;
}

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export configured security middleware and configurations.
 * 
 * Middleware Exports (pre-configured, ready to use):
 * - helmetMiddleware: Configured helmet middleware function
 * - corsMiddleware: Configured CORS middleware function
 * - rateLimiter: Configured rate limiter middleware function
 * 
 * Configuration Exports (for inspection or customization):
 * - helmetConfig: Helmet configuration object
 * - corsOptions: CORS configuration object
 * 
 * Helper Functions:
 * - applySecurityMiddleware: One-liner to apply all security middleware
 * 
 * @example
 * // Individual middleware usage
 * const { helmetMiddleware, corsMiddleware, rateLimiter } = require('./middleware/security');
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimiter);
 * 
 * @example
 * // One-liner usage
 * const { applySecurityMiddleware } = require('./middleware/security');
 * applySecurityMiddleware(app);
 * 
 * @example
 * // Accessing configuration
 * const { helmetConfig, corsOptions } = require('./middleware/security');
 * console.log('CSP:', helmetConfig.contentSecurityPolicy);
 * console.log('Allowed origins:', corsOptions.origin);
 */
module.exports = {
  // Pre-configured middleware instances (recommended for most use cases)
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
  
  // Configuration objects (for inspection or custom middleware creation)
  helmetConfig,
  corsOptions,
  
  // Helper function for convenient one-liner security setup
  applySecurityMiddleware
};
