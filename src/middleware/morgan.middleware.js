'use strict';

/**
 * @fileoverview Morgan HTTP Request Logging Middleware
 *
 * Configures Morgan HTTP request logger to pipe output through the Winston
 * logger's stream interface. Uses 'combined' format in production for
 * Apache-style access logs and 'dev' format in development for concise
 * colored output.
 *
 * This middleware is mounted in server.js (NOT in src/app.js) to keep
 * Supertest integration test output clean.
 *
 * @module src/middleware/morgan.middleware
 */

const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Select Morgan log format based on the application environment.
 * - 'combined': Apache combined log format for production
 * - 'dev': Concise colored output for development
 *
 * @type {string}
 */
const format = config.env === 'production' ? 'combined' : 'dev';

/**
 * Pre-configured Morgan middleware instance that streams HTTP request logs
 * through Winston at the 'http' log level.
 *
 * @type {import('express').RequestHandler}
 */
const morganMiddleware = morgan(format, {
  stream: logger.stream
});

module.exports = morganMiddleware;
