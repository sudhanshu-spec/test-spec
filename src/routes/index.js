/**
 * Route Aggregator Module (Barrel Pattern)
 *
 * This module implements the Barrel Pattern (also known as the Index/Aggregator Pattern)
 * for route re-exports. The barrel pattern enables clean, centralized imports by
 * aggregating multiple module exports into a single entry point.
 *
 * ## Barrel Pattern Benefits:
 * - **Clean Imports**: Parent modules can import from './routes' instead of './routes/main.routes'
 * - **Encapsulation**: Internal route file structure can change without affecting consumers
 * - **Discoverability**: All available routes are documented in one place
 * - **Stable API**: Export names remain consistent even if file names change
 *
 * ## Node.js Module System Context:
 * This module uses CommonJS `require()` semantics, which are synchronous at
 * module-evaluation time. When src/app.js requires this module, all route
 * modules are loaded and cached by Node.js before the application starts.
 *
 * ## Extensibility - Adding New Route Modules:
 * To add a new route module to this aggregator:
 *
 * 1. Create the new route file (e.g., './api.routes.js')
 * 2. Import it in this file:
 *    ```javascript
 *    const apiRoutes = require('./api.routes');
 *    ```
 * 3. Add to the exports object:
 *    ```javascript
 *    module.exports = {
 *      mainRoutes,
 *      apiRoutes  // Add new route export
 *    };
 *    ```
 * 4. Mount in src/app.js:
 *    ```javascript
 *    const { mainRoutes, apiRoutes } = require('./routes');
 *    app.use('/', mainRoutes);
 *    app.use('/api', apiRoutes);
 *    ```
 *
 * @module src/routes
 * @see module:src/routes/main.routes - Main application routes (GET /, GET /evening)
 *
 * @exports {Object} exports - Named exports object containing all route modules
 * @exports {express.Router} exports.mainRoutes - Main application router handling root endpoints
 *
 * @example
 * // Standard destructuring import pattern (recommended)
 * // This import is synchronous - all routes are loaded at require time
 * const { mainRoutes } = require('./routes');
 *
 * // Mount the router on the Express application
 * app.use('/', mainRoutes);
 *
 * // The above is equivalent to:
 * // const routes = require('./routes');
 * // app.use('/', routes.mainRoutes);
 *
 * @example
 * // Importing multiple route modules (future extensibility)
 * const { mainRoutes, apiRoutes } = require('./routes');
 * app.use('/', mainRoutes);
 * app.use('/api', apiRoutes);
 */

// ---------------------------------------------------------------------------
// Route Module Imports
// ---------------------------------------------------------------------------
// Synchronous require() at module-evaluation time ensures all route handlers
// are loaded and cached by Node.js before the application starts listening.
// This provides deterministic startup behavior and enables early error detection
// if any route module fails to load.
const mainRoutes = require('./main.routes');

// ---------------------------------------------------------------------------
// Named Exports (Stable API Contract)
// ---------------------------------------------------------------------------
// Using named exports provides a stable API for consumers. Even if the internal
// file structure changes (e.g., renaming main.routes.js to primary.routes.js),
// the export name 'mainRoutes' remains constant, preventing breaking changes
// in consuming modules like src/app.js.
//
// Export Shape:
// {
//   mainRoutes: express.Router  // Router handling GET '/' and GET '/evening'
// }
module.exports = {
  mainRoutes
};
