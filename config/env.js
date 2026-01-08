/**
 * Environment Variable Management Module
 * 
 * This module provides centralized environment configuration management for the Express
 * application. It implements type-safe access to environment variables with validation,
 * default values, and type coercion capabilities.
 * 
 * Features:
 * - dotenv initialization with custom path support
 * - Type-safe environment variable access (string, number, boolean, array, JSON)
 * - Required variable validation with detailed error reporting
 * - Comprehensive documentation of all known environment variables
 * - Immutable configuration export using Object.freeze()
 * 
 * Environment Variables Supported:
 * 
 * Application:
 * - NODE_ENV: Environment mode (development|production|test)
 * - PORT: HTTP server port (default: 3000)
 * - HOST: Server bind address (default: 127.0.0.1)
 * 
 * HTTPS/TLS:
 * - HTTPS_ENABLED: Enable HTTPS server (default: false)
 * - HTTPS_PORT: HTTPS server port (default: 3443)
 * - SSL_KEY_PATH: Path to TLS private key (default: ./certs/key.pem)
 * - SSL_CERT_PATH: Path to TLS certificate (default: ./certs/cert.pem)
 * 
 * Security:
 * - ALLOWED_ORIGINS: Comma-separated CORS origins
 * - RATE_LIMIT_WINDOW_MS: Rate limit time window (default: 900000)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 * 
 * Logging:
 * - LOG_LEVEL: Pino log level (default: info)
 * - LOG_FORMAT: Output format json|pretty (default: json)
 * - LOG_REDACT_PATHS: JSON paths to redact from logs
 * 
 * PM2 Process Manager:
 * - PM2_INSTANCES: Cluster instances, number or 'max' (default: max)
 * - PM2_EXEC_MODE: Execution mode cluster|fork (default: cluster)
 * 
 * Health Checks:
 * - HEALTH_CHECK_PATH: Health endpoint path (default: /health)
 * - READY_CHECK_PATH: Readiness endpoint path (default: /ready)
 * - SHUTDOWN_TIMEOUT: Graceful shutdown timeout ms (default: 10000)
 * 
 * Usage:
 *   const { loadEnv, getEnv, getEnvNumber, validateEnv } = require('./config/env');
 *   
 *   // Initialize dotenv (call once at application start)
 *   loadEnv();
 *   
 *   // Get string value with default
 *   const nodeEnv = getEnv('NODE_ENV', 'development');
 *   
 *   // Get numeric value
 *   const port = getEnvNumber('PORT', 3000);
 *   
 *   // Get boolean value
 *   const httpsEnabled = getEnvBoolean('HTTPS_ENABLED', false);
 *   
 *   // Validate required variables
 *   const { valid, missing } = validateEnv(['NODE_ENV', 'PORT']);
 * 
 * @module config/env
 * @see https://www.npmjs.com/package/dotenv
 * @see https://12factor.net/config
 */

'use strict';

/**
 * dotenv package for loading environment variables from .env files
 * @see https://www.npmjs.com/package/dotenv
 */
const dotenv = require('dotenv');

/**
 * Determines if the application is running in development mode
 * Used for environment-specific behavior like warning messages
 * @type {boolean}
 */
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Initialize dotenv configuration to load environment variables from .env file.
 * 
 * This function should be called once at application startup, before any
 * environment variables are accessed. It supports custom file paths for
 * different environments or deployment scenarios.
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.path] - Custom path to .env file (default: ./.env)
 * @param {boolean} [options.debug] - Enable dotenv debug mode for troubleshooting
 * @param {string} [options.encoding] - File encoding (default: utf8)
 * @param {boolean} [options.override] - Override existing environment variables
 * @returns {Object} dotenv config result object
 * @returns {Object|undefined} returns.parsed - Parsed .env content if successful
 * @returns {Error|undefined} returns.error - Error if .env file not found or parse error
 * 
 * @example
 * // Basic usage (loads from ./.env)
 * const result = loadEnv();
 * 
 * @example
 * // Custom path for testing
 * loadEnv({ path: './config/.env.test' });
 * 
 * @example
 * // With debug mode
 * loadEnv({ debug: true });
 */
