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
 * Validation chain for login request body
 * 
 * Validates user credentials submitted during authentication login requests.
 * Ensures email is properly formatted and password meets minimum length requirements.
 * 
 * Usage Example:
 *   router.post('/login', validateLogin, handleValidationErrors, controller.login);
 * 
 * Validation Rules:
 * - body('email').isEmail(): Ensures the email field contains a valid email address format
 * - body('email').normalizeEmail(): Normalizes the email address (lowercase domain, remove dots in gmail, etc.)
 * - body('password').isLength({min: 8}): Ensures password is at least 8 characters long
 * - withMessage(): Provides clear, user-facing error messages for each validation failure
 * 
 * Security Benefit:
 * Prevents malformed or empty credentials from reaching the authentication logic layer,
 * reducing attack surface for brute-force and credential stuffing attacks.
 * Email normalization ensures consistent lookup and prevents duplicate account creation
 * with equivalent email variations.
 * 
 * @type {ValidationChain[]}
 * @constant
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

/**
 * Validation chain for registration request body
 * 
 * Validates new user registration data including username, email, and password fields.
 * Applies sanitization (trim, escape) and format validation to prevent injection attacks
 * and ensure data integrity for new account creation.
 * 
 * Usage Example:
 *   router.post('/register', validateRegister, handleValidationErrors, controller.register);
 * 
 * Validation Rules:
 * - body('username').trim(): Removes leading and trailing whitespace from username
 * - body('username').isLength({min: 3}): Ensures username is at least 3 characters long
 * - body('username').escape(): Converts HTML special characters to entities to prevent XSS
 * - body('email').isEmail(): Ensures the email field contains a valid email address format
 * - body('email').normalizeEmail(): Normalizes the email address for consistent storage
 * - body('password').isLength({min: 8}): Ensures password is at least 8 characters long
 * - withMessage(): Provides clear, user-facing error messages for each validation failure
 * 
 * Security Benefit:
 * Prevents XSS attacks through username escaping, ensures email uniqueness through
 * normalization, and enforces minimum password complexity. Input sanitization at the
 * validation layer implements defense-in-depth before data reaches the controller.
 * 
 * @type {ValidationChain[]}
 * @constant
 */
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

/**
 * Module Exports
 * 
 * Exports five validation utilities for use across application routes:
 * 1. validateQueryId - Integer validation for query parameters
 * 2. validateBodyName - String sanitization for request body fields
 * 3. validateLogin - Email and password validation for login requests
 * 4. validateRegister - Username, email, and password validation for registration requests
 * 5. handleValidationErrors - Centralized error handling middleware
 * 
 * These exports provide reusable validation chains per Agent Action Plan Section 0.6.1
 * "Validation chains must be reusable across routes"
 * 
 * Integration Example in server.js:
 *   const { validateQueryId, handleValidationErrors } = require('./middleware/validation');
 *   app.get('/api/data', [validateQueryId, handleValidationErrors], handler);
 * 
 * Integration Example for auth routes:
 *   const { validateLogin, validateRegister, handleValidationErrors } = require('../middleware/validation');
 *   router.post('/login', validateLogin, handleValidationErrors, controller.login);
 *   router.post('/register', validateRegister, handleValidationErrors, controller.register);
 */
module.exports = {
  validateQueryId,
  validateBodyName,
  validateLogin,
  validateRegister,
  handleValidationErrors
};
