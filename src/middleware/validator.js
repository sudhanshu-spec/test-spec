/**
 * Input Validation Middleware Module
 *
 * This module provides reusable input validation and sanitization middleware
 * using express-validator. It exports query parameter sanitization rules and
 * a validation error handler for defense-in-depth against injection attacks.
 *
 * Exports:
 * - sanitizeQuery: Array containing an async middleware that dynamically trims
 *   and escapes ALL query parameter values using express-validator chains.
 *   Sanitized values are stored in req.sanitizedQuery since Express 5's
 *   req.query is an immutable getter derived from the URL.
 * - handleValidationErrors: Express middleware that calls validationResult(req)
 *   to check for validation errors. If errors exist, returns HTTP 400 with a
 *   JSON response containing the validation error details. If no errors,
 *   calls next() to proceed to the route handler.
 *
 * Usage in route handlers:
 *   router.get('/', sanitizeQuery, handleValidationErrors, (req, res) => {
 *     // Use req.sanitizedQuery for sanitized values, or req.query for originals
 *     res.json({ data: req.sanitizedQuery });
 *   });
 *
 * When no query parameters are present, routes behave identically to before
 * validation was added (non-breaking, additive middleware).
 *
 * This provides defense-in-depth for future endpoint evolution. Even though
 * current GET-only routes serve static text responses, the sanitization
 * middleware ensures any future query parameter usage is protected against
 * XSS and injection attacks from the outset.
 *
 * @module src/middleware/validator
 */

'use strict';

const { query, validationResult, matchedData } = require('express-validator');

/**
 * Array containing an async middleware function that sanitizes all query
 * parameter values present in the incoming request. For each query parameter
 * key, an express-validator chain is created and executed via run(req) to
 * apply trim() (whitespace removal) and escape() (HTML entity encoding).
 *
 * Because Express 5 exposes req.query as an immutable getter derived from the
 * request URL, sanitized values cannot be written back to req.query directly.
 * Instead, sanitized values are collected via matchedData() and stored on
 * req.sanitizedQuery for downstream route handler consumption.
 *
 * Applied as route-level middleware before the route handler callback.
 * When no query parameters are present, this middleware passes through
 * without modification (req.sanitizedQuery will be an empty object).
 *
 * @type {Function[]}
 * @example
 * // Mount on a route:
 * router.get('/search', sanitizeQuery, handleValidationErrors, (req, res) => {
 *   const cleanQuery = req.sanitizedQuery; // { q: 'safe value' }
 *   res.json({ results: search(cleanQuery.q) });
 * });
 */
const sanitizeQuery = [
  async function sanitizeAllQueryParams(req, res, next) {
    try {
      const keys = Object.keys(req.query || {});

      // Run express-validator trim + escape chain on each query parameter
      for (const key of keys) {
        await query(key).trim().escape().run(req);
      }

      // Collect sanitized values via matchedData (express-validator v7 pattern)
      // and attach to req.sanitizedQuery for downstream use
      req.sanitizedQuery = keys.length > 0
        ? matchedData(req, { locations: ['query'], includeOptionals: true })
        : {};

      return next();
    } catch (err) {
      return next(err);
    }
  }
];

/**
 * Express middleware that checks for validation errors from express-validator
 * and returns HTTP 400 Bad Request with error details if any validation
 * rules failed. If no errors are present, calls next() to proceed to the
 * route handler.
 *
 * Response format on validation failure:
 * {
 *   "status": 400,
 *   "error": "Bad Request",
 *   "message": "Input validation failed",
 *   "errors": [ { "type": "field", "msg": "...", "path": "...", "location": "query" } ]
 * }
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Input validation failed',
      errors: errors.array()
    });
  }

  return next();
}

module.exports = {
  sanitizeQuery,
  handleValidationErrors
};
