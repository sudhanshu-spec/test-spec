/**
 * Security Middleware Configuration Module
 * 
 * This module centralizes security middleware configuration implementing:
 * - helmet@8.1.0 for HTTP security headers (13+ protective headers)
 * - express-rate-limit@8.2.1 for DoS prevention via request rate limiting
 * - cors@2.8.5 for Cross-Origin Resource Sharing policy enforcement
 * 
 * Security Benefits:
 * - Helmet: Sets Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
 *   Strict-Transport-Security, removes X-Powered-By, and prevents XSS, clickjacking,
 *   and MIME sniffing attacks
 * - Rate Limiter: Prevents DoS attacks by limiting requests per IP per time window
 * - CORS: Controls cross-origin access with environment-specific policies
 * 
 * Middleware Order (per Section 0.12.3):
 * Request → Rate Limiter → CORS → Helmet → Body Parser → Routes → Response
 * 
 * Configuration is sourced from src/config/index.js for:
 * - Rate limit window (RATE_LIMIT_WINDOW_MS)
 * - Rate limit max requests (RATE_LIMIT_MAX)
 * - CORS allowed origins (CORS_ALLOWED_ORIGINS)
 * - Environment (NODE_ENV) for environment-specific behavior
 * 
 * OWASP Express.js Security Best Practices Reference:
 * @see https://expressjs.com/en/advanced/best-practice-security.html
 * @see https://helmetjs.github.io/
 * 
 * @module src/middleware/security
 */

'use strict';

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const config = require('../config');

/**
 * Helmet Security Headers Middleware
 * 
 * Configures helmet@8.1.0 to set comprehensive HTTP security headers.
 * Sets 13+ protective headers including:
 * - Content-Security-Policy: Restricts resource loading to same origin
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Strict-Transport-Security: Enforces HTTPS connections
 * - Referrer-Policy: Controls referrer information
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Controls resource sharing
 * - X-Powered-By: Removed to hide server technology
 * 
 * Per Section 0.6.2: CSP upgrade-insecure-requests is disabled in development
 * to allow HTTP access during local development.
 * 
 * @type {Function}
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Disable upgrade-insecure-requests in development per Section 0.6.2
      // This allows local development over HTTP without CSP violations
      upgradeInsecureRequests: config.env === 'production' ? [] : null
    }
  }
});

/**
 * Rate Limiting Middleware
 * 
 * Configures express-rate-limit@8.2.1 to prevent DoS attacks by limiting
 * the number of requests from each IP address within a rolling time window.
 * 
 * Per Section 0.6.3:
 * - Default: 100 requests per 15 minutes per IP
 * - Configurable via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX environment variables
 * - Returns 429 Too Many Requests when limit exceeded
 * - Includes RateLimit-* headers in responses per IETF draft spec
 * 
 * Rate limit headers returned:
 * - RateLimit-Limit: Maximum requests per window
 * - RateLimit-Remaining: Requests remaining in current window
 * - RateLimit-Reset: Time when the rate limit resets (Unix epoch seconds)
 * 
 * @type {Function}
 */
const rateLimiter = rateLimit({
  // Time window in milliseconds (default: 15 minutes = 900000ms)
  windowMs: config.rateLimit.windowMs,
  
  // Maximum requests per window per IP (default: 100)
  max: config.rateLimit.max,
  
  // Return rate limit info in RateLimit-* headers (IETF draft spec)
  standardHeaders: true,
  
  // Disable X-RateLimit-* legacy headers
  legacyHeaders: false,
  
  // Custom message returned when rate limit is exceeded
  // Returns JSON response per Section 0.12.3
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  
  // Skip rate limiting for successful requests in test environment
  // This prevents rate limit issues during automated testing
  skip: (req) => config.env === 'test' && req.method === 'OPTIONS'
});

/**
 * CORS Options Configuration
 * 
 * Configures Cross-Origin Resource Sharing policy per Section 0.6.4.
 * 
 * Environment-specific behavior:
 * - Development: Allow all origins (true) for easy local development
 * - Production: Restrict to CORS_ALLOWED_ORIGINS whitelist
 * 
 * The origin setting uses a function to properly handle the comma-separated
 * origins list from the environment variable.
 * 
 * @type {Object}
 */
const corsOptions = {
  /**
   * Origin configuration
   * - Development: true (allows all origins)
   * - Production: Function that checks against CORS_ALLOWED_ORIGINS whitelist
   *   or false if no origins specified
   */
  origin: (() => {
    if (config.env !== 'production') {
      // Allow all origins in development/test
      return true;
    }
    
    // Production: Use whitelist from environment
    const allowedOrigins = config.cors.allowedOrigins;
    
    if (!allowedOrigins || allowedOrigins === '*') {
      // If '*' or not set, allow all origins in production (not recommended)
      return true;
    }
    
    // Parse comma-separated origins into array
    const originsArray = allowedOrigins.split(',').map(origin => origin.trim());
    
    // Return validation function for CORS middleware
    return (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      if (originsArray.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    };
  })(),
  
  /**
   * Allowed HTTP methods for cross-origin requests
   */
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  /**
   * Allowed request headers
   */
  allowedHeaders: ['Content-Type', 'Authorization'],
  
  /**
   * Allow credentials (cookies, authorization headers) to be sent
   */
  credentials: true,
  
  /**
   * Preflight response cache duration in seconds (24 hours)
   * Reduces OPTIONS requests for repeated API calls
   */
  maxAge: 86400
};

/**
 * CORS Middleware
 * 
 * Configured CORS middleware instance using cors@2.8.5.
 * Applies the environment-specific CORS options.
 * 
 * @type {Function}
 */
const corsMiddleware = cors(corsOptions);

/**
 * Export configured security middleware instances
 * 
 * Usage in src/app.js:
 * ```javascript
 * const { helmet, cors, rateLimiter } = require('./middleware/security');
 * 
 * // Apply in correct order per Section 0.12.3:
 * app.use(rateLimiter);  // 1. Block abusive requests first
 * app.use(cors);         // 2. Reject unauthorized origins
 * app.use(helmet);       // 3. Set security headers
 * ```
 * 
 * @exports helmet - Helmet middleware for HTTP security headers
 * @exports cors - CORS middleware for cross-origin policy
 * @exports rateLimiter - Rate limiting middleware for DoS prevention
 */
module.exports = {
  helmet: helmetMiddleware,
  cors: corsMiddleware,
  rateLimiter
};
