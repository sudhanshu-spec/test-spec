/**
 * API Transport Module
 *
 * The client's single network seam: the only `fetch` call site under `client/src`, `ApiError` as
 * the only error surface a failure is reported through, and the one hook by which the session
 * provider supplies the token getter and the unauthorized handler. URLs are built relatively, as
 * `API_BASE + path`, because Vite proxies the literal `/api` prefix to Express on the dev server
 * and on `vite preview`; an absolute origin would bypass the proxy and make every call a CORS
 * failure. Importing this module requests nothing, and nothing here reads storage, the router or
 * the DOM.
 *
 * @module client/src/api/client
 */

import type { ErrorEnvelope } from './types';

/** Path prefix of the JSON API, which Vite proxies verbatim to Express. */
const API_BASE = '/api';

/** Copy for a failure that never reached the API: no response at all, or a gateway answering in its place. */
const UNREACHABLE_MESSAGE = 'Unable to reach the server.';
/** Copy for a response that is not the API's error envelope: a fault on the server side of the seam. */
const SERVER_FAILURE_MESSAGE = 'Something went wrong on the server. Try again in a moment.';
/** The statuses a gateway answers with when the API it proxies could not be reached. */
const GATEWAY_STATUSES: readonly number[] = [502, 503, 504];

/**
 * The API's complete error vocabulary, in src/errors.js order. A code outside this list becomes
 * `INTERNAL_ERROR` rather than passing through, so the client can never invent a fourteenth code.
 */
const API_ERROR_CODES = [
  'VALIDATION_ERROR', 'INVALID_CREDENTIALS', 'TOKEN_REQUIRED', 'TOKEN_INVALID',
  'TOKEN_EXPIRED', 'EMAIL_ALREADY_REGISTERED', 'CATEGORY_NOT_FOUND',
  'MENU_ITEM_NOT_FOUND', 'MENU_ITEM_UNAVAILABLE', 'ORDER_NOT_FOUND',
  'RESERVATION_CONFLICT', 'ROUTE_NOT_FOUND', 'INTERNAL_ERROR',
] as const;

/** One of the thirteen codes the API answers a failure with. */
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** One offending field of a validation failure, as the API reports it. */
export interface ApiFieldDetail {
  field: string;
  issue: string;
}

/**
 * The client's only error surface: every failed request, whether the API answered it or the network
 * dropped it, is thrown as an `ApiError`. `status` is the HTTP status, or 0 when no response was
 * received; `code` is always one of the thirteen; `details` is empty unless the server sent it.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: readonly ApiFieldDetail[];

  /** @param message - Safe to render; it never carries a password, a token or a hash. */
  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    details: readonly ApiFieldDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    // A down-levelled target would lose the prototype, making instanceof fail.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** What the session provider supplies to this module. */
export interface ApiClientConfig {
  /** Returns the session token to send as a bearer credential, or null. */
  getToken(): string | null;
  /**
   * Called when the API answers 401 to a call that carries the session credential, before the
   * `ApiError` is thrown: the TOKEN_REQUIRED, TOKEN_INVALID and TOKEN_EXPIRED family, which is how
   * the API refuses a session. A call that carries none — the public calls, the sign-in among them
   * — has no session of this client's to lose, so its 401 is only a failure left to the caller.
   */
  onUnauthorized(): void;
}

/** Registered hooks, or null while none is; importing this module requests nothing. */
let clientConfig: ApiClientConfig | null = null;

/**
 * Registers the session provider's hooks, or clears them when passed null, the state a test starts
 * from. No request is made and no token is read at registration time.
 *
 * @param config - The hooks to register, or null to clear them.
 */
export function configureApiClient(config: ApiClientConfig | null): void {
  clientConfig = config;
}

/**
 * How a request is described to {@link apiFetch}: a method defaulting to GET, an optional payload
 * serialised as JSON, query parameters whose undefined values are left out, and the opt-out a
 * public call uses to keep the session credential off the request.
 */
export interface ApiRequestInit {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Whether the session credential travels with this request; see {@link apiFetch}. */
  credential?: boolean;
}

