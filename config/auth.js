/**
 * Authentication Configuration Module
 * 
 * Centralizes all authentication-related configuration for the Express.js application.
 * Exports four configuration values used for JWT-based stateless authentication:
 * - jwtSecret: Secret key for signing and verifying JSON Web Tokens
 * - jwtExpiration: Token lifetime duration string
 * - bcryptSaltRounds: Cost factor for bcrypt password hashing algorithm
 * - cookieOptions: Configuration object for secure HTTP cookie storage of JWT tokens
 * 
 * This module is imported by controllers/authController.js and middleware/auth.js
 * to ensure consistent authentication configuration across the application.
 * 
 * Environment Variables:
 * - JWT_SECRET: Secret key for JWT signing (REQUIRED in production)
 * - JWT_EXPIRATION: Token expiration duration (default: '1h')
 * - BCRYPT_SALT_ROUNDS: Password hashing cost factor (default: 10)
 * - NODE_ENV: Application environment ('production' enables secure cookies)
 * 
 * @module config/auth
 * @see {@link https://www.npmjs.com/package/jsonwebtoken|jsonwebtoken}
 * @see {@link https://www.npmjs.com/package/bcryptjs|bcryptjs}
 */

// Emit a runtime warning if JWT_SECRET is not configured via environment variable.
// Using a default secret in production is a critical security vulnerability.
if (!process.env.JWT_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET is not set. Using default secret. Set JWT_SECRET environment variable in production.'
  );
}

/**
 * JWT Secret Key
 * 
 * The cryptographic secret used to sign and verify JSON Web Tokens.
 * In production, this MUST be set via the JWT_SECRET environment variable
 * to a strong, unique, random string of at least 32 characters.
 * 
 * Security implications:
 * - If compromised, an attacker can forge valid authentication tokens
 * - Must be kept confidential and never committed to version control
 * - Should be rotated periodically as part of security best practices
 * - The default value is provided ONLY for local development convenience
 * 
 * @type {string}
 */
const jwtSecret = process.env.JWT_SECRET || 'default-dev-jwt-secret-change-in-production';

/**
 * JWT Token Expiration Duration
 * 
 * Specifies how long a signed JWT token remains valid before expiring.
 * Uses the string format accepted by the jsonwebtoken library's `expiresIn` option.
 * 
 * Accepted format examples:
 * - '1h'  — 1 hour (default)
 * - '2h'  — 2 hours
 * - '1d'  — 1 day
 * - '7d'  — 7 days
 * - '30m' — 30 minutes
 * - 3600  — 3600 seconds (numeric values are treated as seconds)
 * 
 * Shorter durations improve security by limiting the window of token misuse,
 * while longer durations improve user experience by reducing re-authentication.
 * 
 * @type {string}
 */
const jwtExpiration = process.env.JWT_EXPIRATION || '1h';

/**
 * Bcrypt Salt Rounds (Cost Factor)
 * 
 * Determines the computational cost of the bcrypt password hashing algorithm.
 * The number of rounds is calculated as 2^saltRounds iterations, so increasing
 * this value exponentially increases the time required to hash a password.
 * 
 * Recommended values:
 * - 10 (default): ~10 hashes/sec — good balance of security and performance
 * - 12: ~3 hashes/sec — higher security for sensitive applications
 * - 14: ~1 hash/sec — very high security, noticeable latency on login
 * - 8:  ~40 hashes/sec — lower security, suitable only for development/testing
 * 
 * Higher values provide stronger protection against brute-force attacks on
 * stolen password hashes, but increase server CPU load during authentication.
 * 
 * @type {number}
 */
const bcryptSaltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

/**
 * Secure Cookie Options for JWT Token Storage
 * 
 * Configuration object passed to Express `res.cookie()` when setting the
 * authentication token cookie. These options implement defense-in-depth
 * cookie security following OWASP recommendations.
 * 
 * Security properties:
 * - httpOnly: Prevents client-side JavaScript from accessing the cookie (XSS protection)
 * - secure: Restricts cookie transmission to HTTPS connections only (in production)
 * - sameSite: Controls cross-site cookie sending behavior (CSRF protection)
 * - maxAge: Automatic cookie expiration in milliseconds
 * 
 * The cookie is configured for maximum security while maintaining compatibility
 * with the application's authentication flow:
 * - HttpOnly prevents token theft via XSS attacks
 * - Secure flag ensures tokens are never sent over unencrypted HTTP in production
 * - SameSite 'strict' prevents the cookie from being sent in cross-site requests
 * - maxAge aligns with JWT expiration to prevent stale cookie retention
 * 
 * @type {Object}
 * @property {boolean} httpOnly - If true, cookie is inaccessible to client-side JavaScript (always true)
 * @property {boolean} secure - If true, cookie is only sent over HTTPS (true in production)
 * @property {string} sameSite - Cross-site cookie policy ('strict' prevents CSRF)
 * @property {number} maxAge - Cookie lifetime in milliseconds (default: 3600000ms = 1 hour)
 */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000
};

/**
 * Module Exports
 * 
 * All four configuration values are exported for consumption by the
 * authentication middleware and controller modules. Import pattern:
 * 
 * const { jwtSecret, jwtExpiration, bcryptSaltRounds, cookieOptions } = require('../config/auth');
 * 
 * Usage examples:
 * - controllers/authController.js: jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration })
 * - controllers/authController.js: bcrypt.hash(password, bcryptSaltRounds)
 * - controllers/authController.js: res.cookie('token', token, cookieOptions)
 * - middleware/auth.js: jwt.verify(token, jwtSecret)
 */
module.exports = {
  jwtSecret,
  jwtExpiration,
  bcryptSaltRounds,
  cookieOptions
};
