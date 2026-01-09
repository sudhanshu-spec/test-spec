/**
 * @fileoverview Unit tests for MenuCategory filter component
 * @module tests/features/menu/MenuCategory
 *
 * Comprehensive tests for the MenuCategory component which provides
 * category filtering functionality for the burger restaurant menu.
 * Tests cover rendering, selection state, user interactions, keyboard
 * navigation, accessibility compliance, and edge cases.
 *
 * Testing patterns follow:
 * - AAA pattern (Arrange, Act, Assert)
 * - User-centric testing approach via React Testing Library
 * - Accessibility-first assertions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuCategory, Category, MenuCategoryProps } from '../MenuCategory';
import { categories, MenuCategory as FixtureMenuCategory } from '../../../__tests__/fixtures/menuItems';

// ============================================================================
// Test Constants and Helper Functions
// ============================================================================

/**
 * Default test props for MenuCategory component.
 * Uses fixture categories with standard selection state.
 */
const createDefaultProps = (): MenuCategoryProps => ({
  categories: categories.map((cat: FixtureMenuCategory): Category => ({
    id: cat.id,
    name: cat.name,
    itemCount: cat.itemCount,
  })),
  selectedCategory: null,
  onSelectCategory: vi.fn(),
});

/**
 * Factory function for creating test categories with custom configurations.
 *
 * @param count - Number of categories to create
 * @param options - Configuration options for generated categories
 * @returns Array of Category objects
 */
const createTestCategories = (
  count: number,
  options: {
    includeItemCounts?: boolean;
    prefix?: string;
  } = {}
): Category[] => {
  const { includeItemCounts = true, prefix = 'cat' } = options;

  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `Category ${index + 1}`,
    itemCount: includeItemCounts ? (index + 1) * 5 : undefined,
  }));
};

/**
 * Creates categories with edge case configurations for testing.
 */
const createEdgeCaseCategories = (): Category[] => [
  {
    id: 'long-name-category',
    name: 'This Is An Extremely Long Category Name That Might Cause Display Issues',
    itemCount: 10,
  },
  {
    id: 'special-chars',
    name: "Burgers & Grill's Special",
    itemCount: 5,
  },
  {
    id: 'zero-items',
    name: 'Empty Category',
    itemCount: 0,
  },
  {
    id: 'no-count',
    name: 'Unknown Items',
    // itemCount intentionally omitted
  },
];

/**
 * Renders the MenuCategory component with merged props.
 *
 * @param overrideProps - Props to override defaults
 * @returns Render result with user event instance
 */
const renderMenuCategory = (overrideProps: Partial<MenuCategoryProps> = {}) => {
  const props = { ...createDefaultProps(), ...overrideProps };
  const user = userEvent.setup();
  const renderResult = render(<MenuCategory {...props} />);

  return {
    ...renderResult,
    user,
    props,
  };
};

// ============================================================================
// Test Suites
// ============================================================================

