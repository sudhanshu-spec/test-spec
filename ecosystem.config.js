/**
 * PM2 Ecosystem Configuration File
 * 
 * This module provides process manager configuration for the Express.js application
 * using PM2 (Process Manager 2). It defines application deployment settings,
 * cluster mode configuration, environment-specific settings, and graceful restart
 * configuration for production deployment.
 * 
 * Key Features:
 * - Cluster mode for multi-core CPU utilization and load balancing
 * - Environment-specific configurations (development, staging, production)
 * - Graceful shutdown with configurable timeout
 * - Automatic restart on failure with exponential backoff
 * - Log file management with date formatting
 * - Memory limit monitoring with auto-restart
 * 
 * PM2 Commands:
 * - Start: pm2 start ecosystem.config.js
 * - Stop: pm2 stop ecosystem.config.js
 * - Restart: pm2 restart ecosystem.config.js
 * - Reload (zero-downtime): pm2 reload ecosystem.config.js
 * - Delete: pm2 delete ecosystem.config.js
 * - Logs: pm2 logs
 * - Monitor: pm2 monit
 * 
 * Environment-Specific Start:
 * - Development: pm2 start ecosystem.config.js --env development
 * - Staging: pm2 start ecosystem.config.js --env staging
 * - Production: pm2 start ecosystem.config.js --env production
 * 
 * Environment Variables Used:
 * - PM2_INSTANCES: Number of cluster instances ('max' for all CPU cores)
 * - PM2_EXEC_MODE: Execution mode ('cluster' or 'fork')
 * - NODE_ENV: Environment mode (development, staging, production)
 * - PORT: Server port (default: 3000)
 * - LOG_LEVEL: Logging level (trace, debug, info, warn, error, fatal)
 * - LOG_FORMAT: Log output format ('json' or 'pretty')
 * 
 * Security Notes:
 * - No secrets or credentials should be stored in this file
 * - Use environment variables for sensitive configuration
 * - Log files should have appropriate file system permissions
 * 
 * @module ecosystem.config
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 * @see https://pm2.keymetrics.io/docs/usage/cluster-mode/
 */

'use strict';

// =============================================================================
// PM2 ECOSYSTEM CONFIGURATION
// =============================================================================

/**
 * PM2 Ecosystem Configuration Object
 * 
 * This configuration object follows the PM2 ecosystem file specification.
 * It defines all application settings, environment configurations, and
 * deployment parameters for the Express.js server.
 * 
 * @type {Object}
 * @property {Object[]} apps - Array of application configurations
 */
