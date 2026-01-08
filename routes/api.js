/**
 * @fileoverview API Routes Module
 * 
 * Express.js router module containing API routes extracted from server.js for
 * modular route organization. Provides a scalable routing architecture with
 * existing demo routes and foundation for future API expansion.
 * 
 * This module integrates with the validation middleware for request validation
 * and demonstrates how to apply Joi schema validation to API endpoints for
 * protection against injection attacks and malformed data.
 * 
 * Routes Provided:
 * - GET /       - Home route returning a greeting message
 * - GET /evening - Evening greeting route
 * - GET /data   - Sample validated endpoint demonstrating validation middleware
 * 
 * Usage:
 *   const apiRouter = require('./routes/api');
 *   app.use('/api', apiRouter);
 *   // Or mount at root:
 *   app.use(apiRouter);
 * 
 * Validation Example:
 *   // Routes can be protected with validation middleware:
 *   const { validate, Joi } = require('../middleware/validation');
 *   const schema = Joi.object({ name: Joi.string().required() });
 *   router.post('/users', validate(schema, 'body'), handler);
 * 
 * @module routes/api
 * @requires express
 * @requires middleware/validation
 * @version 1.0.0
 * @see {@link https://expressjs.com/en/guide/routing.html} Express Routing Guide
 */

'use strict';

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

/**
 * Express.js web application framework
 * Used to create modular router instance for organizing API routes
 * @see https://expressjs.com/
 */
const express = require('express');

// =============================================================================
// INTERNAL DEPENDENCIES
// =============================================================================

/**
 * Validation middleware module providing Joi-based request validation
 * @see module:middleware/validation
 */
const { validate, Joi, commonSchemas } = require('../middleware/validation');

// =============================================================================
// ROUTER INITIALIZATION
// =============================================================================

/**
 * Express router instance for API endpoints
 * @type {express.Router}
 */
const apiRouter = express.Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating /data endpoint query parameters
 * Demonstrates integration with validation middleware using Joi schemas
 * and the reusable commonSchemas.pagination pattern.
 * 
 * @type {Joi.ObjectSchema}
 * @example
 * // Valid query: ?page=1&limit=10&format=json
 * // Invalid query: ?page=-1&format=xml
 */
const dataQuerySchema = Joi.object({
  /**
   * Page number for pagination (1-based indexing)
   */
  page: Joi.number().integer().min(1).default(1),
  
  /**
   * Number of items per page (1-100)
   */
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  /**
   * Response format (json or text)
   */
  format: Joi.string().valid('json', 'text').default('json')
});

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * Home route handler
 * 
 * Returns a simple greeting message. This is the original home route
 * extracted from server.js for modular organization.
 * 
 * @function homeHandler
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void} Sends 'Hello, World!\n' as plain text response
 * 
 * @example
 * // Request:
 * // GET /
 * 
 * // Response:
 * // Content-Type: text/html; charset=utf-8
 * // Body: Hello, World!
 */
const homeHandler = (req, res) => {
  res.send('Hello, World!\n');
};

/**
 * Evening greeting route handler
 * 
 * Returns an evening greeting message. This is the original evening route
 * extracted from server.js for modular organization.
 * 
 * @function eveningHandler
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void} Sends 'Good evening' as plain text response
 * 
 * @example
 * // Request:
 * // GET /evening
 * 
 * // Response:
 * // Content-Type: text/html; charset=utf-8
 * // Body: Good evening
 */
const eveningHandler = (req, res) => {
  res.send('Good evening');
};

