'use strict';

/**
 * @fileoverview Winston Logger Utility Module
 *
 * Provides a centralized, environment-aware Winston logger singleton for the
 * entire application. Features configurable log levels, console and file
 * transports, JSON formatting with timestamps, and a stream interface for
 * Morgan HTTP request logging integration.
 *
 * Transport configuration:
 * - Console transport: Active in all environments (colorized in development)
 * - File transports (production only):
 *   - logs/error.log: Error-level messages only
 *   - logs/all.log: All log levels
 *
 * @module src/utils/logger
 */

const winston = require('winston');
const config = require('../config');

/**
 * Resolve the effective log level based on configuration and environment.
 * Uses config.logLevel if available, otherwise defaults based on NODE_ENV:
 * - production: 'info'
 * - development/test: 'debug'
 *
 * @type {string}
 */
const level = config.logLevel || (config.env === 'production' ? 'info' : 'debug');

/**
 * Build the list of Winston transports based on the current environment.
 * Console transport is always present; file transports are added in production.
 *
 * @type {winston.transport[]}
 */
const transports = [];

// Console transport — active in all environments
if (config.env !== 'production') {
  // Development/test: colorized, human-readable output for easier debugging
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
} else {
  // Production: structured JSON output on console (inherits logger-level format)
  transports.push(new winston.transports.Console());
}

// File transports — production only to avoid polluting dev/test environments
if (config.env === 'production') {
  // Error-level messages go to a dedicated error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  );
  // All log levels are captured in the combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/all.log'
    })
  );
}

/**
 * Winston logger singleton instance.
 *
 * Created with environment-aware log level, JSON formatting with timestamps,
 * stack trace capture for errors, and conditionally configured transports.
 * All modules should import and use this same logger instance; Node.js module
 * caching guarantees singleton behavior across the application.
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: transports
});

/**
 * Stream interface for Morgan HTTP request logging integration.
 *
 * Morgan writes request log lines through this stream, which pipes them
 * to Winston at the 'http' log level. The trailing newline from Morgan's
 * output is trimmed before passing to Winston to prevent blank lines in logs.
 *
 * Usage in Morgan middleware:
 *   morgan('combined', { stream: logger.stream })
 *
 * @type {{ write: Function }}
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
