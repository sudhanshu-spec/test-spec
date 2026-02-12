'use strict';

/**
 * Health Check Route Module
 *
 * Defines the GET /health endpoint for operational readiness monitoring.
 * Returns system status, process uptime, and timestamp in JSON format.
 * Enables PM2 health checks and load balancer monitoring.
 *
 * Route contracts:
 * - GET /health returns JSON { status: 'ok', uptime: <seconds>, timestamp: <ISO string> }
 *
 * @module src/routes/health.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Health check endpoint handler
 *
 * Returns a JSON response indicating the application is operational,
 * along with process uptime in seconds and current timestamp.
 *
 * @route GET /health
 * @returns {Object} JSON response with status, uptime, and timestamp
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
