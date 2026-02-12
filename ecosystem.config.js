/**
 * PM2 Ecosystem Configuration
 *
 * Production process manager configuration for the Express application.
 * Supports cluster mode for multi-core utilization, environment-specific
 * settings, and centralized log file management.
 *
 * The application is stateless and inherently cluster-safe, allowing PM2
 * to run multiple instances across CPU cores for improved throughput.
 *
 * Usage:
 *   pm2 start ecosystem.config.js                     # Development
 *   pm2 start ecosystem.config.js --env production     # Production
 *   npm run start:prod                                 # Via npm script
 *
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 * @module ecosystem.config
 */

'use strict';

module.exports = {
  apps: [{
    /** Application name matching package.json name */
    name: 'hello_world',

    /** Entry point per package.json main */
    script: 'server.js',

    /** Number of cluster instances (2 for safety, not 'max') */
    instances: 2,

    /** Cluster mode for multi-core utilization */
    exec_mode: 'cluster',

    /** Do not watch files in production */
    watch: false,

    /** Restart if memory usage exceeds 1GB */
    max_memory_restart: '1G',

    /** Development environment defaults */
    env: {
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },

    /** Production environment overrides */
    env_production: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },

    /** PM2 error log path */
    error_file: 'logs/pm2-error.log',

    /** PM2 output log path */
    out_file: 'logs/pm2-out.log',

    /** PM2 combined log path */
    log_file: 'logs/pm2-combined.log',

    /** Timestamp log entries */
    time: true
  }]
};
