/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Security middleware stack (mounted in strict order):
 *   1. Helmet — Sets 13 protective HTTP response headers (CSP, HSTS,
 *      X-Content-Type-Options, etc.) and removes X-Powered-By header
 *   2. CORS — Enforces cross-origin resource sharing policy with
 *      environment-driven origin whitelisting
 *   3. Rate Limiter — IP-based request throttling (100 req/15-min window)
 *      to prevent DoS and brute-force attacks
 *   4. JSON Body Parser — Parses application/json request bodies after
 *      rate limiting to avoid unnecessary parsing of rejected requests
 *   5. Routes — Application route handlers (mounted last)
 *
 * Middleware ordering rationale: Security headers must be set first on
 * every response; CORS must handle preflight OPTIONS before rate limiting
 * counts them; rate limiting must reject excess traffic before expensive
 * body parsing and route processing occur.
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 */

const express = require('express');
const { helmetMiddleware, corsMiddleware, rateLimiterMiddleware } = require('./middleware');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Security middleware stack — mounted in strict order before route handlers.
 * Helmet must be first to set response headers on every response; CORS second
 * to handle preflight OPTIONS requests before rate limiting; Rate Limiter third
 * to throttle requests before route processing; JSON parser fourth to parse
 * request bodies only after the request passes rate limiting.
 */
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(rateLimiterMiddleware);
app.use(express.json());

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

module.exports = app;
