'use strict';

/**
 * @fileoverview Health Check Route Module
 * 
 * Defines the health-check endpoint for operational monitoring and
 * load-balancer readiness probes. Returns a JSON response containing
 * server status, process uptime, and current timestamp.
 * 
 * Route contract:
 * - GET '/' (mounted at /health by app.js) returns JSON status object
 * 
 * @module src/routes/health.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Health check endpoint handler
 * Returns JSON object with server health information
 * 
 * @route GET /health
 * @returns {Object} JSON object with status, uptime, and timestamp
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

module.exports = router;
