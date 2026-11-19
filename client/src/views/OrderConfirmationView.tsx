/**
 * @fileoverview Order confirmation and order history — screen 6 of the ten-screen
 * inventory, rendered by one component in two modes.
 *
 * `/orders/:id` renders a single order as the confirmation of the purchase that
 * produced it; `/orders` (no id in the path) renders the signed-in caller's own
 * orders, in the order the API returns them, newest first. Both routes are
 * wrapped in `ProtectedRoute` by `client/src/main.tsx`, so this module renders no
 * guard, performs no redirect and holds no route-table knowledge.
 *
 * Money is the server's alone. Every amount shown here is an `Order` field passed
 * through `formatCents` unchanged — no amount is summed, rounded or re-derived
 * from the lines, so the figure a customer reads is the figure the API stored.
 * The item count is the one figure read from the lines and is their quantities,
 * the same count the cart shows before the order is placed.
 *
 * The API scopes each read to the caller and answers an order held by another
 * account exactly as it answers an id that names no order, both with
 * `ORDER_NOT_FOUND`. That single response is rendered as one plain not-found
 * state: the scoping already happened in the server's user-scoped query, so no
 * ownership check is attempted here and the two cases are not distinguished.
 *
 * All four states are explicit: loading, populated, empty (an empty history, or
 * an order that cannot be read) and failure, which offers a retry control.
 *
 * @module client/src/views/OrderConfirmationView
 */

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { formatCents, formatStatusLabel, formatTimestamp } from '../api/format';
import { getOrder, listOrders } from '../api/orders';
import type { Order, OrderStatus } from '../api/types';

/**
 * The badge class each status takes, drawn from the two the stylesheet declares.
 * A cancelled order reads as unavailable rather than carrying an invented class.
 */
const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  confirmed: 'badge badge--available',
  preparing: 'badge badge--available',
  completed: 'badge badge--available',
  cancelled: 'badge badge--unavailable',
};

/** The failure a request ended with, flattened to what the view renders. */
interface Failure {
  /** The API's code, or `INTERNAL_ERROR` for a throw that never reached it. */
  readonly code: string;
  /** Safe to render: the API's message, never a stack or a secret. */
  readonly message: string;
}

/** The states this view renders, as one discriminated union. */
type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'order'; readonly order: Order }
  | { readonly kind: 'history'; readonly orders: readonly Order[] }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly code: string; readonly message: string };

/** Props of {@link OrderConfirmation}. */
interface OrderConfirmationProps {
  /** The order to present, exactly as the API returned it. */
  readonly order: Order;
}

/** Props of {@link OrderHistoryEntry}. */
interface OrderHistoryEntryProps {
  /** One order of the caller's history, exactly as the API returned it. */
  readonly order: Order;
}

/**
 * Flattens anything a failed request threw into the two fields the view shows.
 *
 * `ApiError` is the only error surface `client/src/api/client.ts` produces, so it
 * carries the code straight through. Any other throw is unexpected and reported
 * as `INTERNAL_ERROR` rather than inventing a code the API never sends.
 *
 * @param error - The value caught from the rejected request.
 * @returns The failure's code and the message safe to render.
 */
function toFailure(error: unknown): Failure {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message || error.code };
  }

  return { code: 'INTERNAL_ERROR', message: 'The order could not be loaded.' };
}

/**
 * @param count - How many of the thing there are.
 * @param singular - The noun for exactly one, for example `item`.
 * @param pluralForm - The noun for any other count, for example `items`.
 * @returns The count with its noun: `1 item`, `4 items`.
 */
function countLabel(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? '1 ' + singular : String(count) + ' ' + pluralForm;
}

/**
 * Counts the units an order holds — the same figure the cart labels "items in
 * your cart" before the order is placed. It is the sum of every line's
 * quantity, not the number of lines: two burgers and one side read as
 * `3 items` in the cart and as `3 items` here, and an order of twenty of one
 * dish and one of another reads as `21 items`.
 *
 * Quantities are the only values summed. Every amount on this screen remains
 * the server's own field passed through `formatCents` unchanged.
 *
 * @param order - The order exactly as the API returned it, with its lines.
 * @returns The number of units the order's lines add up to.
 */
