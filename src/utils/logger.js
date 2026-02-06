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
 * Uses config.logLevel if available, otherwise defaults based on NODE_ENV.
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
  // Development: colorized, human-readable output
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
} else {
  // Production: structured JSON output on console
  transports.push(new winston.transports.Console());
}

// File transports — production only
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  );
  transports.push(
    new winston.transports.File({
      filename: 'logs/all.log'
    })
  );
}

/**
 * Winston logger singleton instance.
 * All modules should import and use this same logger instance.
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
 * Morgan writes request log lines through this stream, which pipes them
 * to Winston at the 'http' log level.
 *
 * @type {{ write: Function }}
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
