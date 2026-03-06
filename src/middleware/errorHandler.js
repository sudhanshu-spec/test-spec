/**
 * Centralized Error Handler Middleware
 *
 * This module provides a centralized Express error-handling middleware
 * that catches all errors passed via next(err) from upstream middleware
 * or route handlers. It produces structured JSON error responses and
 * suppresses stack traces in production environments.
 *
 * Express 5.x automatically forwards errors from async route handlers
 * to this middleware, eliminating the need for wrapper utilities.
 *
 * @module src/middleware/errorHandler
 */

/**
 * Express error-handling middleware
 *
 * Catches all errors passed via next(err) and returns structured JSON responses.
 * Stack traces are included only in non-production environments for debugging.
 *
 * CRITICAL: This function MUST retain all 4 parameters — Express identifies
 * error-handling middleware by its arity (parameter count). Removing `next`
 * would cause Express to treat this as regular middleware.
 *
 * @param {Error} err - The error object passed via next(err)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function (required by Express error-handling signature)
 */
const errorHandler = (err, req, res, next) => {
  // Determine HTTP status code from the error object, defaulting to 500
  const status = err.status || err.statusCode || 500;

  // Log the full error to console.error for server-side visibility and debugging
  console.error(err);

  // Build the structured JSON response body
  const body = {
    error: {
      status,
      message: err.message || 'Internal Server Error'
    }
  };

  // Include the stack trace only in non-production environments for debugging.
  // In production, stack traces are suppressed to avoid leaking server internals.
  if (process.env.NODE_ENV !== 'production') {
    body.error.stack = err.stack;
  }

  // Send the structured JSON error response
  res.status(status).json(body);
};

module.exports = errorHandler;
