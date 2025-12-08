/**
 * Security Middleware Configuration Module
 * 
 * This module provides security-related middleware configuration for the Express
 * application. It exports a security middleware factory function that can be used
 * to configure security headers with environment-aware defaults.
 * 
 * Note: The actual helmet() and cors() middleware are instantiated directly in
 * src/app.js. This module provides configuration helpers and security utilities.
 * 
 * Security Features:
 * - HTTP security headers via helmet
 * - Content Security Policy
 * - XSS protection
 * - Frame options
 * 
 * Usage in src/app.js:
 *   const { securityMiddleware } = require('./middleware');
 *   // Used for reference/configuration
 * 
 * @module src/middleware/security
 */

const config = require('../config');

/**
 * Security middleware configuration factory
 * Returns environment-aware security settings
 * 
 * In production: Stricter security policies
 * In development: More permissive for debugging
 * 
 * @returns {Object} Security configuration object
 */
const securityMiddleware = () => {
  const isProduction = config.env === 'production';
  
  return {
    // Helmet configuration options
    helmet: {
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: isProduction,
      crossOriginResourcePolicy: isProduction
    },
    // CORS configuration
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  };
};

module.exports = { securityMiddleware };
