/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It registers the whole request pipeline and never binds a socket: HTTP server
 * initialization and shutdown stay in server.js, so requiring this module from a
 * test, a tool or the server itself opens no port.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * The request pipeline is registered in one fixed order, and that order is the
 * contract:
 * 1. CORS - the single configured browser origin
 * 2. JSON body parser - express.json(), mounted for the API at '/api'
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
 * Remove the framework fingerprint
 * Express advertises itself with an X-Powered-By header on every response,
 * the API error envelopes included. Disabling the setting removes that header.
 * It is an Express setting rather than a pipeline stage, so no response body,
 * status or content type changes.
 */
app.disable('x-powered-by');

/**
 * Allow the single configured browser origin to call the application
 * The browser client is served from its own origin, so exactly one origin is
 * allowed; only the methods the API contract uses are advertised, and only the
 * two headers the API accepts.
 * A preflight OPTIONS request is answered here with 204 before routing, for
 * every path, so it never reaches a router or the API not-found handler.
 */
app.use(cors({ origin: config.corsOrigin, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));

/**
 * Parse JSON request bodies, under the API only
 * The API is the only surface that consumes a request body: the tutorial routes
 * answer fixed text and read nothing, so no other path ever has a body parsed. A
 * malformed API body is rejected by the parser and answered as VALIDATION_ERROR
 * by the API error handler, which is mounted under the same mount point. A path
 * outside '/api' never has its body read, so it keeps Express's own default 404
 * rather than a parser failure reaching Express's default error handler.
 */
app.use('/api', express.json());

/**
 * Mount main routes at root path
 * Registered first among the routers, so the three tutorial routes are resolved
 * before the API router sees the request and keep their exact bodies and
 * content types:
 * - GET '/' -> text/html, 'Hello, World!\n'
 * - GET '/evening' -> text/html, 'Good evening'
 * - GET '/good-evening' -> text/plain, 'Good evening'
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
