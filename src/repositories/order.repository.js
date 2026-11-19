/**
 * @fileoverview Order Repository — the `orders` + `order_line_items` accessor, and
 * the module where atomicity, server-side pricing and the availability backstop
 * live: createWithLines writes an order and its lines in one immediate
 * transaction, pricing every line from menu_items inside it, so a caller-supplied
 * price has no path in, a line that fails leaves no order row, and an item the
 * menu no longer offers is refused with the documented 404/409 AppError.
 * listByUser and findByIdForUser bind the owner's user_id, making another user's
 * order indistinguishable from a missing one.
 *
 * Exports: createWithLines, listByUser, findByIdForUser — SQL and row shapes;
 * request validation and the response projection belong to order.service.js.
 *
 * @module src/repositories/order.repository
 */

const { randomUUID } = require('node:crypto');
const { AppError } = require('../errors');
const { getDb } = require('../db');
const menuItemRepository = require('./menu-item.repository');

/** Orders columns both reads select, so their raw row shape matches. @type {string} */
const ORDER_COLUMNS = ['id', 'user_id', 'status', 'total_cents', 'notes', 'created_at'].join(', ');

/** Status stored when the caller supplies none. @type {string} */
const DEFAULT_STATUS = 'confirmed';

/**
 * Read the lines of several orders in one batched statement, keyed by order id:
 * one `IN` lookup per page, line names joined from menu_items, ordered by item
 * name then line id — total, so it repeats exactly — stored integers untouched.
 *
 * @param {Array<string>} orderIds - Ids of the orders whose lines are wanted.
 * @returns {Map<string, Array<Object>>} Line arrays by order id; an order with no
 *   lines is absent from the map.
 */
function readLinesByOrder(orderIds) {
  if (orderIds.length === 0) {
    return new Map();
  }

  // Only placeholder characters are generated; the ids are bound as parameters.
  const rows = getDb()
    .prepare(
      'SELECT li.id, li.order_id, li.menu_item_id, mi.name, li.quantity, li.unit_price_cents, ' +
        'li.line_total_cents FROM order_line_items li JOIN menu_items mi ON mi.id = li.menu_item_id ' +
        `WHERE li.order_id IN (${orderIds.map(() => '?').join(', ')}) ORDER BY mi.name ASC, li.id ASC`
    )
    .all(...orderIds);
  const linesByOrder = new Map();

  for (const row of rows) {
    const lines = linesByOrder.get(row.order_id) ?? [];
    const line = {
      id: row.id, menu_item_id: row.menu_item_id, name: row.name, quantity: row.quantity,
      unit_price_cents: row.unit_price_cents, line_total_cents: row.line_total_cents
    };

    lines.push(line);
    linesByOrder.set(row.order_id, lines);
  }

  return linesByOrder;
}

/**
 * Assemble raw orders rows into the API's order shape — two queries in total
 * however many orders are assembled, and an order with no lines renders `[]`.
 *
 * @param {Array<Object>} orderRows - Raw rows selected from orders.
 * @returns {Array<Object>} The contract's order shape per row, in the given order.
 */
function assembleOrders(orderRows) {
  const linesByOrder = readLinesByOrder(orderRows.map((row) => row.id));

  return orderRows.map((row) => ({
    id: row.id,
    status: row.status,
    total_cents: row.total_cents,
    notes: row.notes,
    created_at: row.created_at,
    lines: linesByOrder.get(row.id) ?? []
  }));
}

/**
 * Store one order with its line items, atomically: one immediate transaction, so
 * any throw rolls back every statement and a line that cannot be priced leaves no
 * `orders` row. The transaction's single menu_items read is authoritative: it
 * prices every line from the stored price_cents (R-3), refusing an id no item
 * carries with MENU_ITEM_NOT_FOUND (404) before an unavailable item with
 * MENU_ITEM_UNAVAILABLE (409) — so a race with the menu cannot change the code.
 *
 * @param {Object} order - The order to store.
 * @param {string} [order.id] - Order identifier; a fresh UUID when omitted.
 * @param {string} order.userId - Owner, taken from the authenticated caller.
 * @param {string} [order.status] - Initial status; 'confirmed' when omitted.
 * @param {string|null} [order.notes] - Free-text note; null when omitted.
 * @param {string} [order.createdAt] - ISO-8601 creation time; now when omitted.
 * @param {Array<{menuItemId: string, quantity: number}>} order.lines - Ordered items.
 * @returns {Object|null} The stored order, shaped as a later read returns it.
 * @throws {AppError} MENU_ITEM_NOT_FOUND (404), MENU_ITEM_UNAVAILABLE (409), or a statement failure.
 */
