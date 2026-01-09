/**
 * @fileoverview Shared test utility functions for frontend tests
 * @module tests/utils/testUtils
 *
 * This module provides reusable testing helpers including:
 * - Test data factory functions for creating mock entities
 * - Async helpers for waiting on DOM updates
 * - ID and email generation utilities
 * - Validation helpers for common data formats
 * - Storage mock utilities for localStorage/sessionStorage
 *
 * These utilities follow the helper function patterns established in
 * tests/lifecycle/server.test.js (createMockServer, createMockListen).
 */

import { waitFor } from '@testing-library/react';

// ============================================================================
// TypeScript Interfaces for Test Data Types
// ============================================================================

/**
 * Test user data structure for authentication testing.
 * @interface TestUser
 */
export interface TestUser {
  /** Unique identifier for the user */
  id: string;
  /** User's email address */
  email: string;
  /** User's password (plaintext for testing purposes) */
  password: string;
  /** User's display name */
  name: string;
  /** User's role in the system */
  role: 'customer' | 'admin' | 'staff';
}

/**
 * Test menu item data structure for menu testing.
 * @interface TestMenuItem
 */
export interface TestMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Name of the menu item */
  name: string;
  /** Price of the menu item in cents (to avoid floating point issues) */
  price: number;
  /** Category the menu item belongs to */
  category: 'burgers' | 'sides' | 'drinks' | 'desserts';
  /** URL to the menu item's image */
  imageUrl: string;
  /** Description of the menu item */
  description: string;
}

/**
 * Test cart item data structure for cart testing.
 * @interface TestCartItem
 */
export interface TestCartItem {
  /** The menu item added to cart */
  menuItem: TestMenuItem;
  /** Quantity of the item in cart */
  quantity: number;
}

/**
 * Test booking data structure for reservation testing.
 * @interface TestBooking
 */
