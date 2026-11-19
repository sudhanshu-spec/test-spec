/**
 * @fileoverview Order Repository — the `orders` + `order_line_items` accessor and
 * the module where atomicity and server-side pricing are enforced: createWithLines
 * writes an order and its lines in one immediate transaction, pricing every line
 * from menu_items inside that transaction, so a caller-supplied price has no path
 * in and a line that fails leaves no order row. listByUser and findByIdForUser
 * bind the owner's user_id, making another user's order indistinguishable from a
 * missing one.
 *
 * Exports: createWithLines, listByUser, findByIdForUser — SQL and row shapes only;
 * validation, availability policy and error-code mapping belong to
 * src/services/order.service.js, this module's only consumer.
 *
 * @module src/repositories/order.repository
 */

const { randomUUID } = require('node:crypto');
const { getDb } = require('../db');
const menuItemRepository = require('./menu-item.repository');

/** Orders columns both reads select, so their raw row shape matches. @type {string} */
const ORDER_COLUMNS = ['id', 'user_id', 'status', 'total_cents', 'notes', 'created_at'].join(', ');

/** Status stored when the caller supplies none. @type {string} */
const DEFAULT_STATUS = 'confirmed';

/**
 * Read the lines of several orders in one batched statement, keyed by order id:
 * one `IN` lookup per page, line names joined from menu_items, ordered by `li.id`
 * for a reproducible list, and the stored integers passed through untouched.
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
        `WHERE li.order_id IN (${orderIds.map(() => '?').join(', ')}) ORDER BY li.id ASC`
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
 * `orders` row. A line naming an unknown or unavailable item aborts with a plain
 * Error carrying `menuItemId` — a backstop against a race or a missed check, not a
 * policy decision, so no domain code is raised here.
 *
 * @param {Object} order - The order to store.
 * @param {string} [order.id] - Order identifier; a fresh UUID when omitted.
 * @param {string} order.userId - Owner, taken from the authenticated caller.
 * @param {string} [order.status] - Initial status; 'confirmed' when omitted.
 * @param {string|null} [order.notes] - Free-text note; null when omitted.
 * @param {string} [order.createdAt] - ISO-8601 creation time; now when omitted.
 * @param {Array<{menuItemId: string, quantity: number}>} order.lines - Ordered items.
 * @returns {Object|null} The stored order, shaped as a later read returns it.
 * @throws {Error} For an unknown or unavailable item (carrying `menuItemId`), an
 *   unopenable database or a failing statement; the transaction has rolled back.
 */
function createWithLines(order = {}) {
  const { id = randomUUID(), userId, status = DEFAULT_STATUS, notes = null } = order;
  const createdAt = order.createdAt ?? new Date().toISOString();
  const lines = order.lines ?? [];
  const db = getDb();

  const write = db.transaction((payload) => {
    const itemRows = menuItemRepository.findManyByIds(payload.lines.map((line) => line.menuItemId));
    const itemsById = new Map(itemRows.map((row) => [row.id, row]));

    const pricedLines = payload.lines.map((line) => {
      const item = itemsById.get(line.menuItemId);

      if (!item || item.is_available !== 1) {
        const error = new Error(`Menu item ${line.menuItemId} is unknown or unavailable.`);
        error.menuItemId = line.menuItemId;
        throw error;
      }

      return {
        id: randomUUID(), menuItemId: item.id, quantity: line.quantity,
        unitPriceCents: item.price_cents, lineTotalCents: item.price_cents * line.quantity
      };
    });

    const totalCents = pricedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);

    db.prepare(
      'INSERT INTO orders (id, user_id, status, total_cents, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(payload.id, payload.userId, payload.status, 0, payload.notes, payload.createdAt);
    const insertLine = db.prepare(
      'INSERT INTO order_line_items (id, order_id, menu_item_id, quantity, unit_price_cents, ' +
        'line_total_cents) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const { id: lineId, menuItemId, quantity, unitPriceCents, lineTotalCents } of pricedLines) {
      insertLine.run(lineId, payload.id, menuItemId, quantity, unitPriceCents, lineTotalCents);
    }

    db.prepare('UPDATE orders SET total_cents = ? WHERE id = ?').run(totalCents, payload.id);

    // Read back through the path a later request uses, still inside the
    // transaction, so the response cannot describe a partial order.
    return findByIdForUser(payload.id, payload.userId);
  });

  return write.immediate({ id, userId, status, notes, createdAt, lines });
}

/**
 * List one user's orders, newest first — ownership bound as a WHERE parameter, so
 * another user's order is not selectable at all rather than filtered afterwards.
 *
 * @param {string} userId - Owner whose orders are listed.
 * @returns {Array<Object>} The user's orders with their lines, newest first.
 * @throws {Error} If the database cannot be opened or the statement fails.
 */
function listByUser(userId) {
  const rows = getDb()
    .prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = ? ORDER BY created_at DESC`)
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
