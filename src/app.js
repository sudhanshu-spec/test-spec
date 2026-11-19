/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * The request pipeline is registered in one fixed order, and that order is the
 * contract:
 * 1. CORS - the single configured browser origin
 * 2. JSON body parser - express.json()
 * 3. Route matcher - the tutorial routes at '/', then the JSON API at '/api'
 * 4. Authentication - router-level, inside the protected API routers
 * 5. Service handler - the handler of the matched route
 * 6. Error handler - the JSON error envelope, scoped to '/api'
 * 
 * @module src/app
 */

const cors = require('cors');
const express = require('express');
const config = require('./config');
const { mainRoutes, apiRoutes } = require('./routes');
const { notFound } = require('./middleware/not-found');
const { errorHandler } = require('./middleware/error-handler');

const app = express();

/**
 * Allow the single configured browser origin to call the application
 * The browser client is served from its own origin, so exactly one origin is
 * allowed; only the methods the API contract uses are advertised, and only the
 * two headers the API accepts.
 */
app.use(cors({ origin: config.corsOrigin, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));

/**
 * Parse JSON request bodies
 * A malformed body is rejected by the parser and handed to the API error
 * handler, which answers it as VALIDATION_ERROR.
 */
app.use(express.json());

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount the JSON API router under '/api'
 * Registered after the tutorial router, so the three greeting routes resolve
 * exactly as they did before the API existed.
 */
app.use('/api', apiRoutes);

/**
 * Terminate unmatched API paths and every API failure with the JSON envelope
 * Both are mounted under '/api' only: a path outside that mount point keeps
 * Express's own 404, and neither handler can answer a request the tutorial
 * router owns.
 */
app.use('/api', notFound);
app.use('/api', errorHandler);

module.exports = app;
