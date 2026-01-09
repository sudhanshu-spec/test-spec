/**
 * Configuration Management Module
 *
 * This module centralizes all application configuration values with environment
 * variable support following the Twelve-Factor App methodology for configuration
 * externalization.
 *
 * @description
 * Implements Factor III: Config - Store config in the environment.
 * Configuration that varies between deployments should be stored in environment
 * variables rather than in code. This enables the same codebase to run in
 * development, staging, and production without modification.
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
 * ## Environment Comparison Table
 *
 * | Variable   | Development      | Production       | Docker/Container |
 * |------------|------------------|------------------|------------------|
 * | HOST       | 127.0.0.1        | 0.0.0.0          | 0.0.0.0          |
 * | PORT       | 3000             | 80/443 or 3000   | 3000 (internal)  |
 * | NODE_ENV   | development      | production       | production       |
 *
 * **Production Notes:**
 * - HOST=0.0.0.0 is required for external access (behind reverse proxy)
 * - PORT may be 80/443 directly, or internal port (3000) behind nginx/load balancer
 * - NODE_ENV=production enables performance optimizations in Express
 *
 * **Docker/Container Notes:**
 * - HOST must be 0.0.0.0 for container networking to work correctly
 * - PORT mapping handled by Docker (-p 80:3000), internal port can stay 3000
 * - Always set NODE_ENV=production in production container environments
 *
 * @module src/config
 * @see {@link https://12factor.net/config|Twelve-Factor App: III. Config}
 *
 * @property {string} host - Server bind address (defaults to '127.0.0.1')
 * @property {number} port - Server listen port (defaults to 3000)
 * @property {string} env - Runtime environment mode (defaults to 'development')
 *
 * @example
 * // Import the configuration module
 * const config = require('./src/config');
 *
 * // Access all configuration properties
 * console.log(config.host); // '127.0.0.1' (default)
 * console.log(config.port); // 3000 (default, number type)
 * console.log(config.env);  // 'development' (default)
 *
 * @example
 * // Destructure specific properties
 * const { host, port, env } = require('./src/config');
 * console.log(`Server: http://${host}:${port}/ (${env})`);
 * // Output: Server: http://127.0.0.1:3000/ (development)
 *
 * @example
 * // Override via environment variables (terminal commands)
 * // Development with custom port:
 * // PORT=8080 npm start
 *
 * // Production deployment:
 * // HOST=0.0.0.0 PORT=3000 NODE_ENV=production npm start
 *
 * // Docker container:
 * // docker run -e HOST=0.0.0.0 -e NODE_ENV=production -p 80:3000 app
 */

// ---------------------------------------------------------------------------
// Configuration Exports
// ---------------------------------------------------------------------------

module.exports = {
  /**
   * Server host binding address
   *
   * Determines which network interface the server binds to for incoming connections.
   *
   * @type {string}
   * @default '127.0.0.1'
   *
   * @example
   * // Access default host
   * const { host } = require('./src/config');
   * console.log(host); // '127.0.0.1' (default)
   *
   * @example
   * // Override for container/production (terminal)
   * // HOST=0.0.0.0 npm start
   */
  // DEFAULT VALUE RATIONALE:
  // Defaults to '127.0.0.1' (localhost) for security best practice in development.
  // This binding prevents external network access by default, ensuring the server
  // only accepts connections from the local machine during development.
  //
  // DEPLOYMENT CONTEXT:
  // - Docker containers: Use HOST=0.0.0.0 to allow external connections through
  //   container networking. Without this, the container won't be accessible.
  // - Production: Use HOST=0.0.0.0 when running behind a reverse proxy (nginx).
  //   The reverse proxy handles external-facing security concerns.
  // - Kubernetes: HOST=0.0.0.0 required for pod networking and service discovery.
  host: process.env.HOST || '127.0.0.1',

  /**
   * Server port number
   *
   * Determines which TCP port the server listens on for HTTP requests.
   * The value is parsed as a base-10 integer from the environment variable.
   *
   * @type {number}
   * @default 3000
   *
   * @example
   * // Access default port
   * const { port } = require('./src/config');
   * console.log(port); // 3000 (default, number type)
   *
   * @example
   * // Override for custom port (terminal)
   * // PORT=8080 npm start
   */
  // DEFAULT VALUE RATIONALE:
  // Port 3000 is a widely-adopted convention for Node.js development servers.
  // Using an unprivileged port (>= 1024) avoids requiring sudo/root permissions,
  // which is both a security best practice and developer convenience.
  //
  // DEPLOYMENT CONTEXT:
  // - Production (direct): PORT=80 or PORT=443 may be used with proper permissions
  //   (e.g., setcap, authbind, or running as root - not recommended).
  // - Production (proxied): Internal port can remain 3000 when behind nginx or
  //   a load balancer. The proxy handles external port 80/443.
  // - Docker: Use port mapping (-p 80:3000) to expose internal port externally.
  //
  // parseInt RADIX PARAMETER:
  // The radix parameter (10) ensures decimal interpretation of the PORT string.
  // - Without radix, strings like '08' or '09' could fail in older JavaScript
  //   engines that interpreted leading zeros as octal notation.
  // - Explicit radix 10 is ESLint best practice (radix rule) for predictable parsing.
  // - Example: parseInt('08', 10) correctly returns 8, not NaN or 0.
  port: parseInt(process.env.PORT, 10) || 3000,

  /**
   * Application environment
   *
   * Indicates the runtime environment mode, affecting logging, error handling,
   * and framework-specific optimizations (e.g., Express view caching).
   *
   * @type {string}
   * @default 'development'
   *
   * @example
   * // Access environment mode
   * const { env } = require('./src/config');
   * console.log(env); // 'development' (default)
   *
   * @example
   * // Set production mode (terminal)
   * // NODE_ENV=production npm start
   */
  // DEFAULT VALUE RATIONALE:
  // Defaults to 'development' as a safe default for local development work.
  // This prevents accidentally running with production configuration locally,
  // ensuring verbose error messages and development-friendly behaviors are enabled.
  //
  // DEPLOYMENT CONTEXT:
  // - Valid values: 'development', 'production', 'test'
  // - Production: Always set NODE_ENV=production explicitly. This enables:
  //   * Express view caching
  //   * Minified error responses
  //   * Performance optimizations in many npm packages
  // - Test: Set NODE_ENV=test for test frameworks to enable test-specific
  //   configurations (e.g., test databases, mocked services).
  // - Never rely on default in production - always set explicitly.
  env: process.env.NODE_ENV || 'development'
};
