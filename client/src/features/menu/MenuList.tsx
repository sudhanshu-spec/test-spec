/**
 * @fileoverview Menu list component for displaying menu items with filtering.
 * Orchestrates MenuItemCard and MenuCategory components to provide a full menu
 * browsing experience. Includes loading states, error handling, empty state messaging,
 * and category filtering. Uses useMenu hook for data fetching.
 *
 * @module features/menu/MenuList
 *
 * Features:
 * - Category-based filtering via MenuCategory component
 * - Grid display of menu items via MenuItemCard components
 * - Loading spinner/skeleton during data fetch
 * - Error message display on fetch failure
 * - Empty state when no items match the filter
 * - Live region announcements for accessibility
 * - Support for rendering large menus (100+ items) with memoization
 */

import { useMemo } from 'react';
import { MenuItemCard } from './MenuItemCard';
import { MenuCategory } from './MenuCategory';
import { useMenu, MenuItem } from './hooks/useMenu';

/**
 * Props interface for the MenuList component.
 * @interface MenuListProps
 */
export interface MenuListProps {
  /**
   * Optional callback function called when a menu item is added to cart.
   * Receives the MenuItem object as parameter.
   * @param item - The menu item being added to cart
   */
  onAddToCart?: (item: MenuItem) => void;

  /**
   * Optional initial category to filter by on component mount.
   * If not provided, all items will be displayed.
   */
  initialCategory?: string;
}

/**
 * CSS class names for styling the component.
 * These class names can be used with CSS modules, styled-components, or plain CSS.
 */
const STYLE_CLASSES = {
  /** Main container wrapper for the entire menu list */
  container: 'menu-list',
  /** Header section containing title and category filter */
  header: 'menu-list__header',
  /** Main title of the menu section */
  title: 'menu-list__title',
  /** Category filter section */
  filters: 'menu-list__filters',
  /** Grid container for menu item cards */
  grid: 'menu-list__grid',
  /** Loading state container */
  loading: 'menu-list__loading',
  /** Loading spinner element */
  spinner: 'menu-list__spinner',
  /** Loading text message */
  loadingText: 'menu-list__loading-text',
  /** Error state container */
  error: 'menu-list__error',
  /** Error icon/indicator */
  errorIcon: 'menu-list__error-icon',
  /** Error message text */
  errorMessage: 'menu-list__error-message',
  /** Retry button in error state */
  retryButton: 'menu-list__retry-button',
  /** Empty state container */
  empty: 'menu-list__empty',
  /** Empty state icon */
  emptyIcon: 'menu-list__empty-icon',
  /** Empty state message */
  emptyMessage: 'menu-list__empty-message',
  /** Clear filter button in empty state */
  clearFilterButton: 'menu-list__clear-filter-button',
  /** Screen reader only elements */
  srOnly: 'sr-only',
  /** Live region for accessibility announcements */
  liveRegion: 'menu-list__live-region',
} as const;

/**
 * Generates announcement text for screen readers based on current state.
 *
 * @param itemCount - Number of items currently displayed
 * @param selectedCategory - Currently selected category name or null
 * @param isLoading - Whether data is currently loading
 * @param hasError - Whether an error has occurred
 * @returns Accessibility announcement string
 */
function generateAnnouncement(
  itemCount: number,
  selectedCategory: string | null,
  isLoading: boolean,
  hasError: boolean
): string {
  if (isLoading) {
    return 'Loading menu items, please wait.';
  }

  if (hasError) {
    return 'Failed to load menu items. Please try again.';
  }

  if (selectedCategory) {
    if (itemCount === 0) {
      return `No items found in ${selectedCategory} category.`;
    }
    return `Showing ${itemCount} ${itemCount === 1 ? 'item' : 'items'} in ${selectedCategory} category.`;
  }

  if (itemCount === 0) {
    return 'No menu items available.';
  }

  return `Showing all ${itemCount} menu ${itemCount === 1 ? 'item' : 'items'}.`;
}

