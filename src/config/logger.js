/**
 * Winston Logger Factory
 *
 * Creates and exports a configured Winston logger instance with:
 *   - Custom log levels: error (0), warn (1), info (2), http (3), debug (4)
 *   - Environment-aware formatting:
 *       • Production: structured JSON for log aggregation systems
 *       • Development: colorized pretty-print for terminal readability
 *   - Multiple transports:
 *       • Console transport (always active)
 *       • File transport for error-level logs (logs/error.log)
 *       • File transport for all-level logs (logs/combined.log)
 *
 * This module is the single log destination for the entire application.
 * All other modules (middleware, routes, server) import this logger rather
 * than creating their own Winston instances or writing to stdout directly.
 *
 * Consumers:
 *   - src/middleware/httpLogger.js  → logger.http() via Morgan stream
 *   - src/middleware/errorHandler.js → logger.error(), logger.warn()
 *   - src/server.js                 → logger.info() for startup/shutdown
 *
 * @module config/logger
 */

'use strict';

const winston = require('winston');
const config = require('./index');

// ---------------------------------------------------------------------------
// Custom Log Levels and Colors
// ---------------------------------------------------------------------------
// Extending the default syslog-style levels with an 'http' level at priority 3
// to capture Morgan HTTP request logs at a dedicated severity between 'info'
// and 'debug'. Lower numeric value = higher priority.
// ---------------------------------------------------------------------------

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Register custom colors so winston.format.colorize() can apply them
winston.addColors(colors);

// ---------------------------------------------------------------------------
// Format Configuration
// ---------------------------------------------------------------------------
// Production: structured JSON with ISO-8601 timestamps for machine parsing
// Development: human-readable colorized output with HH:mm:ss timestamps
// ---------------------------------------------------------------------------

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const isProduction = config.nodeEnv === 'production';
const selectedFormat = isProduction ? productionFormat : developmentFormat;

// ---------------------------------------------------------------------------
// Transport Configuration
// ---------------------------------------------------------------------------
// Console transport is always active for stdout visibility (PM2 collects
// stdout/stderr). File transports write to the logs/ directory for persistent
// storage and post-mortem analysis.
// ---------------------------------------------------------------------------

const transports = [
  // Console transport — always active
  new winston.transports.Console(),

  // Error-level file transport — captures only error-severity messages
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),

  // Combined file transport — captures all log levels
  new winston.transports.File({
    filename: 'logs/combined.log',
  }),
];

// ---------------------------------------------------------------------------
// Logger Instance
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  // Use the configured log level from environment, falling back to
  // 'info' in production (less verbose) or 'debug' in development
  // (maximum verbosity) when LOG_LEVEL is not explicitly set.
  level: config.logLevel || (isProduction ? 'info' : 'debug'),
  levels,
  format: selectedFormat,
  transports,
});

module.exports = logger;
