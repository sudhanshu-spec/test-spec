/**
 * Protected Authentication Router Module
 *
 * Defines Express Router for authenticated (protected) endpoints that require
 * a valid JWT token. Authentication middleware is applied at the router level
 * via router.use(authMiddleware), ensuring ALL routes registered on this router
 * are guarded against unauthenticated access.
 *
 * This module is the counterpart to routes/auth.js (public router):
 * - routes/auth.js: Public routes (login, register) — no authentication required
 * - routes/protected.js: THIS FILE — all routes require a valid JWT token
 *
 * Authentication Flow:
 * 1. Client sends request with JWT stored in an HttpOnly cookie (token)
 * 2. cookie-parser middleware (registered in server.js) parses the cookie
 * 3. authMiddleware (applied at router level) extracts and verifies the JWT
 * 4. On success: decoded payload { id, email, iat, exp } is attached to req.user
 * 5. Route handler executes with authenticated user context available
 * 6. On failure: 401 Unauthorized JSON response is returned before any handler runs
 *
 * Endpoints:
 * - POST /logout — Clears the JWT authentication cookie, ending the session
 *
 * Full Middleware Pipeline (from server.js through to route handler):
 * helmet → cors → express.json → cookie-parser → rateLimit → authMiddleware → handler
 *
 * Mounting:
 * This router is mounted at /auth in server.js, making the full endpoint path:
 *   POST /auth/logout
 *
 * @module routes/protected
 * @requires express — Express.js Router factory for modular route definitions
 * @requires ../controllers/authController — Authentication business logic (logout handler)
 * @requires ../middleware/auth — JWT verification middleware for route protection
 */

'use strict';

// External dependency — Express Router factory for creating modular route handlers
const { Router } = require('express');

// Internal dependencies — authentication controller and JWT verification middleware
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

/**
 * Protected Authentication Router
 *
 * Creates an Express Router instance for authenticated endpoints. Authentication
 * middleware (authMiddleware) is applied at the router level via router.use(),
 * ensuring ALL routes registered on this router are guarded against unauthenticated
 * access before any route handler is reached.
 *
 * Authentication Guard Behavior (applied at router level via router.use()):
 * - authMiddleware extracts the JWT from req.cookies.token (set by cookie-parser)
 * - jwt.verify() validates the HMAC-SHA256 signature and checks expiration claims
 * - On valid token: req.user is populated with decoded payload { id, email, iat, exp }
 * - On missing token: 401 response with { message: 'Authentication required' }
 * - On invalid/expired token: 401 response with { message: 'Invalid or expired token' }
 * - Unauthenticated requests NEVER reach any route handler on this router
 *
 * This router is mounted at /auth in server.js:
 *   const protectedRoutes = require('./routes/protected');
 *   app.use('/auth', protectedRoutes);
 *
 * @type {Router}
 */
const router = Router();

// Apply authentication middleware at the router level — ALL routes on this router
// require a valid JWT token. This ensures every endpoint registered on this router
// is guarded by JWT verification before any route handler executes.
// AAP Section 0.5.1: "Applies authMiddleware at router level via router.use()"
router.use(authMiddleware);

/**
 * POST /logout — End Authenticated User Session
 *
 * Clears the JWT authentication cookie, effectively logging the user out.
 * Since authentication is stateless (JWT-based), logout simply removes the
 * cookie containing the token. The token itself remains valid until its
 * expiration, but without the cookie the client cannot send it automatically.
 *
 * Full endpoint path: POST /auth/logout (when mounted at /auth in server.js)
 *
 * Authentication Requirement:
 * - Valid JWT cookie is REQUIRED (enforced by router-level authMiddleware)
 * - req.user is available with { id, email, iat, exp } from the decoded JWT
 * - Without valid JWT, a 401 Unauthorized response is returned by authMiddleware
 *   BEFORE the logout handler is ever reached
 *
 * Middleware Pipeline:
 * router.use(authMiddleware) → authController.logout
 *
 * Authentication middleware is applied at the router level via router.use(),
 * ensuring all routes on this protected router require a valid JWT token.
 * This approach enforces authentication uniformly for all endpoints registered
 * on this router, both current and future.
 *
 * No validation middleware is applied to this route because:
 * - There is no request body to validate (logout has no input payload)
 * - Authentication is the only prerequisite, handled by router-level middleware
 *
 * Success Response (200 OK):
 * {
 *   "message": "Logged out successfully"
 * }
 * Set-Cookie: token=; Expires=Thu, 01 Jan 1970 ...  (cookie cleared)
 *
 * Error Responses:
 * - 401 Unauthorized: No valid JWT (handled by authMiddleware before this handler)
 * - 500 Internal Server Error: Unexpected failure in logout handler
 *
 * Security Notes:
 * - Cookie clearance uses matching options (httpOnly, secure, sameSite) to ensure
 *   the browser correctly removes the original cookie
 * - After logout, subsequent requests to protected routes will fail authentication
 *   until the user logs in again and receives a new JWT cookie
 *
 * @name POST /logout
 * @memberof module:routes/protected
 */
router.post('/logout', authController.logout);

/**
 * Module Exports
 *
 * Exports the configured Express Router instance with authentication guard
 * and the POST /logout route. The router is exported directly (not wrapped
 * in an object) for straightforward mounting in server.js.
 *
 * IMPORTANT: Mounting this router at any path means ALL sub-routes under
 * that path will require a valid JWT token. The authMiddleware is baked
 * into the router and cannot be bypassed by consumers.
 *
 * Integration Example in server.js:
 *   const protectedRoutes = require('./routes/protected');
 *   app.use('/auth', protectedRoutes);
 *   // POST /auth/logout is now available and requires JWT authentication
 *
 * Test Integration:
 *   const request = require('supertest');
 *   const app = require('../server'); // or build test app
 *   // Unauthenticated request → 401
 *   await request(app).post('/auth/logout').expect(401);
 *   // Authenticated request → 200
 *   await request(app).post('/auth/logout').set('Cookie', 'token=valid_jwt').expect(200);
 */
module.exports = router;
