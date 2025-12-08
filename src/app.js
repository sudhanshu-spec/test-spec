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
 * Middleware Stack (in order):
 * 1. helmet - Security headers
 * 2. cors - Cross-Origin Resource Sharing
 * 3. compression - Response compression
 * 4. rateLimit - Rate limiting protection
 * 5. loggerMiddleware - Request logging
 * 6. express.json() - JSON body parsing
 * 7. express.urlencoded() - URL-encoded body parsing
 * 8. routes - Application routes
 * 9. errorHandler - Centralized error handling (MUST be last)
 * 
 * @module src/app
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { loggerMiddleware, errorHandler, securityMiddleware } = require('./middleware');
const { mainRoutes, healthRoutes } = require('./routes');
const logger = require('./utils/logger');
const config = require('./config');

const app = express();

/**
 * Configure rate limiter using config values
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Mount middleware in correct order
 * Order is critical for security and functionality
 */

// 1. Security headers first
app.use(helmet());

// 2. CORS
app.use(cors({ origin: config.cors.origin }));

// 3. Response compression
app.use(compression());

// 4. Rate limiting
app.use(limiter);

// 5. Request logging
app.use(loggerMiddleware);

// 6. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Mount routes
 */

// Main routes at root path (preserves GET / and GET /evening)
app.use('/', mainRoutes);

// Health check routes at /health path
app.use('/health', healthRoutes);

/**
 * Error handler MUST be last
 */
app.use(errorHandler);

module.exports = app;
