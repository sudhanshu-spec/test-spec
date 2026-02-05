/**
 * PM2 Ecosystem Configuration
 *
 * This configuration file defines how PM2 process manager runs the application
 * in production environments. It enables cluster mode for load balancing across
 * all available CPU cores, automatic restart on failure, and zero-downtime reloads.
 *
 * Features:
 *   - Cluster mode: Utilizes all available CPU cores
 *   - Auto-restart: Restarts on crash or memory threshold exceeded
 *   - Zero-downtime reloads: SIGTERM handling for graceful shutdowns
 *   - Environment-aware: Separate configs for development and production
 *   - Centralized logging: Merged logs from all cluster instances
 *
 * Usage:
 *   pm2 start ecosystem.config.js                    # Start in development
 *   pm2 start ecosystem.config.js --env production   # Start in production
 *   pm2 reload ecosystem.config.js                   # Zero-downtime reload
 *   pm2 stop ecosystem.config.js                     # Stop all instances
 *   pm2 delete ecosystem.config.js                   # Remove from PM2
 *   pm2 monit                                        # Monitor processes
 *   pm2 logs                                         # View logs
 *
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 * @module ecosystem.config
 */

'use strict';

module.exports = {
  /**
   * Application configurations array.
   * Each object defines settings for a single application process.
   * @type {Array<Object>}
   */
  apps: [
    {
      /**
       * Application name displayed in PM2 process list.
       * Used for identifying and managing the process.
       * @type {string}
       */
      name: 'hello-world',

      /**
       * Entry point script to execute.
       * Path relative to ecosystem.config.js location.
       * @type {string}
       */
      script: 'server.js',

      /**
       * Number of instances to spawn.
       * 'max' uses all available CPU cores for optimal performance.
       * Can also be a specific number (e.g., 2, 4) for controlled scaling.
       * @type {string|number}
       */
      instances: 'max',

      /**
       * Execution mode for the application.
       * 'cluster' enables Node.js cluster module for load balancing.
       * 'fork' runs as a single process (default).
       * @type {string}
       */
      exec_mode: 'cluster',

      /**
       * File watching configuration.
       * Disabled in production to prevent unintended restarts.
       * Enable only in development with specific watch paths.
       * @type {boolean}
       */
      watch: false,

      /**
       * Maximum memory threshold before automatic restart.
       * Prevents memory leaks from consuming all available memory.
       * Format: '500M' for megabytes, '1G' for gigabytes.
       * @type {string}
       */
      max_memory_restart: '500M',

      /**
       * Minimum uptime before considering the app successfully started.
       * Prevents restart loops if the app crashes immediately.
       * @type {string}
       */
      min_uptime: '5s',

      /**
       * Maximum number of consecutive restarts within min_uptime window.
       * After this limit, PM2 stops trying to restart the app.
       * @type {number}
       */
      max_restarts: 10,

      /**
       * Graceful shutdown timeout in milliseconds.
       * Time allowed for the app to handle SIGTERM before SIGKILL.
       * Should match the server's graceful shutdown timeout.
       * @type {number}
       */
      kill_timeout: 5000,

      /**
       * Wait for ready signal before considering the app online.
       * When true, the app must call process.send('ready').
       * @type {boolean}
       */
      wait_ready: false,

      /**
       * Listen timeout for cluster mode.
       * Maximum time to wait for the app to start listening.
       * @type {number}
       */
      listen_timeout: 8000,

      // =========================================================================
      // Logging Configuration
      // =========================================================================

      /**
       * Date format for PM2 log entries.
       * Applied to both stdout and stderr log files.
       * @type {string}
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * Path to the error log file.
       * Contains stderr output from all cluster instances.
       * @type {string}
       */
      error_file: 'logs/pm2-error.log',

      /**
       * Path to the output log file.
       * Contains stdout output from all cluster instances.
       * @type {string}
       */
      out_file: 'logs/pm2-out.log',

      /**
       * Merge logs from all cluster instances into single files.
       * When false, creates separate log files per instance.
       * @type {boolean}
       */
      merge_logs: true,

      /**
       * Append to log files instead of overwriting on restart.
       * Recommended for production to preserve log history.
       * @type {boolean}
       */
      append: true,

      // =========================================================================
      // Environment Configuration
      // =========================================================================

      /**
       * Default environment variables (development mode).
       * Applied when starting without --env flag.
       * HOST binds to localhost for security in development.
       * @type {Object}
       */
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '127.0.0.1'
      },

      /**
       * Production environment variables.
       * Applied when starting with: pm2 start ecosystem.config.js --env production
       * HOST binds to all interfaces for external access.
       * @type {Object}
       */
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },

      /**
       * Test environment variables.
       * Applied when starting with: pm2 start ecosystem.config.js --env test
       * Uses different port to avoid conflicts during testing.
       * @type {Object}
       */
      env_test: {
        NODE_ENV: 'test',
        PORT: 3001,
        HOST: '127.0.0.1'
      }
    }
  ]
};
