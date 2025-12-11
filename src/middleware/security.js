/**
 * Security Middleware Configuration Module
 * 
 * This module centralizes all security middleware configuration for the Express application.
 * It provides pre-configured instances of security middleware including:
 * - Helmet.js for HTTP security headers
 * - CORS for Cross-Origin Resource Sharing
 * - Rate limiting for DDoS and brute-force protection
 * 
 * Security Middleware Features:
 * -----------------------------
 * 
 * 1. Helmet (Security Headers):
 *    - Content-Security-Policy: Prevents XSS and data injection attacks
 *    - Cross-Origin-Opener-Policy: Isolates browsing context
 *    - Cross-Origin-Resource-Policy: Prevents cross-origin reads
 *    - Origin-Agent-Cluster: Requests process isolation
 *    - Referrer-Policy: Controls referrer information
 *    - Strict-Transport-Security: Enforces HTTPS (in production)
 *    - X-Content-Type-Options: Prevents MIME sniffing
 *    - X-DNS-Prefetch-Control: Controls DNS prefetching
 *    - X-Download-Options: Prevents IE from executing downloads
 *    - X-Frame-Options: Prevents clickjacking
 *    - X-Permitted-Cross-Domain-Policies: Controls Adobe Flash/PDF
 *    - Removes X-Powered-By header to prevent framework fingerprinting
 * 
 * 2. CORS (Cross-Origin Resource Sharing):
 *    - Handles preflight OPTIONS requests
 *    - Sets Access-Control-Allow-* headers
 *    - Configurable origin whitelist for production security
 * 
 * 3. Rate Limiting:
 *    - Limits requests per IP address within time windows
 *    - Returns HTTP 429 Too Many Requests when exceeded
 *    - draft-8 compliant RateLimit headers
 * 
 * Usage:
 * ------
 * const { helmetMiddleware, corsMiddleware, rateLimitMiddleware } = require('./middleware/security');
 * app.use(helmetMiddleware);
 * app.use(corsMiddleware);
 * app.use(rateLimitMiddleware);
 * 
 * @module src/middleware/security
 * @requires helmet - Security headers middleware
 * @requires cors - CORS handling middleware
 * @requires express-rate-limit - Rate limiting middleware
 * @requires ../config - Application configuration
 */

'use strict';

// ---------------------------------------------------------------------------
// Module Dependencies
// ---------------------------------------------------------------------------

/**
 * Helmet security headers middleware.
 * Sets 11+ HTTP security headers with secure defaults.
 * @type {Function}
 */
const helmet = require('helmet');

/**
 * CORS (Cross-Origin Resource Sharing) middleware.
 * Handles preflight requests and CORS headers.
 * @type {Function}
 */
const cors = require('cors');

/**
 * Express rate limiting middleware.
 * Limits repeated requests to public APIs.
 * @type {{ rateLimit: Function }}
 */
const { rateLimit } = require('express-rate-limit');

/**
 * Application configuration.
 * Contains security-related settings.
 * @type {Object}
 */
const config = require('../config');

// ---------------------------------------------------------------------------
// Environment Detection
// ---------------------------------------------------------------------------

/**
 * Determine if running in development environment.
 * @type {boolean}
 */
const isDevelopment = config.env === 'development';

/**
 * Determine if running in production environment.
 * @type {boolean}
 */
const isProduction = config.env === 'production';

// ---------------------------------------------------------------------------
// Helmet Configuration
// ---------------------------------------------------------------------------

/**
 * Helmet middleware with environment-aware configuration.
 * 
 * Production: Full security with strict CSP and HSTS.
 * Development: Relaxed CSP to allow local development without HTTPS.
 * 
 * Security headers set by default:
 * - Content-Security-Policy
 * - Cross-Origin-Opener-Policy
 * - Cross-Origin-Resource-Policy
 * - Origin-Agent-Cluster
 * - Referrer-Policy
 * - Strict-Transport-Security
 * - X-Content-Type-Options
 * - X-DNS-Prefetch-Control
 * - X-Download-Options
 * - X-Frame-Options
 * - X-Permitted-Cross-Domain-Policies
 * 
 * Additionally removes X-Powered-By header.
 * 
 * @type {Function}
 */
