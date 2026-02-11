/**
 * @fileoverview HTTP Request Logger Middleware
 *
 * This module creates and exports a Morgan HTTP request logging middleware
 * configured to stream log output through the Winston logger transport system.
 *
 * Format selection:
 * - Development: 'dev' format — concise, colorized output showing method, URL,
 *   status code, and response time
 * - Production: 'combined' format — Apache-style combined log format with
 *   remote address, user agent, and referrer fields
 *
 * Morgan output is directed to the Winston logger at the 'http' log level,
 * which sits between 'info' and 'verbose' in the Winston npm level hierarchy.
 *
 * @module src/middleware/requestLogger
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

// =============================================================================
// Stream Configuration
// =============================================================================

/**
 * Custom write stream that directs Morgan output to the Winston logger.
 * Morgan calls stream.write(message) for each HTTP request; we trim the
 * trailing newline that Morgan appends and log at the 'http' level.
 *
 * @type {{ write: (message: string) => void }}
 */
const stream = {
  write: (message) => {
    // Remove trailing newline that Morgan appends
    logger.http(message.trim());
  }
};

// =============================================================================
// Morgan Middleware Factory
// =============================================================================

/**
 * Determines the Morgan log format based on the current environment.
 * - 'dev' for development (concise, colorized)
 * - 'combined' for production (Apache combined log format)
 *
 * @returns {string} Morgan format string
 */
function getFormat() {
  const env = config.env || 'development';
  return env === 'development' ? 'dev' : 'combined';
}

/**
 * Configured Morgan HTTP request logging middleware.
 *
 * Streams formatted HTTP request/response metadata to the Winston logger
 * at the 'http' log level. Format is selected based on the current
 * NODE_ENV setting.
 *
 * @type {import('express').RequestHandler}
 */
const requestLogger = morgan(getFormat(), { stream });

// =============================================================================
// Module Export
// =============================================================================

module.exports = requestLogger;
