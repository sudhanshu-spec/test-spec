/**
 * Security Configuration Module
 * 
 * Centralized security configuration for Express.js middleware.
 * Provides helmet.js, CORS, and rate limiting configurations.
 * 
 * Security Controls Implemented:
 * - Content Security Policy (CSP) to prevent XSS attacks
 * - HTTP Strict Transport Security (HSTS) to enforce HTTPS
 * - CORS origin whitelisting to control cross-domain access
 * - Rate limiting to prevent DoS attacks and API abuse
 */

/**
 * Helmet.js Security Headers Configuration
 * 
 * Configures 11+ security-related HTTP response headers including:
 * - Content-Security-Policy: Controls resource loading
 * - Strict-Transport-Security: Enforces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME-sniffing
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Controls cross-origin resource loading
 */
const securityConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  }
};

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Controls which domains can access API resources.
 * Uses environment-based origin whitelist for flexibility.
 * 
 * Environment Variable: ALLOWED_ORIGINS (comma-separated list)
 * Default: http://localhost:3000
 */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};

/**
 * Rate Limiting Configuration
 * 
 * Implements DoS protection by restricting request frequency per IP address.
 * Uses sliding window algorithm with configurable thresholds.
 * 
 * Environment Variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * 
 * Returns HTTP 429 (Too Many Requests) when limit exceeded.
 * Includes draft-8 RateLimit headers for client awareness.
 */
const limiterConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  limit: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per windowMs
  standardHeaders: 'draft-8', // Use draft-8 RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: 'Too many requests from this IP, please try again later.'
};

module.exports = {
  securityConfig,
  corsOptions,
  limiterConfig
};
