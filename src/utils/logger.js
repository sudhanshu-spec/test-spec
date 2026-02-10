/**
 * Structured Logger Configuration Module
 * 
 * This module configures and exports a Winston logger instance with
 * environment-aware transports, custom severity levels, and timestamp
 * formatting for unified application logging.
 * 
 * Severity levels (custom): error=0, warn=1, info=2, http=3, debug=4
 * 
 * Transport configuration:
 * - Console transport: Always active, colorized in development
 * - File transports: Active in non-test environments
 *   - logs/error.log: Error-level messages only
 *   - logs/combined.log: All log levels
 * - Test environment: Console-only at 'warn' level for clean test output
 * 
 * @module src/utils/logger
 */

'use strict';

const winston = require('winston');
const config = require('../config');

/**
 * Custom severity levels following npm convention with http level added
 * @type {Object<string, number>}
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

/**
 * Colors associated with each severity level for console output
 * @type {Object<string, string>}
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Register custom colors with Winston
winston.addColors(colors);

/**
 * Determine the active log level based on environment
 * - Test environment: 'warn' (minimal output for clean test results)
 * - Other environments: Use configured logLevel from config
 * @returns {string} The active log level
 */
function getLogLevel() {
  if (config.env === 'test') {
    return 'warn';
  }
  return config.logLevel;
}

/**
 * Log format combining timestamp and printf for human-readable output
 * @type {winston.Logform.Format}
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level}]: ${message}`;
  })
);

/**
 * Console transport - always active
 * Colorized output for development readability
 * @type {winston.transports.ConsoleTransportInstance}
 */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    logFormat
  )
});

/**
 * Build transports array based on environment
 * @returns {winston.transport[]} Array of configured transports
 */
function buildTransports() {
  const transports = [consoleTransport];

  // Add file transports only in non-test environments
  if (config.env !== 'test') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: logFormat
      })
    );
  }

  return transports;
}

/**
 * Winston logger instance configured with custom levels, environment-aware
 * transports, and structured formatting
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  levels: levels,
  format: logFormat,
  transports: buildTransports(),
  exitOnError: false
});

/**
 * Stream interface for Morgan HTTP request logging integration
 * Morgan writes HTTP request logs to this stream, which pipes them
 * into Winston at the 'http' severity level
 * @type {{ write: function(string): void }}
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
