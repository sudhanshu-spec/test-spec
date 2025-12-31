/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * Security Middleware Stack (in order):
 * 1. Helmet - Sets security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. CORS - Handles cross-origin resource sharing policy
 * 3. Body Parsers - Parse JSON and URL-encoded request bodies
 * 4. Rate Limiter - Protects against brute-force and DoS attacks
 * 5. Routes - Application route handlers with validation
 * 
 * Configuration:
 * - Security settings are loaded from src/config/security.config.js
 * - Rate limiting: 100 requests per 15-minute window (configurable via env)
 * - CORS: Disabled by default, configure via CORS_ORIGIN environment variable
 * 
 * @module src/app
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

// ---------------------------------------------------------------------------
// Internal Imports
// ---------------------------------------------------------------------------

const { mainRoutes } = require('./routes');
const securityConfig = require('./config/security.config');

// ---------------------------------------------------------------------------
// Application Initialization
// ---------------------------------------------------------------------------

/**
 * Express application instance
 * @type {import('express').Application}
 */
const app = express();

// ---------------------------------------------------------------------------
// Security Middleware Stack
// ---------------------------------------------------------------------------

/**
 * Helmet middleware for security HTTP headers.
 * Sets 13 security headers including:
 * - Content-Security-Policy
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-DNS-Prefetch-Control
 * - X-Download-Options
 * - X-Permitted-Cross-Domain-Policies
 */
app.use(helmet(securityConfig.helmet));

/**
 * CORS middleware for cross-origin resource sharing.
 * Handles preflight OPTIONS requests automatically.
 * Configuration driven by CORS_ORIGIN environment variable.
 */
app.use(cors(securityConfig.cors));

// ---------------------------------------------------------------------------
// Body Parsing Middleware
// ---------------------------------------------------------------------------

/**
 * JSON body parser middleware.
 * Parses application/json request bodies.
 */
app.use(express.json());

/**
 * URL-encoded body parser middleware.
 * Parses application/x-www-form-urlencoded request bodies.
 */
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Rate Limiting Middleware
// ---------------------------------------------------------------------------

/**
 * Rate limiting middleware.
 * Protects against brute-force and denial-of-service attacks.
 * Default: 100 requests per 15-minute window per IP.
 * Returns 429 Too Many Requests when limit exceeded.
 */
app.use(rateLimit(securityConfig.rateLimit));

// ---------------------------------------------------------------------------
// Route Mounting
// ---------------------------------------------------------------------------

/**
 * Mount main routes at root path.
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

module.exports = app;
