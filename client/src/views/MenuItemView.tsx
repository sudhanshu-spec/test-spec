/**
 * @fileoverview Menu item detail — screen 4 of the ten-screen inventory, served
 * at `/menu/:id` from the route table owned by `client/src/main.tsx`.
 *
 * The view reads exactly one item through `client/src/api/menu`'s `getItem` and
 * shows it in full: the name, the description unclamped, the category it belongs
 * to, a visible availability state and the price. The image and the compact card
 * summary come from `MenuCard`, rendered here with its own action suppressed
 * (`showAction={false}`) and its name at heading level `2`, so this view owns the
 * one real add action and the screen reads `h1` → `h2` with no skipped level.
 *
 * Money is the server's alone (rule R-3). The price shown is
 * `item.price_cents` passed through `formatCents`; nothing on this screen sums,
 * rounds or re-derives an amount, and nothing it sends onward carries a price —
 * `useCart().add` receives the item and a quantity, and the order endpoint prices
 * the order from stored menu data.
 *
 * Four states are explicit: loading, populated, empty (an item that cannot be
 * read) and failure, which offers a retry. The API answers an unknown id with
 * `MENU_ITEM_NOT_FOUND` and an id that is not a UUID with `VALIDATION_ERROR`;
 * both mean "there is nothing here to show", so both render the same not-found
 * state with the catalog as the positive next step. Every other failure is
 * reported through the API's own `code` and `message`.
 *
 * @module client/src/views/MenuItemView
 */

import type { ChangeEvent, JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { formatCents } from '../api/format';
import { getItem } from '../api/menu';
import type { MenuItem } from '../api/types';
import { NumberField } from '../components/FormControls';
import { MenuCard } from '../components/MenuCard';
import { useCart } from '../state/cart';

/** Fewest of an item one order line may carry; also the control's starting value. */
const MIN_QUANTITY = 1;

/** Most of an item one order line may carry, matching the cart's and the server's limit. */
const MAX_QUANTITY = 20;

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
  | { readonly kind: 'item'; readonly item: MenuItem }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly code: string; readonly message: string };

/** Props of the internal {@link ItemDetail}. */
interface ItemDetailProps {
  /** The item to present, exactly as the API returned it. */
  readonly item: MenuItem;
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

  return { code: 'INTERNAL_ERROR', message: 'The item could not be loaded.' };
}

/** The quantity the control reads as, and whether it had to be corrected. */
interface QuantityReading {
  /** The whole number to use, inside {@link MIN_QUANTITY}..{@link MAX_QUANTITY}. */
  readonly quantity: number;
  /** Whether the text read as something other than that number. */
  readonly corrected: boolean;
}

/**
 * Reads a requested quantity as the whole numbers an order line accepts.
 *
 * Only a whole number inside {@link MIN_QUANTITY}..{@link MAX_QUANTITY} is taken
 * as typed; anything else is corrected to the nearest value the order endpoint
 * accepts, so the field always shows the quantity that will be added. Text that
 * reads as no number at all is corrected to the minimum rather than to a guess at
 * what was meant.
 *
 * @param value - The text to read a quantity from, trusted no further than this.
 * @returns That quantity as a whole number within the accepted range, and whether
 * it differs from the typed reading.
 */
