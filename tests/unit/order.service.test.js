/**
 * @fileoverview Unit tests for the order service (src/services/order.service.js)
 *
 * The service decides what a valid order request is and which stored fields travel
 * in the response. Pricing, atomicity and the existence/availability decision
 * belong to the repository it forwards to, which surfaces them as the documented
 * AppError; this suite asserts what reaches the repository, what comes back, that
 * such an AppError is propagated unchanged, and that a caller-supplied price is
 * dropped before forwarding (R-3).
 *
 * Nothing here opens a database, binds a port, issues a request or touches a
 * file: the order store, the clock and the database module are stubs, and every
 * call goes through `call` so a synchronous throw is observed exactly as a
 * rejected promise would be.
 *
 * @module tests/unit/order.service
 */

'use strict';

/** Clock every case runs on; the service takes time only from here. */
const FIXED_NOW = new Date('2025-02-01T10:00:00.000Z');

/** Caller the suite authenticates as. */
const USER_ID = '6f1d2c3b-0000-4000-8000-000000000001';

/** Another user; a row owned by them must never reach a response. */
const OTHER_USER_ID = '6f1d2c3b-0000-4000-8000-000000000002';

/** Menu items an order line names. */
const ITEM_ID = '3c9a7b10-0000-4000-8000-000000000011';

/** Orders the stubs hand back. */
const ORDER_ID = 'a1b2c3d4-0000-4000-8000-000000000021';
const NEWER_ORDER_ID = 'a1b2c3d4-0000-4000-8000-000000000022';
const OLDER_ORDER_ID = 'a1b2c3d4-0000-4000-8000-000000000023';

/** Line the stored order carries. */
const LINE_ID = 'b1c2d3e4-0000-4000-8000-000000000031';

/** Stored unit price, in integer cents, of the item the line names. */
const UNIT_PRICE_CENTS = 1299;

/**
 * Total the repository resolved. Deliberately not the stored price times the
 * requested quantity, so a service that priced an order itself would fail.
 */
const REPOSITORY_TOTAL_CENTS = 2598;

/** Shape a menu item id must have. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The order's contract keys, sorted. */
const ORDER_KEYS = ['created_at', 'id', 'lines', 'notes', 'status', 'total_cents'];

/** The order line's contract keys, sorted. */
const LINE_KEYS = ['id', 'line_total_cents', 'menu_item_id', 'name', 'quantity', 'unit_price_cents'];

/**
 * Order repository stub the service forwards to.
 * @typedef {Object} OrderStoreStubs
 * @property {jest.Mock} createWithLines - Stub of the atomic write and the price authority.
 * @property {jest.Mock} listByUser - Stub of the newest-first history read.
 * @property {jest.Mock} findByIdForUser - Stub of the user-scoped single read.
 */

/**
 * Loads the order service with the database module replaced, so requiring it
 * never pulls in the native SQLite driver and no case can open a connection.
 * @returns {Object} Fresh module: createOrderService, orderService, toPublicOrder.
 */
function loadOrderServiceModule() {
  jest.resetModules();
  jest.doMock('../../src/db', () => ({
    getDb: () => {
      throw new Error('the order service unit suite must not open a database');
    },
    closeDb: () => {}
  }));

  return require('../../src/services/order.service');
}

/**
 * Loads the AppError class the freshly loaded service module raises, so a case can
 * hand the store a failure of the very class the service propagates.
 * @returns {Function} The AppError class.
 */
function loadAppError() {
  return require('../../src/errors').AppError;
}

/**
 * Builds an order line as the repository assembles it, including the order_id
 * column the response must not carry.
 * @param {Object<string, *>} [overrides] - Values to replace.
 * @returns {Object} The line.
 */
function storedOrderLine(overrides = {}) {
  return {
    id: LINE_ID,
    order_id: ORDER_ID,
    menu_item_id: ITEM_ID,
    name: 'Classic Cheeseburger',
    quantity: 2,
    unit_price_cents: UNIT_PRICE_CENTS,
    line_total_cents: REPOSITORY_TOTAL_CENTS,
    ...overrides
  };
}

/**
 * Builds an order as the repository assembles it, including the user_id column
 * the response must not carry.
 * @param {Object<string, *>} [overrides] - Values to replace.
 * @returns {Object} The order.
 */
