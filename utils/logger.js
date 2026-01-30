/**
 * Winston Logger Module
 * 
 * Provides a structured logging interface for the application with multiple transports:
 * - Console transport: Colorized output for all environments (development-friendly)
 * - File transports: JSON-formatted logs for production (error.log and combined.log)
 * 
 * Configuration via environment variables:
 * - LOG_LEVEL: Minimum log level to record (default: 'info')
 * - LOG_DIR: Directory for log files (default: './logs')
 * - NODE_ENV: Determines environment-specific formatting
 * 
 * Supported log levels (in order of priority):
 * - error: Error conditions requiring immediate attention
 * - warn: Warning conditions that may require attention
 * - info: Informational messages about normal operation
 * - http: HTTP request logging (used by Morgan middleware)
 * - debug: Detailed debug information for development
 * 
 * @module utils/logger
 */

'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Configuration from environment variables with sensible defaults
const logDir = process.env.LOG_DIR || './logs';
const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * Ensure the log directory exists
 * Creates the directory recursively if it doesn't exist
 */
const ensureLogDirectory = () => {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    // If we can't create the log directory, log to console and continue
    // The file transports will fail gracefully
    console.error(`Warning: Unable to create log directory '${logDir}': ${error.message}`);
  }
};

// Ensure log directory exists before creating file transports
ensureLogDirectory();

/**
 * Custom log levels including 'http' for Morgan middleware integration
 * Winston default levels don't include 'http', so we define custom levels
 */
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'cyan'
  }
};

// Apply custom colors to Winston
winston.addColors(customLevels.colors);

/**
 * Base format for all log entries
 * Includes timestamp, error stack traces, and JSON structure
 */
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true })
);

/**
 * JSON format for file transports and production console
 * Provides structured logs suitable for log aggregation tools
 */
const jsonFormat = winston.format.combine(
  baseFormat,
  winston.format.json()
);

/**
 * Console format for development
 * Provides human-readable, colorized output
 */
const consoleFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Include stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Include additional metadata if present
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    return log;
  })
);

/**
 * Create transport array based on environment
 * All environments get console transport
 * All environments get file transports (for persistent logging)
 */
const createTransports = () => {
  const transports = [];

  // Console transport for all environments
  // Uses colorized format in development, JSON in production
  transports.push(
    new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );

  // File transports for persistent logging
  // These are created for all environments to ensure logs are captured
  
  // Error log - captures only error level logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Combined log - captures all logs at or above the configured level
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  return transports;
};

/**
 * Winston Logger Instance
 * 
 * Creates a singleton logger with:
 * - Custom log levels including 'http' for HTTP request logging
 * - Multiple transports (Console + File)
 * - JSON format for structured logging
 * - Timestamp on all entries
 * - Stack traces for errors
 * 
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: logLevel,
  levels: customLevels.levels,
  format: baseFormat,
  transports: createTransports(),
  exitOnError: false // Do not exit on handled exceptions
});

/**
 * Stream object for Morgan HTTP request logging integration
 * Morgan can use this stream to write HTTP request logs via Winston
 * 
 * @type {Object}
 * @property {Function} write - Write function that logs at 'http' level
 */
logger.stream = {
  write: (message) => {
    // Remove trailing newline that Morgan adds
    const trimmedMessage = message.trim();
    logger.http(trimmedMessage);
  }
};

/**
 * Log application startup information
 * Useful for debugging configuration issues
 */
logger.info('Logger initialized', {
  level: logLevel,
  environment: nodeEnv,
  logDirectory: path.resolve(logDir)
});

/**
 * Export the configured logger instance
 * 
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Application started');
 *   logger.error('Error occurred', { error: err });
 *   logger.warn('Warning message');
 *   logger.debug('Debug information');
 *   logger.http('HTTP request logged');
 * 
 * @exports logger
 */
module.exports = logger;
