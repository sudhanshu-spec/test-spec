'use strict';

/**
 * @fileoverview Centralized Error Handling Middleware
 *
 * Express error-handling middleware with the standard 4-argument signature
 * (err, req, res, next). Catches all unhandled errors in the Express
 * middleware chain, logs the full error details via the Winston logger,
 * and returns a structured JSON error response.
 *
 * In production, stack traces are sanitized from responses to prevent
 * information leakage. Must be mounted as the last middleware in the
 * Express pipeline (after all routes) in src/app.js.
 *
 * @module src/middleware/error.middleware
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Centralized error-handling middleware for Express.
 *
 * Express routes errors to this middleware because it has exactly 4 parameters.
 * Logs the error via Winston and returns a structured JSON error response.
 *
 * @param {Error} err - The error object thrown or passed via next(err)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  // Log the error with structured context via Winston
  logger.error(err.message, {
    stack: err.stack,
    statusCode: statusCode,
    url: req.originalUrl,
    method: req.method
  });

  // Build the response body
  const responseBody = {
    status: 'error',
    statusCode: statusCode,
    message: err.message || 'Internal Server Error'
  };

  // Only include stack traces outside production to prevent information leakage
  if (config.env !== 'production') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
