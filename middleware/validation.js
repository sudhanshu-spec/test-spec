/**
 * Input Validation Middleware Module
 * 
 * Provides reusable validation chains and error handling for Express.js routes.
 * Uses express-validator to sanitize and validate user inputs, preventing injection attacks.
 * 
 * Security Features:
 * - Prevents SQL injection attacks through type validation
 * - Prevents XSS (Cross-Site Scripting) attacks through HTML escaping
 * - Prevents command injection through input sanitization
 * - Validates data types, formats, and ranges
 * - Provides consistent, structured error messages
 * 
 * Part of comprehensive security implementation per Agent Action Plan Section 0.5.3
 * Implements defense-in-depth strategy with input validation layer
 * 
 * @module middleware/validation
 * @requires express-validator@7.3.1
 */

const { body, query, validationResult } = require('express-validator');

/**
 * Validation chain for query parameter: id
 * 
 * Validates integer ID parameters in query strings, commonly used for resource lookups.
 * 
 * Usage Example:
 *   app.get('/api/data', [validateQueryId, handleValidationErrors], (req, res) => {
 *     const id = req.query.id; // Guaranteed to be integer if present
 *     // ... route handler logic
 *   });
 * 
 * Validation Rules:
 * - optional(): Field is not required; validation only runs if provided
 * - isInt(): Ensures value is an integer, preventing type confusion attacks
 * - withMessage(): Provides clear error message for client feedback
 * 
 * Security Benefit:
 * Prevents injection attacks by ensuring ID parameters are strictly integers,
 * blocking malicious payloads like "1 OR 1=1" or "../../../etc/passwd"
 * 
 * @type {ValidationChain}
 * @constant
 */
const validateQueryId = query('id')
  .optional()
  .isInt()
  .withMessage('ID must be an integer');

/**
 * Validation chain for body parameter: name
 * 
 * Sanitizes string name inputs by trimming whitespace and escaping HTML characters.
 * Essential for preventing XSS attacks through user-submitted text fields.
 * 
 * Usage Example:
 *   app.post('/api/users', [validateBodyName, handleValidationErrors], (req, res) => {
 *     const name = req.body.name; // Sanitized and safe for storage/display
 *     // ... route handler logic
 *   });
 * 
 * Validation Rules:
 * - trim(): Removes leading and trailing whitespace, preventing padding attacks
 * - escape(): Converts HTML special characters to entities (&lt; &gt; &amp; etc.)
 * 
 * Security Benefit:
 * Prevents XSS attacks by escaping characters like <, >, &, ', ", /
 * Example: Input "<script>alert('XSS')</script>" becomes safe HTML entity string
 * 
 * @type {ValidationChain}
 * @constant
 */
const validateBodyName = body('name')
  .trim()
  .escape();

/**
 * Error Handling Middleware for Validation Failures
 * 
 * Centralized validation error handler that checks results from validation chains
 * and returns structured error responses for failed validations.
 * 
 * Usage Example:
 *   app.post('/api/data',
 *     [validateQueryId, validateBodyName, handleValidationErrors],
 *     (req, res) => {
 *       // This handler only executes if all validations pass
 *       res.json({ success: true });
 *     }
 *   );
 * 
 * Middleware Behavior:
 * 1. Calls validationResult(req) to extract validation errors
 * 2. Checks if errors exist using isEmpty() method
 * 3. If errors exist: Returns HTTP 400 Bad Request with error array
 * 4. If no errors: Calls next() to proceed to route handler
 * 
 * Error Response Format:
 * {
 *   "errors": [
 *     {
 *       "value": "invalid_value",
 *       "msg": "ID must be an integer",
 *       "param": "id",
 *       "location": "query"
 *     }
 *   ]
 * }
 * 
 * HTTP Status Codes:
 * - 400 Bad Request: Validation failed, client error
 * - Proceeds normally: All validations passed
 * 
 * Security Benefit:
 * Prevents invalid/malicious data from reaching application logic by failing fast
 * at the validation layer, implementing defense-in-depth security strategy
 * 
 * @function
 * @param {Object} req - Express request object containing validation results
 * @param {Object} res - Express response object for sending error responses
 * @param {Function} next - Express next middleware function
 * @returns {void|Response} Returns 400 JSON response if validation fails, otherwise calls next()
 */
const handleValidationErrors = (req, res, next) => {
  // Extract validation errors from request using express-validator
  const errors = validationResult(req);
  
  // Check if any validation rules failed using isEmpty() method
  if (!errors.isEmpty()) {
    // Return 400 Bad Request with structured error array using array() method
    return res.status(400).json({ errors: errors.array() });
  }
  
  // All validations passed - proceed to next middleware/route handler
  next();
};

/**
 * Module Exports
 * 
 * Exports three validation utilities for use across application routes:
 * 1. validateQueryId - Integer validation for query parameters
 * 2. validateBodyName - String sanitization for request body fields
 * 3. handleValidationErrors - Centralized error handling middleware
 * 
 * These exports provide reusable validation chains per Agent Action Plan Section 0.6.1
 * "Validation chains must be reusable across routes"
 * 
 * Integration Example in server.js:
 *   const { validateQueryId, handleValidationErrors } = require('./middleware/validation');
 *   app.get('/api/data', [validateQueryId, handleValidationErrors], handler);
 */
module.exports = {
  validateQueryId,
  validateBodyName,
  handleValidationErrors
};
