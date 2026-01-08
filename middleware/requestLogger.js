/**
 * HTTP Request Logging Middleware
 * 
 * This module provides HTTP request/response logging middleware for Express
 * applications using pino-http. It implements structured logging with request
 * correlation IDs, response time tracking, and status-based log levels for
 * production monitoring and debugging.
 * 
 * Key Features:
 * - Automatic request ID generation using UUID v4 for request correlation
 * - Response time tracking for performance monitoring
 * - Status-based log levels (error for 5xx, warn for 4xx, info for 2xx/3xx)
 * - Sensitive data redaction (authorization headers, passwords, tokens)
 * - Custom serializers for consistent request/response output
 * - X-Request-ID header support for distributed tracing
 * 
 * Security Features:
 * - Automatic redaction of authorization headers and credentials
 * - Sanitization of sensitive request/response data before logging
 * - No logging of request/response body content by default
 * - Configurable redaction paths via options
 * 
 * Environment Variables:
 * - LOG_LEVEL: Controls logging verbosity (trace, debug, info, warn, error, fatal)
 *   Default: 'info'
 *   Note: This is handled by the logger configuration (config/logger.js)
 * 
 * Usage:
 *   const { createRequestLogger } = require('./middleware/requestLogger');
 *   const logger = require('./config/logger').createLogger();
 *   
 *   // Create request logger middleware
 *   const requestLogger = createRequestLogger(logger);
 *   
 *   // Apply to Express app (before routes)
 *   app.use(requestLogger);
 * 
 * Usage without existing logger:
 *   const { createRequestLogger } = require('./middleware/requestLogger');
 *   
 *   // A default logger will be created automatically
 *   const requestLogger = createRequestLogger();
 *   app.use(requestLogger);
 * 
 * Middleware Chain Order:
 * Request Logger should be placed at the START of the middleware chain,
 * before security middleware (Helmet, CORS, Rate Limiter) to capture
 * all requests including blocked ones.
 * 
 * Recommended order:
 * 1. Request Logger - Log all incoming requests first
 * 2. Helmet - Security headers
 * 3. CORS - Cross-origin policy
 * 4. Rate Limiter - Request throttling
 * 5. Body Parser - Request body parsing
 * 6. Routes - Application routes
 * 
 * @module middleware/requestLogger
 * @see https://github.com/pinojs/pino-http
 * @see https://getpino.io/
 * @see https://www.npmjs.com/package/uuid
 */

'use strict';

// ============================================================================
// External Dependencies
// ============================================================================

/**
 * pino-http middleware for HTTP request logging with Pino integration.
 * Provides automatic request/response logging with configurable options.
 * 
 * @see https://github.com/pinojs/pino-http
 */
const pinoHttp = require('pino-http');

/**
 * UUID v4 generator for creating unique request IDs.
 * Each request is assigned a collision-resistant random UUID per RFC 4122.
 * 
 * @see https://www.npmjs.com/package/uuid
 */
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// Internal Dependencies
// ============================================================================

/**
 * Factory function for creating Pino logger instances.
 * Used to create a default logger when one is not provided.
 * 
 * @see config/logger.js
 */
const { createLogger } = require('../config/logger');

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Default paths to redact from log output for security.
 * These paths are automatically censored to prevent sensitive data exposure.
 * 
 * Security Note:
 * - Authorization headers contain credentials (Bearer tokens, Basic auth)
 * - Cookie headers may contain session tokens
 * - Password fields contain user credentials
 * - Token fields contain authentication/API tokens
 * - API keys and secrets must never be logged
 * 
 * @type {string[]}
 */
