/**
 * UI Routes Module
 * 
 * This module handles routes for server-side rendered UI pages.
 * Uses EJS template engine to render HTML pages with dynamic data.
 * 
 * Routes:
 * - GET /       : Home page with greeting
 * - GET /evening: Evening themed page
 * 
 * @module src/routes/ui.routes
 */

'use strict';

const express = require('express');

/**
 * Express Router instance for UI routes
 * @type {express.Router}
 */
const router = express.Router();

/**
 * Home page route handler
 * Renders the index template with a greeting message.
 * 
 * @route GET /
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void}
 */
router.get('/', (req, res) => {
  res.render('index', { 
    greeting: 'Hello, World!',
    title: 'Home'
  });
});

/**
 * Evening page route handler
 * Renders the evening template with a themed greeting.
 * 
 * @route GET /evening
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void}
 */
router.get('/evening', (req, res) => {
  res.render('evening', { 
    greeting: 'Good evening',
    title: 'Evening'
  });
});

module.exports = router;
