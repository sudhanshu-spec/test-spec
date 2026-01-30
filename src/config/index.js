/**
 * Configuration Management Module
 * 
 * This module centralizes all application configuration values with environment
 * variable support following the Twelve-Factor App methodology for configuration
 * externalization.
 * 
 * Default values preserve backward compatibility with original server.js implementation:
 * - host: '127.0.0.1' (from original server.js line 3)
 * - port: 3000 (from original server.js line 4)
 * 
 * Environment variable overrides:
 * - HOST: Override default host binding
 * - PORT: Override default port number
 * - NODE_ENV: Set application environment (development, production, test)
 * 
 * Port Validation:
 * - Invalid PORT values (non-numeric) log a warning and fall back to default
 * - Out-of-range PORT values (< 1 or > 65535) log a warning and fall back to default
 * 
 * @module src/config
 */

/**
 * Validates and parses the PORT environment variable.
 * 
 * This function ensures the port configuration is valid before the server starts,
 * providing clear warning messages for invalid configurations rather than silent
 * acceptance that could lead to confusing runtime errors.
 * 
 * @returns {number} A valid port number between 1-65535, or the default port (3000) if validation fails
 * @private
 */
function parsePort() {
  const DEFAULT_PORT = 3000;
  const portString = process.env.PORT;
  
  // Return default if PORT is not set
  if (portString === undefined || portString === '') {
    return DEFAULT_PORT;
  }
  
  // Parse the port string as an integer
  const port = parseInt(portString, 10);
  
  // Check if parsing resulted in NaN (non-numeric input)
  if (isNaN(port)) {
    console.warn(`Warning: Invalid PORT value "${portString}". Using default port ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }
  
  // Check if port is within valid range (1-65535)
  if (port < 1 || port > 65535) {
    console.warn(`Warning: PORT ${port} is out of valid range (1-65535). Using default port ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }
  
  return port;
}

module.exports = {
  /**
   * Server host binding address
   * @type {string}
   * @default '127.0.0.1'
   */
  host: process.env.HOST || '127.0.0.1',

  /**
   * Server port number (validated)
   * @type {number}
   * @default 3000
   */
  port: parsePort(),

  /**
   * Application environment
   * @type {string}
   * @default 'development'
   */
  env: process.env.NODE_ENV || 'development'
};