const ecosystemConfig = {
  /**
   * Application Definitions
   * 
   * Array of application objects that PM2 will manage.
   * Each object defines a single application with its configuration.
   * 
   * @type {Object[]}
   */
  apps: [
    {
      // =========================================================================
      // APPLICATION IDENTITY
      // =========================================================================

      /**
       * Application Name
       * 
       * Unique identifier for this application in PM2.
       * Used in PM2 commands: pm2 restart express-server
       * 
       * @type {string}
       */
      name: 'express-server',

      /**
       * Entry Script
       * 
       * The main application entry point that PM2 will execute.
       * Path is relative to the ecosystem.config.js file location.
       * 
       * @type {string}
       */
      script: 'server.js',

      // =========================================================================
      // CLUSTER MODE CONFIGURATION
      // =========================================================================

      /**
       * Number of Instances
       * 
       * Determines how many processes PM2 will spawn for this application.
       * 
       * Options:
       * - 'max': Use all available CPU cores (recommended for production)
       * - Number (e.g., 4): Specific number of instances
       * - 0: Equivalent to 'max'
       * - -1: Max cores minus 1
       * 
       * Can be overridden via PM2_INSTANCES environment variable.
       * 
       * @type {string|number}
       */
      instances: process.env.PM2_INSTANCES || 'max',

      /**
       * Execution Mode
       * 
       * Determines how PM2 runs the application.
       * 
       * Options:
       * - 'cluster': Enables Node.js cluster module for load balancing (recommended)
       * - 'fork': Standard fork mode (single process, no load balancing)
       * 
       * Cluster mode enables:
       * - Built-in load balancing across multiple CPU cores
       * - Zero-downtime reloads with pm2 reload
       * - Shared port binding across workers
       * 
       * Can be overridden via PM2_EXEC_MODE environment variable.
       * 
       * @type {string}
       */
      exec_mode: process.env.PM2_EXEC_MODE || 'cluster',

      // =========================================================================
      // PROCESS MANAGEMENT
      // =========================================================================

      /**
       * Automatic Restart
       * 
       * When enabled, PM2 will automatically restart the application if it crashes.
       * Combined with max_restarts and restart_delay for controlled restart behavior.
       * 
       * @type {boolean}
       */
      autorestart: true,

      /**
       * File Watching
       * 
       * When enabled, PM2 watches for file changes and restarts the application.
       * Should be disabled in production for performance reasons.
       * Enable in development using --watch flag: pm2 start ecosystem.config.js --watch
       * 
       * @type {boolean}
       */
      watch: false,

      /**
       * Files/Directories to Ignore When Watching
       * 
       * Patterns to exclude from file watching.
       * Only relevant when watch is enabled.
       * 
       * @type {string[]}
       */
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log',
        '.env',
        'certs'
      ],

      /**
       * Maximum Memory Restart Threshold
       * 
       * PM2 will restart the application if it exceeds this memory limit.
       * Helps prevent memory leaks from consuming all system memory.
       * 
       * Supported formats:
       * - '1G': 1 Gigabyte
       * - '500M': 500 Megabytes
       * - '1024K': 1024 Kilobytes
       * 
       * @type {string}
       */
      max_memory_restart: '1G',

      /**
       * Maximum Restart Attempts
       * 
       * Maximum number of consecutive restarts before PM2 stops trying.
       * Prevents infinite restart loops when the application has a fatal error.
       * Set to 10 for a balance between resilience and preventing resource waste.
       * 
       * @type {number}
       */
      max_restarts: 10,

      /**
       * Minimum Uptime Before Considered Started
       * 
       * Time in milliseconds the application must run before it's considered
       * successfully started. If the application crashes before this time,
       * it counts toward max_restarts.
       * 
       * @type {number}
       */
      min_uptime: 5000,

      /**
       * Restart Delay
       * 
       * Time in milliseconds to wait before restarting a crashed application.
       * Provides time for external services to recover if they caused the crash.
       * 
       * @type {number}
       */
      restart_delay: 1000,

      // =========================================================================
      // GRACEFUL SHUTDOWN CONFIGURATION
      // =========================================================================

      /**
       * Wait Ready Signal
       * 
       * When enabled, PM2 waits for the application to send a 'ready' signal
       * before considering it started. The application should call:
       * process.send('ready')
       * 
       * This ensures the application is fully initialized before receiving traffic.
       * Essential for zero-downtime deployments in cluster mode.
       * 
       * @type {boolean}
       */
      wait_ready: true,

      /**
       * Listen Timeout
       * 
       * Maximum time in milliseconds to wait for the application to send
       * the 'ready' signal. If exceeded, PM2 will consider startup failed.
       * 
       * Should be set higher than the application's startup time.
       * 
       * @type {number}
       */
      listen_timeout: 10000,

      /**
       * Kill Timeout
       * 
       * Time in milliseconds to wait for the application to gracefully shutdown
       * after receiving SIGINT. If the application doesn't exit within this time,
       * PM2 will send SIGKILL to force termination.
       * 
       * Should allow enough time for:
       * - In-flight requests to complete
       * - Database connections to close
       * - Cleanup tasks to finish
       * 
       * @type {number}
       */
      kill_timeout: 5000,

      /**
       * Shutdown With Message
       * 
       * When enabled, PM2 sends a 'shutdown' message to the application
       * instead of a SIGINT signal. The application can listen for this:
       * process.on('message', (msg) => { if (msg === 'shutdown') {...} })
       * 
       * Useful for more controlled shutdown behavior in cluster mode.
       * 
       * @type {boolean}
       */
      shutdown_with_message: false,

      // =========================================================================
      // LOGGING CONFIGURATION
      // =========================================================================

      /**
       * Error Log File Path
       * 
       * File path for stderr output from the application.
       * PM2 will create the logs directory if it doesn't exist.
       * 
       * @type {string}
       */
      error_file: './logs/err.log',

      /**
       * Output Log File Path
       * 
       * File path for stdout output from the application.
       * PM2 will create the logs directory if it doesn't exist.
       * 
       * @type {string}
       */
      out_file: './logs/out.log',

      /**
       * Log Date Format
       * 
       * Timestamp format prepended to each log line.
       * Uses moment.js format syntax.
       * 
       * Format: YYYY-MM-DD HH:mm:ss Z
       * Example: 2024-01-15 14:30:45 +0000
       * 
       * @type {string}
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * Combine Logs
       * 
       * When enabled in cluster mode, logs from all worker processes
       * are written to the same log files instead of separate files per worker.
       * 
       * @type {boolean}
       */
      combine_logs: true,

      /**
       * Merge Logs
       * 
       * When enabled, all cluster worker logs are merged into single files.
       * Similar to combine_logs, ensures unified log output.
       * 
       * @type {boolean}
       */
      merge_logs: true,

      // =========================================================================
      // SOURCE MAP AND NODE ARGUMENTS
      // =========================================================================

      /**
       * Node.js Arguments
       * 
       * Additional arguments passed to the Node.js process.
       * 
       * Current settings:
       * - --max-old-space-size=1024: Limit V8 heap to 1GB
       * 
       * @type {string}
       */
      node_args: '--max-old-space-size=1024',

      // =========================================================================
      // ENVIRONMENT CONFIGURATIONS
      // =========================================================================

      /**
       * Default Environment Variables (Development)
       * 
       * Environment variables applied when starting without --env flag
       * or with --env development.
       * 
       * @type {Object}
       */
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty'
      },

      /**
       * Development Environment Variables
       * 
       * Environment variables applied when starting with --env development.
       * Identical to default env for explicit environment specification.
       * 
       * Features:
       * - Debug log level for verbose output
       * - Pretty log format for human readability
       * 
       * @type {Object}
       */
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty'
      },

      /**
       * Staging Environment Variables
       * 
       * Environment variables applied when starting with --env staging.
       * 
       * Features:
       * - Staging environment identifier
       * - Debug log level for troubleshooting
       * - JSON log format for log aggregation compatibility
       * 
       * Usage: pm2 start ecosystem.config.js --env staging
       * 
       * @type {Object}
       */
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'json'
      },

      /**
       * Production Environment Variables
       * 
       * Environment variables applied when starting with --env production.
       * 
       * Features:
       * - Production environment identifier
       * - Info log level for reduced verbosity
       * - JSON log format for log aggregation (ELK, CloudWatch, Datadog)
       * 
       * Usage: pm2 start ecosystem.config.js --env production
       * 
       * @type {Object}
       */
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json'
      }
    }
  ]
};

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export the PM2 ecosystem configuration as the default module export.
 * 
 * PM2 expects the ecosystem.config.js file to export an object with
 * an 'apps' array containing application definitions.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js
 * 
 * @type {Object}
 */
module.exports = ecosystemConfig;
