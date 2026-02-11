/**
 * @fileoverview Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a comprehensive middleware pipeline including security headers (Helmet),
 * CORS support, response compression, body parsing, HTTP request logging
 * (Morgan via Winston), health check routing, and centralized error handling.
 *
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Middleware pipeline execution order:
 *   1. helmet()           — Security headers (must be FIRST)
 *   2. cors()             — CORS headers
 *   3. compression()      — Response compression
 *   4. express.json()     — Parse JSON request bodies
 *   5. express.urlencoded — Parse URL-encoded request bodies
 *   6. requestLogger      — HTTP request logging (Morgan → Winston)
 *   7. /health routes     — Health check endpoint
 *   8. / routes           — Main application routes
 *   9. notFound           — 404 catch-all handler
 *  10. errorHandler       — Centralized error handler (must be LAST)
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { errorHandler, notFound, requestLogger } = require('./middleware');
const { mainRoutes, healthRoutes } = require('./routes');

// =============================================================================
// Application Factory
// =============================================================================

const app = express();

// =============================================================================
// Security Middleware (must be FIRST)
// =============================================================================

/** Security HTTP headers — sets Content-Security-Policy, X-Frame-Options, etc. */
app.use(helmet());

/** Cross-Origin Resource Sharing — enables cross-origin requests */
app.use(cors());

/** Response compression — gzip/deflate encoding for reduced payload sizes */
app.use(compression());

// =============================================================================
// Body Parsing Middleware
// =============================================================================

/** Parse JSON request bodies */
app.use(express.json());

/** Parse URL-encoded request bodies */
app.use(express.urlencoded({ extended: false }));

// =============================================================================
// Request Logging Middleware
// =============================================================================

/** HTTP request logging via Morgan streaming to Winston at 'http' level */
app.use(requestLogger);

// =============================================================================
// Route Mounting
// =============================================================================

/**
 * Health check endpoint — mounted before main routes for monitoring tools
 * GET /health returns JSON { status: 'ok', uptime, timestamp, environment }
 */
app.use('/health', healthRoutes);

/**
 * Main application routes — preserves original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// =============================================================================
// Error Handling Middleware (must be LAST)
// =============================================================================

/** 404 catch-all for unmatched routes — must be after all route handlers */
app.use(notFound);

/** Centralized error handler — must be the very last middleware */
app.use(errorHandler);

// =============================================================================
// Module Export
// =============================================================================

module.exports = app;
