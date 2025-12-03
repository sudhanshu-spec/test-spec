/**
 * @fileoverview Input validation middleware module using express-validator.
 * Provides reusable validation schemas, request validation middleware, and
 * input sanitization utilities for Express.js route handlers. Implements
 * OWASP-compliant input validation to prevent injection attacks and ensure
 * data integrity across all API endpoints.
 * 
 * @module middleware/validation
 * @requires express-validator
 * @description Middleware module for request validation and input sanitization
 * following OWASP input validation guidelines. Validates and sanitizes request
 * parameters, query strings, and body content to prevent XSS, SQL injection,
 * and other injection-based attacks.
 * 
 * @author Blitzy Security Enhancement
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * // Using validation middleware in routes
 * const { validateRequest, validationSchemas } = require('./middleware/validation');
 * 
 * app.get('/user/:id', 
 *   validateRequest([validationSchemas.string('id', 'param')]),
 *   (req, res) => { ... }
 * );
 * 
 * // Using sanitizeInput utility
 * const { sanitizeInput } = require('./middleware/validation');
 * const cleanInput = sanitizeInput(userInput);
 */

'use strict';

// Express-validator components for building validation chains
const { body, query, param, validationResult } = require('express-validator');

/**
 * HTML entity mapping for manual sanitization.
 * Maps special characters to their HTML entity equivalents to prevent XSS.
 * @private
 * @type {Object<string, string>}
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Sanitizes input by trimming whitespace and escaping HTML entities.
 * This utility function provides a synchronous way to sanitize string inputs
 * outside of the express-validator middleware chain.
 * 
 * @function sanitizeInput
 * @param {string|null|undefined} value - The input value to sanitize
 * @returns {string} Sanitized string with trimmed whitespace and escaped HTML entities
 * 
 * @example
 * const { sanitizeInput } = require('./middleware/validation');
 * 
 * const cleanName = sanitizeInput('  <script>alert("xss")</script>  ');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * 
 * const emptyResult = sanitizeInput(null);
 * // Returns: ''
 */
const sanitizeInput = (value) => {
  // Handle null, undefined, or non-string values
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string if not already
  const stringValue = String(value);

  // Trim leading and trailing whitespace
  const trimmedValue = stringValue.trim();

  // Escape HTML entities to prevent XSS attacks
  const escapedValue = trimmedValue.replace(/[&<>"'`=\/]/g, (char) => {
    return HTML_ENTITIES[char] || char;
  });

  return escapedValue;
};

/**
 * Gets the appropriate validator factory based on the location type.
 * Maps location strings to express-validator factory functions.
 * 
 * @private
 * @param {string} location - The request location ('body', 'query', 'param')
 * @returns {Function} The corresponding express-validator factory function
 * @throws {Error} If an invalid location is provided
 */
const getValidatorFactory = (location) => {
  const factories = {
    body: body,
    query: query,
    param: param
  };

  const factory = factories[location];
  if (!factory) {
    throw new Error(`Invalid validation location: ${location}. Must be 'body', 'query', or 'param'.`);
  }

  return factory;
};

/**
 * Validation schemas object containing reusable validation chain factories.
 * Each property is a function that creates validation chains for common
 * validation patterns following OWASP input validation guidelines.
 * 
 * @namespace validationSchemas
 * @property {Function} string - Creates a required string validator with sanitization
 * @property {Function} optionalString - Creates an optional string validator with sanitization
 * @property {Function} queryParam - Creates a query parameter validator with sanitization
 * @property {Function} sanitizeString - Creates a sanitization-only validator (no validation)
 * 
 * @example
 * const { validationSchemas } = require('./middleware/validation');
 * 
 * // Create validation for required string parameter
 * const nameValidator = validationSchemas.string('name', 'body');
 * 
 * // Create validation for optional query parameter
 * const filterValidator = validationSchemas.optionalString('filter', 'query');
 */
