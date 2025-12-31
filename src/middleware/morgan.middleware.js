/**
 * Morgan HTTP Request Logging Middleware Module
 * 
 * This module configures Morgan to pipe HTTP request logs to the Winston logger
 * for centralized logging. Uses 'combined' format for production and 'dev'
 * format for development.
 * 
 * Integration with Winston enables:
 * - HTTP access logs in the same log files as application logs
 * - Consistent log formatting across the application
 * - Environment-aware log verbosity
 * 
 * Usage in src/app.js:
 *   const morganMiddleware = require('./middleware/morgan.middleware');
 *   app.use(morganMiddleware);
 * 
 * @module src/middleware/morgan.middleware
 */

'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Custom stream object for Morgan to write to Winston
 * Uses the 'http' log level for HTTP request logs
 * 
 * @type {Object}
 */
const stream = {
  /**
   * Write function that pipes Morgan output to Winston
   * @param {string} message - The log message from Morgan
   */
  write: (message) => logger.http(message.trim())
};

/**
 * Determine Morgan format based on NODE_ENV
 * - 'combined': Apache combined log format for production (detailed)
 * - 'dev': Concise colored output for development
 * 
 * @type {string}
 */
const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

/**
 * Configured Morgan middleware instance
 * Pipes HTTP request logs to Winston logger using custom stream
 * 
 * @type {Function}
 */
const morganMiddleware = morgan(format, { stream });

module.exports = morganMiddleware;
