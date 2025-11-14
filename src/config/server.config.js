/**
 * Server Configuration
 * Centralized configuration for server settings with environment variable support
 * @module config/server
 */

/**
 * Server configuration object
 * @typedef {Object} ServerConfig
 * @property {string} hostname - Server hostname/IP address to bind to
 * @property {number} port - Server port number to listen on
 */

/**
 * Server configuration with environment variable overrides
 * @type {ServerConfig}
 */
const config = {
  hostname: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT, 10) || 3000
};

module.exports = config;