const validationSchemas = {
  /**
   * Creates a validation chain for required string fields.
   * Validates that the field exists, is a non-empty string, trims whitespace,
   * and escapes HTML entities to prevent XSS attacks.
   * 
   * @function string
   * @memberof validationSchemas
   * @param {string} fieldName - The name of the field to validate
   * @param {string} [location='body'] - Request location: 'body', 'query', or 'param'
   * @param {Object} [options={}] - Additional validation options
   * @param {number} [options.minLength=1] - Minimum string length
   * @param {number} [options.maxLength=1000] - Maximum string length
   * @param {string} [options.message] - Custom error message
   * @returns {import('express-validator').ValidationChain} Express-validator validation chain
   * 
   * @example
   * // Validate required username in body
   * validationSchemas.string('username', 'body', { minLength: 3, maxLength: 50 })
   */
  string: (fieldName, location = 'body', options = {}) => {
    const {
      minLength = 1,
      maxLength = 1000,
      message = `${fieldName} must be a non-empty string`
    } = options;

    const factory = getValidatorFactory(location);

    return factory(fieldName)
      .exists({ checkFalsy: true })
      .withMessage(message)
      .isString()
      .withMessage(`${fieldName} must be a string`)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`)
      .escape();
  },

  /**
   * Creates a validation chain for optional string fields.
   * If the field is present, validates it as a string, trims whitespace,
   * and escapes HTML entities. If absent, validation passes.
   * 
   * @function optionalString
   * @memberof validationSchemas
   * @param {string} fieldName - The name of the field to validate
   * @param {string} [location='body'] - Request location: 'body', 'query', or 'param'
   * @param {Object} [options={}] - Additional validation options
   * @param {number} [options.maxLength=1000] - Maximum string length
   * @returns {import('express-validator').ValidationChain} Express-validator validation chain
   * 
   * @example
   * // Validate optional description in body
   * validationSchemas.optionalString('description', 'body', { maxLength: 500 })
   */
  optionalString: (fieldName, location = 'body', options = {}) => {
    const { maxLength = 1000 } = options;

    const factory = getValidatorFactory(location);

    return factory(fieldName)
      .optional({ nullable: true, checkFalsy: false })
      .isString()
      .withMessage(`${fieldName} must be a string if provided`)
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${fieldName} must not exceed ${maxLength} characters`)
      .escape();
  },

  /**
   * Creates a validation chain specifically for query string parameters.
   * Provides sensible defaults for query parameter validation including
   * string type checking, trimming, length limits, and HTML escaping.
   * 
   * @function queryParam
   * @memberof validationSchemas
   * @param {string} fieldName - The name of the query parameter to validate
   * @param {Object} [options={}] - Additional validation options
   * @param {boolean} [options.required=false] - Whether the parameter is required
   * @param {number} [options.maxLength=200] - Maximum parameter length
   * @returns {import('express-validator').ValidationChain} Express-validator validation chain
   * 
   * @example
   * // Validate optional query parameter 'search'
   * validationSchemas.queryParam('search', { required: false, maxLength: 100 })
   * 
   * // Validate required query parameter 'type'
   * validationSchemas.queryParam('type', { required: true })
   */
  queryParam: (fieldName, options = {}) => {
    const { required = false, maxLength = 200 } = options;

    let chain = query(fieldName);

    if (required) {
      chain = chain
        .exists({ checkFalsy: true })
        .withMessage(`Query parameter '${fieldName}' is required`);
    } else {
      chain = chain.optional({ nullable: true, checkFalsy: false });
    }

    return chain
      .isString()
      .withMessage(`Query parameter '${fieldName}' must be a string`)
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`Query parameter '${fieldName}' must not exceed ${maxLength} characters`)
      .escape();
  },

  /**
   * Creates a sanitization-only chain without validation requirements.
   * Useful when you only need to sanitize input without enforcing
   * presence or format requirements.
   * 
   * @function sanitizeString
   * @memberof validationSchemas
   * @param {string} fieldName - The name of the field to sanitize
   * @param {string} [location='body'] - Request location: 'body', 'query', or 'param'
   * @returns {import('express-validator').ValidationChain} Express-validator sanitization chain
   * 
   * @example
   * // Sanitize comment field without validation
   * validationSchemas.sanitizeString('comment', 'body')
   */
  sanitizeString: (fieldName, location = 'body') => {
    const factory = getValidatorFactory(location);

    return factory(fieldName)
      .optional({ nullable: true, checkFalsy: false })
      .trim()
      .escape();
  }
};

/**
 * Formats validation errors into a consistent API response structure.
 * Groups errors by field and provides detailed error information.
 * 
 * @private
 * @param {import('express-validator').Result} errors - Validation result from validationResult()
 * @returns {Object} Formatted error response object
 */
const formatValidationErrors = (errors) => {
  const errorArray = errors.array();
  const groupedErrors = {};

  // Group errors by field path for better organization
  errorArray.forEach((error) => {
    const field = error.path || error.param || 'unknown';
    if (!groupedErrors[field]) {
      groupedErrors[field] = [];
    }
    groupedErrors[field].push({
      message: error.msg,
      value: error.value !== undefined ? '[REDACTED]' : undefined,
      location: error.location
    });
  });

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: groupedErrors
    }
  };
};

/**
 * Creates a validation middleware that runs the provided validation chains
 * and handles validation errors with a standardized response format.
 * 
 * @function validateRequest
 * @param {Array<import('express-validator').ValidationChain>} validations - Array of validation chains to run
 * @returns {Function} Express middleware function
 * 
 * @description
 * This middleware factory accepts an array of express-validator validation chains,
 * runs them against the request, and if any validation fails, returns a 400 Bad Request
 * response with detailed error information. If all validations pass, the request
 * proceeds to the next middleware or route handler.
 * 
 * @example
 * const { validateRequest, validationSchemas } = require('./middleware/validation');
 * 
 * // Apply validation to a route
 * app.post('/users',
 *   validateRequest([
 *     validationSchemas.string('username', 'body', { minLength: 3, maxLength: 30 }),
 *     validationSchemas.string('email', 'body'),
 *     validationSchemas.optionalString('bio', 'body', { maxLength: 500 })
 *   ]),
 *   (req, res) => {
 *     // Validated and sanitized data is available in req.body
 *     res.json({ success: true, data: req.body });
 *   }
 * );
 */
