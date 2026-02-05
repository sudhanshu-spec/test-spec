/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 process manager for production deployment.
 * PM2 provides:
 * - Cluster mode for load balancing across CPU cores
 * - Automatic crash recovery
 * - Zero-downtime reloads
 * - Process monitoring and logging
 * 
 * Usage:
 *   npm run start:pm2    - Start the application with PM2
 *   npm run stop:pm2     - Stop all PM2 processes
 *   npm run restart:pm2  - Restart PM2 processes
 *   npm run reload:pm2   - Zero-downtime reload
 *   npm run logs:pm2     - View logs
 *   npm run monit:pm2    - Monitoring dashboard
 * 
 * Or using PM2 directly:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 stop ecosystem.config.js
 *   pm2 reload ecosystem.config.js
 * 
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      /**
       * Application name displayed in PM2 process list
       */
      name: 'hello-world',

      /**
       * Entry point script
       */
      script: 'server.js',

      /**
       * Number of instances to run
       * 'max' = use all available CPU cores
       * Can also be a specific number: 2, 4, etc.
       */
      instances: 'max',

      /**
       * Execution mode
       * 'cluster' enables load balancing between instances
       * 'fork' runs a single instance (default PM2 behavior)
       */
      exec_mode: 'cluster',

      /**
       * Working directory (defaults to current directory)
       */
      cwd: './',

      /**
       * Disable file watching in production
       * Set to true only for development with nodemon-like behavior
       */
      watch: false,

      /**
       * Auto-restart if memory exceeds threshold
       * Prevents memory leaks from crashing the server
       */
      max_memory_restart: '500M',

      /**
       * Log timestamp format
       */
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      /**
       * PM2 error log file location
       * Note: Application errors go to Winston logs/error.log
       */
      error_file: 'logs/pm2-error.log',

      /**
       * PM2 output log file location
       * Note: Application output goes to Winston logs/combined.log
       */
      out_file: 'logs/pm2-out.log',

      /**
       * Merge logs from all cluster instances into single files
       */
      merge_logs: true,

      /**
       * Delay between automatic restarts (ms)
       * Prevents rapid restart loops
       */
      restart_delay: 1000,

      /**
       * Maximum number of restart attempts before giving up
       * Set to 0 for unlimited retries
       */
      max_restarts: 10,

      /**
       * Minimum uptime to consider application started successfully
       */
      min_uptime: '5s',

      /**
       * Signal sent to process for graceful shutdown
       * SIGINT allows graceful shutdown handler to execute
       */
      kill_timeout: 10000,

      /**
       * Wait for process to be ready before considering it online
       */
      wait_ready: false,

      /**
       * Default environment variables (development)
       */
      env: {
        NODE_ENV: 'development',
        HOST: '127.0.0.1',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'dev'
      },

      /**
       * Production environment variables
       * Use: pm2 start ecosystem.config.js --env production
       */
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'combined'
      },

      /**
       * Test environment variables
       * Use: pm2 start ecosystem.config.js --env test
       */
      env_test: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: 3001,
        LOG_LEVEL: 'warn',
        LOG_FORMAT: 'dev'
      }
    }
  ]
};
