/**
 * Express.js Server with Comprehensive Security Enhancements
 * 
 * This server implements defense-in-depth security through multiple middleware layers:
 * - 11+ HTTP security headers via helmet.js (CSP, HSTS, X-Frame-Options, etc.)
 * - Cross-Origin Resource Sharing (CORS) policies with explicit origin whitelist
 * - Rate limiting to prevent DoS attacks (100 requests per 15 minutes per IP)
 * - Input validation support via body parser for JSON request processing
 * - HTTPS support with TLS encryption for secure data transmission
 * - Global error handling with structured JSON responses
 * - 404 Not Found handler for undefined routes
 * - Graceful shutdown handling for SIGTERM/SIGINT signals
 * - Process-level error handlers for uncaught exceptions
 * 
 * Security improvements protect against:
 * - XSS (Cross-Site Scripting) attacks
 * - Clickjacking via iframe embedding
 * - Man-in-the-middle attacks through HTTPS encryption
 * - Denial of Service (DoS) attacks through rate limiting
 * - MIME-sniffing vulnerabilities
 * - Unauthorized cross-origin requests
 * - Memory exhaustion via large JSON payloads
 * - Stack trace exposure in production environments
 * 
 * @module server
 * @requires express
 * @requires helmet - Security headers middleware (v8.1.0)
 * @requires express-rate-limit - Rate limiting middleware (v8.2.1)
 * @requires cors - CORS policy middleware (v2.8.5)
 * @requires https - Node.js HTTPS server module
 * @requires fs - File system for SSL certificate loading
 */

const express = require('express');
// Security middleware imports
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
// HTTPS support imports
const https = require('https');
const fs = require('fs');
// Security configuration imports
const { securityConfig, corsOptions, limiterConfig } = require('./middleware/security');

const hostname = '127.0.0.1';
const port = 3000;
const httpsPort = 3443;

/**
 * Server State Management for Graceful Shutdown
 * 
 * These variables track server instances and shutdown state to enable
 * proper cleanup when the process receives termination signals.
 */
let httpServer = null;
let httpsServer = null;
let isShuttingDown = false;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds timeout for graceful shutdown

const app = express();

/**
 * Security Middleware Stack Configuration
 * 
 * CRITICAL: Middleware order is intentional and must be preserved for optimal security.
 * Each layer provides a specific security function as part of defense-in-depth strategy.
 * 
 * Middleware execution order:
 * 1. helmet() - Security headers must be set before any response processing
 * 2. cors() - Cross-origin policy enforcement before request handling
 * 3. express.json() - Body parsing before validation and rate limit checks
 * 4. rateLimit() - Request throttling after parsing but before route handlers
 */

// 1. Helmet.js: Configure 11+ security headers including:
//    - Content-Security-Policy: Prevents XSS attacks by controlling resource loading
//    - Strict-Transport-Security: Forces HTTPS connections for 1 year
//    - X-Frame-Options: Prevents clickjacking by blocking iframe embedding
//    - X-Content-Type-Options: Prevents MIME-sniffing attacks
//    - Removes X-Powered-By header to prevent framework fingerprinting
app.use(helmet(securityConfig));

// 2. CORS: Control cross-origin access with explicit origin whitelist
//    - Allows only whitelisted domains from ALLOWED_ORIGINS environment variable
//    - Permits GET and POST methods only
//    - Enables credentials (cookies, auth headers) for trusted origins
//    - Prevents unauthorized cross-domain API access and CSRF attacks
app.use(cors(corsOptions));

// 3. Body Parser: Parse JSON request bodies for input validation
//    - Enables req.body access for POST/PUT request processing
//    - Required for express-validator validation chains
//    - Limits body size to 100kb to prevent memory exhaustion attacks
//    - strict: true ensures only valid JSON objects/arrays are parsed
app.use(express.json({ limit: '100kb', strict: true }));

// 4. Rate Limiting: Prevent DoS attacks with IP-based request throttling
//    - Limits each IP address to 100 requests per 15-minute sliding window
//    - Returns HTTP 429 (Too Many Requests) when limit exceeded
//    - Includes draft-8 RateLimit headers for client awareness
//    - Protects against brute-force attacks and resource exhaustion
app.use(rateLimit(limiterConfig));

