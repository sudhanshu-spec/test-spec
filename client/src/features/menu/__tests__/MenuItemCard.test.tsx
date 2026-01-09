/**
 * @fileoverview Unit tests for MenuItemCard component
 * @module tests/features/menu/MenuItemCard
 *
 * Comprehensive test suite for the MenuItemCard React component.
 * Tests item display rendering including name, description, price, and image.
 * Validates add-to-cart button functionality with click handler.
 * Tests accessibility compliance with proper ARIA attributes and semantic HTML.
 * Covers edge cases including long item names (truncation), missing/broken images
 * (fallback display), zero price items, and unavailable items (disabled state).
 *
 * Uses React Testing Library for component rendering and user event simulation.
 * Follows the AAA (Arrange-Act-Assert) pattern established in the project.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuItemCard, MenuItemCardProps } from '../MenuItemCard';
import { createMockMenuItem, TestMenuItem } from '../../../__tests__/utils/testUtils';
import {
  menuItems,
  outOfStockItem,
  longNameItem,
  brokenImageItem,
  promotionalItem,
  highPriceItem,
} from '../../../__tests__/fixtures/menuItems';

// ============================================================================
// Test Helper Functions
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default test props configuration for MenuItemCard.
 * Use createTestProps() to create customized instances.
 * @constant
 */
const DEFAULT_TEST_PROPS: MenuItemCardProps = {
  item: menuItems[0], // Classic Burger
  onAddToCart: vi.fn(),
};

/**
 * Creates test props for MenuItemCard with optional overrides.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param overrides - Partial props to override defaults
 * @returns Complete MenuItemCardProps object
 */