const DEFAULT_REDACT_PATHS = [
  // Request headers containing credentials
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["api-key"]',
  
  // Request body sensitive fields
  'req.body.password',
  'req.body.passwordConfirmation',
  'req.body.confirmPassword',
  'req.body.oldPassword',
  'req.body.newPassword',
  'req.body.currentPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.apiKey',
  'req.body.api_key',
  'req.body.secret',
  'req.body.secretKey',
  'req.body.secret_key',
  'req.body.clientSecret',
  'req.body.client_secret',
  'req.body.creditCard',
  'req.body.credit_card',
  'req.body.cardNumber',
  'req.body.card_number',
  'req.body.cvv',
  'req.body.ssn',
  'req.body.socialSecurityNumber',
  
  // Response body sensitive fields
  'res.body.token',
  'res.body.refreshToken',
  'res.body.accessToken',
  
  // General sensitive field names
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization'
];

/**
 * Mapping of HTTP status code ranges to log levels.
 * Determines the appropriate log level based on response status.
 * 
 * Log Level Strategy:
 * - 5xx (Server Errors): 'error' - Requires immediate attention
 * - 4xx (Client Errors): 'warn' - Client-side issues, may need investigation
 * - 3xx (Redirects): 'info' - Normal operation
 * - 2xx (Success): 'info' - Normal operation
 * - 1xx (Informational): 'info' - Normal operation
 * 
 * @type {Object}
 */
const STATUS_LOG_LEVELS = {
  serverError: 'error',  // 5xx status codes
  clientError: 'warn',   // 4xx status codes
  redirect: 'info',      // 3xx status codes
  success: 'info',       // 2xx status codes
  informational: 'info'  // 1xx status codes
};

/**
 * Headers that should be sanitized (removed or redacted) before logging.
 * These headers contain sensitive information that should not appear in logs.
 * 
 * @type {string[]}
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'x-access-token',
  'x-refresh-token'
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique request ID for request correlation and tracing.
 * 
 * If the request already contains an X-Request-ID header (from a reverse proxy
 * or API gateway), that value is reused to maintain correlation across services.
 * Otherwise, a new UUID v4 is generated.
 * 
 * @param {Object} req - Express request object
 * @returns {string} Unique request identifier (UUID v4 format)
 * 
 * @example
 * // Request without existing ID
 * const id = generateRequestId(req);
 * // Returns: '550e8400-e29b-41d4-a716-446655440000'
 * 
 * @example
 * // Request with existing X-Request-ID header
 * req.headers['x-request-id'] = 'existing-uuid';
 * const id = generateRequestId(req);
 * // Returns: 'existing-uuid'
 */
function generateRequestId(req) {
  // Check for existing request ID from upstream services (API gateway, load balancer)
  // Support common header variations
  const existingId = req.headers['x-request-id'] ||
                     req.headers['x-correlation-id'] ||
                     req.headers['request-id'] ||
                     req.headers['correlation-id'];
  
  if (existingId && typeof existingId === 'string' && existingId.trim().length > 0) {
    return existingId.trim();
  }
  
  // Generate new UUID v4 for this request
  return uuidv4();
}

/**
 * Determines the appropriate log level based on HTTP response status code.
 * 
 * This function implements status-based log level selection following
 * observability best practices:
 * - Server errors (5xx) are logged at 'error' level for alerting
 * - Client errors (4xx) are logged at 'warn' level for monitoring
 * - Successful responses are logged at 'info' level
 * 
 * If an error object is present, the function always returns 'error' level
 * regardless of status code to ensure exceptions are properly captured.
 * 
 * @param {Object} res - Express response object
 * @param {Error|null} err - Error object if request resulted in an error
 * @returns {string} Pino log level ('error', 'warn', or 'info')
 * 
 * @example
 * // Server error response
 * res.statusCode = 500;
 * const level = getCustomLogLevel(res, null);
 * // Returns: 'error'
 * 
 * @example
 * // Client error response
 * res.statusCode = 404;
 * const level = getCustomLogLevel(res, null);
 * // Returns: 'warn'
 * 
 * @example
 * // Successful response
 * res.statusCode = 200;
 * const level = getCustomLogLevel(res, null);
 * // Returns: 'info'
 * 
 * @example
 * // Error object present
 * const level = getCustomLogLevel(res, new Error('Something failed'));
 * // Returns: 'error' (regardless of status code)
 */
