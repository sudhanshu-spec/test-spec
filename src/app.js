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
 * Middleware stack (in order):
 * 1. helmet - Security HTTP headers
 * 2. morgan - Request logging
 * 3. express.json - JSON body parsing
 * 4. express.urlencoded - URL-encoded body parsing
 * 5. compression - Response compression
 * 6. cors - Cross-Origin Resource Sharing
 * 7. rateLimit - Rate limiting
 * 8. Routes (main, health)
 * 9. errorHandler - Centralized error handling (last)
 * 
 * @module src/app
 */

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { mainRoutes, healthRoutes } = require('./routes');
const { errorHandler } = require('./middleware');
const config = require('./config');

const app = express();

/**
 * Security headers middleware
 * Sets various HTTP headers to protect against common vulnerabilities
 */
app.use(helmet());

/**
 * Request logging middleware
 * Uses 'combined' format in production, 'dev' format in development
 */
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

/**
 * Body parsing middleware
 * Parses incoming JSON and URL-encoded request bodies
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Response compression middleware
 * Compresses responses above threshold for improved performance
 */
app.use(compression({
  threshold: config.compression.threshold,
  level: config.compression.level
}));

/**
 * CORS middleware
 * Enables cross-origin requests from configured origins
 */
app.use(cors({
  origin: config.cors.origin
}));

/**
 * Rate limiting middleware
 * Protects against brute force and DoS attacks
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

/**
 * Mount health check routes
 * Provides endpoints for load balancer and orchestration:
 * - GET '/health' -> Basic health check
 * - GET '/health/ready' -> Readiness probe
 * - GET '/health/live' -> Liveness probe
 */
app.use('/health', healthRoutes);

/**
 * Centralized error handling middleware
 * Must be registered LAST after all routes
 * Provides environment-aware error responses
 */
app.use(errorHandler);

module.exports = app;
