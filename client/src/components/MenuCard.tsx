/**
 * @fileoverview Menu card — one presentational card for a single menu item.
 *
 * This module has exactly one responsibility: render a `MenuItem` the API
 * returned. It loads no data, holds no state, mutates no cart and formats no
 * money of its own — the price reaches the screen through `formatCents`, the
 * client's single money formatter, and the add-to-cart action arrives as the
 * `onAdd` callback so the card never imports the cart or the session.
 *
 * Two views consume it: `MenuCatalogView` inside the catalog grid, and
 * `MenuItemView` in the item-detail context. It therefore assumes nothing about
 * its own width, grid placement or number of visible lines; the responsive
 * rules and the 44x44px touch target live in global.css and catalog.css, and
 * this file contributes no inline style and no media query.
 *
 * The item name links to `/menu/:id` through `Link`, so every render — including
 * a test render — needs a router context. Wrap it in `MemoryRouter` in tests.
 *
 * @module client/src/components/MenuCard
 */

import type { JSX } from 'react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import { formatCents } from '../api/format';
import type { MenuItem } from '../api/types';

/**
 * Props of {@link MenuCard}.
 *
 * `onAdd` is optional on purpose: whether an unauthenticated visitor may add to
 * the cart is the view's decision, expressed by passing or omitting it. When it
 * is omitted the button is still rendered, in its disabled state, unless
 * `showAction` suppresses the action altogether.
 */
export interface MenuCardProps {
  /** The item to render, exactly in the shape the API returns. */
  item: MenuItem;
  /** Invoked with the item when the enabled add-to-cart button is activated. */
  onAdd?: (item: MenuItem) => void;
  /**
   * Heading level the item name is rendered at: `3` (the default) inside the
   * catalog grid, whose own group heading is an `h2`, and `2` where the card
   * sits directly under a screen's `h1`, so no level is skipped.
   */
  headingLevel?: 2 | 3;
  /**
   * Whether the card renders its own add-to-cart action. Defaults to `true`.
   *
   * A view that owns the one real add action itself — the item detail, with its
   * quantity control — passes `false` so the screen does not carry a second
   * control with the same accessible name. The availability label stays in the
   * footer either way.
   */
  showAction?: boolean;
}

/**
 * Renders one menu item as a card: image (or a decorative placeholder), a
 * linked name, the description, the category, the formatted price and a footer
 * carrying the availability label beside the add-to-cart action.
 *
 * An unavailable item is indicated rather than hidden: the label reads
 * `Unavailable` and the add button is disabled, so the affordance never
 * disappears and availability is never conveyed by colour alone.
 *
 * The component is memoised, so a list that re-renders for a reason of its own
 * only re-renders the cards whose props actually changed.
 *
 * @param props - The item to render, the optional add-to-cart callback, the
 * heading level of the name and whether the card renders its own action.
 * @returns The card element for one menu item.
 */
export const MenuCard = memo(function MenuCard({
  item,
  onAdd,
  headingLevel = 3,
  showAction = true,
}: MenuCardProps): JSX.Element {
  const canAdd = item.is_available && onAdd !== undefined;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <article className="card catalog-card">
      {/*
       * `image_url` is `string | null`. An empty or null URL renders the
       * decorative placeholder block instead of an `<img>` with an empty
       * `src`, which browsers would resolve into a second request for the
       * page itself.
       */}
      {item.image_url ? (
        <div className="catalog-card__media">
          <img
            className="catalog-card__image"
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div
          className="catalog-card__media catalog-card__image catalog-card__image--placeholder"
          aria-hidden="true"
        />
      )}

      <div className="catalog-card__body">
        <Heading className="catalog-card__title">
          <Link to={`/menu/${item.id}`}>{item.name}</Link>
        </Heading>
        <p className="catalog-card__description">{item.description}</p>
        <p className="catalog-card__meta">{item.category.name}</p>
        <p className="catalog-card__price">{formatCents(item.price_cents)}</p>
      </div>

      <div className="catalog-card__footer">
        <p className={item.is_available ? 'badge badge--available' : 'badge badge--unavailable'}>
          {item.is_available ? 'Available' : 'Unavailable'}
        </p>
        {showAction ? (
          <div className="catalog-card__actions">
            <button
              type="button"
              className="button"
              disabled={!canAdd}
              onClick={() => onAdd?.(item)}
            >
              Add to cart
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
});
