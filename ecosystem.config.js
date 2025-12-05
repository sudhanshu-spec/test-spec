/**
 * PM2 Ecosystem Configuration File
 * 
 * This file configures PM2 process manager for production deployment.
 * It enables cluster mode, environment-specific settings, log file
 * management, and restart policies for high availability.
 * 
 * Usage:
 *   Development:  pm2 start ecosystem.config.js
 *   Production:   pm2 start ecosystem.config.js --env production
 *   Reload:       pm2 reload ecosystem.config.js
 *   Stop:         pm2 stop ecosystem.config.js
 *   Delete:       pm2 delete ecosystem.config.js
 *   Logs:         pm2 logs
 *   Status:       pm2 status
 * 
 * Features:
 * - Cluster mode for multi-core utilization
 * - Environment-specific configuration (development/production)
 * - Automatic restart on crash
 * - Memory limit monitoring
 * - Centralized log file management
 * 
 * Environment Variables (aligned with src/config/index.js):
 * - NODE_ENV: Application environment (development/production)
 * - HOST: Server bind address (127.0.0.1 for dev, 0.0.0.0 for prod)
 * - PORT: Server port number (default: 3000)
 * - LOG_LEVEL: Logging verbosity (debug for dev, info for prod)
 * 
 * @module ecosystem.config
 */

module.exports = {
  apps: [
    {
      /**
       * Application name (matches package.json name)
       * Used to identify the app in PM2 process list
       */
      name: 'hello_world',

      /**
       * Entry point script
       * Path to the main server file that PM2 will execute
       */
      script: 'server.js',

      /**
       * Number of instances
       * - 'max': Use all available CPU cores (recommended for production)
       * - number: Specific instance count
       * Note: In development, this can be overridden with --instances flag
       */
      instances: 'max',

      /**
       * Execution mode
       * - 'cluster': Enable cluster mode for load balancing across CPU cores
       * - 'fork': Standard fork mode (single process)
       * Cluster mode is required for multi-instance deployment
       */
      exec_mode: 'cluster',

      /**
       * Auto-restart on crash
       * When true, PM2 will automatically restart the app if it crashes
       */
      autorestart: true,

      /**
       * File watching (disabled in production)
       * When true, PM2 watches files for changes and auto-restarts
       * Should be false in production for stability
       */
      watch: false,

      /**
       * Memory limit - restart if exceeded
       * Prevents memory leaks from consuming all system memory
       * Format: '1G', '500M', etc.
       */
      max_memory_restart: '1G',

      /**
       * Delay between automatic restarts (milliseconds)
       * Prevents rapid restart loops when app has persistent issues
       */
      restart_delay: 1000,

      /**
       * Stdout log file path
       * All console.log output will be written here
       */
      out_file: './logs/out.log',

      /**
       * Stderr log file path
       * All console.error and error output will be written here
       */
      error_file: './logs/error.log',

      /**
       * Log timestamp format
       * Format for timestamps prepended to log entries
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * Merge logs from all cluster instances
       * When true, logs from all instances go to the same files
       * When false, each instance gets separate log files
       */
      merge_logs: true,

      /**
       * Development environment configuration
       * Applied when starting PM2 without --env flag or with --env development
       * 
       * Settings aligned with src/config/index.js defaults:
       * - NODE_ENV: matches config.env
       * - HOST: matches config.host (localhost for development)
       * - PORT: matches config.port
       * - LOG_LEVEL: verbose logging for debugging
       */
      env_development: {
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      },

      /**
       * Production environment configuration
       * Applied when starting PM2 with --env production flag
       * 
       * Settings for production deployment:
       * - NODE_ENV: production mode
       * - HOST: 0.0.0.0 binds to all network interfaces
       * - PORT: standard port
       * - LOG_LEVEL: minimal logging for performance
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
