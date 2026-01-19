/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Middleware stack is configured in the following order:
 * 1. helmet - Security headers
 * 2. cors - Cross-Origin Resource Sharing
 * 3. compression - Response body compression
 * 4. express.json - JSON body parsing
 * 5. express.urlencoded - URL-encoded body parsing
 * 6. morganMiddleware - HTTP request logging
 * 7. Routes (health, main)
 * 8. Error handlers (404, centralized)
 * 
 * Design pattern: Factory pattern - creates configured Express app
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

// =============================================================================
// Security Middleware
// =============================================================================

/**
 * Helmet middleware - sets various HTTP headers to protect against
 * common vulnerabilities (XSS, clickjacking, MIME sniffing, etc.)
 */
app.use(helmet());

/**
 * CORS middleware - enables Cross-Origin Resource Sharing for all routes
 * Allows requests from any origin in development; configure specific
 * origins for production environments
 */
app.use(cors());

// =============================================================================
// Performance Middleware
// =============================================================================

/**
 * Compression middleware - compresses response bodies using gzip/deflate
 * for optimized transfer sizes. Automatically handles Accept-Encoding
 * negotiation with clients
 */
app.use(compression());

// =============================================================================
// Body Parsing Middleware
// =============================================================================

/**
 * JSON body parser - parses incoming requests with JSON payloads
 * Makes req.body available for routes handling JSON data
 */
app.use(express.json());

/**
 * URL-encoded body parser - parses incoming requests with URL-encoded payloads
 * Extended mode allows for rich objects and arrays to be encoded
 */
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// Logging Middleware
// =============================================================================

/**
 * Morgan HTTP request logging middleware - logs all HTTP requests
 * Piped to Winston logger for centralized logging to console and files
 */
app.use(morganMiddleware);

// =============================================================================
// Route Mounting
// =============================================================================

/**
 * Mount health check routes at /health
 * Provides endpoints for load balancer probes and Kubernetes health checks:
 * - GET /health -> Returns { status: 'ok', timestamp: '...' }
 */
app.use('/health', healthRoutes);

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

// =============================================================================
// Error Handling Middleware
// =============================================================================

/**
 * 404 Not Found handler - catches requests that don't match any route
 * Must be mounted after all route handlers
 */
app.use(notFoundHandler);

/**
 * Centralized error handler - catches all errors thrown in route handlers
 * Logs errors via Winston and returns standardized JSON error responses
 * Stack trace is suppressed in production for security
 * Must be the last middleware in the chain
 */
app.use(errorHandler);

module.exports = app;
