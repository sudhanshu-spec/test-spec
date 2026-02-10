/**
 * API Namespace Route Module
 * 
 * This module defines the API namespace routes using Express Router.
 * Mounted at /api in app.js to establish a scalable routing hierarchy
 * for API endpoints.
 * 
 * @module src/routes/api.routes
 */

const express = require('express');
const config = require('../config');

const router = express.Router();

/**
 * API status route handler
 * Returns JSON with application status and current environment
 * 
 * @route GET /api/status (mounted at /api in app.js, so internal path is /status)
 * @returns {{ status: string, environment: string }} JSON API status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    environment: config.env
  });
});

module.exports = router;
