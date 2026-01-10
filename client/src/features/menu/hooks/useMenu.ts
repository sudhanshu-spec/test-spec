/**
 * @fileoverview Custom hook for fetching and managing menu data from the API.
 * Provides loading states, error states, data caching, and filtered menu items.
 * @module features/menu/hooks/useMenu
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Represents a menu item in the restaurant menu.
 * @interface MenuItem
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display name of the menu item */
  name: string;
  /** Price in dollars */
  price: number;
  /** Category classification (e.g., 'burgers', 'sides', 'drinks') */
  category: string;
  /** Detailed description of the menu item */
  description: string;
  /** URL path to the menu item image */
  imageUrl: string;
  /** Whether the item is currently available for ordering */
  available?: boolean;
}

/**
 * Represents a menu category for filtering.
 * @interface MenuCategory
 */
export interface MenuCategory {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Number of items in this category */
  itemCount?: number;
}

/**
 * Configuration options for the useMenu hook.
 * @interface UseMenuOptions
 */
export interface UseMenuOptions {
  /** Initial category to filter by on mount */
  initialCategory?: string;
  /** Whether to enable caching of API responses */
  enableCache?: boolean;
}

/**
 * Return type for the useMenu hook.
 * @typedef UseMenuReturn
 */
export type UseMenuReturn = {
  /** Array of all menu items fetched from the API */
  items: MenuItem[];
  /** Array of available menu categories */
  categories: MenuCategory[];
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Error object if fetch failed, null otherwise */
  error: Error | null;
  /** Currently selected category filter, null for all items */
  selectedCategory: string | null;
  /** Function to update the selected category filter */
  setSelectedCategory: (category: string | null) => void;
  /** Array of menu items filtered by selected category */
  filteredItems: MenuItem[];
  /** Function to manually refresh menu data from API */
  refetch: () => Promise<void>;
};

/** API base URL for menu endpoints */
const API_BASE_URL = '/api/menu';

/** Cache storage for menu data to avoid redundant API calls */
interface CacheData {
  items: MenuItem[];
  categories: MenuCategory[];
  timestamp: number;
}

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION = 5 * 60 * 1000;

/** Module-level cache for menu data */
let menuCache: CacheData | null = null;

/**
 * Validates if cached data is still fresh.
 * @param cache - The cached data to validate
 * @returns True if cache is valid and not expired
 */
function isCacheValid(cache: CacheData | null): cache is CacheData {
  if (!cache) return false;
  const now = Date.now();
  return now - cache.timestamp < CACHE_DURATION;
}

/**
 * Fetches menu items from the API.
 * @param signal - AbortController signal for cancellation
 * @returns Promise resolving to array of menu items
 * @throws Error if the API request fails
 */
async function fetchMenuItems(signal?: AbortSignal): Promise<MenuItem[]> {
  const response = await fetch(`${API_BASE_URL}/items`, { signal });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch menu items: ${response.status} ${response.statusText}`
    );
  }
  
  const data = await response.json();
  return data.items || data;
}

/**
 * Fetches menu categories from the API.
 * @param signal - AbortController signal for cancellation
 * @returns Promise resolving to array of menu categories
 * @throws Error if the API request fails
 */
async function fetchMenuCategories(signal?: AbortSignal): Promise<MenuCategory[]> {
  const response = await fetch(`${API_BASE_URL}/categories`, { signal });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch menu categories: ${response.status} ${response.statusText}`
    );
  }
  
  const data = await response.json();
  return data.categories || data;
}

