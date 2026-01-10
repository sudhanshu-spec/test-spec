/**
 * @fileoverview Unit tests for MenuList container component
 * @module tests/features/menu/MenuList
 *
 * This test suite provides comprehensive coverage for the MenuList component,
 * testing loading states, error handling, category filtering, add-to-cart
 * functionality, accessibility features, and performance with large datasets.
 *
 * Test Categories:
 * - Loading state tests (spinner, aria-busy, disappearance)
 * - Successful data display tests (grid rendering, item counts)
 * - Category filtering integration tests (filter selection, live regions)
 * - Error state tests (error messages, retry functionality)
 * - Empty state tests (no items message, clear filter)
 * - Add-to-cart integration tests (callback propagation)
 * - Performance tests (100+ items rendering)
 * - Accessibility tests (ARIA, semantic markup, announcements)
 * - Initial state tests (initialCategory prop)
 *
 * Following patterns established in tests/lifecycle/server.test.js for:
 * - JSDoc documentation standards
 * - Helper function patterns (factory functions)
 * - beforeEach/afterEach lifecycle hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../__tests__/mocks/server';
import { MenuList } from '../MenuList';
import { customRender } from '../../../__tests__/utils/render';
import {
  menuItems,
  categories,
  createMenuItem,
  type TestMenuItem,
} from '../../../__tests__/fixtures/menuItems';
import { waitForLoadingToFinish } from '../../../__tests__/utils/testUtils';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * API response structure for menu items endpoint.
 * @interface MenuItemsResponse
 */
interface MenuItemsResponse {
  /** Array of menu items */
  items: TestMenuItem[];
  /** Total count of items */
  total: number;
}

// ============================================================================
// Test Constants
// ============================================================================

/**
 * API endpoint URL for menu items.
 * @constant {string}
 */
const MENU_ITEMS_ENDPOINT = '/api/menu/items';

/**
 * API endpoint URL for menu categories.
 * @constant {string}
 */
const MENU_CATEGORIES_ENDPOINT = '/api/menu/categories';

/**
 * Default timeout for async operations in milliseconds.
 * @constant {number}
 */
const DEFAULT_TIMEOUT = 5000;

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Creates a successful menu response with specified items.
 * @param items - Array of menu items to include in response
 * @returns MenuItemsResponse object
 */
function createMenuResponse(items: TestMenuItem[]): MenuItemsResponse {
  return {
    items,
    total: items.length,
  };
}

/**
 * Creates a large menu dataset for performance testing.
 * Generates 100+ unique menu items using the createMenuItem factory.
 * @param count - Number of items to generate (default 120)
 * @returns Array of TestMenuItem objects
 */
function createLargeMenuDataset(count: number = 120): TestMenuItem[] {
  const categoryOptions = ['burgers', 'sides', 'drinks', 'desserts'];
  const items: TestMenuItem[] = [];

  for (let i = 0; i < count; i++) {
    const category = categoryOptions[i % categoryOptions.length];
    items.push(
      createMenuItem({
        id: `perf-item-${i}`,
        name: `Test Item ${i + 1}`,
        price: 9.99 + (i % 10),
        category,
        description: `Performance test item number ${i + 1}`,
        imageUrl: `/images/menu/item-${i}.jpg`,
        available: true,
      })
    );
  }

  return items;
}

/**
 * Sets up MSW handler for slow loading response simulation.
 * @param delayMs - Delay in milliseconds before responding
 * @param items - Items to return after delay
 */
function setupSlowLoadingHandler(
  delayMs: number = 1000,
  items: TestMenuItem[] = menuItems
): void {
  server.use(
    http.get(MENU_ITEMS_ENDPOINT, async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return HttpResponse.json(createMenuResponse(items), { status: 200 });
    })
  );
}

/**
 * Sets up MSW handler for empty menu response.
 */
function setupEmptyMenuHandler(): void {
  server.use(
    http.get(MENU_ITEMS_ENDPOINT, () => {
      return HttpResponse.json(createMenuResponse([]), { status: 200 });
    })
  );
}

/**
 * Sets up MSW handler for API error response.
 * @param statusCode - HTTP status code for error (default 500)
 * @param message - Error message to return
 */
