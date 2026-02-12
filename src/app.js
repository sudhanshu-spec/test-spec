/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a comprehensive middleware pipeline for production readiness.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Middleware pipeline execution order:
 *   1. Helmet — Security headers
 *   2. CORS — Cross-origin resource sharing
 *   3. Morgan/Winston — HTTP request logging
 *   4. express.json() — JSON body parsing
 *   5. Routes — Application route handlers
 *   6. Error Handler — Centralized error handling (must be last)
 *
 * Design pattern: Factory pattern - creates configured Express app
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

// =============================================================================
// Middleware Pipeline (order matters)
// =============================================================================

/**
 * Security headers middleware.
 * Sets 13 HTTP security headers including CSP, HSTS, and X-Content-Type-Options.
 * Registered first to ensure security headers are applied to all responses.
 */
app.use(helmet());

/**
 * CORS middleware.
 * Sets Access-Control-Allow-Origin and related headers for cross-origin requests.
 * Origin is driven by the CORS_ORIGIN environment variable via config.
 */
app.use(cors({ origin: config.corsOrigin }));

/**
 * HTTP request logging middleware.
 * Morgan configured with Winston write stream for structured access logging.
 */
app.use(requestLogger);

/**
 * JSON body parser middleware.
 * Parses incoming JSON request bodies (default 100kb limit).
 */
app.use(express.json());

// =============================================================================
// Route Mounting
// =============================================================================

/**
 * Mount main routes at root path.
 * Preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check routes at root path.
 * - GET /health -> healthRoutes handles this
 */
app.use('/', healthRoutes);

// =============================================================================
// Error Handling (must be registered after all routes)
// =============================================================================

/**
 * Centralized error-handling middleware.
 * Catches unhandled errors, logs via Winston, and returns structured JSON.
 * Must be the last middleware registered (Express requirement for 4-arg handlers).
 */
app.use(errorHandler);

module.exports = app;
