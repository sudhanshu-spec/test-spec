/**
 * Morgan-to-Winston HTTP Request Logger Middleware
 *
 * Bridges Morgan's HTTP request logging output into the Winston transport
 * pipeline, ensuring all HTTP access logs flow through the same structured
 * logging system as application-level logs. Morgan writes each log line to
 * a custom stream that calls logger.http(), directing output to Winston's
 * 'http' severity level (level 3).
 *
 * Format selection:
 *   - Production:  'combined' — full Apache-style access log
 *   - Development: 'dev'      — concise colored status-based output
 *
 * Skip logic:
 *   - In the 'test' environment, HTTP request logging is suppressed to
 *     reduce noise in test runner output.
 *
 * This middleware is registered in app.js at position 7 in the middleware
 * pipeline (after body parsers, before route handlers).
 *
 * @module middleware/httpLogger
 */

'use strict';

const morgan = require('morgan');
const logger = require('../config/logger');

// ---------------------------------------------------------------------------
// Custom Write Stream for Winston Integration
// ---------------------------------------------------------------------------
// Morgan writes each completed request as a single-line string. The custom
// stream pipes that string to Winston's logger.http() method after trimming
// the trailing newline that Morgan appends.
// ---------------------------------------------------------------------------

const stream = {
  write: (message) => logger.http(message.trim()),
};

// ---------------------------------------------------------------------------
// Skip Logic
// ---------------------------------------------------------------------------
// Suppress HTTP request logs during test execution to keep test output clean.
// ---------------------------------------------------------------------------

const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'test';
};

// ---------------------------------------------------------------------------
// Morgan Middleware Instance
// ---------------------------------------------------------------------------
// Use 'combined' format in production for comprehensive Apache-style logs,
// and 'dev' format in development for concise colored output.
// ---------------------------------------------------------------------------

const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

const morganMiddleware = morgan(format, { stream, skip });

module.exports = morganMiddleware;
