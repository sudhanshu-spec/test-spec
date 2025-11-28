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
 * Maps custom error class names to appropriate HTTP status codes
 * @type {Object.<string, number>}
 */
const errorStatusMap = {
  // 400 Bad Request - Client sent invalid data
  ValidationError: 400,
  BadRequestError: 400,
  SyntaxError: 400,
  
  // 401 Unauthorized - Authentication required or failed
  UnauthorizedError: 401,
  AuthenticationError: 401,
  JsonWebTokenError: 401,
  TokenExpiredError: 401,
  
  // 403 Forbidden - Authenticated but not authorized
  ForbiddenError: 403,
  AccessDeniedError: 403,
  
  // 404 Not Found - Resource doesn't exist
  NotFoundError: 404,
  ResourceNotFoundError: 404,
  
  // 405 Method Not Allowed
  MethodNotAllowedError: 405,
  
  // 409 Conflict - Request conflicts with current state
  ConflictError: 409,
  
  // 413 Payload Too Large
  PayloadTooLargeError: 413,
  EntityTooLargeError: 413,
  
  // 422 Unprocessable Entity
  UnprocessableEntityError: 422,
  
  // 429 Too Many Requests - Rate limited
  TooManyRequestsError: 429,
  RateLimitError: 429,
  
  // 500 Internal Server Error
  InternalServerError: 500,
  
  // 502 Bad Gateway
  BadGatewayError: 502,
  
  // 503 Service Unavailable
  ServiceUnavailableError: 503,
  
  // 504 Gateway Timeout
  GatewayTimeoutError: 504,
};

/**
 * Generic error messages for production environment
 * These messages are safe to expose to end users and don't reveal
 * any internal implementation details
 * @type {Object.<number, string>}
 */
const genericMessages = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Authentication required. Please provide valid credentials.',
  403: 'Access denied. You do not have permission to access this resource.',
  404: 'Resource not found. The requested resource does not exist.',
  405: 'Method not allowed. This HTTP method is not supported for this resource.',
  409: 'Conflict. The request conflicts with the current state of the resource.',
  413: 'Request too large. Please reduce the size of your request.',
  422: 'Unprocessable entity. The request was well-formed but cannot be processed.',
  429: 'Too many requests. Please slow down and try again later.',
  500: 'Internal server error. Something went wrong on our end.',
  502: 'Bad gateway. The server received an invalid response from an upstream server.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'Gateway timeout. The server did not receive a timely response.',
};

/**
 * Patterns that indicate sensitive information that should be sanitized
 * @type {RegExp[]}
 */
const sensitivePatterns = [
  // File paths (Unix and Windows)
  /(?:\/[\w.-]+)+(?:\.[\w]+)?/g,
  /(?:[A-Za-z]:\\[\w\\.-]+)+/g,
  
  // Line and column numbers (e.g., :123:45)
  /:\d+:\d+/g,
  
  // Stack trace function references
  /at\s+[\w.<>]+\s+\([^)]+\)/g,
  /at\s+[\w.<>]+\s*$/gm,
  
  // Module paths
  /node_modules[\\\/][\w@\\\/.-]+/g,
  
  // Database connection strings
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /postgres(ql)?:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
  /redis:\/\/[^\s]+/gi,
  
  // API keys and tokens (common patterns)
  /[a-zA-Z0-9_-]{20,}/g,
  
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  
  // Email addresses
  /[\w.-]+@[\w.-]+\.\w+/g,
];

/**
 * Sanitizes error messages by removing sensitive information
 * This prevents accidental exposure of internal paths, credentials,
 * or other implementation details in error responses
 * 
 * @param {string} message - The original error message
 * @returns {string} Sanitized error message safe for client exposure
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred.';
  }
  
  let sanitized = message;
  
  // Apply all sensitive pattern replacements
  sensitivePatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[redacted]');
  });
  
  // Remove "Error:" prefixes that might reveal error class names
  sanitized = sanitized.replace(/^Error:\s*/i, '');
  sanitized = sanitized.replace(/^\w+Error:\s*/i, '');
  
  // Clean up multiple whitespace characters
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Remove consecutive [redacted] markers
  sanitized = sanitized.replace(/(\[redacted\]\s*)+/g, '[redacted] ');
  
  // Truncate excessively long messages
  const maxLength = 200;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  // Ensure we have a meaningful message
  if (!sanitized || sanitized === '[redacted]' || sanitized.length < 5) {
    return 'An unexpected error occurred.';
  }
  
  return sanitized;
}

