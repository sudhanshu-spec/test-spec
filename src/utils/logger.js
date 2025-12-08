/**
 * Winston Logger Configuration Module
 * 
 * This module provides a centralized, environment-aware logging service for the
 * application using Winston. It exports a singleton logger instance with standard
 * logging methods (info, error, warn, debug).
 * 
 * Configuration:
 * - In development: Colorized, human-readable console output
 * - In production: JSON format for log aggregation and parsing
 * 
 * Log Levels (from highest to lowest priority):
 * - error: System errors, exceptions
 * - warn: Degraded service, recoverable issues
 * - info: Normal operations, startup/shutdown
 * - debug: Detailed debugging information
 * 
 * Environment Variables:
 * - LOG_LEVEL: Set logging level (default: 'info')
 * 
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started');
 *   logger.error({ message: 'Error occurred', stack: err.stack });
 * 
 * @module src/utils/logger
 */

const winston = require('winston');
const config = require('../config');

/**
 * Development format with colorization and simple output
 */
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${typeof message === 'object' ? JSON.stringify(message) : message} ${metaStr}`;
  })
);

/**
 * Production format with JSON output for log aggregation
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

/**
 * Create Winston logger instance with environment-aware configuration
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.env === 'production' ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
