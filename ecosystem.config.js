/**
 * PM2 Process Manager Configuration
 * 
 * This file configures PM2 for production deployment with cluster mode,
 * environment-specific settings, log management, and graceful shutdown.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js               # Start with default env
 *   pm2 start ecosystem.config.js --env production  # Start in production
 *   pm2 stop ecosystem.config.js                # Stop all instances
 *   pm2 reload ecosystem.config.js              # Zero-downtime reload
 * 
 * @module ecosystem.config
 */

module.exports = {
  apps: [{
    name: 'hello-world',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '127.0.0.1'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    max_memory_restart: '256M',
    kill_timeout: 5000,
    listen_timeout: 3000,
    log_file: 'logs/combined.log',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    time: true
  }]
};
