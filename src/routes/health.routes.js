/**
 * Health Check Routes Module
 * 
 * This module defines the health check endpoint using Express Router.
 * Used for load balancer probes and Kubernetes health checks.
 * 
 * Route contracts:
 * - GET '/' returns JSON { status: 'ok', timestamp: ISO8601 string }
 * 
 * Note: This route is mounted at /health in app.js, so GET '/' here
 * becomes GET /health when the application is running.
 * 
 * Usage in src/app.js:
 *   const { healthRoutes } = require('./routes');
 *   app.use('/health', healthRoutes);
 * 
 * @module src/routes/health.routes
 */

'use strict';

const express = require('express');

/**
 * Express Router instance for health check routes
 * @type {Router}
 */
const router = express.Router();

/**
 * Health check handler
 * Returns JSON status response for health monitoring
 * 
 * Response format:
 * {
 *   "status": "ok",
 *   "timestamp": "2024-01-01T12:00:00.000Z"
 * }
 * 
 * @route GET /
 * @returns {Object} JSON object with status and timestamp
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