export interface TestBooking {
  /** Unique identifier for the booking */
  id: string;
  /** Date of the reservation (ISO format YYYY-MM-DD) */
  date: string;
  /** Time of the reservation (HH:MM format) */
  time: string;
  /** Number of people in the party */
  partySize: number;
  /** ID of the user who made the booking */
  userId: string;
  /** Current status of the booking */
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

/**
 * Test order data structure for order testing.
 * @interface TestOrder
 */
export interface TestOrder {
  /** Unique identifier for the order */
  id: string;
  /** ID of the user who placed the order */
  userId: string;
  /** Array of items in the order */
  items: TestCartItem[];
  /** Total price of the order in cents */
  total: number;
  /** Current status of the order */
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  /** Timestamp when the order was created (ISO format) */
  createdAt: string;
}

// ============================================================================
// Default Test Data Constants
// Following the DEFAULT_CONFIG pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default test user data for authentication tests.
 * Use createMockUser() to create customized instances.
 * @constant
 */
export const DEFAULT_USER: TestUser = {
  id: 'user-001',
  email: 'testuser@example.com',
  password: 'Test123!@#',
  name: 'Test User',
  role: 'customer',
};

/**
 * Default test menu item data for menu tests.
 * Use createMockMenuItem() to create customized instances.
 * @constant
 */
export const DEFAULT_MENU_ITEM: TestMenuItem = {
  id: 'menu-001',
  name: 'Classic Burger',
  price: 999, // $9.99 in cents
  category: 'burgers',
  imageUrl: '/images/classic-burger.jpg',
  description: 'A classic beef patty with lettuce, tomato, and special sauce',
};

/**
 * Default test booking data for reservation tests.
 * Use createMockBooking() to create customized instances.
 * @constant
 */
export const DEFAULT_BOOKING: TestBooking = {
  id: 'booking-001',
  date: '2026-02-15',
  time: '18:00',
  partySize: 4,
  userId: 'user-001',
  status: 'confirmed',
};

/**
 * Default test order data for order tests.
 * Use createMockOrder() to create customized instances.
 * @constant
 */
export const DEFAULT_ORDER: TestOrder = {
  id: 'order-001',
  userId: 'user-001',
  items: [],
  total: 0,
  status: 'pending',
  createdAt: '2026-01-09T12:00:00.000Z',
};

// ============================================================================
// Factory Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/** Counter for generating unique test IDs */
let idCounter = 0;

/**
 * Creates a mock user object with optional overrides.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<TestUser>} [overrides={}] - Optional property overrides
 * @returns {TestUser} A new user object with merged properties
 *
 * @example
 * // Create a user with default values
 * const user = createMockUser();
 *
 * @example
 * // Create an admin user
 * const admin = createMockUser({ role: 'admin', name: 'Admin User' });
 */
export function createMockUser(overrides: Partial<TestUser> = {}): TestUser {
  const uniqueId = generateTestId('user');
  return {
    ...DEFAULT_USER,
    id: uniqueId,
    email: generateEmail(overrides.name || DEFAULT_USER.name),
    ...overrides,
  };
}

/**
 * Creates a mock menu item object with optional overrides.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<TestMenuItem>} [overrides={}] - Optional property overrides
 * @returns {TestMenuItem} A new menu item object with merged properties
 *
 * @example
 * // Create a menu item with default values
 * const item = createMockMenuItem();
 *
 * @example
 * // Create a custom menu item
 * const drink = createMockMenuItem({
 *   name: 'Cola',
 *   price: 299,
 *   category: 'drinks'
 * });
 */
export function createMockMenuItem(overrides: Partial<TestMenuItem> = {}): TestMenuItem {
  const uniqueId = generateTestId('menu');
  return {
    ...DEFAULT_MENU_ITEM,
    id: uniqueId,
    ...overrides,
  };
}

/**
 * Creates a mock cart item object with optional overrides.
 * If no menuItem is provided, creates a default menu item.
 *
 * @param {Partial<TestCartItem>} [overrides={}] - Optional property overrides
 * @returns {TestCartItem} A new cart item object with merged properties
 *
 * @example
 * // Create a cart item with default menu item
 * const cartItem = createMockCartItem();
 *
 * @example
 * // Create a cart item with specific quantity
 * const cartItem = createMockCartItem({ quantity: 3 });
 */
export function createMockCartItem(overrides: Partial<TestCartItem> = {}): TestCartItem {
  const defaultCartItem: TestCartItem = {
    menuItem: createMockMenuItem(),
    quantity: 1,
  };

  return {
    ...defaultCartItem,
    ...overrides,
    // If menuItem is provided in overrides, use it; otherwise keep the created one
    menuItem: overrides.menuItem || defaultCartItem.menuItem,
  };
}

/**
 * Creates a mock booking object with optional overrides.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<TestBooking>} [overrides={}] - Optional property overrides
 * @returns {TestBooking} A new booking object with merged properties
 *
 * @example
 * // Create a booking with default values
 * const booking = createMockBooking();
 *
 * @example
 * // Create a booking for a large party
 * const largeParty = createMockBooking({
 *   partySize: 12,
 *   date: '2026-03-01',
 *   time: '19:00'
 * });
 */
export function createMockBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  const uniqueId = generateTestId('booking');
  return {
    ...DEFAULT_BOOKING,
    id: uniqueId,
    ...overrides,
  };
}

/**
 * Creates a mock order object with optional overrides.
 * Automatically calculates total if items are provided.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<TestOrder>} [overrides={}] - Optional property overrides
 * @returns {TestOrder} A new order object with merged properties
 *
 * @example
 * // Create an order with default values
 * const order = createMockOrder();
 *
 * @example
 * // Create an order with items
 * const orderWithItems = createMockOrder({
 *   items: [
 *     createMockCartItem({ quantity: 2 }),
 *     createMockCartItem({ menuItem: createMockMenuItem({ price: 599 }) })
 *   ]
 * });
 */
