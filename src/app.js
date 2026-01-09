/**
 * Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 *
 * Design Pattern: Factory Pattern
 * --------------------------------
 * This module implements the Factory pattern by creating and configuring
 * an Express application instance. The key benefits of this approach include:
 *
 * 1. **Testability**: The configured app can be imported directly by test
 *    frameworks (e.g., supertest) without spinning up an HTTP server,
 *    allowing fast, isolated unit and integration tests.
 *
 * 2. **Separation of Concerns**: Application configuration (middleware,
 *    routes) is decoupled from server lifecycle management (listening,
 *    graceful shutdown), making each concern easier to maintain.
 *
 * 3. **Reusability**: The same app instance can be used in different
 *    contexts (development server, test runner, serverless functions).
 *
 * @module src/app
 * @requires express
 * @requires ./routes
 *
 * @example
 * // Import the configured Express application
 * const app = require('./src/app');
 *
 * // Start server manually (as done in server.js)
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 *
 * @example
 * // Use with supertest for testing without starting a server
 * const request = require('supertest');
 * const app = require('./src/app');
 *
 * request(app)
 *   .get('/')
 *   .expect(200)
 *   .expect('Hello, World!')
 *   .end((err, res) => {
 *     if (err) throw err;
 *   });
 *
 * @exports {Express.Application} Configured Express application instance
 */

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Express framework for HTTP request handling.
 * @type {Function}
 */
const express = require('express');

/**
 * Import mainRoutes using destructuring from the routes barrel module.
 * 
 * Design Decision: Barrel Pattern Import
 * --------------------------------------
 * The destructuring syntax `{ mainRoutes }` aligns with the barrel export
 * pattern implemented in src/routes/index.js. This approach provides:
 * 
 * 1. **Consistent API**: All route modules are exported as named exports
 *    from a single index file, ensuring predictable import patterns.
 * 
 * 2. **Scalability**: As the application grows, additional route modules
 *    (e.g., apiRoutes, authRoutes) can be added to the barrel without
 *    changing existing import statements.
 * 
 * 3. **Encapsulation**: Internal route file structure (main.routes.js) is
 *    hidden behind the barrel, allowing refactoring without breaking imports.
 * 
 * @see module:src/routes
 */
const { mainRoutes } = require('./routes');

// ---------------------------------------------------------------------------
// Application Initialization
// ---------------------------------------------------------------------------

/**
 * Create Express application instance.
 * @type {Express.Application}
 */
const app = express();

// ---------------------------------------------------------------------------
// Route Configuration
// ---------------------------------------------------------------------------

/**
 * Mount main routes at the application root path.
 *
 * Design Decision: Root Path Mounting ('/')
 * -----------------------------------------
 * Routes are mounted at the root path '/' for the following reasons:
 *
 * 1. **URL Simplicity**: Endpoints remain clean and intuitive:
 *    - GET / -> Returns "Hello, World!"
 *    - GET /evening -> Returns "Good evening"
 *    Instead of nested paths like /api/main/ or /v1/.
 *
 * 2. **RESTful Conventions**: For a simple greeting service, root-level
 *    mounting follows REST principles where the resource hierarchy
 *    reflects the URL structure directly.
 *
 * 3. **Separation of Concerns**: This file (app.js) handles WHERE routes
 *    are mounted (the mount point), while main.routes.js handles WHAT
 *    the routes do (handler logic). This separation allows changing
 *    the mount point without modifying route handler code.
 *
 * Future Enhancement: To add API versioning, routes could be mounted at
 * '/v1/' while keeping route handler definitions unchanged:
 *   app.use('/v1', mainRoutes);
 *
 * @see module:src/routes/main.routes for route handler implementations
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

/**
 * Export the configured Express application instance.
 *
 * The exported app is ready to be:
 * - Started with app.listen() in server.js for production/development
 * - Used directly with supertest or similar tools for testing
 * - Wrapped by serverless adapters for cloud function deployment
 *
 * @exports module:src/app
 * @type {Express.Application}
 */
module.exports = app;
