/**
 * Authentication Business Logic Controller
 *
 * Implements the core authentication handler functions for the Express.js
 * application: user registration, login, and logout. Each handler is an
 * async Express middleware function with the signature (req, res) that
 * processes validated input and returns JSON responses with appropriate
 * HTTP status codes.
 *
 * These handlers are consumed by:
 * - routes/auth.js (public router):     register, login
 * - routes/protected.js (auth router):  logout
 *
 * Security Features:
 * - Password hashing via bcryptjs with configurable salt rounds
 * - JWT token signing with HMAC-SHA256 and configurable expiration
 * - HttpOnly, Secure, SameSite=strict cookie-based token storage
 * - Opaque error messages to prevent user enumeration attacks
 * - Credential exposure prevention: hashedPassword never returned in responses
 * - Input is pre-validated by express-validator chains before reaching handlers
 *
 * Middleware Pipeline:
 *   validateLogin/validateRegister → handleValidationErrors → handler (this file)
 *   Handlers receive already-validated data and focus solely on business logic.
 *
 * Error Response Conventions:
 * - 201 Created:             Successful registration
 * - 200 OK:                  Successful login or logout
 * - 401 Unauthorized:        Invalid credentials (same message for missing user AND wrong password)
 * - 409 Conflict:            Email already registered
 * - 500 Internal Server Error: Catch-all for unexpected failures (no detail leakage)
 *
 * @module controllers/authController
 * @requires bcryptjs — Pure-JavaScript bcrypt password hashing (zero native deps)
 * @requires jsonwebtoken — JWT creation and verification with HMAC-SHA256
 * @requires ../models/user — In-memory user data store with CRUD operations
 * @requires ../config/auth — Centralized authentication configuration (env-first)
 */

'use strict';

// External dependencies — password hashing and JWT token management
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Internal dependencies — user data model and auth configuration
const User = require('../models/user');
const authConfig = require('../config/auth');

/**
 * Register a New User
 *
 * Handles POST /auth/register requests by creating a new user account.
 * The handler validates email uniqueness, hashes the password securely,
 * persists the user record, issues a signed JWT token, and stores it
 * in an HttpOnly cookie for session management.
 *
 * Request Body (pre-validated by validateRegister chain):
 * {
 *   "username": "john_doe",   // 3+ characters, trimmed and escaped
 *   "email": "john@example.com", // Valid email, normalized to lowercase
 *   "password": "secureP@ss1" // 8+ characters
 * }
 *
 * Success Response (201 Created):
 * {
 *   "message": "User registered successfully",
 *   "user": { "id": "uuid", "username": "john_doe", "email": "john@example.com" }
 * }
 * Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
 *
 * Error Responses:
 * - 409 Conflict:  { "message": "Email already registered" }
 * - 500 Internal:  { "message": "Internal server error" }
 *
 * Security Notes:
 * - The returned user object NEVER includes hashedPassword (User.create returns sanitized copy)
 * - Password is hashed with bcrypt before storage — plain text is never persisted
 * - JWT payload contains only { id, email } — minimal claims for session identification
 *
 * Usage in routes/auth.js:
 *   const authController = require('../controllers/authController');
 *   router.post('/register', validateRegister, handleValidationErrors, authController.register);
 *
 * @async
 * @function register
 * @param {Object} req - Express request object with validated body: { username, email, password }
 * @param {Object} res - Express response object for sending JSON responses and setting cookies
 * @returns {void} Sends JSON response with appropriate HTTP status code
 */
