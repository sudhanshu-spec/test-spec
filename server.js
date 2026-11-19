/**
 * HTTP Server Entry Point
 *
 * This module is the only place that binds a socket: it starts the Express
 * application built by src/app.js and stops it again on SIGTERM or SIGINT. The
 * app factory itself never listens, so requiring src/app.js from a test or a
 * tool opens no port and installs no signal handler.
 *
 * Responsibilities, and nothing else:
 *   - bind config.host / config.port and log the address that is served
 *   - report a failed bind (EADDRINUSE and friends) without throwing, and make a
 *     real `node server.js` boot exit non-zero
 *   - close the HTTP server and the database on SIGTERM or SIGINT
 *
 * Configuration is separated from app creation for better testability.
 *
 * Architecture:
 *   - src/app.js       → Express app factory (routes & middleware)
 *   - src/config/      → Environment-driven configuration
 *   - src/routes/      → Route handlers
 *   - src/db/          → SQLite connection, required lazily on shutdown only
 *
 * Usage:
 *   npm start                              # Default: http://127.0.0.1:3000/
 *   HOST=0.0.0.0 PORT=8080 npm start       # Custom binding
 *
 * @module server
 */

'use strict';

// =============================================================================
// Dependencies
// =============================================================================

/**
 * Pre-configured Express application instance.
 * Routes and middleware are already mounted in src/app.js.
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Application configuration settings.
 * Values are sourced from environment variables with sensible defaults.
 * @type {{ host: string, port: number, env: string }}
 */
const config = require('./src/config');

// =============================================================================
// Server Initialization
// =============================================================================

/**
 * The listening HTTP server.
 *
 * Held in a module constant so the error path and the shutdown path act on the
 * same instance that app.listen() returned.
 * @type {import('node:http').Server}
 */
const server = app.listen(config.port, config.host, (listenError) => {
  // Express 5 passes this same callback the bind error as well as the ready
  // signal (it registers the callback as an 'error' listener too), so the
  // startup line is logged only once the address is actually bound. A failed
  // bind is reported by handleListenError below.
  if (listenError) {
    return;
  }

  // Display startup confirmation with the server URL
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

/**
 * True once a shutdown has started, so a second signal cannot close twice.
 * @type {boolean}
 */
let shuttingDown = false;

/**
 * Report a failure to bind the configured address.
 *
 * Nothing is listening when this runs, so the server is closed here — tolerating
 * a server that never began listening, which Node reports through the close
 * callback as ERR_SERVER_NOT_RUNNING rather than by throwing. The diagnostic
 * names the address and the error, so a failed boot is diagnosable from the log
 * alone, and the handler never throws and never terminates the process directly.
 *
 * The exit code is set only when this module is the process entry point: a real
 * `node server.js` boot must fail non-zero on EADDRINUSE, while a process that
 * merely required this module (a test runner hosting the same handler) must keep
 * its own exit code.
 *
 * @param {NodeJS.ErrnoException} error - Error emitted by the HTTP server.
 * @returns {void}
 */
function handleListenError(error) {
  const code = error && error.code ? ` (${error.code})` : '';
  const reason = (error && error.message) || String(error);

  console.error(`Failed to listen on http://${config.host}:${config.port}/${code}: ${reason}`);

  try {
    server.close((closeError) => {
      // The bind never completed, so there is nothing to release; that outcome is
      // expected here rather than a second failure worth reporting.
      if (closeError && closeError.code !== 'ERR_SERVER_NOT_RUNNING') {
        console.error(`Failed to close the HTTP server: ${closeError.message}`);
      }
    });
  } catch (closeError) {
    console.error(`Failed to close the HTTP server: ${closeError.message}`);
  }

  if (require.main === module) {
    process.exitCode = 1;
  }
}

server.on('error', handleListenError);

/**
 * Stop the HTTP server and the database, then exit successfully.
 *
 * Registered for both SIGTERM and SIGINT, and guarded so a repeated signal
 * cannot close the server a second time. The database module is required here,
 * inside the close callback, rather than at load time: it is the only dependency
 * of this module that pulls in the native SQLite driver, and keeping it out of
 * the load path leaves the require surface of the entry point at src/app and
 * src/config. closeDb() is a no-op when no connection was ever opened, so a
 * process that never served a database request still shuts down cleanly.
 *
 * @param {string} signal - Name of the signal that triggered the shutdown.
 * @returns {void}
 */
function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received, shutting down the HTTP server`);

  server.close((closeError) => {
    if (closeError) {
      console.error(`Failed to close the HTTP server: ${closeError.message}`);
    }

    try {
      const { closeDb } = require('./src/db');
      closeDb();
    } catch (dbError) {
      // A database that was never opened, or a module that cannot be loaded,
      // leaves nothing to release; it must not stop the process from exiting.
      console.error(`Failed to close the database: ${dbError.message}`);
    }

    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
