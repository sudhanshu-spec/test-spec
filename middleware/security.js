/**
 * Security Configuration Module
 * 
 * Centralized security configuration for Express.js application.
 * Exports three configuration objects for defense-in-depth security middleware:
 * - securityConfig: helmet.js security headers configuration
 * - corsOptions: Cross-Origin Resource Sharing (CORS) policy
 * - limiterConfig: Rate limiting configuration for DoS protection
 * 
 * This module is imported by server.js to configure multiple security layers:
 * - 11+ HTTP security headers via helmet.js
 * - XSS and clickjacking prevention
 * - HTTPS enforcement via HSTS
 * - Cross-origin request restrictions
 * - DoS attack mitigation via request throttling
 * 
 * @module middleware/security
 * @see {@link https://helmetjs.github.io/|Helmet.js Documentation}
 * @see {@link https://www.npmjs.com/package/express-rate-limit|express-rate-limit}
 * @see {@link https://www.npmjs.com/package/cors|CORS Package}
 */

/**
 * Helmet.js Security Headers Configuration
 * 
 * Configures Content Security Policy (CSP) and HTTP Strict Transport Security (HSTS)
 * to provide comprehensive protection against common web vulnerabilities.
 * 
 * Content Security Policy (CSP):
 * - defaultSrc: Only allow resources from same origin ('self')
 * - styleSrc: Allow stylesheets from same origin and inline styles (for dynamic styling)
 * - scriptSrc: Only allow scripts from same origin (prevents XSS attacks)
 * - imgSrc: Allow images from same origin, data URIs, and HTTPS sources
 * 
 * HTTP Strict Transport Security (HSTS):
 * - maxAge: 31536000 seconds (1 year) - browsers must use HTTPS
 * - includeSubDomains: Apply HSTS to all subdomains
 * - preload: Eligible for browser HSTS preload list
 * 
 * Security Headers Applied by helmet.js:
 * 1. Content-Security-Policy: Mitigates XSS attacks
 * 2. Strict-Transport-Security: Enforces HTTPS connections
 * 3. X-Frame-Options: Prevents clickjacking (default: SAMEORIGIN)
 * 4. X-Content-Type-Options: Prevents MIME-sniffing (default: nosniff)
 * 5. Cross-Origin-Opener-Policy: Isolates browsing context
 * 6. Cross-Origin-Resource-Policy: Controls cross-origin resource loading
 * 7. Origin-Agent-Cluster: Enables origin-keyed agent clusters
 * 8. Referrer-Policy: Controls referrer information
 * 9. X-DNS-Prefetch-Control: Controls DNS prefetching
 * 10. X-Download-Options: Prevents IE from executing downloads
 * 11. X-Permitted-Cross-Domain-Policies: Controls Flash/PDF cross-domain access
 * 
 * Note: X-Powered-By header is removed by helmet to avoid information disclosure
 * 
 * @type {Object}
 * @property {Object} contentSecurityPolicy - CSP directive configuration
 * @property {Object} contentSecurityPolicy.directives - CSP policy directives
 * @property {string[]} contentSecurityPolicy.directives.defaultSrc - Default resource origins
 * @property {string[]} contentSecurityPolicy.directives.styleSrc - Stylesheet origins
 * @property {string[]} contentSecurityPolicy.directives.scriptSrc - Script origins
 * @property {string[]} contentSecurityPolicy.directives.imgSrc - Image origins
 * @property {Object} hsts - HSTS configuration
 * @property {number} hsts.maxAge - HSTS duration in seconds (1 year)
 * @property {boolean} hsts.includeSubDomains - Apply HSTS to subdomains
 * @property {boolean} hsts.preload - Enable HSTS preload eligibility
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
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Controls which external domains can access API resources through browser-enforced
 * cross-origin policies. Helps prevent unauthorized access from malicious websites.
 * 
 * Configuration:
 * - origin: Whitelist of allowed origins (comma-separated in ALLOWED_ORIGINS env var)
 *   Default: http://localhost:3000 (development environment)
 *   Production: Set ALLOWED_ORIGINS=https://example.com,https://app.example.com
 * 
 * - methods: Allowed HTTP methods (GET for data retrieval, POST for data submission)
 * 
 * - credentials: Enable credentials (cookies, authorization headers) in cross-origin requests
 *   Required for authenticated API calls from different origins
 * 
 * - optionsSuccessStatus: HTTP status for successful preflight OPTIONS requests
 *   Set to 200 for legacy browser compatibility (some browsers expect 200 instead of 204)
 * 
 * Environment Variable:
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins
 *   Example: ALLOWED_ORIGINS=http://localhost:3000,https://example.com
 * 
 * Security Benefits:
 * - Prevents unauthorized cross-domain API access
 * - Mitigates CSRF (Cross-Site Request Forgery) attacks
 * - Enables secure credential sharing with trusted origins
 * - Blocks requests from unknown or malicious domains
 * 
 * @type {Object}
 * @property {string[]|Function} origin - Allowed origin(s) or validation function
 * @property {string[]} methods - Allowed HTTP methods
 * @property {boolean} credentials - Allow credentials in cross-origin requests
 * @property {number} optionsSuccessStatus - Status code for successful OPTIONS requests
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
 * Implements DoS (Denial of Service) protection by restricting the number of requests
 * per IP address within a sliding time window. When the limit is exceeded, clients
 * receive HTTP 429 (Too Many Requests) with rate limit information in response headers.
 * 
 * Configuration:
 * - windowMs: Time window in milliseconds (15 minutes = 900000ms)
 *   Sliding window algorithm resets dynamically per IP address
 * 
 * - limit: Maximum number of requests allowed per window per IP (100 requests)
 *   Balance between legitimate user needs and DoS attack prevention
 * 
 * - standardHeaders: Use IETF draft-8 RateLimit headers for client awareness
 *   Provides: RateLimit-Policy, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
 * 
 * - legacyHeaders: Disable deprecated X-RateLimit-* headers (false)
 *   Modern clients should use draft-8 standard headers instead
 * 
 * - message: Custom error message returned when rate limit is exceeded
 * 
 * Rate Limit Response Headers (draft-8):
 * - RateLimit-Policy: Describes rate limit policy (100;w=900)
 * - RateLimit-Limit: Maximum requests allowed in window (100)
 * - RateLimit-Remaining: Remaining requests in current window (0-100)
 * - RateLimit-Reset: Seconds until window reset
 * 
 * Security Benefits:
 * - Prevents brute-force attacks on authentication endpoints
 * - Mitigates DoS attacks from single IP addresses
 * - Protects against API abuse and resource exhaustion
 * - Enforces fair usage of server resources
 * 
 * Threshold Rationale:
 * - 100 requests per 15 minutes allows ~6.7 requests per minute
 * - Sufficient for typical user browsing patterns
 * - Restrictive enough to prevent automated attacks
 * - Can be adjusted for specific endpoint requirements
 * 
 * @type {Object}
 * @property {number} windowMs - Time window in milliseconds (15 minutes)
 * @property {number} limit - Maximum requests per window per IP
 * @property {string} standardHeaders - Use draft-8 RateLimit headers
 * @property {boolean} legacyHeaders - Disable X-RateLimit-* headers
 * @property {string} message - Error message when limit exceeded
 */
const limiterConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
};

/**
 * Module Exports
 * 
 * All three configuration objects are exported for consumption by server.js
 * middleware stack. Import pattern:
 * 
 * const { securityConfig, corsOptions, limiterConfig } = require('./middleware/security');
 * 
 * Usage in server.js:
 * app.use(helmet(securityConfig));
 * app.use(cors(corsOptions));
 * app.use(rateLimit(limiterConfig));
 */
module.exports = {
  securityConfig,
  corsOptions,
  limiterConfig
};
