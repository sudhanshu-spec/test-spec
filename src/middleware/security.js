/**
 * Security Middleware Configuration Module
 * 
 * This module provides security-related middleware configuration for the Express
 * application. It exports a security middleware factory function that returns
 * environment-aware security configuration objects for use with helmet and CORS.
 * 
 * The module follows OWASP security guidelines and implements:
 * - HTTP security headers configuration via helmet options
 * - Content Security Policy (CSP) settings
 * - XSS protection headers
 * - Frame options (clickjacking protection)
 * - CORS configuration for cross-origin requests
 * 
 * Environment-Aware Behavior:
 * - Production: Strict security policies enforced
 * - Development: More permissive settings for debugging ease
 * 
 * Note: The actual helmet() and cors() middleware instances are created in
 * src/app.js. This module provides the configuration objects that are passed
 * to those middleware functions, keeping configuration modular while
 * centralizing middleware instantiation.
 * 
 * Usage in src/app.js:
 *   const { securityMiddleware } = require('./middleware');
 *   const securityConfig = securityMiddleware();
 *   app.use(helmet(securityConfig.helmet));
 *   app.use(cors(securityConfig.cors));
 * 
 * @module src/middleware/security
 */

const config = require('../config');

/**
 * Default CORS origin setting
 * Uses environment variable if available, otherwise allows all origins in development
 * and restricts to same origin in production
 * @type {string}
 */
const DEFAULT_CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Default allowed HTTP methods for CORS
 * @type {string[]}
 */
const CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

/**
 * Default allowed headers for CORS requests
 * @type {string[]}
 */
const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin'
];

/**
 * Security middleware configuration factory
 * 
 * Returns environment-aware security configuration objects for helmet and CORS.
 * The configuration adapts based on the NODE_ENV setting:
 * 
 * Production mode (NODE_ENV=production):
 * - Strict Content Security Policy enabled
 * - Cross-origin policies enforced
 * - HSTS enabled with long max-age
 * - All security headers at maximum protection
 * 
 * Development mode (default):
 * - CSP disabled for easier debugging
 * - Cross-origin policies relaxed
 * - More permissive settings for local development
 * 
 * @returns {Object} Security configuration object containing helmet and cors options
 * @returns {Object} returns.helmet - Configuration object for helmet middleware
 * @returns {Object} returns.cors - Configuration object for cors middleware
 * 
 * @example
 * const { securityMiddleware } = require('./middleware/security');
 * const securityConfig = securityMiddleware();
 * 
 * // Apply helmet with configuration
 * app.use(helmet(securityConfig.helmet));
 * 
 * // Apply CORS with configuration
 * app.use(cors(securityConfig.cors));
 */
const securityMiddleware = () => {
  const isProduction = config.env === 'production';

  /**
   * Helmet configuration object
   * Configures HTTP security headers based on environment
   */
  const helmetConfig = {
    /**
     * Content Security Policy configuration
     * Disabled in development for easier debugging with inline scripts/styles
     * Enabled with defaults in production for XSS protection
     */
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    } : false,

    /**
     * Cross-Origin-Embedder-Policy header
     * Requires resources to explicitly grant permission to be loaded
     */
    crossOriginEmbedderPolicy: isProduction,

    /**
     * Cross-Origin-Opener-Policy header
     * Isolates browsing context for security
     */
    crossOriginOpenerPolicy: isProduction ? { policy: 'same-origin' } : false,

    /**
     * Cross-Origin-Resource-Policy header
     * Controls which origins can load the resource
     */
    crossOriginResourcePolicy: isProduction ? { policy: 'same-origin' } : false,

    /**
     * DNS Prefetch Control
     * Controls browser DNS prefetching - disabled for privacy
     */
    dnsPrefetchControl: { allow: false },

    /**
     * Frameguard (X-Frame-Options)
     * Prevents clickjacking by controlling iframe embedding
     */
    frameguard: { action: 'deny' },

    /**
     * Hide Powered-By header
     * Removes X-Powered-By header to obscure server technology
     */
    hidePoweredBy: true,

    /**
     * HTTP Strict Transport Security (HSTS)
     * Forces HTTPS connections in production
     */
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    } : false,

    /**
     * IE No Open
     * Prevents IE from executing downloads in site's context
     */
    ieNoOpen: true,

    /**
     * No Sniff (X-Content-Type-Options)
     * Prevents MIME type sniffing
     */
    noSniff: true,

    /**
     * Origin-Agent-Cluster header
     * Provides origin-keyed agent clusters for isolation
     */
    originAgentCluster: true,

    /**
     * Permitted Cross-Domain Policies
     * Restricts Adobe Flash and PDF cross-domain behavior
     */
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },

    /**
     * Referrer-Policy header
     * Controls referrer information sent with requests
     */
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    /**
     * X-XSS-Protection header
     * Legacy XSS protection (modern browsers have built-in protection)
     * Set to 0 as recommended by OWASP for modern browsers
     */
    xssFilter: true
  };

  /**
   * CORS configuration object
   * Configures Cross-Origin Resource Sharing policy
   */
  const corsConfig = {
    /**
     * Allowed origin(s) for CORS requests
     * In production, should be set via CORS_ORIGIN environment variable
     * Defaults to '*' (all origins) for development convenience
     */
    origin: isProduction ? (process.env.CORS_ORIGIN || false) : DEFAULT_CORS_ORIGIN,

    /**
     * Allowed HTTP methods for CORS requests
     */
    methods: CORS_ALLOWED_METHODS,

    /**
     * Allowed headers in CORS requests
     */
    allowedHeaders: CORS_ALLOWED_HEADERS,

    /**
     * Exposed headers
     * Headers that browsers are allowed to access
     */
    exposedHeaders: ['X-Request-Id'],

    /**
     * Allow credentials (cookies, authorization headers)
     * Enabled for authenticated requests
     */
    credentials: true,

    /**
     * Preflight request cache duration (in seconds)
     * How long browsers can cache preflight response
     */
    maxAge: isProduction ? 86400 : 3600, // 24 hours in production, 1 hour in development

    /**
     * Pass preflight response to next handler
     */
    preflightContinue: false,

    /**
     * Success status code for OPTIONS requests
     * 204 No Content is preferred for preflight responses
     */
    optionsSuccessStatus: 204
  };

  return {
    helmet: helmetConfig,
    cors: corsConfig
  };
};

module.exports = {
  securityMiddleware
};