function storedOrder(overrides = {}) {
  return {
    id: ORDER_ID,
    user_id: USER_ID,
    status: 'confirmed',
    total_cents: REPOSITORY_TOTAL_CENTS,
    notes: null,
    created_at: FIXED_NOW.toISOString(),
    lines: [storedOrderLine()],
    ...overrides
  };
}

/**
 * Builds the service over fresh order-store stubs: an order that stores, an empty
 * history and a lookup that finds nothing.
 * @param {Object} [overrides] - Per-method overrides.
 * @param {Object} [overrides.orders] - Order store method overrides.
 * @param {function(): Date} [overrides.now] - Clock to inject.
 * @returns {{service: Object, orders: OrderStoreStubs}} The service and its stub.
 */
function buildService(overrides = {}) {
  const orders = {
    createWithLines: jest.fn(() => storedOrder()),
    listByUser: jest.fn(() => []),
    findByIdForUser: jest.fn(() => null),
    ...overrides.orders
  };
  const now = overrides.now ?? (() => FIXED_NOW);
  const { createOrderService } = loadOrderServiceModule();

  return { service: createOrderService({ orders, now }), orders };
}

/**
 * Invokes a service call through an async boundary, so a synchronous throw is
 * observed as a rejection exactly as a rejected promise would be.
 * @param {Function} fn - The call to make.
 * @returns {Promise<*>} Whatever the call returns.
 */
const call = async (fn) => fn();

/**
 * Runs a service call and returns the error it raises.
 * @param {Function} fn - The call to make.
 * @returns {Promise<Error|null>} The error raised, or null when the call resolved.
 */
async function rejectionOf(fn) {
  try {
    await call(fn);
  } catch (error) {
    return error;
  }

  return null;
}

/**
 * Asserts a captured failure carries the expected vocabulary code and status,
 * and hands back its field details.
 * @param {Error|null} error - Error captured from a service call.
 * @param {string} code - Expected vocabulary code.
 * @param {number} status - Expected HTTP status.
 * @returns {Array<Object>} The failure's field details, empty when it has none.
 */
function expectFailure(error, code, status) {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
  expect(error.status).toBe(status);

  return error.details ?? [];
}

