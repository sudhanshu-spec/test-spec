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
 */

'use strict';

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Enable case-sensitive routing so that '/Evening' and '/EVENING'
 * do not match the '/evening' route (Express 5.x defaults to false).
 */
app.set('case sensitive routing', true);

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

module.exports = app;
