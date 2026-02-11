/**
 * Centralized Environment Configuration Module
 *
 * This module serves as the single source of truth for all environment-derived
 * settings used throughout the application. Every module that needs access to
 * environment variables must import this config object rather than reading
 * from process.env directly.
 *
 * NOTE: dotenv.config() is NOT called in this file. It is invoked as the very
 * first statement in src/server.js, which populates process.env before any
 * other module is required. By the time this module is loaded, all .env
 * variables are already available on process.env.
 *
 * Environment Variable Reference:
 *   PORT        - HTTP server listening port (default: 3000)
 *   NODE_ENV    - Runtime environment identifier (default: 'development')
 *   LOG_LEVEL   - Minimum Winston log severity level (default: 'debug')
 *   CORS_ORIGIN - Allowed CORS origin(s) (default: '*')
 *
 * These keys are mirrored in:
 *   - .env              (development values)
 *   - .env.example      (placeholder template for onboarding)
 *   - ecosystem.config.js (PM2 env and env_production blocks)
 *
 * Consumers:
 *   - src/server.js          → port, nodeEnv
 *   - src/app.js             → corsOrigin
 *   - src/config/logger.js   → logLevel, nodeEnv
 *
 * @module config
 */

'use strict';

// ---------------------------------------------------------------------------
// Configuration Object
// ---------------------------------------------------------------------------
// All values fall back to sensible defaults so the application can start
// without a .env file during local development or in environments where
// variables are injected by the process manager (e.g., PM2 ecosystem config).
// ---------------------------------------------------------------------------

const config = {
  /**
   * TCP port the HTTP server will bind to.
   * Parsed as a base-10 integer; falls back to 3000 if PORT is unset or NaN.
   * @type {number}
   */
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Current runtime environment.
   * Typical values: 'development', 'production', 'test'.
   * @type {string}
   */
  nodeEnv: process.env.NODE_ENV || 'development',

  /**
   * Minimum severity level for Winston logger output.
   * Valid levels (lowest to highest priority): 'debug', 'http', 'info', 'warn', 'error'.
   * When not explicitly set via LOG_LEVEL, the logger module applies an
   * environment-aware default: 'debug' in development, 'info' in production.
   * @type {string|undefined}
   */
  logLevel: process.env.LOG_LEVEL || '',

  /**
   * Allowed origin(s) for Cross-Origin Resource Sharing (CORS).
   * Set to a specific origin (e.g., 'https://example.com') in production.
   * The wildcard '*' permits all origins and is suitable only for development.
   * @type {string}
   */
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