export function createMockOrder(overrides: Partial<TestOrder> = {}): TestOrder {
  const uniqueId = generateTestId('order');
  const items = overrides.items || DEFAULT_ORDER.items;

  // Calculate total from items if not explicitly provided
  const calculatedTotal = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  return {
    ...DEFAULT_ORDER,
    id: uniqueId,
    items,
    total: overrides.total !== undefined ? overrides.total : calculatedTotal,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Async Test Helpers
// ============================================================================

/**
 * Waits for loading states to finish by checking for absence of loading indicators.
 * Useful when waiting for async operations to complete in component tests.
 *
 * @returns {Promise<void>} Resolves when no loading indicators are present
 *
 * @example
 * // Wait for data to load before asserting
 * render(<MenuList />);
 * await waitForLoadingToFinish();
 * expect(screen.getByText('Classic Burger')).toBeInTheDocument();
 */
export async function waitForLoadingToFinish(): Promise<void> {
  await waitFor(
    () => {
      // Check for common loading indicators
      const loadingSpinner = document.querySelector('[data-testid="loading-spinner"]');
      const loadingText = document.querySelector('[data-testid="loading"]');
      const loadingOverlay = document.querySelector('.loading-overlay');
      const ariaLoading = document.querySelector('[aria-busy="true"]');

      if (loadingSpinner || loadingText || loadingOverlay || ariaLoading) {
        throw new Error('Still loading...');
      }
    },
    {
      timeout: 5000,
      interval: 100,
    }
  );
}

/**
 * Generic helper to wait for a specific element to appear in the DOM.
 * Wraps waitFor with proper typing for element retrieval.
 *
 * @param {() => HTMLElement} callback - Function that retrieves the element
 * @returns {Promise<HTMLElement>} The found element
 *
 * @example
 * // Wait for a specific element
 * const button = await waitForElement(() =>
 *   document.querySelector('button[type="submit"]') as HTMLElement
 * );
 */
export async function waitForElement(callback: () => HTMLElement): Promise<HTMLElement> {
  let element: HTMLElement | null = null;

  await waitFor(
    () => {
      element = callback();
      if (!element) {
        throw new Error('Element not found');
      }
    },
    {
      timeout: 5000,
      interval: 100,
    }
  );

  // The waitFor ensures element is found, but TypeScript needs this assertion
  return element as HTMLElement;
}

// ============================================================================
// ID Generation Utilities
// ============================================================================

/**
 * Generates a unique test ID with an optional prefix.
 * Uses an incrementing counter to ensure uniqueness within a test run.
 *
 * @param {string} [prefix='test'] - Optional prefix for the ID
 * @returns {string} A unique ID string
 *
 * @example
 * generateTestId(); // 'test-1'
 * generateTestId('user'); // 'user-2'
 * generateTestId('menu'); // 'menu-3'
 */
export function generateTestId(prefix: string = 'test'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Generates a test email address based on a name.
 * Sanitizes the name to create a valid email format.
 *
 * @param {string} [name='user'] - Name to base the email on
 * @returns {string} A generated email address
 *
 * @example
 * generateEmail(); // 'user-1@test.example.com'
 * generateEmail('John Doe'); // 'john-doe-2@test.example.com'
 */
export function generateEmail(name: string = 'user'): string {
  const sanitizedName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  idCounter += 1;
  return `${sanitizedName}-${idCounter}@test.example.com`;
}

/**
 * Resets the ID counter. Useful in beforeEach hooks for test isolation.
 * @internal
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates if a string is a valid ISO date format (YYYY-MM-DD).
 * Also checks if the date is a real calendar date.
 *
 * @param {string} date - The date string to validate
 * @returns {boolean} True if the date is valid, false otherwise
 *
 * @example
 * isValidDate('2026-01-09'); // true
 * isValidDate('2026-13-01'); // false (invalid month)
 * isValidDate('not-a-date'); // false
 */
export function isValidDate(date: string): boolean {
  // Check format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }

  // Check if it's a valid calendar date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return false;
  }

  // Verify the date didn't roll over (e.g., 2026-02-31 becoming 2026-03-03)
  const [year, month, day] = date.split('-').map(Number);
  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day
  );
}

/**
 * Validates if a string is a valid email format.
 * Uses a standard email regex pattern.
 *
 * @param {string} email - The email string to validate
 * @returns {boolean} True if the email format is valid, false otherwise
 *
 * @example
 * isValidEmail('test@example.com'); // true
 * isValidEmail('invalid-email'); // false
 * isValidEmail('user@domain'); // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a valid time format (HH:MM).
 * Checks for 24-hour format with valid hour and minute ranges.
 *
 * @param {string} time - The time string to validate
 * @returns {boolean} True if the time format is valid, false otherwise
 *
 * @example
 * isValidTime('18:30'); // true
 * isValidTime('25:00'); // false (invalid hour)
 * isValidTime('12:60'); // false (invalid minute)
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

// ============================================================================
// Storage Mock Utilities
// ============================================================================

/**
 * Internal storage map for mock Storage implementation.
 * @internal
 */
interface MockStorageData {
  [key: string]: string;
}

/**
 * Creates a mock Storage object (localStorage/sessionStorage compatible).
 * Useful for testing components that interact with browser storage.
 *
 * @returns {Storage} A mock Storage implementation
 *
 * @example
 * const mockStorage = createMockStorage();
 * mockStorage.setItem('token', 'abc123');
 * expect(mockStorage.getItem('token')).toBe('abc123');
 */
export function createMockStorage(): Storage {
  const store: MockStorageData = {};

  const mockStorage: Storage = {
    get length(): number {
      return Object.keys(store).length;
    },

    key(index: number): string | null {
      const keys = Object.keys(store);
      return keys[index] || null;
    },

    getItem(key: string): string | null {
      return store[key] !== undefined ? store[key] : null;
    },

    setItem(key: string, value: string): void {
      store[key] = String(value);
    },

    removeItem(key: string): void {
      delete store[key];
    },

    clear(): void {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
    },
  };

  return mockStorage;
}

/**
 * Clears both localStorage and sessionStorage.
 * Useful in afterEach hooks to ensure test isolation.
 *
 * @example
 * afterEach(() => {
 *   clearAllStorage();
 * });
 */
export function clearAllStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
}

