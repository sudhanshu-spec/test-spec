/**
 * @fileoverview Menu card — one presentational card for a single menu item.
 *
 * This module has exactly one responsibility: render a `MenuItem` the API
 * returned. It loads no data, holds no state, mutates no cart and formats no
 * money of its own — the price reaches the screen through `formatCents`, the
 * client's single money formatter, and the add-to-cart action arrives as the
 * `onAdd` callback so the card never imports the cart or the session.
 *
 * One view consumes it: `MenuCatalogView`, inside the catalog grid. It therefore
 * assumes nothing about its own width, grid placement or number of visible lines;
 * the responsive rules and the 44x44px touch target live in global.css and
 * catalog.css, and this file contributes no inline style and no media query.
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
 * is omitted the button is still rendered, in its disabled state, so the
 * affordance never disappears.
 *
 * `addedQuantity` is optional for the same reason, and is data like every other
 * prop: the view reads the cart and hands the count down, so the card can confirm
 * an add without importing the cart, holding state or waiting on a request.
 */
export interface MenuCardProps {
  /** The item to render, exactly in the shape the API returns. */
  item: MenuItem;
  /** Invoked with the item when the enabled add-to-cart button is activated. */
  onAdd?: (item: MenuItem) => void;
  /**
   * How many of this item the cart holds after the add this card answered, or
   * absent when the card has nothing to acknowledge. Defined, the card confirms
   * the add in place: a status line naming the item and that quantity beside the
   * way to the cart.
   */
  addedQuantity?: number;
}

/**
 * Renders one menu item as a card: image (or a decorative placeholder), a
 * linked name, the description, the category, the formatted price and a footer
 * carrying the availability label beside the add-to-cart action.
 *
 * The name is an `h3`, because the catalog groups its cards under an `h2`
 * section heading; no level is skipped.
 *
 * An unavailable item is indicated rather than hidden: the label reads
 * `Unavailable` and the add button is disabled, so the affordance never
 * disappears and availability is never conveyed by colour alone.
 *
 * The component is memoised, so a list that re-renders for a reason of its own
 * only re-renders the cards whose props actually changed.
 *
 * @param props - The item to render, the optional add-to-cart callback and the
 *   optional count the cart holds of it.
 * @returns The card element for one menu item.
 */
export const MenuCard = memo(function MenuCard({
  item,
  onAdd,
  addedQuantity,
}: MenuCardProps): JSX.Element {
  const canAdd = item.is_available && onAdd !== undefined;

  return (
    <article className="card catalog-card">
      {/*
       * `image_url` is `string | null`. A null URL never renders an `<img>` with
       * an empty `src`, which browsers would resolve into a second request for
       * the page itself. It renders the placeholder band instead: a decorative
       * glyph beside a visible label, so the largest surface on the card says
       * what it is rather than reading as an empty panel. Both are hidden from
       * assistive technology — a missing photograph carries no information the
       * name, category and price below do not already give.
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
        >
          <svg
            className="catalog-card__placeholder-glyph"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="3" y="4.5" width="18" height="15" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M4.5 17.5 9.5 13l3 2.5 2.5-2 4.5 4" />
          </svg>
          <span>No photo</span>
        </div>
      )}

      <div className="catalog-card__body">
        <h3 className="catalog-card__title">
          <Link to={`/menu/${item.id}`}>{item.name}</Link>
        </h3>
        <p className="catalog-card__description">{item.description}</p>
        <p className="catalog-card__meta">{item.category.name}</p>
        <p className="catalog-card__price">{formatCents(item.price_cents)}</p>
      </div>

      {/*
       * The acknowledgement belongs to the card that was acted on, so it is on screen
       * wherever the shopper clicked — a grid of twelve cards is taller than the viewport,
       * and the header's cart count has scrolled away by the time a later row is reached.
       * It is the item detail's own pattern: one status region naming the item and the
       * quantity the cart now holds, beside the way to the cart. The cart is client state,
       * so nothing here waits on a request (rule R-8), and the region is rendered only
       * when a count arrives, which keeps the catalog free of a second live region.
       *
       * It sits between the body and the footer, never after the footer: the footer has to
       * stay the card's last region, because it is the region the equal-height alignment
       * depends on. A row of cards is stretched to one height and the body, the flexible
       * child, absorbs the difference, so every footer ends up at the bottom of its own
       * card, on one baseline. Anything following the footer takes that space instead and
       * lifts the confirming card's footer by its own height, out of line with the card
       * beside it.
       */}
      {addedQuantity === undefined ? null : (
        <div className="row" role="status">
          <p className="badge badge--available">
            {addedQuantity} × {item.name} added to your cart.
          </p>
          <Link className="button button--secondary" to="/cart">
            View cart
          </Link>
        </div>
      )}

      <div className="catalog-card__footer">
        <p className={item.is_available ? 'badge badge--available' : 'badge badge--unavailable'}>
          {item.is_available ? 'Available' : 'Unavailable'}
        </p>
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
      </div>
    </article>
  );
});
