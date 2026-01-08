/**
 * PM2 Ecosystem Configuration
 *
 * This file defines the PM2 process manager configuration for production deployments.
 * It supports multiple deployment environments (development, staging, production) with
 * environment-specific settings for instance count, memory limits, and logging.
 *
 * Key Features:
 * - Cluster mode support for multi-core CPU utilization in production
 * - Graceful shutdown configuration for zero-downtime deployments
 * - Environment-specific configurations (development, staging, production)
 * - Centralized log file management with date formatting
 * - Memory leak protection with automatic restart thresholds
 *
 * Usage:
 * - Development: pm2 start ecosystem.config.js
 * - Staging: pm2 start ecosystem.config.js --env staging
 * - Production: pm2 start ecosystem.config.js --env production
 *
 * PM2 Commands:
 * - Start: pm2 start ecosystem.config.js [--env <environment>]
 * - Stop: pm2 stop ecosystem.config.js
 * - Restart: pm2 restart ecosystem.config.js
 * - Reload (zero-downtime): pm2 reload ecosystem.config.js
 * - Logs: pm2 logs
 * - Monitor: pm2 monit
 *
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 * @module ecosystem.config
 */

'use strict';

module.exports = {
  /**
   * Application definitions array
   * Each object defines a separate application process to be managed by PM2
   */
  apps: [
    {
      /**
       * Application name as displayed in PM2 process list
       * Matches the name field from package.json
       * @type {string}
       */
      name: 'hello_world',

      /**
       * Entry point script for the application
       * @type {string}
       */
      script: 'server.js',

      /**
       * Working directory for the application
       * @type {string}
       */
      cwd: './',

      /**
       * Disable file watching in production (use PM2 reload for updates)
       * @type {boolean}
       */
      watch: false,

      /**
       * Directories and files to ignore when watch is enabled
       * @type {string[]}
       */
      ignore_watch: ['node_modules', 'logs', 'coverage', '.git'],

      // =========================================================================
      // Instance Configuration (Default: Development Mode)
      // =========================================================================

      /**
       * Number of instances to run
       * - Development: 1 (single instance for debugging)
       * - Staging: 2 (limited cluster for testing)
       * - Production: 'max' (utilize all CPU cores)
       * @type {number|string}
       */
      instances: 1,

      /**
       * Execution mode
       * - 'fork': Single process mode (development)
       * - 'cluster': Multi-process mode with load balancing (staging/production)
       * @type {string}
       */
      exec_mode: 'fork',

      /**
       * Automatic restart when memory exceeds threshold
       * Protects against memory leaks by recycling processes
       * - Development: 200M (catch issues early)
       * - Staging: 500M (moderate limit)
       * - Production: 1G (generous limit for stability)
       * @type {string}
       */
      max_memory_restart: '200M',

      // =========================================================================
      // Graceful Shutdown Configuration
      // =========================================================================

      /**
       * Time in milliseconds before PM2 sends SIGKILL after SIGTERM
       * Allows application to drain connections and cleanup resources
       * @type {number}
       */
      kill_timeout: 3000,

      /**
       * Time in milliseconds PM2 waits for the application to signal ready
       * Used in conjunction with wait_ready for health check integration
       * @type {number}
       */
      listen_timeout: 3000,

      /**
       * Wait for process.send('ready') before considering app as online
       * Enables health check integration before routing traffic
       * @type {boolean}
       */
      wait_ready: true,

      /**
       * Send 'shutdown' message to application before SIGTERM
       * Allows application to prepare for graceful shutdown
       * @type {boolean}
       */
      shutdown_with_message: true,

      // =========================================================================
      // Log Configuration
      // =========================================================================

      /**
       * Path for standard output logs
       * @type {string}
       */
      out_file: './logs/app-out.log',

      /**
       * Path for error output logs
       * @type {string}
       */
      error_file: './logs/app-error.log',

      /**
       * Date format for log entries
       * Uses moment.js format specification
       * @type {string}
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * Merge logs from all cluster instances into single files
       * Essential for cluster mode to avoid fragmented logs
       * @type {boolean}
       */
      merge_logs: true,

      /**
       * Combine stdout and stderr into a single log file
       * Set to false to keep separate files for debugging
       * @type {boolean}
       */
      combine_logs: false,

      // =========================================================================
      // Auto-restart Configuration
      // =========================================================================

      /**
       * Enable automatic restart on crash
       * @type {boolean}
       */
      autorestart: true,

      /**
       * Maximum number of unstable restarts before stopping
       * Prevents infinite restart loops on persistent errors
       * @type {number}
       */
      max_restarts: 10,

      /**
       * Minimum uptime to be considered a successful start (in milliseconds)
       * Prevents restart loops for applications that crash immediately
       * @type {number}
       */
      min_uptime: 5000,

      /**
       * Time between restarts for crashed applications (in milliseconds)
       * @type {number}
       */
      restart_delay: 1000,

      // =========================================================================
      // Environment Variables - Development (Default)
      // =========================================================================

      /**
       * Default environment variables (development mode)
       * Applied when no --env flag is specified
       * @type {object}
       */
      env: {
        /**
         * Node.js environment mode
         * @type {string}
         */
        NODE_ENV: 'development',

        /**
         * Application port number
         * @type {number}
         */
        PORT: 3000,

        /**
         * Server host binding (localhost for development security)
         * @type {string}
         */
        HOST: '127.0.0.1',

        /**
         * Logging level (verbose for development debugging)
         * @type {string}
         */
        LOG_LEVEL: 'debug',

        /**
         * Log output format (dev for colorized console output)
         * @type {string}
         */
        LOG_FORMAT: 'dev'
      },

      // =========================================================================
      // Environment Variables - Staging
      // =========================================================================

      /**
       * Staging environment variables
       * Applied when using: pm2 start ecosystem.config.js --env staging
       *
       * Staging configuration uses cluster mode with limited instances
       * for testing production-like behavior without full resource allocation
       * @type {object}
       */
      env_staging: {
        /**
         * Node.js environment mode
         * @type {string}
         */
        NODE_ENV: 'staging',

        /**
         * Application port number
         * @type {number}
         */
        PORT: 3000,

        /**
         * Server host binding (accept external connections for testing)
         * @type {string}
         */
        HOST: '0.0.0.0',

        /**
         * Logging level (standard operational logging)
         * @type {string}
         */
        LOG_LEVEL: 'info',

        /**
         * Log output format (combined for structured logs)
         * @type {string}
         */
        LOG_FORMAT: 'combined',

        /**
         * Number of cluster instances for staging
         * Overrides the default instances value
         * @type {number}
         */
        PM2_INSTANCES: 2,

        /**
         * Execution mode for staging
         * @type {string}
         */
        PM2_EXEC_MODE: 'cluster',

        /**
         * Memory restart threshold for staging
         * @type {string}
         */
        PM2_MAX_MEMORY: '500M'
      },

      // =========================================================================
      // Environment Variables - Production
      // =========================================================================

      /**
       * Production environment variables
       * Applied when using: pm2 start ecosystem.config.js --env production
       *
       * Production configuration maximizes performance and reliability:
       * - Cluster mode with all available CPU cores
       * - External network binding for load balancer integration
       * - Optimized logging for production monitoring
       * @type {object}
       */
      env_production: {
        /**
         * Node.js environment mode
         * @type {string}
         */
        NODE_ENV: 'production',

        /**
         * Application port number
         * @type {number}
         */
        PORT: 3000,

        /**
         * Server host binding (accept external connections)
         * Required for load balancer and container deployments
         * @type {string}
         */
        HOST: '0.0.0.0',

        /**
         * Logging level (standard operational logging)
         * @type {string}
         */
        LOG_LEVEL: 'info',

        /**
         * Log output format (combined for log aggregation systems)
         * @type {string}
         */
        LOG_FORMAT: 'combined',

        /**
         * Number of cluster instances for production
         * 'max' utilizes all available CPU cores
         * @type {string}
         */
        PM2_INSTANCES: 'max',

        /**
         * Execution mode for production
         * @type {string}
         */
        PM2_EXEC_MODE: 'cluster',

        /**
         * Memory restart threshold for production
         * @type {string}
         */
        PM2_MAX_MEMORY: '1G'
      }
    }
  ],

  /**
   * Deployment configuration (optional)
   * Can be extended for automated deployment workflows
   *
   * Example usage:
   * pm2 deploy ecosystem.config.js production setup
   * pm2 deploy ecosystem.config.js production
   *
   * Uncomment and configure for your deployment targets:
   */
  // deploy: {
  //   production: {
  //     user: 'deploy',
  //     host: 'production.example.com',
  //     ref: 'origin/main',
  //     repo: 'git@github.com:user/repo.git',
  //     path: '/var/www/production',
  //     'pre-deploy-local': '',
  //     'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': ''
  //   },
  //   staging: {
  //     user: 'deploy',
  //     host: 'staging.example.com',
  //     ref: 'origin/develop',
  //     repo: 'git@github.com:user/repo.git',
  //     path: '/var/www/staging',
  //     'pre-deploy-local': '',
  //     'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
  //     'pre-setup': ''
  //   }
  // }
};
