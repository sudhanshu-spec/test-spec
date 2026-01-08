/**
 * Express Application Configuration Module
 * 
 * This module initializes and exports the configured Express app instance
 * with a comprehensive middleware stack for production readiness.
 * It separates application configuration from HTTP server initialization
 * (which remains in server.js), enabling unit testing without starting
 * the actual server.
 * 
 * Middleware Stack (Order Critical):
 * 1. helmet() - Security headers
 * 2. compression() - Response compression
 * 3. cors() - CORS handling
 * 4. express.json() - JSON body parsing
 * 5. express.urlencoded() - URL-encoded body parsing
 * 6. requestIdMiddleware - Request ID generation
 * 7. morgan() - HTTP request logging
 * 8. Routes (healthRoutes, apiRoutes, mainRoutes)
 * 9. notFoundHandler - 404 handling
 * 10. errorHandler - Global error handling
 * 
 * Design pattern: Factory pattern - creates configured Express app
 * 
 * @module src/app
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const { errorMiddleware, requestIdMiddleware } = require('./middleware');
const { logger, stream } = require('./utils/logger');
const config = require('./config');
const { mainRoutes, healthRoutes, apiRoutes } = require('./routes');

const app = express();

/**
 * Security Middleware - FIRST
 * Sets various HTTP headers for security hardening
 * Includes Content-Security-Policy, X-Content-Type-Options, etc.
 */
app.use(helmet());

/**
 * Response Compression
 * Enables gzip/deflate compression for responses
 * Must come before body parsing for efficiency
 */
app.use(compression());

/**
 * CORS Handling
 * Configures Cross-Origin Resource Sharing
 * Origin configured via CORS_ORIGIN environment variable
 */
app.use(cors({ origin: config.corsOrigin }));

/**
 * Body Parsing Middleware
 * Parses JSON and URL-encoded request bodies
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request ID Middleware
 * Generates UUID v4 for each request
 * Must be mounted BEFORE morgan for request ID in logs
 */
app.use(requestIdMiddleware);

/**
 * HTTP Request Logging
 * Morgan logging with winston stream integration
 * Format configured via LOG_FORMAT environment variable
 */
app.use(morgan(config.logFormat, { stream }));

/**
 * Health Check Routes
 * Mounted at /health for PM2 and load balancer monitoring
 * Endpoints: /health, /health/ready, /health/live
 */
app.use('/health', healthRoutes);

/**
 * API Routes
 * Mounted at /api for versioned API endpoints
 * Endpoints: /api/v1/status
 */
app.use('/api', apiRoutes);

/**
 * Main Routes
 * Mounted at root for original endpoint contracts
 * PRESERVED: GET '/' -> 'Hello, World!\n'
 * PRESERVED: GET '/evening' -> 'Good evening'
 */
app.use('/', mainRoutes);

/**
 * 404 Not Found Handler
 * Catches requests that don't match any route
 * Must be mounted after all routes per Rule R-030
 */
app.use(errorMiddleware.notFoundHandler);

/**
 * Global Error Handler
 * Handles all errors passed through middleware chain
 * Must be mounted LAST per Rule R-031
 */
app.use(errorMiddleware.errorHandler);

module.exports = app;
