/**
 * @fileoverview 404 Not Found Middleware
 *
 * This module provides the catch-all middleware for unmatched routes.
 * When a request does not match any defined route handler, this middleware
 * responds with a structured 404 JSON response.
 *
 * This middleware must be mounted after all application routes and before
 * the centralized error handler in the Express middleware pipeline.
 *
 * @module src/middleware/notFound
 */

'use strict';

// =============================================================================
// Not Found Middleware
// =============================================================================

/**
 * 404 catch-all middleware for unmatched routes.
 *
 * Returns a structured JSON response indicating that the requested
 * resource was not found. Includes the attempted path for debugging.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function notFound(req, res, next) {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `The requested resource '${req.originalUrl}' was not found on this server`,
    path: req.originalUrl
  });
}

// =============================================================================
// Module Export
// =============================================================================

module.exports = notFound;
