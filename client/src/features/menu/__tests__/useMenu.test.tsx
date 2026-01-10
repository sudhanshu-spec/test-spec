/**
 * @fileoverview Unit tests for useMenu custom hook
 * @module tests/features/menu/useMenu
 *
 * Comprehensive test suite for the useMenu custom React hook that handles
 * menu data fetching, state management, and category filtering.
 *
 * Test Categories:
 * - Initial state verification
 * - Successful data fetching scenarios
 * - Category-based filtering
 * - Error handling (API failures, network errors)
 * - Refetch functionality
 * - Edge cases (empty menu, large menus, abort on unmount)
 *
 * Uses MSW (Mock Service Worker) for API mocking per Section 0.10.1
 * Follows AAA (Arrange, Act, Assert) pattern per Section 0.10.2
 *
 * @see {@link module:features/menu/hooks/useMenu} useMenu hook implementation
 * @see {@link module:tests/mocks/server} MSW server configuration
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

// Internal imports from depends_on_files
import { server } from '../../../__tests__/mocks/server';
import { useMenu } from '../hooks/useMenu';
import {
  menuItems,
  categories,
  createMenuItem,
  type TestMenuItem,
} from '../../../__tests__/fixtures/menuItems';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * API response structure for menu items endpoint.
 * @interface MenuItemsResponse
 */
