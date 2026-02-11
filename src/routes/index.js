/**
 * Route Aggregator
 *
 * Creates an Express Router instance and mounts all route modules at their
 * respective path prefixes. This module serves as the single point of entry
 * for all application routes, imported by app.js which mounts it under the
 * /api/v1 versioned prefix.
 *
 * Current route modules:
 *   - apiRoutes (./api) — mounted at '/' (resolved to /api/v1/* by app.js)
 *
 * To add new route modules in the future:
 *   1. Create a new route file in src/routes/ (e.g., users.js)
 *   2. Import it here: const userRoutes = require('./users')
 *   3. Mount it: router.use('/users', userRoutes)
 *
 * This file contains ONLY imports and mount statements — no route handler
 * logic should exist here.
 *
 * @module routes/index
 */

'use strict';

const express = require('express');
const apiRoutes = require('./api');

const router = express.Router();

// ---------------------------------------------------------------------------
// Mount Route Modules
// ---------------------------------------------------------------------------
// The '/api/v1' prefix is applied in app.js via app.use('/api/v1', routes).
// Routes mounted here at '/' will resolve to /api/v1/health, /api/v1/status,
// /api/v1/resources, etc.
// ---------------------------------------------------------------------------

router.use('/', apiRoutes);

module.exports = router;
