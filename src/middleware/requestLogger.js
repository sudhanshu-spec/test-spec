'use strict';

/**
 * HTTP Request Logging Middleware
 *
 * Morgan middleware instance configured with a Winston write stream for
 * structured HTTP access logging. Bridges Morgan's HTTP request logging
 * with Winston's transport system, enabling HTTP access logs to flow
 * through the same structured logging pipeline as application logs.
 *
 * Format selection:
 * - Development: 'dev' format (concise, colorized output)
 * - Production: 'combined' format (full Apache-style access logs)
 *
 * @module src/middleware/requestLogger
 */

const morgan = require('morgan');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Custom write stream that pipes Morgan log output through Winston.
 * Trims trailing newlines from Morgan messages before logging at info level.
 *
 * @type {{ write: (message: string) => void }}
 */
const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

/**
 * Morgan log format based on environment.
 * - 'combined': Full Apache-style access logs for production log aggregation
 * - 'dev': Concise colorized output for development readability
 *
 * @type {string}
 */
const format = config.nodeEnv === 'production' ? 'combined' : 'dev';

/**
 * Configured Morgan middleware instance.
 * Logs every HTTP request with method, URL, status, and response time
 * through the Winston transport system.
 *
 * @type {import('express').RequestHandler}
 */
const requestLogger = morgan(format, { stream });

module.exports = requestLogger;
