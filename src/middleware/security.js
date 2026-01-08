/**
 * Security Middleware Aggregation Module
 *
 * This module centralizes all security middleware configuration for the Express.js
 * application, providing a single import point for security features. It aggregates
 * helmet, CORS, and rate limiting middleware into a unified security configuration
 * object for easy integration in the main application file (src/app.js).
 *
 * Security Requirements Implemented:
 * - SEC-001: Security Headers Protection via helmet.js (13 HTTP security headers)
 * - SEC-003: Rate Limiting via express-rate-limit (IP-based request throttling)
 * - SEC-005: CORS Policy via cors package (cross-origin access control)
 *
 * Architecture Reference: Section 0.6.1 File Transformation Mapping
 * The security.js module serves as the aggregate security middleware configuration
 * per the Agent Action Plan's file transformation specification.
 *
 * Helmet Security Headers (Section 0.2.2 and 0.5.2):
 * Helmet applies 13 HTTP security headers by default:
 * 1. Content-Security-Policy: Prevents XSS and data injection attacks
 * 2. Cross-Origin-Embedder-Policy: Controls cross-origin resource embedding
 * 3. Cross-Origin-Opener-Policy: Isolates browsing context
 * 4. Cross-Origin-Resource-Policy: Controls cross-origin resource loading
 * 5. Origin-Agent-Cluster: Requests origin-keyed agent clusters
 * 6. Referrer-Policy: Controls referrer information leakage
 * 7. Strict-Transport-Security: Enforces HTTPS connections
 * 8. X-Content-Type-Options: Prevents MIME type sniffing (nosniff)
 * 9. X-DNS-Prefetch-Control: Controls DNS prefetching
 * 10. X-Download-Options: Prevents automatic file download execution (IE)
 * 11. X-Frame-Options: Prevents clickjacking attacks (SAMEORIGIN)
 * 12. X-Permitted-Cross-Domain-Policies: Controls Adobe cross-domain policy
 * 13. X-XSS-Protection: Legacy XSS filter (set to 0 per modern best practices)
 *
 * Additionally, helmet removes the X-Powered-By header to prevent server
 * fingerprinting attacks.
 *
 * OWASP Security Guidelines Applied:
 * - OWASP A7:2017 - Cross-Site Scripting (XSS) via Content-Security-Policy
 * - OWASP A3:2017 - Sensitive Data Exposure via Strict-Transport-Security
 * - OWASP API4:2019 - Lack of Resources & Rate Limiting via express-rate-limit
 * - Clickjacking prevention via X-Frame-Options
 *
 * Middleware Order Specification (Section 0.5.4):
 * Security middleware should be applied in this order:
 * 1. Rate Limiter - Block excess requests early
 * 2. CORS - Validate origin before processing
 * 3. Helmet - Apply security headers to all responses
 *
 * Usage in src/app.js:
 *   const security = require('./middleware/security');
 *
 *   // Apply in order per Section 0.5.4
 *   app.use(security.rateLimiter);
 *   app.use(security.corsConfig);
 *   app.use(security.helmet);
 *
 * Alternative usage via destructuring:
 *   const { helmet, rateLimiter, corsConfig } = require('./middleware/security');
 *   app.use(rateLimiter);
 *   app.use(corsConfig);
 *   app.use(helmet);
 *
 * @module src/middleware/security
 * @see {@link https://helmetjs.github.io/} Helmet.js documentation
 * @see {@link https://express-rate-limit.mintlify.app/} express-rate-limit documentation
 * @see {@link https://github.com/expressjs/cors} CORS package documentation
 * @see {@link https://owasp.org/Top10/} OWASP Top 10 Security Risks
 * @see {@link https://expressjs.com/en/advanced/best-practice-security.html} Express Security Best Practices
 */

'use strict';

// =============================================================================
// External Dependencies
// =============================================================================

/**
 * Helmet middleware for HTTP security headers.
 * Version: ^8.1.0
 *
 * Helmet helps secure Express apps by setting various HTTP headers according
 * to web security best practices. It is a collection of smaller middleware
 * functions that set security-related HTTP response headers.
 *
 * @see {@link https://helmetjs.github.io/}
 */
const helmet = require('helmet');

// =============================================================================
// Internal Dependencies
// =============================================================================

/**
 * Rate limiter middleware for IP-based request throttling.
 * Implements SEC-003 Rate Limiting requirement.
 *
 * Configured with:
 * - windowMs: 15 minutes (configurable via RATE_LIMIT_WINDOW_MS)
 * - limit: 100 requests per window (configurable via RATE_LIMIT_MAX)
 * - draft-8 standard RateLimit headers
 *
 * @see src/middleware/rateLimiter.js
 */
const rateLimiter = require('./rateLimiter');

/**
 * CORS middleware for cross-origin access control.
 * Implements SEC-005 CORS Policy requirement.
 *
 * Configured with:
 * - Environment-specific origin validation
 * - Standard REST methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
 * - Limited allowed headers for security
 * - Credentials support for authenticated requests
 *
 * @see src/middleware/corsConfig.js
 */
const corsConfig = require('./corsConfig');

// =============================================================================
// Security Middleware Configuration
// =============================================================================

