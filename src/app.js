/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Middleware Registration Order:
 * 1. Security headers (Helmet) - FIRST to set headers before any response
 * 2. JSON body parsing - Built-in Express middleware
 * 3. HTTP logging (Morgan) - Log all incoming requests
 * 4. Application routes - Handle business logic
 * 5. 404 Not Found handler - Catch unmatched routes
 * 6. Error handler - LAST to catch all errors
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 */

'use strict';

const express = require('express');
const { mainRoutes, healthRoutes } = require('./routes');
const middleware = require('./middleware');

const app = express();

// =============================================================================
// Early Middleware (Before Routes)
// =============================================================================

/**
 * Security headers middleware (Helmet)
 * Must be first to set security headers before any response
 */
app.use(middleware.securityMiddleware);

/**
 * JSON body parser
 * Parses incoming requests with JSON payloads
 */
app.use(express.json());

/**
 * HTTP request logging middleware (Morgan)
 * Logs all incoming requests for monitoring and debugging
 */
app.use(middleware.morganMiddleware);

// =============================================================================
// Application Routes
// =============================================================================

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check routes
 * Provides system status for PM2 and load balancer monitoring
 * - GET '/health' -> returns status, timestamp, uptime
 */
app.use('/health', healthRoutes);

// =============================================================================
// Error Handling Middleware (After Routes)
// =============================================================================

/**
 * 404 Not Found handler
 * Catches requests that don't match any route
 */
app.use(middleware.notFoundHandler);

/**
 * Generic error handler
 * Must be last middleware to catch all errors
 */
app.use(middleware.errorHandler);

module.exports = app;
