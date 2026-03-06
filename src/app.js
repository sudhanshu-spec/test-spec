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
 * @module src/app
 */

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Disable the X-Powered-By header to prevent exposing the framework identity
 * in HTTP responses. This is a security best practice that reduces information
 * leakage to potential attackers.
 */
app.disable('x-powered-by');

/**
 * Security headers middleware
 * Sets recommended HTTP security headers on all responses to mitigate
 * common web vulnerabilities:
 * - X-Content-Type-Options: Prevents MIME-type sniffing
 * - X-Frame-Options: Prevents clickjacking by disabling framing
 * - Content-Security-Policy: Restricts resource loading to same-origin defaults
 */
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Content-Security-Policy', "default-src 'none'");
  next();
});

/**
 * Mount main routes at root path
 * This preserves the original route paths:
 * - GET '/' -> mainRoutes handles this
 * - GET '/evening' -> mainRoutes handles this
 */
app.use('/', mainRoutes);

module.exports = app;
