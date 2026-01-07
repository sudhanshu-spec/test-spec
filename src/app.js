/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * The application serves two types of routes:
 * 
 * UI Routes (root namespace) - Render EJS templates for HTML pages:
 *   - GET /         -> Renders views/index.ejs with "Hello, World!" greeting
 *   - GET /evening  -> Renders views/evening.ejs with themed "Good evening" greeting
 * 
 * API Routes (/api namespace) - Return plain text responses for backward compatibility:
 *   - GET /api/         -> Returns "Hello, World!\n" (text/plain)
 *   - GET /api/evening  -> Returns "Good evening" (text/plain)
 * 
 * Static assets (CSS, JS, images) are served from the public/ directory:
 *   - /css/styles.css   -> public/css/styles.css
 *   - /css/evening.css  -> public/css/evening.css
 *   - /js/main.js       -> public/js/main.js
 *   - /images/*         -> public/images/*
 * 
 * Middleware and route mounting order:
 *   1. Static file middleware (serves assets from public/)
 *   2. UI routes at root namespace (HTML page rendering)
 *   3. API routes at /api namespace (plain text responses)
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 */

'use strict';

const express = require('express');
const path = require('path');
const { mainRoutes, uiRoutes } = require('./routes');

const app = express();

/**
 * Configure EJS as the view engine for server-side rendering.
 * EJS templates are stored in the views directory.
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

/**
 * Serve static files from the public directory.
 * This enables serving CSS, JavaScript, and images via URLs like:
 * - /css/styles.css
 * - /js/main.js
 * - /images/*
 */
app.use(express.static(path.join(__dirname, '../public')));

/**
 * Mount UI routes at root path for server-rendered pages.
 * - GET '/' -> renders index.ejs
 * - GET '/evening' -> renders evening.ejs
 */
app.use('/', uiRoutes);

/**
 * Mount API routes at /api path for backward compatibility.
 * This preserves the original text-based responses:
 * - GET '/api/' -> returns 'Hello, World!\n'
 * - GET '/api/evening' -> returns 'Good evening'
 */
app.use('/api', mainRoutes);

module.exports = app;
