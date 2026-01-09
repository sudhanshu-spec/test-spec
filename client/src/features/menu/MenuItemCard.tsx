/**
 * @fileoverview Menu item card component for displaying individual menu items.
 * Handles rendering of menu item information including name, description, price,
 * image, and add-to-cart functionality with proper accessibility support.
 * @module features/menu/MenuItemCard
 */

import { useState, useCallback } from 'react';
import { MenuItem } from './hooks/useMenu';

/**
 * Props interface for the MenuItemCard component.
 * @interface MenuItemCardProps
 */
export interface MenuItemCardProps {
  /** The menu item data to display */
  item: MenuItem;
  /** Optional callback function called when user clicks add to cart button */
  onAddToCart?: (item: MenuItem) => void;
}

/**
 * Fallback placeholder image data URL for broken or missing images.
 * Creates a simple gray placeholder with a food icon representation.
 */
const FALLBACK_IMAGE_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDcwQzg4LjU0IDcwIDc5IDc5LjU0IDc5IDkxQzc5IDEwMi40NiA4OC41NCAxMTIgMTAwIDExMkMxMTEuNDYgMTEyIDEyMSAxMDIuNDYgMTIxIDkxQzEyMSA3OS41NCAxMTEuNDYgNzAgMTAwIDcwWk0xMDAgMTA0QzkxLjE2IDEwNCA4NyA5OS44NCA4NyA5MUM4NyA4Mi4xNiA5MS4xNiA3OCAxMDAgNzhDMTA4Ljg0IDc4IDExMyA4Mi4xNiAxMTMgOTFDMTEzIDk5Ljg0IDEwOC44NCAxMDQgMTAwIDEwNFpNNzAgMTIwSDEzMFYxMzBINzBWMTIwWiIgZmlsbD0iIzlDQTNBRiIvPjwvc3ZnPg==';

/**
 * Image loading state type definition.
 * @typedef {'loading' | 'loaded' | 'error'} ImageLoadState
 */
type ImageLoadState = 'loading' | 'loaded' | 'error';

/**
 * Formats a price number to a currency string display format.
 * @param price - The price value in dollars
 * @returns Formatted price string (e.g., "$12.99")
 */
function formatPrice(price: number): string {
  // Handle edge case of zero or negative prices
  if (price <= 0) {
    return 'Free';
  }
  return `$${price.toFixed(2)}`;
}

/**
 * MenuItemCard Component
 *
 * A presentational React component for displaying individual menu item information
 * in a card format. Supports image loading states, fallback for broken images,
 * text truncation for long content, and accessibility features.
 *
 * @param props - The component props
 * @param props.item - The menu item data to display
 * @param props.onAddToCart - Optional callback when add to cart is clicked
 * @returns JSX element representing the menu item card
 *
 * @example
 * ```tsx
 * const item = {
 *   id: '1',
 *   name: 'Classic Burger',
 *   price: 12.99,
 *   description: 'Juicy beef patty with fresh lettuce',
 *   imageUrl: '/images/burger.jpg',
 *   category: 'burgers',
 *   available: true
 * };
 *
 * <MenuItemCard
 *   item={item}
 *   onAddToCart={(item) => console.log('Added:', item.name)}
 * />
 * ```
 */
export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps): JSX.Element {
  /**
   * State tracking the current image loading status.
   * Used to show appropriate loading states and handle errors.
   */
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>('loading');

  /**
   * Handles successful image load event.
   * Updates state to indicate the image has loaded successfully.
   */
  const handleImageLoad = useCallback((): void => {
    setImageLoadState('loaded');
  }, []);

  /**
   * Handles image load error event.
   * Updates state to trigger fallback placeholder display.
   */
  const handleImageError = useCallback((): void => {
    setImageLoadState('error');
  }, []);

  /**
   * Handles add to cart button click.
   * Prevents action if item is unavailable and calls the provided callback.
   */
  const handleAddToCart = useCallback((): void => {
    // Guard against clicking when item is unavailable
    if (item.available === false) {
      return;
    }
    // Call the callback if provided
    if (onAddToCart) {
      onAddToCart(item);
    }
  }, [item, onAddToCart]);

  /**
   * Determines the image source to display.
   * Uses fallback image when original fails to load or is missing.
   */
  const imageSource: string =
    imageLoadState === 'error' || !item.imageUrl ? FALLBACK_IMAGE_URL : item.imageUrl;

  /**
   * Determines if the item is available for ordering.
   * Defaults to true if not explicitly set to false.
   */
  const isAvailable: boolean = item.available !== false;

  /**
   * Generates appropriate button text based on availability.
   */
  const buttonText: string = isAvailable ? 'Add to Cart' : 'Unavailable';

  /**
   * Creates accessible label for the add to cart button.
   */
  const buttonAriaLabel: string = isAvailable
    ? `Add ${item.name} to cart for ${formatPrice(item.price)}`
    : `${item.name} is currently unavailable`;

  return (
    <article
      className="menu-item-card"
      aria-label={`Menu item: ${item.name}`}
      data-testid={`menu-item-card-${item.id}`}
    >
      {/* Image Container with loading and error states */}
      <div className="menu-item-card__image-container">
        {/* Show loading placeholder while image is loading */}
        {imageLoadState === 'loading' && (
          <div
            className="menu-item-card__image-placeholder"
            aria-hidden="true"
            data-testid="image-loading-placeholder"
          >
            <span className="menu-item-card__loading-spinner" />
          </div>
        )}

        {/* Main image element */}
        <img
          src={imageSource}
          alt={item.name}
          className={`menu-item-card__image ${imageLoadState === 'loading' ? 'menu-item-card__image--loading' : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          data-testid="menu-item-image"
        />

        {/* Unavailable overlay when item is not available */}
        {!isAvailable && (
          <div
            className="menu-item-card__unavailable-overlay"
            aria-hidden="true"
            data-testid="unavailable-overlay"
          >
            <span>Currently Unavailable</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="menu-item-card__content">
        {/* Item Name with truncation for long names */}
        <h3
          className="menu-item-card__title"
          title={item.name}
          data-testid="menu-item-name"
        >
          {item.name}
        </h3>

        {/* Item Description with truncation */}
        <p
          className="menu-item-card__description"
          title={item.description}
          data-testid="menu-item-description"
        >
          {item.description}
        </p>

        {/* Category badge */}
        <span
          className="menu-item-card__category"
          data-testid="menu-item-category"
        >
          {item.category}
        </span>
      </div>

      {/* Footer Section with Price and Add to Cart */}
      <div className="menu-item-card__footer">
        {/* Price Display */}
        <span
          className="menu-item-card__price"
          aria-label={`Price: ${formatPrice(item.price)}`}
          data-testid="menu-item-price"
        >
          {formatPrice(item.price)}
        </span>

        {/* Add to Cart Button */}
        <button
          type="button"
          className={`menu-item-card__add-button ${!isAvailable ? 'menu-item-card__add-button--disabled' : ''}`}
          onClick={handleAddToCart}
          disabled={!isAvailable}
          aria-label={buttonAriaLabel}
          aria-disabled={!isAvailable}
          data-testid="add-to-cart-button"
        >
          {buttonText}
        </button>
      </div>
    </article>
  );
}
