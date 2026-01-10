/**
 * @fileoverview Menu API client functions for the Burger Website application
 * @module api/menu
 *
 * Provides functions for fetching menu items, categories, and searching the menu.
 * All functions interact with the /api/menu endpoints and return typed responses.
 *
 * API Endpoints:
 * - GET /api/menu/items - Fetch all menu items or filter by category
 * - GET /api/menu/items/:id - Fetch a single menu item by ID
 * - GET /api/menu/categories - Fetch all menu categories
 * - GET /api/menu/search - Search menu items by query
 *
 * @see {@link client/src/__tests__/mocks/handlers/menu.ts} for mock implementations
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a menu item in the restaurant's menu.
 * @interface MenuItem
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display name of the menu item */
  name: string;
  /** Price in dollars (e.g., 9.99) */
  price: number;
  /** Category for grouping (e.g., 'burgers', 'sides', 'drinks', 'desserts') */
  category: string;
  /** Detailed description of the menu item */
  description: string;
  /** URL to the menu item image */
  imageUrl: string;
  /** Whether the item is currently available for ordering */
  available?: boolean;
}

/**
 * Represents a menu category with item count.
 * @interface Category
 */
export interface Category {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Number of items in this category */
  itemCount: number;
}

/**
 * Represents the response structure from the menu API.
 * @interface MenuResponse
 */
export interface MenuResponse {
  /** Array of menu items */
  items: MenuItem[];
  /** Total count of items (for pagination) */
  total: number;
}

/**
 * API Error structure returned from failed requests.
 * @interface ApiError
 */
interface ApiError {
  /** Error message */
  error: string;
  /** HTTP status code */
  statusCode: number;
  /** Additional error details */
  details?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for all menu API endpoints.
 * @constant {string}
 */
const API_BASE_URL = '/api/menu';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handles API response and throws appropriate errors for non-OK responses.
 *
 * @param {Response} response - Fetch API response object
 * @returns {Promise<T>} Parsed JSON response data
 * @throws {Error} Throws error with status and message for non-OK responses
 * @template T - Type of the expected response data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  // Handle non-OK responses
  if (!response.ok) {
    let errorData: ApiError | null = null;
    
    try {
      errorData = await response.json();
    } catch {
      // If JSON parsing fails, create a generic error
      errorData = {
        error: `HTTP Error ${response.status}`,
        statusCode: response.status,
      };
    }
    
    const error = new Error(errorData?.error || `HTTP Error ${response.status}`) as Error & {
      status: number;
      code?: string;
    };
    error.status = response.status;
    if (errorData?.details) {
      error.message = `${errorData.error}: ${errorData.details}`;
    }
    throw error;
  }
  
  // Handle empty responses
  const contentType = response.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format: Expected JSON');
  }
  
  const data = await response.json();
  
  // Handle null/undefined responses
  if (data === null || data === undefined) {
    throw new Error('Empty response received');
  }
  
  return data as T;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches all menu items, optionally filtered by category.
 *
 * @param {string} [category] - Optional category to filter by (e.g., 'burgers', 'sides')
 * @returns {Promise<MenuResponse>} Menu response with items array and total count
 * @throws {Error} Throws error on network failure or server error
 *
 * @example
 * // Get all menu items
 * const response = await getMenuItems();
 * console.log(response.items);
 *
 * @example
 * // Get only burgers
 * const response = await getMenuItems('burgers');
 * console.log(response.items);
 */
export async function getMenuItems(category?: string): Promise<MenuResponse> {
  let url = `${API_BASE_URL}/items`;
  
  // Add category query parameter if provided and not empty
  if (category && category.trim()) {
    const params = new URLSearchParams({ category: category.trim() });
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  return handleResponse<MenuResponse>(response);
}

/**
 * Fetches a single menu item by its unique identifier.
 *
 * @param {string} id - The unique identifier of the menu item (e.g., 'burger-001')
 * @returns {Promise<MenuItem>} The menu item with the specified ID
 * @throws {Error} Throws 404 error if item not found
 * @throws {Error} Throws 400 error if ID format is invalid
 * @throws {Error} Throws error on network failure or server error
 *
 * @example
 * // Get a specific burger
 * const item = await getMenuItem('burger-001');
 * console.log(item.name, item.price);
 */
export async function getMenuItem(id: string): Promise<MenuItem> {
  const url = `${API_BASE_URL}/items/${encodeURIComponent(id)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  return handleResponse<MenuItem>(response);
}

/**
 * Fetches all menu categories with their item counts.
 *
 * @returns {Promise<Category[]>} Array of category objects
 * @throws {Error} Throws error on network failure or server error
 *
 * @example
 * // Get all categories
 * const categories = await getCategories();
 * categories.forEach(cat => {
 *   console.log(`${cat.name}: ${cat.itemCount} items`);
 * });
 */
export async function getCategories(): Promise<Category[]> {
  const url = `${API_BASE_URL}/categories`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  return handleResponse<Category[]>(response);
}

/**
 * Searches menu items by a query string.
 * Searches across item names, descriptions, and categories.
 * Search is case-insensitive.
 *
 * @param {string} query - The search query string
 * @returns {Promise<MenuResponse>} Menu response with matching items and total count
 * @throws {Error} Throws error on network failure or server error
 *
 * @example
 * // Search for cheese items
 * const response = await searchMenu('cheese');
 * console.log(`Found ${response.total} matching items`);
 *
 * @example
 * // Empty query returns empty results
 * const response = await searchMenu('');
 * console.log(response.items.length); // 0
 */
export async function searchMenu(query: string): Promise<MenuResponse> {
  const url = `${API_BASE_URL}/search`;
  const params = new URLSearchParams({ q: query });
  const fullUrl = `${url}?${params.toString()}`;
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  return handleResponse<MenuResponse>(response);
}