/**
 * Determines the appropriate HTTP status code for an error
 * Checks multiple sources in priority order:
 * 1. Explicitly set status/statusCode property
 * 2. Known error type names
 * 3. Error message content analysis
 * 4. Default to 500
 * 
 * @param {Error} err - The error object
 * @returns {number} HTTP status code (100-599)
 */
function getStatusCode(err) {
  // Priority 1: Check for explicitly set status codes
  if (err.status && typeof err.status === 'number' && err.status >= 100 && err.status < 600) {
    return err.status;
  }
  
  if (err.statusCode && typeof err.statusCode === 'number' && err.statusCode >= 100 && err.statusCode < 600) {
    return err.statusCode;
  }
  
  // Priority 2: Check for known error type names
  if (err.name && errorStatusMap[err.name]) {
    return errorStatusMap[err.name];
  }
  
  // Also check constructor name for custom error classes
  if (err.constructor && err.constructor.name && errorStatusMap[err.constructor.name]) {
    return errorStatusMap[err.constructor.name];
  }
  
  // Priority 3: Check for express-validator errors (array of validation errors)
  if (err.array && typeof err.array === 'function') {
    return 400;
  }
  
  // Check for validation errors object
  if (err.errors && (Array.isArray(err.errors) || typeof err.errors === 'object')) {
    return 400;
  }
  
  // Priority 4: Analyze error message for hints
  const message = (err.message || '').toLowerCase();
  
  // Rate limit indicators
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 429;
  }
  
  // Validation indicators
  if (message.includes('validation') || message.includes('invalid') || message.includes('required field')) {
    return 400;
  }
  
  // Authentication indicators
  if (message.includes('unauthorized') || message.includes('authentication') || message.includes('not authenticated')) {
    return 401;
  }
  
  // Authorization indicators
  if (message.includes('forbidden') || message.includes('permission denied') || message.includes('access denied')) {
    return 403;
  }
  
  // Not found indicators
  if (message.includes('not found') || message.includes('does not exist')) {
    return 404;
  }
  
  // Conflict indicators
  if (message.includes('conflict') || message.includes('already exists') || message.includes('duplicate')) {
    return 409;
  }
  
  // Size limit indicators
  if (message.includes('too large') || message.includes('payload') || message.includes('exceeded')) {
    return 413;
  }
  
  // Timeout indicators
  if (message.includes('timeout') || message.includes('timed out')) {
    return 504;
  }
  
  // Default to 500 Internal Server Error for unknown errors
  return 500;
}

/**
 * Extracts the client IP address from the request
 * Handles various proxy configurations and forwarded headers
 * 
 * @param {Object} req - Express request object
 * @returns {string} Client IP address or 'unknown'
 */
function getClientIP(req) {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, take the first one
    const ips = forwarded.split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }
  
  // Check for real IP header (Nginx)
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  
  // Express trust proxy setting
  if (req.ip) {
    return req.ip;
  }
  
  // Direct connection
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }
  
  // Socket remote address
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  
  return 'unknown';
}

/**
 * Logs error information for security event monitoring
 * Creates structured log entries for error tracking and analysis
 * 
 * Security considerations:
 * - Sanitizes error messages in production
 * - Includes client IP for rate limiting correlation
 * - Avoids logging sensitive data (passwords, tokens in body)
 * - Provides request context for debugging
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {number} statusCode - HTTP status code being returned
 */
