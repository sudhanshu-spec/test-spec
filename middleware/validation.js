/**
 * @fileoverview Joi-based Input Validation Middleware Factory
 * 
 * Provides reusable validation middleware for Express.js applications to protect
 * routes against injection attacks and malformed data processing. The middleware
 * factory accepts Joi schemas and returns Express middleware that validates
 * incoming requests, rejecting invalid requests with 400 Bad Request status
 * and descriptive error messages.
 * 
 * @module middleware/validation
 * @requires joi
 * @version 1.0.0
 * @see {@link https://joi.dev/} Joi Schema Validation Library
 */

'use strict';

const Joi = require('joi');

/**
 * Validation middleware factory that creates Express middleware
 * for validating request data against a Joi schema.
 * 
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @param {string} [property='body'] - The request property to validate ('body', 'query', or 'params')
 * @returns {Function} Express middleware function that validates the specified request property
 * 
 * @example
 * // Validate request body
 * const schema = Joi.object({ name: Joi.string().required() });
 * app.post('/users', validate(schema, 'body'), handler);
 * 
 * @example
 * // Validate query parameters
 * const querySchema = Joi.object({ page: Joi.number().integer().min(1) });
 * app.get('/items', validate(querySchema, 'query'), handler);
 * 
 * @example
 * // Validate route parameters
 * const paramsSchema = Joi.object({ id: Joi.string().uuid() });
 * app.get('/users/:id', validate(paramsSchema, 'params'), handler);
 */
const validate = (schema, property = 'body') => {
  // Validate that schema is a valid Joi schema
  if (!schema || typeof schema.validate !== 'function') {
    throw new Error('Invalid schema: Must be a valid Joi schema object');
  }

  // Validate that property is one of the allowed values
  const allowedProperties = ['body', 'query', 'params'];
  if (!allowedProperties.includes(property)) {
    throw new Error(`Invalid property: Must be one of ${allowedProperties.join(', ')}`);
  }

  return (req, res, next) => {
    // Get the data to validate from the specified request property
    const dataToValidate = req[property];

    // Handle case where the property is undefined or null
    // For body, this typically means no body parser middleware was used
    // For query, it should default to empty object
    // For params, Express always provides an object
    const dataForValidation = dataToValidate !== undefined && dataToValidate !== null 
      ? dataToValidate 
      : {};

    // Validate the data against the schema
    const { error, value } = schema.validate(dataForValidation, {
      abortEarly: false,      // Return all validation errors, not just the first one
      stripUnknown: true,     // Remove unknown properties from the validated data
      convert: true,          // Enable type coercion (e.g., string "123" to number 123)
      allowUnknown: false,    // Don't allow unknown keys by default
      presence: 'optional'    // By default, keys are optional unless schema specifies required()
    });

    // If validation fails, return a 400 Bad Request response with error details
    if (error) {
      // Extract user-friendly error messages from Joi validation error
      const errorMessages = error.details.map(detail => detail.message);
      const errorMessage = errorMessages.join('; ');

      // Format detailed error information for debugging
      const formattedDetails = error.details.map(detail => ({
        path: detail.path.join('.'),
        type: detail.type,
        message: detail.message,
        context: detail.context ? {
          key: detail.context.key,
          value: detail.context.value,
          label: detail.context.label
        } : undefined
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: errorMessage,
        details: formattedDetails,
        timestamp: new Date().toISOString()
      });
    }

    // Replace the request property with the validated and sanitized value
    // This ensures downstream handlers receive clean, validated data
    req[property] = value;

    // Proceed to the next middleware or route handler
    next();
  };
};

/**
 * Convenience wrapper for validating request body data.
 * Uses the validate factory with 'body' as the property.
 * 
 * @param {Joi.Schema} schema - The Joi schema to validate the request body against
 * @returns {Function} Express middleware function for body validation
 * 
 * @example
 * const userSchema = Joi.object({
 *   name: Joi.string().min(2).max(100).required(),
 *   email: Joi.string().email().required(),
 *   age: Joi.number().integer().min(0).max(150)
 * });
 * app.post('/users', validateBody(userSchema), createUser);
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Convenience wrapper for validating query parameters.
 * Uses the validate factory with 'query' as the property.
 * 
 * @param {Joi.Schema} schema - The Joi schema to validate query parameters against
 * @returns {Function} Express middleware function for query validation
 * 
 * @example
 * const paginationSchema = Joi.object({
 *   page: Joi.number().integer().min(1).default(1),
 *   limit: Joi.number().integer().min(1).max(100).default(10),
 *   sort: Joi.string().valid('asc', 'desc').default('asc')
 * });
 * app.get('/items', validateQuery(paginationSchema), listItems);
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Convenience wrapper for validating route parameters.
 * Uses the validate factory with 'params' as the property.
 * 
 * @param {Joi.Schema} schema - The Joi schema to validate route parameters against
 * @returns {Function} Express middleware function for params validation
 * 
 * @example
 * const idSchema = Joi.object({
 *   id: Joi.string().uuid().required()
 * });
 * app.get('/users/:id', validateParams(idSchema), getUser);
 * app.delete('/users/:id', validateParams(idSchema), deleteUser);
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Common validation schema patterns for reuse across the application.
 * These schemas provide standardized validation for frequently used fields.
 */
const commonSchemas = {
  /**
   * Schema for validating MongoDB ObjectId or similar ID formats
   * @type {Joi.ObjectSchema}
   */
  id: Joi.object({
    id: Joi.string()
      .pattern(/^[a-f\d]{24}$/i)
      .message('ID must be a valid 24-character hexadecimal string')
      .required()
  }),

  /**
   * Schema for validating UUID v4 identifiers
   * @type {Joi.ObjectSchema}
   */
  uuid: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required()
  }),

  /**
   * Schema for validating pagination query parameters
   * @type {Joi.ObjectSchema}
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().max(50).default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  /**
   * Schema for validating search query parameters
   * @type {Joi.ObjectSchema}
   */
  search: Joi.object({
    q: Joi.string().min(1).max(200).trim(),
    filters: Joi.string().max(500)
  }),

  /**
   * Schema for validating date range query parameters
   * @type {Joi.ObjectSchema}
   */
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  })
};

