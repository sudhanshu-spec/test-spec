/**
 * Input Validation Middleware Module
 * 
 * Provides reusable validation chains for route protection using
 * express-validator library. Exports validation functions for
 * sanitizing and validating user-supplied data including query
 * parameters, route parameters, and request bodies.
 * 
 * Also exports a validation result handler middleware that checks
 * validation results and returns 400 errors with validation details.
 * 
 * Imported by server.js to apply input validation before route handlers.
 * 
 * @module middleware/validation
 */

'use strict';

const { body, query, param, validationResult } = require('express-validator');

/**
 * Determines if the application is running in production mode
 * Used to control the level of detail in error responses
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Maximum allowed length for string inputs
 * Used to prevent oversized input attacks
 * @type {number}
 */
const MAX_STRING_LENGTH = 1000;

/**
 * Maximum allowed length for short strings (names, IDs)
 * Used for route parameters and identifiers
 * @type {number}
 */
const MAX_SHORT_STRING_LENGTH = 100;

/**
 * Sanitizes error messages for production environment
 * Removes field-specific details that could expose internal structure
 * and prevent information disclosure
 * 
 * @param {Object} error - Validation error object from express-validator
 * @returns {Object} Sanitized error object safe for client response
 */
function sanitizeValidationError(error) {
  if (isProduction) {
    // In production, return minimal error information to prevent
    // information disclosure about internal field structure
    return {
      field: error.path || error.param,
      message: 'Invalid input value',
    };
  }
  
  // In development, return full error details for debugging
  return {
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location,
  };
}

/**
 * Middleware that checks validation results and returns 400 error
 * if validation errors exist. Otherwise, calls next() to proceed.
 * 
 * This should be placed after validation chains in the middleware stack.
 * 
 * @example
 * app.post('/api/user',
 *   validateRequestBody(['name', 'email']),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Sanitize all errors to prevent information disclosure
    const sanitizedErrors = errors.array().map(sanitizeValidationError);
    
    // Return 400 Bad Request with validation error details
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Validation failed. Please check your input.',
        errors: sanitizedErrors,
      },
    });
  }
  
  // No validation errors, proceed to next middleware/handler
  next();
}

/**
 * Generic query parameter sanitizer
 * Trims whitespace, escapes HTML entities, and validates length limits
 * 
 * Use this to sanitize any query parameter before processing.
 * Helps prevent XSS attacks and injection through query strings.
 * 
 * @example
 * app.get('/search',
 *   sanitizeQuery('q'),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the query parameter to sanitize
 * @returns {Array} Array of validation chain middlewares
 */
function sanitizeQuery(fieldName) {
  return [
    query(fieldName)
      .optional()
      .trim()
      .escape()
      .isLength({ max: MAX_STRING_LENGTH })
      .withMessage(`Query parameter '${fieldName}' exceeds maximum length of ${MAX_STRING_LENGTH} characters`),
  ];
}

/**
 * Route parameter sanitizer
 * Validates format (alphanumeric with hyphens and underscores) and escapes special characters
 * 
 * Use this to sanitize route parameters like IDs or slugs.
 * Helps prevent path traversal and injection attacks.
 * 
 * @example
 * app.get('/users/:id',
 *   sanitizeParams('id'),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} paramName - Name of the route parameter to sanitize
 * @returns {Array} Array of validation chain middlewares
 */
function sanitizeParams(paramName) {
  return [
    param(paramName)
      .trim()
      .escape()
      .isLength({ min: 1, max: MAX_SHORT_STRING_LENGTH })
      .withMessage(`Parameter '${paramName}' must be between 1 and ${MAX_SHORT_STRING_LENGTH} characters`)
      .matches(/^[\w-]+$/)
      .withMessage(`Parameter '${paramName}' contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed`),
  ];
}

/**
 * Request body validation for required fields
 * Checks for required fields, validates data types, and applies size limits
 * 
 * This is a generic validator that can be customized for specific endpoints
 * by passing an array of required field names.
 * 
 * @example
 * app.post('/api/resource',
 *   validateRequestBody(['name', 'description']),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Array} Array of validation chain middlewares
 */
function validateRequestBody(requiredFields = []) {
  const validations = [];
  
  // Add validation for each required field
  requiredFields.forEach(fieldName => {
    validations.push(
      body(fieldName)
        .exists({ checkFalsy: true })
        .withMessage(`Field '${fieldName}' is required`)
        .trim()
        .escape()
        .isLength({ min: 1, max: MAX_STRING_LENGTH })
        .withMessage(`Field '${fieldName}' must be between 1 and ${MAX_STRING_LENGTH} characters`)
    );
  });
  
  return validations;
}

/**
 * Email validation chain
 * Validates email format and normalizes the email address
 * 
 * Use this for validating email fields in request bodies.
 * Normalizes emails to lowercase and removes dots from gmail addresses.
 * 
 * @example
 * app.post('/api/subscribe',
 *   validateEmail('email'),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the email field (default: 'email')
 * @returns {Array} Array of validation chain middlewares
 */
