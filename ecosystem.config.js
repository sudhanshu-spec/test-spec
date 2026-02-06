'use strict';

/**
 * @fileoverview PM2 Process Manager Ecosystem Configuration
 *
 * Defines cluster-mode deployment settings for the Hello World Tutorial Server
 * using PM2. Supports both development and production environments with
 * automatic restarts, memory-bounded operation, and graceful shutdown.
 *
 * Usage:
 *   npm run pm2:start    # Start with PM2 using this config
 *   npm run pm2:stop     # Stop the PM2-managed server
 *   npm run pm2:restart  # Restart the PM2-managed server
 *   npm run pm2:logs     # View PM2 log output
 *
 * Production:
 *   pm2 start ecosystem.config.js --env production
 *
 * @module ecosystem.config
 */

module.exports = {
  apps: [
    {
      // Application identification
      name: 'hello-world',
      script: 'server.js',

      // Cluster mode configuration
      instances: 'max',
      exec_mode: 'cluster',

      // Restart behavior
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Graceful shutdown settings
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Log configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,

      // Development environment (default)
      env: {
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      },

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
        LOG_LEVEL: 'info'
      }
    }
  ]
};
