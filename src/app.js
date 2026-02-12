/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a complete production-grade middleware pipeline:
 * - Helmet for HTTP security headers (CSP, HSTS, X-Frame-Options)
 * - CORS for cross-origin request handling
 * - JSON and URL-encoded body parsers
 * - Morgan HTTP request logging via Winston stream
 * - Centralized error handling (404 catch-all and error handler)
 *
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 * @requires helmet
 * @requires cors
 * @requires express
 * @requires src/config
 * @requires src/middleware/morgan.middleware
 * @requires src/middleware/error.middleware
 * @requires src/routes
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const { mainRoutes, healthRoutes } = require('./routes');
const morganMiddleware = require('./middleware/morgan.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

/**
 * Security middleware - sets security-related HTTP response headers
 * including Content-Security-Policy, X-Content-Type-Options,
 * X-Frame-Options, and Strict-Transport-Security.
 */
app.use(helmet());

/**
 * CORS middleware - enables Cross-Origin Resource Sharing with
 * configurable origin policy from environment configuration.
 */
app.use(cors({ origin: config.corsOrigin }));

/**
 * JSON body parser - parses incoming requests with JSON payloads.
 * Limited to 10kb to prevent abuse from oversized request bodies.
 */
app.use(express.json({ limit: '10kb' }));

/**
 * URL-encoded body parser - parses incoming requests with
 * URL-encoded payloads (HTML form submissions).
 */
app.use(express.urlencoded({ extended: true }));

/**
 * HTTP request logging middleware - logs all incoming requests
 * through Morgan, piped to Winston stream for unified logging.
 */
app.use(morganMiddleware);

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check routes at root path
 * - GET '/health' -> healthRoutes handles this
 */
app.use('/', healthRoutes);

/**
 * 404 Not Found handler - catches all requests that did not match
 * any defined route and passes a standardized 404 error forward.
 */
app.use(notFoundHandler);

/**
 * Centralized error handler - final error-handling middleware that
 * logs errors via Winston and returns JSON error responses.
 * Stack traces are suppressed in production.
 */
app.use(errorHandler);

module.exports = app;
