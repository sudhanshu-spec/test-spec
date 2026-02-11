/**
 * @fileoverview Winston Structured Logger Configuration
 *
 * This module creates and exports a configured Winston logger instance used
 * across the application for structured, level-based logging. It replaces
 * raw console.log/console.error usage with a production-grade logging system.
 *
 * Environment-aware transport selection:
 *   - Development: Console transport with colorized, human-readable output
 *   - Production:  Console transport (for PM2 log capture) plus file transports
 *                  writing to logs/error.log (error-level only) and
 *                  logs/combined.log (all levels)
 *
 * Log level hierarchy (Winston npm levels):
 *   error (0) → warn (1) → info (2) → http (3) → verbose (4) → debug (5) → silly (6)
 *
 * The 'http' level is specifically used by Morgan for HTTP request logging,
 * sitting between 'info' and 'verbose' in the priority chain.
 *
 * Configuration is read from src/config (LOG_LEVEL, NODE_ENV) with sensible
 * defaults so the logger functions correctly even without a .env file.
 *
 * @module src/utils/logger
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

const path = require('path');
const winston = require('winston');
const config = require('../config');

// =============================================================================
// Constants
// =============================================================================

/**
 * Custom color mapping for log levels.
 * Applied to console output in development mode for visual differentiation.
 * @type {Object<string, string>}
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
};

/**
 * Directory path for log file output in production.
 * Resolves to the 'logs/' directory at the project root.
 * @type {string}
 */
const LOGS_DIR = path.join(process.cwd(), 'logs');

/**
 * Maximum size per log file in bytes (5 MB).
 * When exceeded, Winston rotates to a new file.
 * @type {number}
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum number of rotated log files to retain.
 * Oldest files are removed when this limit is exceeded.
 * @type {number}
 */
const MAX_FILES = 5;

// =============================================================================
// Color Configuration
// =============================================================================

// Register custom colors with Winston for colorized console output
winston.addColors(LOG_COLORS);

// =============================================================================
// Format Definitions
// =============================================================================

/**
 * Determines the effective log level based on configuration and environment.
 *
 * In development, defaults to 'debug' to surface all log output during
 * local development. In production (and other environments), uses the
 * configured log level from the config module, falling back to 'info'.
 *
 * @returns {string} The effective log level string
 */
function getLogLevel() {
  const env = config.env || 'development';
  const configuredLevel = config.logLevel || 'info';

  if (env === 'development') {
    return 'debug';
  }

  return configuredLevel;
}

/**
 * Development log format.
 *
 * Produces colorized, human-readable output with timestamps for local
 * development. Format: "YYYY-MM-DD HH:mm:ss [LEVEL]: message {metadata}"
 *
 * @type {winston.Logform.Format}
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Append metadata as JSON if any additional fields are present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    return log;
  })
);

/**
 * Production log format.
 *
 * Produces structured JSON output suitable for log aggregation services,
 * with error stack trace capture and ISO 8601 timestamps.
 *
 * @type {winston.Logform.Format}
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// =============================================================================
// Transport Configuration
// =============================================================================

/**
 * Builds the array of Winston transports based on the current environment.
 *
 * All environments receive a Console transport. Production additionally
 * receives two File transports: one for error-level messages only, and
 * one for all log levels (combined).
 *
 * @returns {winston.transport[]} Array of configured transport instances
 */
function buildTransports() {
  const env = config.env || 'development';
  const isProduction = env === 'production';

  /** @type {winston.transport[]} */
  const transports = [];

  // Console transport — present in all environments
  // Uses production JSON format when in production, colorized format otherwise
  transports.push(
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat
    })
  );

  // File transports — production only
  if (isProduction) {
    // Error-level log file: captures only error-level messages for quick
    // identification of critical issues in production
    transports.push(
      new winston.transports.File({
        filename: path.join(LOGS_DIR, 'error.log'),
        level: 'error',
        format: productionFormat,
        maxsize: MAX_FILE_SIZE,
        maxFiles: MAX_FILES,
        handleExceptions: true
      })
    );

    // Combined log file: captures all log levels for comprehensive
    // audit trail and debugging in production
    transports.push(
      new winston.transports.File({
        filename: path.join(LOGS_DIR, 'combined.log'),
        format: productionFormat,
        maxsize: MAX_FILE_SIZE,
        maxFiles: MAX_FILES,
        handleExceptions: true
      })
    );
  }

  return transports;
}

// =============================================================================
// Logger Instance
// =============================================================================

/**
 * Configured Winston logger instance.
 *
 * Uses Winston's npm log levels which include the 'http' level required
 * for Morgan HTTP request logging integration. The logger is configured
 * with environment-aware transports and formatting.
 *
 * Exposed methods (matching npm levels):
 *   - logger.error(message, [metadata]) — Priority 0
 *   - logger.warn(message, [metadata])  — Priority 1
 *   - logger.info(message, [metadata])  — Priority 2
 *   - logger.http(message, [metadata])  — Priority 3
 *   - logger.debug(message, [metadata]) — Priority 5
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  levels: winston.config.npm.levels,
  transports: buildTransports(),
  exitOnError: false
});

// =============================================================================
// Module Export
// =============================================================================

module.exports = logger;
