/**
 * Health Check Routes Module
 * 
 * This module provides health check endpoints for production monitoring
 * and container orchestration systems (Kubernetes, Docker, etc.).
 * 
 * Endpoints:
 * - GET /health - Main health status with timestamp and uptime
 * - GET /health/live - Liveness probe for container health
 * - GET /health/ready - Readiness probe for service availability
 * 
 * All endpoints return JSON responses for easy parsing by monitoring tools.
 * 
 * @module src/routes/health.routes
 */

const express = require('express');

const router = express.Router();

/**
 * Main health check endpoint
 * Returns comprehensive health status including server uptime and timestamp
 * 
 * @route GET /health
 * @returns {Object} JSON object with status, timestamp, and uptime
 * @example
 * // Response:
 * // {
 * //   "status": "healthy",
 * //   "timestamp": "2024-01-15T10:30:00.000Z",
 * //   "uptime": 12345.678
 * // }
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Liveness probe endpoint
 * Simple check to verify the application process is running
 * Used by container orchestrators to determine if the container should be restarted
 * 
 * @route GET /health/live
 * @returns {Object} JSON object with alive status
 * @example
 * // Response:
 * // {
 * //   "status": "alive"
 * // }
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive'
  });
});

/**
 * Readiness probe endpoint
 * Indicates whether the application is ready to receive traffic
 * Can be extended to check database connections, external services, etc.
 * 
 * @route GET /health/ready
 * @returns {Object} JSON object with ready status
 * @example
 * // Response:
 * // {
 * //   "status": "ready"
 * // }
 */
router.get('/ready', (req, res) => {
  res.json({
    status: 'ready'
  });
});

module.exports = router;