function validateEmail(fieldName = 'email') {
  return [
    body(fieldName)
      .exists({ checkFalsy: true })
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Invalid email address format')
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('Email address is too long'),
  ];
}

/**
 * Numeric parameter validation
 * Validates that a parameter is a valid integer within specified range
 * 
 * Use this for validating numeric fields like IDs, quantities, page numbers.
 * Supports validation in body, query, or route params.
 * 
 * @example
 * app.get('/items',
 *   validateNumeric('page', { min: 1, max: 1000, location: 'query' }),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {string} [options.location='body'] - Location of the field (body, query, param)
 * @returns {Array} Array of validation chain middlewares
 */
function validateNumeric(fieldName, options = {}) {
  const { min, max, location = 'body' } = options;
  
  // Select the appropriate validator based on location
  let validator;
  switch (location) {
    case 'query':
      validator = query(fieldName);
      break;
    case 'param':
      validator = param(fieldName);
      break;
    default:
      validator = body(fieldName);
  }
  
  validator = validator
    .exists({ checkFalsy: false })
    .withMessage(`Field '${fieldName}' is required`)
    .isInt()
    .withMessage(`Field '${fieldName}' must be an integer`)
    .toInt();
  
  // Apply minimum constraint if specified
  if (typeof min === 'number') {
    validator = validator
      .isInt({ min })
      .withMessage(`Field '${fieldName}' must be at least ${min}`);
  }
  
  // Apply maximum constraint if specified
  if (typeof max === 'number') {
    validator = validator
      .isInt({ max })
      .withMessage(`Field '${fieldName}' must be at most ${max}`);
  }
  
  return [validator];
}

/**
 * Boolean parameter validation
 * Validates that a parameter is a valid boolean value
 * 
 * Use this for validating boolean flags or toggle fields.
 * Accepts true/false strings and converts them to actual boolean values.
 * 
 * @example
 * app.get('/items',
 *   validateBoolean('active', 'query'),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the field to validate
 * @param {string} [location='body'] - Location of the field (body, query, param)
 * @returns {Array} Array of validation chain middlewares
 */
function validateBoolean(fieldName, location = 'body') {
  // Select the appropriate validator based on location
  let validator;
  switch (location) {
    case 'query':
      validator = query(fieldName);
      break;
    case 'param':
      validator = param(fieldName);
      break;
    default:
      validator = body(fieldName);
  }
  
  return [
    validator
      .optional()
      .isBoolean()
      .withMessage(`Field '${fieldName}' must be a boolean value`)
      .toBoolean(),
  ];
}

/**
 * String length validation
 * Validates that a string field is within specified length bounds
 * 
 * Use this for validating text fields with specific length requirements.
 * Includes automatic trimming and HTML escape for security.
 * 
 * @example
 * app.post('/api/comment',
 *   validateStringLength('content', { min: 1, max: 500 }),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 * @param {number} [options.min=0] - Minimum allowed length
 * @param {number} [options.max=MAX_STRING_LENGTH] - Maximum allowed length
 * @param {string} [options.location='body'] - Location of the field (body, query, param)
 * @param {boolean} [options.required=true] - Whether the field is required
 * @returns {Array} Array of validation chain middlewares
 */
function validateStringLength(fieldName, options = {}) {
  const { 
    min = 0, 
    max = MAX_STRING_LENGTH, 
    location = 'body',
    required = true 
  } = options;
  
  // Select the appropriate validator based on location
  let validator;
  switch (location) {
    case 'query':
      validator = query(fieldName);
      break;
    case 'param':
      validator = param(fieldName);
      break;
    default:
      validator = body(fieldName);
  }
  
  // Apply required or optional based on settings
  if (!required) {
    validator = validator.optional();
  } else {
    validator = validator
      .exists({ checkFalsy: true })
      .withMessage(`Field '${fieldName}' is required`);
  }
  
  return [
    validator
      .trim()
      .escape()
      .isLength({ min, max })
      .withMessage(`Field '${fieldName}' must be between ${min} and ${max} characters`),
  ];
}

/**
 * URL validation
 * Validates that a field contains a valid URL
 * 
 * Use this for validating URL fields like website addresses or callback URLs.
 * Restricts to specified protocols (http/https by default) for security.
 * 
 * @example
 * app.post('/api/webhook',
 *   validateUrl('callbackUrl', { protocols: ['https'] }),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the URL field
 * @param {Object} options - Validation options
 * @param {boolean} [options.required=true] - Whether the field is required
 * @param {Array<string>} [options.protocols=['http', 'https']] - Allowed protocols
 * @returns {Array} Array of validation chain middlewares
 */
