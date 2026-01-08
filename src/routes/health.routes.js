/**
 * Health Check Routes Module
 * 
 * This module provides health check endpoints for operational monitoring,
 * PM2 process management, and load balancer health checks.
 * 
 * Endpoints:
 * - GET /health       - Basic liveness check
 * - GET /health/ready - Readiness probe with uptime
 * - GET /health/live  - Kubernetes-compatible liveness probe
 * 
 * These endpoints are designed to be lightweight and fast, providing
 * immediate feedback on application health without expensive operations.
 * 
 * Usage:
 *   const healthRoutes = require('./routes/health.routes');
 *   app.use('/health', healthRoutes);
 * 
 * @module src/routes/health.routes
 */

'use strict';

const express = require('express');

const router = express.Router();

/**
 * Basic Health Check / Liveness Probe
 * 
 * Returns a simple health status with current timestamp.
 * Used by load balancers and monitoring systems to verify
 * the application process is running and accepting requests.
 * 
 * @route GET /health
 * @returns {Object} JSON response with status and timestamp
 * @example
 * // Response
 * {
 *   "status": "ok",
 *   "timestamp": 1704672000000
 * }
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now()
  });
});

/**
 * Readiness Probe
 * 
 * Returns readiness status with process uptime information.
 * Indicates whether the application is ready to receive traffic.
 * Can be extended to check database connections, cache availability,
 * and other dependencies before reporting ready status.
 * 
 * @route GET /health/ready
 * @returns {Object} JSON response with status and uptime in seconds
 * @example
 * // Response
 * {
 *   "status": "ready",
 *   "uptime": 3600.123
 * }
 */
router.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    uptime: process.uptime()
  });
});

/**
 * Kubernetes Liveness Probe
 * 
 * Returns a minimal 200 OK response for Kubernetes liveness checks.
 * This endpoint is optimized for minimal latency and resource usage.
 * 
 * @route GET /health/live
 * @returns {string} Simple 'OK' text response with 200 status
 */
router.get('/live', (req, res) => {
  res.status(200).send('OK');
});

module.exports = router;
