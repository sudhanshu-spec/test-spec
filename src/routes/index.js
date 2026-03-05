/**
 * Route Aggregator Module
 * 
 * @fileoverview Barrel export aggregator that centralizes all route module exports
 * for clean, single-point imports by the Express application factory. This module
 * serves as the central route registry, allowing src/app.js to import all routes
 * with a single require statement.
 * 
 * Usage in src/app.js:
 *   const { mainRoutes } = require('./routes');
 *   app.use('/', mainRoutes);
 * 
 * @module src/routes
 */

'use strict';

const mainRoutes = require('./main.routes');

module.exports = {
  mainRoutes
};
