/**
 * Input Validation Middleware Module
 * 
 * Provides reusable validation chains and error handling for Express.js routes.
 * Uses express-validator to sanitize and validate user inputs.
 * 
 * Security Benefits:
 * - Prevents SQL injection attacks
 * - Prevents XSS (Cross-Site Scripting) attacks
 * - Prevents command injection attacks
 * - Validates data types, formats, and ranges
 * - Provides consistent error messages
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Validation chain for query parameter: id
 * 
 * Usage: app.get('/api/data', [validateQueryId], handler)
 * 
 * Validation Rules:
 * - Optional field (request proceeds if not provided)
 * - Must be an integer if provided
 * - Custom error message for invalid values
 */
const validateQueryId = query('id')
  .optional()
  .isInt()
  .withMessage('ID must be an integer');

/**
 * Validation chain for body parameter: name
 * 
 * Usage: app.post('/api/users', [validateBodyName], handler)
 * 
 * Validation Rules:
 * - Trim whitespace from beginning and end
 * - Escape HTML characters to prevent XSS
 * - Optional: Add length constraints with .isLength({min: 1, max: 100})
 */
const validateBodyName = body('name')
  .trim()
  .escape();

/**
 * Validation chain for body parameter: email
 * 
 * Usage: app.post('/api/contact', [validateBodyEmail], handler)
 * 
 * Validation Rules:
 * - Must be a valid email format
 * - Normalized to lowercase
 * - Custom error message for invalid emails
 */
const validateBodyEmail = body('email')
  .optional()
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email address');

/**
 * Error Handling Middleware for Validation Failures
 * 
 * Usage: app.post('/api/data', [validations...], handleValidationErrors, handler)
 * 
 * Behavior:
 * - Checks for validation errors from preceding validation chains
 * - Returns HTTP 400 with detailed error array if validation fails
 * - Calls next() to proceed to route handler if validation passes
 * 
 * Error Response Format:
 * {
 *   "errors": [
 *     {
 *       "msg": "Error message",
 *       "param": "field_name",
 *       "location": "query|body|params"
 *     }
 *   ]
 * }
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Example: Complete validation chain for a route
 * 
 * app.post('/api/users',
 *   [
 *     body('name').trim().notEmpty().withMessage('Name is required'),
 *     body('email').isEmail().withMessage('Valid email required'),
 *     body('age').optional().isInt({min: 0, max: 120}).withMessage('Age must be 0-120'),
 *     handleValidationErrors
 *   ],
 *   (req, res) => {
 *     // Route handler - inputs are validated and sanitized
 *     res.json({ message: 'User created successfully' });
 *   }
 * );
 */

module.exports = {
  validateQueryId,
  validateBodyName,
  validateBodyEmail,
  handleValidationErrors,
  // Export express-validator functions for custom validation chains
  body,
  query,
  param,
  validationResult
};
