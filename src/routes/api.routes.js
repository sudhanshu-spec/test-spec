'use strict';

/**
 * @fileoverview API Namespace Route Module
 *
 * This module defines the API namespace routes using Express Router.
 * Mounted at /api in app.js to establish a scalable routing hierarchy
 * for API endpoints.
 *
 * Route contracts:
 * - GET /status returns JSON { status: 'running', environment: config.env }
 *   (full path when mounted: GET /api/status)
 *
 * @module src/routes/api.routes
 */

const express = require('express');
const config = require('../config');

const router = express.Router();

/**
 * API status route handler
 * Returns JSON with application running status and current environment
 *
 * @route GET /status
 * @returns {{ status: string, environment: string }} JSON API status response
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    environment: config.env
  });
});

module.exports = router;
