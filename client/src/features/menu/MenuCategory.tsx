/**
 * @fileoverview Menu category filter component for filtering menu items by category
 * @module features/menu/MenuCategory
 *
 * This component provides a category filter UI for the burger restaurant menu.
 * It displays available categories (burgers, sides, drinks, desserts) as selectable
 * filter buttons/pills and allows users to filter the menu display by category.
 *
 * Features:
 * - "All" option to clear category filter
 * - Single category selection mode
 * - Visual highlighting of selected category
 * - Optional item count display per category
 * - Full accessibility support with ARIA attributes
 * - Keyboard navigation support
 */

import React, { useCallback } from 'react';

/**
 * Interface representing a menu category.
 * Used to define the structure of category data passed to the component.
 *
 * @interface Category
 * @property {string} id - Unique identifier for the category
 * @property {string} name - Display name of the category
 * @property {number} [itemCount] - Optional count of items in this category
 */
export interface Category {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Optional count of items in this category */
  itemCount?: number;
}

/**
 * Props interface for the MenuCategory component.
 *
 * @interface MenuCategoryProps
 * @property {Category[]} categories - Array of available categories to display
 * @property {string | null} selectedCategory - Currently selected category ID, or null for "All"
 * @property {(category: string | null) => void} onSelectCategory - Callback when category selection changes
 */
export interface MenuCategoryProps {
  /** Array of available categories to display as filter options */
  categories: Category[];
  /** Currently selected category ID, or null if "All" is selected */
  selectedCategory: string | null;
  /** Callback function invoked when a category is selected or deselected */
  onSelectCategory: (category: string | null) => void;
}

/**
 * CSS class names for styling the component.
 * These can be used with CSS modules, styled-components, or plain CSS.
 */
const STYLE_CLASSES = {
  /** Container wrapper for the entire category filter */
  container: 'menu-category',
  /** Wrapper for the category button list */
  list: 'menu-category__list',
  /** Individual category button/pill */
  button: 'menu-category__button',
  /** Active/selected state modifier */
  buttonActive: 'menu-category__button--active',
  /** Inactive/unselected state modifier */
  buttonInactive: 'menu-category__button--inactive',
  /** Category name text */
  name: 'menu-category__name',
  /** Item count badge/text */
  count: 'menu-category__count',
  /** Horizontal layout modifier */
  horizontal: 'menu-category--horizontal',
  /** Vertical layout modifier */
  vertical: 'menu-category--vertical',
} as const;

/**
 * Label for the "All" category option.
 * Used when no specific category filter is applied.
 */
const ALL_CATEGORIES_LABEL = 'All';

/**
 * ID value representing no category selection (show all items).
 */
const ALL_CATEGORIES_ID = null;

/**
 * MenuCategory component for filtering menu items by category.
 *
 * This component renders a list of category filter buttons that allow users
 * to filter the menu display. It includes an "All" option to show all items
 * and supports accessibility features including keyboard navigation and
 * ARIA attributes.
 *
 * @example
 * ```tsx
 * const categories = [
 *   { id: 'burgers', name: 'Burgers', itemCount: 12 },
 *   { id: 'sides', name: 'Sides', itemCount: 8 },
 *   { id: 'drinks', name: 'Drinks', itemCount: 15 },
 *   { id: 'desserts', name: 'Desserts', itemCount: 6 },
 * ];
 *
 * <MenuCategory
 *   categories={categories}
 *   selectedCategory={selectedCategory}
 *   onSelectCategory={handleCategorySelect}
 * />
 * ```
 *
 * @param {MenuCategoryProps} props - Component props
 * @param {Category[]} props.categories - Array of categories to display
 * @param {string | null} props.selectedCategory - Currently selected category ID
 * @param {(category: string | null) => void} props.onSelectCategory - Selection change handler
 * @returns {React.ReactElement} The rendered category filter component
 */
