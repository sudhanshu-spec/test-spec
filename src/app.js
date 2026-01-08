/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with comprehensive security middleware integration. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 *
 * Security Middleware Chain (order is critical per Section 0.5.4):
 * 1. x-powered-by disabled - Remove Express fingerprint for security
 * 2. Rate Limiter - Block excess requests early (SEC-003)
 * 3. CORS - Validate cross-origin requests (SEC-005)
 * 4. Helmet - Apply 13 HTTP security headers (SEC-001)
 * 5. Routes - Application logic protected by security chain
 *
 * Security Features Implemented:
 * - HTTP Security Headers (Content-Security-Policy, HSTS, X-Frame-Options, etc.)
 * - Rate Limiting (IP-based request throttling to prevent DoS/brute force)
 * - CORS Policy (Cross-origin access control with configurable origins)
 * - Server Fingerprint Removal (X-Powered-By header removed)
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 * @see src/middleware/index.js - Security middleware exports
 * @see src/middleware/rateLimiter.js - Rate limiting configuration
 * @see src/middleware/corsConfig.js - CORS configuration
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const { rateLimiter, corsConfig } = require('./middleware');
const { mainRoutes } = require('./routes');

/**
 * Express application instance with security middleware chain configured.
 * @type {Express.Application}
 */
const app = express();

/**
 * Security Middleware Chain
 *
 * CRITICAL: Middleware order matters for security effectiveness.
 * The chain is configured per Section 0.5.4 specifications:
 *
 * 1. Remove X-Powered-By header (prevents Express server fingerprinting)
 * 2. Rate Limiter (blocks abusive requests before processing)
 * 3. CORS (validates origin before allowing request processing)
 * 4. Helmet (applies 13 HTTP security headers to all responses)
 *
 * This ordering ensures:
 * - Rate limits are applied before any request processing
 * - CORS validation happens before security headers are applied
 * - All responses include security headers regardless of route
 */

// Step 1: Remove Express fingerprint (must be first security measure)
// Removes X-Powered-By header that could reveal server technology stack
app.disable('x-powered-by');

// Step 2: Rate Limiting middleware - Block excess requests early
// Configured via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX env variables
// Returns 429 Too Many Requests when limit exceeded
app.use(rateLimiter);

// Step 3: CORS middleware - Validate cross-origin requests
// Configured via CORS_ORIGIN env variable
// Allows configurable origin whitelist for cross-origin access control
app.use(corsConfig);

// Step 4: Helmet middleware - Apply 13 HTTP security headers
// Includes: Content-Security-Policy, Strict-Transport-Security,
// X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
// X-Download-Options, X-DNS-Prefetch-Control, and more
app.use(helmet());

/**
 * Route Mounting
 *
 * Mount main routes at root path AFTER security middleware chain.
 * This ensures all route handlers are protected by:
 * - Rate limiting (prevents DoS attacks)
 * - CORS validation (prevents unauthorized cross-origin access)
 * - Security headers (prevents XSS, clickjacking, etc.)
 *
 * Routes served:
 * - GET '/' -> Hello World response
 * - GET '/evening' -> Good evening response
 */
app.use('/', mainRoutes);

module.exports = app;
