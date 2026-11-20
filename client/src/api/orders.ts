/**
 * Order API Module
 *
 * The three authenticated order calls the client makes: placing an order from
 * the cart, listing the orders the caller already holds, and reading one of them
 * back. Each function wraps exactly one `apiFetch` call and returns the payload
 * with its envelope removed, so a view or the cart state receives an `Order` or
 * an `Order[]` and never unwraps `{ order }` or `{ orders }` itself.
 *
 * Money is the server's alone. A line this module sends carries a menu item id
 * and a quantity and nothing else, and every amount an `Order` holds —
 * `total_cents`, `unit_price_cents`, `line_total_cents` — is whatever the API
 * returned, computed from stored menu data inside the order transaction. Each
 * line is therefore projected onto those two fields explicitly rather than
 * forwarded as the caller's own object, so a stray amount cannot travel in the
 * body even when a caller passes one; nothing here does arithmetic on an amount
 * and nothing here formats one (that is `client/src/api/format.ts`).
 *
 * A failure reaches the caller as `ApiError` from `client/src/api/client.ts`,
 * thrown untouched so `code` and `details` arrive exactly as the API wrote them.
 * The API answers an order held by another caller exactly as it answers an id
 * that names no order, with `ORDER_NOT_FOUND`, so nothing here inspects
 * ownership either.
 *
 * Endpoints (all three authenticated; `apiFetch` attaches the caller's Bearer
 * token and the API answers the TOKEN_REQUIRED / TOKEN_INVALID / TOKEN_EXPIRED
 * family when it is absent, unknown, revoked or expired):
 * - POST '/orders' sends {items: [{menu_item_id, quantity}], notes?} as JSON and
 *   resolves the created order
 * - GET '/orders' resolves the caller's own orders, newest first
 * - GET '/orders/:id' resolves one of the caller's own orders
 *
 * @module client/src/api/orders
 */

import { apiFetch } from './client';
import type { CreateOrderInput, Order, OrderResponse, OrdersResponse } from './types';

/**
 * Places an order for the signed-in caller.
 *
 * Each requested line is rebuilt field by field as `{ menu_item_id, quantity }`,
 * and the optional note travels only when the caller supplied one — an absent
 * note is omitted from the body rather than sent as `undefined`. The resulting
 * order carries the amounts the server computed from stored menu prices inside
 * one transaction, including its `total_cents`; no price is sent and none is
 * calculated here.
 *
 * @param input - The lines to order, each naming a menu item and a quantity, and
 *   an optional note. Any further property a caller adds to a line is not sent.
 * @returns The created order, as the API stored it: its id, status, note, the
 *   server's `total_cents` and every line with its own server-computed amounts.
 * @throws {ApiError} 400 VALIDATION_ERROR when `items` is empty or a line fails
 *   validation (a `menu_item_id` that is not a UUID, a `quantity` that is not an
 *   integer between 1 and 20), with `details` naming each offending field; 404
 *   MENU_ITEM_NOT_FOUND when a line names an item that does not exist; 409
 *   MENU_ITEM_UNAVAILABLE when a line names an item that is not available; and
 *   the TOKEN_* family when the session is missing, invalid or expired.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const body = {
    items: input.items.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity })),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  };

  const { order } = await apiFetch<OrderResponse>('/orders', { method: 'POST', body });
  return order;
}

/**
 * Lists the orders the signed-in caller holds.
 *
 * The API returns only the caller's own orders and orders them newest first;
 * that order is kept as received, so the history a view renders is the server's
 * ordering and not a second opinion formed here.
 *
 * @returns The caller's orders, newest first, or an empty array when none exist.
 * @throws {ApiError} The TOKEN_* family when the session is missing, invalid or
 *   expired. A caller who holds no orders is answered with an empty array, not
 *   an error.
 */
export async function listOrders(): Promise<Order[]> {
  const { orders } = await apiFetch<OrdersResponse>('/orders');
  return orders;
}

/**
 * Reads one of the signed-in caller's orders.
 *
 * An order that belongs to another caller is indistinguishable from an id that
 * names no order: the API's read is scoped to the caller and answers
 * `ORDER_NOT_FOUND` for both, so the error is surfaced as received.
 *
 * @param id - The order id to read, escaped into the path.
 * @returns The order as the API stored it, with every line and server-computed
 *   amount.
 * @throws {ApiError} 400 VALIDATION_ERROR when `id` is not a UUID, with `details`
 *   naming the `id` field; 404 ORDER_NOT_FOUND when no order the caller holds has
 *   that id, including an order held by someone else; and the TOKEN_* family when
 *   the session is missing, invalid or expired.
 */
export async function getOrder(id: string): Promise<Order> {
  const { order } = await apiFetch<OrderResponse>(`/orders/${encodeURIComponent(id)}`);
  return order;
}
