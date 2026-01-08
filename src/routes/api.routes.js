/**
 * Versioned API Routes Module
 * 
 * This module provides version-prefixed API endpoints following
 * REST API versioning best practices. Routes defined here are
 * mounted at /api in app.js, creating paths like /api/v1/*.
 * 
 * API Versioning Strategy:
 * - /api/v1/* - Version 1 endpoints (current)
 * - /api/v2/* - Version 2 endpoints (future)
 * 
 * This structure allows:
 * - Gradual migration between API versions
 * - Backward compatibility for existing clients
 * - Clear separation of API generations
 * 
 * Endpoints:
 * - GET /api/v1/status - API status and version information
 * 
 * Usage:
 *   const apiRoutes = require('./routes/api.routes');
 *   app.use('/api', apiRoutes);
 * 
 * @module src/routes/api.routes
 */

'use strict';

const express = require('express');

const router = express.Router();

/**
 * API Version 1 Status Endpoint
 * 
 * Returns current API status and version information.
 * Useful for API discovery and monitoring.
 * 
 * @route GET /api/v1/status
 * @returns {Object} JSON response with version, status, and timestamp
 * @example
 * // Response
 * {
 *   "version": "v1",
 *   "status": "operational",
 *   "timestamp": 1704672000000
 * }
 */
router.get('/v1/status', (req, res) => {
  res.json({
    version: 'v1',
    status: 'operational',
    timestamp: Date.now()
  });
});

module.exports = router;
