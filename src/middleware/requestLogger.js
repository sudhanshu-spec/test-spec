/**
 * @fileoverview HTTP Request Logger Middleware — Morgan/Winston Integration
 *
 * Configures a Morgan HTTP request logging middleware instance that pipes all
 * access log entries into the Winston structured logging pipeline at the 'http'
 * severity level, ensuring that HTTP request logs and application logs share
 * the same transports, formats, and destination sinks.
 *
 * Architecture:
 *   Incoming HTTP Request
 *     → Morgan middleware (generates 'combined' format log string)
 *       → stream.write(message)
 *         → logger.http(message.trim())
 *           → Winston transports (console, file)
 *
 * Format: Apache 'combined' log format providing:
 *   remote-addr, date, method, url, http-version, status,
 *   content-length, referrer, user-agent
 *
 * Stream pattern: A plain object with a write(message) method is passed to
 * Morgan via the { stream } option. Morgan calls stream.write() for each
 * request log entry. The write method trims the trailing newline that Morgan
 * appends and delegates to Winston's http() method.
 *
 * Consumed by: src/middleware/index.js as the final middleware in the
 * pipeline, applied after body parsers so that all incoming requests are
 * logged consistently.
 *
 * @module src/middleware/requestLogger
 */

'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Stream object for Morgan/Winston integration.
 * Morgan calls stream.write() with a formatted log string for each HTTP
 * request. The write method trims the trailing newline character that Morgan
 * appends to every log entry and forwards the cleaned message to Winston
 * at the 'http' severity level.
 *
 * @type {{ write: function(string): void }}
 */
const stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

/**
 * Configured Morgan middleware instance.
 *
 * Uses the 'combined' format which produces Apache Combined Log Format entries
 * containing: remote address, remote user, date/time, HTTP method, URL,
 * HTTP version, response status code, response content-length, referrer
 * header, and user-agent header.
 *
 * The stream option redirects Morgan's output from stdout to the Winston
 * logger via the stream object defined above, integrating HTTP access logs
 * into the application's unified structured logging pipeline.
 *
 * @type {import('express').RequestHandler}
 */
const requestLogger = morgan('combined', { stream });

module.exports = { requestLogger };
