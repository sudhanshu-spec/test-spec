/**
 * @fileoverview Menu catalog — screen 3 of the ten-screen inventory, served at
 * '/menu'.
 *
 * The catalog lists the available menu items and filters them by category. The
 * selection is the `category` query parameter rather than component state, so a
 * filtered view is deep-linkable: reloading '/menu?category=burgers' restores
 * the same items, and choosing another category rewrites that one key through
 * `setSearchParams`. The path stays '/menu', so the view updates without a
 * route change and without a full page load.
 *
 * Two requests are made and tracked apart: the categories for the filter strip
 * once on mount, and the items on mount and whenever the selected slug changes.
 * A category failure therefore never blanks the item list, and an item failure
 * never empties the strip. Each has its own retry control, and each effect
 * discards the response of a request that a newer one superseded.
 *
 * Boundaries this file keeps:
 * - Money is never computed here. `MenuCard` renders `formatCents(price_cents)`;
 *   no price is summed, rounded or formatted in this module.
 * - The cart is reached only through `useCart()`: `add` puts an item in, and
 *   `items` is what tells the card that answered how many of that item the cart
 *   now holds. Nothing is persisted and no cart request is made (rule R-8);
 *   whether a visitor is signed in is the cart screen's guard, not the catalog's.
 * - `ApiError` is the only failure type (rule R-6). `CATEGORY_NOT_FOUND` means
 *   the filter named no category, so it is reported beside the still-usable
 *   strip with the way back to every item; every other code renders as the
 *   failure panel carrying the API's sentence, its field details and a retry.
 *   A failure's code stays on that panel as `data-code`, for the tests and hooks
 *   that read it, and is never printed: an internal identifier is not something a
 *   shopper can act on.
 * - Failures are announced once. The panels themselves carry no live-region role:
 *   the screen keeps one `role="alert"` region mounted and writes every current
 *   failure into it in reading order, so a load that fails both requests speaks one
 *   sentence rather than two. A retry that fails again changes that sentence, and
 *   the panel's own copy, to say how many retries the request has taken.
 * - An empty array is a normal answer, so an empty category reads as a state
 *   with a next step rather than as an error.
 * - The strip is the only element on the screen that scrolls sideways
 *   (`client/src/styles/catalog.css`). At the 360px minimum width the trailing
 *   categories do not fit, so the chip carrying the selection is scrolled into the
 *   strip's visible box rather than the chips wrapping or the page widening, and
 *   the frame around the strip fades whichever edge holds options that are still
 *   off screen in that direction — the cue that the first or last options are
 *   there to swipe to, so no option is ever cut off without one.
 * - The strip presents itself as one control set, so it behaves as one: a
 *   `role="toolbar"` whose pressed options share a single roving tab stop, with
 *   the arrow keys and Home/End moving focus among them, and Enter, Space or a
 *   click making the selection.
 *
 * Route protection and the route table live in `client/src/main.tsx`: this module
 * renders neither `Layout`, a guard, nor another view.
 *
 * @module client/src/views/MenuCatalogView
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { listCategories, listItems } from '../api/menu';
import type { Category, MenuItem } from '../api/types';
import { MenuCard } from '../components/MenuCard';
import { useCart } from '../state/cart';

/** Query-string key carrying the selected category slug; absent means every item. */
const CATEGORY_QUERY_KEY = 'category';

/** The one control of the strip that clears the filter instead of setting it. */
const ALL_ITEMS_LABEL = 'All items';

/**
 * Gap left between the selected chip and the strip's edge when the strip is
 * scrolled to it: the same 8px step as the strip's own `--space-2` gap, so a pill
 * brought to the edge keeps the breathing room it has beside its neighbours
 * instead of sitting flush against a border it would then look clipped by.
 */
const FILTER_SCROLL_MARGIN = 8;

const PAGE_TITLE = 'Our menu';
const FILTER_LABEL = 'Filter the menu by category';
const LOADING_CATEGORIES_MESSAGE = 'Loading categories…';
const LOADING_ITEMS_MESSAGE = 'Loading the menu…';
const CATEGORY_REQUEST_SUMMARY = 'The menu categories could not be loaded.';
const ITEMS_REQUEST_SUMMARY = 'The menu could not be loaded.';
const CATEGORY_RETRY_SCOPE = ' loading the categories';
const ITEMS_RETRY_SCOPE = ' loading the menu';
const RETRY_LABEL = 'Try again';
const CLEAR_FILTER_LABEL = 'Show all items';
const EMPTY_CATEGORY_TITLE = 'Nothing in this category yet';
const EMPTY_CATEGORY_BODY =
  'No items are available in the category you filtered by. The rest of the menu is still there.';
