/**
 * @fileoverview Health Check Route Module
 *
 * This module defines the health check endpoint used by PM2, load balancers,
 * and monitoring tools to verify that the application is running and responsive.
 *
 * Route contract:
 * - GET /health returns JSON { status: 'ok', uptime, timestamp, environment }
 *   with HTTP 200 and Content-Type: application/json
 *
 * @module src/routes/health.routes
 */

'use strict';

const express = require('express');

const router = express.Router();

/**
 * Health check endpoint handler
 *
 * Returns a JSON object with application health status including:
 * - status: Always 'ok' when the server is responsive
 * - uptime: Process uptime in seconds (from process.uptime())
 * - timestamp: Current ISO 8601 timestamp
 * - environment: Current NODE_ENV value
 *
 * @route GET /health
 * @returns {Object} Health status JSON response
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
