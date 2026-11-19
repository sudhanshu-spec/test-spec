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
 * - The cart is only ever `useCart().add`. Nothing is persisted and no cart
 *   request is made (rule R-8); whether a visitor is signed in is the cart
 *   screen's guard, not the catalog's.
 * - `ApiError` is the only failure type (rule R-6). `CATEGORY_NOT_FOUND` means
 *   the filter named no category, so it is reported beside the still-usable
 *   strip with the way back to every item; every other code renders as the
 *   failure panel carrying its code, its field details and a retry.
 * - An empty array is a normal answer, so an empty category reads as a state
 *   with a next step rather than as an error.
 *
 * Route protection and the route table live in `client/src/main.tsx`: this module
 * renders neither `Layout`, a guard, nor another view.
 *
 * @module client/src/views/MenuCatalogView
 */

import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
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
  /** Re-runs the failed request. */
  readonly onRetry: () => void;
}

/**
 * Renders one failed request: the API's code and message in the shared
 * `.error-summary`, the field details when the API sent any, and the retry
 * control that re-runs that request alone.
 *
 * @param props - The failure, the sentence naming it and the retry action.
 * @returns The failure panel for one request.
 */
function RequestFailure({ summary, failure, retryScope, onRetry }: RequestFailureProps): JSX.Element {
  return (
    <div className="stack">
      <div className="error-summary" role="alert" data-code={failure.code}>
        <p>{summary}</p>
        <p>{failure.message}</p>
        {failure.details.length > 0 ? (
          <ul>
            {failure.details.map((detail) => (
              <li key={detail.field + ':' + detail.issue} data-field={detail.field} data-issue={detail.issue}>
                {detail.field}: {detail.issue}
              </li>
            ))}
          </ul>
        ) : null}
        <p>
          <span className="badge">{failure.code}</span>
        </p>
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
 * @returns The catalog, or one of the loading, empty and failure states.
 */
export function MenuCatalogView(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { add } = useCart();
  const [categoryState, setCategoryState] = useState<LoadState<Category>>({ kind: 'loading' });
  const [itemState, setItemState] = useState<LoadState<MenuItem>>({ kind: 'loading' });
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [itemAttempt, setItemAttempt] = useState(0);

  const selectedSlug = searchParams.get(CATEGORY_QUERY_KEY) ?? undefined;

  /**
   * Puts the chosen item in the cart.
   *
   * Held in a `useCallback` because this view subscribes to the cart: every
   * cart mutation re-renders it, and the memoised `MenuCard` must not re-render
   * with the list only because a fresh closure arrived as `onAdd`.
   *
   * @param chosen - The item the activated card belongs to.
   */
  const handleAdd = useCallback((chosen: MenuItem): void => {
    add(chosen);
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
   * @returns The "All items" control followed by one control per category, or
   *   the failure panel when the categories themselves could not be read.
   */
  function renderFilterOptions(): JSX.Element {
    if (categoryState.kind === 'failed') {
      return (
        <RequestFailure
          summary={CATEGORY_REQUEST_SUMMARY}
          failure={categoryState.failure}
          retryScope={CATEGORY_RETRY_SCOPE}
          onRetry={retryCategories}
        />
      );
    }

    return (
      <>
        <button
          type="button"
          className={filterOptionClass(undefined, selectedSlug)}
          aria-pressed={selectedSlug === undefined}
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
        <div className="empty-state stack">
          <h2 className="section-title">{EMPTY_CATEGORY_TITLE}</h2>
          <p>{EMPTY_CATEGORY_BODY}</p>
          <p>
            <Link className="button" to="/menu">
              {CLEAR_FILTER_LABEL}
            </Link>
          </p>
        </div>
      );
    }

    return (
      <div className="empty-state stack">
        <h2 className="section-title">{EMPTY_CATALOG_TITLE}</h2>
        <p>{EMPTY_CATALOG_BODY}</p>
        <p>
          <button type="button" className="button" onClick={retryItems}>
            {EMPTY_CATALOG_RETRY_LABEL}
          </button>
        </p>
      </div>
    );
  }

  /** @returns The item list, or the loading, empty and failure states of it. */
  function renderItems(): JSX.Element {
    if (itemState.kind === 'loading') {
      return (
        <p className="card" role="status">
          {LOADING_ITEMS_MESSAGE}
        </p>
      );
    }

    if (itemState.kind === 'failed') {
      // A slug that names no category is a filter that matched nothing, not
      // a broken request: the strip stays usable and the way back to every
      // item sits beside the message.
      if (itemState.failure.code === 'CATEGORY_NOT_FOUND') {
        return (
          <div className="stack">
            <div className="error-summary" role="alert" data-code={itemState.failure.code}>
              <p>{itemState.failure.message}</p>
              <p>
                <span className="badge">{itemState.failure.code}</span>
              </p>
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
          {itemState.value.map((item) => (
            <MenuCard key={item.id} item={item} onAdd={handleAdd} />
          ))}
        </div>
      </>
    );
  }

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <h1 className="page-title" id="catalog-title">
        {PAGE_TITLE}
      </h1>

      <div
        className="category-filter"
        role="group"
        aria-label={FILTER_LABEL}
        aria-busy={categoryState.kind === 'loading'}
      >
        {renderFilterOptions()}
      </div>

      {renderItems()}
    </section>
  );
}

export default MenuCatalogView;
