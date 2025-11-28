/**
 * Express Server with Comprehensive Security Middleware
 * 
 * This server implements a complete security middleware stack including:
 * - HTTP security headers via Helmet.js
 * - CORS (Cross-Origin Resource Sharing) policy
 * - Rate limiting for DoS and brute force protection
 * - Input validation middleware
 * - Production-safe error handling
 * - Optional HTTPS support
 * 
 * Middleware order follows security best practices:
 * Helmet → CORS → Rate Limiter → Body Parser → Routes → Error Handler
 * 
 * @module server
 */

'use strict';

// Core Node.js modules
const https = require('https');
const fs = require('fs');

// Express framework
const express = require('express');

// Security middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Configuration modules
const securityConfig = require('./config/security');
const corsConfig = require('./config/cors');
const rateLimitConfig = require('./config/rate-limit');

// Custom middleware
const errorHandler = require('./middleware/errorHandler');

/**
 * Environment configuration
 */
const isProduction = process.env.NODE_ENV === 'production';
const hostname = process.env.HOST || '127.0.0.1';
const port = parseInt(process.env.PORT, 10) || 3000;
const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 443;

/**
 * Create Express application
 */
const app = express();

// =============================================================================
// SECURITY MIDDLEWARE STACK (Order matters!)
// =============================================================================

/**
 * 1. Helmet.js - HTTP Security Headers
 * Sets Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
 * removes X-Powered-By, and configures other security headers.
 * Must be applied first to protect all responses.
 */
app.use(helmet(securityConfig));

/**
 * 2. CORS - Cross-Origin Resource Sharing
 * Controls which domains can access the API.
 * Applied early to reject unauthorized origins before processing.
 */
app.use(cors(corsConfig));

/**
 * 3. Rate Limiting - Request Throttling
 * Limits repeated requests from the same IP to prevent
 * DoS attacks, brute force attempts, and API abuse.
 */
app.use(rateLimit(rateLimitConfig));

/**
 * 4. Body Parsing - Request Body Processing
 * Parses JSON request bodies with size limits to prevent
 * payload-based attacks.
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Health check / Root endpoint
 * Returns a simple greeting message
 * 
 * @route GET /
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * Evening greeting endpoint
 * Returns an evening greeting message
 * 
 * @route GET /evening
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Health check endpoint for monitoring
 * Returns server health status
 * 
 * @route GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE (Must be last)
// =============================================================================

/**
 * 404 Handler - Not Found
 * Catches requests that don't match any route
 */
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

/**
 * Error Handler - Production-Safe Error Responses
 * Sanitizes error responses to prevent information disclosure.
 * Must be registered last to catch all errors.
 */
app.use(errorHandler);

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

/**
 * Start HTTP server
 */
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});

/**
 * Start HTTPS server (if SSL certificates are configured)
 * 
 * Requires SSL_KEY_PATH and SSL_CERT_PATH environment variables
 * pointing to valid SSL certificate and private key files.
 */
const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;

if (sslKeyPath && sslCertPath) {
  try {
    // Check if certificate files exist
    if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
      
      https.createServer(httpsOptions, app).listen(httpsPort, hostname, () => {
        console.log(`HTTPS Server running at https://${hostname}:${httpsPort}/`);
      });
    } else {
      console.warn('SSL certificate files not found. HTTPS server not started.');
      console.warn(`Expected key at: ${sslKeyPath}`);
      console.warn(`Expected cert at: ${sslCertPath}`);
    }
  } catch (err) {
    console.error('Failed to start HTTPS server:', err.message);
  }
} else if (isProduction) {
  console.warn('WARNING: Running in production without HTTPS is not recommended.');
  console.warn('Set SSL_KEY_PATH and SSL_CERT_PATH environment variables to enable HTTPS.');
}

/**
 * Export the Express app for testing
 */
module.exports = app;