function createTestProps(overrides: Partial<MenuItemCardProps> = {}): MenuItemCardProps {
  return {
    ...DEFAULT_TEST_PROPS,
    onAddToCart: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a menu item with special characters for testing.
 * @returns TestMenuItem with special characters in name and description
 */
function createSpecialCharacterItem(): TestMenuItem {
  return {
    id: 'special-001',
    name: 'Jalapeño & Cheese "Deluxe" <Special>',
    price: 12.99,
    category: 'burgers',
    description: 'Spicy jalapeño with "special" cheese & secret sauce <bold>',
    imageUrl: '/images/menu/special-burger.jpg',
    available: true,
  };
}

/**
 * Creates a menu item with missing imageUrl for testing.
 * @returns TestMenuItem without imageUrl
 */
function createMissingImageItem(): TestMenuItem {
  return {
    id: 'missing-img-001',
    name: 'No Image Burger',
    price: 9.99,
    category: 'burgers',
    description: 'A burger without an image.',
    imageUrl: '',
    available: true,
  };
}

/**
 * Creates a menu item with very long description for testing truncation.
 * @returns TestMenuItem with long description
 */
function createLongDescriptionItem(): TestMenuItem {
  return {
    id: 'long-desc-001',
    name: 'Description Test Burger',
    price: 10.99,
    category: 'burgers',
    description:
      'This is an extraordinarily long description that should test the truncation functionality of the menu item card component. It contains multiple sentences and goes on for quite a while to ensure that we properly test how the component handles overflow text and displays ellipsis or other truncation indicators.',
    imageUrl: '/images/menu/long-desc-burger.jpg',
    available: true,
  };
}

// ============================================================================
// Test Suite: MenuItemCard Component
// ============================================================================

describe('MenuItemCard', () => {
  /**
   * Reset all mocks before each test to ensure test isolation.
   * Following the beforeEach pattern from server.test.js.
   */
  beforeEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Clean up rendered components after each test.
   * Ensures no state leaks between tests.
   */
  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Test Group: Default Props Rendering
  // Happy path tests for component rendering
  // ==========================================================================

  describe('when rendered with default props', () => {
    it('should render the item name in a heading element', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const nameElement = screen.getByRole('heading', { name: props.item.name });
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveTextContent(props.item.name);
    });

    it('should render the item description', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const descriptionElement = screen.getByTestId('menu-item-description');
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveTextContent(props.item.description);
    });

    it('should render the formatted price with dollar sign and decimal places', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      expect(priceElement).toBeInTheDocument();
      expect(priceElement).toHaveTextContent('$8.99'); // Classic Burger price
    });

    it('should render the item image with correct src attribute', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const imageElement = screen.getByRole('img', { name: props.item.name });
      expect(imageElement).toBeInTheDocument();
      expect(imageElement).toHaveAttribute('src', props.item.imageUrl);
    });

    it('should render the add-to-cart button', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button', { name: /add.*cart/i });
      expect(buttonElement).toBeInTheDocument();
      expect(buttonElement).toHaveTextContent('Add to Cart');
    });

    it('should render the item category', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const categoryElement = screen.getByTestId('menu-item-category');
      expect(categoryElement).toBeInTheDocument();
      expect(categoryElement).toHaveTextContent(props.item.category);
    });

    it('should render as an article element for semantic structure', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const articleElement = screen.getByRole('article');
      expect(articleElement).toBeInTheDocument();
      expect(articleElement).toHaveClass('menu-item-card');
    });
  });

  // ==========================================================================
  // Test Group: Image Handling
  // Tests for image loading states, alt text, and fallback behavior
  // ==========================================================================

  describe('image handling', () => {
    it('should set alt text to item name for accessibility', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', props.item.name);
    });

    it('should show fallback placeholder when image fails to load', () => {
      // Arrange
      const props = createTestProps({ item: brokenImageItem });

      // Act
      render(<MenuItemCard {...props} />);
      const imageElement = screen.getByTestId('menu-item-image');

      // Simulate image load error
      fireEvent.error(imageElement);

      // Assert
      expect(imageElement).toHaveAttribute('src');
      // The src should be the fallback data URL (starts with 'data:image')
      const src = imageElement.getAttribute('src');
      expect(src).toMatch(/^data:image/);
    });

    it('should show loading placeholder while image is loading', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert - Loading placeholder should be present initially
      const loadingPlaceholder = screen.getByTestId('image-loading-placeholder');
      expect(loadingPlaceholder).toBeInTheDocument();
    });

    it('should hide loading placeholder after image loads successfully', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);
      const imageElement = screen.getByTestId('menu-item-image');

      // Simulate successful image load
      fireEvent.load(imageElement);

      // Assert - Loading placeholder should be removed
      expect(screen.queryByTestId('image-loading-placeholder')).not.toBeInTheDocument();
    });

    it('should use fallback image when imageUrl is empty string', () => {
      // Arrange
      const item = createMissingImageItem();
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const imageElement = screen.getByTestId('menu-item-image');
      const src = imageElement.getAttribute('src');
      expect(src).toMatch(/^data:image/);
    });

    it('should apply lazy loading attribute to the image', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('loading', 'lazy');
    });
  });

  // ==========================================================================
  // Test Group: Add to Cart Interaction
  // Tests for button click handling and callback invocation
  // ==========================================================================

  describe('add-to-cart interaction', () => {
    it('should call onAddToCart with item when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();
      const props = createTestProps({ onAddToCart: mockOnAddToCart });

      // Act
      render(<MenuItemCard {...props} />);
      const buttonElement = screen.getByRole('button', { name: /add.*cart/i });
      await user.click(buttonElement);

      // Assert
      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
      expect(mockOnAddToCart).toHaveBeenCalledWith(props.item);
    });

    it('should allow button to be focused via keyboard', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);
      await user.tab();

      // Assert - Find the button and verify it can receive focus
      const buttonElement = screen.getByRole('button', { name: /add.*cart/i });
      // After tabbing, the button should be focusable (not disabled)
      expect(buttonElement).not.toBeDisabled();
    });

    it('should have proper aria-label on add to cart button', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button', { name: /add.*cart/i });
      const ariaLabel = buttonElement.getAttribute('aria-label');
      expect(ariaLabel).toContain(props.item.name);
      expect(ariaLabel).toContain('cart');
    });

    it('should trigger callback with Enter key when button is focused', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();
      const props = createTestProps({ onAddToCart: mockOnAddToCart });

      // Act
      render(<MenuItemCard {...props} />);
      const buttonElement = screen.getByRole('button', { name: /add.*cart/i });
      buttonElement.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    });

    it('should work without onAddToCart callback (optional prop)', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createTestProps({ onAddToCart: undefined });

      // Act
      render(<MenuItemCard {...props} />);
      const buttonElement = screen.getByRole('button', { name: /add.*cart/i });

      // Assert - Should not throw when clicked without callback
      await expect(user.click(buttonElement)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Test Group: Unavailable Items
  // Tests for items marked as unavailable
  // ==========================================================================

  describe('unavailable items', () => {
    it('should render disabled state when available is false', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).toBeDisabled();
    });

    it('should have add-to-cart button disabled', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByTestId('add-to-cart-button');
      expect(buttonElement).toBeDisabled();
      expect(buttonElement).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show unavailable indicator overlay', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const overlayElement = screen.getByTestId('unavailable-overlay');
      expect(overlayElement).toBeInTheDocument();
      expect(overlayElement).toHaveTextContent(/unavailable/i);
    });

    it('should display "Unavailable" text on button instead of "Add to Cart"', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).toHaveTextContent('Unavailable');
    });

    it('should not call onAddToCart when unavailable item button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();
      const props = createTestProps({
        item: outOfStockItem,
        onAddToCart: mockOnAddToCart,
      });

      // Act
      render(<MenuItemCard {...props} />);
      const buttonElement = screen.getByRole('button');

      // Try to click the disabled button
      await user.click(buttonElement);

      // Assert
      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });

    it('should have appropriate aria-label for unavailable items', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button');
      const ariaLabel = buttonElement.getAttribute('aria-label');
      expect(ariaLabel).toContain(outOfStockItem.name);
      expect(ariaLabel).toContain('unavailable');
    });

    it('should apply disabled styling class to button', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).toHaveClass('menu-item-card__add-button--disabled');
    });
  });

  // ==========================================================================
  // Test Group: Edge Cases
  // Tests for boundary conditions and special scenarios
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle very long item names with title attribute for full text', () => {
      // Arrange
      const props = createTestProps({ item: longNameItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const nameElement = screen.getByTestId('menu-item-name');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveAttribute('title', longNameItem.name);
      expect(nameElement).toHaveTextContent(longNameItem.name);
    });

    it('should handle long descriptions with title attribute for full text', () => {
      // Arrange
      const item = createLongDescriptionItem();
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const descriptionElement = screen.getByTestId('menu-item-description');
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveAttribute('title', item.description);
    });

    it('should handle missing imageUrl gracefully with fallback', () => {
      // Arrange
      const item = createMissingImageItem();
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const imageElement = screen.getByRole('img');
      expect(imageElement).toBeInTheDocument();
      // Should use fallback image (data URL)
      expect(imageElement.getAttribute('src')).toMatch(/^data:image/);
    });

    it('should display "Free" for zero price items (promotional)', () => {
      // Arrange
      const props = createTestProps({ item: promotionalItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      expect(priceElement).toHaveTextContent('Free');
    });

    it('should handle high price items with correct formatting', () => {
      // Arrange
      const props = createTestProps({ item: highPriceItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      expect(priceElement).toHaveTextContent('$99.99');
    });

    it('should handle special characters in name correctly', () => {
      // Arrange
      const item = createSpecialCharacterItem();
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const nameElement = screen.getByTestId('menu-item-name');
      expect(nameElement).toHaveTextContent(item.name);
    });

    it('should handle special characters in description correctly', () => {
      // Arrange
      const item = createSpecialCharacterItem();
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const descriptionElement = screen.getByTestId('menu-item-description');
      expect(descriptionElement).toHaveTextContent(item.description);
    });

    it('should render different menu items correctly', () => {
      // Arrange - Test with multiple different items
      const testItems = [menuItems[0], menuItems[4], menuItems[8]];

      testItems.forEach((item) => {
        // Act
        const { unmount } = render(
          <MenuItemCard item={item} onAddToCart={vi.fn()} />
        );

        // Assert
        expect(screen.getByTestId('menu-item-name')).toHaveTextContent(item.name);
        expect(screen.getByTestId('menu-item-description')).toHaveTextContent(
          item.description
        );

        // Cleanup for next iteration
        unmount();
      });
    });

    it('should handle item with available property explicitly set to true', () => {
      // Arrange
      const item: TestMenuItem = {
        ...menuItems[0],
        available: true,
      };
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).not.toBeDisabled();
      expect(buttonElement).toHaveTextContent('Add to Cart');
    });

    it('should handle item without available property (defaults to available)', () => {
      // Arrange
      const item: TestMenuItem = {
        id: 'test-001',
        name: 'Test Burger',
        price: 9.99,
        category: 'burgers',
        description: 'A test burger.',
        imageUrl: '/images/test.jpg',
        // available property intentionally omitted
      };
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).not.toBeDisabled();
      expect(buttonElement).toHaveTextContent('Add to Cart');
    });
  });

  // ==========================================================================
  // Test Group: Accessibility
  // Tests for WCAG compliance and screen reader support
  // ==========================================================================

  describe('accessibility', () => {
    it('should have semantic HTML structure with heading for name', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(props.item.name);
    });

    it('should have image with proper alt text matching item name', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const image = screen.getByRole('img', { name: props.item.name });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', props.item.name);
    });

    it('should have add-to-cart button with accessible name', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName();
      // The aria-label should describe the action
      const ariaLabel = button.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel!.length).toBeGreaterThan(0);
    });

    it('should have article element with aria-label describing the item', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const article = screen.getByRole('article');
      const ariaLabel = article.getAttribute('aria-label');
      expect(ariaLabel).toContain(props.item.name);
    });

    it('should have price element with aria-label', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      const ariaLabel = priceElement.getAttribute('aria-label');
      expect(ariaLabel).toContain('Price');
    });

    it('should be keyboard navigable with focusable button', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Tab through focusable elements
      await user.tab();

      // Assert - button should be reachable via keyboard
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have proper button type attribute', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should mark decorative elements as aria-hidden', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert - Loading placeholder should be aria-hidden
      const loadingPlaceholder = screen.getByTestId('image-loading-placeholder');
      expect(loadingPlaceholder).toHaveAttribute('aria-hidden', 'true');
    });

    it('should mark unavailable overlay as aria-hidden', () => {
      // Arrange
      const props = createTestProps({ item: outOfStockItem });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const overlay = screen.getByTestId('unavailable-overlay');
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have data-testid attribute for testing purposes', () => {
      // Arrange
      const props = createTestProps();

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const card = screen.getByTestId(`menu-item-card-${props.item.id}`);
      expect(card).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Test Group: Price Formatting
  // Tests for various price display scenarios
  // ==========================================================================

  describe('price formatting', () => {
    it('should format price with two decimal places', () => {
      // Arrange
      const item: TestMenuItem = {
        ...menuItems[0],
        price: 10.5,
      };
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      expect(priceElement).toHaveTextContent('$10.50');
    });

    it('should format whole number prices with .00 suffix', () => {
      // Arrange
      const item: TestMenuItem = {
        ...menuItems[0],
        price: 15,
      };
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      expect(priceElement).toHaveTextContent('$15.00');
    });

    it('should display "Free" for negative price items', () => {
      // Arrange
      const item: TestMenuItem = {
        ...menuItems[0],
        price: -5.99,
      };
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      expect(priceElement).toHaveTextContent('Free');
    });

    it('should handle prices with more than two decimal places', () => {
      // Arrange
      const item: TestMenuItem = {
        ...menuItems[0],
        price: 10.999,
      };
      const props = createTestProps({ item });

      // Act
      render(<MenuItemCard {...props} />);

      // Assert
      const priceElement = screen.getByTestId('menu-item-price');
      // Should round to 2 decimal places
      expect(priceElement).toHaveTextContent('$11.00');
    });
  });

  // ==========================================================================
  // Test Group: Component Integration
  // Tests for component behavior with different prop combinations
  // ==========================================================================

  describe('component integration', () => {
    it('should render correctly with all burgers from fixtures', () => {
      // Arrange
      const burgerItems = menuItems.filter((item) => item.category === 'burgers');

      // Act & Assert
      burgerItems.forEach((item) => {
        const { unmount } = render(
          <MenuItemCard item={item} onAddToCart={vi.fn()} />
        );

        expect(screen.getByTestId('menu-item-name')).toHaveTextContent(item.name);
        expect(screen.getByTestId('menu-item-category')).toHaveTextContent(
          item.category
        );

        unmount();
      });
    });

    it('should render correctly with all fixture categories', () => {
      // Arrange
      const categories = ['burgers', 'sides', 'drinks', 'desserts'];

      // Act & Assert
      categories.forEach((category) => {
        const item = menuItems.find((i) => i.category === category);
        if (item) {
          const { unmount } = render(
            <MenuItemCard item={item} onAddToCart={vi.fn()} />
          );

          expect(screen.getByTestId('menu-item-category')).toHaveTextContent(
            category
          );

          unmount();
        }
      });
    });

    it('should maintain state isolation between renders', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();

      // Act - Render first card and click
      const { unmount: unmount1 } = render(
        <MenuItemCard item={menuItems[0]} onAddToCart={mockCallback1} />
      );
      await user.click(screen.getByRole('button'));
      unmount1();

      // Render second card and click
      render(<MenuItemCard item={menuItems[1]} onAddToCart={mockCallback2} />);
      await user.click(screen.getByRole('button'));

      // Assert - Each callback should be called once with correct item
      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback1).toHaveBeenCalledWith(menuItems[0]);
      expect(mockCallback2).toHaveBeenCalledTimes(1);
      expect(mockCallback2).toHaveBeenCalledWith(menuItems[1]);
    });

    it('should re-render correctly when item prop changes', () => {
      // Arrange
      const props1 = createTestProps({ item: menuItems[0] });

      // Act - Initial render
      const { rerender } = render(<MenuItemCard {...props1} />);
      expect(screen.getByTestId('menu-item-name')).toHaveTextContent(
        menuItems[0].name
      );

      // Rerender with different item
      const props2 = createTestProps({ item: menuItems[1] });
      rerender(<MenuItemCard {...props2} />);

      // Assert - Should display new item data
      expect(screen.getByTestId('menu-item-name')).toHaveTextContent(
        menuItems[1].name
      );
    });
  });
});
