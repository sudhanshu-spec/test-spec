/**
 * API Routes Module
 * 
 * Express Router module defining API endpoints migrated from the original
 * monolithic server.js. Includes health check endpoint for production monitoring.
 * 
 * Endpoints:
 * - GET / - Returns 'Hello, World!\n' (backward compatible)
 * - GET /evening - Returns 'Good evening' (backward compatible)
 * - GET /health - Returns JSON health status for monitoring
 * 
 * @module routes/api
 * @requires express
 */

'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET / - Root endpoint
 * 
 * Original route migrated from server.js (lines 8-10).
 * Response content MUST remain identical for backward compatibility.
 * 
 * @route GET /
 * @returns {string} 'Hello, World!\n'
 * 
 * @example
 * // Request
 * curl http://localhost:3000/
 * 
 * // Response
 * Hello, World!
 */
router.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * GET /evening - Evening greeting endpoint
 * 
 * Original route migrated from server.js (lines 12-14).
 * Response content MUST remain identical for backward compatibility.
 * 
 * @route GET /evening
 * @returns {string} 'Good evening'
 * 
 * @example
 * // Request
 * curl http://localhost:3000/evening
 * 
 * // Response
 * Good evening
 */
router.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * GET /health - Health check endpoint
 * 
 * New endpoint for production monitoring and load balancer health checks.
 * Returns JSON with status and timestamp.
 * 
 * @route GET /health
 * @returns {Object} JSON object with status and timestamp
 * @returns {string} status - Always 'ok' if server is responding
 * @returns {string} timestamp - ISO 8601 formatted current timestamp
 * 
 * @example
 * // Request
 * curl http://localhost:3000/health
 * 
 * // Response
 * {"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
