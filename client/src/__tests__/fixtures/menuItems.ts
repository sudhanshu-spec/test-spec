/**
 * @fileoverview Menu item test fixtures for menu and ordering tests
 * @module tests/fixtures/menuItems
 * 
 * Provides consistent, typed test data for menu display and ordering tests.
 * Exports TestMenuItem interface and collections of burger, side, drink, and
 * dessert items with categories, prices, and images.
 * 
 * Used by:
 * - Menu API mock handlers
 * - Menu component tests
 * - Cart operations tests
 * - Ordering flow integration tests
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a menu item in the test data.
 * @interface TestMenuItem
 */
export interface TestMenuItem {
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
  /** Whether the item is currently available for ordering (defaults to true) */
  available?: boolean;
}

/**
 * Represents a menu category with item count.
 * @interface MenuCategory
 */
export interface MenuCategory {
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
  items: TestMenuItem[];
  /** Total count of items (for pagination) */
  total: number;
}

// ============================================================================
// Default Test Data Configuration
// ============================================================================

/**
 * Default values for menu item creation.
 * Used by the createMenuItem factory function.
 */
const DEFAULT_MENU_ITEM: TestMenuItem = {
  id: 'menu-item-default',
  name: 'Default Item',
  price: 9.99,
  category: 'burgers',
  description: 'A default menu item for testing purposes.',
  imageUrl: '/images/menu/default.jpg',
  available: true,
};

// ============================================================================
// Burger Items Collection
// ============================================================================

/**
 * Collection of burger menu items for testing.
 * Includes classic, cheese, bacon, and veggie options.
 */
export const burgers: TestMenuItem[] = [
  {
    id: 'burger-001',
    name: 'Classic Burger',
    price: 8.99,
    category: 'burgers',
    description: 'Our signature beef patty with fresh lettuce, tomato, onion, and our secret sauce.',
    imageUrl: '/images/menu/classic-burger.jpg',
    available: true,
  },
  {
    id: 'burger-002',
    name: 'Cheese Burger',
    price: 9.99,
    category: 'burgers',
    description: 'Classic burger topped with melted American cheese.',
    imageUrl: '/images/menu/cheese-burger.jpg',
    available: true,
  },
  {
    id: 'burger-003',
    name: 'Bacon Burger',
    price: 11.99,
    category: 'burgers',
    description: 'Classic burger with crispy bacon strips and cheddar cheese.',
    imageUrl: '/images/menu/bacon-burger.jpg',
    available: true,
  },
  {
    id: 'burger-004',
    name: 'Veggie Burger',
    price: 10.49,
    category: 'burgers',
    description: 'Plant-based patty with avocado, sprouts, and chipotle mayo.',
    imageUrl: '/images/menu/veggie-burger.jpg',
    available: true,
  },
];

// ============================================================================
// Side Items Collection
// ============================================================================

/**
 * Collection of side dish menu items for testing.
 * Includes fries, onion rings, coleslaw, and salad.
 */
export const sides: TestMenuItem[] = [
  {
    id: 'side-001',
    name: 'Fries',
    price: 3.99,
    category: 'sides',
    description: 'Crispy golden french fries seasoned with sea salt.',
    imageUrl: '/images/menu/fries.jpg',
    available: true,
  },
  {
    id: 'side-002',
    name: 'Onion Rings',
    price: 4.49,
    category: 'sides',
    description: 'Beer-battered onion rings served with ranch dipping sauce.',
    imageUrl: '/images/menu/onion-rings.jpg',
    available: true,
  },
  {
    id: 'side-003',
    name: 'Coleslaw',
    price: 2.99,
    category: 'sides',
    description: 'Creamy homemade coleslaw with fresh cabbage and carrots.',
    imageUrl: '/images/menu/coleslaw.jpg',
    available: true,
  },
  {
    id: 'side-004',
    name: 'Garden Salad',
    price: 5.49,
    category: 'sides',
    description: 'Mixed greens with cherry tomatoes, cucumbers, and house vinaigrette.',
    imageUrl: '/images/menu/garden-salad.jpg',
    available: true,
  },
];

// ============================================================================
// Drink Items Collection
// ============================================================================

/**
 * Collection of drink menu items for testing.
 * Includes soda, lemonade, milkshake, and coffee.
 */
