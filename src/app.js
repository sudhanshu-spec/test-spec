/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a complete middleware pipeline for production readiness.
 *
 * Middleware pipeline order (request flow):
 *   Helmet (security headers) → CORS → JSON body parser → URL-encoded parser
 *   → Morgan (HTTP request logging) → Route handlers → 404 Not Found handler
 *   → Error handler
 *
 * Design pattern: Factory pattern — creates configured Express app without
 * calling listen(), enabling unit testing without starting the actual server.
 *
 * @module src/app
 * @requires helmet
 * @requires cors
 * @requires morgan.middleware
 * @requires error.middleware
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const { mainRoutes, healthRoutes } = require('./routes');
const morganMiddleware = require('./middleware/morgan.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// =============================================================================
// Security Middleware
// =============================================================================

/** Set security-related HTTP response headers (CSP, HSTS, X-Frame-Options) */
app.use(helmet());

/** Enable Cross-Origin Resource Sharing with configurable origin */
app.use(cors({ origin: config.corsOrigin }));

// =============================================================================
// Body Parsing Middleware
// =============================================================================

/** Parse incoming JSON request bodies with size limit for abuse prevention */
app.use(express.json({ limit: '10kb' }));

/** Parse URL-encoded form data */
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// Request Logging Middleware
// =============================================================================

/** HTTP request logging piped through Winston stream */
app.use(morganMiddleware);

// =============================================================================
// Route Handlers
// =============================================================================

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

// =============================================================================
// Error Handling Middleware
// =============================================================================

/** 404 catch-all for unmatched routes */
app.use(notFoundHandler);

/** Centralized error handler (4-parameter Express signature) */
app.use(errorHandler);

module.exports = app;
