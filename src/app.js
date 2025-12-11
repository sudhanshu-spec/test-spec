/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance
 * with comprehensive security middleware integration. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 * 
 * Security Middleware Integration:
 * --------------------------------
 * The application integrates three security middleware components in the
 * following order (per Agent Action Plan Section 0.5.7):
 * 
 * 1. Helmet (Security Headers):
 *    - Sets 11+ HTTP security headers including Content-Security-Policy,
 *      X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
 *    - Removes X-Powered-By header to prevent framework fingerprinting
 * 
 * 2. CORS (Cross-Origin Resource Sharing):
 *    - Handles preflight OPTIONS requests
 *    - Sets Access-Control-Allow-* headers with configurable origin whitelist
 *    - Restricts cross-origin requests in production environments
 * 
 * 3. Rate Limiting (DDoS/Brute-force Protection):
 *    - Limits requests per IP address within configurable time windows
 *    - Returns HTTP 429 Too Many Requests when limit exceeded
 *    - Uses draft-8 compliant RateLimit headers
 * 
 * Middleware Order Rationale:
 * ---------------------------
 * The middleware registration order is critical for security:
 * - Helmet FIRST: Sets security headers on all responses, including error responses
 * - CORS SECOND: Handles preflight OPTIONS before rate limiting to avoid false positives
 * - Rate Limiting THIRD: Applies to all actual requests after CORS preflight handling
 * - Routes LAST: Business logic executes only after all security checks pass
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 * @requires express - Express.js web application framework (^5.1.0)
 * @requires helmet - Security headers middleware (^8.1.0)
 * @requires cors - CORS handling middleware (^2.8.5)
 * @requires express-rate-limit - Rate limiting middleware (^8.2.1)
 * @requires ./config - Application configuration module
 * @requires ./middleware/security - Security middleware factory
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Express.js web application framework.
 * @external express
 * @see {@link https://expressjs.com/}
 */
const express = require('express');

/**
 * Helmet security headers middleware.
 * Sets 11+ HTTP security headers including Content-Security-Policy,
 * Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Origin-Agent-Cluster,
 * Referrer-Policy, Strict-Transport-Security, X-Content-Type-Options,
 * X-DNS-Prefetch-Control, X-Download-Options, X-Frame-Options, and
 * X-Permitted-Cross-Domain-Policies. Automatically removes X-Powered-By header
 * to prevent Express framework fingerprinting.
 * @external helmet
 * @see {@link https://helmetjs.github.io/}
 */
const helmet = require('helmet');

/**
 * CORS (Cross-Origin Resource Sharing) middleware.
 * Handles preflight OPTIONS requests and sets Access-Control-Allow-* headers
 * with configurable origin whitelist for production security.
 * @external cors
 * @see {@link https://www.npmjs.com/package/cors}
 */
const cors = require('cors');

/**
 * Express rate limiting middleware for DDoS and brute-force attack prevention.
 * Limits requests per IP address within configurable time windows with
 * draft-8 compliant RateLimit headers.
 * @external express-rate-limit
 * @see {@link https://www.npmjs.com/package/express-rate-limit}
 */
const { rateLimit } = require('express-rate-limit');

/**
 * Application configuration module providing security settings.
 * Provides rateLimitWindowMs, rateLimitMax, corsOrigins, and env configuration
 * for environment-aware middleware configuration.
 * @type {Object}
 * @property {number} rateLimitWindowMs - Rate limit window duration in milliseconds
 * @property {number} rateLimitMax - Maximum requests per rate limit window
 * @property {string} corsOrigins - Allowed CORS origins (comma-separated for multiple)
 * @property {string} env - Application environment (development/production)
 */
const config = require('./config');

/**
 * Security middleware factory function.
 * Creates configured instances of helmetMiddleware, corsMiddleware, and
 * rateLimitMiddleware based on application configuration for security hardening.
 * @function createSecurityMiddleware
 */
const { createSecurityMiddleware } = require('./middleware/security');

/**
 * Main routes module containing application route handlers.
 * Provides GET / and GET /evening endpoints.
 */
const { mainRoutes } = require('./routes');

// ---------------------------------------------------------------------------
// Express Application Initialization
// ---------------------------------------------------------------------------

/**
 * Express application instance.
 * @type {express.Application}
 */
const app = express();

// ---------------------------------------------------------------------------
// Security Middleware Configuration
// ---------------------------------------------------------------------------

/**
 * Configured security middleware instances.
 * Factory function returns middleware configured based on application settings
 * from config module (rateLimitWindowMs, rateLimitMax, corsOrigins, env).
 * 
 * @type {Object}
 * @property {Function} helmetMiddleware - Helmet security headers middleware
 * @property {Function} corsMiddleware - CORS handling middleware
 * @property {Function} rateLimitMiddleware - Rate limiting middleware
 */
const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = createSecurityMiddleware(config);

// ---------------------------------------------------------------------------
// Middleware Registration (ORDER IS CRITICAL FOR SECURITY)
// ---------------------------------------------------------------------------

/**
 * 1. Security Headers Middleware (FIRST)
 * 
 * Helmet is registered first to ensure all responses (including error responses
 * and responses from subsequent middleware) include proper security headers.
 * This provides baseline protection against:
 * - XSS attacks (via Content-Security-Policy)
 * - Clickjacking (via X-Frame-Options: DENY)
 * - MIME sniffing attacks (via X-Content-Type-Options: nosniff)
 * - Protocol downgrade attacks (via Strict-Transport-Security in production)
 * - Information disclosure (via X-Powered-By removal)
 */
app.use(helmetMiddleware);

/**
 * 2. CORS Middleware (SECOND)
 * 
 * CORS is registered after helmet but before rate limiting to properly handle
 * preflight OPTIONS requests. This ensures:
 * - Preflight requests are handled before rate limiting (avoiding false positives)
 * - Cross-origin requests are properly validated against the whitelist
 * - Access-Control-Allow-* headers are set for authorized origins
 * - Unauthorized origins are rejected before reaching business logic
 */
app.use(corsMiddleware);

/**
 * 3. Rate Limiting Middleware (THIRD)
 * 
 * Rate limiting is registered after CORS to apply throttling to actual
 * requests (not preflight). This protects against:
 * - DDoS attacks by limiting requests per IP
 * - Brute-force attacks on any endpoint
 * - Resource exhaustion from rapid requests
 * 
 * Default configuration: 100 requests per 15-minute window per IP.
 * Returns HTTP 429 Too Many Requests when limit exceeded.
 */
app.use(rateLimitMiddleware);

// ---------------------------------------------------------------------------
// Route Registration (LAST - After All Security Middleware)
// ---------------------------------------------------------------------------

/**
 * 4. Main Routes (LAST)
 * 
 * Routes are mounted last to ensure all security middleware executes before
 * any business logic. This preserves the original route paths:
 * - GET '/' -> Returns "Hello, World!" with security headers
 * - GET '/evening' -> Returns "Good Evening, World!" with security headers
 * 
 * Both endpoints continue to function identically to original behavior,
 * now enhanced with security headers, CORS protection, and rate limiting.
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

/**
 * Configured Express application instance with security middleware.
 * Ready for HTTP or HTTPS server creation in server.js.
 * @type {express.Application}
 */
module.exports = app;
