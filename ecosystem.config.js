/**
 * PM2 Ecosystem Configuration
 * 
 * Production deployment configuration for PM2 process manager.
 * Enables clustering, automatic restart, and environment-specific settings.
 * 
 * Usage:
 *   Development: pm2 start ecosystem.config.js
 *   Production:  pm2 start ecosystem.config.js --env production
 *   Reload:      pm2 reload ecosystem.config.js (zero-downtime)
 * 
 * @module ecosystem.config
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

'use strict';

module.exports = {
  apps: [{
    /**
     * Application name as it appears in PM2 process list
     */
    name: 'hello-world',

    /**
     * Entry point script for the application
     */
    script: './server.js',

    /**
     * Number of instances to spawn
     * 'max' utilizes all available CPU cores for maximum throughput
     */
    instances: 'max',

    /**
     * Execution mode
     * 'cluster' enables Node.js clustering for multi-core utilization
     */
    exec_mode: 'cluster',

    /**
     * Automatically restart the application if it crashes
     */
    autorestart: true,

    /**
     * Watch for file changes and restart
     * Disabled in production for stability
     */
    watch: false,

    /**
     * Maximum memory before restart
     * Prevents memory leaks from crashing the server
     */
    max_memory_restart: '1G',

    /**
     * Minimum uptime before considering the app started successfully
     */
    min_uptime: '10s',

    /**
     * Maximum number of restarts within a short period
     */
    max_restarts: 10,

    /**
     * Development environment variables
     * Used when starting without --env flag
     */
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },

    /**
     * Production environment variables
     * Used with: pm2 start ecosystem.config.js --env production
     */
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },

    /**
     * Log configuration
     */
    // Date format for log entries
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Error log file path
    error_file: './logs/pm2-error.log',

    // Standard output log file path
    out_file: './logs/pm2-out.log',

    // Merge logs from all cluster instances into single files
    merge_logs: true,

    /**
     * Graceful shutdown timeout in milliseconds
     * Time to wait for connections to close before force kill
     */
    kill_timeout: 5000,

    /**
     * Wait for ready signal from application
     * Application should call process.send('ready') when ready
     */
    wait_ready: false,

    /**
     * Listen timeout in milliseconds
     * Only used when wait_ready is true
     */
    listen_timeout: 8000
  }]
};
