/**
 * @fileoverview Cart and checkout view — screen 5 of the ten-screen inventory.
 *
 * The cart served at '/cart', a route the client's route guard wraps in
 * `client/src/main.tsx`. Screen 5 owns the checkout step: the "Place order"
 * action on this view is what turns the cart into an order, so the inventory
 * stays at ten screens and no separate checkout screen, component or route
 * exists.
 *
 * Four boundaries this file keeps:
 * - The cart is `useCart()` state and nothing else (rule R-8). No line is read
 *   from or written to browser storage, and no cart endpoint is called, because
 *   the API has none.
 * - Money is the server's alone (rule R-3). Every price shown passes through
 *   `formatCents`, the request body carries a menu item id and a quantity per
 *   line and no amount at all, and the only arithmetic here is the display
 *   figure `price_cents * quantity` for one line: the server re-prices every
 *   line from stored menu data inside its order transaction, so the confirmed
 *   total is the server's, not this view's.
 * - One error surface (rule R-6). `ApiError` is the only failure type; its
 *   `details` are rendered against the field each entry names, its `code` is
 *   exposed as `data-code`, and a throw that is not an `ApiError` is reported as
 *   the fixed internal-error summary rather than as a rendered exception.
 * - A 401 is not handled here. The session provider registers the unauthorized
 *   handler with the API client, so this view neither inspects the token nor
 *   redirects on expiry.
 *
 * Four states are explicit: empty, which offers the way back to the menu and no
 * Place order action; populated, with the lines and the totals panel; submitting,
 * announced through `role="status"` with every control disabled; and failure,
 * which names the offending item or field and leaves a retry control live with
 * the cart untouched.
 *
 * @module client/src/views/CartView
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { formatCents } from '../api/format';
import { createOrder } from '../api/orders';
import { FieldError, FormMessage, TextField } from '../components/FormControls';
import { useCart } from '../state/cart';
import type { CartLine } from '../state/cart';

/** Smallest quantity one line may carry, matching the order endpoint's rule. */
const MIN_QUANTITY = 1;
/** Largest quantity one line may carry, matching the order endpoint's rule. */
const MAX_QUANTITY = 20;

/** The API's field name for the optional note, which this view renders an input for. */
const NOTES_FIELD = 'notes';
/** The per-line field this view renders a control for; its id is generated, never typed. */
const QUANTITY_KEY = 'quantity';
/** How the order endpoint names one field of one line, for example `items[0].quantity`. */
const LINE_FIELD_PATTERN = /^items\[(\d+)\]\.(.+)$/;

const CART_TITLE = 'Your cart';
const EMPTY_TITLE = 'Your cart is empty';
const EMPTY_MESSAGE = 'Add a burger, a side or a drink and it will appear here.';
const BROWSE_LABEL = 'Browse the menu';
const NOTES_LABEL = 'Notes (optional)';
const NOTES_HINT = 'Anything the kitchen should know about this order.';
const PRICING_HINT = 'The kitchen prices every line when you place the order.';
const PLACE_ORDER_LABEL = 'Place order';
const SUBMITTING_MESSAGE = 'Placing your order…';
const RETRY_LABEL = 'Try again';
const RETAINED_MESSAGE = 'Nothing was ordered and your cart is unchanged.';
const UNAVAILABLE_INSTRUCTION =
    'Remove that item from your cart, then add it again once it is back on the menu.';
const UNEXPECTED_FAILURE_MESSAGE =
    'Something went wrong while placing your order. Nothing was ordered and your cart is unchanged, so you can try again.';

/** One of the order endpoint's `details` entries, tied to the cart line it names. */
interface LineDetail {
    /** Position of the line in the request, which is the position it renders at. */
    readonly index: number;
    /** The server's own field and issue strings for that line. */
    readonly detail: ApiFieldDetail;
}

/**
 * A failed placement, flattened to the parts this view renders. `error` is null
 * only when the throw was not an `ApiError`, which is the one case reported as
 * the fixed internal-error summary.
 */
interface Failure {
    /** The transport's error object, or null for a throw that never reached the API. */
    readonly error: ApiError | null;
    /** The API's code, or `INTERNAL_ERROR` when there is no envelope at all. */
    readonly code: string;
    /** The `details` entries naming a line quantity, rendered under that line. */
    readonly lineDetails: readonly LineDetail[];
    /** The `details` entry naming the note, when the API supplied one. */
    readonly notesDetail: ApiFieldDetail | null;
    /** Every other `details` entry, rendered so no field the API named is dropped. */
    readonly otherDetails: readonly ApiFieldDetail[];
    /** Names of the cart's items the API reported as unavailable, when it named any. */
    readonly unavailableNames: readonly string[];
}

