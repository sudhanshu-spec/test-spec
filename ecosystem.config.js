'use strict';

/**
 * @fileoverview PM2 Process Manager Ecosystem Configuration
 *
 * Defines cluster-mode deployment settings for the Hello World Tutorial Server
 * using PM2. This configuration enables production-grade process management
 * with automatic restarts, memory-bounded operation, graceful shutdown, and
 * environment-specific variable overrides.
 *
 * PM2 reads this file to determine how to launch, monitor, and manage the
 * Node.js application process(es). The entry script is server.js, which
 * creates the Express HTTP server using the app factory in src/app.js.
 *
 * Usage (via npm scripts defined in package.json):
 *   npm run pm2:start              # Start with development defaults
 *   npm run pm2:stop               # Stop the PM2-managed process(es)
 *   npm run pm2:restart            # Restart the PM2-managed process(es)
 *   npm run pm2:logs               # View PM2 log output in real time
 *
 * Direct PM2 usage:
 *   npx pm2 start ecosystem.config.js                  # Development mode
 *   npx pm2 start ecosystem.config.js --env production  # Production mode
 *   npx pm2 reload ecosystem.config.js                  # Zero-downtime reload
 *   npx pm2 stop ecosystem.config.js                    # Stop all instances
 *   npx pm2 delete ecosystem.config.js                  # Remove from PM2 list
 *
 * Cluster Mode:
 *   In production, PM2 spawns one worker per CPU core (instances: 'max').
 *   This provides load balancing across cores and enables zero-downtime
 *   reloads via `pm2 reload`. Each worker runs an independent copy of
 *   server.js sharing the same TCP port through the Node.js cluster module.
 *
 * Environment Variables:
 *   Development (default): NODE_ENV=development, HOST=127.0.0.1, LOG_LEVEL=debug
 *   Production (--env production): NODE_ENV=production, HOST=0.0.0.0, LOG_LEVEL=info
 *
 * @module ecosystem.config
 * @see {@link module:server} Entry point script managed by PM2
 * @see {@link module:src/config} Application configuration consuming env vars
 */

module.exports = {
  /**
   * Array of application definitions for PM2 to manage.
   * Each entry describes a single application with its runtime configuration,
   * environment variables, logging, and lifecycle settings.
   *
   * @type {Array<Object>}
   */
  apps: [
    {
      // =====================================================================
      // Application Identification
      // =====================================================================

      /**
       * Display name shown in PM2 process list (`pm2 list`).
       * Used as the identifier for pm2 stop, restart, and delete commands.
       * @type {string}
       */
      name: 'hello-world',

      /**
       * Entry script that PM2 executes to start the application.
       * This is the same file invoked by `npm start` (node server.js).
       * Path is relative to the ecosystem.config.js file location (project root).
       * @type {string}
       */
      script: 'server.js',

      // =====================================================================
      // Cluster Mode Configuration
      // =====================================================================

      /**
       * Number of worker instances to spawn.
       * - 'max': One instance per available CPU core (recommended for production)
       * - A number (e.g., 2): Fixed instance count regardless of CPU count
       *
       * In cluster mode, PM2 uses Node.js built-in cluster module to distribute
       * incoming connections across worker processes via round-robin scheduling.
       * @type {string|number}
       */
      instances: 'max',

      /**
       * Execution mode for the application.
       * - 'cluster': Enables multi-instance cluster mode with load balancing
       * - 'fork': Single-process mode (default if exec_mode is omitted)
       *
       * Cluster mode is required for zero-downtime reloads (`pm2 reload`).
       * @type {string}
       */
      exec_mode: 'cluster',

      // =====================================================================
      // Restart and Recovery Behavior
      // =====================================================================

      /**
       * Automatically restart the application if it crashes or exits unexpectedly.
       * When true, PM2 will relaunch the process immediately after an unclean exit.
       * @type {boolean}
       */
      autorestart: true,

      /**
       * Enable or disable file-system watching for automatic restarts.
       * Set to false in production to prevent unintended restarts from log
       * writes or temporary file changes. Use `pm2 reload` for deployments.
       * @type {boolean}
       */
      watch: false,

      /**
       * Maximum memory threshold before PM2 triggers an automatic restart.
       * If a worker's RSS memory usage exceeds this limit, PM2 gracefully
       * restarts it to prevent memory leaks from degrading the system.
       * Accepts string notation: '1G' (1 gigabyte), '512M' (512 megabytes).
       * @type {string}
       */
      max_memory_restart: '1G',

      // =====================================================================
      // Graceful Shutdown Settings
      // =====================================================================

      /**
       * Time in milliseconds to wait for the application to finish handling
       * in-flight requests before PM2 sends SIGKILL to force termination.
       * A 5-second window allows active HTTP connections to complete gracefully.
       * @type {number}
       */
      kill_timeout: 5000,

      /**
       * Time in milliseconds PM2 waits for the application to signal that it
       * is ready to accept connections after startup. If the app does not
       * emit a 'ready' event or bind to its port within this window, PM2
       * considers the startup failed and may attempt a restart.
       * @type {number}
       */
      listen_timeout: 3000,

      // =====================================================================
      // Log Configuration
      // =====================================================================

      /**
       * Timestamp format prepended to each PM2 log line.
       * Uses Moment.js-compatible format tokens for consistent, sortable timestamps.
       * @type {string}
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * File path for PM2-captured stderr output from the application.
       * Path is relative to the ecosystem.config.js location (project root).
       * The logs/ directory must exist (ensured by logs/.gitkeep in VCS).
       * @type {string}
       */
      error_file: 'logs/pm2-error.log',

      /**
       * File path for PM2-captured stdout output from the application.
       * Path is relative to the ecosystem.config.js location (project root).
       * The logs/ directory must exist (ensured by logs/.gitkeep in VCS).
       * @type {string}
       */
      out_file: 'logs/pm2-out.log',

      /**
       * Merge stdout and stderr logs from all cluster worker instances into
       * single log files rather than creating separate files per worker.
       * This simplifies log aggregation and monitoring in cluster mode.
       * @type {boolean}
       */
      merge_logs: true,

      // =====================================================================
      // Environment Variables — Development (Default)
      // =====================================================================

      /**
       * Default environment variables applied when no --env flag is specified.
       * These values configure the application for local development use:
       * - NODE_ENV: 'development' enables verbose error output and debug features
       * - HOST: '127.0.0.1' binds to localhost only (no external access)
       * - PORT: 3000 matches the default in src/config/index.js
       * - LOG_LEVEL: 'debug' enables all log levels for development visibility
       *
       * @type {Object}
       */
      env: {
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      },

      // =====================================================================
      // Environment Variables — Production
      // =====================================================================

      /**
       * Environment variables applied when started with --env production flag.
       * These values configure the application for production deployment:
       * - NODE_ENV: 'production' enables optimized behavior and sanitized errors
       * - HOST: '0.0.0.0' binds to all network interfaces for external access
       * - PORT: 3000 standard application port (reverse proxy handles 80/443)
       * - LOG_LEVEL: 'info' suppresses debug output for cleaner production logs
       *
       * Activated via: npx pm2 start ecosystem.config.js --env production
       *
       * @type {Object}
       */
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
        LOG_LEVEL: 'info'
      }
    }
  ]
};
