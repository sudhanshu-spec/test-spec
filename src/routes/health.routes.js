/**
 * Health Check Route Module
 * 
 * This module defines the health-check endpoint using Express Router.
 * The health endpoint is used for production liveness probes and
 * returns JSON status information including server uptime.
 * 
 * @module src/routes/health.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Health check route handler
 * Returns JSON with application status and uptime for liveness probes
 * 
 * @route GET /health (mounted at /health in app.js, so internal path is /)
 * @returns {{ status: string, uptime: number }} JSON health status
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
});

module.exports = router;
