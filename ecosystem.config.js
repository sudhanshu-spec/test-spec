/**
 * PM2 Ecosystem Configuration
 *
 * Defines process management settings for the hello_world application
 * when deployed with PM2 in production environments.
 *
 * PM2 manages the Node.js process externally, providing:
 *   - Cluster mode across all available CPU cores for load balancing
 *   - Automatic restarts on crashes or memory threshold breaches
 *   - Graceful shutdown via SIGINT with configurable kill timeout
 *   - Environment-specific variable injection (development / production)
 *   - Centralized log management with timestamp formatting
 *
 * Integration with server.js:
 *   - `wait_ready: true` requires server.js to call `process.send('ready')`
 *     once the HTTP server is listening, so PM2 knows the app is initialized
 *   - `kill_timeout` works with SIGINT/SIGTERM handlers in server.js to allow
 *     in-flight requests to complete before forceful termination
 *
 * Usage:
 *   pm2 start ecosystem.config.js                        # Development
 *   pm2 start ecosystem.config.js --env production       # Production
 *   pm2 reload ecosystem.config.js --env production      # Zero-downtime reload
 *   pm2 stop ecosystem.config.js                         # Stop all instances
 *   pm2 delete ecosystem.config.js                       # Remove from PM2
 *
 * @fileoverview PM2 ecosystem configuration for cluster-mode deployment
 * @see {@link https://pm2.keymetrics.io/docs/usage/application-declaration/}
 */

'use strict';

module.exports = {
  apps: [
    {
      // =====================================================================
      // Application Identity
      // =====================================================================

      /**
       * Process name displayed in PM2 dashboard, logs, and CLI output.
       * Used for `pm2 restart hello_world`, `pm2 logs hello_world`, etc.
       */
      name: 'hello_world',

      /**
       * Entry point script that PM2 will execute.
       * Must remain the single entry point for cluster mode compatibility.
       */
      script: 'server.js',

      // =====================================================================
      // Cluster Configuration
      // =====================================================================

      /**
       * Number of process instances to spawn.
       * 'max' utilizes all available CPU cores for maximum throughput.
       * Can be set to a specific number (e.g., 2) for resource-constrained hosts.
       */
      instances: 'max',

      /**
       * Execution mode for the application.
       * 'cluster' enables PM2's built-in load balancer, distributing incoming
       * connections across all instances using Node.js cluster module internally.
       */
      exec_mode: 'cluster',

      // =====================================================================
      // Runtime Behavior
      // =====================================================================

      /**
       * Disable file watching in production.
       * File watching causes unnecessary restarts and is intended only for
       * development workflows. Use `pm2 reload` for production updates.
       */
      watch: false,

      /**
       * Maximum memory threshold per instance before automatic restart.
       * Protects against memory leaks by restarting instances that exceed 1GB.
       */
      max_memory_restart: '1G',

      // =====================================================================
      // Graceful Startup & Shutdown
      // =====================================================================

      /**
       * Wait for the application to signal readiness before routing traffic.
       * When true, PM2 expects `process.send('ready')` from server.js after
       * the HTTP server is bound and listening. This prevents premature traffic
       * routing to instances that have not completed initialization.
       */
      wait_ready: true,

      /**
       * Maximum time (milliseconds) PM2 will wait for the ready signal.
       * If the application does not send `process.send('ready')` within this
       * window, PM2 considers the startup failed and may restart the instance.
       */
      listen_timeout: 10000,

      /**
       * Maximum time (milliseconds) for graceful shutdown after SIGINT.
       * PM2 sends SIGINT first, then waits this duration for the process to
       * exit cleanly. If the process is still alive after this timeout, PM2
       * sends SIGKILL for forceful termination. This window allows server.js
       * signal handlers to drain in-flight requests via server.close().
       */
      kill_timeout: 5000,

      // =====================================================================
      // Restart Policy
      // =====================================================================

      /**
       * Enable automatic restart on unexpected process exit.
       * Combined with max_restarts and restart_delay to prevent rapid
       * restart loops (crash loops) from overwhelming the host system.
       */
      autorestart: true,

      /**
       * Maximum number of consecutive restarts before PM2 stops retrying.
       * Prevents infinite restart loops when the application has a persistent
       * fatal error (e.g., missing dependency, corrupt configuration).
       */
      max_restarts: 10,

      /**
       * Delay (milliseconds) between consecutive restarts.
       * Provides a cooldown period to allow transient issues (e.g., port
       * release, file lock release) to resolve before the next attempt.
       */
      restart_delay: 1000,

      // =====================================================================
      // Log Configuration
      // =====================================================================

      /**
       * Path for stderr output from the application.
       * Captures error-level output and uncaught exception stack traces.
       * In cluster mode with merge_logs, all instance errors write here.
       */
      error_file: 'logs/pm2-error.log',

      /**
       * Path for stdout output from the application.
       * Captures standard output including Winston console transport logs.
       * In cluster mode with merge_logs, all instance output writes here.
       */
      out_file: 'logs/pm2-out.log',

      /**
       * Merge logs from all cluster instances into single log files.
       * Without this, PM2 creates separate log files per instance
       * (e.g., pm2-out-0.log, pm2-out-1.log), which complicates log analysis.
       */
      merge_logs: true,

      /**
       * Timestamp format prepended to each log line by PM2.
       * Uses moment.js-compatible format tokens for consistent, sortable
       * timestamps across all log entries including timezone offset.
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // =====================================================================
      // Environment Configuration
      // =====================================================================

      /**
       * Default environment variables (development mode).
       * Applied when starting without --env flag:
       *   pm2 start ecosystem.config.js
       *
       * Values align with src/config/index.js defaults for consistency.
       */
      env: {
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      },

      /**
       * Production environment variables.
       * Applied when starting with --env production flag:
       *   pm2 start ecosystem.config.js --env production
       *
       * Key differences from development:
       *   - NODE_ENV: 'production' — Enables Express production optimizations
       *   - HOST: '0.0.0.0' — Binds to all network interfaces for external access
       *   - LOG_LEVEL: 'info' — Reduces log verbosity for production performance
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