/** Props of {@link OrderFailure}. */
interface OrderFailureProps {
    /** The placement that failed. */
    readonly failure: Failure;
    /** Whether a placement is in flight, which disables the retry control. */
    readonly submitting: boolean;
}

/** Props of {@link CartLineRow}. */
interface CartLineRowProps {
    /** The line to render. */
    readonly line: CartLine;
    /** The server's own detail for this line's quantity, when it named one. */
    readonly quantityDetail: ApiFieldDetail | null;
    /** Whether a placement is in flight, which disables every control of the row. */
    readonly disabled: boolean;
    /** Sets the line's quantity from the control's text. */
    onQuantityChange(menuItemId: string, rawValue: string): void;
    /** Drops the line. */
    onRemove(menuItemId: string): void;
}

/** @returns The count with its noun: `1 item`, `4 items`. */
function countLabel(count: number, singular: string, pluralForm: string): string {
    return count === 1 ? '1 ' + singular : String(count) + ' ' + pluralForm;
}

/**
 * Reads the cart line and the field that an order `details` entry names.
 *
 * The order endpoint reports a line-level failure as `items[<index>].<field>`,
 * so the index routes the message to the line it came from. A field name that
 * does not fit that shape, or an index that no line occupies, yields null and
 * the entry is reported at form level instead of being dropped.
 *
 * @param field - The `field` string of one `details` entry.
 * @param lineCount - How many lines were submitted, so an out-of-range index is rejected.
 * @returns The line index and field key, or null when the entry names no rendered line.
 */
function parseLineField(field: string, lineCount: number): { index: number; key: string } | null {
    const match = LINE_FIELD_PATTERN.exec(field);

    if (match === null) {
        return null;
    }

    const index = Number(match[1]);
    const key = match[2];

    if (!Number.isInteger(index) || index < 0 || index >= lineCount || key === undefined) {
        return null;
    }

    return { index, key };
}

/**
 * Collects the names of the cart's items the API reported as unavailable, so the
 * message can name them instead of saying "an item".
 *
 * The order endpoint answers `MENU_ITEM_UNAVAILABLE` with the item's name in its
 * message and no `details`, so the names are taken from any line a `details`
 * entry points at and, failing that, from the lines whose name the message
 * quotes. A message naming nothing this cart holds leaves the list empty rather
 * than guessing.
 *
 * @param error - The `ApiError` the order endpoint answered with.
 * @param lines - The lines that were submitted, in request order.
 * @returns The unavailable item names, each once, in cart order.
 */
function unavailableNames(error: ApiError, lines: readonly CartLine[]): readonly string[] {
    const names: string[] = [];

    const add = (name: string | undefined): void => {
        if (name !== undefined && name !== '' && !names.includes(name)) {
            names.push(name);
        }
    };

    for (const detail of error.details) {
        const parsed = parseLineField(detail.field, lines.length);

        if (parsed !== null) {
            add(lines[parsed.index]?.name);
        }
    }

    for (const line of lines) {
        if (error.message.includes(line.name)) {
            add(line.name);
        }
    }

    return names;
}

/**
 * Flattens anything the placement threw into the parts this view renders.
 *
 * @param error - The value caught from the rejected `createOrder` call.
 * @param lines - The lines that were submitted, in request order.
 * @returns The failure, with each `details` entry routed to the control it names.
 */
function toFailure(error: unknown, lines: readonly CartLine[]): Failure {
    if (!(error instanceof ApiError)) {
        return {
            error: null,
            code: 'INTERNAL_ERROR',
            lineDetails: [],
            notesDetail: null,
            otherDetails: [],
            unavailableNames: [],
        };
    }

    const lineDetails: LineDetail[] = [];
    const otherDetails: ApiFieldDetail[] = [];
    let notesDetail: ApiFieldDetail | null = null;

    for (const detail of error.details) {
        if (detail.field === NOTES_FIELD && notesDetail === null) {
            notesDetail = detail;
            continue;
        }

        const parsed = parseLineField(detail.field, lines.length);

        if (parsed !== null && parsed.key === QUANTITY_KEY) {
            lineDetails.push({ index: parsed.index, detail });
            continue;
        }

        otherDetails.push(detail);
    }

    return {
        error,
        code: error.code,
        lineDetails,
        notesDetail,
        otherDetails,
        unavailableNames: error.code === 'MENU_ITEM_UNAVAILABLE' ? unavailableNames(error, lines) : [],
    };
}

