/**
 * Pino Logger Configuration Module
 * 
 * This module provides centralized logging configuration for the Express application
 * using Pino, a high-performance JSON logger for Node.js. It implements structured
 * logging with environment-aware settings, sensitive data redaction, and custom
 * serializers for consistent output format.
 * 
 * Key Features:
 * - High-performance JSON logging suitable for production environments
 * - Environment-aware log levels and output formats
 * - Automatic redaction of sensitive data (authorization headers, passwords, tokens)
 * - Custom serializers for consistent request/response/error logging
 * - ISO timestamp formatting for log aggregation compatibility
 * - Process identification (PID, hostname) for distributed systems
 * 
 * Environment Variables:
 * - LOG_LEVEL: Logging verbosity level
 *   Values: 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
 *   Default: 'info'
 *   Example: LOG_LEVEL=debug
 * 
 * - LOG_FORMAT: Output format for logs
 *   Values: 'json', 'pretty'
 *   Default: 'json' in production, 'pretty' in development
 *   Example: LOG_FORMAT=pretty
 * 
 * - LOG_REDACT_PATHS: JSON array of paths to redact from logs
 *   Default: '["req.headers.authorization"]'
 *   Example: LOG_REDACT_PATHS='["req.headers.authorization","req.body.password"]'
 * 
 * Usage in server.js:
 *   const { createLogger } = require('./config/logger');
 *   const logger = createLogger();
 *   logger.info('Server started');
 *   logger.error({ err: error }, 'An error occurred');
 * 
 * Usage with custom options:
 *   const logger = createLogger({ level: 'debug' });
 * 
 * @module config/logger
 * @see https://getpino.io/
 * @see https://github.com/pinojs/pino
 * @see https://github.com/pinojs/pino-http
 */

'use strict';

const pino = require('pino');

/**
 * Determines if the application is running in production mode.
 * Used for environment-specific logging configurations.
 * @type {boolean}
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determines if the application is running in development mode.
 * Allows for human-readable log formatting during local development.
 * @type {boolean}
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Valid Pino log levels in order of increasing severity.
 * Used for validation of LOG_LEVEL environment variable.
 * @type {string[]}
 */
const VALID_LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Parses and validates the LOG_LEVEL environment variable.
 * 
 * @returns {string} Valid log level string
 */
const parseLogLevel = () => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase().trim();
  
  if (VALID_LOG_LEVELS.includes(level)) {
    return level;
  }
  
  // Default to 'info' if invalid level provided
  // In production, we don't want to fail startup due to misconfiguration
  return 'info';
};

/**
 * Parses the LOG_FORMAT environment variable.
 * Defaults to 'json' in production and 'pretty' in development.
 * 
 * @returns {string} Log format ('json' or 'pretty')
 */
const parseLogFormat = () => {
  const format = (process.env.LOG_FORMAT || '').toLowerCase().trim();
  
  if (format === 'json' || format === 'pretty') {
    return format;
  }
  
  // Environment-aware default: JSON for production, pretty for development
  return isProduction ? 'json' : 'pretty';
};

/**
 * Parses the LOG_REDACT_PATHS environment variable.
 * Expects a JSON array of dot-notation paths to redact from logs.
 * 
 * Security Note:
 * - Default paths include common sensitive data locations
 * - Authorization headers and password fields are always redacted
 * - Additional paths can be added via environment variable
 * 
 * @returns {string[]} Array of paths to redact
 */
const parseRedactPaths = () => {
  // Default paths to always redact for security
  const defaultPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.passwordConfirmation',
    'req.body.confirmPassword',
    'req.body.oldPassword',
    'req.body.newPassword',
    'req.body.token',
    'req.body.refreshToken',
    'req.body.accessToken',
    'req.body.apiKey',
    'req.body.secret',
    'req.body.creditCard',
    'req.body.ssn',
    'res.body.token',
    'res.body.refreshToken',
    'res.body.accessToken',
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization'
  ];
  
  const envPaths = process.env.LOG_REDACT_PATHS;
  
  if (!envPaths || envPaths.trim() === '') {
    return defaultPaths;
  }
  
  try {
    const parsedPaths = JSON.parse(envPaths);
    
    if (Array.isArray(parsedPaths)) {
      // Merge default paths with user-specified paths, removing duplicates
      return [...new Set([...defaultPaths, ...parsedPaths])];
    }
    
    return defaultPaths;
  } catch (error) {
    // If JSON parsing fails, return default paths
    // Don't throw - gracefully degrade to secure defaults
    return defaultPaths;
  }
};