/**
 * MenuList Component
 *
 * A comprehensive React component for displaying the restaurant menu with
 * category filtering capabilities. Orchestrates the MenuCategory filter component
 * and displays MenuItemCard components in a responsive grid layout.
 *
 * The component handles all data fetching states:
 * - Loading: Shows a spinner with accessible loading message
 * - Error: Displays error message with retry functionality
 * - Empty: Shows friendly message when no items match filter
 * - Success: Renders filterable grid of menu item cards
 *
 * Performance optimizations include:
 * - Memoized filtered items to prevent unnecessary recalculations
 * - Memoized category data transformation
 * - Efficient re-rendering via key-based list rendering
 *
 * Accessibility features:
 * - ARIA live region for state change announcements
 * - Semantic heading structure
 * - Keyboard navigable filter controls
 * - Screen reader friendly empty/loading/error states
 *
 * @param props - Component props
 * @param props.onAddToCart - Optional callback when item is added to cart
 * @param props.initialCategory - Optional initial category filter
 * @returns JSX element representing the complete menu list UI
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MenuList />
 *
 * // With cart integration
 * <MenuList
 *   onAddToCart={(item) => addToCart(item)}
 *   initialCategory="burgers"
 * />
 * ```
 */
export function MenuList({
  onAddToCart,
  initialCategory,
}: MenuListProps): JSX.Element {
  /**
   * Hook call for fetching and managing menu data.
   * Destructure all members_accessed as per schema requirements.
   */
  const {
    items,
    categories,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    filteredItems,
    refetch,
  } = useMenu({
    initialCategory: initialCategory ?? undefined,
    enableCache: true,
  });

  /**
   * Memoized categories with item counts for the filter component.
   * Calculates the count of items in each category for display.
   * Optimized for large menus (100+ items) via useMemo.
   */
  const categoriesWithCounts = useMemo(() => {
    return categories.map((category) => {
      // Count items matching this category
      const itemCount = items.filter(
        (item) => item.category.toLowerCase() === category.id.toLowerCase()
      ).length;

      return {
        id: category.id,
        name: category.name,
        itemCount,
      };
    });
  }, [categories, items]);

  /**
   * Memoized selected category display name for announcements.
   */
  const selectedCategoryName = useMemo((): string | null => {
    if (!selectedCategory) return null;
    const category = categories.find(
      (cat) => cat.id.toLowerCase() === selectedCategory.toLowerCase()
    );
    return category?.name ?? selectedCategory;
  }, [selectedCategory, categories]);

  /**
   * Memoized announcement text for screen readers.
   */
  const announcement = useMemo(
    () =>
      generateAnnouncement(
        filteredItems.length,
        selectedCategoryName,
        isLoading,
        error !== null
      ),
    [filteredItems.length, selectedCategoryName, isLoading, error]
  );

  /**
   * Handles category selection change from MenuCategory component.
   *
   * @param categoryId - The selected category ID or null for all items
   */
  const handleCategorySelect = (categoryId: string | null): void => {
    setSelectedCategory(categoryId);
  };

  /**
   * Handles retry action when an error occurs.
   * Triggers a fresh data fetch from the API.
   */
  const handleRetry = async (): Promise<void> => {
    await refetch();
  };

  /**
   * Handles clearing the category filter.
   * Resets selection to show all menu items.
   */
  const handleClearFilter = (): void => {
    setSelectedCategory(null);
  };

  /**
   * Handles add to cart action for a menu item.
   * Propagates the action to the parent component if callback is provided.
   *
   * @param item - The menu item to add to cart
   */
  const handleAddToCart = (item: MenuItem): void => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };

  /**
   * Renders the loading state UI with spinner and accessible message.
   */
  const renderLoadingState = (): JSX.Element => (
    <div
      className={STYLE_CLASSES.loading}
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="menu-list-loading"
    >
      <div className={STYLE_CLASSES.spinner} aria-hidden="true">
        {/* SVG spinner icon */}
        <svg
          className="animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          width="48"
          height="48"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p className={STYLE_CLASSES.loadingText}>Loading menu items...</p>
    </div>
  );

  /**
   * Renders the error state UI with message and retry button.
   */
  const renderErrorState = (): JSX.Element => (
    <div
      className={STYLE_CLASSES.error}
      role="alert"
      aria-live="assertive"
      data-testid="menu-list-error"
    >
      <div className={STYLE_CLASSES.errorIcon} aria-hidden="true">
        {/* Error icon SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          width="48"
          height="48"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className={STYLE_CLASSES.errorMessage} data-testid="error-message">
        {error?.message || 'Failed to load menu items. Please try again.'}
      </p>
      <button
        type="button"
        className={STYLE_CLASSES.retryButton}
        onClick={handleRetry}
        aria-label="Retry loading menu items"
        data-testid="retry-button"
      >
        Try Again
      </button>
    </div>
  );

  /**
   * Renders the empty state UI when no items match the filter.
   */
  const renderEmptyState = (): JSX.Element => (
    <div
      className={STYLE_CLASSES.empty}
      role="status"
      aria-live="polite"
      data-testid="menu-list-empty"
    >
      <div className={STYLE_CLASSES.emptyIcon} aria-hidden="true">
        {/* Empty state icon SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          width="48"
          height="48"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <p className={STYLE_CLASSES.emptyMessage} data-testid="empty-message">
        {selectedCategory
          ? `No items found in the "${selectedCategoryName}" category.`
          : 'No menu items available at this time.'}
      </p>
      {selectedCategory && (
        <button
          type="button"
          className={STYLE_CLASSES.clearFilterButton}
          onClick={handleClearFilter}
          aria-label="Clear category filter and show all items"
          data-testid="clear-filter-button"
        >
          View All Items
        </button>
      )}
    </div>
  );

  /**
   * Renders the grid of menu item cards.
   * Uses semantic list markup for accessibility.
   */
  const renderMenuGrid = (): JSX.Element => (
    <ul
      className={STYLE_CLASSES.grid}
      role="list"
      aria-label={`Menu items${selectedCategoryName ? ` in ${selectedCategoryName} category` : ''}`}
      data-testid="menu-list-grid"
    >
      {filteredItems.map((item) => (
        <li key={item.id} role="listitem">
          <MenuItemCard item={item} onAddToCart={handleAddToCart} />
        </li>
      ))}
    </ul>
  );

  /**
   * Determines which content to render based on current state.
   */
  const renderContent = (): JSX.Element => {
    // Show loading state first
    if (isLoading) {
      return renderLoadingState();
    }

    // Show error state if there's an error
    if (error) {
      return renderErrorState();
    }

    // Show empty state if no items match filter
    if (filteredItems.length === 0) {
      return renderEmptyState();
    }

    // Render the menu grid with items
    return renderMenuGrid();
  };

  return (
    <section
      className={STYLE_CLASSES.container}
      aria-labelledby="menu-list-title"
      data-testid="menu-list"
    >
      {/* Header section with title and filters */}
      <header className={STYLE_CLASSES.header}>
        <h2 id="menu-list-title" className={STYLE_CLASSES.title}>
          Our Menu
        </h2>

        {/* Category filter - only show when not loading and no error */}
        {!isLoading && !error && categories.length > 0 && (
          <div className={STYLE_CLASSES.filters}>
            <MenuCategory
              categories={categoriesWithCounts}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>
        )}
      </header>

      {/* Live region for screen reader announcements */}
      <div
        className={STYLE_CLASSES.liveRegion}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="menu-list-announcement"
      >
        <span className={STYLE_CLASSES.srOnly}>{announcement}</span>
      </div>

      {/* Main content area */}
      {renderContent()}
    </section>
  );
}
