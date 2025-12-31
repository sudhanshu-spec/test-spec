/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance
 * with a comprehensive security middleware stack. It separates application
 * configuration from HTTP server initialization (which remains in server.js),
 * enabling unit testing without starting the actual server.
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * Security Middleware Stack Order:
 * 1. helmet() - Sets 13 HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. cors() - Handles Cross-Origin Resource Sharing with configurable origins
 * 3. express.json() - Parses JSON request bodies
 * 4. express.urlencoded() - Parses URL-encoded request bodies
 * 5. rateLimit() - Rate limiting (100 requests per 15 minutes per IP by default)
 * 6. Application routes - Main application routes with input validation
 * 
 * Middleware Order Rationale:
 * - Helmet first: Security headers should be set on ALL responses
 * - CORS second: Handle preflight requests before processing
 * - Body parsers third: Parse request bodies before rate limiting
 * - Rate limiter fourth: Check limits before route handlers execute
 * - Routes last: Handle requests after all security checks pass
 * 
 * Configuration:
 * - Security settings are loaded from src/config/security.config.js
 * - Rate limiting is configurable via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX
 * - CORS origins are configurable via CORS_ORIGIN environment variable
 * 
 * @module src/app
 * @see {@link module:src/config/security.config} for security configuration
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { mainRoutes } = require('./routes');
const securityConfig = require('./config/security.config');

/**
 * Express application instance with security middleware configured.
 * @type {import('express').Application}
 */
const app = express();

/**
 * Security Middleware Configuration
 * 
 * The middleware is applied in a specific order to ensure proper
 * security enforcement and request handling.
 */

/**
 * 1. Helmet - HTTP Security Headers
 * Sets 13 security headers by default including:
 * - Content-Security-Policy: Prevents XSS attacks
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 */
app.use(helmet(securityConfig.helmet));

/**
 * 2. CORS - Cross-Origin Resource Sharing
 * Controls which origins can access the API.
 * Configured via CORS_ORIGIN environment variable.
 * Handles preflight OPTIONS requests automatically.
 */
app.use(cors(securityConfig.cors));

/**
 * 3. Body Parser - JSON
 * Parses incoming JSON request bodies.
 * Makes req.body available for POST/PUT/PATCH requests with JSON payload.
 */
app.use(express.json());

/**
 * 4. Body Parser - URL-encoded
 * Parses incoming URL-encoded request bodies.
 * Extended syntax allows rich objects and arrays to be encoded.
 */
app.use(express.urlencoded({ extended: true }));

/**
 * 5. Rate Limiter - DoS Protection
 * Limits repeated requests to protect against brute-force and DoS attacks.
 * Default: 100 requests per 15 minutes per IP.
 * Returns 429 Too Many Requests when limit exceeded.
 * Uses draft-8 standard rate limit headers.
 */
app.use(rateLimit(securityConfig.rateLimit));

/**
 * 6. Mount Application Routes
 * Mount main routes at root path after all security middleware.
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

module.exports = app;
