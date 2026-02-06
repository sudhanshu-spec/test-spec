'use strict';

/**
 * @fileoverview Express Application Configuration Module
 *
 * This module initializes and exports the configured Express app instance
 * with a full production middleware pipeline. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 *
 * Middleware pipeline order:
 *   1. helmet()        — Security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   2. cors()          — Cross-origin resource sharing policy
 *   3. express.json()  — JSON body parsing
 *   4. mainRoutes      — GET / and GET /evening
 *   5. healthRoutes    — GET /health
 *   6. errorHandler    — Centralized error handling (must be last)
 *
 * Note: Morgan request logging is intentionally mounted in server.js
 * (not here) to keep Supertest integration test output clean.
 *
 * Design pattern: Factory pattern - creates configured Express app
 *
 * @module src/app
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { mainRoutes, healthRoutes } = require('./routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

/**
 * Mount Helmet for security-related HTTP response headers.
 * Sets Content-Security-Policy, Strict-Transport-Security, X-Frame-Options,
 * X-Content-Type-Options, and other hardening headers.
 */
app.use(helmet());

/**
 * Mount CORS middleware for cross-origin resource sharing.
 * Uses restrictive defaults; configure options as needed for specific origins.
 */
app.use(cors());

// ============================================================================
// Body Parsing Middleware
// ============================================================================

/**
 * Mount JSON body parser for incoming request payloads.
 * Parses application/json Content-Type bodies into req.body.
 */
app.use(express.json());

// ============================================================================
// Route Mounting
// ============================================================================

/**
 * Mount main routes at root path.
 * Preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health-check route at /health path.
 * - GET /health -> healthRoutes handles this
 */
app.use('/health', healthRoutes);

// ============================================================================
// Error Handling Middleware (must be last)
// ============================================================================

/**
 * Mount centralized error-handling middleware.
 * Catches all unhandled errors from the route pipeline and returns
 * structured JSON error responses. Must be the last middleware mounted.
 */
app.use(errorHandler);

module.exports = app;
