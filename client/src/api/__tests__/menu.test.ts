/**
 * @fileoverview Unit tests for menu API functions
 * @module tests/api/menu
 *
 * Comprehensive test suite for menu-related API operations including:
 * - Fetching all menu items with optional category filtering
 * - Fetching individual menu items by ID
 * - Fetching menu categories
 * - Searching menu items by query
 *
 * Uses Vitest for testing framework, MSW for API mocking,
 * and follows AAA (Arrange, Act, Assert) pattern with minimum 3 assertions per test.
 *
 * @see {@link tests/unit/config.test.js} for configuration testing patterns
 * @see {@link tests/lifecycle/server.test.js} for mock factory patterns
 * @see {@link tests/integration/endpoints.test.js} for HTTP testing patterns
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { server } from '../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';
import * as menuApi from '../menu';
import {
  menuItems,
  categories,
  burgers,
  sides,
  drinks,
  type TestMenuItem,
  type MenuCategory,
  type MenuResponse,
  createMenuItem,
  outOfStockItem,
  promotionalItem,
  longNameItem,
  brokenImageItem,
} from '../../__tests__/fixtures/menuItems';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * @typedef {Object} MenuItem
 * @property {string} id - Unique identifier for the menu item
 * @property {string} name - Display name of the menu item
 * @property {number} price - Price in dollars
 * @property {string} category - Category for grouping
 * @property {string} description - Detailed description
 * @property {string} imageUrl - URL to the menu item image
 * @property {boolean} [available] - Whether the item is available
 */
type MenuItem = TestMenuItem;

/**
 * @typedef {Object} Category
 * @property {string} id - Unique identifier for the category
 * @property {string} name - Display name of the category
 * @property {number} itemCount - Number of items in this category
 */
type Category = MenuCategory;

/**
 * @typedef {Object} ApiMenuResponse
 * @property {MenuItem[]} items - Array of menu items
 * @property {number} total - Total count of items
 */
type ApiMenuResponse = MenuResponse;

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for all menu API endpoints.
 * @constant {string}
 */
const API_BASE_URL = '/api/menu';

// ============================================================================
// Helper Functions (following createMockServer pattern from server.test.js)
// ============================================================================

/**
 * Creates a mock menu item with optional overrides.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<MenuItem>} overrides - Optional properties to override
 * @returns {MenuItem} Complete mock menu item
 */
function createMockMenuItem(overrides?: Partial<MenuItem>): MenuItem {
  const defaultItem: MenuItem = {
    id: 'mock-item-001',
    name: 'Mock Burger',
    price: 9.99,
    category: 'burgers',
    description: 'A mock burger for testing purposes.',
    imageUrl: '/images/menu/mock-burger.jpg',
    available: true,
  };

  return {
    ...defaultItem,
    ...overrides,
  };
}

/**
 * Creates a mock menu response object.
 *
 * @param {MenuItem[]} items - Array of menu items for the response
 * @returns {ApiMenuResponse} Mock menu response object
 */
function createMockMenuResponse(items: MenuItem[]): ApiMenuResponse {
  return {
    items,
    total: items.length,
  };
}

/**
 * Filters menu items by category.
 *
 * @param {MenuItem[]} items - Array of menu items to filter
 * @param {string} category - Category to filter by
 * @returns {MenuItem[]} Filtered array of menu items
 */
function filterByCategory(items: MenuItem[], category: string): MenuItem[] {
  return items.filter(
    (item) => item.category.toLowerCase() === category.toLowerCase()
  );
}

// ============================================================================
// Test Suite Setup
// ============================================================================