// ============================================================================
// Additional Test Utilities
// ============================================================================

/**
 * Delays execution for a specified number of milliseconds.
 * Useful for testing time-dependent behavior or debouncing.
 *
 * @param {number} ms - Number of milliseconds to delay
 * @returns {Promise<void>} Resolves after the delay
 *
 * @example
 * await delay(100); // Wait 100ms
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates an array of mock menu items for testing menu displays.
 *
 * @param {number} [count=5] - Number of items to create
 * @returns {TestMenuItem[]} Array of unique mock menu items
 *
 * @example
 * const menuItems = createMockMenuItems(10);
 * expect(menuItems).toHaveLength(10);
 */
export function createMockMenuItems(count: number = 5): TestMenuItem[] {
  const categories: TestMenuItem['category'][] = ['burgers', 'sides', 'drinks', 'desserts'];
  const items: TestMenuItem[] = [];

  for (let i = 0; i < count; i++) {
    items.push(
      createMockMenuItem({
        name: `Test Item ${i + 1}`,
        category: categories[i % categories.length],
        price: 500 + i * 100, // Varying prices
      })
    );
  }

  return items;
}

/**
 * Creates a mock order with a specified number of items.
 *
 * @param {number} [itemCount=3] - Number of items to include in the order
 * @returns {TestOrder} Order with the specified number of items
 *
 * @example
 * const order = createMockOrderWithItems(5);
 * expect(order.items).toHaveLength(5);
 */
export function createMockOrderWithItems(itemCount: number = 3): TestOrder {
  const items: TestCartItem[] = [];

  for (let i = 0; i < itemCount; i++) {
    items.push(createMockCartItem({ quantity: i + 1 }));
  }

  return createMockOrder({ items });
}

/**
 * Formats a price in cents to a currency string.
 * Useful for verifying displayed prices in tests.
 *
 * @param {number} cents - Price in cents
 * @param {string} [currency='USD'] - Currency code
 * @returns {string} Formatted currency string
 *
 * @example
 * formatPrice(999); // '$9.99'
 * formatPrice(1500, 'EUR'); // '€15.00'
 */
export function formatPrice(cents: number, currency: string = 'USD'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

/**
 * Calculates the total price of cart items.
 *
 * @param {TestCartItem[]} items - Array of cart items
 * @returns {number} Total price in cents
 *
 * @example
 * const items = [
 *   createMockCartItem({ quantity: 2, menuItem: createMockMenuItem({ price: 500 }) }),
 *   createMockCartItem({ quantity: 1, menuItem: createMockMenuItem({ price: 300 }) })
 * ];
 * calculateCartTotal(items); // 1300 (2*500 + 1*300)
 */
export function calculateCartTotal(items: TestCartItem[]): number {
  return items.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
}
