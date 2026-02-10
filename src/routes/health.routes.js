'use strict';

/**
 * @fileoverview Health Check Route Module
 *
 * This module defines the health-check endpoint using Express Router.
 * The health endpoint is designed for production liveness probes,
 * load balancer health verification, and monitoring systems.
 * It returns JSON status information including server uptime in seconds.
 *
 * This router is mounted at /health in src/app.js, making the
 * full endpoint path GET /health.
 *
 * @module src/routes/health.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Health check route handler
 * Returns JSON with application status and uptime for production liveness probes.
 * The uptime value is provided by process.uptime() and represents the number
 * of seconds the Node.js process has been running as a floating-point number.
 *
 * @route GET /
 * @returns {{ status: string, uptime: number }} JSON health status with
 *   status 'ok' and uptime in seconds
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
});

module.exports = router;
