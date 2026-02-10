/**
 * @fileoverview Structured Logger Configuration Module
 *
 * Configures and exports a singleton Winston logger instance with environment-aware
 * transports, custom severity levels, and timestamp formatting for unified
 * application logging across all layers.
 *
 * Severity levels (custom): error=0, warn=1, info=2, http=3, debug=4
 *
 * Transport configuration:
 * - Console transport: Always active
 *   - Development: Colorized, human-readable printf format
 *   - Production: JSON-structured format for log aggregation systems
 * - File transports: Active in non-test environments
 *   - logs/error.log: Error-level messages only
 *   - logs/combined.log: All log levels
 * - Test environment: Console-only at 'warn' level for clean test output
 *
 * Consumed by:
 * - middleware/requestLogger.js (Morgan stream integration via logger.stream)
 * - middleware/errorHandler.js (structured error logging)
 * - server.js (startup and shutdown logging)
 *
 * @module src/utils/logger
 */

'use strict';

const fs = require('fs');
const winston = require('winston');
const config = require('../config');

/**
 * Custom severity levels following npm convention with an http level added
 * for Morgan HTTP request logging integration.
 * Lower numeric values represent higher severity.
 * @type {Object<string, number>}
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

/**
 * Color mappings for each severity level used by the colorized console transport.
 * Applied only in non-production environments for developer readability.
 * @type {Object<string, string>}
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Register custom color mappings with Winston for colorize format support
winston.addColors(colors);

/**
 * Determine the active log level based on the current environment.
 * In the test environment, the level is forced to 'warn' to suppress
 * informational and debug output, keeping test runner output clean.
 * In all other environments, the configured logLevel from the config
 * module is used (defaults to 'info').
 *
 * @returns {string} The log level string to apply to the logger instance
 */
function getLogLevel() {
  if (config.env === 'test') {
    return 'warn';
  }
  return config.logLevel;
}

/**
 * Shared timestamp format applied across all transports for consistent
 * temporal ordering and readability in log output.
 * @type {winston.Logform.Format}
 */
const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });

/**
 * Human-readable printf format for development console output.
 * Renders timestamp, level, message, optional stack trace (for errors),
 * and any additional metadata properties as a JSON suffix.
 * @type {winston.Logform.Format}
 */
const devPrintFormat = winston.format.printf(function formatLogEntry(info) {
  const timestamp = info.timestamp;
  const level = info.level;
  const message = info.message;
  const stack = info.stack;

  if (stack) {
    return timestamp + ' [' + level + ']: ' + message + '\n' + stack;
  }
  return timestamp + ' [' + level + ']: ' + message;
});

/**
 * Build the console transport format based on the current environment.
 * Production uses JSON-structured output for compatibility with log
 * aggregation and analysis systems (ELK, CloudWatch, Datadog, etc.).
 * Non-production environments use colorized, human-readable printf format
 * for developer-friendly console output.
 *
 * @returns {winston.Logform.Format} Combined format for the console transport
 */
function buildConsoleFormat() {
  if (config.env === 'production') {
    return winston.format.combine(
      timestampFormat,
      winston.format.json()
    );
  }

  return winston.format.combine(
    winston.format.colorize({ all: true }),
    timestampFormat,
    devPrintFormat
  );
}

/**
 * Ensure the logs directory exists before file transports attempt to write.
 * Uses recursive mkdir to create the directory if it does not exist.
 * Gracefully handles errors (ENOENT, EACCES, EPERM) without crashing
 * the application — file transport error handlers provide a secondary
 * safety net for write failures.
 */
function ensureLogDirectory() {
  try {
    fs.mkdirSync('logs', { recursive: true });
  } catch (err) {
    // Gracefully swallow directory creation errors.
    // The application will continue to function with console-only logging
    // if the logs directory cannot be created (e.g., read-only filesystem).
    // File transport error handlers below provide additional resilience.
  }
}

/**
 * Build the complete array of Winston transports based on the current
 * environment configuration.
 *
 * - Console transport is always included with environment-appropriate formatting.
 * - File transports (error.log and combined.log) are added only in non-test
 *   environments to avoid filesystem side effects during test execution.
 * - File transports use JSON format for structured, machine-parseable log entries.
 * - Error handlers are attached to file transports for graceful degradation.
 *
 * @returns {winston.transport[]} Array of configured Winston transport instances
 */
function buildTransports() {
  const transports = [
    new winston.transports.Console({
      format: buildConsoleFormat()
    })
  ];

  // Add file transports only in non-test environments to prevent
  // filesystem interference during test runner execution
  if (config.env !== 'test') {
    ensureLogDirectory();

    // JSON format for file transports ensures structured, parseable log entries
    // compatible with log aggregation and monitoring tools
    const fileFormat = winston.format.combine(
      timestampFormat,
      winston.format.json()
    );

    // Error-only log file for rapid error triage and alerting
    const errorFileTransport = new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat
    });

    // Combined log file capturing all severity levels for comprehensive audit trails
    const combinedFileTransport = new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat
    });

    // Attach error handlers to file transports to prevent uncaught exceptions
    // from write failures (e.g., disk full, permission denied, missing directory)
    errorFileTransport.on('error', function handleErrorTransportFailure() {
      // Silently handle file transport write errors to prevent application crash
    });

    combinedFileTransport.on('error', function handleCombinedTransportFailure() {
      // Silently handle file transport write errors to prevent application crash
    });

    transports.push(errorFileTransport, combinedFileTransport);
  }

  return transports;
}

/**
 * Singleton Winston logger instance configured with custom severity levels,
 * environment-aware transports, and structured formatting.
 *
 * The base format applies timestamp, error stack trace handling, and splat
 * interpolation to all log entries before they reach individual transports.
 * Each transport then applies its own format (colorized printf or JSON).
 *
 * Log level is driven by config.logLevel (defaults to 'info').
 * In test environments, log level is overridden to 'warn' to minimize noise.
 *
 * exitOnError is set to false to prevent the logger from terminating the
 * process on transport errors, supporting graceful degradation.
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  levels: levels,
  format: winston.format.combine(
    timestampFormat,
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  transports: buildTransports(),
  exitOnError: false
});

/**
 * Stream interface for Morgan HTTP request logging integration.
 * Morgan writes HTTP request log strings to this stream, which pipes them
 * into Winston at the 'http' severity level for unified log management.
 *
 * Usage in middleware/requestLogger.js:
 *   morgan('combined', { stream: logger.stream })
 *
 * @type {{ write: function(string): void }}
 */
logger.stream = {
  /**
   * Write method called by Morgan with each HTTP request log entry.
   * Trims trailing newline before passing to Winston's http level.
   *
   * @param {string} message - The formatted HTTP request log string from Morgan
   */
  write: function write(message) {
    logger.http(message.trim());
  }
};

module.exports = logger;
