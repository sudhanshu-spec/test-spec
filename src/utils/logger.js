/**
 * Winston Logger Configuration Module
 * 
 * This module provides a configured Winston logger instance with environment-aware
 * transports and formatting. It follows the same configuration patterns established
 * in src/config/index.js.
 * 
 * Configuration:
 * - Development: Colorized console output with human-readable timestamps
 * - Production: JSON-formatted file outputs (logs/combined.log, logs/error.log)
 * 
 * Log levels (winston defaults):
 * - error: 0
 * - warn: 1
 * - info: 2
 * - http: 3
 * - verbose: 4
 * - debug: 5
 * - silly: 6
 * 
 * Environment variables:
 * - LOG_LEVEL: Override the default log level (default: 'info' for production, 'debug' for development)
 * - NODE_ENV: Determines which transports are used (development vs production)
 * 
 * Usage:
 *   const logger = require('./src/utils/logger');
 *   logger.info('Server started');
 *   logger.error('Error occurred', { error: err.message });
 * 
 * @module src/utils/logger
 */

const winston = require('winston');
const config = require('../config');

/**
 * Determine log level based on environment
 * Uses LOG_LEVEL from config if set, otherwise defaults based on NODE_ENV
 */
const logLevel = config.logLevel || (config.env === 'production' ? 'info' : 'debug');

/**
 * Simple format for basic console output (alternative format option)
 * Uses winston's built-in simple format for minimal output
 */
const simpleFormat = winston.format.simple();

/**
 * Custom format for development console output
 * Provides human-readable timestamps and colorized levels
 * Uses colorize + timestamp + printf for maximum readability
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

/**
 * Production format with JSON output for structured logging
 * Includes error stack traces and timestamps
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Configure transports based on environment
 * - Development: Console with colorized output
 * - Production: File transports for combined and error logs
 */
const transports = [];

if (config.env === 'production') {
  // Production: File transports
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
  
  // Optional console output in production (minimal)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  );
} else {
  // Development: Colorized console output
  transports.push(
    new winston.transports.Console({
      format: devFormat
    })
  );
}

/**
 * Create and export the logger instance
 * 
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: logLevel,
  format: prodFormat,
  defaultMeta: { service: 'express-app' },
  transports: transports
});

module.exports = logger;
