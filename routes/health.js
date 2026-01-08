/**
 * @fileoverview Health Check Endpoints Router Module
 * 
 * Provides Express.js router with health check endpoints for operational monitoring,
 * load balancer integration, container orchestration (Kubernetes), and PM2 process
 * management health monitoring.
 * 
 * Implements two standard health check patterns:
 * - Liveness Probe (/health): Indicates if the application is running
 * - Readiness Probe (/ready): Indicates if the application can serve traffic
 * 
 * Response Format:
 * All endpoints return JSON responses with consistent structure including
 * status, timestamp (ISO 8601), uptime, and optional dependency information.
 * 
 * HTTP Status Codes:
 * - 200 OK: Service is healthy/ready
 * - 503 Service Unavailable: Service is not ready (readiness probe only)
 * - 500 Internal Server Error: Probe execution failed
 * 
 * Integration Examples:
 * - Kubernetes: livenessProbe and readinessProbe configuration
 * - AWS ALB/ELB: Target group health check path
 * - PM2: Custom health check script
 * - Docker: HEALTHCHECK instruction
 * 
 * @module routes/health
 * @requires express
 * @version 1.0.0
 * @see {@link https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/}
 */

'use strict';

// =============================================================================
// EXTERNAL DEPENDENCIES
// =============================================================================

/**
 * Express.js web application framework
 * Used to create modular router instance for health check endpoints
 * @see https://expressjs.com/
 */
const express = require('express');

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Health status constants for consistent response values
 * @type {Object}
 * @property {string} HEALTHY - Status when liveness probe passes
 * @property {string} READY - Status when readiness probe passes
 * @property {string} NOT_READY - Status when readiness probe fails
 * @property {string} UNHEALTHY - Status when liveness probe fails
 */
const HEALTH_STATUS = Object.freeze({
  HEALTHY: 'healthy',
  READY: 'ready',
  NOT_READY: 'not_ready',
  UNHEALTHY: 'unhealthy'
});

/**
 * HTTP status codes used in health check responses
 * @type {Object}
 * @property {number} OK - Success status code
 * @property {number} SERVICE_UNAVAILABLE - Service not ready status code
 * @property {number} INTERNAL_ERROR - Internal error status code
 */
const HTTP_STATUS = Object.freeze({
  OK: 200,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500
});

// =============================================================================
// INTERNAL STATE TRACKING
// =============================================================================

/**
 * Application readiness state
 * Can be modified by external dependency checks
 * @type {Object}
 * @property {boolean} isReady - Overall readiness state
 * @property {Object} dependencies - Individual dependency states
 */
const applicationState = {
  isReady: true,
  dependencies: {}
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates the base health response object with common fields.
 * 
 * @private
 * @param {string} status - The health status string
 * @returns {Object} Base health response object
 * @example
 * const response = createBaseResponse('healthy');
 * // Returns: { status: 'healthy', timestamp: '2024-01-01T00:00:00.000Z', uptime: 123.456 }
 */
const createBaseResponse = (status) => {
  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
};

/**
 * Formats uptime into human-readable string.
 * 
 * @private
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Human-readable uptime string
 * @example
 * formatUptime(3661); // Returns: '1h 1m 1s'
 */
const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Performs dependency health checks.
 * This function can be extended to check database connections,
 * external services, cache availability, etc.
 * 
 * @private
 * @async
 * @returns {Promise<Object>} Object containing dependency check results
 * @example
 * const deps = await checkDependencies();
 * // Returns: { checks: { memory: { status: 'healthy', ... } }, allHealthy: true }
 */
const checkDependencies = async () => {
  const checks = {};
  let allHealthy = true;

  // Memory check - ensure process has adequate memory
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const heapUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    
    // Consider unhealthy if heap usage exceeds 90%
    const memoryHealthy = heapUsagePercent < 90;
    
    checks.memory = {
      status: memoryHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.NOT_READY,
      heapUsedMB,
      heapTotalMB,
      heapUsagePercent
    };
    
    if (!memoryHealthy) {
      allHealthy = false;
    }
  } catch (error) {
    checks.memory = {
      status: HEALTH_STATUS.NOT_READY,
      error: 'Failed to check memory'
    };
    allHealthy = false;
  }

  // Event loop check - ensure Node.js event loop is responsive
  try {
    const eventLoopLag = await measureEventLoopLag();
    // Consider unhealthy if event loop lag exceeds 100ms
    const eventLoopHealthy = eventLoopLag < 100;
    
    checks.eventLoop = {
      status: eventLoopHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.NOT_READY,
      lagMs: eventLoopLag
    };
    
    if (!eventLoopHealthy) {
      allHealthy = false;
    }
  } catch (error) {
    checks.eventLoop = {
      status: HEALTH_STATUS.NOT_READY,
      error: 'Failed to check event loop'
    };
    allHealthy = false;
  }

  // Check application-level readiness state
  checks.application = {
    status: applicationState.isReady ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.NOT_READY,
    customDependencies: Object.keys(applicationState.dependencies).length > 0 
      ? applicationState.dependencies 
      : undefined
  };
  
  if (!applicationState.isReady) {
    allHealthy = false;
  }

  return { checks, allHealthy };
};

