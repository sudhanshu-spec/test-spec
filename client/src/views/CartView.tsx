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
 * announced through `role="status"` and carried on the Place order control's own
 * `aria-busy` and label, with every control disabled; and failure, which names the
 * offending item or field and leaves a retry control live with the cart untouched.
 *
 * @module client/src/views/CartView
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
/** The Place order control's own label while the placement is in flight. */
const SUBMITTING_LABEL = 'Placing order…';
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
  /** The shopper's own text for this line's quantity while it is being edited, or undefined. */
  readonly quantityText: string | undefined;
  /** The server's own detail for this line's quantity, when it named one. */
  readonly quantityDetail: ApiFieldDetail | null;
  /** What this line's quantity control says about the number it holds, or null when it says nothing. */
  readonly quantityFeedback: QuantityFeedback | null;
  /** Whether a placement is in flight, which disables every control of the row. */
  readonly disabled: boolean;
  /** Sets the line's quantity from the control's text. */
  onQuantityChange(menuItemId: string, rawValue: string): void;
  /** Drops the line's in-progress text, taking the value it held so its fate can be explained. */
  onQuantityBlur(menuItemId: string, rawText: string): void;
  /** Drops the line. */
  onRemove(menuItemId: string): void;
}

/** @returns The count with its noun: `1 item`, `4 items`. */
function countLabel(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? '1 ' + singular : String(count) + ' ' + pluralForm;
}

/** The quantity one line's control reads as, and whether it had to be corrected. */
interface QuantityReading {
  /** The whole number to commit, inside {@link MIN_QUANTITY}..{@link MAX_QUANTITY}. */
  readonly quantity: number;
  /** Whether the text read as something other than that number. */
  readonly corrected: boolean;
}

/**
 * Reads the quantity a line's control is showing.
 *
 * Only a whole number inside {@link MIN_QUANTITY}..{@link MAX_QUANTITY} is taken
 * as typed. Anything else — above the maximum, below the minimum or not a whole
 * number — is corrected to the nearest value the order endpoint accepts, so the
 * field, the cart line, the totals and the request body always carry one number.
 * Text that reads as no number at all is corrected to the minimum rather than to
 * a guess at what was meant.
 *
 * @param rawValue - The control's text, trusted no further than this.
 * @returns The number to commit and whether it differs from the typed reading.
 */
function readQuantity(rawValue: string): QuantityReading {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return { quantity: MIN_QUANTITY, corrected: true };
  }

  const quantity = Math.min(Math.max(Math.trunc(parsed), MIN_QUANTITY), MAX_QUANTITY);

  return { quantity, corrected: quantity !== parsed };
}

/**
 * Explains a quantity the control corrected to the range one line may carry,
 * whether the typed reading was above the maximum, below the minimum or not a
 * whole number.
 *
 * The sentence names the value the field now holds and the range it was held to,
 * and is kept short on purpose: it renders inside the cart line, whose quantity
 * column is sized by its content, so a longer one would narrow the item name
 * beside it.
 *
 * @param quantity - The corrected quantity the field now shows.
 * @returns The sentence to render under the input.
 */
function correctionNotice(quantity: number): string {
  return (
    'Set to ' +
    String(quantity) +
    ': the limit is ' +
    String(MIN_QUANTITY) +
    ' to ' +
    String(MAX_QUANTITY) +
    '.'
  );
}

/**
 * What a line's quantity control says about the number it holds, and whether it
 * holds one. The two kinds are kept apart because only an empty field is a value
 * the order refuses: a correction explains a number the line already took, and
 * marking it invalid would leave a valid control in the invalid state.
 */
interface QuantityFeedback {
  /** The sentence rendered under the input. */
  readonly message: string;
  /** Whether the field holds no quantity the order could carry, which is an empty one. */
  readonly invalid: boolean;
}

/**
 * The sentence for a field that was left empty: the range one line accepts, so
 * the empty state is explained rather than only shown.
 */
const QUANTITY_REQUIRED_MESSAGE =
  `Enter a quantity between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`;

/**
 * Explains a field that was left empty and has been put back to the quantity the
 * cart holds, so the number that reappears is never a silent change.
 *
 * @param quantity - The quantity the field now shows again.
 * @returns The sentence to render under the input.
 */