export const drinks: TestMenuItem[] = [
  {
    id: 'drink-001',
    name: 'Soda',
    price: 2.49,
    category: 'drinks',
    description: 'Choice of Coca-Cola, Sprite, or Fanta. Free refills.',
    imageUrl: '/images/menu/soda.jpg',
    available: true,
  },
  {
    id: 'drink-002',
    name: 'Lemonade',
    price: 3.49,
    category: 'drinks',
    description: 'Fresh-squeezed lemonade made daily with real lemons.',
    imageUrl: '/images/menu/lemonade.jpg',
    available: true,
  },
  {
    id: 'drink-003',
    name: 'Milkshake',
    price: 5.99,
    category: 'drinks',
    description: 'Thick and creamy milkshake. Choose from vanilla, chocolate, or strawberry.',
    imageUrl: '/images/menu/milkshake.jpg',
    available: true,
  },
  {
    id: 'drink-004',
    name: 'Coffee',
    price: 2.99,
    category: 'drinks',
    description: 'Premium roasted coffee. Hot or iced available.',
    imageUrl: '/images/menu/coffee.jpg',
    available: true,
  },
];

// ============================================================================
// Dessert Items Collection
// ============================================================================

/**
 * Collection of dessert menu items for testing.
 * Includes ice cream and brownie.
 */
export const desserts: TestMenuItem[] = [
  {
    id: 'dessert-001',
    name: 'Ice Cream',
    price: 4.49,
    category: 'desserts',
    description: 'Two scoops of premium ice cream. Vanilla, chocolate, or swirl.',
    imageUrl: '/images/menu/ice-cream.jpg',
    available: true,
  },
  {
    id: 'dessert-002',
    name: 'Brownie',
    price: 3.99,
    category: 'desserts',
    description: 'Warm chocolate brownie served with vanilla ice cream and chocolate sauce.',
    imageUrl: '/images/menu/brownie.jpg',
    available: true,
  },
];

// ============================================================================
// Complete Menu Items Collection
// ============================================================================

/**
 * Complete collection of all menu items across all categories.
 * Combines burgers, sides, drinks, and desserts into a single array.
 */
export const menuItems: TestMenuItem[] = [
  ...burgers,
  ...sides,
  ...drinks,
  ...desserts,
];

// ============================================================================
// Category Data
// ============================================================================

/**
 * Array of menu categories with their item counts.
 * Used for category filtering and display tests.
 * 
 * Note: Category IDs must match the category field in menu items
 * for filtering to work correctly (e.g., 'burgers' matches item.category='burgers')
 */
export const categories: MenuCategory[] = [
  {
    id: 'burgers',
    name: 'Burgers',
    itemCount: burgers.length,
  },
  {
    id: 'sides',
    name: 'Sides',
    itemCount: sides.length,
  },
  {
    id: 'drinks',
    name: 'Drinks',
    itemCount: drinks.length,
  },
  {
    id: 'desserts',
    name: 'Desserts',
    itemCount: desserts.length,
  },
];

/**
 * Array of category name strings for filtering tests.
 * Lowercase to match the category field in TestMenuItem.
 */
export const categoryNames: string[] = ['burgers', 'sides', 'drinks', 'desserts'];

// ============================================================================
// Search-Related Fixtures
// ============================================================================

/**
 * Pre-defined search results for common search queries.
 * Maps search terms to expected matching items.
 */
export const searchResults: Record<string, TestMenuItem[]> = {
  burger: burgers,
  cheese: [burgers[1]], // Cheese Burger
  fries: [sides[0]], // Fries
  drink: drinks,
  shake: [drinks[2]], // Milkshake
  veggie: [burgers[3]], // Veggie Burger
  salad: [sides[3]], // Garden Salad
};

/**
 * Empty search results array for no-match scenarios.
 * Used to test empty state rendering.
 */
export const emptySearchResults: TestMenuItem[] = [];

// ============================================================================
// Edge Case Test Data
// ============================================================================

/**
 * Menu item with a very long name for testing text overflow and truncation.
 */
export const longNameItem: TestMenuItem = {
  id: 'edge-001',
  name: 'The Ultimate Super Deluxe Double Bacon Cheeseburger with Extra Everything and Special Secret Sauce',
  price: 15.99,
  category: 'burgers',
  description: 'Our most extravagant burger creation featuring two beef patties, four strips of bacon, double cheese, and all the toppings.',
  imageUrl: '/images/menu/long-name-burger.jpg',
  available: true,
};