const register = async (req, res) => {
  try {
    // Extract validated fields from request body (pre-validated by express-validator chain)
    const { username, email, password } = req.body;

    // Check if a user with this email already exists in the data store
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      // 409 Conflict — email uniqueness constraint violated
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash the plain-text password using bcrypt with configured salt rounds
    // bcrypt.hash is async and returns a Promise — salt rounds control computational cost
    const hashedPassword = await bcrypt.hash(password, authConfig.bcryptSaltRounds);

    // Persist the new user record in the data store
    // User.create() performs an atomic email uniqueness check and returns a sanitized
    // object: { id, username, email, createdAt }. Returns null if email already exists
    // (race condition protection — the check-and-insert is synchronous/atomic within create).
    const user = User.create({ username, email, hashedPassword });

    // Handle race condition: if another concurrent request registered the same email
    // between our initial findByEmail check (above) and this create call, create()
    // returns null. Respond with 409 Conflict, same as the explicit check above.
    if (!user) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Sign a JWT token with minimal claims (id and email) for session identification
    // Token is signed with HS256 algorithm (jsonwebtoken default) using the configured secret
    const token = jwt.sign(
      { id: user.id, email: user.email },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiration }
    );

    // Store the JWT in an HttpOnly cookie for secure, XSS-resistant session management
    // Cookie options enforce: httpOnly, secure (in production), sameSite=strict, maxAge
    res.cookie('token', token, authConfig.cookieOptions);

    // Return 201 Created with the sanitized user object (no hashedPassword)
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    // Catch-all error handler — return generic message to prevent information disclosure
    // The actual error is NOT exposed to the client to avoid revealing internal details
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Authenticate an Existing User (Login)
 *
 * Handles POST /auth/login requests by verifying user credentials against
 * stored records. On successful authentication, issues a signed JWT token
 * and stores it in an HttpOnly cookie.
 *
 * Request Body (pre-validated by validateLogin chain):
 * {
 *   "email": "john@example.com", // Valid email, normalized
 *   "password": "secureP@ss1"    // 8+ characters
 * }
 *
 * Success Response (200 OK):
 * {
 *   "message": "Login successful",
 *   "user": { "id": "uuid", "username": "john_doe", "email": "john@example.com" }
 * }
 * Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
 *
 * Error Responses:
 * - 401 Unauthorized: { "message": "Invalid credentials" }  (user not found OR wrong password)
 * - 500 Internal:     { "message": "Internal server error" }
 *
 * CRITICAL SECURITY — Error Message Opacity:
 * Both "user not found" and "wrong password" scenarios return the EXACT same
 * 401 response with "Invalid credentials" message. This prevents email enumeration
 * attacks where an attacker could determine which emails are registered by observing
 * different error messages for existing vs non-existing accounts.
 *
 * Usage in routes/auth.js:
 *   const authController = require('../controllers/authController');
 *   router.post('/login', validateLogin, handleValidationErrors, authController.login);
 *
 * @async
 * @function login
 * @param {Object} req - Express request object with validated body: { email, password }
 * @param {Object} res - Express response object for sending JSON responses and setting cookies
 * @returns {void} Sends JSON response with appropriate HTTP status code
 */
const login = async (req, res) => {
  try {
    // Extract validated fields from request body
    const { email, password } = req.body;

    // Look up user by email — returns FULL object including hashedPassword, or null
    const user = User.findByEmail(email);
    if (!user) {
      // User not found — return generic "Invalid credentials" to prevent email enumeration
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided plain-text password against the stored bcrypt hash
    // bcrypt.compare is async and handles salt extraction from the hash automatically
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      // Password mismatch — return the SAME generic message as "user not found" case
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Authentication successful — sign a new JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiration }
    );

    // Store the JWT in an HttpOnly cookie
    res.cookie('token', token, authConfig.cookieOptions);

    // Return 200 OK with explicitly constructed sanitized user object
    // CRITICAL: Must NOT include hashedPassword or createdAt in the response
    // User.findByEmail() returns the full record, so we construct a safe subset
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    // Catch-all — generic error message prevents information disclosure
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Log Out the Current User
 *
 * Handles POST /auth/logout requests by clearing the authentication cookie.
 * This endpoint is protected by the JWT auth middleware (middleware/auth.js),
 * which verifies the token and attaches the decoded payload to req.user
 * before this handler executes.
 *
 * Since authentication is stateless (JWT-based), logout simply clears the
 * cookie containing the token. The token itself remains valid until its
 * expiration, but without the cookie the client cannot send it automatically.
 *
 * Prerequisites:
 * - Request must pass through authMiddleware (middleware/auth.js) first
 * - req.user is available with { id, email, iat, exp } from the decoded JWT
 *
 * Success Response (200 OK):
 * {
 *   "message": "Logged out successfully"
 * }
 * Set-Cookie: token=; Expires=Thu, 01 Jan 1970 ...  (cookie cleared)
 *
 * Error Responses:
 * - 500 Internal: { "message": "Internal server error" }
 * - 401 Unauthorized: Handled by authMiddleware BEFORE reaching this handler
 *
 * Usage in routes/protected.js:
 *   const authController = require('../controllers/authController');
 *   const authMiddleware = require('../middleware/auth');
 *   router.use(authMiddleware);
 *   router.post('/logout', authController.logout);
 *
 * @async
 * @function logout
 * @param {Object} req - Express request object with req.user set by auth middleware
 * @param {Object} res - Express response object for clearing cookies and sending JSON
 * @returns {void} Sends JSON response with 200 status code
 */
const logout = async (req, res) => {
  try {
    // Clear the authentication cookie by setting its expiration to a past date
    // Destructure to exclude maxAge from cookieOptions, as clearCookie sets its own expiry
    // The remaining options (httpOnly, secure, sameSite) must match the original cookie settings
    const { maxAge, ...clearOptions } = authConfig.cookieOptions;
    res.clearCookie('token', clearOptions);

    // Return 200 OK confirming successful logout
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    // Catch-all — consistent error handling pattern across all handlers
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Module Exports
 *
 * Exports three async Express handler functions for authentication:
 * 1. register — Create new user account (POST /auth/register, public)
 * 2. login    — Authenticate existing user (POST /auth/login, public)
 * 3. logout   — Invalidate user session (POST /auth/logout, authenticated)
 *
 * Integration Example:
 *   const authController = require('../controllers/authController');
 *
 *   // Public routes (routes/auth.js):
 *   router.post('/register', validateRegister, handleValidationErrors, authController.register);
 *   router.post('/login', validateLogin, handleValidationErrors, authController.login);
 *
 *   // Protected routes (routes/protected.js):
 *   router.use(authMiddleware);
 *   router.post('/logout', authController.logout);
 */
module.exports = {
  register,
  login,
  logout
};
