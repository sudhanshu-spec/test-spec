'use strict';

/**
 * Winston Logger Configuration Module
 *
 * Centralized structured logging service for the entire application.
 * Creates a singleton Winston logger instance with environment-aware log levels,
 * console and file transports, and JSON formatting in production.
 *
 * Transports:
 *   - Console: All environments (colorized simple format)
 *   - File (error): logs/error.log (error-level messages only)
 *   - File (combined): logs/combined.log (all log levels)
 *
 * Provides a stream interface for Morgan HTTP request logger integration,
 * piping all request logs through Winston's http-level transport.
 *
 * @module src/utils/logger
 */

const winston = require('winston');
const config = require('../config');

/**
 * Winston logger instance configured with application settings.
 *
 * Uses npm log levels: error (0), warn (1), info (2), http (3), verbose (4), debug (5), silly (6)
 * Log level threshold is controlled by config.logLevel (defaults to 'info').
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: config.logLevel,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Console transport — all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // Error-only file transport
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),

    // Combined log file transport (all levels)
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

/**
 * Stream interface for Morgan HTTP request logger integration.
 * Morgan writes its output to this stream, which pipes through
 * Winston's http-level transport for unified centralized logging.
 *
 * @type {{ write: function(string): void }}
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
