/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a production-grade middleware pipeline. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 *
 * Middleware pipeline execution order:
 *   1. helmet()          — Security headers (CSP, HSTS, X-Content-Type-Options, etc.)
 *   2. cors()            — CORS headers (Access-Control-Allow-Origin)
 *   3. requestLogger     — HTTP request logging (Morgan piped through Winston)
 *   4. express.json()    — JSON body parsing
 *   5. Route handlers    — mainRoutes and healthRoutes
 *   6. errorHandler      — Centralized error-handling middleware (4-arg signature)
 *
 * Design pattern: Factory pattern - creates configured Express app without
 * calling listen(), allowing Supertest-based integration testing without
 * port allocation.
 *
 * @module src/app
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const { errorHandler, requestLogger } = require('./middleware');
const { mainRoutes, healthRoutes } = require('./routes');

const app = express();

/**
 * Security middleware — sets 13 HTTP response headers including
 * Content-Security-Policy, Strict-Transport-Security, and
 * X-Content-Type-Options. Registered first to ensure security
 * headers are applied to all responses.
 */
app.use(helmet());

/**
 * CORS middleware — sets Access-Control-Allow-Origin and related
 * response headers for cross-origin request handling. Origin is
 * configured via config.corsOrigin (defaults to '*').
 */
app.use(cors({ origin: config.corsOrigin }));

/**
 * HTTP request logging middleware — Morgan configured with combined
 * format and a custom write stream piped through Winston logger.
 */
app.use(requestLogger);

/**
 * JSON body parser — parses incoming requests with JSON payloads
 * and populates req.body.
 */
app.use(express.json());

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check routes at root path
 * - GET '/health' -> healthRoutes handles this (PM2 monitoring and production readiness)
 */
app.use('/', healthRoutes);

/**
 * Centralized error-handling middleware — must be registered AFTER all
 * routes. Express identifies this as an error handler by its 4-argument
 * signature (err, req, res, next). Logs errors via Winston and returns
 * structured JSON error responses.
 */
app.use(errorHandler);

module.exports = app;