interface MenuItemsResponse {
  items: TestMenuItem[];
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a successful menu items API response.
 * @param items - Array of menu items to include in response
 * @returns MenuItemsResponse object
 */
function createMenuItemsResponse(items: TestMenuItem[] = menuItems): MenuItemsResponse {
  return {
    items,
    total: items.length,
  };
}

/**
 * Creates a large menu for performance testing.
 * Generates 100+ items using the createMenuItem factory.
 * @param count - Number of items to generate
 * @returns Array of TestMenuItem objects
 */
function createLargeMenu(count: number): TestMenuItem[] {
  const largeMenu: TestMenuItem[] = [];
  const categoryOptions = ['burgers', 'sides', 'drinks', 'desserts'];
  
  for (let i = 0; i < count; i++) {
    const category = categoryOptions[i % categoryOptions.length];
    largeMenu.push(
      createMenuItem({
        id: `large-menu-item-${i}`,
        name: `Menu Item ${i}`,
        price: 9.99 + (i % 10),
        category,
        description: `Description for menu item ${i}`,
        imageUrl: `/images/menu/item-${i}.jpg`,
        available: true,
      })
    );
  }
  
  return largeMenu;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('useMenu', () => {
  /**
   * Reset all mocks and MSW handlers before each test.
   * Ensures test isolation per Section 0.10.1.
   */
  beforeEach(() => {
    vi.resetAllMocks();
    server.resetHandlers();
  });

  /**
   * Cleanup after each test.
   * No explicit cleanup needed for renderHook as it auto-cleans.
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should return loading: true initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(result.current.isLoading).toBe(true);
    });

    it('should return empty items array initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(result.current.items).toEqual([]);
    });

    it('should return empty categories array initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(result.current.categories).toEqual([]);
    });

    it('should return null error initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should return empty filteredItems initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(result.current.filteredItems).toEqual([]);
    });

    it('should return null selectedCategory initially when no initialCategory provided', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(result.current.selectedCategory).toBeNull();
    });

    it('should return setSelectedCategory as a function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(typeof result.current.setSelectedCategory).toBe('function');
    });

    it('should return refetch as a function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  // ==========================================================================
  // Successful Data Fetching Tests
  // ==========================================================================

  describe('successful data fetching', () => {
    it('should fetch menu items on mount', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items.length).toBeGreaterThan(0);
    });

    it('should set loading to false after successful fetch', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert - initially loading
      expect(result.current.isLoading).toBe(true);

      // Assert - loading false after fetch completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return items array from API', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(menuItems);
    });

    it('should return categories array from API', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual(categories);
    });

    it('should provide filteredItems equal to all items when no category selected', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.filteredItems).toEqual(result.current.items);
    });

    it('should maintain null error after successful fetch', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('should fetch both items and categories in parallel', async () => {
      // Arrange
      let itemsCallTime: number | null = null;
      let categoriesCallTime: number | null = null;

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          itemsCallTime = Date.now();
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        }),
        http.get(MENU_CATEGORIES_ENDPOINT, () => {
          categoriesCallTime = Date.now();
          return HttpResponse.json(categories, { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(itemsCallTime).not.toBeNull();
      expect(categoriesCallTime).not.toBeNull();
      // Both calls should happen close together (within 100ms)
      expect(Math.abs((itemsCallTime as number) - (categoriesCallTime as number))).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // Category Filtering Tests
  // ==========================================================================

  describe('category filtering', () => {
    it('should return all items when selectedCategory is null', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedCategory).toBeNull();
      expect(result.current.filteredItems).toEqual(result.current.items);
    });

    it('should filter items by selected category', async () => {
      // Arrange
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      act(() => {
        result.current.setSelectedCategory('burgers');
      });

      // Assert
      expect(result.current.selectedCategory).toBe('burgers');
      expect(result.current.filteredItems.every((item) => item.category.toLowerCase() === 'burgers')).toBe(true);
      expect(result.current.filteredItems.length).toBeGreaterThan(0);
    });

    it('should update filteredItems when category changes', async () => {
      // Arrange
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - set to burgers
      act(() => {
        result.current.setSelectedCategory('burgers');
      });

      const burgerItems = result.current.filteredItems;

      // Act - change to sides
      act(() => {
        result.current.setSelectedCategory('sides');
      });

      // Assert
      expect(result.current.filteredItems).not.toEqual(burgerItems);
      expect(result.current.filteredItems.every((item) => item.category.toLowerCase() === 'sides')).toBe(true);
    });

    it('should handle setSelectedCategory callback correctly', async () => {
      // Arrange
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      act(() => {
        result.current.setSelectedCategory('drinks');
      });

      // Assert
      expect(result.current.selectedCategory).toBe('drinks');
    });

    it('should return to all items when category is set back to null', async () => {
      // Arrange
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - set category
      act(() => {
        result.current.setSelectedCategory('burgers');
      });

      const filteredCount = result.current.filteredItems.length;

      // Act - clear category
      act(() => {
        result.current.setSelectedCategory(null);
      });

      // Assert
      expect(result.current.selectedCategory).toBeNull();
      expect(result.current.filteredItems.length).toEqual(result.current.items.length);
      expect(result.current.filteredItems.length).toBeGreaterThan(filteredCount);
    });

    it('should filter case-insensitively', async () => {
      // Arrange
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - set category with uppercase
      act(() => {
        result.current.setSelectedCategory('BURGERS');
      });

      // Assert - should still filter correctly
      expect(result.current.filteredItems.length).toBeGreaterThan(0);
      expect(result.current.filteredItems.every((item) => item.category.toLowerCase() === 'burgers')).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      // Arrange
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      act(() => {
        result.current.setSelectedCategory('nonexistent');
      });

      // Assert
      expect(result.current.filteredItems).toEqual([]);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should set error state on API failure (500 response)', async () => {
      // Arrange
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should set error state on network error', async () => {
      // Arrange
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.error();
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should maintain loading: false after error', async () => {
      // Arrange
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(
            { message: 'Service Unavailable' },
            { status: 503 }
          );
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it('should contain meaningful error message', async () => {
      // Arrange
      const errorMessage = 'Menu service temporarily unavailable';
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(
            { message: errorMessage },
            { status: 500 }
          );
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBeDefined();
      expect(result.current.error?.message.length).toBeGreaterThan(0);
    });

    it('should keep items empty after error', async () => {
      // Arrange
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(
            { message: 'Bad Gateway' },
            { status: 502 }
          );
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });

    it('should handle categories API failure independently', async () => {
      // Arrange - Items succeeds but categories fails
      server.use(
        http.get(MENU_CATEGORIES_ENDPOINT, () => {
          return HttpResponse.json(
            { message: 'Categories not available' },
            { status: 500 }
          );
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still have error since Promise.all rejects on any failure
      expect(result.current.error).not.toBeNull();
    });

    it('should handle 404 error response', async () => {
      // Arrange
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(
            { message: 'Not Found' },
            { status: 404 }
          );
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  // ==========================================================================
  // Refetch Functionality Tests
  // ==========================================================================

  describe('refetch functionality', () => {
    it('should trigger new API call when refetch() is called', async () => {
      // Arrange
      let fetchCount = 0;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          fetchCount++;
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        })
      );

      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialFetchCount = fetchCount;

      // Act
      await act(async () => {
        await result.current.refetch();
      });

      // Assert
      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    });

    it('should set loading during refetch', async () => {
      // Arrange
      let resolveItems: (() => void) | null = null;
      let isFirstCall = true;

      server.use(
        http.get(MENU_ITEMS_ENDPOINT, async () => {
          if (!isFirstCall) {
            await new Promise<void>((resolve) => {
              resolveItems = resolve;
            });
          }
          isFirstCall = false;
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        })
      );

      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      act(() => {
        result.current.refetch();
      });

      // Assert - should be loading during refetch
      expect(result.current.isLoading).toBe(true);

      // Cleanup - resolve the pending request
      if (resolveItems) {
        resolveItems();
      }

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should update data after refetch', async () => {
      // Arrange
      const newMenuItem = createMenuItem({
        id: 'new-item-001',
        name: 'New Burger',
        price: 12.99,
        category: 'burgers',
      });

      let callCount = 0;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
          }
          // Second call returns updated data
          return HttpResponse.json(
            createMenuItemsResponse([...menuItems, newMenuItem]),
            { status: 200 }
          );
        })
      );

      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialItemCount = result.current.items.length;

      // Act
      await act(async () => {
        await result.current.refetch();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.items.length).toBe(initialItemCount + 1);
      });
    });

    it('should clear previous error on successful refetch', async () => {
      // Arrange - first call fails
      let shouldFail = true;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          if (shouldFail) {
            return HttpResponse.json({ message: 'Error' }, { status: 500 });
          }
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        }),
        http.get(MENU_CATEGORIES_ENDPOINT, () => {
          if (shouldFail) {
            return HttpResponse.json({ message: 'Error' }, { status: 500 });
          }
          return HttpResponse.json(categories, { status: 200 });
        })
      );

      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();

      // Act - refetch with success
      shouldFail = false;
      await act(async () => {
        await result.current.refetch();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.items.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty menu response', async () => {
      // Arrange
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json({ items: [], total: 0 }, { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.filteredItems).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle large menu (100+ items) performance', async () => {
      // Arrange
      const largeMenu = createLargeMenu(150);
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuItemsResponse(largeMenu), { status: 200 });
        })
      );

      // Act
      const startTime = performance.now();
      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const endTime = performance.now();

      // Assert - should complete in reasonable time (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.current.items.length).toBe(150);
    });

    it('should filter large menu efficiently', async () => {
      // Arrange
      const largeMenu = createLargeMenu(200);
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(createMenuItemsResponse(largeMenu), { status: 200 });
        })
      );

      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - filter by category
      const startTime = performance.now();
      act(() => {
        result.current.setSelectedCategory('burgers');
      });
      const endTime = performance.now();

      // Assert - filtering should be fast (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.filteredItems.every((item) => item.category === 'burgers')).toBe(true);
    });

    it('should abort pending requests on unmount', async () => {
      // Arrange - create a slow response that will be aborted
      let requestAborted = false;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, async ({ request }) => {
          // Create an AbortController to track abort signal
          const abortPromise = new Promise<void>((resolve) => {
            request.signal.addEventListener('abort', () => {
              requestAborted = true;
              resolve();
            });
          });

          // Wait for either abort or timeout
          await Promise.race([
            abortPromise,
            new Promise((resolve) => setTimeout(resolve, 100)),
          ]);

          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        })
      );

      // Act
      const { unmount } = renderHook(() => useMenu());

      // Unmount immediately before fetch completes
      unmount();

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert - request should have been aborted
      expect(requestAborted).toBe(true);
    });

    it('should handle initial category option', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu({ initialCategory: 'sides' }));

      // Assert
      expect(result.current.selectedCategory).toBe('sides');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // filteredItems should only contain sides
      expect(result.current.filteredItems.every((item) => item.category.toLowerCase() === 'sides')).toBe(true);
    });

    it('should handle response with items wrapped in items property', async () => {
      // Arrange - API returns { items: [...] }
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json({ items: menuItems }, { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(menuItems);
    });

    it('should handle response with items as direct array', async () => {
      // Arrange - API returns items directly
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          return HttpResponse.json(menuItems, { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(menuItems);
    });

    it('should handle categories response as direct array', async () => {
      // Arrange - ensure categories return as array
      server.use(
        http.get(MENU_CATEGORIES_ENDPOINT, () => {
          return HttpResponse.json(categories, { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual(categories);
    });

    it('should handle categories response wrapped in categories property', async () => {
      // Arrange - API returns { categories: [...] }
      server.use(
        http.get(MENU_CATEGORIES_ENDPOINT, () => {
          return HttpResponse.json({ categories }, { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual(categories);
    });

    it('should handle empty categories response', async () => {
      // Arrange
      server.use(
        http.get(MENU_CATEGORIES_ENDPOINT, () => {
          return HttpResponse.json([], { status: 200 });
        })
      );

      // Act
      const { result } = renderHook(() => useMenu());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual([]);
    });

    it('should not update state after unmount', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let resolveRequest: (() => void) | null = null;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, async () => {
          await new Promise<void>((resolve) => {
            resolveRequest = resolve;
          });
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        })
      );

      // Act
      const { unmount } = renderHook(() => useMenu());

      // Unmount before request completes
      unmount();

      // Resolve the request after unmount
      if (resolveRequest) {
        resolveRequest();
      }

      // Wait for any potential state updates
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - no React state update warnings should occur
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update")
      );

      consoleSpy.mockRestore();
    });

    it('should handle concurrent refetch calls', async () => {
      // Arrange
      let callCount = 0;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, async () => {
          callCount++;
          // Add small delay to simulate network
          await new Promise((resolve) => setTimeout(resolve, 50));
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        })
      );

      const { result } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - trigger multiple refetch calls
      await act(async () => {
        result.current.refetch();
        result.current.refetch();
        result.current.refetch();
      });

      // Wait for all to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - state should be consistent
      expect(result.current.error).toBeNull();
      expect(result.current.items.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Cache Behavior Tests
  // ==========================================================================

  describe('cache behavior', () => {
    it('should respect enableCache: false (default)', async () => {
      // Arrange
      let fetchCount = 0;
      server.use(
        http.get(MENU_ITEMS_ENDPOINT, () => {
          fetchCount++;
          return HttpResponse.json(createMenuItemsResponse(), { status: 200 });
        })
      );

      // Act - render twice
      const { unmount } = renderHook(() => useMenu({ enableCache: false }));

      await waitFor(() => {
        expect(fetchCount).toBe(1);
      });

      unmount();

      // Render again
      renderHook(() => useMenu({ enableCache: false }));

      await waitFor(() => {
        expect(fetchCount).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Hook Return Value Type Tests
  // ==========================================================================

  describe('return value types', () => {
    it('should return correct type structure', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useMenu());

      // Assert - verify all properties exist with correct types
      expect(Array.isArray(result.current.items)).toBe(true);
      expect(Array.isArray(result.current.categories)).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.error === null || result.current.error instanceof Error).toBe(true);
      expect(result.current.selectedCategory === null || typeof result.current.selectedCategory === 'string').toBe(true);
      expect(typeof result.current.setSelectedCategory).toBe('function');
      expect(Array.isArray(result.current.filteredItems)).toBe(true);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should return stable function references', async () => {
      // Arrange
      const { result, rerender } = renderHook(() => useMenu());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialSetSelectedCategory = result.current.setSelectedCategory;
      const initialRefetch = result.current.refetch;

      // Act - trigger rerender
      rerender();

      // Assert - functions should be stable (same reference)
      expect(result.current.setSelectedCategory).toBe(initialSetSelectedCategory);
      expect(result.current.refetch).toBe(initialRefetch);
    });
  });
});
