/**
 * Winston Logger Configuration Module
 * 
 * This module provides centralized application logging using Winston with
 * environment-aware log levels. It exports a configured Winston logger
 * instance with console and file transports.
 * 
 * Transport configuration:
 * - Console: Colorized output for development visibility
 * - File (error.log): Captures error-level logs only
 * - File (combined.log): Captures all log levels
 * 
 * Log level is controlled by NODE_ENV:
 * - development: 'debug' (all levels)
 * - production: 'info' (info and above)
 * 
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started');
 *   logger.error('Something went wrong', { error: err });
 * 
 * @module src/utils/logger
 */

'use strict';

const winston = require('winston');

/**
 * Custom log levels hierarchy (lower number = higher priority)
 * @type {Object}
 */
const levels = {
  error: 0,   // Error conditions
  warn: 1,    // Warning conditions
  info: 2,    // Informational messages
  http: 3,    // HTTP request logs (for Morgan)
  debug: 4    // Debug messages
};

/**
 * Color mapping for console output
 * @type {Object}
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
 * Determine the log level based on NODE_ENV
 * @returns {string} The log level to use
 */
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Log format configuration
 * Includes timestamp, colorization, and custom printf format
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

/**
 * Transports configuration array
 * - Console transport for terminal output
 * - File transport for error logs (logs/error.log)
 * - File transport for all logs (logs/combined.log)
 */
const transports = [
  // Console transport - colorized output
  new winston.transports.Console(),
  // Error log file - only error level
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }),
  // Combined log file - all levels
  new winston.transports.File({
    filename: 'logs/combined.log'
  })
];

/**
 * Configured Winston logger instance
 * 
 * @type {winston.Logger}
 * @example
 * const logger = require('./utils/logger');
 * logger.error('Error message');
 * logger.warn('Warning message');
 * logger.info('Info message');
 * logger.http('HTTP request log');
 * logger.debug('Debug message');
 */
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports
});

module.exports = logger;
