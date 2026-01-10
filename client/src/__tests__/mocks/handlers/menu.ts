/**
 * @fileoverview Menu API mock handlers for MSW (Mock Service Worker)
 * @module tests/mocks/handlers/menu
 * 
 * Provides request interception for menu-related API endpoints during testing.
 * Uses MSW 2.7.0 http.get patterns with HttpResponse to return mocked menu data.
 * 
 * Endpoints handled:
 * - GET /api/menu/items - Returns all menu items, supports ?category query param
 * - GET /api/menu/items/:id - Returns single menu item by ID
 * - GET /api/menu/categories - Returns list of available categories
 * - GET /api/menu/search - Returns items matching ?q search query
 * 
 * Used by:
 * - Menu component tests
 * - Cart operations tests
 * - Ordering flow integration tests
 */

import { http, HttpResponse } from 'msw';
import {
  menuItems,
  categories,
  type TestMenuItem,
  type MenuCategory,
  type MenuResponse,
} from '../../fixtures/menuItems';

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for all menu API endpoints.
 * @constant {string}
 */
const API_BASE_URL = '/api/menu';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Error response structure for API errors.
 * @interface ErrorResponse
 */
interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
  /** HTTP status code */
  statusCode: number;
  /** Optional additional details */
  details?: string;
}

/**
 * Query parameters for the items endpoint.
 * @interface ItemsQueryParams
 */
interface ItemsQueryParams {
  /** Filter by category name */
  category?: string;
}

/**
 * Query parameters for the search endpoint.
 * @interface SearchQueryParams
 */
interface SearchQueryParams {
  /** Search query string */
  q?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if a string is a valid menu item ID format.
 * Menu item IDs follow the pattern: category-XXX (e.g., burger-001, side-002)
 * 
 * @param id - The ID string to validate
 * @returns True if the ID format is valid, false otherwise
 */
function isValidMenuItemIdFormat(id: string): boolean {
  // Valid formats: burger-XXX, side-XXX, drink-XXX, dessert-XXX, edge-XXX, menu-item-XXX
  const validPrefixes = ['burger-', 'side-', 'drink-', 'dessert-', 'edge-', 'menu-item-'];
  return validPrefixes.some((prefix) => id.startsWith(prefix));
}

/**
 * Searches menu items by query string.
 * Searches in item name, description, and category fields (case-insensitive).
 * 
 * @param query - The search query string
 * @returns Array of matching menu items
 */
function searchMenuItems(query: string): TestMenuItem[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return [];
  }
  
  return menuItems.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
    const descriptionMatch = item.description.toLowerCase().includes(normalizedQuery);
    const categoryMatch = item.category.toLowerCase().includes(normalizedQuery);
    
    return nameMatch || descriptionMatch || categoryMatch;
  });
}

/**
 * Filters menu items by category.
 * 
 * @param category - The category name to filter by (case-insensitive)
 * @returns Array of menu items in the specified category
 */
function filterByCategory(category: string): TestMenuItem[] {
  const normalizedCategory = category.toLowerCase().trim();
  return menuItems.filter(
    (item) => item.category.toLowerCase() === normalizedCategory
  );
}

/**
 * Creates a standardized error response.
 * 
 * @param error - Error message
 * @param statusCode - HTTP status code
 * @param details - Optional additional details
 * @returns ErrorResponse object
 */
