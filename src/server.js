/**
 * HTTP Server Entry Point
 *
 * This is the main entry point for the Express.js application. It performs
 * the following startup sequence:
 *
 *   1. Load environment variables from .env via dotenv (MUST be first)
 *   2. Import the Express app instance from app.js
 *   3. Import centralized configuration and Winston logger
 *   4. Bind the HTTP listener to the configured port
 *   5. Register graceful shutdown handlers for SIGTERM and SIGINT
 *
 * Graceful shutdown ensures that in-flight requests are completed before
 * the process exits, enabling PM2 zero-downtime reloads via `pm2 reload`.
 *
 * The server is stateless and safe for PM2 cluster mode operation.
 *
 * Usage:
 *   Development:  node src/server.js   (or npm start / npm run dev)
 *   Production:   pm2 start ecosystem.config.js --env production
 *
 * @module server
 */

'use strict';

// ---------------------------------------------------------------------------
// Step 1: Load Environment Variables (MUST be first)
// ---------------------------------------------------------------------------
// dotenv reads the .env file and populates process.env before any other
// module is required. This ensures that src/config/index.js and all
// downstream modules see the correct environment values.
// ---------------------------------------------------------------------------

require('dotenv').config();

// ---------------------------------------------------------------------------
// Step 2–3: Import Application Modules
// ---------------------------------------------------------------------------

const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');

// ---------------------------------------------------------------------------
// Step 4: Start HTTP Server
// ---------------------------------------------------------------------------

const server = app.listen(config.port, () => {
  logger.info(
    `Server running on port ${config.port} in ${config.nodeEnv} mode`
  );
});

// ---------------------------------------------------------------------------
// Step 5: Graceful Shutdown Handlers
// ---------------------------------------------------------------------------
// SIGTERM is sent by PM2 during `pm2 reload` or `pm2 stop`.
// SIGINT is sent when pressing Ctrl+C in the terminal.
// Both handlers close the HTTP server (allowing in-flight requests to drain)
// and then exit cleanly with code 0.
// ---------------------------------------------------------------------------

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
