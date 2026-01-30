/**
 * Input Validation Middleware Module
 * 
 * This module provides request validation and sanitization capabilities using
 * express-validator@7.3.1. It implements input validation as a security layer
 * to prevent injection attacks and ensure data integrity before business logic
 * processing.
 * 
 * Security Benefits:
 * - Prevents SQL injection, NoSQL injection, and XSS attacks
 * - Sanitizes user input to remove malicious content
 * - Validates data types and formats before processing
 * - Returns consistent 400 error responses for validation failures
 * 
 * OWASP Reference: A03:2021 - Injection
 * This middleware addresses injection vulnerabilities by validating and
 * sanitizing all incoming request data.
 * 
 * @module src/middleware/validation
 * @see https://express-validator.github.io/docs/
 */

'use strict';

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Error Handler Middleware
 * 
 * Middleware function that checks for validation errors from previous
 * validation middleware in the chain. If errors exist, returns a 400
 * Bad Request response with detailed error information. If no errors,
 * passes control to the next middleware.
 * 
 * Per Section 0.12.3: Validation failures should return 400 with validation errors.
 * 
 * @function validationErrorHandler
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void|import('express').Response} Returns 400 JSON response if errors, otherwise calls next()
 * 
 * @example
 * // Response format on validation failure:
 * // HTTP 400 Bad Request
 * // {
 * //   "success": false,
 * //   "errors": [
 * //     {
 * //       "type": "field",
 * //       "value": "invalid-email",
 * //       "msg": "Invalid value",
 * //       "path": "email",
 * //       "location": "body"
 * //     }
 * //   ]
 * // }
 */
const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Validate Request Middleware Factory
 * 
 * Factory function that accepts an array of validation chains and returns
 * a middleware array that includes the validation chains followed by
 * the error handler. This enables easy creation of route-specific
 * validation middleware.
 * 
 * @function validateRequest
 * @param {Array<import('express-validator').ValidationChain>} validations - Array of express-validator validation chains
 * @returns {Array<import('express-validator').ValidationChain|Function>} Array of validation middleware followed by error handler
 * 
 * @example
 * // Usage in a route definition:
 * const { validateRequest, commonValidators } = require('./middleware/validation');
 * 
 * router.post('/users',
 *   validateRequest([
 *     commonValidators.isValidEmail('email'),
 *     commonValidators.sanitizeString('name')
 *   ]),
 *   userController.createUser
 * );
 * 
 * @example
 * // Custom validation chain:
 * const { validateRequest, body } = require('./middleware/validation');
 * 
 * router.put('/profile',
 *   validateRequest([
 *     body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
 *     body('bio').optional().isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters')
 *   ]),
 *   profileController.updateProfile
 * );
 */
const validateRequest = (validations) => {
  // Validate input is an array
  if (!Array.isArray(validations)) {
    throw new TypeError('validateRequest expects an array of validation chains');
  }
  
  return [...validations, validationErrorHandler];
};

/**
 * Common Validators Object
 * 
 * Collection of reusable validation chain factory functions for typical
 * input patterns. Each method returns an express-validator validation chain
 * that can be included in a validateRequest array.
 * 
 * Available validators:
 * - sanitizeString(field): Trims whitespace and escapes HTML characters in body fields
 * - isValidEmail(field): Validates email format and normalizes the email address
 * - isValidId(field): Validates that a URL parameter is a positive integer
 * - sanitizeQuery(field): Trims and escapes query string parameters (optional)
 * 
 * @namespace commonValidators
 * 
 * @example
 * // Using multiple common validators:
 * const { validateRequest, commonValidators } = require('./middleware/validation');
 * 
 * router.post('/contact',
 *   validateRequest([
 *     commonValidators.isValidEmail('email'),
 *     commonValidators.sanitizeString('message'),
 *     commonValidators.sanitizeString('name')
 *   ]),
 *   contactController.submitForm
 * );
 * 
 * @example
 * // Using ID validation for route parameters:
 * router.get('/users/:id',
 *   validateRequest([
 *     commonValidators.isValidId('id')
 *   ]),
 *   userController.getUser
 * );
 */
