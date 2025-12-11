/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Security Middleware (applied in order):
 * 1. Helmet - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. CORS - Cross-Origin Resource Sharing handling
 * 3. Rate Limiting - DDoS and brute-force protection
 * 
 * This middleware order ensures:
 * - Security headers are set on all responses (helmet first)
 * - CORS preflight is handled before rate limiting
 * - Rate limits apply to all routes
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 * @requires express - Express.js web framework
 * @requires ./middleware/security - Security middleware configuration
 * @requires ./routes - Application routes
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

const express = require('express');

/**
 * Security middleware imports.
 * Configured instances of helmet, cors, and rate-limit.
 */
const { 
  helmetMiddleware, 
  corsMiddleware, 
  rateLimitMiddleware 
} = require('./middleware/security');

/**
 * Route imports.
 */
const { mainRoutes } = require('./routes');

// ---------------------------------------------------------------------------
// Express Application Initialization
// ---------------------------------------------------------------------------

/**
 * Express application instance.
 * @type {import('express').Application}
 */
const app = express();

// ---------------------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------------------

/**
 * Apply Helmet security headers middleware.
 * Must be first to ensure all responses have security headers.
 * 
 * Sets 11+ security headers including:
 * - Content-Security-Policy
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security (production only)
 * - And removes X-Powered-By header
 */
app.use(helmetMiddleware);

/**
 * Apply CORS middleware.
 * Handles preflight OPTIONS requests and sets Access-Control-* headers.
 * Origin restrictions configured via CORS_ORIGINS environment variable.
 */
app.use(corsMiddleware);

/**
 * Apply rate limiting middleware.
 * Limits requests per IP address to prevent DDoS and brute-force attacks.
 * Default: 100 requests per 15 minutes per IP.
 * Configurable via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX environment variables.
 */
app.use(rateLimitMiddleware);

// ---------------------------------------------------------------------------
// Route Configuration
// ---------------------------------------------------------------------------

/**
 * Mount main routes at root path.
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

module.exports = app;
