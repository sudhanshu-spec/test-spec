/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Security Middleware Chain (per Agent Action Plan Section 0.5.4):
 * Security middleware is applied in a specific order for maximum effectiveness:
 * 1. app.disable('x-powered-by') - Remove Express fingerprint (must be first)
 * 2. Rate limiter - Block excess requests early (SEC-003)
 * 3. CORS - Validate origin before processing (SEC-005)
 * 4. Helmet - Apply 13 security headers (SEC-001)
 * 5. Routes - Application logic protected by security chain
 *
 * Security Requirements Implemented:
 * - SEC-001: Security Headers Protection via helmet.js
 * - SEC-003: Rate Limiting via express-rate-limit
 * - SEC-005: CORS Policy via cors middleware
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 * @see {@link https://expressjs.com/en/advanced/best-practice-security.html} Express Security Best Practices
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const { rateLimiter, corsConfig } = require('./middleware');
const config = require('./config');
const { mainRoutes } = require('./routes');

/**
 * Express application instance
 * @type {import('express').Application}
 */
const app = express();

// =============================================================================
// Security Middleware Chain (order matters per Section 0.5.4)
// =============================================================================

/**
 * Step 1: Remove X-Powered-By header to prevent server fingerprinting
 * This prevents attackers from easily identifying the server technology.
 * Must be first in the middleware chain.
 */
app.disable('x-powered-by');

/**
 * Step 2: Trust proxy configuration for correct IP resolution
 * Enable when running behind a reverse proxy (nginx, load balancer, cloud provider).
 * Required for accurate rate limiting when behind proxy.
 */
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

/**
 * Step 3: Rate limiting middleware (SEC-003)
 * Blocks excess requests early to prevent abuse and DoS attacks.
 * Configuration: RATE_LIMIT_WINDOW_MS (default: 15 min), RATE_LIMIT_MAX (default: 100)
 */
app.use(rateLimiter);

/**
 * Step 4: CORS middleware (SEC-005)
 * Validates origin before processing cross-origin requests.
 * Configuration: CORS_ORIGIN environment variable
 */
app.use(corsConfig);

/**
 * Step 5: Helmet security headers middleware (SEC-001)
 * Applies 13 HTTP security headers including:
 * - Content-Security-Policy: Prevents XSS and data injection
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - X-Frame-Options: Prevents clickjacking
 * - Referrer-Policy: Controls referrer information
 * And 8 additional security headers.
 */
app.use(helmet());

// =============================================================================
// Application Routes (protected by security middleware)
// =============================================================================

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this (Hello, World!)
 * - GET '/evening' -> mainRoutes handles this (Good evening)
 *
 * All routes are now protected by the security middleware chain above.
 */
app.use('/', mainRoutes);

module.exports = app;
