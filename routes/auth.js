/**
 * Public Authentication Router Module
 *
 * Defines the Express Router for public (unauthenticated) authentication endpoints.
 * This router handles user registration and login without requiring a valid JWT token.
 * It is mounted at the `/auth` path in server.js, making the full endpoint paths:
 *   - POST /auth/login    — Authenticate an existing user with email and password
 *   - POST /auth/register — Create a new user account with username, email, and password
 *
 * These routes are intentionally PUBLIC — no authentication middleware is applied at
 * the router level. Users must be able to register and log in without an existing session.
 *
 * Middleware Pipeline Pattern (defense-in-depth):
 *   1. Validation chain (validateLogin / validateRegister) — validates and sanitizes input
 *   2. Error handler (handleValidationErrors) — returns 400 if validation fails
 *   3. Controller handler (authController.login / authController.register) — business logic
 *
 * This pattern ensures that malformed or malicious input is rejected before reaching
 * the authentication business logic layer, reducing the attack surface.
 *
 * Integration:
 *   const authRoutes = require('./routes/auth');
 *   app.use('/auth', authRoutes);
 *
 * @module routes/auth
 * @requires express — Express.js Router factory for creating modular route handlers
 * @requires ../controllers/authController — Authentication business logic handlers (login, register)
 * @requires ../middleware/validation — Input validation chains and centralized error handler
 */

'use strict';

// External dependency — Express Router factory function
const { Router } = require('express');

// Internal dependency — Authentication business logic controller
// Provides login and register async handler functions
const authController = require('../controllers/authController');

// Internal dependency — Input validation middleware
// validateLogin:            Validation chain array for email and password fields
// validateRegister:         Validation chain array for username, email, and password fields
// handleValidationErrors:   Centralized error handler returning 400 JSON for failed validations
const { validateLogin, validateRegister, handleValidationErrors } = require('../middleware/validation');

/**
 * Public Authentication Router Instance
 *
 * Creates a modular, mountable route handler for public authentication endpoints.
 * This router is mounted at `/auth` in server.js, so all route paths defined here
 * are relative to that mount point (e.g., '/login' becomes '/auth/login').
 *
 * No authentication middleware is applied at the router level — all routes are
 * accessible by unauthenticated users by design.
 *
 * @type {Router}
 */
const router = Router();

/**
 * POST /auth/login — Authenticate an Existing User
 *
 * Accepts user credentials (email and password), validates them through the
 * express-validator middleware chain, then delegates to the authentication
 * controller for credential verification and JWT token issuance.
 *
 * Request Body:
 * {
 *   "email": "user@example.com",   // Valid email format, normalized
 *   "password": "secureP@ss1"      // Minimum 8 characters
 * }
 *
 * Middleware Pipeline (executed in order):
 *   1. validateLogin          — Validates email format and password length (min 8)
 *   2. handleValidationErrors — Returns 400 with error array if validation fails
 *   3. authController.login   — Verifies credentials, signs JWT, sets cookie
 *
 * Success Response (200 OK):
 * {
 *   "message": "Login successful",
 *   "user": { "id": "uuid", "username": "john_doe", "email": "user@example.com" }
 * }
 * Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
 *
 * Error Responses:
 * - 400 Bad Request:    Validation failed (malformed email, short password)
 * - 401 Unauthorized:   Invalid credentials (generic message for both wrong email and wrong password)
 * - 500 Internal Error: Unexpected server failure
 *
 * Security Notes:
 * - Returns generic "Invalid credentials" for both non-existent email and wrong password
 *   to prevent user enumeration attacks
 * - Input is validated and sanitized before reaching the controller layer
 * - JWT token is stored in HttpOnly cookie to prevent XSS access
 */
router.post('/login', validateLogin, handleValidationErrors, authController.login);

/**
 * POST /auth/register — Create a New User Account
 *
 * Accepts new user data (username, email, password), validates and sanitizes
 * all fields through the express-validator middleware chain, then delegates to
 * the authentication controller for account creation, password hashing, and
 * JWT token issuance.
 *
 * Request Body:
 * {
 *   "username": "john_doe",        // Trimmed, min 3 characters, HTML-escaped
 *   "email": "user@example.com",   // Valid email format, normalized
 *   "password": "secureP@ss1"      // Minimum 8 characters
 * }
 *
 * Middleware Pipeline (executed in order):
 *   1. validateRegister          — Validates username, email format, password length
 *   2. handleValidationErrors    — Returns 400 with error array if validation fails
 *   3. authController.register   — Hashes password, creates user, signs JWT, sets cookie
 *
 * Success Response (201 Created):
 * {
 *   "message": "User registered successfully",
 *   "user": { "id": "uuid", "username": "john_doe", "email": "user@example.com", "createdAt": "..." }
 * }
 * Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
 *
 * Error Responses:
 * - 400 Bad Request:    Validation failed (short username, malformed email, short password)
 * - 409 Conflict:       Email already registered in the system
 * - 500 Internal Error: Unexpected server failure
 *
 * Security Notes:
 * - Password is hashed with bcrypt (configurable salt rounds) before storage
 * - Plain-text password is never persisted or returned in responses
 * - Username is trimmed and HTML-escaped to prevent XSS injection
 * - Email is normalized to prevent duplicate accounts with equivalent variations
 * - The hashedPassword field is never included in the API response
 */
router.post('/register', validateRegister, handleValidationErrors, authController.register);

/**
 * Module Export — Public Authentication Router
 *
 * Exports the configured Express Router instance containing the public
 * authentication endpoints (POST /login and POST /register).
 *
 * This router is designed to be mounted at the `/auth` path in server.js:
 *
 * Integration Example:
 *   const authRoutes = require('./routes/auth');
 *   app.use('/auth', authRoutes);
 *
 * After mounting, the full endpoint paths become:
 *   - POST /auth/login    — User authentication
 *   - POST /auth/register — New user registration
 *
 * @type {Router}
 */
module.exports = router;
