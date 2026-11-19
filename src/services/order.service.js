/**
 * Order Service Module
 *
 * The rules behind the three order endpoints, isolated from HTTP: what an order
 * request must be, which failure an unknown or unavailable line raises, and the
 * exact shape an order leaves in.
 *
 * Pricing and atomicity belong to order.repository.createWithLines, which re-reads
 * menu_items inside db.transaction(fn).immediate() and derives every unit price,
 * line total and order total from the stored price_cents (R-3); this file accepts
 * only menu_item_id and quantity per line, reads no price and does no arithmetic,
 * so a caller-supplied price cannot reach a total.
 *
 * Failures are AppErrors built from code names the errors table holds, with
 * `details` attached only to VALIDATION_ERROR, and no status, header or body is
 * written here (R-6). Another user's order is ORDER_NOT_FOUND, never 403, because
 * the repository's reads bind user_id (R-5).
 *
 * @module src/services/order.service
 */

const crypto = require('node:crypto');
const { AppError } = require('../errors');
const orderRepository = require('../repositories/order.repository');
const menuItemRepository = require('../repositories/menu-item.repository');

/** Smallest quantity an order line may carry. @type {number} */
const MIN_QUANTITY = 1;
/** Largest quantity an order line may carry. @type {number} */
const MAX_QUANTITY = 20;
/** Shape of the menu item id an order line must name. @type {RegExp} */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Collect every line-level failure in one pass, so a form can show them all: the
 * whole `items` value first, then each line's id and quantity in request order.
 * @param {*} requestedLines - Raw `items` value from the request body.
 * @returns {Array<{field: string, issue: string}>} One detail per offending field.
 */
function collectLineDetails(requestedLines) {
  if (!Array.isArray(requestedLines) || requestedLines.length === 0) {
    return [{ field: 'items', issue: 'must_be_a_non_empty_array' }];
  }

  const details = [];

  requestedLines.forEach((line, index) => {
    const { menu_item_id: menuItemId, quantity } = line ?? {};

    if (typeof menuItemId !== 'string' || !UUID_PATTERN.test(menuItemId)) {
      details.push({ field: `items[${index}].menu_item_id`, issue: 'invalid_uuid' });
    }

    if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      details.push({ field: `items[${index}].quantity`, issue: 'must_be_an_integer_between_1_and_20' });
    }
  });

  return details;
}

/**
 * Decide which line failure a request earns: existence first, then availability,
 * so a request naming both an unknown and an unavailable item is NOT_FOUND. These
 * rows choose the error only; the prices that reach a total are read again by the
 * transaction that writes them.
 * @param {Array<string>} ids - Distinct menu item ids the order names.
 * @param {Object} items - Item reader exposing findManyByIds(ids).
 * @returns {void}
 * @throws {AppError} MENU_ITEM_NOT_FOUND (404) or MENU_ITEM_UNAVAILABLE (409).
 */
function assertItemsOrderable(ids, items) {
  const rowsById = new Map(items.findManyByIds(ids).map((row) => [row.id, row]));
  const unknownId = ids.find((id) => !rowsById.has(id));

  if (unknownId !== undefined) {
    throw new AppError('MENU_ITEM_NOT_FOUND', `No menu item matches the id "${unknownId}".`);
  }

  const unavailable = ids.map((id) => rowsById.get(id)).find((row) => !row.is_available);

  if (unavailable !== undefined) {
    throw new AppError('MENU_ITEM_UNAVAILABLE', `The menu item "${unavailable.name}" is not currently available.`);
  }
}

/**
 * Project a stored order into the contract's shape, key by key, so no other column
 * reaches a response. Money passes through as the integer cents the repository
 * stored; it is never recomputed or formatted here.
 * @param {Object} row - Order as the repository assembled it.
 * @returns {Object} `{id, status, total_cents, notes, created_at, lines}`.
 */
function toPublicOrder(row) {
  return {
    id: row.id, status: row.status, total_cents: row.total_cents, notes: row.notes,
    created_at: row.created_at,
    lines: (row.lines || []).map((line) => ({
      id: line.id, menu_item_id: line.menu_item_id, name: line.name, quantity: line.quantity,
      unit_price_cents: line.unit_price_cents, line_total_cents: line.line_total_cents
    }))
  };
}

/**
 * Build an order service over the repositories it reads and writes through. Both
 * collaborators and the clock are injected, so a unit suite can stub the
 * repositories and fix the time without a database or a request.
 * @param {Object} dependencies - The service's collaborators.
 * @param {Object} dependencies.orders - Order store: createWithLines, listByUser, findByIdForUser.
 * @param {Object} dependencies.items - Item reader: findManyByIds.
 * @param {function(): Date} [dependencies.now] - Clock, the only source of time.
 * @returns {{createOrder: Function, listOrders: Function, getOrder: Function}} The service.
 */
function createOrderService({ orders, items, now = () => new Date() }) {
  /**
   * Place one order for the authenticated caller: validate every line, confirm the
   * items exist and are available, then let the repository write and price the
   * order in one transaction.
   * @param {Object} input - `{userId, items: [{menu_item_id, quantity}], notes}`.
   * @returns {Object} The stored order, projected by {@link toPublicOrder}.
   * @throws {AppError} VALIDATION_ERROR, MENU_ITEM_NOT_FOUND, MENU_ITEM_UNAVAILABLE.
   */
  function createOrder({ userId, items: requestedLines, notes } = {}) {
    const details = collectLineDetails(requestedLines);

    if (details.length > 0) {
      throw new AppError('VALIDATION_ERROR', 'The order request is not valid.', details);
    }

    // Only the accepted fields of each line travel, under the names
    // order.repository.createWithLines reads, so a caller-supplied price has no
    // path further in.
    const acceptedLines = requestedLines.map(({ menu_item_id: menuItemId, quantity }) => ({
      menuItemId,
      quantity
    }));

    assertItemsOrderable([...new Set(acceptedLines.map((line) => line.menuItemId))], items);

    const created = orders.createWithLines({
      id: crypto.randomUUID(),
      userId,
      status: 'confirmed',
      notes: notes === undefined || notes === null ? null : String(notes),
      createdAt: now().toISOString(),
      lines: acceptedLines
    });

    return toPublicOrder(created);
  }

  /**
   * List the caller's orders, newest first; no orders is an empty array.
   * @param {Object} input - `{userId}` derived from the authenticated request.
   * @returns {Array<Object>} The caller's orders, projected by {@link toPublicOrder}.
   */
  function listOrders({ userId } = {}) {
    return orders.listByUser(userId).map(toPublicOrder);
  }

  /**
   * Read one of the caller's orders. The repository's lookup is user-scoped, so a
   * missing order and another user's order are answered identically.
   * @param {Object} input - `{id, userId}` derived from the authenticated request.
   * @returns {Object} The order, projected by {@link toPublicOrder}.
   * @throws {AppError} ORDER_NOT_FOUND (404).
   */
  function getOrder({ id, userId } = {}) {
    const row = orders.findByIdForUser(id, userId);

    if (!row) {
      throw new AppError('ORDER_NOT_FOUND', `No order matches the id "${String(id)}".`);
    }

    return toPublicOrder(row);
  }

  return { createOrder, listOrders, getOrder };
}

/**
 * The order service the API router uses, wired to both repository modules. Neither
 * opens a connection here: the database opens on the first query.
 * @type {{createOrder: Function, listOrders: Function, getOrder: Function}}
 */
const orderService = createOrderService({
  orders: orderRepository,
  items: menuItemRepository,
  now: () => new Date()
});

module.exports = { createOrderService, orderService, toPublicOrder };