function unitCount(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Renders one order as the confirmation of the purchase that produced it: its
 * status and placement time, its id, the note when one was left, every line with
 * the quantity and the server's unit and line amounts, and the server's total.
 *
 * @param props - The order to present.
 * @returns The confirmation for one order.
 */
function OrderConfirmation({ order }: OrderConfirmationProps): JSX.Element {
  const hasNotes = order.notes !== null && order.notes.trim() !== '';

  return (
    <div className="cart">
      <h1 className="page-title" tabIndex={-1}>Order placed</h1>

      <section className="card stack" aria-label="Order details">
        <div className="row">
          <span className={STATUS_BADGE_CLASSES[order.status]}>{formatStatusLabel(order.status)}</span>
          <span className="cart-line__unit-price">Placed {formatTimestamp(order.created_at)}</span>
        </div>
        <p className="cart-line__name">Order {order.id}</p>
        {hasNotes ? (
          <p>
            <span className="cart-line__unit-price">Notes: </span>
            {order.notes}
          </p>
        ) : null}
      </section>

      <section className="cart-summary" aria-label="Items and total">
        <div className="cart-summary__lines">
          <h2 className="section-title">{countLabel(unitCount(order), 'item', 'items')}</h2>
          <ul className="cart-lines">
            {order.lines.map((line) => (
              <li className="cart-line" key={line.id}>
                <div className="cart-line__info">
                  <span className="cart-line__name">{line.name}</span>
                  <span className="cart-line__unit-price">Quantity {line.quantity}</span>
                  <span className="cart-line__unit-price">
                    {formatCents(line.unit_price_cents)} each
                  </span>
                </div>
                <span className="cart-line__total">{formatCents(line.line_total_cents)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cart-summary__totals">
          <div className="cart-summary__total-row cart-summary__total-row--total">
            <span>Total</span>
            <span>{formatCents(order.total_cents)}</span>
          </div>
        </div>
      </section>

      <div className="row">
        <Link className="button" to="/orders">
          All your orders
        </Link>
        <Link className="button button--secondary" to="/menu">
          Browse the menu
        </Link>
      </div>
    </div>
  );
}

/**
 * Renders one order as a row of the caller's history: a link to that order's own
 * confirmation, its placement time, its item count, its status and the server's
 * total.
 *
 * @param props - One order of the history.
 * @returns A single list item of the history.
 */
function OrderHistoryEntry({ order }: OrderHistoryEntryProps): JSX.Element {
  return (
    <li className="cart-line cart-line--history">
      <div className="cart-line__info">
        <span className="cart-line__name">Order {order.id}</span>
        <span className="cart-line__unit-price">Placed {formatTimestamp(order.created_at)}</span>
        <span className="cart-line__unit-price">{countLabel(unitCount(order), 'item', 'items')}</span>
        {/*
         * The order id itself is a single line of text, so an anchor wrapped
         * around it cannot reach the 44x44px touch-target floor at wide
         * widths. The row's link is therefore an explicit control, and the
         * id is repeated visually hidden inside it so two links on the page
         * never share an accessible name.
         */}
        <div className="cart-line__actions">
          <Link className="button button--secondary" to={'/orders/' + encodeURIComponent(order.id)}>
            View order<span className="visually-hidden"> {order.id}</span>
          </Link>
        </div>
      </div>
      <div className="row">
        <span className={STATUS_BADGE_CLASSES[order.status]}>{formatStatusLabel(order.status)}</span>
      </div>
      <span className="cart-line__total">{formatCents(order.total_cents)}</span>
    </li>
  );
}

/**
 * Screen 6 of the ten-screen inventory. With an `:id` in the path it shows that
 * order's confirmation; without one it shows the caller's order history.
 *
 * The id-keyed effect is the only data access: an ignore flag on cleanup stops a
 * response from a superseded request from overwriting the state of a newer one,
 * and the attempt counter re-runs the same effect when the retry control is used.
 * No ownership check, no redirect and no cart mutation happen here — the API
 * scopes every read to the caller, and the route guard is `ProtectedRoute`'s.
 *
 * @returns The confirmation, the history, or one of the loading, empty and
 *   failure states.
 */
export function OrderConfirmationView(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState({ kind: 'loading' });

    async function load(): Promise<void> {
      try {
        if (id === undefined) {
          const orders = await listOrders();

          if (!ignore) {
            setState({ kind: 'history', orders });
          }

          return;
        }

        const order = await getOrder(id);

        if (!ignore) {
          setState({ kind: 'order', order });
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        const failure = toFailure(error);
        // An order held by another account and an id that names none are
        // answered identically, so both render the same not-found state.
        const missing = failure.code === 'ORDER_NOT_FOUND' || failure.code === 'VALIDATION_ERROR';

        if (missing) {
          setState({ kind: 'not-found' });
        } else {
          setState({ kind: 'error', code: failure.code, message: failure.message });
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [id, attempt]);

  const retry = (): void => {
    setAttempt((previous) => previous + 1);
  };

  if (state.kind === 'loading') {
    return (
      <div className="state-panel" role="status">
        {id === undefined ? 'Loading your orders…' : 'Loading your order…'}
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <div className="stack">
        <h1 className="page-title" tabIndex={-1}>Order not found</h1>
        <div className="state-panel">
          <p>We could not find that order in your account.</p>
          <div className="row">
            <Link className="button" to="/orders">
              View your orders
            </Link>
            <Link className="button button--secondary" to="/menu">
              Browse the menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="stack">
        <h1 className="page-title" tabIndex={-1}>Your order</h1>
        <div className="error-summary" role="alert" data-code={state.code}>
          <p>{state.message}</p>
        </div>
        <div className="row">
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
          <Link className="button button--secondary" to="/menu">
            Browse the menu
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'order') {
    return <OrderConfirmation order={state.order} />;
  }

  if (state.orders.length === 0) {
    return (
      <section className="stack">
        <h1 className="page-title" tabIndex={-1}>Your orders</h1>
        <div className="state-panel">
          <p>No orders yet</p>
          <p>Once you place an order, its confirmation appears here.</p>
          <div className="row">
            <Link className="button" to="/menu">
              Browse the menu
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="cart">
      <h1 className="page-title" tabIndex={-1}>Your orders</h1>
      <p className="cart-line__unit-price">
        {countLabel(state.orders.length, 'order', 'orders')} so far, most recent first.
      </p>
      <ul className="cart-lines">
        {state.orders.map((order) => (
          <OrderHistoryEntry key={order.id} order={order} />
        ))}
      </ul>
      <div className="row">
        <Link className="button" to="/menu">
          Browse the menu
        </Link>
      </div>
    </div>
  );
}

export default OrderConfirmationView;
