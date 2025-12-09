/**
 * Request Logging Middleware Module
 * 
 * This module provides HTTP request logging middleware that integrates with the
 * centralized Winston logger. It logs request details including method, URL,
 * status code, and response time for debugging and monitoring purposes.
 * 
 * Features:
 * - Logs request method, URL, status code, response time
 * - Captures user-agent for analytics
 * - Uses res.on('finish') to capture response details
 * - Non-blocking, lightweight implementation
 * 
 * Usage in src/app.js:
 *   const { loggerMiddleware } = require('./middleware');
 *   app.use(loggerMiddleware);
 * 
 * @module src/middleware/logger
 */

const logger = require('../utils/logger');

/**
 * Paths to skip logging for (reduces excessive log output)
 * Health check endpoints are frequently polled by load balancers and monitoring
 * systems, so they are excluded from request logs by default.
 * @type {string[]}
 */
const SKIP_PATHS = ['/health', '/health/live', '/health/ready'];

/**
 * HTTP request logging middleware
 * 
 * Logs request details on response finish:
 * - method: HTTP method (GET, POST, etc.)
 * - url: Request URL path
 * - status: Response status code
 * - duration: Response time in milliseconds
 * - userAgent: Client user-agent string
 * 
 * Note: Health check endpoints are excluded from logging to reduce noise
 * from frequent monitoring/load balancer requests.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const loggerMiddleware = (req, res, next) => {
  // Skip logging for health check endpoints to reduce excessive logs
  if (SKIP_PATHS.includes(req.path)) {
    return next();
  }
  
  const start = Date.now();
  
  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent') || 'unknown'
    });
  });
  
  next();
};

module.exports = { loggerMiddleware };