function logError(err, req, statusCode) {
  const timestamp = new Date().toISOString();
  const clientIP = getClientIP(req);
  const method = req.method || 'UNKNOWN';
  const url = req.originalUrl || req.url || '/';
  const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
  const requestId = req.headers['x-request-id'] || req.id || null;
  
  // Build the log entry object
  const logEntry = {
    timestamp,
    level: statusCode >= 500 ? 'error' : 'warn',
    statusCode,
    errorType: err.name || err.constructor?.name || 'Error',
    method,
    url,
    clientIP,
    userAgent: userAgent.substring(0, 200), // Truncate long user agents
  };
  
  // Add request ID if available (for request tracing)
  if (requestId) {
    logEntry.requestId = requestId;
  }
  
  // In production, sanitize the error message
  if (isProduction) {
    logEntry.message = sanitizeErrorMessage(err.message);
  } else {
    // In development, include full error details
    logEntry.message = err.message || 'Unknown error';
    
    // Include stack trace for debugging
    if (err.stack) {
      logEntry.stack = err.stack;
    }
    
    // Include any additional error properties
    if (err.code) {
      logEntry.errorCode = err.code;
    }
    
    // Include validation errors if present
    if (err.errors) {
      logEntry.validationErrors = err.errors;
    }
  }
  
  // Format and output the log entry
  // Using JSON format for easy parsing by log aggregation tools
  const logMessage = JSON.stringify(logEntry, null, isProduction ? 0 : 2);
  
  // Route to appropriate log level
  if (statusCode >= 500) {
    // Server errors - these need immediate attention
    console.error(`[ERROR] ${logMessage}`);
  } else if (statusCode >= 400) {
    // Client errors - log as warnings
    console.warn(`[WARN] ${logMessage}`);
  } else {
    // Informational (shouldn't typically reach here)
    console.info(`[INFO] ${logMessage}`);
  }
}

/**
 * Production-safe Express error handling middleware
 * 
 * This middleware intercepts all errors thrown or passed via next(err)
 * in the Express application and returns appropriate responses based
 * on the environment.
 * 
 * IMPORTANT: Must have all 4 parameters (err, req, res, next) for Express
 * to recognize this as error handling middleware.
 * 
 * Usage:
 *   const errorHandler = require('./middleware/errorHandler');
 *   // Register LAST in middleware chain
 *   app.use(errorHandler);
 * 
 * @param {Error} err - The error object passed via next(err) or thrown
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (required for signature)
 */
function errorHandler(err, req, res, next) {
  // Determine the appropriate HTTP status code
  const statusCode = getStatusCode(err);
  
  // Log the error for security monitoring and debugging
  logError(err, req, statusCode);
  
  // If headers have already been sent, delegate to Express's default handler
  // This prevents "Cannot set headers after they are sent" errors
  if (res.headersSent) {
    return next(err);
  }
  
  // Build the error response based on environment
  let errorResponse;
  
  if (isProduction) {
    // PRODUCTION MODE: Return sanitized, generic error response
    // Never expose internal details, stack traces, or implementation specifics
    errorResponse = {
      error: {
        status: statusCode,
        message: genericMessages[statusCode] || genericMessages[500],
      },
    };
    
    // For 429 Too Many Requests, include retry information if available
    if (statusCode === 429) {
      const retryAfter = err.retryAfter || res.get('Retry-After');
      if (retryAfter) {
        errorResponse.error.retryAfter = parseInt(retryAfter, 10);
      }
    }
  } else {
    // DEVELOPMENT MODE: Return detailed error information for debugging
    errorResponse = {
      error: {
        status: statusCode,
        message: err.message || 'An unexpected error occurred.',
        name: err.name || 'Error',
      },
    };
    
    // Include stack trace for debugging (split into array for readability)
    if (err.stack) {
      errorResponse.error.stack = err.stack.split('\n').map((line) => line.trim());
    }
    
    // Include error code if present
    if (err.code) {
      errorResponse.error.code = err.code;
    }
    
    // Include validation errors from express-validator or similar
    if (err.errors) {
      if (Array.isArray(err.errors)) {
        errorResponse.error.validationErrors = err.errors;
      } else if (typeof err.errors === 'object') {
        errorResponse.error.validationErrors = Object.values(err.errors);
      }
    }
    
    // Include any additional details attached to the error
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  }
  
  // Set response headers
  // Content-Type for JSON response
  res.set('Content-Type', 'application/json; charset=utf-8');
  
  // Cache-Control to prevent caching of error responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  // Remove headers that might leak information
  res.removeHeader('X-Powered-By');
  
  // Set the status code and send the JSON response
  res.status(statusCode).json(errorResponse);
}

