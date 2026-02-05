/**
 * HTTP Request Logging Middleware Module
 * 
 * This module configures Morgan HTTP request logger to stream logs
 * to Winston for unified logging infrastructure.
 * 
 * Morgan automatically logs details of incoming HTTP requests:
 * - Remote IP address
 * - Request method (GET, POST, etc.)
 * - URL path
 * - HTTP version
 * - Response status code
 * - Response time
 * - User agent
 * 
 * Log formats:
 * - 'combined': Apache combined log format (default for production)
 * - 'dev': Colorized concise format for development
 * - 'common', 'short', 'tiny': Other available formats
 * 
 * Usage in app.js:
 *   const { morganMiddleware } = require('./middleware');
 *   app.use(morganMiddleware);
 * 
 * @module src/middleware/logging.middleware
 */

'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Determine Morgan format based on environment
 * Use 'dev' format in development for concise, colorized output
 * Use configured format (default: 'combined') in production
 * 
 * @type {string}
 */
const format = config.env === 'development' ? 'dev' : config.logFormat;

/**
 * Morgan HTTP Request Logging Middleware
 * 
 * Streams HTTP request logs to Winston logger.
 * Skips logging in test environment to avoid polluting test output.
 * 
 * @type {Function}
 */
const morganMiddleware = morgan(format, {
  /**
   * Stream Morgan output to Winston logger
   */
  stream: logger.stream,
  
  /**
   * Skip logging in test environment
   * This prevents HTTP logs from cluttering test output
   * 
   * @returns {boolean} True to skip logging
   */
  skip: () => config.env === 'test'
});

module.exports = {
  morganMiddleware
};
