/**
 * Express.js Server with Comprehensive Security Enhancements
 * 
 * This server implements defense-in-depth security through multiple middleware layers:
 * - 11+ HTTP security headers via helmet.js (CSP, HSTS, X-Frame-Options, etc.)
 * - Cross-Origin Resource Sharing (CORS) policies with explicit origin whitelist
 * - Rate limiting to prevent DoS attacks (100 requests per 15 minutes per IP)
 * - Input validation support via body parser for JSON request processing
 * - HTTPS support with TLS encryption for secure data transmission
 * 
 * Security improvements protect against:
 * - XSS (Cross-Site Scripting) attacks
 * - Clickjacking via iframe embedding
 * - Man-in-the-middle attacks through HTTPS encryption
 * - Denial of Service (DoS) attacks through rate limiting
 * - MIME-sniffing vulnerabilities
 * - Unauthorized cross-origin requests
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

const app = express();

// Server references for graceful shutdown
let httpServer = null;
let httpsServer = null;
let isShuttingDown = false;

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
//    - Limits body size to prevent memory exhaustion attacks
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

// Health check endpoint for load balancers and monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 Not Found handler - catches all undefined routes
app.use((req, res, next) => {
  // Sanitize URL to prevent reflected XSS (defense-in-depth)
  const safePath = req.originalUrl.replace(/[<>]/g, '');
  res.status(404).json({
    error: 'Not Found',
    message: `Resource '${safePath}' not found`,
    statusCode: 404
  });
});

// Centralized error handling middleware (must be last middleware)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    statusCode: statusCode
  });
});

/**
 * Graceful Shutdown Handler
 * 
 * Handles SIGTERM and SIGINT signals for clean server termination.
 * Stops accepting new connections, completes active requests, then exits.
 */
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received: shutting down gracefully...`);
  
  const forceShutdownTimeout = setTimeout(() => {
    console.error('Forced shutdown: timeout exceeded');
    process.exit(1);
  }, 10000);

  let serversToClose = 0;
  let serversClosed = 0;

  function onServerClosed() {
    serversClosed++;
    if (serversClosed >= serversToClose) {
      clearTimeout(forceShutdownTimeout);
      console.log('Graceful shutdown completed');
      process.exit(0);
    }
  }

  if (httpServer) {
    serversToClose++;
    httpServer.close(onServerClosed);
  }
  if (httpsServer) {
    serversToClose++;
    httpsServer.close(onServerClosed);
  }

  if (serversToClose === 0) {
    clearTimeout(forceShutdownTimeout);
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process-level error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Server Startup — HTTP and HTTPS Configuration
 * 
 * Starts HTTP and HTTPS servers, stores references for graceful shutdown,
 * and registers server error handlers.
 * 
 * HTTP server binds to 127.0.0.1:3000 for backward compatibility.
 * HTTPS server binds to 127.0.0.1:3443 conditionally in non-production environments.
 * In production environments, HTTP should redirect to HTTPS or be disabled
 * entirely behind a reverse proxy (nginx, Apache) that handles TLS termination.
 * 
 * Binds to 127.0.0.1 (localhost) for development security - not accessible
 * from external networks. For production deployment, configure appropriate
 * network interfaces and firewall rules.
 */
function startServer() {
  httpServer = app.listen(port, hostname, () => {
    console.log(`HTTP Server running at http://${hostname}:${port}/`);
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    } else {
      console.error('HTTP Server error:', err.message);
    }
    process.exit(1);
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
      const httpsOptions = {
        key: fs.readFileSync('./config/ssl/key.pem'),
        cert: fs.readFileSync('./config/ssl/cert.pem')
      };
      
      httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(httpsPort, hostname, () => {
        console.log(`HTTPS Server running at https://${hostname}:${httpsPort}/`);
        console.log('Note: Self-signed certificate will show browser warning');
      });

      httpsServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`HTTPS Port ${httpsPort} is already in use`);
        } else {
          console.error('HTTPS Server error:', err.message);
        }
      });
    } catch (error) {
      console.log('HTTPS server not started: SSL certificates not found.');
      console.log('To enable HTTPS, run: cd config/ssl && bash generate-cert.sh');
      console.log(`Error details: ${error.message}`);
    }
  }
}

// Start server only when run directly (not when imported for testing)
if (require.main === module) {
  startServer();
}

// Export app for testing
module.exports = { app, startServer };