/**
 * Pre-configured helmet middleware instance.
 *
 * Applies 13 security headers by default plus removes X-Powered-By header.
 * This configuration uses helmet's default options which provide strong
 * security defaults suitable for most applications.
 *
 * Security Headers Applied (Section 0.2.2):
 *
 * 1. Content-Security-Policy (CSP)
 *    Prevents XSS and data injection by restricting resource loading sources.
 *    Default: script-src 'self'; object-src 'none'; upgrade-insecure-requests
 *
 * 2. Cross-Origin-Embedder-Policy (COEP)
 *    Controls which cross-origin resources can be embedded.
 *    Default: require-corp (requires CORP or CORS for cross-origin resources)
 *
 * 3. Cross-Origin-Opener-Policy (COOP)
 *    Isolates browsing context to prevent cross-origin attacks.
 *    Default: same-origin
 *
 * 4. Cross-Origin-Resource-Policy (CORP)
 *    Protects against certain cross-origin reads.
 *    Default: same-origin
 *
 * 5. Origin-Agent-Cluster
 *    Requests origin-keyed agent clusters for better isolation.
 *    Default: ?1 (enabled)
 *
 * 6. Referrer-Policy
 *    Controls referrer information sent with requests.
 *    Default: no-referrer (maximum privacy)
 *
 * 7. Strict-Transport-Security (HSTS)
 *    Enforces HTTPS connections to prevent man-in-the-middle attacks.
 *    Default: max-age=15552000; includeSubDomains (180 days)
 *
 * 8. X-Content-Type-Options
 *    Prevents MIME type sniffing attacks.
 *    Default: nosniff
 *
 * 9. X-DNS-Prefetch-Control
 *    Controls DNS prefetching behavior.
 *    Default: off (disabled for privacy)
 *
 * 10. X-Download-Options
 *     Prevents automatic file download execution in IE.
 *     Default: noopen
 *
 * 11. X-Frame-Options
 *     Prevents clickjacking by controlling iframe embedding.
 *     Default: SAMEORIGIN (only same-origin can embed)
 *
 * 12. X-Permitted-Cross-Domain-Policies
 *     Controls Adobe cross-domain policy files.
 *     Default: none
 *
 * 13. X-XSS-Protection
 *     Legacy XSS filter control.
 *     Default: 0 (disabled - modern CSP is preferred)
 *
 * Additional Protection:
 * - X-Powered-By header is automatically removed by helmet
 *
 * @type {Function} Express middleware function
 *
 * @example
 * // Apply helmet middleware
 * app.use(security.helmet);
 *
 * // Response headers will include:
 * // Content-Security-Policy: default-src 'self';...
 * // Strict-Transport-Security: max-age=15552000; includeSubDomains
 * // X-Content-Type-Options: nosniff
 * // X-Frame-Options: SAMEORIGIN
 * // Referrer-Policy: no-referrer
 * // ... and more
 */
const helmetMiddleware = helmet();

// =============================================================================
// Module Exports
// =============================================================================

/**
 * Security middleware aggregation object.
 *
 * Exports all security middleware components for use in the application.
 * This object provides a centralized access point for all security middleware,
 * enabling clean imports and consistent security configuration across the app.
 *
 * Exported Components:
 * - helmet: Pre-configured helmet middleware (13 security headers + X-Powered-By removal)
 * - rateLimiter: IP-based rate limiting middleware (SEC-003)
 * - corsConfig: CORS middleware with configurable origins (SEC-005)
 *
 * Implementation per Section 0.6.4:
 * This module aggregates security middleware configuration and exports
 * configured helmet, cors, and rate limiter instances for integration
 * in the main application file.
 *
 * @type {Object}
 * @property {Function} helmet - Helmet middleware for security headers (SEC-001)
 * @property {Function} rateLimiter - Rate limiting middleware (SEC-003)
 * @property {Function} corsConfig - CORS middleware (SEC-005)
 *
 * @example
 * // Import all security middleware
 * const security = require('./middleware/security');
 *
 * // Apply middleware in recommended order (Section 0.5.4)
 * app.use(security.rateLimiter);  // 1. Block excess requests early
 * app.use(security.corsConfig);   // 2. Validate origin before processing
 * app.use(security.helmet);       // 3. Apply security headers
 *
 * @example
 * // Destructured import
 * const { helmet, rateLimiter, corsConfig } = require('./middleware/security');
 *
 * app.use(rateLimiter);
 * app.use(corsConfig);
 * app.use(helmet);
 *
 * @example
 * // Apply to specific routes only
 * const security = require('./middleware/security');
 *
 * app.use('/api', security.rateLimiter);
 * app.use('/api', security.corsConfig);
 * app.use('/api', security.helmet);
 */
module.exports = {
  /**
   * Helmet middleware for HTTP security headers.
   * Implements SEC-001 Security Headers Protection requirement.
   *
   * Sets 13 security headers and removes X-Powered-By header to prevent
   * server fingerprinting. Provides protection against common web
   * vulnerabilities including XSS, clickjacking, and MIME sniffing.
   *
   * @type {Function}
   */
  helmet: helmetMiddleware,

  /**
   * Rate limiter middleware for IP-based request throttling.
   * Implements SEC-003 Rate Limiting requirement.
   *
   * Protects against DoS attacks and brute force attempts by limiting
   * the number of requests from a single IP address within a time window.
   * Returns 429 Too Many Requests when limit is exceeded.
   *
   * @type {Function}
   */
  rateLimiter,

  /**
   * CORS middleware for cross-origin access control.
   * Implements SEC-005 CORS Policy requirement.
   *
   * Controls which domains can access the API, what HTTP methods are
   * allowed, and which headers can be sent in cross-origin requests.
   * Environment-specific configuration allows development flexibility
   * with production security.
   *
   * @type {Function}
   */
  corsConfig
};
