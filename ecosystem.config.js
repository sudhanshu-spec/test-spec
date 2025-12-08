/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 process manager for production deployment.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js (zero-downtime)
 * 
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [{
    // Application name (used in PM2 commands and logs)
    name: 'hello-world',
    
    // Entry point script
    script: 'server.js',
    
    // Cluster mode: run one instance per CPU core
    instances: 'max',
    
    // Enable cluster mode for load balancing
    exec_mode: 'cluster',
    
    // Watch for file changes (disable in production)
    watch: false,
    
    // Maximum memory restart threshold
    max_memory_restart: '500M',
    
    // Environment variables for all environments
    env: {
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },
    
    // Production environment overrides
    env_production: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    
    // Log configuration
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    time: true,
    
    // Graceful shutdown timeout (matches server.js shutdown timeout)
    kill_timeout: 10000,
    
    // Wait before forcing reload
    listen_timeout: 3000,
    
    // Restart on failure
    autorestart: true,
    
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100
  }]
};
