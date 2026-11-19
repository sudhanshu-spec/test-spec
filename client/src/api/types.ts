/**
 * API Contract Types Module
 *
 * This module is the client's entire view of the Express JSON API: the request
 * bodies `client/src/api` sends and the response payloads it receives for all
 * twelve endpoints, plus the two reservation `issue` literals the API fixes
 * verbatim. Views, state and the domain api modules import these names and
 * nothing else, so a shape declared here is the only shape a screen can render.
 *
 * Every shape is hand-mirrored from src/routes/api/auth.routes.js,
 * menu.routes.js, orders.routes.js, reservations.routes.js and src/errors.js,
 * and is deliberately not imported from them: the server package is CommonJS
 * and this one is an ES module, so a shared module would have to be one or the
 * other and could serve neither side without a build step. Nothing outside
 * `client/src` is imported here, and the server imports nothing from here.
 *
 * Money is an integer count of cents throughout (`price_cents`,
 * `unit_price_cents`, `line_total_cents`, `total_cents`); turning one into a
 * currency string happens once, in `client/src/api/format.ts`. Timestamps are
 * ISO-8601 strings exactly as the server sends them, since nothing in this
 * application parses them into `Date` objects.
 *
 * @module client/src/api/types
 */

// ---------------------------------------------------------------------------
// Authentication — POST /api/auth/register, POST /api/auth/login,
// GET /api/auth/session, POST /api/auth/logout
// ---------------------------------------------------------------------------

/**
 * The account projection every authenticated payload carries: what the server
 * returns for a user, and no more. Passwords are hashed server-side and secret
 * columns are never emitted, so none is declared here.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

/**
 * Payload of POST /api/auth/register (201) and POST /api/auth/login (200): the
 * account and the opaque session token minted for it.
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Payload of GET /api/auth/session (200): the account the presented Bearer token
 * belongs to.
 */
export interface SessionResponse {
  user: User;
}

/** Request body of POST /api/auth/register. */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Request body of POST /api/auth/login. An unknown address and a wrong password
 * are answered identically by the API, so nothing here can tell them apart.
 */
export interface LoginInput {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Menu — GET /api/categories, GET /api/menu-items, GET /api/menu-items/:id
// ---------------------------------------------------------------------------

/**
 * One entry of the GET /api/categories (200) payload, ordered by
 * `display_order`.
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

/** The category nested inside a menu item payload. */
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * One item of the GET /api/menu-items (200) payload, and the value under `item`
 * in the GET /api/menu-items/:id (200) payload. `image_url` is nullable because
 * the column is; `is_available` is the JSON boolean the server derives from the
 * stored flag.
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  category: CategorySummary;
}

/** Payload of GET /api/categories (200); an unseeded menu yields an empty array. */
export interface CategoriesResponse {
  categories: Category[];
}

/** Payload of GET /api/menu-items (200), filtered by `?category=<slug>` or not. */
export interface ItemsResponse {
  items: MenuItem[];
}

/** Payload of GET /api/menu-items/:id (200). */
export interface ItemResponse {
  item: MenuItem;
}

// ---------------------------------------------------------------------------
// Orders — POST /api/orders, GET /api/orders, GET /api/orders/:id
// ---------------------------------------------------------------------------

/**
 * One line of the POST /api/orders request body: which item and how many. The
 * server prices every line from stored menu data inside the order transaction,
 * so no amount is accepted from the client and none may be sent.
 */
export interface OrderLineInput {
  menu_item_id: string;
  quantity: number;
}

/**
 * Request body of POST /api/orders. `notes` is optional: omitting it is legal
 * and the order is then stored without one.
 */
export interface CreateOrderInput {
  items: OrderLineInput[];
  notes?: string;
}

/** The four values `orders.status` may hold; the API fixes no others. */
export type OrderStatus = 'confirmed' | 'preparing' | 'completed' | 'cancelled';

/**
 * One stored line of an order, as the API reports it: the item's name, the
 * quantity and the three server-computed cent amounts.
 */
export interface OrderLine {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

/**
 * The value under `order` in the POST /api/orders (201) and GET
 * /api/orders/:id (200) payloads, and one entry of the GET /api/orders (200)
 * list. `notes` is null when none was sent; `total_cents` is the server's sum of
 * the lines.
 */
export interface Order {
  id: string;
  status: OrderStatus;
  total_cents: number;
  notes: string | null;
  created_at: string;
  lines: OrderLine[];
}

/** Payload of POST /api/orders (201) and GET /api/orders/:id (200). */
export interface OrderResponse {
  order: Order;
}

/** Payload of GET /api/orders (200), the caller's own orders, newest first. */
export interface OrdersResponse {
  orders: Order[];
}

// ---------------------------------------------------------------------------
// Reservations — POST /api/reservations, GET /api/reservations
// ---------------------------------------------------------------------------

/**
 * Request body of POST /api/reservations: `reservation_date` as `YYYY-MM-DD`,
 * `reservation_time` as `HH:MM`, the party size, and an optional note.
 */
export interface CreateReservationInput {
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  notes?: string;
}

/**
 * The value under `reservation` in the POST /api/reservations (201) payload and
 * one entry of the GET /api/reservations (200) list.
 *
 * `status` is a plain string rather than a union on purpose: the API contract
 * fixes a status vocabulary for orders only, so enumerating one here would
 * invent values the server never promised. `notes` is null when none was sent.
 */
export interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  notes: string | null;
  created_at: string;
}

/** Payload of POST /api/reservations (201). */
export interface ReservationResponse {
  reservation: Reservation;
}

/** Payload of GET /api/reservations (200), the caller's own bookings, by date then time. */
export interface ReservationsResponse {
  reservations: Reservation[];
}

// ---------------------------------------------------------------------------
// Errors — every failed request under /api
// ---------------------------------------------------------------------------

/**
 * The one envelope every API failure is answered with. `details` is present only
 * for validation failures, one entry per offending field.
 *
 * The detail shape is written inline rather than imported from
 * `client/src/api/client.ts`: that module imports this one, so sharing an alias
 * would close a cycle. The two shapes are structurally identical, so a detail
 * list built in `client.ts` assigns here without a cast.
 */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: { field: string; issue: string }[];
  };
}

/**
 * The two reservation `issue` literals the API fixes verbatim, matched against
 * `error.details[].issue` by `ReservationFormView` to show the failure of the
 * checkpoint that rejected the booking. The values are byte-identical to the
 * constants in src/errors.js.
 */
export const RESERVATION_ISSUES = {
  DATETIME_IN_PAST: 'reservation_datetime_in_past',
  OUTSIDE_SERVICE_HOURS: 'reservation_time_outside_service_hours',
} as const;
