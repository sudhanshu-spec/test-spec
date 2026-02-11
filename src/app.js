/**
 * Express Application Factory
 *
 * Initializes the Express 5.x application instance, registers the complete
 * middleware pipeline in the correct order, mounts route modules under their
 * versioned prefixes, and attaches error-handling middleware at the end.
 *
 * Middleware Registration Order (critical for correct behaviour):
 *   1. helmet()           — Security headers before any response
 *   2. cors()             — CORS preflight before routing
 *   3. compression()      — Compress responses before sending
 *   4. rateLimit()        — Throttle requests before processing
 *   5. express.json()     — Parse JSON request bodies
 *   6. express.urlencoded — Parse URL-encoded bodies
 *   7. httpLogger         — Log incoming requests (Morgan → Winston)
 *   8. routes             — Process route handlers
 *   9. notFound           — Catch unmatched routes (after routes)
 *  10. errorHandler       — Catch all errors (MUST be last)
 *
 * The app instance is exported for use by server.js (HTTP listener) and
 * potential test frameworks (supertest).
 *
 * @module app
 */

'use strict';

// ---------------------------------------------------------------------------
// External Dependencies
// ---------------------------------------------------------------------------

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// ---------------------------------------------------------------------------
// Internal Modules
// ---------------------------------------------------------------------------

const config = require('./config');
const routes = require('./routes');
const httpLogger = require('./middleware/httpLogger');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// ---------------------------------------------------------------------------
// Express Application Initialization
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Middleware Pipeline (order matters)
// ---------------------------------------------------------------------------

// 1. Security headers — set before any response body is sent
app.use(helmet());

// 2. CORS — handle cross-origin preflight requests before routing
app.use(cors({ origin: config.corsOrigin }));

// 3. Compression — gzip/deflate responses to reduce payload sizes
app.use(compression());

// 4. Rate limiting — throttle excessive requests per client
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 100,                  // limit each IP to 100 requests per window
    standardHeaders: true,     // return rate limit info in RateLimit-* headers
    legacyHeaders: false,      // disable X-RateLimit-* headers
  })
);

// 5. JSON body parser — built into Express 5.x
app.use(express.json());

// 6. URL-encoded body parser — built into Express 5.x
app.use(express.urlencoded({ extended: true }));

// 7. HTTP request logger — Morgan piping through Winston at 'http' level
app.use(httpLogger);

// ---------------------------------------------------------------------------
// Route Mounting
// ---------------------------------------------------------------------------

// 8. All API routes are mounted under the /api/v1 versioned prefix
app.use('/api/v1', routes);

// ---------------------------------------------------------------------------
// Error Handling (must be after routes)
// ---------------------------------------------------------------------------

// 9. 404 catch-all — handles any request that did not match a defined route
app.use(notFound);

// 10. Global error handler — MUST be the last middleware registered
app.use(errorHandler);

module.exports = app;
