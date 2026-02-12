'use strict';

/**
 * Winston Logger Factory Module
 *
 * Creates and exports a singleton Winston logger instance with structured
 * JSON formatting, configurable log levels, and multiple transports.
 *
 * Transports:
 * - Console: Colorized simple format in development, JSON in production
 * - File (error): logs/error.log — captures error-level entries only
 * - File (combined): logs/combined.log — captures all log levels
 *
 * The log level is driven by config.logLevel (defaults to 'info') and the
 * console transport format adapts based on config.nodeEnv.
 *
 * @module src/config/logger
 */

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const config = require('./index');

// Ensure the logs directory exists for File transports
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Singleton Winston logger instance.
 *
 * Configured with:
 * - level: from config.logLevel (default 'info')
 * - format: timestamp + JSON for structured output
 * - transports: File (error.log), File (combined.log), Console
 *
 * @type {import('winston').Logger}
 */
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // File transport for errors only
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    // File transport for all log levels
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  ]
});

// Add Console transport with environment-aware formatting
if (config.nodeEnv !== 'production') {
  // Development: colorized, human-readable output
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
} else {
  // Production: JSON format for machine parsing by log aggregation systems
  logger.add(new winston.transports.Console());
}

module.exports = logger;