const loadEnv = (options = {}) => {
  const result = dotenv.config(options);
  
  // Log warning in development if .env file is not found
  // This helps developers realize they need to create a .env file
  if (result.error && isDevelopment) {
    // Only warn if it's a file not found error, not other types of errors
    if (result.error.code === 'ENOENT') {
      console.warn(
        '[env] Warning: .env file not found. ' +
        'Copy .env.example to .env and configure your environment variables.'
      );
    }
  }
  
  return result;
};

/**
 * Retrieve an environment variable with optional default value and type coercion.
 * 
 * This function provides type-safe access to environment variables with support
 * for default values, required validation, and automatic type conversion.
 * 
 * @param {string} key - Environment variable name
 * @param {*} [defaultValue] - Default value if variable is not set or empty
 * @param {Object} [options={}] - Additional options
 * @param {('string'|'number'|'boolean'|'json')} [options.type='string'] - Expected type for coercion
 * @param {boolean} [options.required=false] - Throw error if variable is missing
 * @returns {*} The environment variable value, coerced to the specified type
 * @throws {Error} If required is true and variable is not set
 * @throws {Error} If type coercion fails for 'number' or 'json' types
 * 
 * @example
 * // Simple string value with default
 * const env = getEnv('NODE_ENV', 'development');
 * 
 * @example
 * // Required variable (throws if missing)
 * const apiKey = getEnv('API_KEY', null, { required: true });
 * 
 * @example
 * // With type coercion
 * const port = getEnv('PORT', 3000, { type: 'number' });
 * const debug = getEnv('DEBUG', false, { type: 'boolean' });
 * const config = getEnv('CONFIG', {}, { type: 'json' });
 */
const getEnv = (key, defaultValue, options = {}) => {
  const { type = 'string', required = false } = options;
  
  const value = process.env[key];
  
  // Check if value is not set or is empty string
  const isEmpty = value === undefined || value === null || value === '';
  
  // Handle required validation
  if (required && isEmpty) {
    throw new Error(
      `[env] Required environment variable "${key}" is not set. ` +
      'Please check your .env file or environment configuration.'
    );
  }
  
  // Return default value if not set
  if (isEmpty) {
    return defaultValue;
  }
  
  // Apply type coercion based on specified type
  switch (type) {
    case 'number': {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        console.warn(
          `[env] Warning: Environment variable "${key}" value "${value}" is not a valid number. ` +
          `Using default value: ${defaultValue}`
        );
        return defaultValue;
      }
      return parsed;
    }
    
    case 'boolean': {
      const lowerValue = value.toLowerCase().trim();
      if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(lowerValue)) {
        return false;
      }
      console.warn(
        `[env] Warning: Environment variable "${key}" value "${value}" is not a valid boolean. ` +
        `Using default value: ${defaultValue}`
      );
      return defaultValue;
    }
    
    case 'json': {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn(
          `[env] Warning: Environment variable "${key}" is not valid JSON: ${error.message}. ` +
          `Using default value.`
        );
        return defaultValue;
      }
    }
    
    case 'string':
    default:
      return value;
  }
};

/**
 * Retrieve an environment variable as a number.
 * 
 * Convenience wrapper around getEnv() for numeric environment variables.
 * Automatically parses the value as a floating-point number and validates it.
 * 
 * @param {string} key - Environment variable name
 * @param {number} [defaultValue=0] - Default value if variable is not set or invalid
 * @returns {number} The parsed numeric value or default
 * 
 * @example
 * const port = getEnvNumber('PORT', 3000);
 * const timeout = getEnvNumber('TIMEOUT_MS', 5000);
 * const maxConnections = getEnvNumber('MAX_CONNECTIONS', 100);
 */
const getEnvNumber = (key, defaultValue = 0) => {
  const value = process.env[key];
  
  // Return default if not set or empty
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  // Parse as number
  const parsed = parseFloat(value);
  
  // Return default if NaN
  if (isNaN(parsed)) {
    console.warn(
      `[env] Warning: Environment variable "${key}" value "${value}" is not a valid number. ` +
      `Using default value: ${defaultValue}`
    );
    return defaultValue;
  }
  
  return parsed;
};

