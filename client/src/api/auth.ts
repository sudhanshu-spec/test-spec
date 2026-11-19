/**
 * Authentication API Module
 *
 * The client's four authentication calls, each one a thin typed wrapper over the single transport
 * seam in `client/src/api/client.ts`. Nothing here builds a URL, reads or stores the token, or
 * reshapes a failure: `apiFetch` prefixes the relative `/api` base, attaches the Bearer credential
 * the session provider registered, and throws `ApiError` for every non-2xx answer, which this module
 * lets through unchanged so a calling view sees the server's status and code exactly as sent. The
 * token is opaque — minted by the server and handed straight to the provider, never decoded, split
 * or validated here — and a password appears only in the body of the two calls that need one.
 *
 * Endpoints:
 * - POST '/auth/register' returns 201 { user: {id,name,email,created_at}, token } as JSON
 * - POST '/auth/login' returns 200 { user: {id,name,email,created_at}, token } as JSON
 * - GET '/auth/session' returns 200 { user } as JSON (Bearer token required)
 * - POST '/auth/logout' returns 204 with no body (Bearer token required)
 *
 * @module client/src/api/auth
 */

import { apiFetch } from './client';
import type { AuthResponse, LoginInput, RegisterInput, SessionResponse } from './types';

/**
 * Creates an account and opens a session for it.
 *
 * `POST /auth/register`.
 *
 * @param input - Name, address and password as the registration form collected them.
 * @returns The stored account and the opaque session token minted for it.
 * @throws {ApiError} `VALIDATION_ERROR` (400) with one `details` entry per failing field, or
 * `EMAIL_ALREADY_REGISTERED` (409) when the address is taken, compared case-insensitively.
 */
export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: input });
}

/**
 * Opens a session for an existing account.
 *
 * `POST /auth/login`.
 *
 * @param input - Address and password as the login form collected them.
 * @returns The account and a fresh opaque session token.
 * @throws {ApiError} `VALIDATION_ERROR` (400) when a field is missing, or `INVALID_CREDENTIALS`
 * (401) for an unknown address and a wrong password alike — the two are indistinguishable by
 * design, and this module adds no detail that would separate them.
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

/**
 * Reports the account the stored session token belongs to.
 *
 * `GET /auth/session`. The request carries no body; the credential travels in the Bearer header
 * that `apiFetch` attaches from the token the session provider registered, which is why this call
 * is authenticated without touching the token itself.
 *
 * @returns The account the presented token belongs to.
 * @throws {ApiError} `TOKEN_REQUIRED` (401) with no credential registered, `TOKEN_INVALID` (401)
 * for an unknown or revoked token, or `TOKEN_EXPIRED` (401) past its lifetime.
 */
export async function session(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/auth/session');
}

/**
 * Closes the session the stored token belongs to by revoking it server-side.
 *
 * `POST /auth/logout`, which answers 204 with no body; `apiFetch` reports that as `undefined`, so
 * this call resolves with nothing to return. Clearing the token and navigating away belong to the
 * session provider, not here. Revocation is one-way: a second call with the same revoked token is
 * answered `TOKEN_INVALID`, so the provider clears its state on success rather than retrying.
 *
 * @returns Nothing.
 * @throws {ApiError} `TOKEN_REQUIRED` (401) with no credential registered, `TOKEN_INVALID` (401)
 * for an unknown or already revoked token, or `TOKEN_EXPIRED` (401) past its lifetime.
 */
export async function logout(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
}
