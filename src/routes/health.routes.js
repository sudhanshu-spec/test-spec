/**
 * Health Check Routes Module
 * 
 * This module provides health check endpoints for production deployment,
 * load balancer integration, and container orchestration systems (Kubernetes).
 * 
 * The endpoints follow standard health check conventions:
 * - /health: Basic health check returning application status
 * - /health/ready: Readiness probe for orchestration systems
 * - /health/live: Liveness probe for orchestration systems
 * 
 * All endpoints return JSON responses with HTTP 200 status when healthy.
 * Response time target: < 100ms
 * 
 * Usage in src/app.js:
 *   const { healthRoutes } = require('./routes');
 *   app.use('/health', healthRoutes);
 * 
 * @module src/routes/health
 */

const express = require('express');

const router = express.Router();

/**
 * Basic health check endpoint
 * 
 * Used by load balancers and monitoring systems to verify
 * the application is running and accepting requests.
 * 
 * @route GET /health
 * @returns {Object} Health status object with status: 'ok'
 */
router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Readiness probe endpoint
 * 
 * Used by container orchestration systems (e.g., Kubernetes)
 * to determine if the application is ready to receive traffic.
 * Returns 'ready' when the application has completed initialization
 * and is prepared to handle requests.
 * 
 * @route GET /health/ready
 * @returns {Object} Readiness status object with status: 'ready'
 */
router.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

/**
 * Liveness probe endpoint
 * 
 * Used by container orchestration systems (e.g., Kubernetes)
 * to determine if the application is still alive and responsive.
 * A failure to respond indicates the application should be restarted.
 * 
 * @route GET /health/live
 * @returns {Object} Liveness status object with status: 'live'
 */
router.get('/live', (req, res) => {
  res.json({ status: 'live' });
});

module.exports = router;
