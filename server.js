/**
 * Production-grade Express.js Server
 * 
 * This server implements enterprise-level robustness features including:
 * - Request body parsing (JSON and URL-encoded)
 * - Graceful shutdown handling (SIGTERM/SIGINT)
 * - Global error handling middleware
 * - 404 handler for undefined routes
 * - Process-level error handlers (uncaughtException/unhandledRejection)
 * - Shutdown request rejection during termination
 */

const express = require('express');

// Server configuration constants
const hostname = '127.0.0.1';
const port = 3000;

// Initialize Express application
const app = express();

// =============================================================================
// REQUEST BODY PARSING MIDDLEWARE
// =============================================================================

// Parse JSON request bodies with error handling for malformed JSON
app.use(express.json());

// Parse URL-encoded request bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// SHUTDOWN STATE MANAGEMENT
// =============================================================================

// Flag to track if server is in shutdown state
let isShuttingDown = false;

// Middleware to reject new requests during shutdown
// Returns 503 Service Unavailable with Connection: close header
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
    return res.status(503).send('Server is shutting down');
  }
  next();
});

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

// Root endpoint - returns greeting message
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

// Evening endpoint - returns evening greeting
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// =============================================================================
// 404 HANDLER
// =============================================================================

// Catch-all middleware for undefined routes
// Must be placed after all route definitions
app.use((req, res, next) => {
  res.status(404).send('Not Found');
});

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================

// Error handling middleware (must have 4 parameters)
// Catches all errors thrown in route handlers and middleware
app.use((err, req, res, next) => {
  // Log error for debugging and monitoring
  console.error('Error occurred:', err.message || err);
  
  // Extract status code from error object, default to 500
  const statusCode = err.status || err.statusCode || 500;
  
  // Return JSON error response without exposing stack traces
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

// Start server and capture reference for graceful shutdown
const server = app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// =============================================================================
// GRACEFUL SHUTDOWN IMPLEMENTATION
// =============================================================================

/**
 * Graceful shutdown function
 * Handles cleanup when server receives termination signal
 * 
 * @param {string} signal - The signal that triggered shutdown (e.g., 'SIGTERM', 'SIGINT')
 */
const gracefulShutdown = (signal) => {
  console.log(`${signal} received: starting graceful shutdown...`);
  
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  // Close HTTP server and stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err.message);
      process.exit(1);
    }
    console.log('HTTP server closed successfully');
    process.exit(0);
  });
  
  // Force exit after timeout if graceful shutdown fails
  // This prevents hanging if connections don't close properly
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// =============================================================================
// SIGNAL HANDLERS
// =============================================================================

// Handle SIGTERM signal (sent by process managers like PM2, Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT signal (sent by Ctrl+C in terminal)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// PROCESS-LEVEL ERROR HANDLERS
// =============================================================================

// Handle uncaught exceptions that bypass normal error handling
// These are typically programming errors that should trigger restart
process.on('uncaughtException', (err, origin) => {
  console.error('Uncaught Exception:', err.message);
  console.error('Exception origin:', origin);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
// These occur when promises are rejected without .catch() handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Export app and gracefulShutdown for testing purposes
// When this file is run directly, server is already started above
// When imported as a module, server instance is available for testing
if (require.main === module) {
  // Server already started above when run directly
}

module.exports = { app, gracefulShutdown };
