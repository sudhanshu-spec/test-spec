/**
 * Centralized Configuration Module
 * 
 * This module provides validated environment variables following The Twelve-Factor App
 * methodology. All configuration values are externalized via environment variables
 * with sensible defaults for development environments.
 * 
 * @module config
 * @description Exports validated configuration object with port, nodeEnv, logLevel, and logDir
 * @see https://12factor.net/config
 */

'use strict';

// Load environment variables from .env file into process.env
// This must be called before accessing any environment variables
require('dotenv').config();

/**
 * Valid environment modes for the application
 * @constant {string[]}
 */
const VALID_ENVIRONMENTS = ['development', 'production', 'test'];

/**
 * Valid log levels supported by Winston logger
 * @constant {string[]}
 */
const VALID_LOG_LEVELS = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];

/**
 * Default configuration values
 * @constant {Object}
 */
const DEFAULTS = {
  PORT: 3000,
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  LOG_DIR: './logs'
};

/**
 * Parses and validates the PORT environment variable
 * @param {string|undefined} portValue - The raw PORT environment variable value
 * @returns {number} Validated port number
 */
const parsePort = (portValue) => {
  if (portValue === undefined || portValue === '') {
    return DEFAULTS.PORT;
  }
  
  const parsed = parseInt(portValue, 10);
  
  // Validate port is a valid number
  if (isNaN(parsed)) {
    console.warn(`[config] Invalid PORT value "${portValue}", using default ${DEFAULTS.PORT}`);
    return DEFAULTS.PORT;
  }
  
  // Validate port is within valid range (1-65535)
  if (parsed < 1 || parsed > 65535) {
    console.warn(`[config] PORT ${parsed} out of range (1-65535), using default ${DEFAULTS.PORT}`);
    return DEFAULTS.PORT;
  }
  
  return parsed;
};

/**
 * Validates and returns the NODE_ENV environment variable
 * @param {string|undefined} envValue - The raw NODE_ENV environment variable value
 * @returns {string} Validated environment mode
 */
const parseNodeEnv = (envValue) => {
  if (envValue === undefined || envValue === '') {
    return DEFAULTS.NODE_ENV;
  }
  
  const normalizedEnv = envValue.toLowerCase().trim();
  
  if (!VALID_ENVIRONMENTS.includes(normalizedEnv)) {
    console.warn(
      `[config] Invalid NODE_ENV "${envValue}", expected one of: ${VALID_ENVIRONMENTS.join(', ')}. ` +
      `Using default "${DEFAULTS.NODE_ENV}"`
    );
    return DEFAULTS.NODE_ENV;
  }
  
  return normalizedEnv;
};

/**
 * Validates and returns the LOG_LEVEL environment variable
 * @param {string|undefined} levelValue - The raw LOG_LEVEL environment variable value
 * @returns {string} Validated log level
 */
const parseLogLevel = (levelValue) => {
  if (levelValue === undefined || levelValue === '') {
    return DEFAULTS.LOG_LEVEL;
  }
  
  const normalizedLevel = levelValue.toLowerCase().trim();
  
  if (!VALID_LOG_LEVELS.includes(normalizedLevel)) {
    console.warn(
      `[config] Invalid LOG_LEVEL "${levelValue}", expected one of: ${VALID_LOG_LEVELS.join(', ')}. ` +
      `Using default "${DEFAULTS.LOG_LEVEL}"`
    );
    return DEFAULTS.LOG_LEVEL;
  }
  
  return normalizedLevel;
};

/**
 * Validates and returns the LOG_DIR environment variable
 * @param {string|undefined} dirValue - The raw LOG_DIR environment variable value
 * @returns {string} Validated log directory path
 */
const parseLogDir = (dirValue) => {
  if (dirValue === undefined || dirValue === '') {
    return DEFAULTS.LOG_DIR;
  }
  
  // Trim whitespace and normalize path
  const normalizedPath = dirValue.trim();
  
  // Basic validation - ensure path is not empty after trimming
  if (normalizedPath.length === 0) {
    console.warn(`[config] Empty LOG_DIR value, using default "${DEFAULTS.LOG_DIR}"`);
    return DEFAULTS.LOG_DIR;
  }
  
  return normalizedPath;
};

/**
 * Application configuration object with validated environment variables
 * 
 * @type {Object}
 * @property {number} port - Server port number (default: 3000)
 * @property {string} nodeEnv - Environment mode: 'development', 'production', or 'test' (default: 'development')
 * @property {string} logLevel - Winston log level: 'error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly' (default: 'info')
 * @property {string} logDir - Directory path for log files (default: './logs')
 * 
 * @example
 * const config = require('./config');
 * 
 * // Access configuration values
 * app.listen(config.port, () => {
 *   console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
 * });
 * 
 * @example
 * // Usage in logger configuration
 * const logger = createLogger({
 *   level: config.logLevel,
 *   transports: [
 *     new transports.File({ 
 *       filename: `${config.logDir}/combined.log` 
 *     })
 *   ]
 * });
 */
const config = {
  /**
   * Server port number
   * Sourced from PORT environment variable
   * @type {number}
   */
  port: parsePort(process.env.PORT),

  /**
   * Application environment mode
   * Sourced from NODE_ENV environment variable
   * Valid values: 'development', 'production', 'test'
   * @type {string}
   */
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),

  /**
   * Logging level for Winston logger
   * Sourced from LOG_LEVEL environment variable
   * Valid values: 'error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'
   * @type {string}
   */
  logLevel: parseLogLevel(process.env.LOG_LEVEL),

  /**
   * Directory path for log files
   * Sourced from LOG_DIR environment variable
   * @type {string}
   */
  logDir: parseLogDir(process.env.LOG_DIR)
};

// Freeze the config object to prevent accidental modifications
// This ensures configuration immutability throughout the application lifecycle
Object.freeze(config);

/**
 * Log configuration values on first load (only in non-production environments)
 * This helps with debugging configuration issues during development
 */
if (config.nodeEnv !== 'production') {
  console.log('[config] Configuration loaded:', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    logLevel: config.logLevel,
    logDir: config.logDir
  });
}

module.exports = config;