export const MenuCategory: React.FC<MenuCategoryProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  /**
   * Handles category button click events.
   * Memoized to prevent unnecessary re-renders of child button elements.
   *
   * @param {string | null} categoryId - The ID of the clicked category, or null for "All"
   */
  const handleCategoryClick = useCallback(
    (categoryId: string | null) => {
      // If clicking the already selected category, clear the selection (toggle behavior)
      // Otherwise, select the new category
      if (categoryId === selectedCategory) {
        onSelectCategory(ALL_CATEGORIES_ID);
      } else {
        onSelectCategory(categoryId);
      }
    },
    [selectedCategory, onSelectCategory]
  );

  /**
   * Handles keyboard events for category buttons.
   * Supports Enter and Space keys for activation, following button semantics.
   *
   * @param {React.KeyboardEvent<HTMLButtonElement>} event - The keyboard event
   * @param {string | null} categoryId - The category ID associated with the button
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, categoryId: string | null) => {
      // Handle Enter and Space keys for button activation
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCategoryClick(categoryId);
      }
    },
    [handleCategoryClick]
  );

  /**
   * Determines if a category is currently selected.
   *
   * @param {string | null} categoryId - The category ID to check
   * @returns {boolean} True if the category is selected
   */
  const isSelected = useCallback(
    (categoryId: string | null): boolean => {
      return categoryId === selectedCategory;
    },
    [selectedCategory]
  );

  /**
   * Generates the CSS class string for a category button.
   *
   * @param {string | null} categoryId - The category ID
   * @returns {string} The concatenated class names
   */
  const getButtonClassName = useCallback(
    (categoryId: string | null): string => {
      const classes = [STYLE_CLASSES.button];
      if (isSelected(categoryId)) {
        classes.push(STYLE_CLASSES.buttonActive);
      } else {
        classes.push(STYLE_CLASSES.buttonInactive);
      }
      return classes.join(' ');
    },
    [isSelected]
  );

  /**
   * Calculates the total item count across all categories.
   *
   * @returns {number | undefined} The total count, or undefined if no categories have counts
   */
  const getTotalItemCount = useCallback((): number | undefined => {
    if (categories.length === 0) {
      return undefined;
    }

    // Check if any category has an item count
    const hasItemCounts = categories.some(
      (category) => category.itemCount !== undefined
    );

    if (!hasItemCounts) {
      return undefined;
    }

    // Sum up all item counts
    return categories.reduce((total, category) => {
      return total + (category.itemCount ?? 0);
    }, 0);
  }, [categories]);

  /**
   * Renders the item count badge for a category button.
   *
   * @param {number | undefined} count - The item count to display
   * @returns {React.ReactElement | null} The count badge or null
   */
  const renderItemCount = (count: number | undefined): React.ReactElement | null => {
    if (count === undefined) {
      return null;
    }

    return (
      <span className={STYLE_CLASSES.count} aria-label={`${count} items`}>
        ({count})
      </span>
    );
  };

  /**
   * Renders a single category button.
   *
   * @param {string | null} categoryId - The category ID
   * @param {string} label - The display label
   * @param {number | undefined} count - Optional item count
   * @returns {React.ReactElement} The rendered button element
   */
  const renderCategoryButton = (
    categoryId: string | null,
    label: string,
    count: number | undefined
  ): React.ReactElement => {
    const selected = isSelected(categoryId);
    const buttonClassName = getButtonClassName(categoryId);

    return (
      <button
        key={categoryId ?? 'all'}
        type="button"
        className={buttonClassName}
        onClick={() => handleCategoryClick(categoryId)}
        onKeyDown={(event) => handleKeyDown(event, categoryId)}
        aria-pressed={selected}
        aria-label={
          count !== undefined
            ? `${label} category with ${count} items${selected ? ', currently selected' : ''}`
            : `${label} category${selected ? ', currently selected' : ''}`
        }
        data-category-id={categoryId ?? 'all'}
        data-selected={selected}
      >
        <span className={STYLE_CLASSES.name}>{label}</span>
        {renderItemCount(count)}
      </button>
    );
  };

  // Calculate total item count for "All" option
  const totalItemCount = getTotalItemCount();

  return (
    <nav
      className={`${STYLE_CLASSES.container} ${STYLE_CLASSES.horizontal}`}
      role="navigation"
      aria-label="Menu category filter"
    >
      <div
        className={STYLE_CLASSES.list}
        role="group"
        aria-label="Category filter options"
      >
        {/* "All" category button - always rendered first */}
        {renderCategoryButton(ALL_CATEGORIES_ID, ALL_CATEGORIES_LABEL, totalItemCount)}

        {/* Individual category buttons */}
        {categories.map((category) =>
          renderCategoryButton(category.id, category.name, category.itemCount)
        )}
      </div>
    </nav>
  );
};

// Default export is not used - named export only for testing compatibility
// export default MenuCategory;
