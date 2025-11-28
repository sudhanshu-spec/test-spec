/**
 * Production-Safe Error Handling Middleware
 * 
 * Intercepts all Express errors and returns sanitized error responses
 * without exposing sensitive information like stack traces, file paths,
 * or internal implementation details.
 * 
 * Implements different error response formats based on NODE_ENV:
 * - Production: Sanitized, generic error messages
 * - Development: Detailed error information with stack traces
 * 
 * Provides logging integration for security event monitoring.
 * 
 * This middleware MUST be registered last in the middleware chain
 * to catch errors from all previous middleware and route handlers.
 * 
 * @module middleware/errorHandler
 */

'use strict';

/**
 * Determines if the application is running in production mode
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Known error types and their corresponding HTTP status codes
 * @type {Object.<string, number>}
 */
const errorStatusMap = {
  ValidationError: 400,
  BadRequestError: 400,
  UnauthorizedError: 401,
  AuthenticationError: 401,
  ForbiddenError: 403,
  AccessDeniedError: 403,
  NotFoundError: 404,
  ResourceNotFoundError: 404,
  MethodNotAllowedError: 405,
  ConflictError: 409,
  PayloadTooLargeError: 413,
  UnprocessableEntityError: 422,
  TooManyRequestsError: 429,
  RateLimitError: 429,
  InternalServerError: 500,
  ServiceUnavailableError: 503,
};

/**
 * Generic error messages for production environment
 * Maps error status codes to user-friendly messages
 * @type {Object.<number, string>}
 */
const genericMessages = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Authentication required. Please provide valid credentials.',
  403: 'Access denied. You do not have permission to access this resource.',
  404: 'Resource not found. The requested resource does not exist.',
  405: 'Method not allowed. This HTTP method is not supported.',
  409: 'Conflict. The request conflicts with the current state.',
  413: 'Request too large. Please reduce the size of your request.',
  422: 'Unprocessable entity. The request was well-formed but cannot be processed.',
  429: 'Too many requests. Please slow down and try again later.',
  500: 'Internal server error. Something went wrong on our end.',
  503: 'Service temporarily unavailable. Please try again later.',
};

/**
 * Sanitizes error messages by removing sensitive information
 * 
 * @param {string} message - The original error message
 * @returns {string} Sanitized error message
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred.';
  }
  
  // Remove file paths
  let sanitized = message.replace(/(?:\/[\w.-]+)+/g, '[path]');
  
  // Remove line numbers and column references
  sanitized = sanitized.replace(/:\d+:\d+/g, '');
  
  // Remove internal module references
  sanitized = sanitized.replace(/at\s+[\w.<>]+\s+\([^)]+\)/g, '');
  
  // Remove stack trace indicators
  sanitized = sanitized.replace(/Error:\s*/g, '');
  
  // Trim and clean up extra whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // If message is too long, truncate it
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized || 'An unexpected error occurred.';
}

/**
 * Determines the appropriate HTTP status code for an error
 * 
 * @param {Error} err - The error object
 * @returns {number} HTTP status code
 */
function getStatusCode(err) {
  // Check for explicitly set status codes
  if (err.status && typeof err.status === 'number') {
    return err.status;
  }
  
  if (err.statusCode && typeof err.statusCode === 'number') {
    return err.statusCode;
  }
  
  // Check for known error types
  if (err.name && errorStatusMap[err.name]) {
    return errorStatusMap[err.name];
  }
  
  // Check for express-validator errors
  if (err.array && typeof err.array === 'function') {
    return 400;
  }
  
  // Check for rate limit errors
  if (err.message && err.message.toLowerCase().includes('rate limit')) {
    return 429;
  }
  
  // Check for validation-related messages
  if (err.message && (
    err.message.toLowerCase().includes('validation') ||
    err.message.toLowerCase().includes('invalid') ||
    err.message.toLowerCase().includes('required')
  )) {
    return 400;
  }
  
  // Default to 500 Internal Server Error
  return 500;
}

/**
 * Logs error information for security event monitoring
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {number} statusCode - HTTP status code
 */
function logError(err, req, statusCode) {
  const timestamp = new Date().toISOString();
  const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Create log entry (avoid logging sensitive data like passwords, tokens)
  const logEntry = {
    timestamp,
    level: statusCode >= 500 ? 'error' : 'warn',
    statusCode,
    errorType: err.name || 'Error',
    message: sanitizeErrorMessage(err.message),
    method,
    url,
    clientIP,
    userAgent,
  };
  
  // In development, include stack trace in logs
  if (!isProduction && err.stack) {
    logEntry.stack = err.stack;
  }
  
  // Log to console (can be replaced with a logging library like Winston)
  if (statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Production-safe Express error handling middleware
 * 
 * Must have all 4 parameters (err, req, res, next) for Express
 * to recognize this as error handling middleware.
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Determine status code
  const statusCode = getStatusCode(err);
  
  // Log the error for monitoring
  logError(err, req, statusCode);
  
  // Prevent sending response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Build error response based on environment
  let errorResponse;
  
  if (isProduction) {
    // Production: Return sanitized, generic error response
    errorResponse = {
      error: {
        status: statusCode,
        message: genericMessages[statusCode] || 'An unexpected error occurred.',
      },
    };
  } else {
    // Development: Return detailed error information
    errorResponse = {
      error: {
        status: statusCode,
        message: err.message || 'An unexpected error occurred.',
        name: err.name || 'Error',
      },
    };
    
    // Include stack trace in development
    if (err.stack) {
      errorResponse.error.stack = err.stack.split('\n');
    }
    
    // Include validation errors if present (from express-validator)
    if (err.errors && Array.isArray(err.errors)) {
      errorResponse.error.validationErrors = err.errors;
    }
  }
  
  // Set appropriate response headers
  res.status(statusCode);
  res.set('Content-Type', 'application/json');
  
  // Remove any headers that might leak information
  res.removeHeader('X-Powered-By');
  
  // Send JSON error response
  res.json(errorResponse);
}

/**
 * Creates a custom error with a specific status code
 * 
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Error object with status code
 */
errorHandler.createError = function(message, statusCode) {
  const error = new Error(message);
  error.status = statusCode;
  return error;
};

/**
 * Export the error handler middleware function as the default export
 * 
 * Usage in server.js:
 * const errorHandler = require('./middleware/errorHandler');
 * app.use(errorHandler);  // Register last in middleware chain
 */
module.exports = errorHandler;