/**
 * Sample data endpoint handler with validation
 * 
 * Demonstrates how to create a validated API endpoint that integrates with
 * the validation middleware. Returns sample JSON data that can be used for
 * testing and as a template for future API endpoints.
 * 
 * This endpoint accepts query parameters for pagination and format selection,
 * showcasing the use of Joi schemas for input validation.
 * 
 * @function dataHandler
 * @param {express.Request} req - Express request object with validated query params
 * @param {express.Response} res - Express response object
 * @returns {void} Sends JSON response with sample data and metadata
 * 
 * @example
 * // Request:
 * // GET /data?page=1&limit=10&format=json
 * 
 * // Response:
 * // Content-Type: application/json
 * // {
 * //   "success": true,
 * //   "data": {
 * //     "message": "Sample API data",
 * //     "items": [...]
 * //   },
 * //   "meta": {
 * //     "page": 1,
 * //     "limit": 10,
 * //     "format": "json"
 * //   },
 * //   "timestamp": "2024-01-01T00:00:00.000Z"
 * // }
 */
const dataHandler = (req, res) => {
  // Extract validated query parameters (defaults applied by Joi)
  const { page, limit, format } = req.query;
  
  // Generate sample data items
  const items = [];
  const startIndex = (page - 1) * limit;
  const totalItems = 100; // Simulated total
  
  for (let i = 0; i < Math.min(limit, totalItems - startIndex); i++) {
    items.push({
      id: startIndex + i + 1,
      name: `Item ${startIndex + i + 1}`,
      description: `Description for item ${startIndex + i + 1}`,
      createdAt: new Date().toISOString()
    });
  }
  
  // Build response based on format
  const responseData = {
    success: true,
    data: {
      message: 'Sample API data',
      items: items
    },
    meta: {
      page: page,
      limit: limit,
      format: format,
      totalItems: totalItems,
      totalPages: Math.ceil(totalItems / limit)
    },
    timestamp: new Date().toISOString()
  };
  
  // Handle text format response
  if (format === 'text') {
    res.type('text/plain');
    const textResponse = items.map(item => `${item.id}: ${item.name}`).join('\n');
    return res.send(textResponse);
  }
  
  // Default JSON response
  res.json(responseData);
};

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

/**
 * GET / - Home route
 * 
 * Returns a simple greeting message.
 * Functionality preserved from original server.js implementation.
 * 
 * @route GET /
 * @returns {string} Hello, World!\n
 * @example
 * curl http://localhost:3000/
 * // Response: Hello, World!
 */
apiRouter.get('/', homeHandler);

/**
 * GET /evening - Evening greeting route
 * 
 * Returns an evening greeting message.
 * Functionality preserved from original server.js implementation.
 * 
 * @route GET /evening
 * @returns {string} Good evening
 * @example
 * curl http://localhost:3000/evening
 * // Response: Good evening
 */
apiRouter.get('/evening', eveningHandler);

/**
 * GET /data - Sample validated API endpoint
 * 
 * Demonstrates validation middleware integration with query parameter validation.
 * Returns sample JSON data with pagination metadata.
 * 
 * Query Parameters:
 * - page: Page number (default: 1, min: 1)
 * - limit: Items per page (default: 10, min: 1, max: 100)
 * - format: Response format - 'json' or 'text' (default: 'json')
 * 
 * @route GET /data
 * @param {number} [query.page=1] - Page number for pagination
 * @param {number} [query.limit=10] - Number of items per page
 * @param {string} [query.format='json'] - Response format (json|text)
 * @returns {Object} JSON response with sample data and metadata
 * 
 * @example
 * // Request with defaults
 * curl http://localhost:3000/data
 * 
 * // Request with custom pagination
 * curl "http://localhost:3000/data?page=2&limit=20"
 * 
 * // Request with text format
 * curl "http://localhost:3000/data?format=text"
 */
apiRouter.get('/data', validate(dataQuerySchema, 'query'), dataHandler);

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * API Router Module Exports
 * 
 * Exports the configured router instance as the default export, along with
 * individual route handlers for testing purposes.
 * 
 * @exports apiRouter - Main Express router instance (default)
 * @exports homeHandler - Handler for GET / route
 * @exports eveningHandler - Handler for GET /evening route
 * @exports dataHandler - Handler for GET /data route
 */
module.exports = apiRouter;

// Named exports for testing and direct access
module.exports.apiRouter = apiRouter;
module.exports.homeHandler = homeHandler;
module.exports.eveningHandler = eveningHandler;
module.exports.dataHandler = dataHandler;
