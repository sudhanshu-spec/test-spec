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

'use strict';

const express = require('express');
const { mainRoutes } = require('./routes');

const app = express();

/**
 * Disable the X-Powered-By header to prevent server technology fingerprinting.
 * By default Express sets "X-Powered-By: Express" on every response, which
 * exposes the framework identity to potential attackers during reconnaissance.
 */
app.disable('x-powered-by');

/**
 * Enable case-sensitive routing so that '/Evening' and '/EVENING'
 * do not match the '/evening' route (Express 5.x defaults to false).
 */
app.set('case sensitive routing', true);

/**
 * Security headers middleware.
 * Sets essential HTTP security headers on every response to harden the
 * application against common web vulnerabilities:
 *
 * - X-Content-Type-Options: nosniff — prevents browsers from MIME-sniffing
 *   the response away from the declared Content-Type.
 * - X-Frame-Options: DENY — prevents the page from being rendered inside
 *   an iframe, mitigating clickjacking attacks.
 * - Content-Security-Policy: default-src 'none' — restrictive CSP baseline
 *   appropriate for plain-text API responses with no embedded resources.
 */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
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
