'use strict';

/**
 * PM2 Ecosystem Configuration
 *
 * Declarative configuration for PM2 process management. Defines application
 * name, entry script, cluster mode settings, environment variables, and
 * log file paths.
 *
 * This file is the single source of truth for PM2 configuration.
 * Referenced by npm scripts: pm2:start, pm2:stop, pm2:restart.
 *
 * Usage:
 *   npm run pm2:start       # Start with PM2 using this config
 *   npm run pm2:stop        # Stop PM2-managed app
 *   npm run pm2:restart     # Restart PM2-managed app
 *
 * @module ecosystem.config
 */

module.exports = {
  apps: [
    {
      /** Application name for PM2 process list */
      name: 'hello-world',

      /** Entry script — the server entry point */
      script: 'server.js',

      /** Number of cluster instances — 'max' uses all available CPU cores */
      instances: 'max',

      /** Execution mode — 'cluster' enables multi-core utilization */
      exec_mode: 'cluster',

      /** Log date format for PM2 log entries */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /** Error log file path */
      error_file: 'logs/pm2-error.log',

      /** Output log file path */
      out_file: 'logs/pm2-out.log',

      /** Merge logs from all cluster instances into single files */
      merge_logs: true,

      /** Maximum memory before auto-restart (prevents memory leaks) */
      max_memory_restart: '256M',

      /** Default environment variables (development) */
      env: {
        HOST: '127.0.0.1',
        PORT: 3000,
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
        CORS_ORIGIN: '*'
      },

      /** Production environment overrides */
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
        LOG_LEVEL: 'warn'
      }
    }
  ]
};