function restoredNotice(quantity: number): string {
  return `Kept at ${quantity}: enter a quantity between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`;
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
 * centring rule. It shows the shopper's own text while one is being edited and the
 * committed quantity otherwise, so an emptied field stays empty instead of
 * snapping back; losing focus drops that text and the field settles on the
 * quantity the cart holds. A reading outside the range one line may carry is
 * corrected as it is typed, so the number on screen is always the number the cart
 * and the order will hold.
 *
 * The message under the input is announced through `aria-describedby`, and it is
 * one of two kinds: the server's own detail for this line, or the note this view
 * has about the value the control took — the range an empty field accepts, the
 * correction it made, the quantity it restored. Only the empty field and the
 * server's detail mark the line invalid, so a control holding a number the cart
 * accepted never keeps the invalid state a correction produced. Both kinds share
 * the one message node, so the id `aria-describedby` names never changes under an
 * interaction.
 *
 * The row is memoised, so editing one line's quantity re-renders that line only;
 * the view hands it stable callbacks for exactly that reason.
 *
 * @param props - The line, the text being edited, the server's detail or the
 *   view's note about it, and the mutations.
 * @returns The list item for one cart line.
 */
const CartLineRow = memo(function CartLineRow({
  line,
  quantityText,
  quantityDetail,
  quantityFeedback,
  disabled,
  onQuantityChange,
  onQuantityBlur,
  onRemove,
}: CartLineRowProps): JSX.Element {
  const quantityId = 'cart-quantity-' + line.menu_item_id;
  // One message node per line, whatever kind of message it holds: an id that never
  // changes keeps `aria-describedby` pointing at the same element as the field's
  // state changes, which is what makes the polite announcement reliable.
  const messageId = quantityId + '-error';
  const message =
    quantityDetail !== null ? quantityDetail.issue : (quantityFeedback?.message ?? null);
  const invalid = quantityDetail !== null || quantityFeedback?.invalid === true;

  return (
    <li className="cart-line">
      <div className="cart-line__info">
        <span className="cart-line__name">{line.name}</span>
        <span className="cart-line__unit-price">{formatCents(line.price_cents)} each</span>
      </div>

      <div className="cart-line__quantity">
        <div className={invalid ? 'field field--invalid' : 'field'}>
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
            value={quantityText ?? String(line.quantity)}
            disabled={disabled}
            aria-invalid={invalid}
            aria-describedby={message === null ? undefined : messageId}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onQuantityChange(line.menu_item_id, event.target.value);
            }}
            onBlur={() => {
              onQuantityBlur(line.menu_item_id, quantityText ?? String(line.quantity));
            }}
          />
          {message === null ? null : (
            <p
              id={messageId}
              className={invalid ? 'field-error' : 'field__hint'}
              data-field={quantityDetail?.field}
              data-issue={quantityDetail?.issue}
            >
              {message}
            </p>
          )}
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
});

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
  // The synchronous half of the placement guard. React state changes only after a re-render, so a
  // second submission dispatched in the same task would still read `submitting` as false; this ref is
  // set before the request is awaited and cleared when it settles, so one cart yields one order
  // however many times the action is dispatched.
  const submitInFlight = useRef<boolean>(false);
  // The shopper's own text for each line's quantity field while it is being edited, keyed by menu
  // item id. Absent for a line nobody is editing, whose field shows the quantity the cart holds.
  const [quantityTexts, setQuantityTexts] = useState<Record<string, string | undefined>>({});
  // The rendered lines, so a removal can find the row that inherited the position it dropped.
  const linesRef = useRef<HTMLUListElement | null>(null);
  // The page heading, focused when the last line goes and no row is left to receive focus.
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  // Position of the row a removal dropped, recorded by the handler and consumed once by the effect
  // that moves focus, so an unrelated re-render never moves it again.
  const removedIndex = useRef<number | null>(null);
  // The lines as of the latest commit. The removal handler reads the dropped row's position from
  // here rather than from `items`, so it keeps the stable identity the memoised rows rely on and a
  // quantity keystroke re-renders only the line being edited.
  const committedLines = useRef(items);
  // What each line's quantity control says about the number it holds, keyed by menu item id. Absent
  // for a line with nothing to say, so no message outlives the value it describes.
  const [quantityFeedback, setQuantityFeedback] = useState<Record<string, QuantityFeedback | undefined>>({});

  /** Drops the failure a cart or note edit has made stale. */
  const clearFailure = useCallback((): void => {
    setFailure(null);
  }, []);

  // Keeps the removal handler's view of the lines current without making that handler depend on
  // them: a dependency on `items` would give `handleRemove` a new identity on every cart edit and
  // re-render every memoised row, a quantity keystroke included.
  useEffect(() => {
    committedLines.current = items;
  }, [items]);

  /**
   * Forgets a line's in-progress text, so its field shows the committed quantity
   * again. Used when the field loses focus and when the line goes: neither leaves
   * text behind that a later render would show.
   *
   * @param menuItemId - The line whose text is dropped.
   */
  const forgetQuantityText = useCallback((menuItemId: string): void => {
    setQuantityTexts((current) => ({ ...current, [menuItemId]: undefined }));
  }, []);

  /**
   * Drops the message a line's quantity control carries, for the one case where
   * the line goes and no field is left holding the value it described.
   *
   * @param menuItemId - The line whose message is dropped.
   */
  const forgetQuantityFeedback = useCallback((menuItemId: string): void => {
    setQuantityFeedback((current) => ({ ...current, [menuItemId]: undefined }));
  }, []);

  /**
   * Applies a typed quantity to its line, keeping the shopper's own text on screen
   * while it is being edited.
   *
   * The text is held per line so clearing the field never snaps back to the
   * committed number, which the next keystroke would otherwise append to. An
   * emptied field is a value mid-edit rather than a request, so nothing is
   * committed; it is also the one value the field cannot use, so the line says
   * which quantities the order takes while the field holds nothing.
   *
   * Every other reading is corrected here, as it is typed, and the correction is
   * written back into the field and committed as the same number: the field holds
   * the quantity the cart holds, the header count and the totals follow it, and the
   * order that is placed asks for it. A reading that had to change is explained by
   * the message the row renders under the input, which describes a number the cart
   * accepted and so never marks the control invalid.
   *
   * The identity is stable, so a quantity edit re-renders only its own line
   * rather than every memoised `CartLineRow`.
   *
   * @param menuItemId - The line's menu item id.
   * @param rawValue - The control's text, trusted no further than this.
   */
  const handleQuantityChange = useCallback(
    (menuItemId: string, rawValue: string): void => {
      if (rawValue.trim() === '') {
        setQuantityTexts((current) => ({ ...current, [menuItemId]: rawValue }));
        setQuantityFeedback((current) => ({
          ...current,
          [menuItemId]: { message: QUANTITY_REQUIRED_MESSAGE, invalid: true },
        }));
        return;
      }

      const reading = readQuantity(rawValue);
      const correctedText = String(reading.quantity);

      setQuantityTexts((current) => ({ ...current, [menuItemId]: correctedText }));
      setQuantityFeedback((current) => ({
        ...current,
        [menuItemId]: reading.corrected
          ? { message: correctionNotice(reading.quantity), invalid: false }
          : undefined,
      }));

      clearFailure();
      updateQuantity(menuItemId, reading.quantity);
    },
    [clearFailure, updateQuantity],
  );

  /**
   * Drops a line's in-progress text when its field loses focus.
   *
   * A field left empty settles on the quantity the cart holds, and the sentence
   * that replaces the empty-field message names that quantity, so the number that
   * reappears is explained rather than silent. The message is replaced rather than
   * dropped or removed, because both sentences are one line: the row keeps its
   * height between the press and the release of the click that took the focus away,
   * which is how a click on the control beside it would otherwise be lost.
   *
   * The explanation a corrected reading already carries is left untouched: it
   * describes the number the field still holds.
   *
   * @param menuItemId - The line whose field lost focus.
   * @param rawText - The text the field held as it lost focus.
   */
  const handleQuantityBlur = useCallback(
    (menuItemId: string, rawText: string): void => {
      forgetQuantityText(menuItemId);

      if (rawText.trim() !== '') {
        return;
      }

      // The quantity the field settles on is the cart's own, read from the latest
      // committed lines so the handler keeps the stable identity the memoised rows
      // rely on.
      const committed = committedLines.current.find((entry) => entry.menu_item_id === menuItemId);

      if (committed === undefined) {
        return;
      }

      setQuantityFeedback((current) => ({
        ...current,
        [menuItemId]: { message: restoredNotice(committed.quantity), invalid: false },
      }));
    },
    [forgetQuantityText],
  );

  /**
   * Drops a line. Stable for the same reason as the quantity handler, and it
   * forgets the line's in-progress text and its message so neither outlives the
   * line.
   *
   * The dropped row's position is recorded before the cart changes, because that
   * position is what tells the effect below which row inherits focus once the list
   * has been re-rendered.
   *
   * @param menuItemId - The line to drop.
   */
  const handleRemove = useCallback(
    (menuItemId: string): void => {
      removedIndex.current = committedLines.current.findIndex(
        (line) => line.menu_item_id === menuItemId,
      );
      clearFailure();
      forgetQuantityText(menuItemId);
      forgetQuantityFeedback(menuItemId);
      remove(menuItemId);
    },
    [clearFailure, forgetQuantityFeedback, forgetQuantityText, remove],
  );

  /**
   * Moves focus to a stable neighbour once a removal has re-rendered the lines.
   *
   * The Remove control the visitor activated unmounts with its row, which would
   * otherwise leave focus on the document body and the next Tab resuming from an
   * unrelated place. The row that now occupies the dropped position takes focus,
   * so the visitor carries on from the list as it is now; when the dropped row was
   * the last one that position belongs to the row before it, and when no row is
   * left the page heading receives focus, so nobody is stranded on an empty list
   * with focus nowhere.
   *
   * The recorded position is consumed here rather than kept, so a later render — a
   * quantity edit or a failed placement — never moves focus on its own.
   */
  useEffect(() => {
    const index = removedIndex.current;

    if (index === null) {
      return;
    }

    // Consumed either way: a position no line held, which `remove` can report for an id the cart
    // no longer carried, leaves focus untouched rather than pointing at an unrelated row.
    removedIndex.current = null;

    if (index < 0) {
      return;
    }

    const list = linesRef.current;
    const neighbour =
      list === null ? undefined : (list.children[index] ?? list.children[index - 1]);
    const removeButton =
      neighbour === undefined ? null : neighbour.querySelector<HTMLButtonElement>('button');

    if (removeButton !== null) {
      removeButton.focus();

      if (document.activeElement === removeButton) {
        return;
      }
    }

    headingRef.current?.focus();
  }, [items]);

  /**
   * Places the order and moves to its confirmation, or renders why it was not
   * placed.
   *
   * The in-flight guard is the `submitInFlight` ref rather than the `submitting`
   * state that drives the rendering: state does not change until React re-renders,
   * so two submissions dispatched in the same task would both read `false` and both
   * send the order. The ref is set before anything is awaited and cleared once the
   * placement settles, which keeps one cart to one order. The retry control submits
   * this same form, so it is covered by the same guard.
   *
   * @param event - The form submission.
   */
  async function handlePlaceOrder(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (submitInFlight.current || items.length === 0) {
      return;
    }

    submitInFlight.current = true;

    const trimmedNotes = notes.trim();
    setFailure(null);
    setSubmitting(true);

    try {
      const order = await createOrder({
        items: items.map((line) => ({ menu_item_id: line.menu_item_id, quantity: line.quantity })),
        ...(trimmedNotes === '' ? {} : { notes: trimmedNotes }),
      });
      clear();
      // The state flag is what lets the confirmation title itself as the moment of placing; every
      // other arrival at the same address — the history link, a reload, a cold open — is a record.
      navigate('/orders/' + encodeURIComponent(order.id), {
        replace: true,
        state: { orderPlaced: true },
      });
    } catch (error) {
      setFailure(toFailure(error, items));
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="stack" aria-labelledby="cart-title">
        <h1 className="page-title" ref={headingRef} tabIndex={-1} id="cart-title">{CART_TITLE}</h1>
        <div className="state-panel">
          <p>{EMPTY_TITLE}</p>
          <p>{EMPTY_MESSAGE}</p>
          <div className="row">
            <Link className="button" to="/menu">
              {BROWSE_LABEL}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart" aria-labelledby="cart-title">
      <h1 className="page-title" ref={headingRef} tabIndex={-1} id="cart-title">{CART_TITLE}</h1>

      <form className="stack" onSubmit={handlePlaceOrder} aria-busy={submitting} noValidate>
        {failure === null ? null : <OrderFailure failure={failure} submitting={submitting} />}

        <section className="cart-summary" aria-label="Cart lines and total">
          <div className="cart-summary__lines">
            <h2 className="section-title">{countLabel(itemCount, 'item', 'items')} in your cart</h2>
            <ul className="cart-lines" ref={linesRef}>
              {items.map((line, index) => (
                <CartLineRow
                  key={line.menu_item_id}
                  line={line}
                  quantityText={quantityTexts[line.menu_item_id]}
                  quantityDetail={detailAt(failure, index)}
                  quantityFeedback={quantityFeedback[line.menu_item_id] ?? null}
                  disabled={submitting}
                  onQuantityChange={handleQuantityChange}
                  onQuantityBlur={handleQuantityBlur}
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
              {/*
               * The wait is stated on the control itself as well as in the status
               * sentence: the label says in visible text what is happening, aria-busy
               * says it to a reader that does not read the label, and disabled keeps a
               * second click from reaching the handler.
               */}
              <button
                className="button button--block"
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? SUBMITTING_LABEL : PLACE_ORDER_LABEL}
              </button>
            </div>
          </div>
        </section>
      </form>
    </section>
  );
}

export default CartView;
