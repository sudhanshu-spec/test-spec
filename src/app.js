/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Middleware Stack:
 * - Body parsing (JSON and URL-encoded)
 * - Application routes
 * - 404 Not Found handler
 * - Global error handler
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 */

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

// ---------------------------------------------------------------------------
// Body Parsing Middleware
// ---------------------------------------------------------------------------

/**
 * Parse JSON request bodies.
 * Enables handling of application/json content type in request bodies.
 */
app.use(express.json());

/**
 * Parse URL-encoded request bodies.
 * Enables handling of application/x-www-form-urlencoded content type.
 * extended: true allows for rich objects and arrays to be encoded.
 */
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Application Routes
// ---------------------------------------------------------------------------

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// Error Handling Middleware
// ---------------------------------------------------------------------------

/**
 * 404 Not Found Handler
 * 
 * Catches all requests that don't match any defined route.
 * Must be placed AFTER all route definitions.
 * Returns a consistent JSON error response format.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    statusCode: 404
  });
});

/**
 * Global Error Handler
 * 
 * Centralizes error handling for consistent error responses across the application.
 * Must be the LAST middleware registered (4-parameter function signature).
 * 
 * In development: Includes error stack trace for debugging
 * In production: Hides stack trace to prevent information leakage
 * 
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
app.use((err, req, res, next) => {
  // Log error details for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Determine appropriate status code
  const statusCode = err.status || err.statusCode || 500;

  // Build response object
  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error',
    statusCode: statusCode
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

module.exports = app;
