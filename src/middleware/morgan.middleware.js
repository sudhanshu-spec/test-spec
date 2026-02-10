'use strict';

/**
 * @fileoverview Morgan HTTP Request Logging Middleware
 *
 * Bridges Morgan HTTP request logger to Winston's structured logging
 * infrastructure via the stream interface. Automatically selects the
 * appropriate log format based on the application environment:
 * - 'combined' (Apache combined log format) in production for detailed
 *   access logs suitable for log aggregation and analysis
 * - 'dev' (concise colored output) in development for human-readable
 *   request logging during local development
 *
 * All HTTP request log entries are routed through Winston at the 'http'
 * log level, ensuring consistent formatting, transport routing, and
 * log-level filtering across the entire application.
 *
 * IMPORTANT: This middleware is mounted in server.js (NOT in src/app.js)
 * to keep Supertest integration test output clean. When Supertest creates
 * requests against the app factory directly, Morgan output is not emitted.
 *
 * @module src/middleware/morgan.middleware
 */

const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Select Morgan log format based on the current application environment.
 *
 * - 'combined': Standard Apache combined log format producing detailed entries
 *   including remote address, user, timestamp, method, URL, HTTP version,
 *   status code, content length, referrer, and user agent. Ideal for production
 *   log aggregation systems (ELK, Splunk, CloudWatch).
 *
 * - 'dev': Concise colored output showing method, URL, status code, response
 *   time, and content length. Ideal for local development readability.
 *
 * @type {string}
 */
const format = config.env === 'production' ? 'combined' : 'dev';

/**
 * Pre-configured Morgan middleware instance that streams all HTTP request
 * log output through the Winston logger at the 'http' log level.
 *
 * The stream option directs Morgan's output to logger.stream.write(),
 * which trims the trailing newline and forwards the message to
 * logger.http() for structured logging with timestamps and JSON formatting.
 *
 * Usage (in server.js):
 *   const morganMiddleware = require('./src/middleware/morgan.middleware');
 *   app.use(morganMiddleware);
 *
 * @type {import('express').RequestHandler}
 */
const morganMiddleware = morgan(format, {
  stream: logger.stream
});

module.exports = morganMiddleware;