const helmetMiddleware = helmet({
  // Content Security Policy configuration
  contentSecurityPolicy: isDevelopment ? {
    // Relaxed CSP for development - allows inline scripts/styles and HTTP
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      // Disable upgrade-insecure-requests in development for HTTP support
      upgradeInsecureRequests: null
    }
  } : {
    // Strict CSP for production
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },
  
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Strict-Transport-Security (HSTS)
  // Only enable in production when HTTPS is available
  strictTransportSecurity: isProduction ? {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  } : false,
  
  // X-Content-Type-Options: nosniff
  xContentTypeOptions: true,
  
  // X-DNS-Prefetch-Control: off
  xDnsPrefetchControl: { allow: false },
  
  // X-Download-Options: noopen
  xDownloadOptions: true,
  
  // X-Frame-Options: DENY (prevents clickjacking)
  xFrameOptions: { action: 'deny' },
  
  // X-Permitted-Cross-Domain-Policies: none
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  
  // X-XSS-Protection: 0 (disabled as CSP is preferred)
  xXssProtection: false,
  
  // Origin-Agent-Cluster: ?1
  originAgentCluster: true
});

// ---------------------------------------------------------------------------
// CORS Configuration
// ---------------------------------------------------------------------------

/**
 * CORS middleware options.
 * Configures Cross-Origin Resource Sharing based on environment.
 * 
 * Production: Restricts origins to configured whitelist.
 * Development: Allows all origins with credentials.
 * 
 * @type {Object}
 */
const corsOptions = {
  // Origin configuration from environment
  origin: config.corsOrigins,
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  
  // Exposed headers (accessible to client JavaScript)
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  
  // Preflight cache duration (in seconds)
  maxAge: isDevelopment ? 600 : 86400, // 10 min dev, 24 hours prod
  
  // Preflight success status
  optionsSuccessStatus: 204
};

/**
 * Configured CORS middleware instance.
 * @type {Function}
 */
const corsMiddleware = cors(corsOptions);

// ---------------------------------------------------------------------------
// Rate Limiting Configuration
// ---------------------------------------------------------------------------

/**
 * Rate limiting middleware options.
 * Limits requests per IP address to prevent DDoS and brute-force attacks.
 * 
 * Default: 100 requests per 15 minutes per IP.
 * Returns HTTP 429 Too Many Requests when exceeded.
 * 
 * @type {Object}
 */
const rateLimitOptions = {
  // Time window for counting requests (milliseconds)
  windowMs: config.rateLimitWindowMs,
  
  // Maximum requests per window per IP
  limit: config.rateLimitMax,
  
  // Return rate limit info in RateLimit-* headers (draft-8 standard)
  standardHeaders: 'draft-8',
  
  // Disable X-RateLimit-* headers (legacy, use draft-8 instead)
  legacyHeaders: false,
  
  // Skip rate limiting for successful requests in development
  skipSuccessfulRequests: false,
  
  // Skip rate limiting for failed requests
  skipFailedRequests: false,
  
  // Message when rate limit exceeded
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
  },
  
  // Status code when rate limit exceeded
  statusCode: 429,
  
  // Handler for rate limit exceeded
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
  
  // Use default key generator (req.ip) which handles IPv6 correctly
  // express-rate-limit v8.x uses req.ip by default with proper IPv6 handling
};

/**
 * Configured rate limiting middleware instance.
 * @type {Function}
 */
const rateLimitMiddleware = rateLimit(rateLimitOptions);

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------

module.exports = {
  /**
   * Helmet security headers middleware.
   * Apply as first middleware for maximum protection.
   */
  helmetMiddleware,
  
  /**
   * CORS handling middleware.
   * Apply after helmet, before rate limiting.
   */
  corsMiddleware,
  
  /**
   * Rate limiting middleware.
   * Apply after CORS, before routes.
   */
  rateLimitMiddleware,
  
  /**
   * Helmet configuration options (for testing/customization).
   * @type {Object}
   */
  helmetOptions: {
    isDevelopment,
    isProduction
  },
  
  /**
   * CORS configuration options (for testing/customization).
   * @type {Object}
   */
  corsOptions,
  
  /**
   * Rate limit configuration options (for testing/customization).
   * @type {Object}
   */
  rateLimitOptions
};
