/**
 * @fileoverview Server Entry Point — Express Application Bootstrap
 *
 * This module is the runnable entry point for the Hello World Express
 * tutorial server. It imports the configured Express application instance
 * from `src/app`, resolves runtime configuration (host, port) from
 * `src/config`, and binds the application to a TCP listener via
 * `app.listen(port, host, callback)`.
 *
 * Responsibilities:
 *  - Bootstrap the Express HTTP listener on the configured host:port.
 *  - Log a startup banner once the listener is ready.
 *  - Register a server-level `error` event handler that gracefully reports
 *    EADDRINUSE conditions (and other unexpected errors) without crashing
 *    the process abruptly.
 *  - Export the underlying `http.Server` instance so that test suites and
 *    operational tooling can invoke `.close(callback)` for graceful
 *    shutdown or subscribe to additional lifecycle events.
 *
 * Architectural notes:
 *  - This file MUST NOT instantiate Express or define routes/middleware;
 *    those concerns live in `src/app.js` (Factory pattern). Doing so would
 *    duplicate the Express instance and bypass the route mounting performed
 *    by the application factory.
 *  - Configuration MUST be sourced from `src/config` (Twelve-Factor App
 *    methodology) — never from `process.env` directly within this file.
 *    This preserves the indirection layer that allows tests to mock the
 *    configuration module without touching the actual environment.
 *  - All module loading uses CommonJS (`require`/`module.exports`) to
 *    remain consistent with the rest of the codebase.
 *
 * @module server
 */

'use strict';

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

/**
 * The configured Express application instance.
 *
 * This value is produced by the factory at `src/app.js`, which already
 * instantiates Express, mounts `mainRoutes` at `/`, and exports the
 * configured app. We consume it here without further configuration.
 *
 * @type {import('express').Application}
 */
const app = require('./src/app');

/**
 * Runtime configuration values.
 *
 * Sourced from `src/config/index.js`, which centralizes environment
 * variable resolution following the Twelve-Factor App methodology.
 * We destructure only the fields needed for binding the listener:
 *  - `host`: TCP bind address (default `'127.0.0.1'`)
 *  - `port`: TCP bind port  (default `3000`)
 *
 * The `env` field is intentionally not destructured here because it
 * is not required to bring the listener online; environment-specific
 * behavior (e.g., production vs. development logging) belongs in
 * higher-level modules.
 *
 * @type {{ host: string, port: number }}
 */
const { host, port } = require('./src/config');

// ---------------------------------------------------------------------------
// Listener Binding
// ---------------------------------------------------------------------------

/**
 * Bind the Express app to the configured TCP host/port.
 *
 * This uses the canonical three-argument form of
 * `app.listen(port, host, callback)`. The callback executes once the
 * listener is bound and ready to accept connections; it logs the
 * startup banner that operators rely on as a readiness signal.
 *
 * The returned object is a Node.js `http.Server` instance that supports
 * `.close(callback)` for graceful shutdown and `.on(event, handler)` for
 * subscribing to lifecycle events such as `'error'`, `'listening'`, and
 * `'close'`.
 *
 * @type {import('http').Server}
 */
const server = app.listen(port, host, () => {
  // The trailing slash after the port is intentional and is asserted
  // verbatim by the lifecycle test suite. Do not alter the format.
  console.log(`Server running at http://${host}:${port}/`);
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

/**
 * Server-level error event listener.
 *
 * This handler is registered immediately after `app.listen()` returns
 * (i.e., synchronously, OUTSIDE the listen callback) so that it is
 * always wired up regardless of whether the listener successfully began
 * accepting connections. This is essential for surfacing port-binding
 * failures such as `EADDRINUSE`, which Node.js emits via the `'error'`
 * event before (or instead of) ever invoking the listen callback.
 *
 * Behavior:
 *  - `EADDRINUSE`: log a clear, actionable message via `console.error`
 *    and return without throwing. Operational supervisors (e.g., process
 *    managers) can decide whether to retry on a different port.
 *  - Any other error code: log the error message via `console.error`.
 *
 * The handler intentionally does NOT throw and does NOT call
 * `process.exit()`. Throwing from an `'error'` listener would result in
 * an unhandled exception that crashes the process abruptly; calling
 * `process.exit()` would terminate test runners (such as Jest) before
 * they could complete assertions. Higher-level supervisors decide how
 * to react to a misbehaving listener, keeping this handler both
 * test-friendly and operationally flexible.
 *
 * @param {NodeJS.ErrnoException} err - The error emitted by `http.Server`.
 */
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. Please choose a different port.`
    );
  } else {
    console.error(`Server error: ${err.message}`);
  }
});

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

/**
 * Export the `http.Server` instance so external code can:
 *  - Invoke `.close(callback)` for graceful shutdown (used by the
 *    lifecycle test suite and by future signal handlers / process
 *    managers).
 *  - Subscribe to additional events via `.on(event, handler)`.
 *
 * The bare server instance (not an object wrapping it) is exported
 * intentionally — this matches the contract expected by
 * `tests/lifecycle/server.test.js`, which interacts directly with
 * `.close()` and `.on()` on the imported value.
 */
module.exports = server;