function validateUrl(fieldName, options = {}) {
  const { required = true, protocols = ['http', 'https'] } = options;
  
  let validator = body(fieldName);
  
  // Apply required or optional based on settings
  if (!required) {
    validator = validator.optional();
  } else {
    validator = validator
      .exists({ checkFalsy: true })
      .withMessage(`Field '${fieldName}' is required`);
  }
  
  return [
    validator
      .isURL({ protocols, require_protocol: true })
      .withMessage(`Field '${fieldName}' must be a valid URL with ${protocols.join(' or ')} protocol`)
      .isLength({ max: 2048 })
      .withMessage(`Field '${fieldName}' URL is too long (max 2048 characters)`),
  ];
}

/**
 * UUID validation
 * Validates that a field contains a valid UUID (any version)
 * 
 * Use this for validating UUID identifiers in requests.
 * 
 * @example
 * app.get('/api/resource/:id',
 *   validateUUID('id', 'param'),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the UUID field
 * @param {string} [location='body'] - Location of the field (body, query, param)
 * @returns {Array} Array of validation chain middlewares
 */
function validateUUID(fieldName, location = 'body') {
  // Select the appropriate validator based on location
  let validator;
  switch (location) {
    case 'query':
      validator = query(fieldName);
      break;
    case 'param':
      validator = param(fieldName);
      break;
    default:
      validator = body(fieldName);
  }
  
  return [
    validator
      .exists({ checkFalsy: true })
      .withMessage(`Field '${fieldName}' is required`)
      .isUUID()
      .withMessage(`Field '${fieldName}' must be a valid UUID`),
  ];
}

/**
 * Date validation
 * Validates that a field contains a valid ISO 8601 date string
 * 
 * Use this for validating date fields in requests.
 * Optionally converts the string to a JavaScript Date object.
 * 
 * @example
 * app.post('/api/event',
 *   validateDate('startDate'),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the date field
 * @param {Object} options - Validation options
 * @param {boolean} [options.required=true] - Whether the field is required
 * @param {string} [options.location='body'] - Location of the field (body, query, param)
 * @returns {Array} Array of validation chain middlewares
 */
function validateDate(fieldName, options = {}) {
  const { required = true, location = 'body' } = options;
  
  // Select the appropriate validator based on location
  let validator;
  switch (location) {
    case 'query':
      validator = query(fieldName);
      break;
    case 'param':
      validator = param(fieldName);
      break;
    default:
      validator = body(fieldName);
  }
  
  // Apply required or optional based on settings
  if (!required) {
    validator = validator.optional();
  } else {
    validator = validator
      .exists({ checkFalsy: true })
      .withMessage(`Field '${fieldName}' is required`);
  }
  
  return [
    validator
      .isISO8601()
      .withMessage(`Field '${fieldName}' must be a valid ISO 8601 date`)
      .toDate(),
  ];
}

/**
 * Array validation
 * Validates that a field is an array with optional length constraints
 * 
 * Use this for validating array fields in request bodies.
 * Can enforce minimum and maximum number of elements.
 * 
 * @example
 * app.post('/api/tags',
 *   validateArray('tags', { min: 1, max: 10 }),
 *   handleValidationErrors,
 *   (req, res) => { // handler }
 * );
 * 
 * @param {string} fieldName - Name of the array field
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum number of elements
 * @param {number} [options.max] - Maximum number of elements
 * @param {boolean} [options.required=true] - Whether the field is required
 * @returns {Array} Array of validation chain middlewares
 */
function validateArray(fieldName, options = {}) {
  const { min, max, required = true } = options;
  
  let validator = body(fieldName);
  
  // Apply required or optional based on settings
  if (!required) {
    validator = validator.optional();
  } else {
    validator = validator
      .exists()
      .withMessage(`Field '${fieldName}' is required`);
  }
  
  validator = validator
    .isArray()
    .withMessage(`Field '${fieldName}' must be an array`);
  
  // Apply minimum constraint if specified
  if (typeof min === 'number') {
    validator = validator
      .isArray({ min })
      .withMessage(`Field '${fieldName}' must have at least ${min} elements`);
  }
  
  // Apply maximum constraint if specified
  if (typeof max === 'number') {
    validator = validator
      .isArray({ max })
      .withMessage(`Field '${fieldName}' must have at most ${max} elements`);
  }
  
  return [validator];
}

/**
 * Export all validation functions as CommonJS module
 * 
 * Usage in server.js:
 * const { handleValidationErrors, sanitizeQuery, sanitizeParams, validateRequestBody } = require('./middleware/validation');
 * 
 * // Apply validation to a route
 * app.post('/api/resource', 
 *   validateRequestBody(['name', 'description']),
 *   handleValidationErrors,
 *   (req, res) => { ... }
 * );
 */
module.exports = {
  // Core exports per file schema requirements
  handleValidationErrors,
  sanitizeQuery,
  sanitizeParams,
  validateRequestBody,
  
  // Additional utility validators for common patterns
  validateEmail,
  validateNumeric,
  validateBoolean,
  validateStringLength,
  validateUrl,
  validateUUID,
  validateDate,
  validateArray,
  
  // Re-export express-validator functions for convenience
  // Allows consumers to build custom validation chains if needed
  body,
  query,
  param,
  validationResult,
};