function getCustomLogLevel(res, err) {
  // If an error occurred, always log at error level
  if (err) {
    return STATUS_LOG_LEVELS.serverError;
  }
  
  // Get status code, defaulting to 500 if not set (shouldn't happen in normal operation)
  const statusCode = res.statusCode || 500;
  
  // Determine log level based on status code range
  if (statusCode >= 500) {
    // 5xx: Server Error - requires immediate attention
    return STATUS_LOG_LEVELS.serverError;
  }
  
  if (statusCode >= 400) {
    // 4xx: Client Error - may indicate client issues or potential attacks
    return STATUS_LOG_LEVELS.clientError;
  }
  
  if (statusCode >= 300) {
    // 3xx: Redirect - normal operation
    return STATUS_LOG_LEVELS.redirect;
  }
  
  if (statusCode >= 200) {
    // 2xx: Success - normal operation
    return STATUS_LOG_LEVELS.success;
  }
  
  // 1xx: Informational - normal operation
  return STATUS_LOG_LEVELS.informational;
}

/**
 * Sanitizes headers object by removing or redacting sensitive values.
 * 
 * This function creates a copy of the headers object with sensitive
 * information removed to prevent credential leakage in logs.
 * 
 * @param {Object} headers - Request or response headers object
 * @returns {Object} Sanitized headers with sensitive values redacted
 * 
 * @example
 * const headers = {
 *   'content-type': 'application/json',
 *   'authorization': 'Bearer secret-token',
 *   'cookie': 'session=abc123'
 * };
 * const sanitized = sanitizeHeaders(headers);
 * // Returns: {
 * //   'content-type': 'application/json',
 * //   'authorization': '[REDACTED]',
 * //   'cookie': '[REDACTED]'
 * // }
 */
function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return {};
  }
  
  // Create a shallow copy to avoid modifying the original
  const sanitized = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this header should be redacted
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// ============================================================================
// Serializers Configuration
// ============================================================================

/**
 * Custom serializers for consistent request/response/error logging.
 * 
 * Serializers transform raw objects into loggable formats, ensuring
 * consistent output structure and sensitive data handling.
 * 
 * @type {Object}
 * @property {Function} req - Request serializer
 * @property {Function} res - Response serializer
 * @property {Function} err - Error serializer
 */
