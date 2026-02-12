'use strict';

/**
 * Health Check Routes Module
 *
 * This module defines the health check endpoint using Express Router.
 * The endpoint is used by PM2, load balancers, and production readiness
 * probes to determine instance availability.
 *
 * Route contract:
 * - GET /health returns JSON { status: 'ok', uptime: <seconds>, timestamp: <ms> }
 *
 * @module src/routes/health.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Health check route handler
 * Returns JSON with application status, process uptime, and current timestamp.
 *
 * @route GET /health
 * @returns {Object} JSON response with status, uptime, and timestamp
 * @returns {string} response.status - Application status ('ok')
 * @returns {number} response.uptime - Process uptime in seconds
 * @returns {number} response.timestamp - Current time in milliseconds since epoch
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

module.exports = router;
