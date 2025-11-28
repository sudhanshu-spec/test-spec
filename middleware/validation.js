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
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Maximum allowed length for string inputs
 * @type {number}
 */
const MAX_STRING_LENGTH = 1000;

/**
 * Maximum allowed length for short strings (names, IDs)
 * @type {number}
 */
const MAX_SHORT_STRING_LENGTH = 100;

/**
 * Sanitizes error messages for production environment
 * Removes field-specific details that could expose internal structure
 * 
 * @param {Object} error - Validation error object
 * @returns {Object} Sanitized error object
 */
function sanitizeValidationError(error) {
  if (isProduction) {
    return {
      field: error.path || error.param,
      message: 'Invalid input value',
    };
  }
  
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const sanitizedErrors = errors.array().map(sanitizeValidationError);
    
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Validation failed. Please check your input.',
        errors: sanitizedErrors,
      },
    });
  }
  
  next();
}

/**
 * Generic query parameter sanitizer
 * Trims whitespace, escapes HTML entities, and validates length limits
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
 * Validates format (alphanumeric) and escapes special characters
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
 * Request body validation example
 * Checks for required fields, validates data types, and applies size limits
 * 
 * This is a generic example that can be customized for specific endpoints
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
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {string} [options.location='body'] - Location of the field (body, query, param)
 * @returns {Array} Array of validation chain middlewares
 */
function validateNumeric(fieldName, options = {}) {
  const { min, max, location = 'body' } = options;
  
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
  
  if (typeof min === 'number') {
    validator = validator
      .isInt({ min })
      .withMessage(`Field '${fieldName}' must be at least ${min}`);
  }
  
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
 * @param {string} fieldName - Name of the field to validate
 * @param {string} [location='body'] - Location of the field (body, query, param)
 * @returns {Array} Array of validation chain middlewares
 */
function validateBoolean(fieldName, location = 'body') {
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
 * @param {string} fieldName - Name of the URL field
 * @param {Object} options - Validation options
 * @param {boolean} [options.required=true] - Whether the field is required
 * @param {Array<string>} [options.protocols=['http', 'https']] - Allowed protocols
 * @returns {Array} Array of validation chain middlewares
 */
function validateUrl(fieldName, options = {}) {
  const { required = true, protocols = ['http', 'https'] } = options;
  
  let validator = body(fieldName);
  
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
  // Core exports per file schema
  handleValidationErrors,
  sanitizeQuery,
  sanitizeParams,
  validateRequestBody,
  
  // Additional utility validators
  validateEmail,
  validateNumeric,
  validateBoolean,
  validateStringLength,
  validateUrl,
  
  // Re-export express-validator functions for convenience
  body,
  query,
  param,
  validationResult,
};
