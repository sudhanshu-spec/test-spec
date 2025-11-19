/**
 * Server Configuration Module
 * 
 * Centralizes all server configuration settings with environment variable override support.
 * Extracted from server.js (lines 3-4) to enable modular configuration management.
 * 
 * Environment Variables:
 *   - HOST: Server binding hostname (default: '127.0.0.1' - loopback interface)
 *   - PORT: Server listening port (default: 3000)
 *   - NODE_ENV: Application environment identifier (default: 'development')
 * 
 * Usage Example:
 *   const config = require('./config/server.config');
 *   app.listen(config.port, config.hostname, () => {
 *     console.log(`Server running at http://${config.hostname}:${config.port}/`);
 *   });
 * 
 * @module config/server.config
 */

module.exports = {
  /**
   * Server binding hostname
   * Defaults to '127.0.0.1' (loopback interface - localhost only)
   * Override with HOST environment variable for network accessibility
   * @type {string}
   */
  hostname: process.env.HOST || '127.0.0.1',

  /**
   * Server listening port
   * Defaults to 3000 for development
   * Override with PORT environment variable for deployment flexibility
   * Uses parseInt with radix 10 to ensure proper type coercion from string
   * @type {number}
   */
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Application environment identifier
   * Defaults to 'development'
   * Common values: 'development', 'production', 'test'
   * Override with NODE_ENV environment variable
   * @type {string}
   */
  env: process.env.NODE_ENV || 'development'
};
