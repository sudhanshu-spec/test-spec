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
 * @module src/app
 * @requires express - Express framework for building web applications
 * @requires module:src/routes - Route aggregator using barrel pattern for centralized imports
 */

// =============================================================================
// Dependencies
// =============================================================================

// Import Express framework - the de facto standard Node.js web framework
// express is a minimal and flexible framework that provides robust features
// for web and mobile applications, including routing, middleware, and HTTP utilities
const express = require('express');

// Import routes using barrel pattern - allows single import for all route modules
// Destructuring { mainRoutes } from ./routes demonstrates the barrel export pattern
// This pattern centralizes route exports in routes/index.js for clean imports,
// enabling easy addition of new route modules without modifying this file
const { mainRoutes } = require('./routes');

// =============================================================================
// Application Factory
// =============================================================================

// Create Express application instance using factory pattern
// Factory pattern benefit: separates app configuration from server binding
// This enables unit testing without starting actual HTTP server, allowing
// tests to make requests against the app object directly using supertest
const app = express();

// =============================================================================
// Route Mounting
// =============================================================================

/**
 * Mount main routes at root path
 * 
 * Router mounting at root path means all routes defined in mainRoutes are
 * accessible from '/' - the base URL of the application.
 * 
 * Express middleware chain behavior:
 * - Requests first match the mount path ('/')
 * - Then Express passes the request to the router for further routing
 * - The router matches specific paths ('/', '/evening') defined in main.routes.js
 * 
 * Route contracts preserved:
 * - GET '/' -> mainRoutes handles this, responds with 'Hello, World!\n'
 * - GET '/evening' -> mainRoutes handles this, responds with 'Good evening'
 * 
 * @see module:src/routes/main.routes - Route handler implementations
 */
app.use('/', mainRoutes);

// =============================================================================
// Module Export
// =============================================================================

/**
 * Configured Express application instance
 * 
 * Exports the fully configured app for use by:
 * - server.js: Binds app to HTTP server with app.listen()
 * - Test harnesses: Allows integration testing without starting server
 * 
 * @exports module:src/app
 * @type {express.Application}
 */
// Export configured app for use by server.js and test harnesses
module.exports = app;