/**
 * Measures Node.js event loop lag to detect blocking operations.
 * 
 * @private
 * @returns {Promise<number>} Event loop lag in milliseconds
 */
const measureEventLoopLag = () => {
  return new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      resolve(lag);
    });
  });
};

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * Liveness probe handler - GET /health
 * 
 * Indicates whether the application is running and should be kept alive.
 * This is a lightweight check that should return quickly without performing
 * expensive operations or external dependency checks.
 * 
 * Use Cases:
 * - Kubernetes livenessProbe: Restart container if probe fails
 * - Load balancer health check: Remove from pool if unhealthy
 * - PM2 monitoring: Track application availability
 * 
 * Response Schema:
 * {
 *   status: 'healthy' | 'unhealthy',
 *   timestamp: string (ISO 8601),
 *   uptime: number (seconds),
 *   uptimeFormatted: string (human-readable)
 * }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {void}
 * 
 * @example
 * // Successful response (HTTP 200):
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-01T12:00:00.000Z",
 *   "uptime": 3600,
 *   "uptimeFormatted": "1h 0m 0s"
 * }
 */
const healthHandler = (req, res) => {
  try {
    const response = createBaseResponse(HEALTH_STATUS.HEALTHY);
    response.uptimeFormatted = formatUptime(response.uptime);
    
    // Set appropriate cache headers to prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    // Even errors in the health check should return a valid response
    const errorResponse = {
      status: HEALTH_STATUS.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(errorResponse);
  }
};

/**
 * Readiness probe handler - GET /ready
 * 
 * Indicates whether the application is ready to accept traffic.
 * Unlike the liveness probe, this performs deeper checks including
 * memory usage, event loop responsiveness, and custom dependency states.
 * 
 * Use Cases:
 * - Kubernetes readinessProbe: Remove from service endpoints if not ready
 * - Rolling deployments: Wait for new pods to be ready before removing old
 * - Load balancer: Route traffic only to ready instances
 * - Circuit breaker: Detect degraded service state
 * 
 * Response Schema (Success - HTTP 200):
 * {
 *   status: 'ready',
 *   timestamp: string (ISO 8601),
 *   uptime: number (seconds),
 *   uptimeFormatted: string (human-readable),
 *   checks: {
 *     memory: { status, heapUsedMB, heapTotalMB, heapUsagePercent },
 *     eventLoop: { status, lagMs },
 *     application: { status, customDependencies? }
 *   }
 * }
 * 
 * Response Schema (Not Ready - HTTP 503):
 * {
 *   status: 'not_ready',
 *   timestamp: string (ISO 8601),
 *   uptime: number (seconds),
 *   checks: { ... },
 *   reason: string
 * }
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {Promise<void>}
 * 
 * @example
 * // Successful response (HTTP 200):
 * {
 *   "status": "ready",
 *   "timestamp": "2024-01-01T12:00:00.000Z",
 *   "uptime": 3600,
 *   "uptimeFormatted": "1h 0m 0s",
 *   "checks": {
 *     "memory": { "status": "healthy", "heapUsedMB": 50, "heapTotalMB": 100, "heapUsagePercent": 50 },
 *     "eventLoop": { "status": "healthy", "lagMs": 2 },
 *     "application": { "status": "healthy" }
 *   }
 * }
 * 
 * @example
 * // Not ready response (HTTP 503):
 * {
 *   "status": "not_ready",
 *   "timestamp": "2024-01-01T12:00:00.000Z",
 *   "uptime": 3600,
 *   "checks": {
 *     "memory": { "status": "not_ready", "heapUsagePercent": 95 }
 *   },
 *   "reason": "One or more dependency checks failed"
 * }
 */
const readyHandler = async (req, res) => {
  try {
    // Perform dependency checks
    const { checks, allHealthy } = await checkDependencies();
    
    // Build response
    const status = allHealthy ? HEALTH_STATUS.READY : HEALTH_STATUS.NOT_READY;
    const response = createBaseResponse(status);
    response.uptimeFormatted = formatUptime(response.uptime);
    response.checks = checks;
    
    // Add reason if not ready
    if (!allHealthy) {
      response.reason = 'One or more dependency checks failed';
    }
    
    // Set appropriate cache headers to prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const statusCode = allHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(response);
  } catch (error) {
    // Readiness check failure should return 503
    const errorResponse = {
      status: HEALTH_STATUS.NOT_READY,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(errorResponse);
  }
};

// =============================================================================
// UTILITY FUNCTIONS FOR EXTERNAL USE
// =============================================================================

/**
 * Sets the application readiness state.
 * Call this function to mark the application as not ready during
 * maintenance, deployment, or when critical dependencies are unavailable.
 * 
 * @param {boolean} ready - Whether the application is ready
 * @returns {void}
 * 
 * @example
 * // During graceful shutdown
 * setApplicationReady(false);
 * 
 * @example
 * // After initialization complete
 * setApplicationReady(true);
 */
const setApplicationReady = (ready) => {
  applicationState.isReady = Boolean(ready);
};

/**
 * Gets the current application readiness state.
 * 
 * @returns {boolean} Current readiness state
 * 
 * @example
 * if (getApplicationReady()) {
 *   // Process request
 * }
 */
const getApplicationReady = () => {
  return applicationState.isReady;
};

/**
 * Registers a custom dependency check.
 * Use this to add application-specific health checks for databases,
 * external APIs, cache services, etc.
 * 
 * @param {string} name - Unique name for the dependency
 * @param {Object} state - Dependency state object
 * @param {string} state.status - Health status ('healthy', 'not_ready', etc.)
 * @param {*} [state.details] - Optional additional details
 * @returns {void}
 * 
 * @example
 * // Register database health
 * registerDependency('database', {
 *   status: 'healthy',
 *   connectionPool: { active: 5, idle: 10, waiting: 0 }
 * });
 * 
 * @example
 * // Register cache health
 * registerDependency('redis', {
 *   status: 'healthy',
 *   latencyMs: 2
 * });
 */
const registerDependency = (name, state) => {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError('Dependency name must be a non-empty string');
  }
  
  applicationState.dependencies[name] = {
    ...state,
    lastChecked: new Date().toISOString()
  };
};

/**
 * Removes a registered dependency check.
 * 
 * @param {string} name - Name of the dependency to remove
 * @returns {boolean} True if dependency was removed, false if not found
 * 
 * @example
 * unregisterDependency('database');
 */
const unregisterDependency = (name) => {
  if (applicationState.dependencies[name]) {
    delete applicationState.dependencies[name];
    return true;
  }
  return false;
};

// =============================================================================
// ROUTER CONFIGURATION
// =============================================================================

/**
 * Express router instance for health check endpoints.
 * Mounts the following routes:
 * - GET /health - Liveness probe
 * - GET /ready - Readiness probe
 * 
 * @type {express.Router}
 */
const healthRouter = express.Router();

/**
 * GET /health - Liveness probe endpoint
 * @route GET /health
 * @group Health - Health check operations
 * @returns {Object} 200 - Health status response
 * @returns {Object} 500 - Internal error response
 */
healthRouter.get('/health', healthHandler);

/**
 * GET /ready - Readiness probe endpoint
 * @route GET /ready
 * @group Health - Health check operations
 * @returns {Object} 200 - Ready status response
 * @returns {Object} 503 - Not ready response
 */
healthRouter.get('/ready', readyHandler);

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Health check router and utilities
 * 
 * @exports healthRouter - Express router with health endpoints (default)
 * @exports healthHandler - Liveness probe handler function
 * @exports readyHandler - Readiness probe handler function
 * @exports setApplicationReady - Function to set readiness state
 * @exports getApplicationReady - Function to get readiness state
 * @exports registerDependency - Function to register custom dependency checks
 * @exports unregisterDependency - Function to remove dependency checks
 * @exports HEALTH_STATUS - Health status constants
 */
module.exports = healthRouter;

// Named exports for testing and direct handler access
module.exports.healthHandler = healthHandler;
module.exports.readyHandler = readyHandler;
module.exports.setApplicationReady = setApplicationReady;
module.exports.getApplicationReady = getApplicationReady;
module.exports.registerDependency = registerDependency;
module.exports.unregisterDependency = unregisterDependency;
module.exports.HEALTH_STATUS = HEALTH_STATUS;