/**
 * Log level value parsed from environment.
 * @type {string}
 */
const logLevel = parseLogLevel();

/**
 * Log format parsed from environment.
 * @type {string}
 */
const logFormat = parseLogFormat();

/**
 * Redaction paths parsed from environment.
 * @type {string[]}
 */
const redactPaths = parseRedactPaths();

/**
 * Custom request serializer for consistent request logging.
 * Extracts relevant request information while avoiding sensitive data exposure.
 * 
 * @param {Object} req - Express request object
 * @returns {Object} Serialized request data
 */
const requestSerializer = (req) => {
  if (!req) {
    return req;
  }
  
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: {
      host: req.headers?.host,
      'user-agent': req.headers?.['user-agent'],
      'content-type': req.headers?.['content-type'],
      'content-length': req.headers?.['content-length'],
      accept: req.headers?.accept,
      'x-request-id': req.headers?.['x-request-id'],
      'x-forwarded-for': req.headers?.['x-forwarded-for'],
      'x-real-ip': req.headers?.['x-real-ip']
    },
    remoteAddress: req.socket?.remoteAddress || req.connection?.remoteAddress,
    remotePort: req.socket?.remotePort || req.connection?.remotePort
  };
};

/**
 * Custom response serializer for consistent response logging.
 * Captures response metadata without exposing body content.
 * 
 * @param {Object} res - Express response object
 * @returns {Object} Serialized response data
 */
const responseSerializer = (res) => {
  if (!res) {
    return res;
  }
  
  return {
    statusCode: res.statusCode,
    headers: {
      'content-type': res.getHeader?.('content-type'),
      'content-length': res.getHeader?.('content-length'),
      'x-request-id': res.getHeader?.('x-request-id')
    }
  };
};

/**
 * Custom error serializer with stack trace for debugging.
 * Provides detailed error information for troubleshooting.
 * 
 * @param {Error} err - Error object
 * @returns {Object} Serialized error data
 */
const errorSerializer = (err) => {
  if (!err) {
    return err;
  }
  
  const serialized = {
    type: err.constructor?.name || 'Error',
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode || err.status
  };
  
  // Include additional error properties if present
  if (err.details) {
    serialized.details = err.details;
  }
  
  if (err.cause) {
    serialized.cause = errorSerializer(err.cause);
  }
  
  return serialized;
};

/**
 * Serializers configuration object.
 * Provides consistent serialization for common log objects.
 * 
 * @type {Object}
 * @property {Function} req - Request serializer
 * @property {Function} res - Response serializer
 * @property {Function} err - Error serializer
 */
const serializersConfig = {
  req: requestSerializer,
  res: responseSerializer,
  err: errorSerializer
};

/**
 * Level labels mapping for human-readable log levels.
 * Maps numeric Pino levels to string labels.
 * 
 * @type {Object}
 */
const levelLabels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

/**
 * Logger Configuration Object
 * 
 * Comprehensive configuration for Pino logger following best practices
 * for production environments. This configuration ensures:
 * - Structured JSON output for log aggregation tools
 * - ISO timestamps for consistent time parsing
 * - Sensitive data redaction for security compliance
 * - Process identification for distributed tracing
 * 
 * @type {Object}
 * @property {string} level - Logging verbosity level from environment
 * @property {Object} redact - Redaction configuration for sensitive data
 * @property {Function} timestamp - ISO timestamp formatter
 * @property {Object} formatters - Custom formatters for log output
 * @property {Object} base - Base properties included in every log entry
 */
const loggerConfig = {
  /**
   * Log Level Configuration
   * 
   * Controls which log messages are emitted based on severity.
   * Levels in order: trace < debug < info < warn < error < fatal
   * 
   * Production: Typically 'info' or 'warn' to reduce log volume
   * Development: 'debug' or 'trace' for detailed troubleshooting
   */
  level: logLevel,
  
  /**
   * Redaction Configuration
   * 
   * Automatically censors sensitive data from log output.
   * Supports dot-notation paths for nested object properties.
   * 
   * Security Best Practice:
   * - Always redact authentication credentials
   * - Redact PII (Personally Identifiable Information)
   * - Redact financial data (credit cards, SSNs)
   * - Redact API keys and secrets
   */
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  },
  
  /**
   * Timestamp Configuration
   * 
   * Uses ISO 8601 format for universal time representation.
   * Compatible with log aggregation tools (ELK, CloudWatch, Datadog).
   * Format: 2024-01-15T10:30:00.000Z
   */
  timestamp: pino.stdTimeFunctions.isoTime,
  
  /**
   * Formatters Configuration
   * 
   * Custom formatters for transforming log output.
   * The level formatter adds a human-readable label alongside numeric level.
   */
  formatters: {
    /**
     * Level Formatter
     * Transforms numeric level to include string label for readability.
     * 
     * @param {string} label - Original level label
     * @param {number} number - Numeric level value
     * @returns {Object} Formatted level object
     */
    level: (label, number) => {
      return {
        level: number,
        levelLabel: label
      };
    },
    
    /**
     * Bindings Formatter
     * Includes base bindings in log output.
     * 
     * @param {Object} bindings - Logger bindings
     * @returns {Object} Formatted bindings
     */
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        name: bindings.name
      };
    }
  },
  
  /**
   * Base Configuration
   * 
   * Properties included in every log entry.
   * Useful for distributed systems to identify log sources.
   * 
   * - pid: Process ID for distinguishing cluster workers
   * - hostname: Server hostname for multi-server deployments
   */
  base: {
    pid: process.pid,
    hostname: require('os').hostname()
  }
};

