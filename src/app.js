'use strict';

/**
 * @fileoverview Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a production-grade middleware pipeline. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 *
 * Middleware pipeline order (following Express.js production best practices):
 *   1. helmet()        — Security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   2. cors()          — Cross-origin resource sharing policy
 *   3. express.json()  — JSON request body parsing
 *   4. Route handlers  — Application routes (mainRoutes, healthRoutes)
 *   5. errorHandler    — Centralized error-handling middleware (must be last)
 *
 * Note: Morgan HTTP request logging middleware is intentionally mounted in
 * server.js (not here) to keep test output clean when Supertest uses the
 * app factory directly.
 *
 * Design pattern: Factory pattern — creates configured Express app
 *
 * @module src/app
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { mainRoutes, healthRoutes } = require('./routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// --- Middleware Pipeline ---
// Middleware is mounted in a specific order following production best practices:
// security hardening first, then CORS policy, then body parsing, then routes,
// and finally the centralized error handler.

// 1. Security headers — sets Content-Security-Policy, Strict-Transport-Security,
//    X-Frame-Options, X-Content-Type-Options, and other protective headers
app.use(helmet());

// 2. CORS policy — configures cross-origin resource sharing headers to control
//    which origins can access the API endpoints
app.use(cors());

// 3. JSON body parsing — parses incoming requests with JSON payloads and
//    makes the parsed data available on req.body
app.use(express.json());

// --- Route Mounting ---

/**
 * Mount main routes at root path.
 * Preserves the original route paths:
 *   - GET '/'        -> mainRoutes handles the Hello World response
 *   - GET '/evening' -> mainRoutes handles the Good Evening response
 */
app.use('/', mainRoutes);

/**
 * Mount health-check routes at /health prefix.
 * Provides operational monitoring and load-balancer readiness probes:
 *   - GET '/health' -> healthRoutes returns JSON status with uptime and timestamp
 */
app.use('/health', healthRoutes);

// --- Error Handling ---

/**
 * Centralized error-handling middleware (must be the last middleware mounted).
 * Express identifies this as an error handler by its 4-argument signature
 * (err, req, res, next). Catches all unhandled errors from the route pipeline,
 * logs them via Winston, and returns structured JSON error responses.
 * In production, stack traces are omitted from responses for security.
 */
app.use(errorHandler);

module.exports = app;