const serializersConfig = {
  /**
   * Request Serializer
   * 
   * Extracts relevant request information for logging while
   * sanitizing sensitive headers. Provides consistent request
   * representation across all log entries.
   * 
   * @param {Object} req - Express request object
   * @returns {Object} Serialized request data
   */
  req: (req) => {
    if (!req) {
      return req;
    }
    
    return {
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.path || req.url?.split('?')[0],
      query: req.query,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
        'content-length': req.headers?.['content-length'],
        accept: req.headers?.accept,
        'x-request-id': req.headers?.['x-request-id'],
        'x-forwarded-for': req.headers?.['x-forwarded-for'],
        'x-real-ip': req.headers?.['x-real-ip']
        // Note: authorization and cookie headers intentionally excluded
      },
      remoteAddress: req.socket?.remoteAddress || 
                     req.connection?.remoteAddress ||
                     req.ip,
      remotePort: req.socket?.remotePort || 
                  req.connection?.remotePort
    };
  },
  
  /**
   * Response Serializer
   * 
   * Captures response metadata without exposing body content.
   * Includes status code and relevant headers for monitoring.
   * 
   * @param {Object} res - Express response object
   * @returns {Object} Serialized response data
   */
  res: (res) => {
    if (!res) {
      return res;
    }
    
    // Safely get response headers
    const getHeader = (name) => {
      if (typeof res.getHeader === 'function') {
        return res.getHeader(name);
      }
      return res.headers?.[name];
    };
    
    return {
      statusCode: res.statusCode,
      headers: {
        'content-type': getHeader('content-type'),
        'content-length': getHeader('content-length'),
        'x-request-id': getHeader('x-request-id'),
        'x-response-time': getHeader('x-response-time')
      }
    };
  },
  
  /**
   * Error Serializer
   * 
   * Provides detailed error information for debugging while
   * handling nested causes and additional error properties.
   * 
   * @param {Error} err - Error object
   * @returns {Object} Serialized error data
   */
  err: (err) => {
    if (!err) {
      return err;
    }
    
    const serialized = {
      type: err.constructor?.name || 'Error',
      message: err.message,
      code: err.code,
      statusCode: err.statusCode || err.status
    };
    
    // Include stack trace for debugging
    // In production, consider whether to include this based on security requirements
    if (err.stack) {
      serialized.stack = err.stack;
    }
    
    // Include additional error properties if present
    if (err.details) {
      serialized.details = err.details;
    }
    
    // Include validation errors if present (e.g., from Joi)
    if (err.isJoi && err.details) {
      serialized.validationErrors = err.details;
    }
    
    // Recursively serialize error cause chain
    if (err.cause) {
      serialized.cause = serializersConfig.err(err.cause);
    }
    
    return serialized;
  }
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a configured HTTP request logging middleware using pino-http.
 * 
 * This factory function creates an Express middleware that logs all HTTP
 * requests and responses with structured JSON output. It provides request
 * correlation via UUID v4 request IDs, response time tracking, and
 * status-based log levels.
 * 
 * The middleware automatically:
 * - Generates unique request IDs for correlation (UUID v4)
 * - Tracks response time in milliseconds
 * - Sets log level based on status code (error/warn/info)
 * - Redacts sensitive data (authorization, passwords, tokens)
 * - Adds request ID to response headers (X-Request-ID)
 * 
 * @param {Object} [logger] - Pino logger instance. If not provided, a default
 *   logger will be created using the application's logger configuration.
 * @param {Object} [options={}] - Optional configuration overrides
 * @param {string[]} [options.redactPaths] - Additional paths to redact from logs
 * @param {boolean} [options.autoLogging=true] - Enable automatic request/response logging
 * @param {Object} [options.customProps] - Additional properties to add to log entries
 * @param {Function} [options.customLogLevel] - Custom function to determine log level
 * @param {Function} [options.genReqId] - Custom function to generate request IDs
 * @param {Object} [options.serializers] - Custom serializers to override defaults
 * @returns {Function} Express middleware function for request logging
 * 
 * @example
 * // Basic usage with default logger
 * const { createRequestLogger } = require('./middleware/requestLogger');
 * const requestLogger = createRequestLogger();
 * app.use(requestLogger);
 * 
 * @example
 * // Usage with custom logger
 * const { createLogger } = require('./config/logger');
 * const { createRequestLogger } = require('./middleware/requestLogger');
 * 
 * const logger = createLogger({ name: 'http' });
 * const requestLogger = createRequestLogger(logger);
 * app.use(requestLogger);
 * 
 * @example
 * // Usage with custom options
 * const requestLogger = createRequestLogger(null, {
 *   redactPaths: ['req.body.customSecret'],
 *   customProps: (req, res) => ({
 *     environment: process.env.NODE_ENV
 *   })
 * });
 * app.use(requestLogger);
 */