const validateRequest = (validations) => {
  // Validate input parameter
  if (!Array.isArray(validations)) {
    throw new Error('validateRequest requires an array of validation chains');
  }

  return async (req, res, next) => {
    try {
      // Run all validations in parallel for better performance
      await Promise.all(validations.map((validation) => validation.run(req)));

      // Check for validation errors
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // Return 400 Bad Request with formatted validation errors
        const formattedErrors = formatValidationErrors(errors);
        return res.status(400).json(formattedErrors);
      }

      // All validations passed, proceed to next middleware
      return next();
    } catch (error) {
      // Handle unexpected errors during validation
      console.error('Validation middleware error:', error.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during request validation'
        }
      });
    }
  };
};

/**
 * Factory function that creates pre-configured validation middleware arrays
 * for common use cases. Returns an array of middleware functions that can
 * be spread into route definitions.
 * 
 * @function validationMiddleware
 * @param {string} [type='default'] - The type of validation middleware to create
 * @param {Object} [options={}] - Configuration options for the middleware
 * @returns {Array<Function>} Array of Express middleware functions
 * 
 * @description
 * This factory creates ready-to-use validation middleware configurations
 * for common scenarios. It simplifies route setup by providing pre-built
 * validation chains that can be customized through options.
 * 
 * Supported types:
 * - 'default': Basic sanitization for all query parameters
 * - 'greeting': Validation for greeting API endpoints
 * - 'paramId': Validation for route parameters like :id
 * - 'custom': Returns validateRequest with custom validations array
 * 
 * @example
 * const { validationMiddleware } = require('./middleware/validation');
 * 
 * // Use default validation for a route
 * app.get('/api/data', ...validationMiddleware('default'), handler);
 * 
 * // Use greeting validation (sanitizes greeting parameter)
 * app.get('/greet', ...validationMiddleware('greeting'), handler);
 * 
 * // Use custom validation
 * app.post('/submit', ...validationMiddleware('custom', {
 *   validations: [
 *     validationSchemas.string('name', 'body'),
 *     validationSchemas.optionalString('comment', 'body')
 *   ]
 * }), handler);
 */
const validationMiddleware = (type = 'default', options = {}) => {
  switch (type) {
    case 'default':
      // Basic middleware that sanitizes common injection vectors in query params
      return [
        validateRequest([
          query('*')
            .optional()
            .trim()
            .escape()
        ])
      ];

    case 'greeting':
      // Validation for greeting API endpoints
      // Sanitizes any query parameters that might be passed to greeting endpoints
      return [
        validateRequest([
          validationSchemas.queryParam('name', { required: false, maxLength: 100 }),
          validationSchemas.queryParam('format', { required: false, maxLength: 20 })
        ])
      ];

    case 'paramId':
      // Validation for routes with :id parameter
      return [
        validateRequest([
          param('id')
            .exists({ checkFalsy: true })
            .withMessage('ID parameter is required')
            .isString()
            .withMessage('ID must be a string')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('ID must be between 1 and 100 characters')
            .escape()
        ])
      ];

    case 'jsonBody':
      // Validation for JSON body requests
      const { fields = [] } = options;
      const validations = fields.map((field) => {
        if (field.required) {
          return validationSchemas.string(field.name, 'body', {
            minLength: field.minLength || 1,
            maxLength: field.maxLength || 1000
          });
        }
        return validationSchemas.optionalString(field.name, 'body', {
          maxLength: field.maxLength || 1000
        });
      });
      return [validateRequest(validations)];

    case 'custom':
      // Custom validation with user-provided validation chains
      const { validations = [] } = options;
      if (!Array.isArray(validations) || validations.length === 0) {
        throw new Error('Custom validation type requires a non-empty validations array in options');
      }
      return [validateRequest(validations)];

    default:
      // Fallback to basic sanitization
      return [
        validateRequest([
          query('*')
            .optional()
            .trim()
            .escape()
        ])
      ];
  }
};

/**
 * Export all validation utilities for use in route handlers.
 * 
 * @exports validationMiddleware - Factory for creating validation middleware arrays
 * @exports validateRequest - Middleware factory for custom validation chains
 * @exports sanitizeInput - Utility function for manual input sanitization
 * @exports validationSchemas - Collection of reusable validation chain factories
 */
module.exports = {
  validationMiddleware,
  validateRequest,
  sanitizeInput,
  validationSchemas
};
