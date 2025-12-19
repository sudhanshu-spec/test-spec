/**
 * Request Logger Middleware
 * 
 * Morgan HTTP request logging middleware configured to stream logs to Winston logger.
 * Provides HTTP request logging functionality including method, URL, status code,
 * response time, and content length.
 * 
 * @module middleware/requestLogger
 * @requires morgan
 * @requires ../utils/logger
 */

'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Stream object for Morgan to Winston integration
 * Morgan writes log messages to this stream, which pipes them to Winston's http level
 * 
 * @type {Object}
 * @property {Function} write - Function that receives log messages from Morgan
 */
const stream = {
  write: (message) => {
    // Remove trailing newline that Morgan adds
    const trimmedMessage = message.trim();
    logger.http(trimmedMessage);
  }
};

/**
 * Determine the Morgan format based on environment
 * - 'combined': Full Apache-style logs for production (detailed for log analysis)
 * - 'dev': Concise colored output for development (easy to read in terminal)
 * 
 * @type {string}
 */
const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

/**
 * Morgan middleware configured with Winston stream
 * 
 * Logs HTTP requests with the following information:
 * - Combined format: remote-addr, remote-user, date, method, url, HTTP version, 
 *   status, res[content-length], referrer, user-agent
 * - Dev format: method, url, status, response-time, res[content-length]
 * 
 * @type {Function}
 * @example
 * // Usage in server.js
 * const requestLogger = require('./middleware/requestLogger');
 * app.use(requestLogger);
 */
const requestLogger = morgan(format, { stream });

module.exports = requestLogger;
