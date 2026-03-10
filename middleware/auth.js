/**
 * Authentication Middleware Module
 * 
 * JWT token verification middleware for protecting authenticated routes.
 * Extracts JWT from HttpOnly cookies (set by cookie-parser middleware),
 * verifies the token signature and expiration using the centralized JWT secret,
 * and attaches the decoded user data to `req.user` for downstream route handlers.
 * 
 * Unauthenticated or improperly authenticated requests receive a 401 Unauthorized
 * JSON error response with a generic message (error message opacity is enforced
 * to prevent information leakage about token failure reasons).
 * 
 * This middleware is applied at the router level in routes/protected.js to guard
 * endpoints that require a valid user session (e.g., POST /auth/logout).
 * Public routes (login, register) do NOT pass through this middleware.
 * 
 * Middleware Chain Position:
 * helmet → cors → express.json → cookie-parser → rateLimit → [this middleware] → route handler
 * 
 * Prerequisites:
 * - cookie-parser middleware must be registered before this middleware runs,
 *   so that req.cookies is populated with parsed cookie values.
 * 
 * @module middleware/auth
 * @requires jsonwebtoken
 * @requires config/auth
 */

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

/**
 * JWT Authentication Middleware
 * 
 * Verifies the JWT token extracted from the request's HttpOnly cookie and
 * attaches the decoded payload to `req.user` for use by subsequent middleware
 * and route handlers. Returns a 401 Unauthorized response if the token is
 * missing, expired, malformed, or has an invalid signature.
 * 
 * Middleware Behavior:
 * 1. Extracts JWT token from `req.cookies.token` using optional chaining
 *    to safely handle cases where cookies may be undefined
 * 2. If no token is present (undefined, null, or empty string), immediately
 *    returns 401 with `{ message: 'Authentication required' }`
 * 3. Calls `jwt.verify(token, jwtSecret)` to validate the token's HMAC-SHA256
 *    signature and check expiration/nbf claims
 * 4. On successful verification, attaches the decoded payload (typically
 *    containing `{ id, email, iat, exp }`) to `req.user` and calls `next()`
 *    to proceed to the next middleware or route handler
 * 5. On verification failure (expired, invalid signature, or malformed token),
 *    catches the thrown error and returns 401 with `{ message: 'Invalid or expired token' }`
 * 
 * Error Types Caught:
 * - JsonWebTokenError: Malformed token or invalid signature
 * - TokenExpiredError: Token has passed its expiration time
 * - NotBeforeError: Token is not yet active (nbf claim)
 * All error types produce the same generic 401 response to prevent information leakage.
 * 
 * HTTP Status Codes:
 * - 401 Unauthorized: Token is missing, expired, invalid, or malformed
 * - Proceeds normally: Token is valid and not expired
 * 
 * Security Benefit:
 * Prevents unauthorized access to protected endpoints by requiring a valid,
 * non-expired JWT token. Generic error messages prevent attackers from
 * distinguishing between different failure modes (expired vs invalid vs missing),
 * reducing the information available for token-based attacks.
 * 
 * @function
 * @param {Object} req - Express request object (must have cookies parsed by cookie-parser)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Response} Returns 401 JSON response if authentication fails, otherwise calls next()
 */
const authMiddleware = (req, res, next) => {
  // Step 1: Extract token from HttpOnly cookie using optional chaining
  // cookie-parser must have run before this middleware to populate req.cookies
  const token = req.cookies?.token;

  // Step 2: Check if token exists (handles undefined, null, empty string)
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Step 3: Verify and decode the JWT token using HMAC-SHA256 signature validation
    // jwt.verify() is synchronous (no callback) and throws on failure
    const decoded = jwt.verify(token, jwtSecret);

    // Step 4: Attach decoded user data to request object for downstream handlers
    // Decoded payload typically contains: { id, email, iat, exp }
    req.user = decoded;

    // Step 5: Proceed to next middleware or route handler
    next();
  } catch (error) {
    // Step 6: Token verification failed — expired, invalid signature, or malformed
    // Return generic error message to prevent information leakage about failure reason
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Module Exports
 * 
 * Exports the authMiddleware function directly (not as a named property)
 * for straightforward usage as Express middleware.
 * 
 * Import patterns:
 *   const authMiddleware = require('./middleware/auth');
 *   const authMiddleware = require('../middleware/auth');
 * 
 * Usage in routes/protected.js:
 *   router.use(authMiddleware);
 *   // All subsequent routes on this router require valid JWT
 */
module.exports = authMiddleware;