// Application Routes (existing functionality preserved)
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

app.get('/evening', (req, res) => {
  res.send('Good evening');
});

/**
 * 404 Not Found Handler
 * 
 * Catches all requests that don't match any defined routes.
 * Creates a standardized error with 404 status and passes it to the error handler.
 * Must be placed after all route definitions but before the error handling middleware.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

/**
 * Global Error Handling Middleware
 * 
 * Centralizes error handling for the entire application.
 * CRITICAL: Must have 4 parameters (err, req, res, next) to be recognized by Express as error middleware.
 * 
 * Features:
 * - Logs errors with timestamps for debugging
 * - Hides stack traces in production for security
 * - Returns structured JSON error responses
 * - Handles both application errors and HTTP errors
 * 
 * @param {Error} err - Error object passed from previous middleware or route handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (required for signature)
 */
app.use((err, req, res, next) => {
  // Log error with timestamp for debugging and monitoring
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  
  // Log stack trace only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  // Determine appropriate status code
  const statusCode = err.status || err.statusCode || 500;
  
  // Build error response object
  const errorResponse = {
    error: {
      message: statusCode === 500 && process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message,
      status: statusCode
    }
  };
  
  // Include stack trace in non-production environments for debugging
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack;
  }
  
  // Send JSON error response
  res.status(statusCode).json(errorResponse);
});

/**
 * Graceful Shutdown Function
 * 
 * Handles clean server shutdown when receiving termination signals.
 * Closes all server connections and allows ongoing requests to complete.
 * 
 * Process:
 * 1. Sets shutdown flag to prevent multiple shutdown attempts
 * 2. Logs the shutdown signal received
 * 3. Closes HTTP and HTTPS servers to stop accepting new connections
 * 4. Sets a timeout to force exit if graceful shutdown takes too long
 * 5. Exits cleanly after all servers are closed
 * 
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT, etc.)
 */
function gracefulShutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  console.log(`${signal} received: Starting graceful shutdown...`);
  
  // Collect promises for closing all servers
  const serversToClose = [];
  
  if (httpServer) {
    serversToClose.push(
      new Promise((resolve) => {
        httpServer.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      })
    );
  }
  
  if (httpsServer) {
    serversToClose.push(
      new Promise((resolve) => {
        httpsServer.close(() => {
          console.log('HTTPS server closed');
          resolve();
        });
      })
    );
  }
  
  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
  
  // Wait for all servers to close, then exit cleanly
  Promise.all(serversToClose)
    .then(() => {
      clearTimeout(forceExitTimeout);
      console.log('All servers closed, exiting process');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during shutdown:', err.message);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    });
}

/**
 * Process Signal Handlers
 * 
 * Register handlers for process termination signals and unhandled errors.
 * These ensure the server shuts down gracefully and resources are cleaned up.
 */

// Handle SIGTERM signal (sent by process managers, Docker, Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT signal (sent by Ctrl+C in terminal)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Uncaught Exception Handler
 * 
 * Catches synchronous errors that escape the Express middleware chain.
 * Logs the error and initiates graceful shutdown to prevent undefined state.
 * 
 * CRITICAL: After an uncaught exception, the process state may be corrupted.
 * Best practice is to log, cleanup, and restart the process.
 */
process.on('uncaughtException', (err, origin) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err.message);
  console.error('Origin:', origin);
  console.error(err.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * Unhandled Promise Rejection Handler
 * 
 * Catches promise rejections that are not handled with .catch() or try/catch.
 * Logs the rejection for debugging. Express 5 handles these automatically in
 * middleware, but this catches any that escape outside the request lifecycle.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise);
  console.error('Reason:', reason);
});

/**
 * Server Startup Function
 * 
 * Starts both HTTP and HTTPS servers. Wrapped in a function to support
 * conditional startup (for testing) and to store server references for
 * graceful shutdown.
 */
