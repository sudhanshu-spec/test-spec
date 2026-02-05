/**
 * Winston Logger Service
 *
 * This module provides a centralized Winston logger instance implementing the
 * singleton pattern for consistent logging across the application. The logger
 * is environment-aware, automatically adjusting its behavior based on NODE_ENV.
 *
 * Features:
 * - Console transport with colorized output for development
 * - File transports for production (logs/combined.log and logs/error.log)
 * - Environment-aware log levels (debug in development, info in production)
 * - Stream interface for Morgan HTTP logging integration
 * - Silent mode during tests to avoid polluting test output
 *
 * Log Levels (npm standard, severity high to low):
 * - error: Error conditions that require immediate attention
 * - warn: Warning conditions that should be reviewed
 * - info: Informational messages about application state
 * - http: HTTP request logging (used by Morgan integration)
 * - verbose: Detailed informational messages
 * - debug: Debug-level messages for troubleshooting
 * - silly: Extremely detailed trace logging
 *
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Application started');
 *   logger.error('An error occurred', { error: err });
 *   logger.debug('Variable value', { data: someData });
 *
 * Morgan Integration:
 *   const morgan = require('morgan');
 *   app.use(morgan('combined', { stream: logger.stream }));
 *
 * Environment Variables:
 * - LOG_LEVEL: Override the default log level
 * - NODE_ENV: Determines default log level and format
 *   - 'production': JSON format, info level, file transports enabled
 *   - 'development': Colorized simple format, debug level
 *   - 'test': Silent mode to avoid test output pollution
 *
 * @module src/utils/logger
 */

'use strict';

const winston = require('winston');
const config = require('../config');

/**
 * Determine log level based on environment configuration
 * Uses config.logLevel which already has smart defaults:
 * - 'debug' in development for detailed troubleshooting
 * - 'info' in production for operational visibility
 * Can be overridden via LOG_LEVEL environment variable
 * @type {string}
 */
const logLevel = config.logLevel;

/**
 * Define custom log levels with npm standard hierarchy
 * Including 'http' level for Morgan integration between 'info' and 'verbose'
 * @type {Object}
 */
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
  }
};

// Add custom colors to Winston
winston.addColors(customLevels.colors);

/**
 * Development format configuration
 * Uses colorized simple format for human readability during development
 * Includes timestamp and error stack trace capture
 * @type {winston.Logform.Format}
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.simple()
);

/**
 * Production format configuration
 * Uses JSON format for structured logging and easy parsing by log aggregators
 * Includes timestamp and error stack trace capture
 * @type {winston.Logform.Format}
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Select appropriate log format based on environment
 * Production uses JSON for structured logging
 * All other environments use colorized simple format for readability
 * @type {winston.Logform.Format}
 */
const logFormat = config.env === 'production' ? prodFormat : devFormat;

/**
 * Build transports array based on environment
 * Console transport is always included but silent during tests
 * File transports are only added in production
 * @type {Array<winston.transport>}
 */
const transports = [];

/**
 * Console transport configuration
 * - Development: Colorized output for easy reading
 * - Test: Silent to prevent polluting test output
 * - Production: JSON output for log aggregation
 */
transports.push(
  new winston.transports.Console({
    silent: config.env === 'test',
    format: config.env === 'production' ? prodFormat : devFormat
  })
);

/**
 * File transports for production environment
 * - error.log: Contains only error-level logs for quick problem identification
 * - combined.log: Contains all log levels for comprehensive audit trail
 * Files are stored in the logs/ directory at project root
 */
if (config.env === 'production') {
  // Error-level logs only
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: prodFormat
    })
  );

  // All logs combined
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: prodFormat
    })
  );
}

/**
 * Create the Winston logger instance
 * This is the singleton logger that will be used throughout the application
 *
 * Configuration:
 * - level: Minimum severity level to log (from config)
 * - levels: Custom level definitions including 'http' for Morgan
 * - format: Environment-appropriate format (JSON or simple)
 * - transports: Array of output destinations
 * - exitOnError: false to prevent process exit on handled exceptions
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: logLevel,
  levels: customLevels.levels,
  format: logFormat,
  transports: transports,
  exitOnError: false
});

/**
 * Stream interface for Morgan HTTP logging middleware integration
 *
 * Morgan middleware can pipe its HTTP request logs through this stream
 * to Winston, enabling unified logging across the application.
 *
 * Usage in Express middleware setup:
 *   const morgan = require('morgan');
 *   const logger = require('./utils/logger');
 *   app.use(morgan('combined', { stream: logger.stream }));
 *
 * The stream uses the 'http' log level which sits between 'info' and 'verbose'
 * in the severity hierarchy, allowing HTTP logs to be filtered separately.
 *
 * @type {{ write: Function }}
 */
logger.stream = {
  /**
   * Write method called by Morgan for each HTTP request log entry
   * Trims the message to remove Morgan's trailing newline character
   *
   * @param {string} message - The formatted log message from Morgan
   */
  write: function (message) {
    logger.http(message.trim());
  }
};

/**
 * Export the configured Winston logger instance
 *
 * The logger provides the following methods matching the configured levels:
 * - logger.error(message, [meta]) - Log error conditions
 * - logger.warn(message, [meta]) - Log warning conditions
 * - logger.info(message, [meta]) - Log informational messages
 * - logger.http(message, [meta]) - Log HTTP requests (Morgan integration)
 * - logger.verbose(message, [meta]) - Log verbose details
 * - logger.debug(message, [meta]) - Log debug information
 * - logger.silly(message, [meta]) - Log trace-level details
 *
 * Additional properties:
 * - logger.stream - Stream interface for Morgan integration
 * - logger.transports - Array of configured transports
 * - logger.level - Current minimum log level
 *
 * @type {winston.Logger}
 */
module.exports = logger;