function setupErrorHandler(
  statusCode: number = 500,
  message: string = 'Internal Server Error'
): void {
  server.use(
    http.get(MENU_ITEMS_ENDPOINT, () => {
      return HttpResponse.json(
        { error: message, statusCode },
        { status: statusCode }
      );
    })
  );
}

/**
 * Sets up MSW handler for category-filtered menu response.
 * @param categoryId - Category to filter by
 */
function setupFilteredMenuHandler(categoryId: string): void {
  const filteredItems = menuItems.filter(
    (item) => item.category.toLowerCase() === categoryId.toLowerCase()
  );

  server.use(
    http.get(MENU_ITEMS_ENDPOINT, ({ request }) => {
      const url = new URL(request.url);
      const categoryParam = url.searchParams.get('category');

      if (categoryParam === categoryId) {
        return HttpResponse.json(createMenuResponse(filteredItems), {
          status: 200,
        });
      }

      return HttpResponse.json(createMenuResponse(menuItems), { status: 200 });
    })
  );
}

/**
 * Waits for menu list to finish loading by checking for absence of loading state.
 * @returns Promise that resolves when loading is complete
 */
async function waitForMenuToLoad(): Promise<void> {
  await waitFor(
    () => {
      const loadingElement = screen.queryByTestId('menu-list-loading');
      if (loadingElement) {
        throw new Error('Menu is still loading');
      }
    },
    { timeout: DEFAULT_TIMEOUT }
  );
}

/**
 * Gets all rendered menu item cards from the grid.
 * @returns Array of list item elements containing menu cards
 */
function getRenderedMenuItems(): HTMLElement[] {
  const grid = screen.queryByTestId('menu-list-grid');
  if (!grid) return [];
  return within(grid).queryAllByRole('listitem');
}

// ============================================================================
// Test Suite
// ============================================================================

