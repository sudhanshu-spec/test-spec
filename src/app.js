/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance
 * with comprehensive security hardening middleware pipeline.
 * 
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Security Middleware Pipeline (per Section 0.12.3):
 * Request → Rate Limiter → CORS → Helmet → Body Parser → Routes → Response
 * 
 * Security Features Implemented:
 * - Rate Limiting: DoS prevention via express-rate-limit (100 req/15min per IP)
 * - CORS: Cross-origin policy enforcement with environment-specific settings
 * - Helmet: HTTP security headers (13+ headers including CSP, HSTS, X-Frame-Options)
 * - Body Parsing: JSON and URL-encoded request body parsing for validation
 * 
 * Security configuration is sourced from src/config/index.js
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 * @see src/middleware/security for security middleware configuration
 * @see src/config for security settings
 */

'use strict';

const express = require('express');
const { mainRoutes } = require('./routes');
const { helmet, cors, rateLimiter } = require('./middleware/security');

const app = express();

/**
 * Security Middleware Pipeline
 * 
 * Middleware is applied in strict order per Section 0.12.3:
 * 1. Rate Limiter - First line of defense, blocks abusive requests before processing
 * 2. CORS - Rejects unauthorized origins early in the pipeline
 * 3. Helmet - Sets security headers on all responses
 * 4. Body Parsers - Prepares request bodies for validation
 */

// 1. Rate limiting (first line of defense - blocks abusive requests before processing)
// Returns 429 Too Many Requests when limit exceeded
app.use(rateLimiter);

// 2. CORS (reject unauthorized origins early)
// Development: allows all origins; Production: restricted to whitelist
app.use(cors);

// 3. Security headers (protect all responses with helmet)
// Sets 13+ headers including CSP, X-Frame-Options, HSTS, etc.
app.use(helmet);

// 4. Body parsing (prepare for validation)
// Parse JSON request bodies (application/json)
app.use(express.json());
// Parse URL-encoded request bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

/**
 * Mount main routes at root path
 * 
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 * 
 * Routes are mounted after security middleware so all requests
 * pass through the security pipeline first.
 */
// 5. Routes (business logic)
app.use('/', mainRoutes);

module.exports = app;