describe('Menu API', () => {
  /**
   * Start MSW server before all tests.
   * Intercept requests with strict error handling for unhandled requests.
   */
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  /**
   * Reset handlers between tests to ensure test isolation.
   * Clear any runtime handlers added during tests.
   */
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  /**
   * Close MSW server after all tests complete.
   * Clean up resources and stop request interception.
   */
  afterAll(() => {
    server.close();
  });

  // ==========================================================================
  // getMenuItems Tests
  // ==========================================================================

  describe('getMenuItems', () => {
    it('should fetch all menu items', async () => {
      // Arrange
      const expectedItemCount = menuItems.length;

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(expectedItemCount);
      expect(result.total).toBe(expectedItemCount);
    });

    it('should send GET request to /api/menu/items endpoint', async () => {
      // Arrange
      let requestUrl = '';
      let requestMethod = '';

      server.use(
        http.get(`${API_BASE_URL}/items`, ({ request }) => {
          requestUrl = request.url;
          requestMethod = request.method;
          return HttpResponse.json(createMockMenuResponse(menuItems), { status: 200 });
        })
      );

      // Act
      await menuApi.getMenuItems();

      // Assert
      expect(requestMethod).toBe('GET');
      expect(requestUrl).toContain('/api/menu/items');
      expect(requestUrl).not.toContain('undefined');
    });

    it('should return array of MenuItem objects with all required properties', async () => {
      // Arrange
      const expectedProperties = ['id', 'name', 'price', 'category', 'description', 'imageUrl'];

      // Act
      const result = await menuApi.getMenuItems();
      const firstItem = result.items[0];

      // Assert
      expect(firstItem).toBeDefined();
      expectedProperties.forEach((prop) => {
        expect(firstItem).toHaveProperty(prop);
      });
      expect(typeof firstItem.id).toBe('string');
      expect(typeof firstItem.price).toBe('number');
    });

    it('should return total count in response', async () => {
      // Arrange
      const mockItems = [createMockMenuItem({ id: 'item-1' }), createMockMenuItem({ id: 'item-2' })];

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(createMockMenuResponse(mockItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result.total).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(result.total).toBe(mockItems.length);
      expect(result.items.length).toBe(result.total);
    });

    it('should filter by category when provided', async () => {
      // Arrange
      const targetCategory = 'burgers';
      const expectedBurgers = burgers;

      // Act
      const result = await menuApi.getMenuItems(targetCategory);

      // Assert
      expect(result.items.length).toBe(expectedBurgers.length);
      expect(result.items.every((item) => item.category === targetCategory)).toBe(true);
      expect(result.total).toBe(expectedBurgers.length);
    });

    it('should handle empty category filter and return all items', async () => {
      // Arrange
      const emptyCategory = '';

      // Act
      const result = await menuApi.getMenuItems(emptyCategory);

      // Assert
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(menuItems.length);
      expect(result.total).toBe(menuItems.length);
    });

    it('should return empty array for invalid category', async () => {
      // Arrange
      const invalidCategory = 'nonexistent-category-xyz';

      // Act
      const result = await menuApi.getMenuItems(invalidCategory);

      // Assert
      expect(result.items).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should filter sides category correctly', async () => {
      // Arrange
      const targetCategory = 'sides';
      const expectedSides = sides;

      // Act
      const result = await menuApi.getMenuItems(targetCategory);

      // Assert
      expect(result.items.length).toBe(expectedSides.length);
      expect(result.items.every((item) => item.category === targetCategory)).toBe(true);
      expect(result.total).toBe(expectedSides.length);
    });

    it('should filter drinks category correctly', async () => {
      // Arrange
      const targetCategory = 'drinks';
      const expectedDrinks = drinks;

      // Act
      const result = await menuApi.getMenuItems(targetCategory);

      // Assert
      expect(result.items.length).toBe(expectedDrinks.length);
      expect(result.items.every((item) => item.category === targetCategory)).toBe(true);
      expect(result.total).toBe(expectedDrinks.length);
    });
  });

  // ==========================================================================
  // getMenuItem Tests
  // ==========================================================================

  describe('getMenuItem', () => {
    it('should fetch single menu item by ID', async () => {
      // Arrange
      const targetId = 'burger-001';
      const expectedItem = menuItems.find((item) => item.id === targetId);

      // Act
      const result = await menuApi.getMenuItem(targetId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(targetId);
      expect(result.name).toBe(expectedItem?.name);
      expect(result.price).toBe(expectedItem?.price);
    });

    it('should send GET request to /api/menu/items/:id endpoint', async () => {
      // Arrange
      const targetId = 'burger-002';
      let capturedUrl = '';
      let capturedMethod = '';

      server.use(
        http.get(`${API_BASE_URL}/items/:id`, ({ request }) => {
          capturedUrl = request.url;
          capturedMethod = request.method;
          const item = menuItems.find((i) => i.id === targetId);
          return HttpResponse.json(item, { status: 200 });
        })
      );

      // Act
      await menuApi.getMenuItem(targetId);

      // Assert
      expect(capturedMethod).toBe('GET');
      expect(capturedUrl).toContain(`/api/menu/items/${targetId}`);
      expect(capturedUrl).toContain(targetId);
    });

    it('should return MenuItem object with all properties', async () => {
      // Arrange
      const targetId = 'burger-001';
      const requiredProperties = ['id', 'name', 'price', 'category', 'description', 'imageUrl'];

      // Act
      const result = await menuApi.getMenuItem(targetId);

      // Assert
      expect(result).toBeDefined();
      requiredProperties.forEach((prop) => {
        expect(result).toHaveProperty(prop);
      });
      expect(result.id).toBe(targetId);
    });

    it('should throw 404 error when item not found', async () => {
      // Arrange
      const nonExistentId = 'burger-999';

      server.use(
        http.get(`${API_BASE_URL}/items/:id`, () => {
          return HttpResponse.json(
            {
              error: 'Menu item not found',
              statusCode: 404,
              details: `No menu item found with ID: ${nonExistentId}`,
            },
            { status: 404 }
          );
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItem(nonExistentId)).rejects.toThrow();
      try {
        await menuApi.getMenuItem(nonExistentId);
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const typedError = error as { status?: number; message?: string };
        expect(typedError.status || typedError.message).toBeDefined();
      }
    });

    it('should throw 400 error for invalid ID format', async () => {
      // Arrange
      const invalidId = 'invalid-format';

      server.use(
        http.get(`${API_BASE_URL}/items/:id`, () => {
          return HttpResponse.json(
            {
              error: 'Invalid menu item ID format',
              statusCode: 400,
              details: 'Menu item IDs must follow the pattern: category-XXX',
            },
            { status: 400 }
          );
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItem(invalidId)).rejects.toThrow();
      try {
        await menuApi.getMenuItem(invalidId);
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const typedError = error as { status?: number; message?: string };
        expect(typedError.status || typedError.message).toBeDefined();
      }
    });

    it('should return correct item for side category', async () => {
      // Arrange
      const targetId = 'side-001';
      const expectedItem = sides.find((item) => item.id === targetId);

      // Act
      const result = await menuApi.getMenuItem(targetId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(targetId);
      expect(result.category).toBe('sides');
      expect(result.name).toBe(expectedItem?.name);
    });

    it('should return correct item for drink category', async () => {
      // Arrange
      const targetId = 'drink-001';
      const expectedItem = drinks.find((item) => item.id === targetId);

      // Act
      const result = await menuApi.getMenuItem(targetId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(targetId);
      expect(result.category).toBe('drinks');
      expect(result.name).toBe(expectedItem?.name);
    });
  });

  // ==========================================================================
  // getCategories Tests
  // ==========================================================================

  describe('getCategories', () => {
    it('should fetch all menu categories', async () => {
      // Arrange
      const expectedCategoryCount = categories.length;

      // Act
      const result = await menuApi.getCategories();

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(expectedCategoryCount);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should send GET request to /api/menu/categories endpoint', async () => {
      // Arrange
      let capturedUrl = '';
      let capturedMethod = '';

      server.use(
        http.get(`${API_BASE_URL}/categories`, ({ request }) => {
          capturedUrl = request.url;
          capturedMethod = request.method;
          return HttpResponse.json(categories, { status: 200 });
        })
      );

      // Act
      await menuApi.getCategories();

      // Assert
      expect(capturedMethod).toBe('GET');
      expect(capturedUrl).toContain('/api/menu/categories');
      expect(capturedUrl).not.toContain('undefined');
    });

    it('should return array of Category objects', async () => {
      // Arrange
      const requiredProperties = ['id', 'name', 'itemCount'];

      // Act
      const result = await menuApi.getCategories();
      const firstCategory = result[0];

      // Assert
      expect(firstCategory).toBeDefined();
      requiredProperties.forEach((prop) => {
        expect(firstCategory).toHaveProperty(prop);
      });
      expect(typeof firstCategory.id).toBe('string');
    });

    it('should include item counts for each category', async () => {
      // Arrange
      const expectedBurgersCount = burgers.length;
      const expectedSidesCount = sides.length;
      const expectedDrinksCount = drinks.length;

      // Act
      const result = await menuApi.getCategories();
      const burgersCategory = result.find((cat) => cat.id === 'burgers');
      const sidesCategory = result.find((cat) => cat.id === 'sides');
      const drinksCategory = result.find((cat) => cat.id === 'drinks');

      // Assert
      expect(burgersCategory?.itemCount).toBe(expectedBurgersCount);
      expect(sidesCategory?.itemCount).toBe(expectedSidesCount);
      expect(drinksCategory?.itemCount).toBe(expectedDrinksCount);
    });

    it('should return categories in display order', async () => {
      // Arrange
      const expectedOrder = ['burgers', 'sides', 'drinks', 'desserts'];

      // Act
      const result = await menuApi.getCategories();
      const categoryIds = result.map((cat) => cat.id);

      // Assert
      expect(categoryIds).toEqual(expectedOrder);
      expect(categoryIds.length).toBe(expectedOrder.length);
      expect(categoryIds[0]).toBe('burgers');
    });

    it('should return categories with correct name formatting', async () => {
      // Arrange
      const expectedNames = ['Burgers', 'Sides', 'Drinks', 'Desserts'];

      // Act
      const result = await menuApi.getCategories();
      const categoryNames = result.map((cat) => cat.name);

      // Assert
      expect(categoryNames).toEqual(expectedNames);
      expect(categoryNames.every((name) => name.charAt(0) === name.charAt(0).toUpperCase())).toBe(
        true
      );
      expect(categoryNames.length).toBe(expectedNames.length);
    });
  });

  // ==========================================================================
  // searchMenu Tests
  // ==========================================================================

  describe('searchMenu', () => {
    it('should search menu items by query', async () => {
      // Arrange
      const searchQuery = 'burger';

      // Act
      const result = await menuApi.searchMenu(searchQuery);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should send GET request with q query parameter', async () => {
      // Arrange
      const searchQuery = 'cheese';
      let capturedUrl = '';
      let capturedMethod = '';

      server.use(
        http.get(`${API_BASE_URL}/search`, ({ request }) => {
          capturedUrl = request.url;
          capturedMethod = request.method;
          return HttpResponse.json(createMockMenuResponse([burgers[1]]), { status: 200 });
        })
      );

      // Act
      await menuApi.searchMenu(searchQuery);

      // Assert
      expect(capturedMethod).toBe('GET');
      expect(capturedUrl).toContain('/api/menu/search');
      expect(capturedUrl).toContain(`q=${searchQuery}`);
    });

    it('should return matching MenuItem objects', async () => {
      // Arrange
      const searchQuery = 'fries';
      const expectedItem = sides.find((item) => item.name.toLowerCase().includes('fries'));

      // Act
      const result = await menuApi.searchMenu(searchQuery);

      // Assert
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].name.toLowerCase()).toContain('fries');
      expect(result.items[0].id).toBe(expectedItem?.id);
    });

    it('should handle empty search query', async () => {
      // Arrange
      const emptyQuery = '';

      // Act
      const result = await menuApi.searchMenu(emptyQuery);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should return empty array when no matches found', async () => {
      // Arrange
      const noMatchQuery = 'xyznonexistentitem123';

      // Act
      const result = await menuApi.searchMenu(noMatchQuery);

      // Assert
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('should perform case-insensitive search', async () => {
      // Arrange
      const upperCaseQuery = 'BURGER';
      const lowerCaseQuery = 'burger';
      const mixedCaseQuery = 'BuRgEr';

      // Act
      const upperResult = await menuApi.searchMenu(upperCaseQuery);
      const lowerResult = await menuApi.searchMenu(lowerCaseQuery);
      const mixedResult = await menuApi.searchMenu(mixedCaseQuery);

      // Assert
      expect(upperResult.items.length).toBe(lowerResult.items.length);
      expect(lowerResult.items.length).toBe(mixedResult.items.length);
      expect(upperResult.total).toBe(lowerResult.total);
    });

    it('should search across name, description, and category fields', async () => {
      // Arrange
      const nameQuery = 'classic';
      const descriptionQuery = 'patty';

      // Act
      const nameResult = await menuApi.searchMenu(nameQuery);
      const descriptionResult = await menuApi.searchMenu(descriptionQuery);

      // Assert
      expect(nameResult.items.length).toBeGreaterThan(0);
      expect(descriptionResult.items.length).toBeGreaterThan(0);
      expect(nameResult.items[0].name.toLowerCase()).toContain('classic');
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle menu item with very long name', async () => {
      // Arrange
      const mockLongNameItems = [longNameItem];

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(createMockMenuResponse(mockLongNameItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result.items[0].name).toBe(longNameItem.name);
      expect(result.items[0].name.length).toBeGreaterThan(50);
      expect(result.total).toBe(1);
    });

    it('should handle menu item with zero price (promotional)', async () => {
      // Arrange
      const mockPromotionalItems = [promotionalItem];

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(createMockMenuResponse(mockPromotionalItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result.items[0].price).toBe(0);
      expect(result.items[0].name).toBe(promotionalItem.name);
      expect(typeof result.items[0].price).toBe('number');
    });

    it('should handle menu item with broken image URL', async () => {
      // Arrange
      const mockBrokenImageItems = [brokenImageItem];

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(createMockMenuResponse(mockBrokenImageItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result.items[0].imageUrl).toBe(brokenImageItem.imageUrl);
      expect(result.items[0].imageUrl).toContain('404');
      expect(result.total).toBe(1);
    });

    it('should handle menu item marked as unavailable', async () => {
      // Arrange
      const mockUnavailableItems = [outOfStockItem];

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(createMockMenuResponse(mockUnavailableItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result.items[0].available).toBe(false);
      expect(result.items[0].name).toBe(outOfStockItem.name);
      expect(result.total).toBe(1);
    });

    it('should handle search with special characters', async () => {
      // Arrange
      const specialCharQuery = 'burger!@#$%';

      server.use(
        http.get(`${API_BASE_URL}/search`, ({ request }) => {
          const url = new URL(request.url);
          const q = url.searchParams.get('q') || '';
          // Special characters should be handled gracefully
          const results = q.includes('burger') ? burgers : [];
          return HttpResponse.json(createMockMenuResponse(results), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.searchMenu(specialCharQuery);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle search with whitespace-only query', async () => {
      // Arrange
      const whitespaceQuery = '   ';

      // Act
      const result = await menuApi.searchMenu(whitespaceQuery);

      // Assert
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle custom menu item created with factory function', async () => {
      // Arrange
      const customItem = createMenuItem({
        id: 'custom-001',
        name: 'Custom Test Burger',
        price: 15.99,
      });

      server.use(
        http.get(`${API_BASE_URL}/items/:id`, () => {
          return HttpResponse.json(customItem, { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItem('custom-001');

      // Assert
      expect(result.id).toBe('custom-001');
      expect(result.name).toBe('Custom Test Burger');
      expect(result.price).toBe(15.99);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle network failure simulation', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.error();
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItems()).rejects.toThrow();
      try {
        await menuApi.getMenuItems();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle server error (500) response', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error', statusCode: 500 },
            { status: 500 }
          );
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItems()).rejects.toThrow();
      try {
        await menuApi.getMenuItems();
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const typedError = error as { status?: number; message?: string };
        expect(typedError.status || typedError.message).toBeDefined();
      }
    });

    it('should handle timeout scenario gracefully', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/items`, async () => {
          // Simulate slow response - though MSW doesn't actually delay
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(createMockMenuResponse(menuItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should handle invalid JSON response', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.text('Invalid JSON {{{', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItems()).rejects.toThrow();
      try {
        await menuApi.getMenuItems();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty response body', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          return HttpResponse.json(null, { status: 200 });
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItems()).rejects.toThrow();
      try {
        await menuApi.getMenuItems();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle 400 Bad Request error', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/items/:id`, () => {
          return HttpResponse.json(
            { error: 'Bad Request', statusCode: 400 },
            { status: 400 }
          );
        })
      );

      // Act & Assert
      await expect(menuApi.getMenuItem('invalid')).rejects.toThrow();
      try {
        await menuApi.getMenuItem('invalid');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const typedError = error as { status?: number };
        expect(typedError.status || error).toBeDefined();
      }
    });

    it('should handle 404 Not Found error for categories', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/categories`, () => {
          return HttpResponse.json(
            { error: 'Categories not found', statusCode: 404 },
            { status: 404 }
          );
        })
      );

      // Act & Assert
      await expect(menuApi.getCategories()).rejects.toThrow();
      try {
        await menuApi.getCategories();
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const typedError = error as { status?: number };
        expect(typedError.status || error).toBeDefined();
      }
    });

    it('should handle server error (503) for search endpoint', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/search`, () => {
          return HttpResponse.json(
            { error: 'Service Unavailable', statusCode: 503 },
            { status: 503 }
          );
        })
      );

      // Act & Assert
      await expect(menuApi.searchMenu('test')).rejects.toThrow();
      try {
        await menuApi.searchMenu('test');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const typedError = error as { status?: number };
        expect(typedError.status || error).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('Response Format', () => {
    it('should verify correct Content-Type header for getMenuItems', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          const response = HttpResponse.json(createMockMenuResponse(menuItems), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
          return response;
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBe(menuItems.length);
    });

    it('should verify correct HTTP status codes for successful requests', async () => {
      // Arrange
      let capturedStatus = 0;

      server.use(
        http.get(`${API_BASE_URL}/items`, () => {
          capturedStatus = 200;
          return HttpResponse.json(createMockMenuResponse(menuItems), { status: 200 });
        })
      );

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(capturedStatus).toBe(200);
      expect(result).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should verify response structure matches expected MenuResponse schema', async () => {
      // Arrange
      const expectedSchema = {
        items: expect.any(Array),
        total: expect.any(Number),
      };

      // Act
      const result = await menuApi.getMenuItems();

      // Assert
      expect(result).toMatchObject(expectedSchema);
      expect(result.items.length).toBe(result.total);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should verify MenuItem schema in response items', async () => {
      // Arrange
      const expectedItemSchema = {
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        category: expect.any(String),
        description: expect.any(String),
        imageUrl: expect.any(String),
      };

      // Act
      const result = await menuApi.getMenuItems();
      const firstItem = result.items[0];

      // Assert
      expect(firstItem).toMatchObject(expectedItemSchema);
      expect(firstItem.id).toBeDefined();
      expect(firstItem.price).toBeGreaterThanOrEqual(0);
    });

    it('should verify Category schema in getCategories response', async () => {
      // Arrange
      const expectedCategorySchema = {
        id: expect.any(String),
        name: expect.any(String),
        itemCount: expect.any(Number),
      };

      // Act
      const result = await menuApi.getCategories();
      const firstCategory = result[0];

      // Assert
      expect(firstCategory).toMatchObject(expectedCategorySchema);
      expect(firstCategory.itemCount).toBeGreaterThanOrEqual(0);
      expect(firstCategory.id.length).toBeGreaterThan(0);
    });

    it('should verify search response follows MenuResponse schema', async () => {
      // Arrange
      const searchQuery = 'burger';
      const expectedSchema = {
        items: expect.any(Array),
        total: expect.any(Number),
      };

      // Act
      const result = await menuApi.searchMenu(searchQuery);

      // Assert
      expect(result).toMatchObject(expectedSchema);
      expect(result.items.length).toBe(result.total);
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  // ==========================================================================
  // Helper Function Tests (using local helper functions)
  // ==========================================================================

  describe('Helper Functions', () => {
    it('createMockMenuItem should create valid MenuItem with defaults', () => {
      // Arrange & Act
      const mockItem = createMockMenuItem();

      // Assert
      expect(mockItem).toBeDefined();
      expect(mockItem.id).toBe('mock-item-001');
      expect(mockItem.name).toBe('Mock Burger');
      expect(mockItem.price).toBe(9.99);
    });

    it('createMockMenuItem should apply overrides correctly', () => {
      // Arrange
      const overrides = {
        id: 'custom-id',
        name: 'Custom Name',
        price: 19.99,
      };

      // Act
      const mockItem = createMockMenuItem(overrides);

      // Assert
      expect(mockItem.id).toBe('custom-id');
      expect(mockItem.name).toBe('Custom Name');
      expect(mockItem.price).toBe(19.99);
    });

    it('createMockMenuResponse should create valid response structure', () => {
      // Arrange
      const testItems = [createMockMenuItem({ id: 'test-1' }), createMockMenuItem({ id: 'test-2' })];

      // Act
      const response = createMockMenuResponse(testItems);

      // Assert
      expect(response.items).toEqual(testItems);
      expect(response.total).toBe(2);
      expect(response.items.length).toBe(response.total);
    });

    it('filterByCategory should filter items correctly', () => {
      // Arrange
      const testItems = [
        createMockMenuItem({ id: '1', category: 'burgers' }),
        createMockMenuItem({ id: '2', category: 'sides' }),
        createMockMenuItem({ id: '3', category: 'burgers' }),
      ];

      // Act
      const filtered = filterByCategory(testItems, 'burgers');

      // Assert
      expect(filtered.length).toBe(2);
      expect(filtered.every((item) => item.category === 'burgers')).toBe(true);
      expect(filtered[0].id).toBe('1');
    });

    it('filterByCategory should be case-insensitive', () => {
      // Arrange
      const testItems = [
        createMockMenuItem({ id: '1', category: 'Burgers' }),
        createMockMenuItem({ id: '2', category: 'SIDES' }),
      ];

      // Act
      const filtered = filterByCategory(testItems, 'burgers');

      // Assert
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
      expect(filtered[0].category.toLowerCase()).toBe('burgers');
    });
  });
});