function createRequestLogger(logger, options = {}) {
  // Create default logger if not provided
  const loggerInstance = logger || createLogger({ name: 'http' });
  
  // Merge custom redact paths with defaults
  const redactPaths = options.redactPaths
    ? [...new Set([...DEFAULT_REDACT_PATHS, ...options.redactPaths])]
    : DEFAULT_REDACT_PATHS;
  
  // Merge custom serializers with defaults
  const serializers = {
    ...serializersConfig,
    ...(options.serializers || {})
  };
  
  // Configure pino-http middleware
  const pinoHttpMiddleware = pinoHttp({
    // Use provided logger or default logger instance
    logger: loggerInstance,
    
    // Request ID generation function
    // Uses existing X-Request-ID header or generates UUID v4
    genReqId: options.genReqId || generateRequestId,
    
    // Custom log level based on status code
    // Returns 'error' for 5xx, 'warn' for 4xx, 'info' otherwise
    customLogLevel: options.customLogLevel || getCustomLogLevel,
    
    // Custom serializers for request/response/error formatting
    serializers: serializers,
    
    // Enable automatic logging of all requests and responses
    autoLogging: options.autoLogging !== undefined ? options.autoLogging : true,
    
    // Redact sensitive data from logs
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]'
    },
    
    // Add custom properties to every log entry
    customProps: options.customProps || ((req, res) => ({
      requestId: req.id
    })),
    
    // Custom success message format
    customSuccessMessage: (req, res) => {
      const responseTime = res.responseTime !== undefined 
        ? `${res.responseTime}ms` 
        : '';
      return `${req.method} ${req.url} ${res.statusCode} ${responseTime}`.trim();
    },
    
    // Custom error message format
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    
    // Add request ID to response headers for client correlation
    customAttributeKeys: {
      req: 'req',
      res: 'res',
      err: 'err',
      responseTime: 'responseTime'
    },
    
    // Enable response time tracking
    // The response time is automatically calculated and included in logs
    quietReqLogger: false,
    
    // Use extreme mode for better performance in production
    // This batches writes to improve throughput
    useLevel: 'info'
  });
  
  // Return wrapper middleware that also sets X-Request-ID response header
  return (req, res, next) => {
    // Apply pino-http middleware first
    pinoHttpMiddleware(req, res, (err) => {
      if (err) {
        return next(err);
      }
      
      // Set X-Request-ID response header for client correlation
      // This allows clients to reference the request ID in support tickets
      if (req.id && !res.headersSent) {
        res.setHeader('X-Request-ID', req.id);
      }
      
      next();
    });
  };
}

// ============================================================================
// Object Freeze for Immutability
// ============================================================================

/**
 * Freeze configuration objects to prevent runtime modifications.
 * This ensures consistent behavior and prevents accidental changes.
 */
Object.freeze(DEFAULT_REDACT_PATHS);
Object.freeze(STATUS_LOG_LEVELS);
Object.freeze(SENSITIVE_HEADERS);
Object.freeze(serializersConfig);

// ============================================================================
// Module Exports
// ============================================================================

/**
 * Export the request logger factory function and helper utilities.
 * 
 * Primary Exports:
 * - createRequestLogger: Factory function to create request logging middleware
 * 
 * Utility Exports (for testing and customization):
 * - serializersConfig: Default serializers for req/res/err objects
 * - generateRequestId: Function to generate/extract request IDs
 * - getCustomLogLevel: Function to determine log level from status code
 * 
 * @example
 * // Standard usage
 * const { createRequestLogger } = require('./middleware/requestLogger');
 * app.use(createRequestLogger());
 * 
 * @example
 * // Access serializers for custom implementations
 * const { serializersConfig } = require('./middleware/requestLogger');
 * const customSerializer = {
 *   ...serializersConfig,
 *   req: (req) => ({ ...serializersConfig.req(req), custom: true })
 * };
 * 
 * @example
 * // Use helper functions for testing or custom middleware
 * const { generateRequestId, getCustomLogLevel } = require('./middleware/requestLogger');
 * const requestId = generateRequestId(req);
 * const level = getCustomLogLevel(res, null);
 */
module.exports = {
  // Primary factory function for creating request logging middleware
  createRequestLogger,
  
  // Serializers configuration for inspection, testing, or customization
  serializersConfig,
  
  // Helper function for request ID generation
  generateRequestId,
  
  // Helper function for status-based log level determination
  getCustomLogLevel
};
