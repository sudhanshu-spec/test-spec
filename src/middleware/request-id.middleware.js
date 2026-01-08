/**
 * Request ID Middleware Module
 * 
 * This module provides middleware for generating and attaching unique
 * UUID v4 request identifiers to incoming HTTP requests. Enables
 * distributed tracing and request correlation across application logs.
 * 
 * The request ID is:
 * - Attached to the request object as `req.id` for downstream access
 * - Set as the `X-Request-ID` response header for client correlation
 * 
 * This middleware must be mounted BEFORE morgan (request logging) middleware
 * to ensure request IDs are available in HTTP logs per Rule R-041.
 * 
 * @module src/middleware/request-id.middleware
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware
 * 
 * Generates a unique UUID v4 identifier for each incoming request.
 * Attaches the ID to req.id and sets X-Request-ID response header.
 * 
 * UUID v4 provides 122 bits of randomness, ensuring globally unique
 * identifiers suitable for distributed tracing across services.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 * 
 * @example
 * // Mount in Express app (before morgan middleware)
 * const requestIdMiddleware = require('./middleware/request-id.middleware');
 * app.use(requestIdMiddleware);
 * 
 * @example
 * // Access request ID in route handler
 * app.get('/example', (req, res) => {
 *   console.log(`Processing request: ${req.id}`);
 *   res.json({ requestId: req.id });
 * });
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate UUID v4 using uuid package
  // Provides RFC4122 compliant unique identifier
  const requestId = uuidv4();
  
  // Attach to request object for downstream access
  // Available to all subsequent middleware and route handlers
  req.id = requestId;
  
  // Set response header for client correlation
  // Allows clients to track request/response pairs
  res.setHeader('X-Request-ID', requestId);
  
  // Continue to next middleware in the chain
  next();
};

module.exports = requestIdMiddleware;
