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
