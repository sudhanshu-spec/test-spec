/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a layered security middleware stack. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 *
 * Security middleware chain (mounted in order):
 *   1. Helmet - HTTP security response headers (CSP, HSTS, etc.)
 *   2. CORS - Cross-Origin Resource Sharing policy enforcement
 *   3. Rate Limiter - IP-based request throttling (100 req/15min)
 *   4. JSON Body Parser - Request body parsing
 *   5. Routes - Application route handlers (with per-route validation)
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 */

'use strict';

const express = require('express');
const { helmetMiddleware, corsMiddleware, rateLimiterMiddleware } = require('./middleware');
const { mainRoutes } = require('./routes');

const app = express();

// =============================================================================
// Security Middleware Stack (order matters)
// =============================================================================

/**
 * 1. Helmet security headers — FIRST middleware.
 * Sets 13 protective HTTP response headers before any other processing.
 * Removes X-Powered-By to prevent framework fingerprinting.
 */
app.use(helmetMiddleware);

/**
 * 2. CORS policy enforcement — SECOND middleware.
 * Handles OPTIONS preflight requests and sets Access-Control-* headers
 * before rate limiting to avoid counting preflight requests against limits.
 */
app.use(corsMiddleware);

/**
 * 3. Rate limiter — THIRD middleware.
 * Throttles requests per IP (default: 100 req / 15-minute window).
 * Returns HTTP 429 Too Many Requests when threshold is exceeded.
 */
app.use(rateLimiterMiddleware);

/**
 * 4. JSON body parser — FOURTH middleware.
 * Parses incoming request bodies with JSON payloads.
 */
app.use(express.json());

// =============================================================================
// Route Mounting
// =============================================================================

/**
 * Mount main routes at root path.
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this (with input validation)
 * - GET '/evening' -> mainRoutes handles this (with input validation)
 */
app.use('/', mainRoutes);

module.exports = app;