/** @returns The server's detail for the line at that position, or null when it named none. */
function detailAt(failure: Failure | null, index: number): ApiFieldDetail | null {
    if (failure === null) {
        return null;
    }

    for (const entry of failure.lineDetails) {
        if (entry.index === index) {
            return entry.detail;
        }
    }

    return null;
}

/**
 * Renders why a placement failed, in the one envelope's vocabulary.
 *
 * An unavailable item is reported as a block that names every offending item and
 * tells the shopper to remove and re-add it, because that failure is fixed by a
 * cart edit rather than by retrying; no line is dropped on the shopper's behalf.
 * Every other API failure is the form-level `FormMessage`, which reads the code,
 * and any `details` entry naming a field this view renders no control for is
 * listed as a `FieldError` so none is silently swallowed.
 *
 * @param props - The failure and whether a placement is in flight.
 * @returns The failure panel, with the retry control that re-submits the form.
 */
function OrderFailure({ failure, submitting }: OrderFailureProps): JSX.Element {
    const unavailable = failure.error !== null && failure.code === 'MENU_ITEM_UNAVAILABLE';

    return (
        <div className="stack">
            {failure.error === null ? (
                <p className="error-summary" role="alert" data-code="INTERNAL_ERROR">
                    {UNEXPECTED_FAILURE_MESSAGE}
                </p>
            ) : null}

            {unavailable && failure.error !== null ? (
                <div className="error-summary" role="alert" data-code={failure.code}>
                    <p>{failure.error.message}</p>
                    {failure.unavailableNames.length > 0 ? (
                        <p>
                            Not available right now: <strong>{failure.unavailableNames.join(', ')}</strong>.
                        </p>
                    ) : null}
                    <p>{UNAVAILABLE_INSTRUCTION}</p>
                </div>
            ) : null}

            {failure.error !== null && !unavailable ? <FormMessage error={failure.error} /> : null}

            {failure.otherDetails.length > 0 ? (
                <div className="field">
                    {failure.otherDetails.map((detail, index) => (
                        <FieldError key={detail.field + ':' + detail.issue + ':' + String(index)} detail={detail} />
                    ))}
                </div>
            ) : null}

            <p className="field__hint">{RETAINED_MESSAGE}</p>

            <div className="row">
                <button className="button button--secondary" type="submit" disabled={submitting}>
                    {RETRY_LABEL}
                </button>
            </div>
        </div>
    );
}

/**
 * Renders one line of the cart: what the item is, what it costs, how many of it
 * the shopper wants, the line's display total and the control that drops it.
 *
 * The quantity control is a labelled number input carrying the shared `.control`
 * class, so it keeps the 44x44px touch target and the stylesheet's own width and
 * centring rule. A server detail for this line's quantity is announced through
 * `aria-describedby` and rendered under the input, never instead of the input.
 *
 * @param props - The line, the detail that names it and the two mutations.
 * @returns The list item for one cart line.
 */
function CartLineRow({ line, quantityDetail, disabled, onQuantityChange, onRemove }: CartLineRowProps): JSX.Element {
    const quantityId = 'cart-quantity-' + line.menu_item_id;
    const errorId = quantityId + '-error';
    const hasError = quantityDetail !== null;

    return (
        <li className="cart-line">
            <div className="cart-line__info">
                <span className="cart-line__name">{line.name}</span>
                <span className="cart-line__unit-price">{formatCents(line.price_cents)} each</span>
            </div>

            <div className="cart-line__quantity">
                <div className="field">
                    <label className="field__label" htmlFor={quantityId}>
                        Quantity<span className="visually-hidden"> of {line.name}</span>
                    </label>
                    <input
                        id={quantityId}
                        name={quantityId}
                        className="control"
                        type="number"
                        inputMode="numeric"
                        min={MIN_QUANTITY}
                        max={MAX_QUANTITY}
                        step={1}
                        value={line.quantity}
                        disabled={disabled}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? errorId : undefined}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            onQuantityChange(line.menu_item_id, event.target.value);
                        }}
                    />
                    <FieldError id={errorId} detail={quantityDetail} />
                </div>
            </div>

            {/* The one piece of arithmetic in this folder: a display subtotal. The
                order's own total comes from the server and replaces this figure on
                the confirmation. */}
            <span className="cart-line__total">{formatCents(line.price_cents * line.quantity)}</span>

            <div className="cart-line__actions">
                <button
                    className="button button--secondary"
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        onRemove(line.menu_item_id);
                    }}
                >
                    Remove<span className="visually-hidden"> {line.name}</span>
                </button>
            </div>
        </li>
    );
}

