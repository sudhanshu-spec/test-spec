/**
 * PM2 Ecosystem Configuration
 *
 * Defines the production deployment settings for the Express.js application
 * using PM2 process manager v6.x. Key features:
 *
 *   - Cluster mode: spawns one worker per CPU core for load balancing
 *   - Zero-downtime reloads: `pm2 reload ecosystem.config.js`
 *   - Automatic restarts on crash or memory threshold breach
 *   - Structured log file output for error and combined logs
 *   - Separate environment variable blocks for development and production
 *
 * Usage:
 *   Start (dev):    pm2 start ecosystem.config.js
 *   Start (prod):   pm2 start ecosystem.config.js --env production
 *   Reload:         pm2 reload ecosystem.config.js
 *   Stop:           pm2 stop ecosystem.config.js
 *   Delete:         pm2 delete ecosystem.config.js
 *   Logs:           pm2 logs sud-manage-newproject
 *
 * The env and env_production blocks align with the keys accessed in
 * src/config/index.js (PORT, NODE_ENV, LOG_LEVEL, CORS_ORIGIN).
 *
 * @module ecosystem.config
 */

module.exports = {
  apps: [
    {
      // Application identifier in PM2 dashboard and CLI
      name: 'sud-manage-newproject',

      // Entry point script — resolved relative to the project root
      script: 'src/server.js',

      // Cluster mode: spawn one worker process per available CPU core
      instances: 'max',
      exec_mode: 'cluster',

      // Disable file watching in production (use pm2 reload for updates)
      watch: false,

      // Merge logs from all cluster workers into single files
      merge_logs: true,

      // Log file paths (directory created at runtime if needed)
      log_file: 'logs/combined.log',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',

      // Auto-restart when memory usage exceeds threshold
      max_memory_restart: '1G',

      // Development environment variables (default when --env is not specified)
      env: {
        PORT: 3000,
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        CORS_ORIGIN: '*',
      },

      // Production environment variables (activated with --env production)
      env_production: {
        PORT: 3000,
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        CORS_ORIGIN: '*',
      },
    },
  ],
};