/**
 * Retrieve an environment variable as a boolean.
 * 
 * Convenience wrapper around getEnv() for boolean environment variables.
 * Handles common boolean string representations:
 * - Truthy: 'true', '1', 'yes', 'on' (case-insensitive)
 * - Falsy: 'false', '0', 'no', 'off' (case-insensitive)
 * 
 * @param {string} key - Environment variable name
 * @param {boolean} [defaultValue=false] - Default value if variable is not set or invalid
 * @returns {boolean} The parsed boolean value or default
 * 
 * @example
 * const httpsEnabled = getEnvBoolean('HTTPS_ENABLED', false);
 * const debugMode = getEnvBoolean('DEBUG', false);
 * const verboseLogging = getEnvBoolean('VERBOSE', true);
 */
const getEnvBoolean = (key, defaultValue = false) => {
  const value = process.env[key];
  
  // Return default if not set or empty
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  const lowerValue = value.toLowerCase().trim();
  
  // Check for truthy values
  if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
    return true;
  }
  
  // Check for falsy values
  if (['false', '0', 'no', 'off'].includes(lowerValue)) {
    return false;
  }
  
  // Warn about unrecognized value and return default
  console.warn(
    `[env] Warning: Environment variable "${key}" value "${value}" is not a recognized boolean. ` +
    `Expected: true/false, 1/0, yes/no, on/off. Using default value: ${defaultValue}`
  );
  
  return defaultValue;
};

/**
 * Retrieve an environment variable as an array.
 * 
 * Parses a delimited string environment variable into an array.
 * By default, uses comma as the separator, but supports custom separators.
 * Empty strings are filtered out from the result.
 * 
 * @param {string} key - Environment variable name
 * @param {string[]} [defaultValue=[]] - Default value if variable is not set
 * @param {string} [separator=','] - Delimiter character for splitting
 * @returns {string[]} Array of parsed values, trimmed and filtered
 * 
 * @example
 * // Parse comma-separated origins
 * const origins = getEnvArray('ALLOWED_ORIGINS', ['http://localhost:3000']);
 * // Input: 'https://app.com,https://api.app.com'
 * // Output: ['https://app.com', 'https://api.app.com']
 * 
 * @example
 * // Custom separator
 * const paths = getEnvArray('LOG_REDACT_PATHS', [], ':');
 * // Input: 'password:secret:apiKey'
 * // Output: ['password', 'secret', 'apiKey']
 */
const getEnvArray = (key, defaultValue = [], separator = ',') => {
  const value = process.env[key];
  
  // Return default if not set or empty
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  // Split by separator, trim each value, and filter empty strings
  const result = value
    .split(separator)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  // Return default if no valid items after parsing
  if (result.length === 0) {
    return defaultValue;
  }
  
  return result;
};

/**
 * Retrieve an environment variable as a parsed JSON object.
 * 
 * Parses a JSON string environment variable into a JavaScript object.
 * Useful for complex configuration objects that don't fit simple key-value pairs.
 * 
 * Security Note: Be cautious with JSON environment variables in production
 * as they can make configuration harder to audit. Prefer flat key-value
 * pairs when possible.
 * 
 * @param {string} key - Environment variable name
 * @param {*} [defaultValue=null] - Default value if variable is not set or parse fails
 * @returns {*} The parsed JSON value or default
 * 
 * @example
 * // Parse JSON configuration
 * const config = getEnvJson('APP_CONFIG', { debug: false });
 * // Input: '{"debug":true,"maxRetries":3}'
 * // Output: { debug: true, maxRetries: 3 }
 * 
 * @example
 * // Parse JSON array for redact paths
 * const redactPaths = getEnvJson('LOG_REDACT_PATHS', ['req.headers.authorization']);
 * // Input: '["req.headers.authorization","req.body.password"]'
 * // Output: ['req.headers.authorization', 'req.body.password']
 */
const getEnvJson = (key, defaultValue = null) => {
  const value = process.env[key];
  
  // Return default if not set or empty
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(
      `[env] Warning: Environment variable "${key}" is not valid JSON. ` +
      `Parse error: ${error.message}. Using default value.`
    );
    return defaultValue;
  }
};

