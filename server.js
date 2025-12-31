/**
 * Production-Ready Express Server
 * 
 * Features:
 * - Express 5.x HTTP server with route handlers
 * - Centralized error handling middleware
 * - 404 handler for undefined routes
 * - Graceful shutdown on SIGTERM/SIGINT signals
 * - Global exception handlers for uncaughtException and unhandledRejection
 * - Exports for testing purposes
 */

const express = require('express');

// Server configuration
const hostname = '127.0.0.1';
const port = 3000;

// Initialize Express application with strict routing
// strict: true means /evening and /evening/ are treated as different routes
const app = express();
app.set('strict routing', true);

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET / - Returns Hello World greeting
 */
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

/**
 * GET /evening - Returns evening greeting
 */
app.get('/evening', (req, res) => {
  res.send('Good evening');
});

// =============================================================================
// 404 Handler - Catches all undefined routes
// Must be placed after all route definitions
// =============================================================================

/**
 * 404 Not Found Handler
 * Catches requests to undefined routes and returns 404 status
 */
app.use((req, res, next) => {
  res.status(404).send('Not Found');
});

// =============================================================================
// Error Handling Middleware
// Must have 4 parameters (err, req, res, next) for Express to recognize it
// =============================================================================

/**
 * Centralized Error Handler
 * Catches all errors thrown in route handlers and middleware
 * Logs error details and returns appropriate HTTP response
 * 
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.use((err, req, res, next) => {
  // Log error for debugging and monitoring
  console.error('Error:', err.message);
  
  // Determine appropriate status code
  const statusCode = err.statusCode || 500;
  
  // Send error response to client
  res.status(statusCode).send(err.message || 'Internal Server Error');
});

// =============================================================================
// Server Initialization
// Store server reference for graceful shutdown capability
// =============================================================================

const server = app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// =============================================================================
// Graceful Shutdown Handler
// Properly closes server and allows in-flight requests to complete
// =============================================================================

/**
 * Graceful Shutdown Function
 * Closes the HTTP server gracefully, allowing in-flight requests to complete
 * Forces exit after timeout if connections don't close in time
 * 
 * @param {string} signal - The signal that triggered shutdown (SIGTERM or SIGINT)
 */
const gracefulShutdown = (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);
  
  // Stop accepting new connections and wait for existing ones to finish
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 5 seconds if connections don't close
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

// Handle SIGTERM signal (sent by process managers like PM2, Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT signal (sent by Ctrl+C in terminal)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Global Exception Handlers
// Safety net for uncaught errors that escape the normal error handling flow
// =============================================================================

/**
 * Uncaught Exception Handler
 * Catches synchronous exceptions that weren't handled by try/catch
 * Logs the error and exits the process to prevent undefined state
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

/**
 * Unhandled Promise Rejection Handler
 * Catches rejected promises that don't have a .catch() handler
 * Logs the rejection details and exits the process
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// =============================================================================
// Module Exports
// Export app and server for testing purposes
// =============================================================================

module.exports = { app, server };
