/**
 * PM2 Ecosystem Configuration
 * 
 * This file defines the PM2 process management configuration for the
 * Hello World Express application. It enables cluster mode for multi-core
 * utilization and defines environment-specific settings.
 * 
 * Usage:
 *   npm run pm2:start     - Start with PM2 in cluster mode
 *   npm run pm2:stop      - Stop all instances
 *   npm run pm2:restart   - Zero-downtime restart
 *   npm run pm2:logs      - View application logs
 * 
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [{
    // Application identification
    name: 'hello_world',
    script: 'server.js',

    // Cluster mode configuration
    // 'max' uses all available CPU cores for optimal performance
    instances: 'max',
    exec_mode: 'cluster',

    // Environment configuration (development - default)
    env: {
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },

    // Production environment configuration
    // Activated with: pm2 start ecosystem.config.js --env production
    env_production: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },

    // Restart configuration
    watch: false,           // Disable file watching (use nodemon for dev)
    max_memory_restart: '500M',  // Restart if memory exceeds 500MB

    // Logging configuration
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,       // Merge logs from all instances into single file

    // Graceful shutdown configuration
    kill_timeout: 10000,    // Wait 10s for graceful shutdown (matches server.js)
    listen_timeout: 3000    // Wait 3s for app to be ready
  }]
};