function readQuantity(value: string): QuantityReading {
  const parsed = Number(value);

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
 * The populated state: one item in full, with the quantity selector and the one
 * real add-to-cart action.
 *
 * Mounted with a key of the item's id, so a different item starts again from a
 * quantity of one and no confirmation. Adding does not navigate: the cart is a
 * header affordance, so the confirmation is announced in place and links there.
 *
 * The quantity field corrects a reading an order line would not accept as it is
 * typed and explains the correction, so the number the field shows is the number
 * the confirmation and the cart carry.
 *
 * @param props - The item to present.
 * @returns The item detail for one menu item.
 */
function ItemDetail({ item }: ItemDetailProps): JSX.Element {
  const { add } = useCart();
  // The field holds the shopper's own text while it is being edited, so clearing
  // it never snaps back to a value that the next keystroke would append to. A
  // reading the order line would not accept is corrected into that text as it is
  // typed, and the notice explains why, so what the field shows is what is added.
  const [quantityText, setQuantityText] = useState<string>(String(MIN_QUANTITY));
  const [quantityNotice, setQuantityNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string>('');
  const confirmationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (confirmation === '') {
      return;
    }

    // The add action can sit at the bottom of a narrow viewport, where a message
    // rendered below it would never be seen. Bringing the live region into view is
    // what makes the add visibly acknowledged, not only announced to a screen
    // reader. It is centred rather than brought to the nearest edge, because the
    // region is taller than one line once the cart link sits beside the message and
    // a nearest-edge scroll can leave its last pixel outside the viewport.
    confirmationRef.current?.scrollIntoView?.({ block: 'center' });
  }, [confirmation]);

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const rawValue = event.currentTarget.value;
    // A confirmation describes the quantity that was added, so changing the
    // quantity retracts it rather than leaving a stale count on screen.
    setConfirmation('');

    if (rawValue.trim() === '') {
      // An emptied field is a value mid-edit rather than a quantity, so it stays
      // empty instead of snapping to a number the next keystroke would extend.
      setQuantityText(rawValue);
      setQuantityNotice(null);
      return;
    }

    const reading = readQuantity(rawValue);
    setQuantityText(String(reading.quantity));
    setQuantityNotice(reading.corrected ? correctionNotice(reading.quantity) : null);
  };

  const handleQuantityBlur = (): void => {
    setQuantityText(String(readQuantity(quantityText).quantity));
    // The notice is kept here: it describes the number the field still holds, and
    // dropping it as the field loses focus would move the add control between the
    // press and the release of the click that took the focus away, losing that click.
  };

  const handleAdd = (): void => {
    if (!item.is_available) {
      return;
    }

    const quantity = readQuantity(quantityText).quantity;
    setQuantityText(String(quantity));
    add(item, quantity);
    setConfirmation(`${quantity} × ${item.name} added to your cart.`);
  };

  return (
    <div className="stack">
      <div className="row">
        <Link className="button button--secondary" to="/menu">
          Back to menu
        </Link>
      </div>

      <article className="item-detail" aria-labelledby="menu-item-name">
        <h1 className="page-title" id="menu-item-name">
          {item.name}
        </h1>

        <div className="item-detail__body">
          <div className="item-detail__meta">
            <span className="badge">{item.category.name}</span>
            <span className={item.is_available ? 'badge badge--available' : 'badge badge--unavailable'}>
              {item.is_available ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <p className="item-detail__price">{formatCents(item.price_cents)}</p>
          <p>{item.description}</p>
        </div>

        <MenuCard item={item} headingLevel={2} showAction={false} />

        <div className="item-detail__actions">
          <NumberField
            id="menu-item-quantity"
            label="Quantity"
            min={MIN_QUANTITY}
            max={MAX_QUANTITY}
            step={1}
            value={quantityText}
            onChange={handleQuantityChange}
            onBlur={handleQuantityBlur}
            hint={`Between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`}
            error={quantityNotice}
          />
          <button type="button" className="button" disabled={!item.is_available} onClick={handleAdd}>
            Add to cart
          </button>
        </div>

        {/*
         * The live region is present before it has anything to say, which is what
         * makes its text reliably announced; only the message inside it is
         * conditional. It scrolls itself into view when a message arrives.
         */}
        <div className="row" role="status" ref={confirmationRef}>
          {confirmation === '' ? null : (
            <>
              <p className="badge badge--available">{confirmation}</p>
              <Link className="button button--secondary" to="/cart">
                View cart
              </Link>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

/**
 * Screen 4 of the ten-screen inventory: the detail of the item named by the
 * route's `:id`.
 *
 * The id-keyed effect is the only data access. An ignore flag on cleanup stops a
 * response from a superseded request from overwriting the state of a newer one,
 * and the attempt counter re-runs the same effect when the retry control is used.
 * A route with no id at all has nothing to fetch, so it renders the not-found
 * state without a request.
 *
 * @returns The item detail, or one of the loading, not-found and failure states.
 */
export function MenuItemView(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>(() =>
    id === undefined ? { kind: 'not-found' } : { kind: 'loading' },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (id === undefined) {
      // Keeping the existing object when it is already the not-found state
      // stops the effect from re-rendering for nothing.
      setState((current) => (current.kind === 'not-found' ? current : { kind: 'not-found' }));
      return;
    }

    const itemId: string = id;
    let ignore = false;
    setState({ kind: 'loading' });

    async function load(): Promise<void> {
      try {
        const item = await getItem(itemId);

        if (!ignore) {
          setState({ kind: 'item', item });
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        const failure = toFailure(error);
        // An id that names no item and an id that is not a UUID both leave
        // nothing to show, so both render the same not-found state.
        const missing = failure.code === 'MENU_ITEM_NOT_FOUND' || failure.code === 'VALIDATION_ERROR';

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
        Loading this menu item…
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <div className="stack">
        <h1 className="page-title">Item not found</h1>
        <div className="state-panel">
          <p>We could not find that item on the menu. It may have been taken off the menu, or the link may be incomplete.</p>
          <div className="row">
            <Link className="button" to="/menu">
              Back to the menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="stack">
        <h1 className="page-title">Menu item</h1>
        <div className="error-summary" role="alert" data-code={state.code}>
          <p>{state.message}</p>
        </div>
        <div className="row">
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
          <Link className="button button--secondary" to="/menu">
            Back to the menu
          </Link>
        </div>
      </div>
    );
  }

  return <ItemDetail key={state.item.id} item={state.item} />;
}

export default MenuItemView;