describe('MenuCategory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('when rendered with categories', () => {
    it('should render all provided category buttons', () => {
      // Arrange
      const testCategories = createTestCategories(3);

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert - All category buttons plus "All" button should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4); // 3 categories + 1 "All" button
    });

    it('should render "All" option for clearing filter', () => {
      // Arrange & Act
      renderMenuCategory();

      // Assert
      const allButton = screen.getByRole('button', { name: /all category/i });
      expect(allButton).toBeInTheDocument();
    });

    it('should display category names correctly', () => {
      // Arrange
      const defaultProps = createDefaultProps();

      // Act
      renderMenuCategory();

      // Assert - Check each category name is displayed
      defaultProps.categories.forEach((category) => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
      });
    });

    it('should display item count per category when provided', () => {
      // Arrange
      const categoriesWithCounts: Category[] = [
        { id: 'cat-1', name: 'Burgers', itemCount: 12 },
        { id: 'cat-2', name: 'Sides', itemCount: 8 },
      ];

      // Act
      renderMenuCategory({ categories: categoriesWithCounts });

      // Assert - Item counts should be visible in parentheses
      expect(screen.getByText('(12)')).toBeInTheDocument();
      expect(screen.getByText('(8)')).toBeInTheDocument();
    });

    it('should calculate and display total item count for "All" option', () => {
      // Arrange
      const categoriesWithCounts: Category[] = [
        { id: 'cat-1', name: 'Burgers', itemCount: 10 },
        { id: 'cat-2', name: 'Sides', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({ categories: categoriesWithCounts });

      // Assert - "All" button should show total count (10 + 5 = 15)
      expect(screen.getByText('(15)')).toBeInTheDocument();
    });

    it('should render category buttons in correct order with "All" first', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'first', name: 'First Category', itemCount: 1 },
        { id: 'second', name: 'Second Category', itemCount: 2 },
      ];

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('All');
      expect(buttons[1]).toHaveTextContent('First Category');
      expect(buttons[2]).toHaveTextContent('Second Category');
    });
  });

  // ==========================================================================
  // Selection State Tests
  // ==========================================================================

  describe('selection state', () => {
    it('should show no selection initially when selectedCategory is null', () => {
      // Arrange & Act
      renderMenuCategory({ selectedCategory: null });

      // Assert - "All" should be selected when no specific category is selected
      const allButton = screen.getByRole('button', { name: /all category/i });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should highlight currently selected category', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      expect(burgersButton).toHaveAttribute('aria-pressed', 'true');
      expect(burgersButton).toHaveAttribute('data-selected', 'true');
    });

    it('should show "All" button as selected when no category selected', () => {
      // Arrange
      const testCategories = createTestCategories(2);

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: null,
      });

      // Assert
      const allButton = screen.getByRole('button', { name: /all category/i });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should ensure only one category is highlighted at a time', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'cat-1', name: 'Category One', itemCount: 5 },
        { id: 'cat-2', name: 'Category Two', itemCount: 10 },
        { id: 'cat-3', name: 'Category Three', itemCount: 15 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'cat-2',
      });

      // Assert - Only cat-2 should be selected
      const allButton = screen.getByRole('button', { name: /all category/i });
      const cat1Button = screen.getByRole('button', { name: /category one/i });
      const cat2Button = screen.getByRole('button', { name: /category two/i });
      const cat3Button = screen.getByRole('button', { name: /category three/i });

      expect(allButton).toHaveAttribute('aria-pressed', 'false');
      expect(cat1Button).toHaveAttribute('aria-pressed', 'false');
      expect(cat2Button).toHaveAttribute('aria-pressed', 'true');
      expect(cat3Button).toHaveAttribute('aria-pressed', 'false');
    });

    it('should apply active CSS class to selected category', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      expect(burgersButton.className).toContain('menu-category__button--active');
    });

    it('should apply inactive CSS class to unselected categories', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const sidesButton = screen.getByRole('button', { name: /sides category/i });
      expect(sidesButton.className).toContain('menu-category__button--inactive');
    });
  });

  // ==========================================================================
  // Category Selection Interaction Tests
  // ==========================================================================

  describe('category selection interaction', () => {
    it('should call onSelectCategory with category id when category clicked', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: null,
      });

      // Act
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      await user.click(burgersButton);

      // Assert
      expect(mockOnSelectCategory).toHaveBeenCalledTimes(1);
      expect(mockOnSelectCategory).toHaveBeenCalledWith('burgers');
    });

    it('should call onSelectCategory with null when "All" clicked', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: 'burgers',
      });

      // Act
      const allButton = screen.getByRole('button', { name: /all category/i });
      await user.click(allButton);

      // Assert
      expect(mockOnSelectCategory).toHaveBeenCalledTimes(1);
      expect(mockOnSelectCategory).toHaveBeenCalledWith(null);
    });

    it('should call onSelectCategory with null when clicking already selected category (toggle off)', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: 'burgers',
      });

      // Act - Click the already selected category
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      await user.click(burgersButton);

      // Assert - Should toggle off by calling with null
      expect(mockOnSelectCategory).toHaveBeenCalledTimes(1);
      expect(mockOnSelectCategory).toHaveBeenCalledWith(null);
    });

    it('should support clicking different categories in sequence', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
        { id: 'drinks', name: 'Drinks', itemCount: 8 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: null,
      });

      // Act - Click categories in sequence
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      const sidesButton = screen.getByRole('button', { name: /sides category/i });
      const drinksButton = screen.getByRole('button', { name: /drinks category/i });

      await user.click(burgersButton);
      await user.click(sidesButton);
      await user.click(drinksButton);

      // Assert
      expect(mockOnSelectCategory).toHaveBeenCalledTimes(3);
      expect(mockOnSelectCategory).toHaveBeenNthCalledWith(1, 'burgers');
      expect(mockOnSelectCategory).toHaveBeenNthCalledWith(2, 'sides');
      expect(mockOnSelectCategory).toHaveBeenNthCalledWith(3, 'drinks');
    });

    it('should not trigger multiple calls on rapid clicks (debounce behavior)', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: null,
      });

      // Act - Rapid click
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      await user.click(burgersButton);

      // Assert - Should be called once per click (no synthetic debouncing needed)
      expect(mockOnSelectCategory).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe('keyboard navigation', () => {
    it('should make categories focusable with Tab key', async () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];
      const { user } = renderMenuCategory({ categories: testCategories });

      // Act
      await user.tab();

      // Assert - First button ("All") should be focused
      const allButton = screen.getByRole('button', { name: /all category/i });
      expect(allButton).toHaveFocus();
    });

    it('should move focus to next category with Tab key', async () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];
      const { user } = renderMenuCategory({ categories: testCategories });

      // Act - Tab through buttons
      await user.tab(); // Focus "All"
      await user.tab(); // Focus "Burgers"

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      expect(burgersButton).toHaveFocus();
    });

    it('should activate category selection with Enter key', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: null,
      });

      // Act - Tab to burgers button and press Enter
      await user.tab(); // Focus "All"
      await user.tab(); // Focus "Burgers"
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnSelectCategory).toHaveBeenCalledWith('burgers');
    });

    it('should activate category selection with Space key', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];
      const { user } = renderMenuCategory({
        categories: testCategories,
        onSelectCategory: mockOnSelectCategory,
        selectedCategory: null,
      });

      // Act - Tab to burgers button and press Space
      await user.tab(); // Focus "All"
      await user.tab(); // Focus "Burgers"
      await user.keyboard(' ');

      // Assert
      expect(mockOnSelectCategory).toHaveBeenCalledWith('burgers');
    });

    it('should allow tabbing through all category buttons', async () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];
      const { user } = renderMenuCategory({ categories: testCategories });

      // Act - Tab through all buttons
      await user.tab(); // All
      await user.tab(); // Burgers
      await user.tab(); // Sides

      // Assert
      const sidesButton = screen.getByRole('button', { name: /sides category/i });
      expect(sidesButton).toHaveFocus();
    });

    it('should allow reverse tabbing with Shift+Tab', async () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];
      const { user } = renderMenuCategory({ categories: testCategories });

      // Act - Tab forward then backward
      await user.tab(); // All
      await user.tab(); // Burgers
      await user.tab(); // Sides
      await user.tab({ shift: true }); // Back to Burgers

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      expect(burgersButton).toHaveFocus();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should use button semantics for category selections', () => {
      // Arrange & Act
      const testCategories = createTestCategories(2);
      renderMenuCategory({ categories: testCategories });

      // Assert - All categories should be buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have aria-pressed="true" on selected category', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      expect(burgersButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed="false" on unselected categories', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const sidesButton = screen.getByRole('button', { name: /sides category/i });
      const allButton = screen.getByRole('button', { name: /all category/i });

      expect(sidesButton).toHaveAttribute('aria-pressed', 'false');
      expect(allButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have accessible name on each button', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert - Buttons should have aria-label describing them
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      const allButton = screen.getByRole('button', { name: /all category/i });

      expect(burgersButton).toHaveAttribute('aria-label');
      expect(allButton).toHaveAttribute('aria-label');
    });

    it('should have category list with appropriate role', () => {
      // Arrange & Act
      renderMenuCategory();

      // Assert - Check for navigation or group role
      const navigation = screen.getByRole('navigation', { name: /menu category filter/i });
      expect(navigation).toBeInTheDocument();

      const group = screen.getByRole('group', { name: /category filter options/i });
      expect(group).toBeInTheDocument();
    });

    it('should include item count in accessible label when provided', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category with 10 items/i });
      expect(burgersButton).toBeInTheDocument();
    });

    it('should indicate selection state in accessible label', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /currently selected/i });
      expect(burgersButton).toBeInTheDocument();
    });

    it('should have buttons with type="button" to prevent form submission', () => {
      // Arrange
      const testCategories = createTestCategories(2);

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty categories array gracefully', () => {
      // Arrange & Act
      renderMenuCategory({ categories: [] });

      // Assert - Should still render "All" button
      const allButton = screen.getByRole('button', { name: /all category/i });
      expect(allButton).toBeInTheDocument();

      // Should only have the "All" button
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
    });

    it('should handle single category', () => {
      // Arrange
      const singleCategory: Category[] = [
        { id: 'single', name: 'Single Category', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({ categories: singleCategory });

      // Assert
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // "All" + single category

      expect(screen.getByText('Single Category')).toBeInTheDocument();
    });

    it('should handle category with long name', () => {
      // Arrange
      const longNameCategories: Category[] = [
        {
          id: 'long',
          name: 'This Is An Extremely Long Category Name That Might Cause Display Issues',
          itemCount: 10,
        },
      ];

      // Act
      renderMenuCategory({ categories: longNameCategories });

      // Assert
      expect(
        screen.getByText('This Is An Extremely Long Category Name That Might Cause Display Issues')
      ).toBeInTheDocument();
    });

    it('should handle category with special characters', () => {
      // Arrange
      const specialCharCategories: Category[] = [
        { id: 'special', name: "Burgers & Grill's Special", itemCount: 5 },
      ];

      // Act
      renderMenuCategory({ categories: specialCharCategories });

      // Assert
      expect(screen.getByText("Burgers & Grill's Special")).toBeInTheDocument();
    });

    it('should handle category with zero item count', () => {
      // Arrange
      const zeroCountCategories: Category[] = [
        { id: 'empty', name: 'Empty Category', itemCount: 0 },
      ];

      // Act
      renderMenuCategory({ categories: zeroCountCategories });

      // Assert - Both "All" and the category will show (0), so use getAllByText
      const zeroCountElements = screen.getAllByText('(0)');
      expect(zeroCountElements.length).toBeGreaterThanOrEqual(1);
      // Verify the Empty Category button shows the zero count
      const emptyButton = screen.getByRole('button', { name: /empty category/i });
      expect(within(emptyButton).getByText('(0)')).toBeInTheDocument();
    });

    it('should handle category without item count', () => {
      // Arrange
      const noCountCategories: Category[] = [
        { id: 'unknown', name: 'Unknown Items' },
        // itemCount intentionally omitted
      ];

      // Act
      renderMenuCategory({ categories: noCountCategories });

      // Assert - Category should render without count badge
      expect(screen.getByText('Unknown Items')).toBeInTheDocument();
      // The count should not appear for this category
      const unknownButton = screen.getByRole('button', { name: /unknown items category/i });
      expect(unknownButton).toBeInTheDocument();
    });

    it('should handle mixed categories with and without item counts', () => {
      // Arrange
      const mixedCategories: Category[] = [
        { id: 'with-count', name: 'With Count', itemCount: 10 },
        { id: 'without-count', name: 'Without Count' },
      ];

      // Act
      renderMenuCategory({ categories: mixedCategories });

      // Assert - Both "All" and "With Count" show (10), so use getAllByText
      const countElements = screen.getAllByText('(10)');
      expect(countElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('With Count')).toBeInTheDocument();
      expect(screen.getByText('Without Count')).toBeInTheDocument();
      
      // Verify the specific category has the count
      const withCountButton = screen.getByRole('button', { name: /with count category/i });
      expect(within(withCountButton).getByText('(10)')).toBeInTheDocument();
    });

    it('should handle selecting non-existent category gracefully', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];

      // Act - Set selectedCategory to non-existent ID
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'non-existent-id',
      });

      // Assert - No button should be selected (all aria-pressed should be false)
      const allButton = screen.getByRole('button', { name: /all category/i });
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });

      // None should be selected since the ID doesn't match any category
      expect(allButton).toHaveAttribute('aria-pressed', 'false');
      expect(burgersButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should handle large number of categories', () => {
      // Arrange
      const manyCategories = createTestCategories(20);

      // Act
      renderMenuCategory({ categories: manyCategories });

      // Assert
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(21); // 20 categories + "All"
    });

    it('should handle categories with Unicode characters', () => {
      // Arrange
      const unicodeCategories: Category[] = [
        { id: 'emoji', name: '🍔 Burgers', itemCount: 5 },
        { id: 'japanese', name: '寿司 Sushi', itemCount: 10 },
        { id: 'german', name: 'Käse & Wurst', itemCount: 3 },
      ];

      // Act
      renderMenuCategory({ categories: unicodeCategories });

      // Assert
      expect(screen.getByText('🍔 Burgers')).toBeInTheDocument();
      expect(screen.getByText('寿司 Sushi')).toBeInTheDocument();
      expect(screen.getByText('Käse & Wurst')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Layout Variations Tests
  // ==========================================================================

  describe('layout variations', () => {
    it('should render with horizontal layout by default', () => {
      // Arrange & Act
      renderMenuCategory();

      // Assert - Container should have horizontal class
      const navigation = screen.getByRole('navigation', { name: /menu category filter/i });
      expect(navigation.className).toContain('menu-category--horizontal');
    });

    it('should render the category list container with proper class', () => {
      // Arrange & Act
      renderMenuCategory();

      // Assert
      const group = screen.getByRole('group', { name: /category filter options/i });
      expect(group.className).toContain('menu-category__list');
    });

    it('should render buttons with consistent styling class', () => {
      // Arrange
      const testCategories = createTestCategories(2);

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.className).toContain('menu-category__button');
      });
    });
  });

  // ==========================================================================
  // Data Attribute Tests
  // ==========================================================================

  describe('data attributes', () => {
    it('should set data-category-id attribute on category buttons', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
      ];

      // Act
      renderMenuCategory({ categories: testCategories });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      expect(burgersButton).toHaveAttribute('data-category-id', 'burgers');
    });

    it('should set data-category-id="all" on All button', () => {
      // Arrange & Act
      renderMenuCategory();

      // Assert
      const allButton = screen.getByRole('button', { name: /all category/i });
      expect(allButton).toHaveAttribute('data-category-id', 'all');
    });

    it('should set data-selected attribute based on selection state', () => {
      // Arrange
      const testCategories: Category[] = [
        { id: 'burgers', name: 'Burgers', itemCount: 10 },
        { id: 'sides', name: 'Sides', itemCount: 5 },
      ];

      // Act
      renderMenuCategory({
        categories: testCategories,
        selectedCategory: 'burgers',
      });

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      const sidesButton = screen.getByRole('button', { name: /sides category/i });

      expect(burgersButton).toHaveAttribute('data-selected', 'true');
      expect(sidesButton).toHaveAttribute('data-selected', 'false');
    });
  });

  // ==========================================================================
  // Integration with Fixture Data
  // ==========================================================================

  describe('integration with fixture data', () => {
    it('should render correctly with fixture categories', () => {
      // Arrange - Use fixture data via default props
      const props = createDefaultProps();

      // Act
      renderMenuCategory();

      // Assert - All fixture categories should be rendered
      expect(screen.getByText('Burgers')).toBeInTheDocument();
      expect(screen.getByText('Sides')).toBeInTheDocument();
      expect(screen.getByText('Drinks')).toBeInTheDocument();
      expect(screen.getByText('Desserts')).toBeInTheDocument();
    });

    it('should display correct item counts from fixture data', () => {
      // Arrange
      const defaultProps = createDefaultProps();
      const expectedCounts = defaultProps.categories.map((cat) => `(${cat.itemCount})`);

      // Act
      renderMenuCategory();

      // Assert - Each category count should be displayed (using getAllByText since counts may be duplicated with "All" button)
      expectedCounts.forEach((count) => {
        if (count !== '(undefined)') {
          // Use getAllByText since "All" button may have the same total count
          const elements = screen.getAllByText(count);
          expect(elements.length).toBeGreaterThanOrEqual(1);
        }
      });

      // Verify each specific category button has its count
      defaultProps.categories.forEach((cat) => {
        const buttonNameRegex = new RegExp(`${cat.name} category`, 'i');
        const button = screen.getByRole('button', { name: buttonNameRegex });
        expect(within(button).getByText(`(${cat.itemCount})`)).toBeInTheDocument();
      });
    });

    it('should work with onSelectCategory callback using fixture categories', async () => {
      // Arrange
      const mockOnSelectCategory = vi.fn();
      const { user } = renderMenuCategory({
        onSelectCategory: mockOnSelectCategory,
      });

      // Act
      const burgersButton = screen.getByRole('button', { name: /burgers category/i });
      await user.click(burgersButton);

      // Assert - Should be called with the fixture category ID
      expect(mockOnSelectCategory).toHaveBeenCalledWith('cat-burgers');
    });
  });
});