/**
 * Custom React hook for fetching and managing menu data from the API.
 * 
 * Provides comprehensive state management for menu items including:
 * - Automatic data fetching on mount
 * - Loading and error state management
 * - Category-based filtering with memoization
 * - Optional caching to reduce API calls
 * - Manual refresh capability
 * - Cleanup on unmount via AbortController
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing menu data, states, and control functions
 * 
 * @example
 * ```tsx
 * function MenuPage() {
 *   const {
 *     filteredItems,
 *     categories,
 *     isLoading,
 *     error,
 *     selectedCategory,
 *     setSelectedCategory,
 *     refetch
 *   } = useMenu({ enableCache: true });
 * 
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 * 
 *   return (
 *     <MenuList
 *       items={filteredItems}
 *       categories={categories}
 *       selectedCategory={selectedCategory}
 *       onCategoryChange={setSelectedCategory}
 *     />
 *   );
 * }
 * ```
 */
export function useMenu(options: UseMenuOptions = {}): UseMenuReturn {
  const { initialCategory = null, enableCache = false } = options;

  // State for storing all menu items
  const [items, setItems] = useState<MenuItem[]>([]);
  
  // State for storing menu categories
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  
  // Loading state for showing spinners/skeletons
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Error state for displaying error messages
  const [error, setError] = useState<Error | null>(null);
  
  // Selected category for filtering, null means show all
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(
    initialCategory ?? null
  );

  /**
   * Fetches menu data from the API or cache.
   * Handles both items and categories in parallel.
   * @param signal - AbortController signal for cancellation
   */
  const fetchMenuData = useCallback(async (signal?: AbortSignal): Promise<void> => {
    // Check cache first if enabled
    if (enableCache && isCacheValid(menuCache)) {
      setItems(menuCache.items);
      setCategories(menuCache.categories);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch items and categories in parallel for better performance
      const [fetchedItems, fetchedCategories] = await Promise.all([
        fetchMenuItems(signal),
        fetchMenuCategories(signal)
      ]);

      // Check if request was aborted before updating state
      if (signal?.aborted) return;

      setItems(fetchedItems);
      setCategories(fetchedCategories);
      setError(null);

      // Update cache if caching is enabled
      if (enableCache) {
        menuCache = {
          items: fetchedItems,
          categories: fetchedCategories,
          timestamp: Date.now()
        };
      }
    } catch (err) {
      // Don't update error state if request was aborted
      if (signal?.aborted) return;

      // Handle different error types
      if (err instanceof Error) {
        // Network errors or API errors
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setError(new Error('Network error: Unable to connect to the menu service. Please check your connection.'));
        } else {
          setError(err);
        }
      } else {
        // Unknown error type
        setError(new Error('An unexpected error occurred while fetching menu data.'));
      }
    } finally {
      // Only update loading state if not aborted
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [enableCache]);

  /**
   * Memoized category setter to prevent unnecessary re-renders.
   * Wraps setSelectedCategoryState with useCallback.
   */
  const setSelectedCategory = useCallback((category: string | null): void => {
    setSelectedCategoryState(category);
  }, []);

  /**
   * Manual refetch function for refreshing data.
   * Invalidates cache and fetches fresh data from API.
   */
  const refetch = useCallback(async (): Promise<void> => {
    // Invalidate cache on manual refetch
    if (enableCache) {
      menuCache = null;
    }
    
    const abortController = new AbortController();
    await fetchMenuData(abortController.signal);
  }, [fetchMenuData, enableCache]);

  /**
   * Memoized filtered items based on selected category.
   * Returns all items when no category is selected.
   * Optimized for large menus (100+ items) via useMemo.
   */
  const filteredItems = useMemo<MenuItem[]>(() => {
    if (selectedCategory === null) {
      return items;
    }
    return items.filter(
      (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [items, selectedCategory]);

  /**
   * Effect to fetch menu data on mount.
   * Includes cleanup via AbortController to prevent memory leaks.
   */
  useEffect(() => {
    const abortController = new AbortController();
    
    fetchMenuData(abortController.signal);

    // Cleanup function to abort pending requests on unmount
    return () => {
      abortController.abort();
    };
  }, [fetchMenuData]);

  return {
    items,
    categories,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    filteredItems,
    refetch
  };
}