function createWithLines(order = {}) {
  const { id = randomUUID(), userId, status = DEFAULT_STATUS, notes = null } = order;
  const createdAt = order.createdAt ?? new Date().toISOString();
  const lines = order.lines ?? [];
  const db = getDb();

  const write = db.transaction((payload) => {
    // One read prices the whole order: findManyByIds collapses duplicate ids and
    // runs on this transaction's connection.
    const itemRows = menuItemRepository.findManyByIds(payload.lines.map((line) => line.menuItemId));
    const itemsById = new Map(itemRows.map((row) => [row.id, row]));
    // Existence decides first, so a cart naming both kinds answers 404.
    const unknownId = payload.lines.map((line) => line.menuItemId).find((menuItemId) => !itemsById.has(menuItemId));

    if (unknownId !== undefined) {
      throw new AppError('MENU_ITEM_NOT_FOUND', `No menu item matches the id "${unknownId}".`);
    }

    const pricedLines = payload.lines.map((line) => {
      const item = itemsById.get(line.menuItemId);

      if (item.is_available !== 1) {
        throw new AppError('MENU_ITEM_UNAVAILABLE', `The menu item "${item.name}" is not currently available.`);
      }

      return {
        id: randomUUID(), menuItemId: item.id, quantity: line.quantity,
        unitPriceCents: item.price_cents, lineTotalCents: item.price_cents * line.quantity
      };
    });
    const totalCents = pricedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);

    db.prepare(
      'INSERT INTO orders (id, user_id, status, total_cents, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(payload.id, payload.userId, payload.status, totalCents, payload.notes, payload.createdAt);

    if (pricedLines.length > 0) {
      // One multi-row insert; only placeholders are generated, so every value binds.
      db.prepare(
        'INSERT INTO order_line_items (id, order_id, menu_item_id, quantity, unit_price_cents, ' +
          `line_total_cents) VALUES ${pricedLines.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`
      ).run(...pricedLines.flatMap((line) => [
        line.id, payload.id, line.menuItemId, line.quantity, line.unitPriceCents, line.lineTotalCents
      ]));
    }

    // Read back the way a later request would, still inside the transaction, so no
    // response can describe a partial order.
    return findByIdForUser(payload.id, payload.userId);
  });

  return write.immediate({ id, userId, status, notes, createdAt, lines });
}

/**
 * List one user's orders newest first, created_at ties broken by id descending so the
 * order is total; ownership is bound as a WHERE parameter, never filtered afterwards.
 *
 * @param {string} userId - Owner whose orders are listed.
 * @returns {Array<Object>} The user's orders with their lines, newest first.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function listByUser(userId) {
  const rows = getDb()
    .prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC`)
    .all(userId);

  return assembleOrders(rows);
}

/**
 * Find one order by id, only if it belongs to the given user: the composite
 * predicate makes a foreign order indistinguishable from a missing one, so the
 * caller answers 404 rather than 403 without asserting ownership afterwards.
 *
 * @param {string} id - Order id to read.
 * @param {string} userId - Owner the lookup is scoped to.
 * @returns {Object|null} The order with its lines, or null when that user holds no
 *   such order.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function findByIdForUser(id, userId) {
  const row = getDb()
    .prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ? AND user_id = ?`)
    .get(id, userId);

  if (row === undefined) {
    return null;
  }

  const [stored] = assembleOrders([row]);
  return stored;
}

module.exports = { createWithLines, listByUser, findByIdForUser };
