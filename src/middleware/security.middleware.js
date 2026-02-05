/**
 * Security Middleware Module
 * 
 * This module configures Helmet.js security middleware for Express.
 * Helmet helps secure Express apps by setting various HTTP headers.
 * 
 * Security headers set by Helmet (default configuration):
 * - Content-Security-Policy
 * - Cross-Origin-Embedder-Policy
 * - Cross-Origin-Opener-Policy
 * - Cross-Origin-Resource-Policy
 * - X-DNS-Prefetch-Control
 * - X-Frame-Options
 * - Strict-Transport-Security
 * - X-Download-Options
 * - X-Content-Type-Options
 * - Origin-Agent-Cluster
 * - X-Permitted-Cross-Domain-Policies
 * - Referrer-Policy
 * - X-XSS-Protection
 * 
 * IMPORTANT: This middleware MUST be registered FIRST in the middleware
 * chain to ensure security headers are set before any response is sent.
 * 
 * Usage in app.js:
 *   const { securityMiddleware } = require('./middleware');
 *   app.use(securityMiddleware);
 * 
 * @module src/middleware/security.middleware
 */

'use strict';

const helmet = require('helmet');

/**
 * Security Headers Middleware
 * Configures Helmet.js with default security settings.
 * 
 * The default configuration provides comprehensive protection and is
 * recommended by Helmet documentation for most applications.
 * 
 * @type {Function}
 */
const securityMiddleware = helmet();

module.exports = {
  securityMiddleware
};