function startServers() {
  /**
   * HTTP Server Configuration
   * 
   * Maintains backward compatibility by keeping HTTP server on port 3000.
   * In production environments, HTTP should redirect to HTTPS or be disabled
   * entirely behind a reverse proxy (nginx, Apache) that handles TLS termination.
   * 
   * Binds to 127.0.0.1 (localhost) for development security - not accessible
   * from external networks. For production deployment, configure appropriate
   * network interfaces and firewall rules.
   */
  httpServer = app.listen(port, hostname, () => {
    console.log(`HTTP Server running at http://${hostname}:${port}/`);
  });
  
  // Handle HTTP server errors
  httpServer.on('error', (err) => {
    console.error('HTTP Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
  });

  /**
   * HTTPS Server Configuration (Development Environment)
   * 
   * Configures encrypted HTTPS server on port 3443 using TLS certificates.
   * Conditional startup prevents errors in production where certificates
   * are managed by external tools (Let's Encrypt, certificate managers).
   * 
   * Certificate Requirements:
   * - Development: Self-signed certificates generated via generate-cert.sh script
   * - Production: Commercial CA or Let's Encrypt certificates with auto-renewal
   * 
   * Security Benefits:
   * - Encrypts all data in transit (prevents man-in-the-middle attacks)
   * - Enables HSTS (HTTP Strict Transport Security) header functionality
   * - Protects sensitive data like authentication credentials
   * - Supports TLS 1.2+ with strong cipher suites
   * 
   * Certificate Generation:
   * Run: cd config/ssl && bash generate-cert.sh
   * This creates key.pem (private key) and cert.pem (self-signed certificate)
   * 
   * Note: Self-signed certificates trigger browser warnings. For production,
   * use certificates from trusted Certificate Authorities (Let's Encrypt, DigiCert, etc.)
   */
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Load SSL certificate and private key from file system
      // fs.readFileSync() is synchronous - acceptable during server startup
      const httpsOptions = {
        key: fs.readFileSync('./config/ssl/key.pem'),   // Private key (4096-bit RSA)
        cert: fs.readFileSync('./config/ssl/cert.pem')  // Self-signed certificate (365-day validity)
      };
      
      // Create HTTPS server with same Express app instance (shares routes and middleware)
      httpsServer = https.createServer(httpsOptions, app);
      
      httpsServer.listen(httpsPort, hostname, () => {
        console.log(`HTTPS Server running at https://${hostname}:${httpsPort}/`);
        console.log('Note: Self-signed certificate will show browser warning');
      });
      
      // Handle HTTPS server errors
      httpsServer.on('error', (err) => {
        console.error('HTTPS Server error:', err.message);
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${httpsPort} is already in use`);
        }
      });
    } catch (error) {
      // Graceful degradation: Continue with HTTP-only if certificates missing
      console.log('HTTPS server not started: SSL certificates not found.');
      console.log('To enable HTTPS, run: cd config/ssl && bash generate-cert.sh');
      console.log(`Error details: ${error.message}`);
    }
  }
}

/**
 * Getter function for HTTP server instance
 * 
 * Provides access to the HTTP server for testing and external control.
 * 
 * @returns {Object|null} The HTTP server instance or null if not started
 */
function getHttpServer() {
  return httpServer;
}

/**
 * Getter function for HTTPS server instance
 * 
 * Provides access to the HTTPS server for testing and external control.
 * 
 * @returns {Object|null} The HTTPS server instance or null if not started
 */
function getHttpsServer() {
  return httpsServer;
}

/**
 * Conditional Server Startup
 * 
 * Only starts servers when the file is run directly (not when imported for testing).
 * This allows test frameworks to import the module without starting the servers.
 */
if (require.main === module) {
  startServers();
}

/**
 * Module Exports
 * 
 * Exports the Express app and utility functions for testing and external use.
 * 
 * @exports app - The Express application instance
 * @exports startServers - Function to start HTTP and HTTPS servers
 * @exports gracefulShutdown - Function to gracefully shutdown servers
 * @exports getHttpServer - Function to get HTTP server instance
 * @exports getHttpsServer - Function to get HTTPS server instance
 */
module.exports = { 
  app, 
  startServers, 
  gracefulShutdown, 
  getHttpServer, 
  getHttpsServer 
};