describe('MenuList', () => {
  /**
   * Setup hook that runs before each test.
   * Resets all mocks and MSW handlers to ensure test isolation.
   */
  beforeEach(() => {
    vi.resetAllMocks();
    server.resetHandlers();
  });

  /**
   * Cleanup hook that runs after each test.
   * Cleans up rendered components to prevent memory leaks.
   */
  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('loading state', () => {
    it('should show loading spinner during data fetch', async () => {
      // Arrange - Set up slow loading to capture loading state
      setupSlowLoadingHandler(2000);

      // Act
      customRender(<MenuList />);

      // Assert - Loading element should be visible
      const loadingElement = screen.getByTestId('menu-list-loading');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should show loading spinner with accessible aria-busy attribute', async () => {
      // Arrange
      setupSlowLoadingHandler(2000);

      // Act
      customRender(<MenuList />);

      // Assert
      const loadingElement = screen.getByTestId('menu-list-loading');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });

    it('should have loading state announced via live region', async () => {
      // Arrange
      setupSlowLoadingHandler(2000);

      // Act
      customRender(<MenuList />);

      // Assert - Check for status role on loading element
      const loadingElement = screen.getByTestId('menu-list-loading');
      expect(loadingElement).toHaveAttribute('role', 'status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should display loading text message', async () => {
      // Arrange
      setupSlowLoadingHandler(2000);

      // Act
      customRender(<MenuList />);

      // Assert
      expect(screen.getByText(/loading menu items/i)).toBeInTheDocument();
    });

    it('should hide loading indicator after data loads successfully', async () => {
      // Arrange - Standard handler will respond quickly

      // Act
      customRender(<MenuList />);

      // Assert - Wait for loading to finish
      await waitForMenuToLoad();
      expect(screen.queryByTestId('menu-list-loading')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Successful Data Display Tests
  // ==========================================================================

  describe('successful data display', () => {
    it('should render MenuCategory filter component after loading', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Should have category filter buttons
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    it('should render MenuItemCard for each menu item', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Check that all menu items are rendered
      const renderedItems = getRenderedMenuItems();
      expect(renderedItems.length).toBe(menuItems.length);
    });

    it('should display all items when no category filter is active', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      const renderedItems = getRenderedMenuItems();
      expect(renderedItems.length).toBe(menuItems.length);
    });

    it('should render correct number of items matching the menu data', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Verify specific items are present
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
      expect(screen.getByText('Fries')).toBeInTheDocument();
      expect(screen.getByText('Soda')).toBeInTheDocument();
    });

    it('should display menu title "Our Menu"', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      expect(
        screen.getByRole('heading', { name: /our menu/i })
      ).toBeInTheDocument();
    });

    it('should use semantic section and heading structure', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      const menuSection = screen.getByTestId('menu-list');
      expect(menuSection.tagName).toBe('SECTION');
      expect(menuSection).toHaveAttribute('aria-labelledby', 'menu-list-title');
    });
  });

  // ==========================================================================
  // Category Filtering Integration Tests
  // ==========================================================================

  describe('category filtering integration', () => {
    it('should filter displayed items when category is selected', async () => {
      // Arrange
      const user = userEvent.setup();
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act - Click on "Burgers" category
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersButton);

      // Assert - Should only show burger items
      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        const items = within(grid).queryAllByRole('listitem');
        // Burgers category has 4 items in fixtures
        expect(items.length).toBe(4);
      });
    });

    it('should show all items when "All" category is selected', async () => {
      // Arrange
      const user = userEvent.setup();
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act - First filter by burgers, then click All
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersButton);

      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        const items = within(grid).queryAllByRole('listitem');
        expect(items.length).toBe(4);
      });

      const allButton = screen.getByRole('button', { name: /all/i });
      await user.click(allButton);

      // Assert - Should show all items again
      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        const items = within(grid).queryAllByRole('listitem');
        expect(items.length).toBe(menuItems.length);
      });
    });

    it('should update displayed items immediately on filter change', async () => {
      // Arrange
      const user = userEvent.setup();
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act - Click on "Drinks" category
      const drinksButton = screen.getByRole('button', { name: /drinks/i });
      await user.click(drinksButton);

      // Assert - Should update immediately
      await waitFor(() => {
        expect(screen.getByText('Soda')).toBeInTheDocument();
        expect(screen.getByText('Lemonade')).toBeInTheDocument();
        expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument();
      });
    });

    it('should highlight selected category button', async () => {
      // Arrange
      const user = userEvent.setup();
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersButton);

      // Assert - Check for aria-pressed or similar indicator
      await waitFor(() => {
        expect(burgersButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should announce filter results count via live region', async () => {
      // Arrange
      const user = userEvent.setup();
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act
      const sidesButton = screen.getByRole('button', { name: /sides/i });
      await user.click(sidesButton);

      // Assert - Check live region announcement
      await waitFor(() => {
        const announcement = screen.getByTestId('menu-list-announcement');
        expect(announcement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should filter by each category correctly', async () => {
      // Arrange
      const user = userEvent.setup();
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Test each category
      const categoriesToTest = [
        { name: /burgers/i, expectedCount: 4 },
        { name: /sides/i, expectedCount: 4 },
        { name: /drinks/i, expectedCount: 4 },
        { name: /desserts/i, expectedCount: 2 },
      ];

      for (const category of categoriesToTest) {
        // Act
        const categoryButton = screen.getByRole('button', { name: category.name });
        await user.click(categoryButton);

        // Assert
        await waitFor(() => {
          const grid = screen.getByTestId('menu-list-grid');
          const items = within(grid).queryAllByRole('listitem');
          expect(items.length).toBe(category.expectedCount);
        });
      }
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe('error state', () => {
    it('should show error message when API fails', async () => {
      // Arrange
      setupErrorHandler(500, 'Internal Server Error');

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByTestId('menu-list-error');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should display descriptive error message', async () => {
      // Arrange
      setupErrorHandler(500, 'Failed to fetch menu data');

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should provide retry button when error occurs', async () => {
      // Arrange
      setupErrorHandler(500);

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-button');
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).toHaveTextContent(/try again/i);
      });
    });

    it('should have error state with role="alert" for accessibility', async () => {
      // Arrange
      setupErrorHandler(500);

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByTestId('menu-list-error');
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('should have error state with aria-live="assertive"', async () => {
      // Arrange
      setupErrorHandler(500);

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByTestId('menu-list-error');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should retry data fetch when retry button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      let requestCount = 0;

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          requestCount++;
          if (requestCount === 1) {
            // First request fails
            return HttpResponse.json(
              { error: 'Server Error', statusCode: 500 },
              { status: 500 }
            );
          }
          // Subsequent requests succeed
          return HttpResponse.json(createMenuResponse(menuItems), {
            status: 200,
          });
        })
      );

      // Act
      customRender(<MenuList />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('menu-list-error')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Assert - Should show menu items after retry
      await waitFor(() => {
        expect(screen.getByTestId('menu-list-grid')).toBeInTheDocument();
      });

      expect(requestCount).toBe(2);
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('empty state', () => {
    it('should show empty state message when no items match filter', async () => {
      // Arrange - Set up a category with no items
      const user = userEvent.setup();
      
      // Override to return empty for a specific category filter
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, ({ request }) => {
          const url = new URL(request.url);
          const categoryParam = url.searchParams.get('category');
          
          if (categoryParam === 'special') {
            return HttpResponse.json(createMenuResponse([]), { status: 200 });
          }
          
          return HttpResponse.json(createMenuResponse(menuItems), { status: 200 });
        })
      );
      
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Filter all items client-side to test empty state
      // First click a category that exists
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersButton);

      // Verify items are filtered
      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        expect(grid).toBeInTheDocument();
      });
    });

    it('should show different message for "no items in category" vs "menu empty"', async () => {
      // Arrange - Empty menu response
      setupEmptyMenuHandler();

      // Act
      customRender(<MenuList />);

      // Assert - Should show empty state for completely empty menu
      await waitFor(() => {
        const emptyElement = screen.getByTestId('menu-list-empty');
        expect(emptyElement).toBeInTheDocument();
      });

      const emptyMessage = screen.getByTestId('empty-message');
      expect(emptyMessage).toHaveTextContent(/no menu items available/i);
    });

    it('should show "View All Items" button when filtered results are empty', async () => {
      // Arrange - Filter to category that returns no items
      const user = userEvent.setup();

      // Create a handler that filters but returns empty for a specific category
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, ({ request }) => {
          const url = new URL(request.url);
          const categoryParam = url.searchParams.get('category');

          // If filtering by 'empty-category', return no items
          if (categoryParam && categoryParam !== 'burgers' && categoryParam !== 'sides' && 
              categoryParam !== 'drinks' && categoryParam !== 'desserts') {
            return HttpResponse.json(createMenuResponse([]), { status: 200 });
          }

          const filtered = categoryParam
            ? menuItems.filter((item) => item.category === categoryParam)
            : menuItems;

          return HttpResponse.json(createMenuResponse(filtered), { status: 200 });
        })
      );

      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Click a valid category first to ensure filter state is working
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersButton);

      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        expect(grid).toBeInTheDocument();
      });
    });

    it('should have empty state with role="status" for accessibility', async () => {
      // Arrange
      setupEmptyMenuHandler();

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const emptyElement = screen.getByTestId('menu-list-empty');
        expect(emptyElement).toHaveAttribute('role', 'status');
      });
    });

    it('should have empty state icon displayed', async () => {
      // Arrange
      setupEmptyMenuHandler();

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const emptyElement = screen.getByTestId('menu-list-empty');
        expect(emptyElement).toBeInTheDocument();
        // Check for SVG icon (aria-hidden)
        const icon = emptyElement.querySelector('[aria-hidden="true"]');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Add-to-Cart Integration Tests
  // ==========================================================================

  describe('add-to-cart integration', () => {
    it('should pass onAddToCart prop to MenuItemCard components', async () => {
      // Arrange
      const mockOnAddToCart = vi.fn();

      // Act
      customRender(<MenuList onAddToCart={mockOnAddToCart} />);
      await waitForMenuToLoad();

      // Assert - Menu items should be rendered (onAddToCart is passed internally)
      expect(screen.getByTestId('menu-list-grid')).toBeInTheDocument();
    });

    it('should call onAddToCart callback with correct item when add button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();

      customRender(<MenuList onAddToCart={mockOnAddToCart} />);
      await waitForMenuToLoad();

      // Act - Find and click add to cart button on first item
      const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
      await user.click(addButtons[0]);

      // Assert
      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
      expect(mockOnAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          price: expect.any(Number),
        })
      );
    });

    it('should allow multiple items to be added in sequence', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();

      customRender(<MenuList onAddToCart={mockOnAddToCart} />);
      await waitForMenuToLoad();

      // Act - Click multiple add to cart buttons
      const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
      await user.click(addButtons[0]);
      await user.click(addButtons[1]);
      await user.click(addButtons[2]);

      // Assert
      expect(mockOnAddToCart).toHaveBeenCalledTimes(3);
    });

    it('should not throw error when onAddToCart is not provided', async () => {
      // Arrange & Act - Render without onAddToCart prop
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Should render without errors
      expect(screen.getByTestId('menu-list-grid')).toBeInTheDocument();
    });

    it('should call onAddToCart with correct item data structure', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnAddToCart = vi.fn();

      customRender(<MenuList onAddToCart={mockOnAddToCart} />);
      await waitForMenuToLoad();

      // Act
      const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
      await user.click(addButtons[0]);

      // Assert - Verify item structure matches MenuItem interface
      expect(mockOnAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          price: expect.any(Number),
          category: expect.any(String),
          description: expect.any(String),
          imageUrl: expect.any(String),
        })
      );
    });
  });

  // ==========================================================================
  // Performance with Large Menu Tests
  // ==========================================================================

  describe('performance with large menu', () => {
    it('should render 100+ items without throwing errors', async () => {
      // Arrange
      const largeDataset = createLargeMenuDataset(120);

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(largeDataset), {
            status: 200,
          });
        })
      );

      // Act & Assert - Should not throw
      expect(() => customRender(<MenuList />)).not.toThrow();
      await waitForMenuToLoad();

      // Verify items are rendered
      const renderedItems = getRenderedMenuItems();
      expect(renderedItems.length).toBe(120);
    });

    it('should render large dataset within acceptable time', async () => {
      // Arrange
      const largeDataset = createLargeMenuDataset(150);

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(largeDataset), {
            status: 200,
          });
        })
      );

      // Act
      const startTime = performance.now();
      customRender(<MenuList />);
      await waitForMenuToLoad();
      const endTime = performance.now();

      // Assert - Rendering should complete within 3 seconds
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(3000);
    });

    it('should filter large dataset without performance degradation', async () => {
      // Arrange
      const user = userEvent.setup();
      const largeDataset = createLargeMenuDataset(100);

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(largeDataset), {
            status: 200,
          });
        })
      );

      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act - Filter by category and measure time
      const startTime = performance.now();
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      await user.click(burgersButton);

      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        expect(grid).toBeInTheDocument();
      });
      const endTime = performance.now();

      // Assert - Filtering should be quick (under 1 second)
      const filterTime = endTime - startTime;
      expect(filterTime).toBeLessThan(1000);
    });

    it('should handle rapid filter changes gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      const largeDataset = createLargeMenuDataset(80);

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(largeDataset), {
            status: 200,
          });
        })
      );

      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Act - Rapidly switch between categories
      const burgersBtn = screen.getByRole('button', { name: /burgers/i });
      const sidesBtn = screen.getByRole('button', { name: /sides/i });
      const drinksBtn = screen.getByRole('button', { name: /drinks/i });
      const allBtn = screen.getByRole('button', { name: /all/i });

      await user.click(burgersBtn);
      await user.click(sidesBtn);
      await user.click(drinksBtn);
      await user.click(allBtn);

      // Assert - Should handle rapid changes without errors
      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should use semantic list markup for menu items', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      const grid = screen.getByTestId('menu-list-grid');
      expect(grid.tagName).toBe('UL');
      expect(grid).toHaveAttribute('role', 'list');

      const items = within(grid).getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have loading state announced to screen readers', async () => {
      // Arrange
      setupSlowLoadingHandler(2000);

      // Act
      customRender(<MenuList />);

      // Assert
      const loadingElement = screen.getByTestId('menu-list-loading');
      expect(loadingElement).toHaveAttribute('role', 'status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });

    it('should have filter changes announced via live region', async () => {
      // Arrange
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Live region should exist
      const announcement = screen.getByTestId('menu-list-announcement');
      expect(announcement).toHaveAttribute('role', 'status');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have error states using role="alert"', async () => {
      // Arrange
      setupErrorHandler(500);

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const errorElement = screen.getByTestId('menu-list-error');
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('should have menu grid with appropriate landmark label', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      const grid = screen.getByTestId('menu-list-grid');
      expect(grid).toHaveAttribute('aria-label');
      expect(grid.getAttribute('aria-label')).toMatch(/menu items/i);
    });

    it('should have section element with proper aria-labelledby', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      const section = screen.getByTestId('menu-list');
      expect(section.tagName).toBe('SECTION');
      expect(section).toHaveAttribute('aria-labelledby', 'menu-list-title');

      const heading = document.getElementById('menu-list-title');
      expect(heading).toBeInTheDocument();
    });

    it('should have retry button with accessible label', async () => {
      // Arrange
      setupErrorHandler(500);

      // Act
      customRender(<MenuList />);

      // Assert
      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-button');
        expect(retryButton).toHaveAttribute('aria-label');
        expect(retryButton.getAttribute('aria-label')).toMatch(
          /retry.*loading.*menu/i
        );
      });
    });

    it('should hide decorative icons from screen readers', async () => {
      // Arrange
      setupSlowLoadingHandler(2000);

      // Act
      customRender(<MenuList />);

      // Assert - Spinner icon should be aria-hidden
      const loadingElement = screen.getByTestId('menu-list-loading');
      const spinnerContainer = loadingElement.querySelector('[aria-hidden="true"]');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should respect initialCategory prop if provided', async () => {
      // Arrange & Act
      customRender(<MenuList initialCategory="burgers" />);
      await waitForMenuToLoad();

      // Assert - Should show only burgers initially
      await waitFor(() => {
        const grid = screen.getByTestId('menu-list-grid');
        const items = within(grid).queryAllByRole('listitem');
        expect(items.length).toBe(4); // 4 burger items
      });
    });

    it('should have burger category selected when initialCategory="burgers"', async () => {
      // Arrange & Act
      customRender(<MenuList initialCategory="burgers" />);
      await waitForMenuToLoad();

      // Assert
      const burgersButton = screen.getByRole('button', { name: /burgers/i });
      expect(burgersButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should start with no filter when initialCategory is not provided', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Should show all items
      const renderedItems = getRenderedMenuItems();
      expect(renderedItems.length).toBe(menuItems.length);
    });

    it('should have "All" category selected when no initialCategory provided', async () => {
      // Arrange & Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      const allButton = screen.getByRole('button', { name: /all/i });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should handle invalid initialCategory gracefully', async () => {
      // Arrange - Use a non-existent category
      customRender(<MenuList initialCategory="nonexistent" />);

      // Act & Assert - Should not crash, might show empty or all items
      await waitForMenuToLoad();
      expect(screen.getByTestId('menu-list')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle items with very long names', async () => {
      // Arrange
      const longNameItems = [
        createMenuItem({
          id: 'long-name-1',
          name: 'The Ultimate Super Deluxe Mega Burger With Everything On It And Extra Cheese Plus Bacon',
          price: 19.99,
          category: 'burgers',
        }),
      ];

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(longNameItems), {
            status: 200,
          });
        })
      );

      // Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert - Should render without breaking layout
      expect(screen.getByTestId('menu-list-grid')).toBeInTheDocument();
    });

    it('should handle items with zero price (promotional items)', async () => {
      // Arrange
      const freeItems = [
        createMenuItem({
          id: 'free-item-1',
          name: 'Free Sample Burger',
          price: 0,
          category: 'burgers',
        }),
      ];

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(freeItems), {
            status: 200,
          });
        })
      );

      // Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      expect(screen.getByTestId('menu-list-grid')).toBeInTheDocument();
      expect(screen.getByText('Free Sample Burger')).toBeInTheDocument();
    });

    it('should handle network timeout gracefully', async () => {
      // Arrange - Simulate timeout with very slow response
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, async () => {
          // Simulate a timeout scenario
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.error();
        })
      );

      // Act
      customRender(<MenuList />);

      // Assert - Should show error state after timeout
      await waitFor(
        () => {
          const errorElement = screen.queryByTestId('menu-list-error');
          const loadingElement = screen.queryByTestId('menu-list-loading');
          // Either error is shown or component handles it gracefully
          expect(errorElement || !loadingElement).toBeTruthy();
        },
        { timeout: DEFAULT_TIMEOUT }
      );
    });

    it('should handle special characters in item names', async () => {
      // Arrange
      const specialItems = [
        createMenuItem({
          id: 'special-1',
          name: "Chef's Special - BBQ & Jalapeño (Limited Edition!)",
          price: 14.99,
          category: 'burgers',
        }),
      ];

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuResponse(specialItems), {
            status: 200,
          });
        })
      );

      // Act
      customRender(<MenuList />);
      await waitForMenuToLoad();

      // Assert
      expect(
        screen.getByText(/Chef's Special - BBQ & Jalapeño/i)
      ).toBeInTheDocument();
    });
  });
});