/**
 * Validate that required environment variables are set.
 * 
 * Checks an array of environment variable names and returns validation results.
 * Useful for application startup validation to fail fast if critical
 * configuration is missing.
 * 
 * @param {string[]} requiredVars - Array of required environment variable names
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.strict=false] - Throw error if validation fails
 * @param {boolean} [options.allowEmpty=false] - Allow empty string values
 * @returns {Object} Validation result
 * @returns {boolean} returns.valid - True if all required variables are set
 * @returns {string[]} returns.missing - Array of missing variable names
 * @returns {string[]} returns.present - Array of present variable names
 * @throws {Error} If strict mode is enabled and variables are missing
 * 
 * @example
 * // Basic validation
 * const { valid, missing } = validateEnv(['NODE_ENV', 'PORT']);
 * if (!valid) {
 *   console.error('Missing environment variables:', missing);
 *   process.exit(1);
 * }
 * 
 * @example
 * // Strict mode (throws on missing)
 * try {
 *   validateEnv(['DATABASE_URL', 'API_KEY'], { strict: true });
 * } catch (error) {
 *   console.error(error.message);
 *   process.exit(1);
 * }
 */
const validateEnv = (requiredVars, options = {}) => {
  const { strict = false, allowEmpty = false } = options;
  
  // Validate input
  if (!Array.isArray(requiredVars)) {
    throw new TypeError('[env] validateEnv requires an array of variable names');
  }
  
  const missing = [];
  const present = [];
  
  for (const key of requiredVars) {
    const value = process.env[key];
    
    // Check if variable is set
    const isSet = value !== undefined && value !== null;
    
    // Check if variable is non-empty (unless allowEmpty is true)
    const isValid = isSet && (allowEmpty || value !== '');
    
    if (isValid) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }
  
  const valid = missing.length === 0;
  
  // Throw error in strict mode if validation fails
  if (strict && !valid) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file or environment configuration.'
    );
  }
  
  return {
    valid,
    missing,
    present
  };
};

/**
 * Environment Variables Documentation Object
 * 
 * Comprehensive documentation of all known environment variables used by
 * the application. This object serves as both runtime documentation and
 * can be used to generate configuration documentation.
 * 
 * Each entry contains:
 * - description: Human-readable description of the variable
 * - default: Default value if not set
 * - type: Expected value type
 * - options: Valid values (for enumerated types)
 * - required: Whether the variable is required
 * - example: Example value
 * 
 * @type {Object}
 */