/**
 * Menu item with zero price for promotional/free item testing.
 */
export const promotionalItem: TestMenuItem = {
  id: 'edge-002',
  name: 'Free Cookie',
  price: 0,
  category: 'desserts',
  description: 'Complimentary chocolate chip cookie with any order over $20.',
  imageUrl: '/images/menu/free-cookie.jpg',
  available: true,
};

/**
 * Menu item with a broken/missing image URL for fallback testing.
 */
export const brokenImageItem: TestMenuItem = {
  id: 'edge-003',
  name: 'Mystery Special',
  price: 7.99,
  category: 'burgers',
  description: 'A surprise burger creation that changes daily.',
  imageUrl: '/images/menu/non-existent-image-404.jpg',
  available: true,
};

/**
 * Menu item marked as unavailable for out-of-stock testing.
 */
export const outOfStockItem: TestMenuItem = {
  id: 'edge-004',
  name: 'Seasonal Truffle Burger',
  price: 24.99,
  category: 'burgers',
  description: 'Premium burger with truffle aioli and aged gruyere cheese. Limited availability.',
  imageUrl: '/images/menu/truffle-burger.jpg',
  available: false,
};

/**
 * Menu item with high price for boundary testing and formatting.
 */
export const highPriceItem: TestMenuItem = {
  id: 'edge-005',
  name: 'Wagyu Beef Burger',
  price: 99.99,
  category: 'burgers',
  description: 'Premium A5 Wagyu beef patty with gold leaf garnish and white truffle shavings.',
  imageUrl: '/images/menu/wagyu-burger.jpg',
  available: true,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Counter for generating unique IDs.
 * Incremented on each createMenuItem call to ensure uniqueness.
 */
let menuItemCounter = 0;

/**
 * Factory function for creating test menu items with custom overrides.
 * Follows the createMockServer pattern from server.test.js.
 * 
 * @param overrides - Partial TestMenuItem properties to override defaults
 * @returns A complete TestMenuItem object
 * 
 * @example
 * // Create a custom burger
 * const customBurger = createMenuItem({
 *   name: 'Custom Burger',
 *   price: 12.99,
 * });
 * 
 * @example
 * // Create an unavailable item
 * const unavailable = createMenuItem({
 *   id: 'unavailable-001',
 *   available: false,
 * });
 */
export function createMenuItem(overrides?: Partial<TestMenuItem>): TestMenuItem {
  const uniqueId = `menu-item-${Date.now()}-${++menuItemCounter}`;
  const baseItem: TestMenuItem = {
    ...DEFAULT_MENU_ITEM,
    id: uniqueId,
    ...overrides,
  };
  return baseItem;
}

/**
 * Helper function to filter menu items by category.
 * 
 * @param category - The category name to filter by (case-insensitive)
 * @returns Array of TestMenuItem objects matching the category
 * 
 * @example
 * // Get all burger items
 * const allBurgers = getItemsByCategory('burgers');
 * 
 * @example
 * // Get all drinks (case-insensitive)
 * const allDrinks = getItemsByCategory('DRINKS');
 */
export function getItemsByCategory(category: string): TestMenuItem[] {
  const normalizedCategory = category.toLowerCase();
  return menuItems.filter(
    (item) => item.category.toLowerCase() === normalizedCategory
  );
}

// ============================================================================
// API Response Fixtures
// ============================================================================

/**
 * Creates a MenuResponse object for testing API responses.
 * 
 * @param items - Array of menu items to include
 * @returns MenuResponse object with items and total count
 */
export function createMenuResponse(items: TestMenuItem[] = menuItems): MenuResponse {
  return {
    items,
    total: items.length,
  };
}

/**
 * Pre-built menu response with all items.
 * Use for testing full menu load scenarios.
 */
export const fullMenuResponse: MenuResponse = {
  items: menuItems,
  total: menuItems.length,
};

/**
 * Pre-built empty menu response.
 * Use for testing empty state scenarios.
 */
export const emptyMenuResponse: MenuResponse = {
  items: [],
  total: 0,
};

/**
 * Pre-built menu response with only available items.
 * Filters out items with available: false.
 */
export const availableMenuResponse: MenuResponse = {
  items: menuItems.filter((item) => item.available !== false),
  total: menuItems.filter((item) => item.available !== false).length,
};
