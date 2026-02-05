/**
 * Winston Logger Service
 * 
 * This module provides a centralized Winston logger instance with
 * environment-aware configuration. It implements the singleton pattern
 * to ensure a single shared logger instance across the application.
 * 
 * Features:
 * - Console transport with colorized output for development
 * - File transports for production (combined.log and error.log)
 * - Environment-aware log levels (debug in development, info in production)
 * - Stream interface for Morgan HTTP logging integration
 * 
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Application started');
 *   logger.error('An error occurred', { error: err });
 * 
 * @module src/utils/logger
 */

'use strict';

const winston = require('winston');
const config = require('../config');

/**
 * Determine log level based on environment and configuration
 * @type {string}
 */
const logLevel = config.logLevel;

/**
 * Define log format based on environment
 * Development: colorized simple format for readability
 * Production: JSON format for structured logging and parsing
 * Test: minimal output to avoid polluting test results
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `${timestamp} ${level}: ${message}\n${stack}`
      : `${timestamp} ${level}: ${message}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Select format based on environment
 */
const logFormat = config.env === 'production' ? prodFormat : devFormat;

/**
 * Build transports array based on environment
 * @type {Array<winston.transport>}
 */
const transports = [];

// Console transport - always enabled, but silent in test mode
transports.push(
  new winston.transports.Console({
    silent: config.env === 'test'
  })
);

// File transports - only in production
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  );
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  );
}

/**
 * Create Winston logger instance
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: transports,
  exitOnError: false
});

/**
 * Add custom http log level for Morgan integration
 * Winston default levels don't include 'http', so we add it
 */
winston.addColors({ http: 'magenta' });

/**
 * Stream interface for Morgan middleware integration
 * Morgan uses this to pipe HTTP request logs to Winston
 * 
 * Usage in morgan middleware:
 *   morgan('combined', { stream: logger.stream })
 * 
 * @type {{ write: Function }}
 */
logger.stream = {
  /**
   * Write method called by Morgan for each HTTP request log
   * @param {string} message - Log message from Morgan
   */
  write: (message) => {
    // Use http level for Morgan logs, trim trailing newline
    logger.info(message.trim());
  }
};

module.exports = logger;