const envDocs = {
  /**
   * Application Environment Mode
   * Controls environment-specific behavior throughout the application
   */
  NODE_ENV: {
    description: 'Application environment mode',
    default: 'development',
    type: 'string',
    options: ['development', 'production', 'test'],
    required: false,
    example: 'production'
  },
  
  /**
   * HTTP Server Port
   * Port number for the HTTP server to listen on
   */
  PORT: {
    description: 'HTTP server port',
    default: 3000,
    type: 'number',
    required: false,
    example: '3000'
  },
  
  /**
   * Server Bind Address
   * Network interface address for server binding
   */
  HOST: {
    description: 'Server bind address',
    default: '127.0.0.1',
    type: 'string',
    required: false,
    example: '0.0.0.0'
  },
  
  /**
   * HTTPS Enabled Flag
   * Toggle HTTPS server mode
   */
  HTTPS_ENABLED: {
    description: 'Enable HTTPS server',
    default: false,
    type: 'boolean',
    required: false,
    example: 'true'
  },
  
  /**
   * HTTPS Server Port
   * Port number for the HTTPS server
   */
  HTTPS_PORT: {
    description: 'HTTPS server port',
    default: 3443,
    type: 'number',
    required: false,
    example: '443'
  },
  
  /**
   * SSL Private Key Path
   * File path to TLS/SSL private key in PEM format
   */
  SSL_KEY_PATH: {
    description: 'Path to TLS private key file',
    default: './certs/key.pem',
    type: 'string',
    required: false,
    example: '/etc/ssl/private/server.key'
  },
  
  /**
   * SSL Certificate Path
   * File path to TLS/SSL certificate in PEM format
   */
  SSL_CERT_PATH: {
    description: 'Path to TLS certificate file',
    default: './certs/cert.pem',
    type: 'string',
    required: false,
    example: '/etc/ssl/certs/server.crt'
  },
  
  /**
   * CORS Allowed Origins
   * Comma-separated list of origins allowed for cross-origin requests
   */
  ALLOWED_ORIGINS: {
    description: 'Comma-separated list of allowed CORS origins',
    default: '',
    type: 'array',
    required: false,
    example: 'https://myapp.com,https://api.myapp.com'
  },
  
  /**
   * Rate Limit Window Duration
   * Time window in milliseconds for rate limiting
   */
  RATE_LIMIT_WINDOW_MS: {
    description: 'Rate limit time window in milliseconds',
    default: 900000,
    type: 'number',
    required: false,
    example: '60000'
  },
  
  /**
   * Rate Limit Maximum Requests
   * Maximum number of requests allowed per window per IP
   */
  RATE_LIMIT_MAX: {
    description: 'Maximum requests per rate limit window',
    default: 100,
    type: 'number',
    required: false,
    example: '50'
  },
  
  /**
   * Logging Level
   * Pino log level for filtering log output
   */
  LOG_LEVEL: {
    description: 'Pino log level',
    default: 'info',
    type: 'string',
    options: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'],
    required: false,
    example: 'debug'
  },
  
  /**
   * Logging Format
   * Output format for logs (JSON for production, pretty for development)
   */
  LOG_FORMAT: {
    description: 'Log output format',
    default: 'json',
    type: 'string',
    options: ['json', 'pretty'],
    required: false,
    example: 'pretty'
  },
  
  /**
   * Logging Redaction Paths
   * JSON array of paths to redact from log output (sensitive data)
   */
  LOG_REDACT_PATHS: {
    description: 'JSON array of paths to redact from logs',
    default: '["req.headers.authorization"]',
    type: 'json',
    required: false,
    example: '["req.headers.authorization","req.body.password"]'
  },
  
  /**
   * PM2 Cluster Instances
   * Number of cluster instances for PM2 process manager
   */
  PM2_INSTANCES: {
    description: 'Number of PM2 cluster instances',
    default: 'max',
    type: 'string',
    options: ['max', '1', '2', '4', '...'],
    required: false,
    example: '4'
  },
  
  /**
   * PM2 Execution Mode
   * Process execution mode for PM2
   */
  PM2_EXEC_MODE: {
    description: 'PM2 execution mode',
    default: 'cluster',
    type: 'string',
    options: ['cluster', 'fork'],
    required: false,
    example: 'cluster'
  },
  
  /**
   * Health Check Endpoint Path
   * URL path for the health check endpoint
   */
  HEALTH_CHECK_PATH: {
    description: 'Health check endpoint path',
    default: '/health',
    type: 'string',
    required: false,
    example: '/healthz'
  },
  
  /**
   * Readiness Check Endpoint Path
   * URL path for the readiness probe endpoint
   */
  READY_CHECK_PATH: {
    description: 'Readiness check endpoint path',
    default: '/ready',
    type: 'string',
    required: false,
    example: '/readyz'
  },
  
  /**
   * Graceful Shutdown Timeout
   * Maximum time in milliseconds to wait for graceful shutdown
   */
  SHUTDOWN_TIMEOUT: {
    description: 'Graceful shutdown timeout in milliseconds',
    default: 10000,
    type: 'number',
    required: false,
    example: '30000'
  }
};

/**
 * Freeze the envDocs object to prevent runtime modifications.
 * This ensures the documentation cannot be accidentally altered.
 */
Object.freeze(envDocs);

// Freeze nested objects in envDocs
Object.keys(envDocs).forEach(key => {
  Object.freeze(envDocs[key]);
});

/**
 * Export environment configuration utilities as a frozen object.
 * 
 * The exported object is frozen to prevent runtime modifications,
 * ensuring consistent behavior throughout the application lifecycle.
 * 
 * @type {Object}
 * @property {Function} loadEnv - Initialize dotenv configuration
 * @property {Function} getEnv - Get environment variable with type coercion
 * @property {Function} getEnvNumber - Get environment variable as number
 * @property {Function} getEnvBoolean - Get environment variable as boolean
 * @property {Function} getEnvArray - Get environment variable as array
 * @property {Function} getEnvJson - Get environment variable as JSON
 * @property {Function} validateEnv - Validate required environment variables
 * @property {Object} envDocs - Environment variables documentation
 */
module.exports = Object.freeze({
  loadEnv,
  getEnv,
  getEnvNumber,
  getEnvBoolean,
  getEnvArray,
  getEnvJson,
  validateEnv,
  envDocs
});