function createErrorResponse(
  error: string,
  statusCode: number,
  details?: string
): ErrorResponse {
  const response: ErrorResponse = {
    error,
    statusCode,
  };
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

// ============================================================================
// Menu Item Handlers
// ============================================================================

/**
 * Handler for GET /api/menu/items
 * 
 * Returns all menu items or filters by category if ?category param is provided.
 * 
 * Query Parameters:
 * - category (optional): Filter items by category name (case-insensitive)
 * 
 * Response:
 * - 200 OK: MenuResponse with items array and total count
 * 
 * @example
 * // Get all items
 * GET /api/menu/items
 * 
 * @example
 * // Get burgers only
 * GET /api/menu/items?category=burgers
 */
const getItemsHandler = http.get(`${API_BASE_URL}/items`, ({ request }) => {
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');
  
  let filteredItems: TestMenuItem[];
  
  if (categoryParam) {
    // Filter by category - returns empty array if category doesn't exist
    filteredItems = filterByCategory(categoryParam);
  } else {
    // Return all items
    filteredItems = [...menuItems];
  }
  
  const response: MenuResponse = {
    items: filteredItems,
    total: filteredItems.length,
  };
  
  return HttpResponse.json(response, { status: 200 });
});

/**
 * Handler for GET /api/menu/items/:id
 * 
 * Returns a single menu item by its ID.
 * 
 * Path Parameters:
 * - id: The unique identifier of the menu item
 * 
 * Response:
 * - 200 OK: TestMenuItem object
 * - 400 Bad Request: If ID format is invalid
 * - 404 Not Found: If item with given ID doesn't exist
 * 
 * @example
 * // Get a specific burger
 * GET /api/menu/items/burger-001
 */
const getItemHandler = http.get(`${API_BASE_URL}/items/:id`, ({ params }) => {
  const { id } = params;
  
  // Ensure id is a string
  const itemId = Array.isArray(id) ? id[0] : id;
  
  // Validate ID format
  if (!itemId || !isValidMenuItemIdFormat(itemId)) {
    const errorResponse = createErrorResponse(
      'Invalid menu item ID format',
      400,
      'Menu item IDs must follow the pattern: category-XXX (e.g., burger-001, side-002)'
    );
    return HttpResponse.json(errorResponse, { status: 400 });
  }
  
  // Find the item
  const item = menuItems.find((menuItem) => menuItem.id === itemId);
  
  if (!item) {
    const errorResponse = createErrorResponse(
      'Menu item not found',
      404,
      `No menu item found with ID: ${itemId}`
    );
    return HttpResponse.json(errorResponse, { status: 404 });
  }
  
  return HttpResponse.json(item, { status: 200 });
});

// ============================================================================
// Category Handlers
// ============================================================================

/**
 * Handler for GET /api/menu/categories
 * 
 * Returns the list of all available menu categories with item counts.
 * 
 * Response:
 * - 200 OK: Array of MenuCategory objects
 * 
 * @example
 * // Get all categories
 * GET /api/menu/categories
 * // Returns: [{ id: 'burgers', name: 'Burgers', itemCount: 4 }, ...]
 */
const getCategoriesHandler = http.get(`${API_BASE_URL}/categories`, () => {
  return HttpResponse.json(categories, { status: 200 });
});

// ============================================================================
// Search Handler
// ============================================================================

/**
 * Handler for GET /api/menu/search
 * 
 * Searches menu items by name, description, or category.
 * Returns matching items or empty array if no matches found.
 * 
 * Query Parameters:
 * - q (optional): Search query string
 * 
 * Response:
 * - 200 OK: MenuResponse with matching items array and total count
 * 
 * @example
 * // Search for burgers
 * GET /api/menu/search?q=burger
 * 
 * @example
 * // Search for cheese items
 * GET /api/menu/search?q=cheese
 * 
 * @example
 * // Empty query returns empty results
 * GET /api/menu/search?q=
 */
const searchHandler = http.get(`${API_BASE_URL}/search`, ({ request }) => {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('q') || '';
  
  // If no query provided or empty query, return empty results
  if (!searchQuery.trim()) {
    const response: MenuResponse = {
      items: [],
      total: 0,
    };
    return HttpResponse.json(response, { status: 200 });
  }
  
  // Search and return matching items
  const matchingItems = searchMenuItems(searchQuery);
  
  const response: MenuResponse = {
    items: matchingItems,
    total: matchingItems.length,
  };
  
  return HttpResponse.json(response, { status: 200 });
});

// ============================================================================
// Exported Handler Array
// ============================================================================

/**
 * Array of all menu API mock handlers.
 * Import this array and spread into the MSW server setup handlers array.
 * 
 * @example
 * // In server.ts
 * import { menuHandlers } from './handlers/menu';
 * 
 * export const server = setupServer(
 *   ...menuHandlers,
 *   ...otherHandlers,
 * );
 * 
 * Handlers included:
 * - getItemsHandler: GET /api/menu/items
 * - getItemHandler: GET /api/menu/items/:id
 * - getCategoriesHandler: GET /api/menu/categories
 * - searchHandler: GET /api/menu/search
 */
export const menuHandlers = [
  getItemsHandler,
  getItemHandler,
  getCategoriesHandler,
  searchHandler,
];