const commonValidators = {
  /**
   * Sanitize String Validator
   * 
   * Creates a validation chain that sanitizes a body field by:
   * 1. Trimming leading and trailing whitespace
   * 2. Escaping HTML special characters to prevent XSS
   * 
   * This should be used for all text input fields that will be displayed
   * or stored without further processing.
   * 
   * @function sanitizeString
   * @memberof commonValidators
   * @param {string} field - The name of the body field to sanitize
   * @returns {import('express-validator').ValidationChain} Validation chain for the specified field
   * 
   * @example
   * // Sanitize a 'name' field in request body
   * commonValidators.sanitizeString('name')
   * // Input: "  <script>alert('xss')</script>  "
   * // Output: "&lt;script&gt;alert('xss')&lt;/script&gt;"
   */
  sanitizeString: (field) => {
    return body(field)
      .trim()
      .escape()
      .withMessage(`${field} contains potentially unsafe characters`);
  },

  /**
   * Email Validator
   * 
   * Creates a validation chain that validates and normalizes an email address:
   * 1. Validates the field contains a properly formatted email address
   * 2. Normalizes the email (lowercases domain, removes dots from gmail, etc.)
   * 
   * @function isValidEmail
   * @memberof commonValidators
   * @param {string} field - The name of the body field containing the email
   * @returns {import('express-validator').ValidationChain} Validation chain for email validation
   * 
   * @example
   * // Validate an 'email' field
   * commonValidators.isValidEmail('email')
   * // Valid: "user@example.com"
   * // Invalid: "not-an-email"
   */
  isValidEmail: (field) => {
    return body(field)
      .isEmail()
      .withMessage(`${field} must be a valid email address`)
      .normalizeEmail({
        gmail_remove_dots: true,
        gmail_remove_subaddress: true,
        outlookdotcom_remove_subaddress: true,
        yahoo_remove_subaddress: true,
        icloud_remove_subaddress: true,
        all_lowercase: true
      });
  },

  /**
   * ID Parameter Validator
   * 
   * Creates a validation chain that validates a URL parameter is a positive integer.
   * Used for validating resource IDs in RESTful endpoints.
   * 
   * @function isValidId
   * @memberof commonValidators
   * @param {string} field - The name of the URL parameter to validate
   * @returns {import('express-validator').ValidationChain} Validation chain for ID validation
   * 
   * @example
   * // Validate an 'id' URL parameter
   * // Route: GET /users/:id
   * commonValidators.isValidId('id')
   * // Valid: /users/1, /users/42, /users/12345
   * // Invalid: /users/0, /users/-1, /users/abc, /users/1.5
   */
  isValidId: (field) => {
    return param(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`)
      .toInt();
  },

  /**
   * Query String Sanitizer
   * 
   * Creates a validation chain that sanitizes an optional query string parameter:
   * 1. Trims leading and trailing whitespace
   * 2. Escapes HTML special characters
   * 3. Marked as optional - validation passes if field is not provided
   * 
   * Use this for search parameters, filters, and other query string inputs.
   * 
   * @function sanitizeQuery
   * @memberof commonValidators
   * @param {string} field - The name of the query parameter to sanitize
   * @returns {import('express-validator').ValidationChain} Validation chain for query sanitization
   * 
   * @example
   * // Sanitize a 'search' query parameter
   * // Route: GET /users?search=john
   * commonValidators.sanitizeQuery('search')
   * // Input: ?search=<script>
   * // Output: sanitized value with escaped characters
   */
  sanitizeQuery: (field) => {
    return query(field)
      .optional()
      .trim()
      .escape()
      .withMessage(`${field} contains potentially unsafe characters`);
  }
};

/**
 * Module Exports
 * 
 * Exports validation utilities and re-exports express-validator functions
 * for custom validation chain creation.
 * 
 * Exported utilities:
 * - validateRequest: Factory function to create validation middleware arrays
 * - validationErrorHandler: Middleware for handling validation errors
 * - commonValidators: Object containing reusable validation chains
 * 
 * Re-exported from express-validator:
 * - body: Create validation chain for request body fields
 * - param: Create validation chain for URL parameters
 * - query: Create validation chain for query string parameters
 * - validationResult: Extract validation results from request
 * 
 * @example
 * // Import all validation utilities
 * const {
 *   validateRequest,
 *   validationErrorHandler,
 *   commonValidators,
 *   body,
 *   param,
 *   query,
 *   validationResult
 * } = require('./middleware/validation');
 */
module.exports = {
  // Custom validation utilities
  validateRequest,
  validationErrorHandler,
  commonValidators,
  
  // Re-export express-validator functions for custom validations
  body,
  param,
  query,
  validationResult
};