/**
 * Screen 5: the cart, and the checkout step it owns.
 *
 * Placing the order sends only what the order endpoint accepts — a menu item id
 * and a quantity per line, plus the note when one was typed — so no price can
 * travel from here and the totals the confirmation shows are the server's. On
 * success the cart is emptied before the route changes, which is what returns the
 * header's item count to zero as the confirmation renders.
 *
 * A cart edit or a note edit drops the previous failure, so a message always
 * describes the current cart rather than the one that produced it.
 *
 * @returns The empty cart, or the lines, totals panel and Place order action.
 */
export function CartView(): JSX.Element {
    const navigate = useNavigate();
    const { items, updateQuantity, remove, clear, totalCents, itemCount } = useCart();
    const [notes, setNotes] = useState('');
    const [failure, setFailure] = useState<Failure | null>(null);
    const [submitting, setSubmitting] = useState(false);

    /** Drops the failure a cart or note edit has made stale. */
    function clearFailure(): void {
        setFailure(null);
    }

    /**
     * Applies a typed quantity to its line.
     *
     * An emptied control is a value mid-edit rather than a request to remove the
     * line, and a quantity below the accepted minimum is refused here so the one
     * way to drop a line stays the Remove control; the cart provider clamps a
     * value above the maximum.
     *
     * @param menuItemId - The line's menu item id.
     * @param rawValue - The control's text, trusted no further than this.
     */
    function handleQuantityChange(menuItemId: string, rawValue: string): void {
        if (rawValue.trim() === '') {
            return;
        }

        const next = Number(rawValue);

        if (!Number.isFinite(next) || next < MIN_QUANTITY) {
            return;
        }

        clearFailure();
        updateQuantity(menuItemId, next);
    }

    /** @param menuItemId - The line to drop. */
    function handleRemove(menuItemId: string): void {
        clearFailure();
        remove(menuItemId);
    }

    /**
     * Places the order and moves to its confirmation, or renders why it was not
     * placed.
     *
     * @param event - The form submission.
     */
    async function handlePlaceOrder(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();

        if (submitting || items.length === 0) {
            return;
        }

        const trimmedNotes = notes.trim();
        setFailure(null);
        setSubmitting(true);

        try {
            const order = await createOrder({
                items: items.map((line) => ({ menu_item_id: line.menu_item_id, quantity: line.quantity })),
                ...(trimmedNotes === '' ? {} : { notes: trimmedNotes }),
            });
            clear();
            navigate('/orders/' + order.id, { replace: true });
        } catch (error) {
            setFailure(toFailure(error, items));
        } finally {
            setSubmitting(false);
        }
    }

    if (items.length === 0) {
        return (
            <section className="cart" aria-labelledby="cart-title">
                <h1 className="page-title" id="cart-title">{CART_TITLE}</h1>
                <div className="cart-empty empty-state">
                    <h2 className="section-title">{EMPTY_TITLE}</h2>
                    <p>{EMPTY_MESSAGE}</p>
                    <Link className="button" to="/menu">
                        {BROWSE_LABEL}
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="cart" aria-labelledby="cart-title">
            <h1 className="page-title" id="cart-title">{CART_TITLE}</h1>

            <form className="stack" onSubmit={handlePlaceOrder} aria-busy={submitting} noValidate>
                {failure === null ? null : <OrderFailure failure={failure} submitting={submitting} />}

                <section className="cart-summary" aria-label="Cart lines and total">
                    <div className="cart-summary__lines">
                        <h2 className="section-title">{countLabel(itemCount, 'item', 'items')} in your cart</h2>
                        <ul className="cart-lines">
                            {items.map((line, index) => (
                                <CartLineRow
                                    key={line.menu_item_id}
                                    line={line}
                                    quantityDetail={detailAt(failure, index)}
                                    disabled={submitting}
                                    onQuantityChange={handleQuantityChange}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </ul>
                    </div>

                    <div className="cart-summary__totals">
                        <TextField
                            id="order-notes"
                            label={NOTES_LABEL}
                            hint={NOTES_HINT}
                            autoComplete="off"
                            value={notes}
                            disabled={submitting}
                            detail={failure?.notesDetail ?? null}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                setNotes(event.target.value);
                                clearFailure();
                            }}
                        />

                        <div className="cart-summary__total-row cart-summary__total-row--total">
                            <span>Total</span>
                            <span>{formatCents(totalCents)}</span>
                        </div>

                        <p className="field__hint">{PRICING_HINT}</p>

                        <div className="cart-summary__actions">
                            {submitting ? <p className="field__hint" role="status">{SUBMITTING_MESSAGE}</p> : null}
                            <button className="button button--block" type="submit" disabled={submitting}>
                                {PLACE_ORDER_LABEL}
                            </button>
                        </div>
                    </div>
                </section>
            </form>
        </section>
    );
}

export default CartView;
