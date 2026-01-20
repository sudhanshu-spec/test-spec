/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Features:
 * ---------
 * - JSON body parsing middleware
 * - URL-encoded body parsing middleware
 * - Route mounting at root path
 * - 404 Not Found handler for unmatched routes
 * - Global error handler with proper 4-parameter signature
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 */

'use strict';

const express = require('express');
const { mainRoutes } = require('./routes');

// ---------------------------------------------------------------------------
// Express Application Setup
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Body Parsing Middleware
// ---------------------------------------------------------------------------

/**
 * Parse JSON request bodies.
 * Enables req.body for JSON payloads with Content-Type: application/json
 */
app.use(express.json());

/**
 * Parse URL-encoded request bodies.
 * Enables req.body for form submissions with Content-Type: application/x-www-form-urlencoded
 */
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Route Mounting
// ---------------------------------------------------------------------------

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// 404 Not Found Handler
// ---------------------------------------------------------------------------

/**
 * Catch-all middleware for unmatched routes.
 * Must be placed after all route definitions to catch requests
 * that don't match any defined routes.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

/**
 * Global error handling middleware.
 * Must have 4 parameters (err, req, res, next) for Express to recognize
 * it as an error handler.
 *
 * Returns structured JSON error responses for API clients.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function (required for signature)
 */
app.use((err, req, res, next) => {
  // Log error for debugging
  console.error(`[Error] ${err.status || 500} - ${err.message}`);

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode
    }
  });
});

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

module.exports = app;
