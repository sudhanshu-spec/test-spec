/**
 * Order API Routes Module
 *
 * The three authenticated endpoints of the `/api/orders` mount point: placing an
 * order for the caller, listing the orders the caller already holds, and reading
 * one of them back. Each handler validates the request shape it owns, calls
 * exactly one `orderService` method and maps its result to one status and the
 * documented JSON body. SQL, the JSON error envelope and every order rule live
 * below this layer.
 *
 * Every route on this router is authenticated: `router.use(authenticate)` is the
 * router's first registration, so a path added here cannot be reached without a
 * Bearer token. Identity comes only from `req.user.id`, which the guard sets; no
 * id is read from the body, the query string or the path, so an order held by
 * another caller is absent from every read and is answered exactly like an id
 * that names no order at all, never refused with 403.
 *
 * A placed order carries only `menu_item_id` and `quantity` per line plus an
 * optional `notes`. Each line is projected onto those two fields here, so a
 * client-supplied amount has no path to the service and every monetary figure is
 * derived from the stored menu item inside the order transaction. The line-level
 * field paths and issue strings raised here are the ones
 * src/services/order.service.js uses for its own line failures, so a client sees
 * one shape whichever layer caught the fault.
 *
 * A rejection is forwarded by Express 5 to the `/api`-scoped error handler, the
 * only writer of the envelope; no handler here catches one.
 *
 * Route contracts (mounted at `/api/orders`, every route authenticated):
 * - POST '/' returns 201 {order} as JSON
 * - GET '/' returns 200 {orders} as JSON, the caller's own orders newest first
 * - GET '/:id' returns 200 {order} as JSON, or 400 VALIDATION_ERROR when the id is not a UUID
 *
 * @module src/routes/api/orders.routes
 */

const express = require('express');

const { AppError } = require('../../errors');
const { orderService } = require('../../services/order.service');
const { authenticate } = require('../../middleware/authenticate');

/**
 * Shape of a menu item id an order line must name, and of the id GET '/:id'
 * accepts. Case-insensitive because a UUID is hex; the value then reaches the
 * service exactly as the client wrote it, since the ids issued are lowercase.
 * @type {RegExp}
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Smallest quantity one order line may carry. @type {number} */
const MIN_QUANTITY = 1;

/** Largest quantity one order line may carry. @type {number} */
const MAX_QUANTITY = 20;

const router = express.Router();

/** Guard first: no path can be added to this router without the Bearer token. */
router.use(authenticate);

/**
 * Collect every line-level failure of an `items` value in one pass, so a form can
 * show them all: the whole value first, then each line's id and quantity in
 * request order. A line that is not an object contributes both details, because
 * neither field it should carry is usable.
 *
 * @param {*} requestedItems - Raw `items` value from the request body.
 * @returns {Array<{field: string, issue: string}>} One detail per offending field.
 */
function collectItemDetails(requestedItems) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return [{ field: 'items', issue: 'must_be_a_non_empty_array' }];
  }

  const details = [];

  requestedItems.forEach((line, index) => {
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
 * Validate a create-order body and project it onto the accepted request shape.
 *
 * Only `{ items: [{ menu_item_id, quantity }], notes? }` is accepted. The lines
 * handed back are rebuilt field by field, so a client-supplied amount — whatever
 * it is named — cannot reach the service even by accident, and `notes` travels
 * only when it is a string.
 *
 * @param {Object} body - Request body, already defaulted to an object.
 * @returns {{items: Array<{menu_item_id: string, quantity: number}>, notes: (string|undefined)}}
 *   The accepted request.
 * @throws {AppError} VALIDATION_ERROR (400) naming every offending field.
 */
function validateOrderRequest(body) {
  const details = collectItemDetails(body.items);

  if (details.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'The order request is not valid.', details);
  }

  return {
    items: body.items.map(({ menu_item_id: menuItemId, quantity }) => ({
      menu_item_id: menuItemId,
      quantity
    })),
    notes: typeof body.notes === 'string' ? body.notes : undefined
  };
}

/**
 * Place an order for the authenticated caller.
 *
 * The body is defaulted rather than destructured, because Express 5 leaves
 * `req.body` undefined when nothing was parsed; without the default a body-less
 * request would raise a TypeError and be answered 500 instead of 400. An item
 * that does not exist is the service's MENU_ITEM_NOT_FOUND (404) and one that is
 * not available is its MENU_ITEM_UNAVAILABLE (409).
 *
 * @route POST /
 * @param {import('express').Request} req - Request whose body carries the lines.
 * @param {import('express').Response} res - Response the created order is written to.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const { items, notes } = validateOrderRequest(body);

  const order = await orderService.createOrder({ userId: req.user.id, items, notes });

  res.status(201).json({ order });
});

/**
 * List the orders the authenticated caller holds.
 *
 * Only the caller's own orders are read, newest first; a caller who holds none
 * receives an empty array rather than a 404.
 *
 * @route GET /
 * @param {import('express').Request} req - Request; `req.user` was set by the guard.
 * @param {import('express').Response} res - Response the list is written to.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
router.get('/', async (req, res) => {
  const orders = await orderService.listOrders({ userId: req.user.id });

  res.json({ orders });
});

/**
 * Read one of the authenticated caller's orders.
 *
 * The id is validated before the lookup, so malformed input is answered 400
 * VALIDATION_ERROR with the field detail rather than a 404. A well-formed id that
 * names no order and one held by another caller are answered identically, because
 * the service's read is scoped to the caller.
 *
 * @route GET /:id
 * @param {import('express').Request} req - Request whose path carries the order id.
 * @param {import('express').Response} res - Response the order is written to.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
router.get('/:id', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'The order id must be a valid UUID.',
      [{ field: 'id', issue: 'not_a_valid_uuid' }]
    );
  }

  const order = await orderService.getOrder({ id: req.params.id, userId: req.user.id });

  res.json({ order });
});

module.exports = router;
