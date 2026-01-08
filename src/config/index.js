/**
 * Configuration Management Module
 * 
 * This module centralizes all application configuration values with environment
 * variable support following the Twelve-Factor App methodology for configuration
 * externalization.
 * 
 * Default values preserve backward compatibility with original server.js implementation:
 * - host: '127.0.0.1' (from original server.js line 3)
 * - port: 3000 (from original server.js line 4)
 * 
 * Environment variable overrides:
 * - HOST: Override default host binding
 * - PORT: Override default port number
 * - NODE_ENV: Set application environment (development, production, test)
 * 
 * Security-related environment variables (per Agent Action Plan Section 0.10.3):
 * - CORS_ORIGIN: Allowed origins for CORS (default: '*' for development)
 * - RATE_LIMIT_WINDOW_MS: Rate limit window duration in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * - TRUST_PROXY: Enable proxy trust for correct IP resolution (default: false)
 * 
 * @module src/config
 */

module.exports = {
  /**
   * Server host binding address
   * @type {string}
   * @default '127.0.0.1'
   */
  host: process.env.HOST || '127.0.0.1',

  /**
   * Server port number
   * @type {number}
   * @default 3000
   */
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Application environment
   * @type {string}
   * @default 'development'
   */
  env: process.env.NODE_ENV || 'development',

  /**
   * CORS allowed origins
   * 
   * Security purpose: Controls which origins are allowed to make cross-origin requests
   * Environment variable: CORS_ORIGIN
   * Default: '*' (all origins - suitable for development)
   * Production recommendation: Set to specific allowed domain(s) e.g., 'https://yourdomain.com'
   * 
   * @type {string}
   * @default '*'
   */
  corsOrigin: process.env.CORS_ORIGIN || '*',

  /**
   * Rate limit window duration in milliseconds
   * 
   * Security purpose: Defines the time window for rate limiting to prevent DoS attacks
   * Environment variable: RATE_LIMIT_WINDOW_MS
   * Default: 900000 (15 minutes)
   * Production recommendation: Keep at 900000 (15 minutes) for standard protection
   * 
   * @type {number}
   * @default 900000
   */
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,

  /**
   * Maximum requests allowed per rate limit window
   * 
   * Security purpose: Limits request count per IP to prevent abuse and brute force attacks
   * Environment variable: RATE_LIMIT_MAX
   * Default: 100 requests per window
   * Production recommendation: 100 for APIs, adjust based on expected legitimate traffic
   * 
   * @type {number}
   * @default 100
   */
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  /**
   * Trust proxy setting for Express when behind load balancer/reverse proxy
   * 
   * Security purpose: Enables correct client IP resolution for rate limiting when behind proxy
   * Environment variable: TRUST_PROXY
   * Default: false (direct client connections)
   * Production recommendation: Set to 'true' when behind load balancer, nginx, or cloud proxy
   * 
   * @type {boolean}
   * @default false
   */
  trustProxy: process.env.TRUST_PROXY === 'true'
};
