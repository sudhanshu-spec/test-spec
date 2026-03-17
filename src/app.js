'use strict';

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

const express = require('express');
const { configureRoutes } = require('./routes');

const app = express();

/**
 * Configure and mount all application routes
 * Uses the barrel export pattern from src/routes/index.js
 * This enables adding new route modules without modifying this file
 * 
 * Registered routes:
 * - GET '/' -> Returns 'Hello, World!\n'
 * - GET '/evening' -> Returns 'Good evening'
 */
configureRoutes(app);

module.exports = app;
