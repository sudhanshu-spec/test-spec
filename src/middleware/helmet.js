/**
 * Helmet Security Headers Middleware Configuration
 *
 * This module configures and exports the Helmet.js middleware instance
 * for setting protective HTTP security response headers. Helmet is mounted
 * as the FIRST middleware in the Express middleware chain to ensure all
 * responses include security headers before any other processing.
 *
 * Headers set by Helmet (13 default headers):
 * - Content-Security-Policy: Restricts resource loading sources
 * - Cross-Origin-Embedder-Policy: Controls cross-origin embedding
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Restricts cross-origin resource loading
 * - Strict-Transport-Security: Enforces HTTPS connections
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - X-DNS-Prefetch-Control: Controls DNS prefetching
 * - X-Download-Options: Prevents IE file execution
 * - X-Frame-Options: Prevents clickjacking via framing
 * - X-Permitted-Cross-Domain-Policies: Restricts Adobe cross-domain policies
 * - X-XSS-Protection: Removed (modern browsers handle CSP instead)
 * - Removes X-Powered-By header to prevent framework fingerprinting
 *
 * Configuration follows OWASP security header recommendations.
 *
 * @module src/middleware/helmet
 */

'use strict';

const helmet = require('helmet');

/**
 * Configured Helmet middleware instance with sensible Content-Security-Policy
 * defaults suitable for development and production environments.
 *
 * CSP directives:
 * - defaultSrc: Only allow resources from same origin ('self')
 * - scriptSrc: Only allow scripts from same origin ('self')
 * - styleSrc: Allow styles from same origin and inline styles
 * - imgSrc: Allow images from same origin and data: URIs
 *
 * HSTS configuration:
 * - maxAge: 365 days (31536000 seconds) per best practices
 * - includeSubDomains: true for comprehensive HSTS coverage
 *
 * @type {import('express').RequestHandler}
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:']
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true
  }
});

module.exports = helmetMiddleware;