/**
 * Factory function to create custom errors with specific status codes
 * Useful for throwing errors in route handlers with predetermined status codes
 * 
 * Usage:
 *   const error = errorHandler.createError('User not found', 404);
 *   throw error;
 *   // or
 *   next(errorHandler.createError('Invalid token', 401));
 * 
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code (100-599)
 * @param {Object} [options] - Additional error options
 * @param {string} [options.name] - Custom error name
 * @param {string} [options.code] - Machine-readable error code
 * @param {*} [options.details] - Additional error details
 * @returns {Error} Error object with status code and optional properties
 */
errorHandler.createError = function(message, statusCode, options = {}) {
  const error = new Error(message);
  error.status = statusCode;
  
  // Set custom error name if provided
  if (options.name) {
    error.name = options.name;
  }
  
  // Set error code if provided (useful for client-side error handling)
  if (options.code) {
    error.code = options.code;
  }
  
  // Attach additional details if provided
  if (options.details !== undefined) {
    error.details = options.details;
  }
  
  return error;
};

/**
 * Convenience functions for common error types
 * These provide semantic error creation with appropriate status codes
 */

/**
 * Creates a 400 Bad Request error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 400
 */
errorHandler.badRequest = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Bad request',
    400,
    { name: 'BadRequestError', ...options }
  );
};

/**
 * Creates a 401 Unauthorized error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 401
 */
errorHandler.unauthorized = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Unauthorized',
    401,
    { name: 'UnauthorizedError', ...options }
  );
};

/**
 * Creates a 403 Forbidden error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 403
 */
errorHandler.forbidden = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Forbidden',
    403,
    { name: 'ForbiddenError', ...options }
  );
};

/**
 * Creates a 404 Not Found error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 404
 */
errorHandler.notFound = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Not found',
    404,
    { name: 'NotFoundError', ...options }
  );
};

/**
 * Creates a 409 Conflict error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 409
 */
errorHandler.conflict = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Conflict',
    409,
    { name: 'ConflictError', ...options }
  );
};

/**
 * Creates a 422 Unprocessable Entity error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 422
 */
errorHandler.unprocessable = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Unprocessable entity',
    422,
    { name: 'UnprocessableEntityError', ...options }
  );
};

/**
 * Creates a 429 Too Many Requests error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @param {number} [options.retryAfter] - Seconds until retry is allowed
 * @returns {Error} Error with status 429
 */
errorHandler.tooManyRequests = function(message, options = {}) {
  const error = errorHandler.createError(
    message || 'Too many requests',
    429,
    { name: 'TooManyRequestsError', ...options }
  );
  if (options.retryAfter) {
    error.retryAfter = options.retryAfter;
  }
  return error;
};

/**
 * Creates a 500 Internal Server Error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 500
 */
errorHandler.internal = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Internal server error',
    500,
    { name: 'InternalServerError', ...options }
  );
};

/**
 * Creates a 503 Service Unavailable error
 * @param {string} message - Error message
 * @param {Object} [options] - Additional options
 * @returns {Error} Error with status 503
 */
errorHandler.serviceUnavailable = function(message, options = {}) {
  return errorHandler.createError(
    message || 'Service unavailable',
    503,
    { name: 'ServiceUnavailableError', ...options }
  );
};

/**
 * Export the error handler middleware function as the default export
 * 
 * Usage in server.js:
 *   const errorHandler = require('./middleware/errorHandler');
 *   
 *   // ... other middleware and routes ...
 *   
 *   // Register LAST in middleware chain to catch all errors
 *   app.use(errorHandler);
 * 
 * Helper functions are available as properties of errorHandler:
 *   errorHandler.createError(message, statusCode, options)
 *   errorHandler.badRequest(message, options)
 *   errorHandler.unauthorized(message, options)
 *   errorHandler.forbidden(message, options)
 *   errorHandler.notFound(message, options)
 *   errorHandler.conflict(message, options)
 *   errorHandler.unprocessable(message, options)
 *   errorHandler.tooManyRequests(message, options)
 *   errorHandler.internal(message, options)
 *   errorHandler.serviceUnavailable(message, options)
 */
module.exports = errorHandler;
