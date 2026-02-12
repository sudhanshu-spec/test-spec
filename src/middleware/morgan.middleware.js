'use strict';

/**
 * Morgan HTTP Request Logger Middleware
 *
 * Configures Morgan to pipe HTTP request logs through Winston's stream
 * interface for unified centralized logging. Uses environment-aware format
 * selection: 'combined' (Apache-style) in production, 'dev' (colorized concise)
 * in development.
 *
 * @module src/middleware/morgan.middleware
 */

const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Morgan log format based on environment.
 * - Production: 'combined' for Apache-style access logs
 * - Development/other: 'dev' for colorized concise output
 *
 * @type {string}
 */
const format = config.env === 'production' ? 'combined' : 'dev';

/**
 * Pre-configured Morgan HTTP request logging middleware.
 * All request log entries are piped through the Winston logger's
 * http() level via the logger.stream object.
 *
 * @type {import('express').RequestHandler}
 */
const morganMiddleware = morgan(format, {
  stream: logger.stream
});

module.exports = morganMiddleware;
