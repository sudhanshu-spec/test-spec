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
 * Production middleware stack (in order):
 * 1. helmet - Security HTTP headers
 * 2. morgan - HTTP request logging
 * 3. express.json - JSON body parsing
 * 4. express.urlencoded - URL-encoded body parsing
 * 5. compression - Response compression
 * 6. cors - Cross-Origin Resource Sharing
 * 7. rateLimit - Rate limiting protection
 * 8. Routes (mainRoutes, healthRoutes)
 * 9. errorHandler - Centralized error handling (must be last)
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
 * Security middleware - Sets various HTTP headers to protect against
 * common web vulnerabilities including XSS, clickjacking, and content type sniffing
 */
app.use(helmet());

/**
 * HTTP request logging middleware
 * - Production: 'combined' format for comprehensive logging
 * - Development: 'dev' format for colored, concise output
 */
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

/**
 * Body parsing middleware - JSON
 * Parses incoming request bodies with JSON payloads
 */
app.use(express.json());

/**
 * Body parsing middleware - URL-encoded
 * Parses incoming request bodies with URL-encoded payloads
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Response compression middleware
 * Compresses responses using gzip/deflate based on configuration:
 * - threshold: Minimum response size in bytes to compress
 * - level: Compression level (0-9, 6 is balanced)
 */
app.use(compression({
  threshold: config.compression.threshold,
  level: config.compression.level
}));

/**
 * CORS middleware
 * Enables Cross-Origin Resource Sharing with configurable origin
 */
app.use(cors({
  origin: config.cors.origin
}));

/**
 * Rate limiting middleware
 * Protects against brute force and DoS attacks
 * - windowMs: Time window for rate limiting
 * - max: Maximum requests per window per IP
 * - standardHeaders: Return rate limit info in RateLimit-* headers
 * - legacyHeaders: Disable X-RateLimit-* headers
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
 * Mount health routes at /health path
 * Provides endpoints for load balancer and orchestration health checks:
 * - GET /health -> Basic health check
 * - GET /health/ready -> Readiness probe
 * - GET /health/live -> Liveness probe
 */
app.use('/health', healthRoutes);

/**
 * Centralized error handling middleware
 * Must be registered AFTER all routes to catch errors from route handlers
 * Provides environment-aware error responses with logging integration
 */
app.use(errorHandler);

module.exports = app;
