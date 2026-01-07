/**
 * UI Page Routes Module
 * 
 * This module defines the UI page route handlers using Express Router.
 * Routes render EJS templates for server-side HTML page generation,
 * providing a visual web interface alongside the existing API endpoints.
 * 
 * Route contracts:
 * - GET '/' renders 'index.ejs' with { greeting: 'Hello, World!' }
 * - GET '/evening' renders 'evening.ejs' with { greeting: 'Good evening' }
 * 
 * This module serves HTML pages at the root namespace while main.routes.js
 * continues to serve plain text API responses under /api namespace.
 * 
 * @module src/routes/ui.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Home page route handler
 * Renders the index template with 'Hello, World!' greeting message
 * 
 * @route GET /
 * @returns {HTML} Rendered index.ejs template with greeting
 */
router.get('/', (req, res) => {
  res.render('index', { greeting: 'Hello, World!' });
});

/**
 * Evening page route handler
 * Renders the evening template with themed 'Good evening' greeting
 * 
 * @route GET /evening
 * @returns {HTML} Rendered evening.ejs template with themed greeting
 */
router.get('/evening', (req, res) => {
  res.render('evening', { greeting: 'Good evening' });
});

module.exports = router;