const EMPTY_CATALOG_TITLE = 'The menu is empty';
const EMPTY_CATALOG_BODY = 'No items are available right now.';
const EMPTY_CATALOG_RETRY_LABEL = 'Check again';

/** The failure a request ended with, flattened to the parts the view renders. */
interface Failure {
  /** The API's code, or `INTERNAL_ERROR` for a throw that never reached it. */
  readonly code: string;
  /** Safe to render: the API's message, never a stack or a secret. */
  readonly message: string;
  /** The API's per-field entries; empty unless it reported a validation failure. */
  readonly details: readonly ApiFieldDetail[];
}

/**
 * Which edges of the filter strip hold options the strip cannot show right now:
 * `start` once it has scrolled away from the first option, `end` while categories
 * remain past its right edge, `both` in the middle of the strip, and `none` for a
 * strip whose options all fit or which is scrolled flush to an end. Each named edge
 * carries a fade, so no option is ever cut off without a cue saying it is there.
 */
type FilterOverflow = 'none' | 'start' | 'end' | 'both';

/** The branch both requests settle into when they fail. */
interface FailedState {
  readonly kind: 'failed';
  readonly failure: Failure;
}

/**
 * What one request settled on. The two requests the catalog makes are tracked
 * with one of these each, which is what keeps their loading, empty and failure
 * states independent of one another.
 */
type LoadState<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly value: readonly T[] }
  | FailedState;

/**
 * Flattens anything a failed request threw into the failure branch of
 * {@link LoadState}.
 *
 * `client/src/api/client.ts` raises `ApiError` for every failed request, so it
 * carries the code, the message and the field details straight through. Any
 * other throw is unexpected and reported as `INTERNAL_ERROR` rather than
 * inventing a code the API never sends.
 *
 * @param error - The value caught from the rejected request.
 * @param fallbackMessage - Rendered when the throw carried no API message.
 * @returns The failed branch for that error.
 */
function toFailure(error: unknown, fallbackMessage: string): FailedState {
  if (error instanceof ApiError) {
    return {
      kind: 'failed',
      failure: { code: error.code, message: error.message || error.code, details: error.details },
    };
  }

  return { kind: 'failed', failure: { code: 'INTERNAL_ERROR', message: fallbackMessage, details: [] } };
}

/** @returns The count with its noun: `1 item`, `8 items`. */
function itemCountLabel(count: number): string {
  return count === 1 ? '1 item' : `${count} items`;
}

/**
 * Names the retries one request has already performed, so a retry that fails again
 * reads differently from the first failure instead of re-rendering the same copy.
 *
 * Undefined until that request has been retried once, which is what leaves the
 * first failure's panel and its announcement exactly as they were.
 *
 * @param retries - How many retries that request has performed.
 * @returns The sentence to append, or undefined before the first retry.
 */
function retryNote(retries: number): string | undefined {
  if (retries < 1) {
    return undefined;
  }

  return retries === 1
    ? 'Tried again, and it is still unavailable.'
    : `Tried again ${retries} times, and it is still unavailable.`;
}

/**
 * Joins the parts of one announcement with a single space, dropping the ones a
 * request did not contribute.
 *
 * @param parts - Sentences and messages, any of which may be absent.
 * @returns The joined text, empty when every part is absent.
 */
function joinSentences(parts: readonly (string | undefined)[]): string {
  return parts.filter((part): part is string => part !== undefined && part !== '').join(' ');
}

/**
 * @param slug - The slug currently selected, if any.
 * @param optionSlug - The slug this option stands for, `undefined` for every item.
 * @returns The classes of one filter option, marked active when it is the selection.
 */
function filterOptionClass(optionSlug: string | undefined, slug: string | undefined): string {
  return optionSlug === slug
    ? 'control category-filter__option category-filter__option--active'
    : 'control category-filter__option';
}

/** Props of {@link RequestFailure}. */
interface RequestFailureProps {
  /** Sentence naming which of the two requests failed. */
  readonly summary: string;
  /** The failure the request ended with. */
  readonly failure: Failure;
  /** Appended, visually hidden, to the retry control so two retries stay distinct. */
  readonly retryScope: string;
  /** Said below the message once this request has been retried; absent before that. */
  readonly note?: string;
  /** Re-runs the failed request. */
  readonly onRetry: () => void;
}

