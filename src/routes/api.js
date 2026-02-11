/**
 * API Route Definitions
 *
 * Defines the core API endpoints for the application. All routes in this module
 * are mounted under the /api/v1 prefix by the route aggregator (routes/index.js)
 * and app.js. The resulting endpoints are:
 *
 *   GET  /api/v1/health          — Health check for monitoring and PM2
 *   GET  /api/v1/status          — Environment and version diagnostics
 *   GET  /api/v1/resources       — List resources (placeholder)
 *   GET  /api/v1/resources/:id   — Get single resource (placeholder)
 *   POST /api/v1/resources       — Create resource (placeholder)
 *   PUT  /api/v1/resources/:id   — Update resource (placeholder)
 *   DELETE /api/v1/resources/:id — Delete resource (placeholder)
 *
 * No database integration — all handlers return computed or static JSON.
 * Route parameters use simple :param syntax for Express 5.x compatibility.
 *
 * @module routes/api
 */

'use strict';

const express = require('express');

const router = express.Router();

// ---------------------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------------------
// Returns server status, uptime (in seconds), and current ISO-8601 timestamp.
// Critical for production monitoring dashboards and PM2 health-check probes.
// ---------------------------------------------------------------------------

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Status / Diagnostics Endpoint
// ---------------------------------------------------------------------------
// Returns runtime environment information useful for debugging and diagnostics.
// ---------------------------------------------------------------------------

router.get('/status', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
  });
});

// ---------------------------------------------------------------------------
// Placeholder CRUD Routes — Resource Collection
// ---------------------------------------------------------------------------
// These routes demonstrate the RESTful routing pattern and serve as scaffolding
// for future feature development. Each returns a JSON response indicating it
// is a placeholder. Replace with real business logic when ready.
// ---------------------------------------------------------------------------

/**
 * GET /resources — List all resources.
 */
router.get('/resources', (req, res) => {
  res.json({
    message: 'Route placeholder',
    method: req.method,
    path: req.originalUrl,
  });
});

/**
 * GET /resources/:id — Retrieve a single resource by ID.
 */
router.get('/resources/:id', (req, res) => {
  res.json({
    message: 'Route placeholder',
    method: req.method,
    path: req.originalUrl,
    resourceId: req.params.id,
  });
});

/**
 * POST /resources — Create a new resource.
 */
router.post('/resources', (req, res) => {
  res.status(201).json({
    message: 'Route placeholder',
    method: req.method,
    path: req.originalUrl,
  });
});

/**
 * PUT /resources/:id — Update an existing resource by ID.
 */
router.put('/resources/:id', (req, res) => {
  res.json({
    message: 'Route placeholder',
    method: req.method,
    path: req.originalUrl,
    resourceId: req.params.id,
  });
});

/**
 * DELETE /resources/:id — Remove a resource by ID.
 */
router.delete('/resources/:id', (req, res) => {
  res.json({
    message: 'Route placeholder',
    method: req.method,
    path: req.originalUrl,
    resourceId: req.params.id,
  });
});

module.exports = router;
