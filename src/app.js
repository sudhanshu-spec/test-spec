/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * Middleware Registration Order (per Agent Action Plan Section 0.5.3):
 * 1. Security headers (Helmet) - FIRST to set headers before any response
 * 2. JSON body parsing - Built-in Express middleware
 * 3. HTTP logging (Morgan/Winston) - Log all incoming requests
 * 4. Application routes (mainRoutes, healthRoutes)
 * 5. 404 Not Found handler - Catch unmatched routes
 * 6. Error handler - LAST to catch all errors (4 parameters)
 * 
 * @module src/app
 */

const express = require('express');
const { mainRoutes, healthRoutes } = require('./routes');
const middleware = require('./middleware');

const app = express();

/**
 * ============================================================================
 * MIDDLEWARE REGISTRATION - ORDER IS CRITICAL
 * ============================================================================
 */

/**
 * 1. Security Headers (Helmet)
 * Must be first to set security headers before any response is sent.
 * Configures various HTTP headers to protect against common vulnerabilities.
 */
app.use(middleware.securityMiddleware);

/**
 * 2. JSON Body Parser
 * Built-in Express middleware for parsing JSON request bodies.
 * Required for API development and handling JSON payloads.
 */
app.use(express.json());

/**
 * 3. HTTP Request Logging (Morgan via Winston)
 * Logs all incoming HTTP requests with method, URL, status, and response time.
 * Streams logs to Winston for centralized logging infrastructure.
 */
app.use(middleware.morganMiddleware);

/**
 * ============================================================================
 * ROUTE MOUNTING
 * ============================================================================
 */

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check routes
 * Provides system health status for PM2 process manager and load balancer monitoring.
 * - GET '/health' -> Returns status, timestamp, and uptime
 */
app.use('/health', healthRoutes);

/**
 * ============================================================================
 * ERROR HANDLING MIDDLEWARE - MUST BE REGISTERED LAST
 * ============================================================================
 */

/**
 * 404 Not Found Handler
 * Catches all requests that don't match any defined routes.
 * Returns JSON error response with 404 status.
 */
app.use(middleware.notFoundHandler);

/**
 * Global Error Handler
 * Centralized error handling for all errors thrown in the application.
 * Must be registered LAST and has 4 parameters (err, req, res, next).
 * Provides environment-aware error responses:
 * - Development: Full stack trace for debugging
 * - Production: Generic message without exposing internals
 */
app.use(middleware.errorHandler);

module.exports = app;
