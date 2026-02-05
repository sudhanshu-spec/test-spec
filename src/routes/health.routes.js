/**
 * Health Check Routes Module
 * 
 * This module defines the health check endpoint using Express Router.
 * Provides system status information for PM2 process manager and
 * load balancer health monitoring.
 * 
 * Route contracts:
 * - GET '/' returns JSON with status, timestamp, and uptime
 *   (mounted at /health in app.js)
 * 
 * Usage:
 *   curl http://localhost:3000/health
 *   # Returns: { "status": "ok", "timestamp": "...", "uptime": 123.456 }
 * 
 * @module src/routes/health.routes
 */

'use strict';

const express = require('express');

const router = express.Router();

/**
 * Health check route handler
 * Returns system health status for monitoring
 * 
 * Response:
 * - status: 'ok' indicates the application is healthy
 * - timestamp: ISO 8601 formatted current time
 * - uptime: Process uptime in seconds
 * 
 * @route GET /health
 * @returns {Object} JSON with status, timestamp, and uptime
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