/** @returns The value as a keyed record, or null when it is not an object. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/** @returns An envelope's details as field/issue pairs, dropping entries that are not one. */
function toFieldDetails(details: unknown): ApiFieldDetail[] {
  const entries = Array.isArray(details) ? details : [];
  return entries.flatMap((entry) => {
    const { field, issue } = asRecord(entry) ?? {};
    return typeof field === 'string' && typeof issue === 'string' ? [{ field, issue }] : [];
  });
}

/** @returns The payload as the API's error envelope, or null when it is not one. */
function toErrorEnvelope(payload: unknown): ErrorEnvelope | null {
  const envelope = asRecord(asRecord(payload)?.error);

  if (envelope === null || typeof envelope.code !== 'string' || typeof envelope.message !== 'string') {
    return null;
  }

  return { error: { code: envelope.code, message: envelope.message, details: toFieldDetails(envelope.details) } };
}

/**
 * @returns The error to throw for a failed response: in the API's own words when the response carried
 *   its envelope, as unreachable when a gateway answered for an API that could not be reached, and as
 *   a server fault when something other than the API answered.
 */
function toApiError(payload: unknown, status: number): ApiError {
  const envelope = toErrorEnvelope(payload);

  if (envelope === null) {
    const message = GATEWAY_STATUSES.includes(status) ? UNREACHABLE_MESSAGE : SERVER_FAILURE_MESSAGE;
    return new ApiError(message, status, 'INTERNAL_ERROR');
  }

  const { code, message, details } = envelope.error;
  const known = (API_ERROR_CODES as readonly string[]).includes(code);
  return new ApiError(message || SERVER_FAILURE_MESSAGE, status, known ? (code as ApiErrorCode) : 'INTERNAL_ERROR', details);
}

/**
 * Sends one request to the JSON API and returns its parsed body, or undefined for the 204 that
 * `POST /api/auth/logout` answers with.
 *
 * The session credential travels unless the caller passes `credential: false`. The seven protected
 * calls — GET /auth/session, POST /auth/logout, POST and GET /orders, GET /orders/:id, and POST
 * and GET /reservations — keep the default, because the API answers them only to a caller it can
 * identify from that header; the five public calls — POST /auth/register, POST /auth/login, GET
 * /categories, GET /menu-items and GET /menu-items/:id — opt out. The default is to attach, so a
 * forgotten opt-out can at worst re-add a harmless same-origin header the API ignores, while a
 * protected call is never left without its credential.
 *
 * A 401 on a call that carries the credential invokes `onUnauthorized` before the error is thrown,
 * which is how a refused session is cleared. A call that carries none has nothing of the session's
 * to clear, and the API answers one of those with a 401 as well: INVALID_CREDENTIALS refuses the
 * credentials a sign-in offered to be checked, not a session this client holds, so it reaches the
 * view as an `ApiError` alone and the visitor keeps the address they submitted from, the notice
 * explaining why they are on it, and the way back to the screen the guard intercepted.
 *
 * @param path - Path below `/api`, beginning with `/` (for example `/categories`).
 * @param init - Method, body, query parameters and the credential opt-out; GET, credential
 *   attached, with no body by default.
 * @returns The parsed body, untouched, typed as the caller's declared contract.
 * @throws {ApiError} On any non-2xx response: in the API's own words when the response carried its
 *   error envelope, as unreachable when the request never arrived or a gateway answered for an API it
 *   could not reach, and as a server fault when anything other than the API answered.
 */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }

  const search = params.toString();
  const token = clientConfig?.getToken() ?? null;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const request: RequestInit = { method: init.method ?? 'GET', headers };

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    request.body = JSON.stringify(init.body);
  }

  if (init.credential !== false && token !== null && token !== '') {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(search === '' ? `${API_BASE}${path}` : `${API_BASE}${path}?${search}`, request);
  } catch {
    throw new ApiError(UNREACHABLE_MESSAGE, 0, 'INTERNAL_ERROR');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    // Only a call that carries the session credential can have it refused.
    if (response.status === 401 && init.credential !== false) {
      clientConfig?.onUnauthorized();
    }

    throw toApiError(payload, response.status);
  }

  return payload as T;
}
