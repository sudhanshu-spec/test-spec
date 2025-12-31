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
 * Middleware Stack Order:
 * 1. helmet() - Security headers
 * 2. cors() - CORS handling
 * 3. compression() - Response compression
 * 4. express.json() - JSON body parsing
 * 5. express.urlencoded() - URL-encoded body parsing
 * 6. morganMiddleware - HTTP request logging
 * 7. healthRoutes - Health check endpoints
 * 8. mainRoutes - Application routes
 * 9. notFoundHandler - 404 handler
 * 10. errorHandler - Centralized error handler
 * 
 * @module src/app
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { mainRoutes, healthRoutes } = require('./routes');
const morganMiddleware = require('./middleware/morgan.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ---------------------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------------------

/**
 * Helmet middleware - sets various HTTP headers to protect against
 * common vulnerabilities (XSS, clickjacking, MIME sniffing, etc.)
 */
app.use(helmet());

/**
 * CORS middleware - enables Cross-Origin Resource Sharing for all routes
 * Allows requests from any origin by default
 */
app.use(cors());

// ---------------------------------------------------------------------------
// Compression and Body Parsing Middleware
// ---------------------------------------------------------------------------

/**
 * Compression middleware - compresses response bodies using gzip/deflate
 * for optimized transfer sizes
 */
app.use(compression());

/**
 * JSON body parser middleware - parses incoming requests with JSON payloads
 */
app.use(express.json());

/**
 * URL-encoded body parser middleware - parses incoming requests with
 * URL-encoded payloads (form data)
 */
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// HTTP Request Logging
// ---------------------------------------------------------------------------

/**
 * Morgan HTTP request logging middleware - logs all HTTP requests
 * Pipes output to Winston logger for centralized logging
 */
app.use(morganMiddleware);

// ---------------------------------------------------------------------------
// Route Mounting
// ---------------------------------------------------------------------------

/**
 * Mount health check routes at /health path
 * Used for load balancer probes and Kubernetes health checks
 */
app.use('/health', healthRoutes);

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// ---------------------------------------------------------------------------
// Error Handling Middleware
// ---------------------------------------------------------------------------

/**
 * 404 Not Found handler - catches requests that don't match any route
 * Must be after all route handlers
 */
app.use(notFoundHandler);

/**
 * Centralized error handler - catches all errors and returns JSON response
 * Must be the last middleware
 */
app.use(errorHandler);

module.exports = app;
