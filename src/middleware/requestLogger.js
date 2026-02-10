/**
 * HTTP Request Logger Middleware
 * 
 * This module configures Morgan HTTP request logging middleware with
 * Winston stream integration for unified logging. All HTTP request
 * logs are piped through Winston at the 'http' severity level.
 * 
 * Format: 'combined' - Standard Apache combined log format
 * Stream: Winston logger stream interface
 * 
 * @module src/middleware/requestLogger
 */

'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Configured Morgan middleware instance
 * Uses 'combined' format for comprehensive HTTP request logging
 * Streams output to Winston logger at 'http' level via logger.stream
 * 
 * @type {import('express').RequestHandler}
 */
const requestLogger = morgan('combined', {
  stream: logger.stream
});

module.exports = {
  requestLogger
};
