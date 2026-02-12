/**
 * CORS Middleware Configuration
 *
 * This module configures and exports the CORS (Cross-Origin Resource Sharing)
 * middleware instance with environment-driven origin whitelisting. It is mounted
 * as the SECOND middleware in the Express middleware chain, after Helmet,
 * to handle preflight OPTIONS requests before rate limiting.
 *
 * Configuration follows the principle of least privilege — restricts cross-origin
 * access to known origins rather than allowing open access.
 *
 * Environment configuration:
 * - CORS_ORIGIN: Override the default allowed origin (default: 'http://localhost:3000')
 *
 * @module src/middleware/cors
 */

'use strict';

const cors = require('cors');
const config = require('../config');

/**
 * Configured CORS middleware instance with restrictive origin policy.
 *
 * Options:
 * - origin: Restricted to config.corsOrigin (env-driven, default 'http://localhost:3000')
 * - methods: Limited to standard HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
 * - allowedHeaders: Only Content-Type and Authorization headers permitted
 * - credentials: Enabled for cookie and authentication support
 * - optionsSuccessStatus: 200 for legacy browser compatibility
 *
 * @type {import('express').RequestHandler}
 */
const corsMiddleware = cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
});

module.exports = corsMiddleware;