/**
 * Renders one failed request: the sentence naming it, the API's own message and,
 * once that request has been retried, the line reporting how many tries it has
 * taken — all in the shared `.error-summary` — the field details when the API sent
 * any, and the retry control that re-runs that request alone.
 *
 * The panel carries no `role="alert"` of its own: the view keeps one live region
 * mounted and announces every current failure there, so a second alert inside the
 * panel would say the same thing twice. The failure's code rides on the panel as
 * `data-code` — the tests and hooks that need to tell two failures apart read it
 * there — and is never printed as text, so every failure panel on the client reads
 * the same way.
 *
 * @param props - The failure, the sentence naming it, any retry note and the retry action.
 * @returns The failure panel for one request.
 */
function RequestFailure({ summary, failure, retryScope, note, onRetry }: RequestFailureProps): JSX.Element {
  return (
    <div className="stack">
      <div className="error-summary" data-code={failure.code}>
        <p>{summary}</p>
        <p>{failure.message}</p>
        {note === undefined ? null : <p>{note}</p>}
        {failure.details.length > 0 ? (
          <ul>
            {failure.details.map((detail) => (
              <li key={detail.field + ':' + detail.issue} data-field={detail.field} data-issue={detail.issue}>
                {detail.field}: {detail.issue}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="row">
        <button type="button" className="button" onClick={onRetry}>
          {RETRY_LABEL}
          <span className="visually-hidden">{retryScope}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Screen 3: the menu catalog with its category filter.
 *
 * The selection lives in the `category` query parameter, so the filter strip,
 * the deep link and the browser's own back button all describe the same state.
 * Choosing a category rewrites that key through `setSearchParams` and nothing
 * else, so the route never changes and no page is reloaded.
 *
 * Adding an item is the cart's client state and nothing else: the item is added,
 * and the card that was clicked is handed the count the cart now holds of it, so
 * the add is acknowledged in the card itself rather than in a header the grid has
 * scrolled past.
 *
 * @returns The catalog, or one of the loading, empty and failure states.
 */
export function MenuCatalogView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { add, items: cartItems } = useCart();
  const [categoryState, setCategoryState] = useState<LoadState<Category>>({ kind: 'loading' });
  const [itemState, setItemState] = useState<LoadState<MenuItem>>({ kind: 'loading' });
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [itemAttempt, setItemAttempt] = useState(0);
  const [confirmedItemId, setConfirmedItemId] = useState<string | null>(null);
  const [filterOverflow, setFilterOverflow] = useState<FilterOverflow>('none');
  const filterStripRef = useRef<HTMLDivElement | null>(null);

  const selectedSlug = searchParams.get(CATEGORY_QUERY_KEY) ?? undefined;

  /**
   * How many of the item the last add landed on the cart holds now, read from the
   * cart at render time rather than counted per activation: a second add of the
   * same item merges into its line, so the number the card shows is the line's
   * quantity. Undefined when no card is acknowledging an add, and again if that
   * line has since left the cart, so no card can claim an add that is no longer
   * true.
   */
  const confirmedQuantity =
    confirmedItemId === null
      ? undefined
      : cartItems.find((line) => line.menu_item_id === confirmedItemId)?.quantity;

  /**
   * The slug whose option is the strip's one tab stop: the current selection when
   * the strip lists it, and undefined — the "All items" control — when nothing is
   * selected or the selection names no rendered category, which is also the case
   * while the categories are still loading. Falling back that way is what keeps
   * the strip reachable by Tab at every moment.
   */
  const tabStopSlug =
    selectedSlug !== undefined &&
    categoryState.kind === 'loaded' &&
    categoryState.value.some((category) => category.slug === selectedSlug)
      ? selectedSlug
      : undefined;

  /**
   * A slug that names no category is a filter that matched nothing rather than a
   * request that broke: it carries no retry, so it takes no retry note and does
   * not announce the items request as failed.
   */
  const filteredNothing = itemState.kind === 'failed' && itemState.failure.code === 'CATEGORY_NOT_FOUND';

  /** The line saying how many tries a failed request has taken, once it has been retried. */
  const categoryNote = categoryState.kind === 'failed' ? retryNote(categoryAttempt) : undefined;
  const itemNote = itemState.kind === 'failed' && !filteredNothing ? retryNote(itemAttempt) : undefined;

  /**
   * What the screen's one live region says: the failures on screen, in the order
   * they appear, each with the retries it has already survived. A load that fails
   * both requests therefore announces one sentence, and a retry that fails again
   * rewrites this text — which is what makes it announced again.
   */
  const announcement = joinSentences([
    categoryState.kind === 'failed'
      ? joinSentences([CATEGORY_REQUEST_SUMMARY, categoryState.failure.message, categoryNote])
      : undefined,
    itemState.kind === 'failed'
      ? joinSentences([
          filteredNothing ? undefined : ITEMS_REQUEST_SUMMARY,
          itemState.failure.message,
          itemNote,
        ])
      : undefined,
  ]);

  /**
   * Puts the chosen item in the cart and names the card that answered, so that
   * card can confirm the add where the shopper clicked.
   *
   * Held in a `useCallback` because this view subscribes to the cart: every
   * cart mutation re-renders it, and the memoised `MenuCard` must not re-render
   * with the list only because a fresh closure arrived as `onAdd`.
   *
   * @param chosen - The item the activated card belongs to.
   */
  const handleAdd = useCallback((chosen: MenuItem): void => {
    add(chosen);
    setConfirmedItemId(chosen.id);
  }, [add]);

  useEffect(() => {
    let ignore = false;
    setCategoryState({ kind: 'loading' });

    async function loadCategories(): Promise<void> {
      try {
        const categories = await listCategories();

        if (!ignore) {
          setCategoryState({ kind: 'loaded', value: categories });
        }
      } catch (error) {
        if (!ignore) {
          setCategoryState(toFailure(error, CATEGORY_REQUEST_SUMMARY));
        }
      }
    }

    void loadCategories();

    // A response that arrives after the selection or the attempt changed
    // belongs to a request this effect has already replaced.
    return () => {
      ignore = true;
    };
  }, [categoryAttempt]);

  useEffect(() => {
    let ignore = false;
    setItemState({ kind: 'loading' });

    // A reload replaces every card on the screen, so the add the previous cards
    // acknowledged goes with them: the confirmation must not outlive the item it
    // names, which a new selection may not list at all.
    setConfirmedItemId(null);

    async function loadItems(): Promise<void> {
      try {
        const items = await listItems(selectedSlug);

        if (!ignore) {
          setItemState({ kind: 'loaded', value: items });
        }
      } catch (error) {
        if (!ignore) {
          setItemState(toFailure(error, ITEMS_REQUEST_SUMMARY));
        }
      }
    }

    void loadItems();

    return () => {
      ignore = true;
    };
  }, [selectedSlug, itemAttempt]);

  // The strip scrolls sideways instead of wrapping, so at the narrowest supported
  // width the trailing categories sit outside its visible box. A selection made
  // there — by a deep link, or by choosing the last chip after scrolling to it —
  // would then be an empty item list with nothing on screen naming the filter that
  // caused it. Measuring the chip against the strip and moving the strip's own
  // scroll offset is what puts the active chip in view; `scrollIntoView` is not
  // used because it would also scroll the page and can move focus.
  useEffect(() => {
    const strip = filterStripRef.current;

    // Nothing to bring into view until the strip holds the options themselves,
    // and while the strip is absent (a failed categories request renders the
    // failure panel in its place) there is no active chip at all.
    if (strip === null || categoryState.kind !== 'loaded') {
      return;
    }

    const active = strip.querySelector('.category-filter__option--active');

    if (active === null) {
      return;
    }

    const stripBox = strip.getBoundingClientRect();
    const chipBox = active.getBoundingClientRect();
    // Positive when the chip ends past the strip's right edge, or when it starts
    // before the left one; a layout engine that reports no geometry at all — jsdom
    // returns an all-zero rect — leaves both at zero, so neither branch runs.
    const clippedRight = chipBox.right - stripBox.right;
    const clippedLeft = stripBox.left - chipBox.left;

    if (clippedRight > 0) {
      strip.scrollLeft += clippedRight + FILTER_SCROLL_MARGIN;
    } else if (clippedLeft > 0) {
      strip.scrollLeft -= clippedLeft + FILTER_SCROLL_MARGIN;
    }
  }, [selectedSlug, categoryState]);

  // Which edges of the strip hold options it cannot show, and so which edges the
  // frame fades: `end` while categories remain past the right edge, `start` after
  // the strip has been scrolled away from the first option. The measurement runs
  // once as the effect mounts, and again whenever the strip scrolls or is resized —
  // the categories arriving change both its content width and, on a narrow screen,
  // whether it overflows at all. It measures synchronously because a test
  // environment's `ResizeObserver` stub never invokes its callback: without that
  // first call the cue would never appear there, and on mount it is the only
  // measurement a short page ever takes.
  useEffect(() => {
    const strip = filterStripRef.current;

    function measure(): void {
      const hiddenStart = strip !== null && strip.scrollLeft > 1;
      const hiddenEnd = strip !== null && strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 1;
      const next: FilterOverflow = hiddenStart
        ? hiddenEnd
          ? 'both'
          : 'start'
        : hiddenEnd
          ? 'end'
          : 'none';

      // One state write per real change: a scroll event fires for every pixel of
      // travel and must not re-render the item cards beside the strip.
      setFilterOverflow((current) => (current === next ? current : next));
    }

    measure();

    // A failed categories request renders its panel in the strip's place, so there
    // is no box to measure and nothing to listen to until a retry brings it back.
    if (strip === null) {
      return;
    }

    strip.addEventListener('scroll', measure, { passive: true });
    // Guarded because the observer is not universal in the environments this view
    // is rendered in; the synchronous measurement above already covers that case.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(strip);

    return () => {
      strip.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [categoryState]);

  /**
   * Writes the selection into the query string, or removes the key for every
   * item. The path, and therefore the route, never changes.
   *
   * @param slug - Category to filter by, or undefined for every available item.
   */
  function selectCategory(slug: string | undefined): void {
    const next = new URLSearchParams(searchParams);

    if (slug === undefined) {
      next.delete(CATEGORY_QUERY_KEY);
    } else {
      next.set(CATEGORY_QUERY_KEY, slug);
    }

    setSearchParams(next);
  }

  function retryCategories(): void {
    setCategoryAttempt((attempt) => attempt + 1);
  }

  function retryItems(): void {
    setItemAttempt((attempt) => attempt + 1);
  }

  /**
   * Moves focus among the strip's options with the arrow keys and Home/End, the
   * model a toolbar promises. Focus only moves: the selection changes on Enter,
   * Space or a click, so arrowing past a chip never re-filters the list under the
   * shopper. Every other key is left to the option that received it.
   *
   * @param event - The key press on the strip or on one of its options.
   */
  function handleFilterKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('.category-filter__option'),
    );

    if (options.length === 0) {
      return;
    }

    // The option the press came from, so a synthetic event that never took focus
    // still moves from the chip it was dispatched on rather than from nothing.
    const origin = event.target instanceof Element ? event.target.closest('.category-filter__option') : null;
    const current = options.findIndex((option) => option === origin);
    const last = options.length - 1;
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        // Off one end lands on the other: the strip is a ring of options, not a list
        // with an edge the focus can fall off.
        next = current < 0 || current === last ? 0 : current + 1;
        break;
      case 'ArrowLeft':
        next = current < 0 ? last : (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    const option = options[next];

    if (option !== undefined) {
      option.focus();
    }
  }

  /**
   * @returns The "All items" control followed by one control per category. Exactly
   *   one of them is the strip's tab stop — the selected chip, or "All items" when
   *   the selection names no rendered category — and the rest sit at `tabIndex`
   *   -1 until the arrow keys move focus to them. The categories' own failure is
   *   not rendered here: a panel placed inside the strip would be squeezed to the
   *   strip's width, so it is rendered in the catalog column instead, at the width
   *   of every other panel on the screen.
   */
  function renderFilterOptions(): JSX.Element {
    return (
      <>
        <button
          type="button"
          className={filterOptionClass(undefined, selectedSlug)}
          aria-pressed={selectedSlug === undefined}
          tabIndex={tabStopSlug === undefined ? 0 : -1}
          onClick={() => {
            selectCategory(undefined);
          }}
        >
          {ALL_ITEMS_LABEL}
        </button>

        {categoryState.kind === 'loading' ? (
          <p className="field__hint">{LOADING_CATEGORIES_MESSAGE}</p>
        ) : null}

        {categoryState.kind === 'loaded'
          ? categoryState.value.map((category) => (
              <button
                key={category.id}
                type="button"
                className={filterOptionClass(category.slug, selectedSlug)}
                aria-pressed={category.slug === selectedSlug}
                tabIndex={category.slug === tabStopSlug ? 0 : -1}
                onClick={() => {
                  selectCategory(category.slug);
                }}
              >
                {category.name}
              </button>
            ))
          : null}
      </>
    );
  }

  /**
   * @returns The empty state: the way back to every item when a filter is
   *   active, and a way to ask again when the whole catalog is empty.
   */
  function renderEmptyState(): JSX.Element {
    if (selectedSlug !== undefined) {
      return (
        <div className="state-panel">
          <p>{EMPTY_CATEGORY_TITLE}</p>
          <p>{EMPTY_CATEGORY_BODY}</p>
          <div className="row">
            <Link className="button" to="/menu">
              {CLEAR_FILTER_LABEL}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="state-panel">
        <p>{EMPTY_CATALOG_TITLE}</p>
        <p>{EMPTY_CATALOG_BODY}</p>
        <div className="row">
          <button type="button" className="button" onClick={retryItems}>
            {EMPTY_CATALOG_RETRY_LABEL}
          </button>
        </div>
      </div>
    );
  }

  /** @returns The item list, or the loading, empty and failure states of it. */
  function renderItems(): JSX.Element {
    if (itemState.kind === 'loading') {
      return (
        <p className="state-panel" role="status">
          {LOADING_ITEMS_MESSAGE}
        </p>
      );
    }

    if (itemState.kind === 'failed') {
      // A slug that names no category is a filter that matched nothing, not
      // a broken request: the strip stays usable and the way back to every
      // item sits beside the message. Its panel carries no live-region role —
      // the screen's one region announces it with every other failure.
      if (filteredNothing) {
        return (
          <div className="stack">
            <div className="error-summary" data-code={itemState.failure.code}>
              <p>{itemState.failure.message}</p>
            </div>
            <div className="row">
              <Link className="button" to="/menu">
                {CLEAR_FILTER_LABEL}
              </Link>
            </div>
          </div>
        );
      }

      return (
        <RequestFailure
          summary={ITEMS_REQUEST_SUMMARY}
          failure={itemState.failure}
          retryScope={ITEMS_RETRY_SCOPE}
          note={itemNote}
          onRetry={retryItems}
        />
      );
    }

    if (itemState.value.length === 0) {
      return renderEmptyState();
    }

    return (
      <>
        <h2 className="section-title">{itemCountLabel(itemState.value.length)} available</h2>
        <div className="catalog-grid">
          {/*
           * One card carries the acknowledgement: the one whose item the last add
           * landed on. Every other card is handed `undefined`, which is what keeps
           * the memoised list from re-rendering on a cart change it has nothing to
           * say about.
           */}
          {itemState.value.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              onAdd={handleAdd}
              addedQuantity={item.id === confirmedItemId ? confirmedQuantity : undefined}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      {/*
       * One live region for the whole screen, mounted from the first render so the
       * text it later holds is an update to a region already on the page. Every
       * failure the view is showing is written here in reading order, which is what
       * makes a load that fails both requests one announcement instead of two.
       */}
      <p className="visually-hidden" role="alert">
        {announcement}
      </p>

      <h1 className="page-title" tabIndex={-1} id="catalog-title">
        {PAGE_TITLE}
      </h1>

      {categoryState.kind === 'failed' ? (
        <RequestFailure
          summary={CATEGORY_REQUEST_SUMMARY}
          failure={categoryState.failure}
          retryScope={CATEGORY_RETRY_SCOPE}
          note={categoryNote}
          onRetry={retryCategories}
        />
      ) : (
        /*
         * The cues live on the frame, a sibling of the strip rather than a child of
         * it: the strip is the scroll container, so a mask inside it would scroll
         * away with the very content it has to sit over, while the frame stays put
         * on the visible edges. `data-overflow` names the edges that hold options
         * the strip cannot show, and each of those edges carries a fade.
         */
        <div className="category-filter-frame" data-overflow={filterOverflow}>
          <div
            className="category-filter"
            role="toolbar"
            aria-label={FILTER_LABEL}
            aria-orientation="horizontal"
            aria-busy={categoryState.kind === 'loading'}
            onKeyDown={handleFilterKeyDown}
            ref={filterStripRef}
          >
            {renderFilterOptions()}
          </div>
        </div>
      )}

      {renderItems()}
    </section>
  );
}

export default MenuCatalogView;