/**
 * Creates the transport configuration for pino.
 * 
 * In production: Uses direct stdout for maximum performance (JSON format)
 * In development: Uses pino-pretty for human-readable output if LOG_FORMAT is 'pretty'
 * 
 * @returns {Object|undefined} Transport configuration or undefined for default stdout
 */
const getTransportConfig = () => {
  // In production, always use direct stdout for performance
  // JSON format is required for log aggregation tools
  if (isProduction) {
    return undefined; // Use default stdout destination
  }
  
  // In development with pretty format, use pino-pretty transport
  if (logFormat === 'pretty') {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{levelLabel} - {msg}'
      }
    };
  }
  
  // Default: stdout with JSON format
  return undefined;
};

/**
 * Creates a configured Pino logger instance.
 * 
 * This factory function creates a new logger with the base configuration
 * and optional custom overrides. It handles environment-specific transport
 * configuration automatically.
 * 
 * @param {Object} [options={}] - Optional configuration overrides
 * @param {string} [options.level] - Override log level
 * @param {string} [options.name] - Logger name for identification
 * @param {Object} [options.redact] - Override redaction configuration
 * @param {Object} [options.serializers] - Override serializers
 * @param {Object} [options.base] - Override base properties
 * @returns {import('pino').Logger} Configured Pino logger instance
 * 
 * @example
 * // Create logger with default configuration
 * const logger = createLogger();
 * logger.info('Application started');
 * 
 * @example
 * // Create logger with custom name
 * const dbLogger = createLogger({ name: 'database' });
 * dbLogger.debug({ query: 'SELECT *' }, 'Executing query');
 * 
 * @example
 * // Create logger with custom level
 * const debugLogger = createLogger({ level: 'debug' });
 * debugLogger.debug('Detailed debug information');
 * 
 * @example
 * // Log with structured data
 * const logger = createLogger();
 * logger.info({ userId: 123, action: 'login' }, 'User logged in');
 * logger.error({ err: error }, 'An error occurred');
 */
const createLogger = (options = {}) => {
  // Merge base configuration with custom options
  const config = {
    ...loggerConfig,
    ...options,
    // Deep merge serializers to allow partial overrides
    serializers: {
      ...serializersConfig,
      ...(options.serializers || {})
    },
    // Deep merge base properties
    base: {
      ...loggerConfig.base,
      ...(options.base || {})
    },
    // Deep merge formatters
    formatters: {
      ...loggerConfig.formatters,
      ...(options.formatters || {})
    }
  };
  
  // Get transport configuration based on environment
  const transport = getTransportConfig();
  
  // Create logger with or without transport configuration
  if (transport) {
    return pino({
      ...config,
      transport
    });
  }
  
  // Use default destination (stdout) for production performance
  return pino(config, pino.destination(1)); // 1 = stdout file descriptor
};

/**
 * Freeze the configuration object to prevent runtime modifications.
 * This ensures the logger configuration cannot be accidentally or
 * maliciously altered after the application starts.
 */
Object.freeze(loggerConfig);
Object.freeze(loggerConfig.redact);
Object.freeze(loggerConfig.formatters);
Object.freeze(loggerConfig.base);
Object.freeze(serializersConfig);

/**
 * Export the logger configuration and factory function.
 * 
 * Usage:
 *   const { createLogger, loggerConfig } = require('./config/logger');
 *   
 *   // Create a logger instance
 *   const logger = createLogger();
 *   
 *   // Access configuration (read-only)
 *   console.log(loggerConfig.level);
 */
module.exports = {
  createLogger,
  loggerConfig
};
