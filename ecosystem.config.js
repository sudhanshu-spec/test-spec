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
 * @module ecosystem.config
 */

module.exports = {
  apps: [
    {
      /**
       * Application name (matches package.json name)
       */
      name: 'hello_world',

      /**
       * Entry point script
       */
      script: 'server.js',

      /**
       * Number of instances
       * - 'max': Use all available CPU cores (production)
       * - 1: Single instance (development)
       * Note: In development mode, PM2 will use 1 instance
       */
      instances: 'max',

      /**
       * Execution mode
       * - 'cluster': Enable cluster mode for load balancing
       * - 'fork': Standard fork mode
       */
      exec_mode: 'cluster',

      /**
       * Auto-restart on crash
       */
      autorestart: true,

      /**
       * File watching (disabled in production)
       */
      watch: false,

      /**
       * Memory limit - restart if exceeded
       */
      max_memory_restart: '1G',

      /**
       * Delay between automatic restarts
       */
      restart_delay: 1000,

      /**
       * Stdout log file path
       */
      out_file: './logs/out.log',

      /**
       * Stderr log file path
       */
      error_file: './logs/error.log',

      /**
       * Log timestamp format
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * Merge logs from all cluster instances
       */
      merge_logs: true,

      /**
       * Development environment configuration
       * Used when starting without --env flag
       */
      env_development: {
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      },

      /**
       * Production environment configuration
       * Used when starting with --env production flag
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
