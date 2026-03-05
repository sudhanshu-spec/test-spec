/**
 * Main Application Routes Module
 * 
 * @fileoverview Defines the main route handler definitions using Express Router.
 * Routes are extracted from original server.js lines 8-14 with exact
 * behavioral preservation.
 * 
 * Route contracts preserved:
 * - GET '/' returns 'Hello, World!\n' (with trailing newline)
 * - GET '/evening' returns 'Good evening' (no trailing newline)
 * 
 * @module src/routes/main.routes
 */

'use strict';

const express = require('express');

/** @type {import('express').Router} */
const router = express.Router();

/**
 * Root route handler
 * Responds with 'Hello, World!\n' - exact match to original server.js line 9
 * 
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening route handler
 * Responds with 'Good evening' - exact match to original server.js line 13
 * 
 * @route GET /evening
 * @returns {string} 'Good evening'
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

module.exports = router;
