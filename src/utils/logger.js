/**
 * Logger Utility Module
 * 
 * This module provides structured logging capabilities using winston.
 * It configures environment-aware log formatting and transports for
 * operational logging and morgan HTTP request logging integration.
 * 
 * Log Levels (npm standard):
 * - error: Application errors, exceptions, failures
 * - warn: Warning conditions, deprecation notices
 * - info: Normal operational messages, startup/shutdown
 * - http: HTTP request/response logging
 * - debug: Detailed debugging information
 * 
 * Environment Behavior:
 * - Development: Colorized, human-readable console output
 * - Production: Structured JSON format for log aggregation
 * - Test: Silent output to reduce noise
 * 
 * Exports:
 * - logger: Configured winston logger instance
 * - stream: Morgan-compatible stream for HTTP request logging
 * 
 * Usage:
 *   const { logger, stream } = require('./utils/logger');
 *   logger.info('Server started');
 *   logger.error({ message: 'Error occurred', stack: err.stack });
 *   app.use(morgan('combined', { stream }));
 * 
 * @module src/utils/logger
 */

'use strict';

const winston = require('winston');
const config = require('../config');

/**
 * Custom log format for development environment
 * Provides colorized, human-readable output
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

/**
 * Custom log format for production environment
 * Provides structured JSON for log aggregation systems
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Determine the appropriate format based on environment
 * @returns {winston.Logform.Format} Winston format configuration
 */
const getFormat = () => {
  if (config.env === 'production') {
    return prodFormat;
  }
  if (config.env === 'test') {
    // Minimal format for test environment
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );
  }
  return devFormat;
};

/**
 * Configure transports based on environment
 * @returns {winston.transport[]} Array of configured transports
 */
const getTransports = () => {
  const transports = [];

  // Console transport for all environments except test
  if (config.env !== 'test') {
    transports.push(
      new winston.transports.Console({
        level: config.logLevel || 'info',
        handleExceptions: true
      })
    );
  }

  // File transport for production
  if (config.env === 'production') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }

  // If no transports configured (test env), add silent console
  if (transports.length === 0) {
    transports.push(
      new winston.transports.Console({
        silent: true
      })
    );
  }

  return transports;
};

/**
 * Configured winston logger instance
 * 
 * Features:
 * - Environment-aware formatting (colorized dev, JSON prod)
 * - Configurable log level via LOG_LEVEL env var
 * - Timestamp on all log entries per R-040
 * - Stack traces for error objects per R-044
 * - Exit on error disabled for graceful handling
 * 
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  levels: winston.config.npm.levels,
  format: getFormat(),
  transports: getTransports(),
  exitOnError: false
});

/**
 * Morgan-compatible write stream for HTTP request logging
 * 
 * Integrates morgan HTTP request logger with winston.
 * Morgan outputs messages with trailing newlines, which are trimmed.
 * Messages are logged at 'http' level per Log Level Rules.
 * 
 * Usage:
 *   const morgan = require('morgan');
 *   const { stream } = require('./utils/logger');
 *   app.use(morgan('combined', { stream }));
 * 
 * @type {Object}
 * @property {Function} write - Stream write method for morgan
 */
const stream = {
  /**
   * Write method called by morgan for each HTTP request log
   * @param {string} message - HTTP request log message from morgan
   */
  write: (message) => {
    // Remove trailing newline that morgan adds
    logger.http(message.trim());
  }
};

module.exports = {
  logger,
  stream
};
