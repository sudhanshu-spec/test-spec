/**
 * Express Application Configuration Module
 *
 * This module implements the Factory Pattern for Express application initialization.
 * It creates and configures an Express application instance with all route middleware
 * mounted, but without calling `listen()` to bind an HTTP server. This separation of
 * concerns enables both production consumption (from `server.js`, which handles HTTP
 * server binding) and test consumption (via supertest, which can make requests against
 * the app instance directly without starting a server).
 *
 * The Factory Pattern applied here ensures that:
 * - Application configuration is decoupled from server lifecycle management
 * - The same app instance can be used in integration tests without port conflicts
 * - Route mounting and middleware configuration happen in a single, predictable location
 *
 * @module src/app
 * @requires express
 * @requires module:src/routes
 * @returns {express.Application} Fully configured Express application instance with routes mounted
 *
 * @example <caption>Production usage in server.js</caption>
 * const app = require('./src/app');
 * const config = require('./src/config');
 * app.listen(config.port, config.host);
 *
 * @example <caption>Test usage with supertest</caption>
 * const app = require('../src/app');
 * const request = require('supertest');
 * const response = await request(app).get('/');
 *
 * @see module:server — Consumes this module to bind the HTTP server
 * @see module:src/routes — Provides the aggregated route middleware mounted here
 */

/** @requires express - Express 5.1.0 web framework for HTTP server capabilities */
const express = require('express');

/**
 * @requires module:src/routes
 * @type {express.Router} mainRoutes - Pre-configured Express Router aggregated via Barrel Pattern
 */
const { mainRoutes } = require('./routes');

/**
 * Express application instance created via Factory Pattern.
 * Configured with route middleware but without HTTP server binding.
 * @type {express.Application}
 */
const app = express();

/**
 * Mount the main route middleware at the application root path.
 * Mounting at '/' preserves the original route paths defined in the router,
 * so handlers registered on mainRoutes respond at their defined paths
 * relative to the application root:
 * - GET '/' -> mainRoutes handles this (responds with 'Hello, World!\n')
 * - GET '/evening' -> mainRoutes handles this (responds with 'Good evening')
 */
app.use('/', mainRoutes);

/**
 * Export the configured Express application instance.
 * Node.js module caching ensures all consumers receive the same app instance.
 * @type {express.Application}
 */
module.exports = app;
