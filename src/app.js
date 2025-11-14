/**
 * Express Application Configuration
 * Creates and configures the Express application instance
 * @module app
 * @requires express
 */

const express = require('express');
const indexRoutes = require('./routes/index.routes');

/**
 * Create and configure Express application
 * @function createApp
 * @returns {express.Application} Configured Express application instance
 */
function createApp() {
  const app = express();
  
  // Mount application routes
  app.use('/', indexRoutes);
  
  return app;
}

module.exports = createApp();