/**
 * Custom validation error class for programmatic error handling
 */
class ValidationError extends Error {
  /**
   * Creates a new ValidationError
   * @param {string} message - Error message
   * @param {Array} details - Validation error details
   */
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Utility function to validate data directly without Express middleware.
 * Useful for validating data in service layers or non-HTTP contexts.
 * 
 * @param {any} data - The data to validate
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @param {Object} [options={}] - Validation options to override defaults
 * @returns {Object} Object containing validated value or throws ValidationError
 * @throws {ValidationError} If validation fails
 * 
 * @example
 * try {
 *   const validData = validateData({ name: 'John' }, userSchema);
 *   console.log(validData); // Validated and sanitized data
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.details);
 *   }
 * }
 */
const validateData = (data, schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  };

  const { error, value } = schema.validate(data, { ...defaultOptions, ...options });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    throw new ValidationError(errorMessages, error.details);
  }

  return value;
};

/**
 * Creates a custom error handler middleware for validation errors.
 * Use this middleware after your routes to catch and format validation errors.
 * 
 * @returns {Function} Express error handling middleware
 * 
 * @example
 * // In server.js, add after all routes:
 * app.use(validationErrorHandler());
 */
const validationErrorHandler = () => {
  return (err, req, res, next) => {
    if (err instanceof ValidationError || err.isJoi) {
      return res.status(400).json({
        error: 'Validation Error',
        message: err.message,
        details: err.details || [],
        timestamp: new Date().toISOString()
      });
    }
    // Pass non-validation errors to the next error handler
    next(err);
  };
};

// Export all validation utilities
module.exports = {
  // Main validation middleware factory
  validate,
  
  // Re-export Joi for schema creation in consuming modules
  // This allows consumers to create schemas without an additional Joi import
  Joi,
  
  // Convenience wrappers for common validation targets
  validateBody,
  validateQuery,
  validateParams,
  
  // Additional utilities
  validateData,
  validationErrorHandler,
  ValidationError,
  
  // Common reusable schemas
  commonSchemas
};
