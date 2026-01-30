/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Features:
 * - Body parsing middleware for JSON and URL-encoded data
 * - Main application routes
 * - 404 Not Found handler for undefined routes
 * - Global error handler for consistent error responses
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 */

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Body Parsing Middleware
 * 
 * Enables handling of JSON and form data in request bodies.
 * These must be registered before route handlers to ensure
 * req.body is properly populated.
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * 404 Not Found Handler
 * 
 * Catches requests to undefined routes and returns a consistent
 * JSON error response. This middleware must be placed AFTER all
 * route definitions but BEFORE the global error handler.
 * 
 * Response format:
 * {
 *   status: 'error',
 *   message: 'Cannot <METHOD> <path>',
 *   statusCode: 404
 * }
 */
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    statusCode: 404
  });
});

/**
 * Global Error Handler Middleware
 * 
 * Centralizes error handling for consistent API error responses.
 * This must be the LAST middleware registered (4-parameter function).
 * 
 * Features:
 * - Logs error details to console for debugging
 * - Returns JSON error response with appropriate status code
 * - Hides stack trace in production environment for security
 * 
 * Response format:
 * {
 *   status: 'error',
 *   message: '<error message>',
 *   statusCode: <status code>
 * }
 * 
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.use((err, req, res, next) => {
  // Log error details for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Determine the appropriate status code
  const statusCode = err.status || err.statusCode || 500;

  // Build the error response
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error',
    statusCode: statusCode
  };

  // In production, do NOT include stack trace for security
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

module.exports = app;