describe('Order Service - order.service.js', () => {
  describe('Module Surface', () => {
    test('should export the factory, the wired service and the projection helper', () => {
      const orderServiceModule = loadOrderServiceModule();

      expect(typeof orderServiceModule.createOrderService).toBe('function');
      expect(typeof orderServiceModule.toPublicOrder).toBe('function');
      expect(typeof orderServiceModule.orderService.createOrder).toBe('function');
      expect(typeof orderServiceModule.orderService.listOrders).toBe('function');
      expect(typeof orderServiceModule.orderService.getOrder).toBe('function');
    });

    test('should load without pulling in the native SQLite driver', () => {
      loadOrderServiceModule();

      const driverLoaded = Object.keys(require.cache)
        .some((modulePath) => modulePath.includes('better-sqlite3'));

      expect(driverLoaded).toBe(false);
    });
  });

  describe('createOrder - Server-Side Pricing (R-3)', () => {
    test('should return the total_cents the repository resolved without recomputing it', async () => {
      const { service, orders } = buildService({
        orders: { createWithLines: jest.fn(() => storedOrder({ total_cents: REPOSITORY_TOTAL_CENTS })) }
      });

      const order = await call(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      // One unit at the stored price would be 1299; the repository's 2598 survives
      // untouched, so the service did not price the order itself.
      expect(order.total_cents).toBe(REPOSITORY_TOTAL_CENTS);
      expect(orders.createWithLines).toHaveBeenCalledTimes(1);
    });

    test('should drop every caller-supplied price before forwarding the lines', async () => {
      const { service, orders } = buildService();

      await call(() => service.createOrder({
        userId: USER_ID,
        items: [{
          menu_item_id: ITEM_ID,
          quantity: 2,
          unit_price_cents: 1,
          price_cents: 1,
          line_total_cents: 1
        }]
      }));

      const [forwarded] = orders.createWithLines.mock.calls[0];

      // The repository prices from {menuItemId, quantity} and nothing else, so a
      // price the caller sent has no path into the total.
      expect(Object.keys(forwarded.lines[0]).sort()).toEqual(['menuItemId', 'quantity']);
      expect(forwarded.lines[0]).toEqual({ menuItemId: ITEM_ID, quantity: 2 });
    });

    test('should forward an order envelope carrying no price of its own', async () => {
      const { service, orders } = buildService();

      await call(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 2 }]
      }));

      const [forwarded] = orders.createWithLines.mock.calls[0];

      expect(Object.keys(forwarded).sort())
        .toEqual(['createdAt', 'id', 'lines', 'notes', 'status', 'userId']);
    });
  });

  describe('createOrder - Request Validation (R-6)', () => {
    test.each([
      ['absent', undefined],
      ['an empty array', []],
      ['not an array', { menu_item_id: ITEM_ID, quantity: 1 }]
    ])('should raise VALIDATION_ERROR with 400 when items is %s', async (_case, items) => {
      const { service, orders } = buildService();

      const details = expectFailure(
        await rejectionOf(() => service.createOrder({ userId: USER_ID, items })),
        'VALIDATION_ERROR',
        400
      );

      expect(details.map((detail) => detail.field)).toContain('items');
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });

    test('should name items[0].menu_item_id when a line id is not a UUID', async () => {
      const { service, orders } = buildService();

      const details = expectFailure(
        await rejectionOf(() => service.createOrder({
          userId: USER_ID,
          items: [{ menu_item_id: 'not-a-uuid', quantity: 1 }]
        })),
        'VALIDATION_ERROR',
        400
      );

      expect(details.map((detail) => detail.field)).toContain('items[0].menu_item_id');
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });

    test.each([
      ['0', 0],
      ['21', 21],
      ['2.5', 2.5],
      ["the string '2'", '2']
    ])('should name items[0].quantity when the quantity is %s', async (_case, quantity) => {
      const { service, orders } = buildService();

      const details = expectFailure(
        await rejectionOf(() => service.createOrder({
          userId: USER_ID,
          items: [{ menu_item_id: ITEM_ID, quantity }]
        })),
        'VALIDATION_ERROR',
        400
      );

      expect(details.map((detail) => detail.field)).toContain('items[0].quantity');
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });

    test('should accept a valid request, so each failure above belongs to the field it names', async () => {
      const { service } = buildService();

      const order = await call(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 2 }]
      }));

      expect(Object.keys(order).sort()).toEqual(ORDER_KEYS);
      expect(order.id).toBe(ORDER_ID);
    });

    test('should answer a request with no body as VALIDATION_ERROR, never a TypeError', async () => {
      const { service, orders } = buildService();

      // Express 5 leaves req.body undefined when nothing was parsed, so a bodyless
      // POST must still earn the documented 400 instead of an unhandled TypeError.
      const details = expectFailure(
        await rejectionOf(() => service.createOrder()),
        'VALIDATION_ERROR',
        400
      );

      expect(details.map((detail) => detail.field)).toContain('items');
      expect(orders.createWithLines).not.toHaveBeenCalled();
    });
  });

  describe('createOrder - Refusal Mapping (R-6)', () => {
    test('should raise MENU_ITEM_NOT_FOUND with 404 when the store refuses an unknown item', async () => {
      const { service } = buildService({
        orders: {
          createWithLines: jest.fn(() => ({
            ok: false,
            reason: 'MENU_ITEM_NOT_FOUND',
            menuItemId: ITEM_ID
          }))
        }
      });

      const error = await rejectionOf(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      // The refusal is a value the store returns: the documented error for it is built
      // here, so the repository raises nothing from the error vocabulary.
      expect(error).toBeInstanceOf(loadAppError());
      expectFailure(error, 'MENU_ITEM_NOT_FOUND', 404);
      expect(error.message).toContain(ITEM_ID);
      expect(error.details).toBeUndefined();
    });

    test('should raise MENU_ITEM_UNAVAILABLE with 409 when the store refuses an unavailable item', async () => {
      const { service } = buildService({
        orders: {
          createWithLines: jest.fn(() => ({
            ok: false,
            reason: 'MENU_ITEM_UNAVAILABLE',
            menuItemId: ITEM_ID,
            itemName: storedOrderLine().name
          }))
        }
      });

      const error = await rejectionOf(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      expect(error).toBeInstanceOf(loadAppError());
      expectFailure(error, 'MENU_ITEM_UNAVAILABLE', 409);
      expect(error.message).toContain(storedOrderLine().name);
      expect(error.details).toBeUndefined();
    });

    test('should let a store failure that is not a refusal propagate untouched', async () => {
      const failure = new Error('SQLITE_CONSTRAINT_NOTNULL: orders.user_id');
      const { service } = buildService({
        orders: {
          createWithLines: jest.fn(() => {
            throw failure;
          })
        }
      });

      const error = await rejectionOf(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      expect(error).toBe(failure);
    });

    test('should forward every accepted line of a repeated item in one store call', async () => {
      const { service, orders } = buildService();

      await call(() => service.createOrder({
        userId: USER_ID,
        items: [
          { menu_item_id: ITEM_ID, quantity: 1 },
          { menu_item_id: ITEM_ID, quantity: 3 }
        ]
      }));

      // No lookup of its own, so the store is entered exactly once and prices both
      // lines from the single read inside its transaction.
      expect(orders.createWithLines).toHaveBeenCalledTimes(1);
      expect(orders.createWithLines.mock.calls[0][0].lines).toEqual([
        { menuItemId: ITEM_ID, quantity: 1 },
        { menuItemId: ITEM_ID, quantity: 3 }
      ]);
    });
  });

  describe('createOrder - Caller Identity and Failure Propagation (R-5)', () => {
    test('should forward the caller userId, the confirmed status, the notes and the injected clock time', async () => {
      const { service, orders } = buildService();

      await call(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 2 }],
        notes: 'No onions'
      }));

      const [forwarded] = orders.createWithLines.mock.calls[0];

      expect(forwarded).toMatchObject({
        userId: USER_ID,
        status: 'confirmed',
        notes: 'No onions',
        createdAt: FIXED_NOW.toISOString()
      });
      expect(forwarded.id).toMatch(UUID_PATTERN);
      expect(forwarded.lines).toEqual([{ menuItemId: ITEM_ID, quantity: 2 }]);
    });

    test('should store a null note when the request carries none', async () => {
      const { service, orders } = buildService();

      await call(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      expect(orders.createWithLines.mock.calls[0][0].notes).toBeNull();
    });

    test('should take the userId from the caller, never from a body-supplied user id', async () => {
      const { service, orders } = buildService();

      await call(() => service.createOrder({
        userId: USER_ID,
        user_id: OTHER_USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      expect(orders.createWithLines.mock.calls[0][0].userId).toBe(USER_ID);
    });

    test('should propagate a repository failure instead of returning an order', async () => {
      const failure = new Error('SQLITE_CONSTRAINT: the order transaction rolled back');
      const { service } = buildService({
        orders: {
          createWithLines: jest.fn(() => {
            throw failure;
          })
        }
      });

      const error = await rejectionOf(() => service.createOrder({
        userId: USER_ID,
        items: [{ menu_item_id: ITEM_ID, quantity: 1 }]
      }));

      // The repository's rollback is proven against a real database in
      // tests/integration/api-orders.test.js; here the failure must simply escape.
      expect(error).toBe(failure);
    });
  });

  describe('listOrders - Order History (R-5)', () => {
    test('should pass the caller userId to the repository and keep its newest-first order', async () => {
      const newer = storedOrder({ id: NEWER_ORDER_ID, created_at: '2025-02-01T09:30:00.000Z' });
      const older = storedOrder({ id: OLDER_ORDER_ID, created_at: '2025-01-31T19:30:00.000Z' });
      const { service, orders } = buildService({
        orders: { listByUser: jest.fn(() => [newer, older]) }
      });

      const listed = await call(() => service.listOrders({ userId: USER_ID }));

      expect(orders.listByUser).toHaveBeenCalledWith(USER_ID);
      expect(listed.map((order) => order.id)).toEqual([NEWER_ORDER_ID, OLDER_ORDER_ID]);
    });

    test('should take the userId from the caller, never from a body-supplied user id', async () => {
      const { service, orders } = buildService();

      await call(() => service.listOrders({ userId: USER_ID, user_id: OTHER_USER_ID }));

      expect(orders.listByUser).toHaveBeenCalledWith(USER_ID);
    });

    test('should return an empty array when the caller holds no orders', async () => {
      const { service } = buildService();

      await expect(call(() => service.listOrders({ userId: USER_ID }))).resolves.toEqual([]);
    });
  });

  describe('getOrder - Ownership (R-5)', () => {
    test('should look the order up for the caller and return the projected order', async () => {
      const { service, orders } = buildService({
        orders: { findByIdForUser: jest.fn(() => storedOrder()) }
      });

      const order = await call(() => service.getOrder({ id: ORDER_ID, userId: USER_ID }));

      expect(orders.findByIdForUser).toHaveBeenCalledWith(ORDER_ID, USER_ID);
      expect(order.id).toBe(ORDER_ID);
      expect(Object.keys(order).sort()).toEqual(ORDER_KEYS);
    });

    test('should take the userId from the caller, never from a body-supplied user id', async () => {
      const { service, orders } = buildService({
        orders: { findByIdForUser: jest.fn(() => storedOrder()) }
      });

      await call(() => service.getOrder({
        id: ORDER_ID,
        userId: USER_ID,
        user_id: OTHER_USER_ID
      }));

      expect(orders.findByIdForUser).toHaveBeenCalledWith(ORDER_ID, USER_ID);
    });

    test('should answer a missing order and another user order indistinguishably', async () => {
      // Both reach the service as a null from the user-scoped lookup: one because
      // no row carries the id, one because the row belongs to someone else. The
      // foreign stub returns the row for anyone but the caller, so a lookup that
      // forgot the userId would hand the other user's order back.
      const scopedLookup = jest.fn((id, userId) => (userId === USER_ID ? null : storedOrder()));
      const missingService = buildService({
        orders: { findByIdForUser: jest.fn(() => null) }
      });
      const foreignService = buildService({
        orders: { findByIdForUser: scopedLookup }
      });

      const missing = await rejectionOf(() => missingService.service
        .getOrder({ id: ORDER_ID, userId: USER_ID }));
      const foreign = await rejectionOf(() => foreignService.service
        .getOrder({ id: ORDER_ID, userId: USER_ID }));

      expect(scopedLookup).toHaveBeenCalledWith(ORDER_ID, USER_ID);
      expectFailure(missing, 'ORDER_NOT_FOUND', 404);
      expectFailure(foreign, 'ORDER_NOT_FOUND', 404);
      expect({ code: foreign.code, status: foreign.status, message: foreign.message })
        .toEqual({ code: missing.code, status: missing.status, message: missing.message });
    });

    test('should answer a lookup with no argument as ORDER_NOT_FOUND, never a TypeError', async () => {
      const { service } = buildService();

      expectFailure(await rejectionOf(() => service.getOrder()), 'ORDER_NOT_FOUND', 404);
    });
  });

  describe('toPublicOrder - Response Projection', () => {
    test('should return exactly the six contract keys of an order', () => {
      const { toPublicOrder } = loadOrderServiceModule();

      const projected = toPublicOrder(storedOrder());

      expect(Object.keys(projected).sort()).toEqual(ORDER_KEYS);
      expect(projected).not.toHaveProperty('user_id');
    });

    test('should return exactly the six contract keys of each line', () => {
      const { toPublicOrder } = loadOrderServiceModule();

      const projected = toPublicOrder(storedOrder());

      expect(Object.keys(projected.lines[0]).sort()).toEqual(LINE_KEYS);
      expect(projected.lines[0]).not.toHaveProperty('order_id');
    });

    test('should pass the stored integer cents through untouched', () => {
      const { toPublicOrder } = loadOrderServiceModule();

      const projected = toPublicOrder(storedOrder());

      expect(projected.total_cents).toBe(REPOSITORY_TOTAL_CENTS);
      expect(projected.lines[0].unit_price_cents).toBe(UNIT_PRICE_CENTS);
      expect(projected.lines[0].line_total_cents).toBe(REPOSITORY_TOTAL_CENTS);
    });

    test('should render an order with no lines as an empty array', () => {
      const { toPublicOrder } = loadOrderServiceModule();

      const projected = toPublicOrder(storedOrder({ lines: undefined }));

      expect(projected.lines).toEqual([]);
    });
  });
});
