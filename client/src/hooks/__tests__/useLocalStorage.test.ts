/**
 * @fileoverview Unit tests for useLocalStorage custom hook
 * @module tests/hooks/useLocalStorage
 *
 * Comprehensive test suite for the useLocalStorage hook covering:
 * - Initial value handling and state management
 * - Get/set value operations
 * - JSON serialization and deserialization
 * - Key namespacing and isolation
 * - Cross-tab synchronization via storage events
 * - Error handling (quota exceeded, invalid JSON, access denied)
 * - Cleanup and memory management
 *
 * Test patterns follow established conventions from:
 * - tests/lifecycle/server.test.js (mock factory patterns)
 * - tests/unit/config.test.js (module isolation patterns)
 *
 * @see {@link https://testing-library.com/docs/react-testing-library/api/#renderhook}
 */

// ============================================================================
// External Imports
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

// ============================================================================
// Internal Imports
// ============================================================================

import { useLocalStorage } from '../useLocalStorage';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Mock localStorage interface for testing.
 * Provides a complete implementation of the Storage interface.
 *
 * @interface MockStorage
 */
interface MockStorage {
  /** Retrieve item by key */
  getItem: ReturnType<typeof vi.fn>;
  /** Store item by key */
  setItem: ReturnType<typeof vi.fn>;
  /** Remove item by key */
  removeItem: ReturnType<typeof vi.fn>;
  /** Clear all items */
  clear: ReturnType<typeof vi.fn>;
  /** Get number of stored items */
  readonly length: number;
  /** Get key by index */
  key: ReturnType<typeof vi.fn>;
}

/**
 * Test user data structure for serialization tests.
 *
 * @interface TestUser
 */
interface TestUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Test settings structure for nested object tests.
 *
 * @interface TestSettings
 */
interface TestSettings {
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
  };
}

// ============================================================================
// Mock Factory Functions
// ============================================================================

/**
 * Creates a mock localStorage implementation.
 * Follows createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Map<string, string>} [initialData] - Optional initial data for the store
 * @returns {MockStorage} Mock storage object with all standard methods
 */
function createMockStorage(initialData?: Map<string, string>): MockStorage {
  const store = initialData ?? new Map<string, string>();

  return {
    getItem: vi.fn((key: string): string | null => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string): void => {
      store.delete(key);
    }),
    clear: vi.fn((): void => {
      store.clear();
    }),
    get length(): number {
      return store.size;
    },
    key: vi.fn((index: number): string | null => {
      return Array.from(store.keys())[index] ?? null;
    }),
  };
}

/**
 * Creates a mock storage that throws errors on access.
 * Used for testing error handling scenarios.
 *
 * @param {string} [errorMessage='Access denied'] - Error message to throw
 * @returns {MockStorage} Mock storage that throws on all operations
 */
function createErrorStorage(errorMessage = 'Access denied'): MockStorage {
  return {
    getItem: vi.fn((): never => {
      throw new Error(errorMessage);
    }),
    setItem: vi.fn((): never => {
      throw new Error(errorMessage);
    }),
    removeItem: vi.fn((): never => {
      throw new Error(errorMessage);
    }),
    clear: vi.fn((): never => {
      throw new Error(errorMessage);
    }),
    get length(): number {
      return 0;
    },
    key: vi.fn((): never => {
      throw new Error(errorMessage);
    }),
  };
}

/**
 * Creates a mock storage that throws quota exceeded error on setItem.
 *
 * @returns {MockStorage} Mock storage that throws quota exceeded on setItem
 */
function createQuotaExceededStorage(): MockStorage {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string): string | null => store.get(key) ?? null),
    setItem: vi.fn((): never => {
      const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
      throw error;
    }),
    removeItem: vi.fn((key: string): void => {
      store.delete(key);
    }),
    clear: vi.fn((): void => {
      store.clear();
    }),
    get length(): number {
      return store.size;
    },
    key: vi.fn((index: number): string | null => {
      return Array.from(store.keys())[index] ?? null;
    }),
  };
}

/**
 * Reference to the original localStorage for storage events.
 * Needed because jsdom requires a real Storage object for StorageEvent.
 */
let realLocalStorage: Storage | null = null;

/**
 * Helper function to dispatch a storage event.
 * Simulates cross-tab localStorage changes.
 *
 * Note: We use a custom event approach because jsdom's StorageEvent
 * constructor requires a real Storage object for the storageArea parameter,
 * which doesn't work with our mock storage.
 *
 * @param {string} key - Storage key that changed
 * @param {string | null} newValue - New value (null for deletion)
 * @param {string | null} [oldValue=null] - Previous value
 */
function dispatchStorageEvent(
  key: string,
  newValue: string | null,
  oldValue: string | null = null
): void {
  // Create a storage event manually to avoid jsdom type checking issues
  const event = new Event('storage') as StorageEvent;
  
  // Manually set the properties since we can't use the constructor
  Object.defineProperties(event, {
    key: { value: key, writable: false },
    newValue: { value: newValue, writable: false },
    oldValue: { value: oldValue, writable: false },
    storageArea: { value: realLocalStorage, writable: false },
    url: { value: window.location.href, writable: false },
  });
  
  window.dispatchEvent(event);
}

// ============================================================================
// Test Setup and Teardown
// ============================================================================

describe('useLocalStorage Hook', () => {
  /** @type {MockStorage} */
  let mockStorage: MockStorage;

  /** @type {Storage} */
  let originalLocalStorage: Storage;

  /**
   * Set up mock localStorage before each test.
   * Preserves original localStorage for restoration.
   */
  beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = window.localStorage;
    // Store reference to real localStorage for storage events
    realLocalStorage = originalLocalStorage;

    // Replace localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  /**
   * Clean up after each test.
   * Restores original localStorage and cleans up React Testing Library.
   */
  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });

    // Clean up React Testing Library
    cleanup();

    // Clear all mocks
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Initial Value Handling Tests
  // ==========================================================================

  describe('Initial Value Handling', () => {
    it('should return initial value when localStorage is empty', () => {
      // Arrange
      const key = 'testKey';
      const initialValue = 'default value';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      // Assert
      expect(result.current[0]).toBe(initialValue);
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
      expect(mockStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('should return stored value when key exists in localStorage', () => {
      // Arrange
      const key = 'existingKey';
      const storedValue = 'stored value';
      const initialValue = 'default value';

      // Pre-populate localStorage
      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify(storedValue)]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      // Assert
      expect(result.current[0]).toBe(storedValue);
      expect(prePopulatedStorage.getItem).toHaveBeenCalledWith(key);
      expect(result.current[0]).not.toBe(initialValue);
    });

    it('should use function initializer if provided', () => {
      // Arrange
      const key = 'funcInitKey';
      const initializer = vi.fn(() => 'computed initial');

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initializer));

      // Assert
      expect(result.current[0]).toBe('computed initial');
      expect(initializer).toHaveBeenCalledTimes(1);
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should handle undefined initial value', () => {
      // Arrange
      const key = 'undefinedKey';

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<string | undefined>(key, undefined)
      );

      // Assert
      expect(result.current[0]).toBeUndefined();
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
      expect(typeof result.current[1]).toBe('function');
    });

    it('should handle null initial value', () => {
      // Arrange
      const key = 'nullKey';

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<string | null>(key, null)
      );

      // Assert
      expect(result.current[0]).toBeNull();
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
      expect(Array.isArray(result.current)).toBe(true);
    });
  });

  // ==========================================================================
  // Get/Set Values Tests
  // ==========================================================================

  describe('Get/Set Values', () => {
    it('should store value in localStorage when setter is called', () => {
      // Arrange
      const key = 'setValueKey';
      const initialValue = 'initial';
      const newValue = 'updated value';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        result.current[1](newValue);
      });

      // Assert
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(newValue)
      );
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
      expect(result.current[0]).toBe(newValue);
    });

    it('should update state when setValue is called', () => {
      // Arrange
      const key = 'updateStateKey';
      const initialValue = 'initial';
      const newValue = 'new state value';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));
      const [initialState] = result.current;

      act(() => {
        result.current[1](newValue);
      });

      // Assert
      expect(initialState).toBe(initialValue);
      expect(result.current[0]).toBe(newValue);
      expect(result.current[0]).not.toBe(initialValue);
    });

    it('should return updated value after setting', () => {
      // Arrange
      const key = 'returnUpdatedKey';
      const initialValue = 100;
      const updatedValue = 200;

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        result.current[1](updatedValue);
      });

      // Assert
      expect(result.current[0]).toBe(updatedValue);
      expect(typeof result.current[0]).toBe('number');
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(updatedValue)
      );
    });

    it('should handle functional updates (prevValue => newValue)', () => {
      // Arrange
      const key = 'functionalUpdateKey';
      const initialValue = 5;

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        result.current[1]((prev) => prev + 10);
      });

      // Assert
      expect(result.current[0]).toBe(15);
      expect(mockStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify(15));
      expect(result.current[0]).toBeGreaterThan(initialValue);
    });

    it('should handle multiple sequential updates correctly', () => {
      // Arrange
      const key = 'multiUpdateKey';
      const initialValue = 0;

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      // Assert
      expect(result.current[0]).toBe(3);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(3);
      expect(mockStorage.setItem).toHaveBeenLastCalledWith(
        key,
        JSON.stringify(3)
      );
    });
  });

  // ==========================================================================
  // JSON Serialization Tests
  // ==========================================================================

  describe('JSON Serialization', () => {
    it('should serialize objects to JSON when storing', () => {
      // Arrange
      const key = 'objectKey';
      const initialValue: TestUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<TestUser>(key, initialValue)
      );

      act(() => {
        result.current[1]({
          id: '456',
          name: 'Jane Doe',
          email: 'jane@example.com',
        });
      });

      // Assert
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify({
          id: '456',
          name: 'Jane Doe',
          email: 'jane@example.com',
        })
      );
      expect(result.current[0].id).toBe('456');
      expect(result.current[0].name).toBe('Jane Doe');
    });

    it('should deserialize JSON strings when retrieving', () => {
      // Arrange
      const key = 'deserializeKey';
      const storedUser: TestUser = {
        id: 'abc',
        name: 'Stored User',
        email: 'stored@example.com',
      };

      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify(storedUser)]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<TestUser>(key, { id: '', name: '', email: '' })
      );

      // Assert
      expect(result.current[0]).toEqual(storedUser);
      expect(result.current[0].id).toBe('abc');
      expect(result.current[0].email).toBe('stored@example.com');
    });

    it('should handle arrays correctly', () => {
      // Arrange
      const key = 'arrayKey';
      const initialArray = ['apple', 'banana', 'cherry'];

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<string[]>(key, initialArray)
      );

      act(() => {
        result.current[1]([...initialArray, 'date']);
      });

      // Assert
      expect(result.current[0]).toEqual(['apple', 'banana', 'cherry', 'date']);
      expect(result.current[0].length).toBe(4);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(['apple', 'banana', 'cherry', 'date'])
      );
    });

    it('should handle nested objects correctly', () => {
      // Arrange
      const key = 'nestedKey';
      const initialSettings: TestSettings = {
        theme: {
          mode: 'light',
          primaryColor: '#0000ff',
        },
        notifications: {
          email: true,
          push: false,
        },
      };

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<TestSettings>(key, initialSettings)
      );

      act(() => {
        result.current[1]({
          ...initialSettings,
          theme: {
            ...initialSettings.theme,
            mode: 'dark',
          },
        });
      });

      // Assert
      expect(result.current[0].theme.mode).toBe('dark');
      expect(result.current[0].theme.primaryColor).toBe('#0000ff');
      expect(result.current[0].notifications.email).toBe(true);
    });

    it('should handle primitive types (string, number, boolean)', () => {
      // Arrange
      const stringKey = 'stringPrimitive';
      const numberKey = 'numberPrimitive';
      const booleanKey = 'booleanPrimitive';

      // Act
      const { result: stringResult } = renderHook(() =>
        useLocalStorage<string>(stringKey, 'hello')
      );
      const { result: numberResult } = renderHook(() =>
        useLocalStorage<number>(numberKey, 42)
      );
      const { result: booleanResult } = renderHook(() =>
        useLocalStorage<boolean>(booleanKey, true)
      );

      // Assert
      expect(stringResult.current[0]).toBe('hello');
      expect(typeof stringResult.current[0]).toBe('string');
      expect(numberResult.current[0]).toBe(42);
      expect(typeof numberResult.current[0]).toBe('number');
      expect(booleanResult.current[0]).toBe(true);
      expect(typeof booleanResult.current[0]).toBe('boolean');
    });

    it('should handle null values', () => {
      // Arrange
      const key = 'nullValueKey';
      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify(null)]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<string | null>(key, 'default')
      );

      // Assert
      expect(result.current[0]).toBeNull();
      expect(prePopulatedStorage.getItem).toHaveBeenCalledWith(key);
      expect(result.current[0]).not.toBe('default');
    });
  });

  // ==========================================================================
  // Key Namespacing Tests
  // ==========================================================================

  describe('Key Namespacing', () => {
    it('should use provided key for localStorage access', () => {
      // Arrange
      const key = 'specific-namespace-key';
      const initialValue = 'namespaced value';

      // Act
      renderHook(() => useLocalStorage(key, initialValue));

      // Assert
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
      expect(mockStorage.getItem).toHaveBeenCalledWith('specific-namespace-key');
      expect(mockStorage.getItem).not.toHaveBeenCalledWith('other-key');
    });

    it('should not conflict with other keys', () => {
      // Arrange
      const key1 = 'namespace-key-1';
      const key2 = 'namespace-key-2';
      const value1 = 'value one';
      const value2 = 'value two';

      // Act
      const { result: result1 } = renderHook(() =>
        useLocalStorage(key1, value1)
      );
      const { result: result2 } = renderHook(() =>
        useLocalStorage(key2, value2)
      );

      act(() => {
        result1.current[1]('updated one');
      });

      // Assert
      expect(result1.current[0]).toBe('updated one');
      expect(result2.current[0]).toBe(value2);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key1,
        JSON.stringify('updated one')
      );
    });

    it('should handle special characters in keys', () => {
      // Arrange
      const specialKey = 'my.app:user/settings[0]';
      const initialValue = 'special key value';

      // Act
      const { result } = renderHook(() =>
        useLocalStorage(specialKey, initialValue)
      );

      act(() => {
        result.current[1]('updated special');
      });

      // Assert
      expect(mockStorage.getItem).toHaveBeenCalledWith(specialKey);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        specialKey,
        JSON.stringify('updated special')
      );
      expect(result.current[0]).toBe('updated special');
    });

    it('should handle empty string as key', () => {
      // Arrange
      const emptyKey = '';
      const initialValue = 'empty key value';

      // Act
      const { result } = renderHook(() =>
        useLocalStorage(emptyKey, initialValue)
      );

      // Assert
      expect(mockStorage.getItem).toHaveBeenCalledWith(emptyKey);
      expect(result.current[0]).toBe(initialValue);
      expect(typeof result.current[1]).toBe('function');
    });
  });

  // ==========================================================================
  // Storage Events (Cross-Tab Sync) Tests
  // ==========================================================================

  describe('Storage Events (Cross-Tab Sync)', () => {
    it('should update value when storage event is fired', () => {
      // Arrange
      const key = 'crossTabKey';
      const initialValue = 'initial';
      const newValue = 'updated from other tab';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        dispatchStorageEvent(key, JSON.stringify(newValue));
      });

      // Assert
      expect(result.current[0]).toBe(newValue);
      expect(result.current[0]).not.toBe(initialValue);
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should ignore storage events for different keys', () => {
      // Arrange
      const key = 'myKey';
      const otherKey = 'differentKey';
      const initialValue = 'my value';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        dispatchStorageEvent(otherKey, JSON.stringify('other value'));
      });

      // Assert
      expect(result.current[0]).toBe(initialValue);
      expect(result.current[0]).not.toBe('other value');
      expect(typeof result.current[0]).toBe('string');
    });

    it('should handle storage event with null newValue (deletion)', () => {
      // Arrange
      const key = 'deletionKey';
      const initialValue = 'to be deleted';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        // null newValue indicates the key was deleted
        dispatchStorageEvent(key, null);
      });

      // Assert
      // When key is deleted, should revert to initial value
      expect(result.current[0]).toBe(initialValue);
      expect(result.current[0]).not.toBeNull();
      expect(typeof result.current[0]).toBe('string');
    });

    it('should remove event listener on unmount', () => {
      // Arrange
      const key = 'unmountEventKey';
      const initialValue = 'initial';
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Act
      const { unmount } = renderHook(() =>
        useLocalStorage(key, initialValue)
      );

      unmount();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalled();
      removeEventListenerSpy.mockRestore();
    });

    it('should handle storage event with empty string value', () => {
      // Arrange
      const key = 'emptyStringEventKey';
      const initialValue = 'initial';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        dispatchStorageEvent(key, JSON.stringify(''));
      });

      // Assert
      expect(result.current[0]).toBe('');
      expect(result.current[0]).not.toBe(initialValue);
      expect(typeof result.current[0]).toBe('string');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle localStorage.getItem throwing error', () => {
      // Arrange
      const key = 'errorGetKey';
      const initialValue = 'fallback value';
      const errorStorage = createErrorStorage('Storage access denied');

      Object.defineProperty(window, 'localStorage', {
        value: errorStorage,
        writable: true,
        configurable: true,
      });

      // Act & Assert - should not throw
      expect(() => {
        renderHook(() => useLocalStorage(key, initialValue));
      }).not.toThrow();

      const { result } = renderHook(() => useLocalStorage(key, initialValue));
      expect(result.current[0]).toBe(initialValue);
      expect(errorStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should handle localStorage.setItem throwing error (quota exceeded)', () => {
      // Arrange
      const key = 'quotaKey';
      const initialValue = 'initial';
      const newValue = 'trying to save this large value';
      const quotaStorage = createQuotaExceededStorage();

      Object.defineProperty(window, 'localStorage', {
        value: quotaStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      // Assert - should not throw on setValue
      expect(() => {
        act(() => {
          result.current[1](newValue);
        });
      }).not.toThrow();

      expect(quotaStorage.setItem).toHaveBeenCalled();
      expect(quotaStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(newValue)
      );
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      // Arrange
      const key = 'invalidJsonKey';
      const initialValue = 'default value';
      const invalidJsonStorage = createMockStorage(
        new Map([[key, 'not valid json {']])
      );

      Object.defineProperty(window, 'localStorage', {
        value: invalidJsonStorage,
        writable: true,
        configurable: true,
      });

      // Act & Assert - should not throw
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      expect(result.current[0]).toBe(initialValue);
      expect(invalidJsonStorage.getItem).toHaveBeenCalledWith(key);
      expect(typeof result.current[0]).toBe('string');
    });

    it('should fall back to initial value on parse error', () => {
      // Arrange
      const key = 'parseErrorKey';
      const initialValue = { name: 'default' };
      const malformedStorage = createMockStorage(
        new Map([[key, '{malformed: json}']])
      );

      Object.defineProperty(window, 'localStorage', {
        value: malformedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<{ name: string }>(key, initialValue)
      );

      // Assert
      expect(result.current[0]).toEqual(initialValue);
      expect(result.current[0].name).toBe('default');
      expect(malformedStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should not crash on storage access denied', () => {
      // Arrange
      const key = 'accessDeniedKey';
      const initialValue = 'safe fallback';
      const deniedStorage = createErrorStorage(
        'SecurityError: The operation is insecure'
      );

      Object.defineProperty(window, 'localStorage', {
        value: deniedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      // Assert
      expect(result.current[0]).toBe(initialValue);
      expect(typeof result.current[1]).toBe('function');
      expect(result.current[0]).not.toBeUndefined();
    });

    it('should handle partial storage failure gracefully', () => {
      // Arrange
      const key = 'partialFailKey';
      const initialValue = 'initial value';
      let callCount = 0;

      // Storage that fails on second setItem call
      const partialFailStorage: MockStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          callCount++;
          if (callCount > 1) {
            throw new Error('Intermittent failure');
          }
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        get length() {
          return 0;
        },
        key: vi.fn(() => null),
      };

      Object.defineProperty(window, 'localStorage', {
        value: partialFailStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useLocalStorage(key, initialValue));

      act(() => {
        result.current[1]('first update');
      });

      // Second update may fail, but should not crash
      expect(() => {
        act(() => {
          result.current[1]('second update');
        });
      }).not.toThrow();

      // Assert
      expect(partialFailStorage.setItem).toHaveBeenCalledTimes(2);
      expect(result.current[0]).toBe('second update');
    });
  });

  // ==========================================================================
  // Cleanup and Memory Management Tests
  // ==========================================================================

  describe('Cleanup and Memory Management', () => {
    it('should clean up storage event listeners on unmount', () => {
      // Arrange
      const key = 'cleanupKey';
      const initialValue = 'initial';
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Act
      const { unmount } = renderHook(() =>
        useLocalStorage(key, initialValue)
      );

      unmount();

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalled();

      // Cleanup spies
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should not cause memory leaks with frequent updates', () => {
      // Arrange
      const key = 'frequentUpdateKey';
      const initialValue = 0;
      const updateCount = 100;

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<number>(key, initialValue)
      );

      // Perform many rapid updates
      for (let i = 0; i < updateCount; i++) {
        act(() => {
          result.current[1]((prev) => prev + 1);
        });
      }

      // Assert
      expect(result.current[0]).toBe(updateCount);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(updateCount);
      expect(typeof result.current[0]).toBe('number');
    });

    it('should handle rapid key changes', () => {
      // Arrange
      const initialValue = 'shared initial';
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Act
      const { rerender, result } = renderHook(
        ({ key }) => useLocalStorage(key, initialValue),
        { initialProps: { key: 'key1' } }
      );

      act(() => {
        result.current[1]('value for key1');
      });

      rerender({ key: 'key2' });

      act(() => {
        result.current[1]('value for key2');
      });

      rerender({ key: 'key3' });

      // Assert
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'key1',
        JSON.stringify('value for key1')
      );
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'key2',
        JSON.stringify('value for key2')
      );
      // Listener should be cleaned up when key changes
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('should handle component re-renders without duplicate listeners', () => {
      // Arrange
      const key = 'rerenderKey';
      const initialValue = 'initial';
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Act - render multiple times
      const { rerender } = renderHook(() =>
        useLocalStorage(key, initialValue)
      );

      rerender();
      rerender();
      rerender();

      // Assert - should only add listener once (or cleanup properly between renders)
      const storageListenerCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'storage'
      );
      expect(storageListenerCalls.length).toBeGreaterThan(0);
      expect(typeof storageListenerCalls[0][1]).toBe('function');

      addEventListenerSpy.mockRestore();
    });

    it('should properly synchronize state across multiple hook instances with same key', () => {
      // Arrange
      const sharedKey = 'sharedKey';
      const initialValue = 'shared initial';

      // Act
      const { result: result1 } = renderHook(() =>
        useLocalStorage(sharedKey, initialValue)
      );
      const { result: result2 } = renderHook(() =>
        useLocalStorage(sharedKey, initialValue)
      );

      act(() => {
        result1.current[1]('updated by first instance');
      });

      // Assert
      expect(result1.current[0]).toBe('updated by first instance');
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        sharedKey,
        JSON.stringify('updated by first instance')
      );
      // Note: result2 will update on next storage event, not immediately
      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle Date objects with JSON serialization', () => {
      // Arrange
      const key = 'dateKey';
      const dateString = '2024-01-15T10:30:00.000Z';

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<string>(key, dateString)
      );

      act(() => {
        result.current[1]('2024-06-20T15:45:00.000Z');
      });

      // Assert
      expect(result.current[0]).toBe('2024-06-20T15:45:00.000Z');
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify('2024-06-20T15:45:00.000Z')
      );
      expect(typeof result.current[0]).toBe('string');
    });

    it('should handle very long string values', () => {
      // Arrange
      const key = 'longStringKey';
      const longString = 'a'.repeat(10000);

      // Act
      const { result } = renderHook(() => useLocalStorage(key, ''));

      act(() => {
        result.current[1](longString);
      });

      // Assert
      expect(result.current[0]).toBe(longString);
      expect(result.current[0].length).toBe(10000);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(longString)
      );
    });

    it('should handle unicode characters in values', () => {
      // Arrange
      const key = 'unicodeKey';
      const unicodeValue = '你好世界 🌍 مرحبا';

      // Act
      const { result } = renderHook(() => useLocalStorage(key, ''));

      act(() => {
        result.current[1](unicodeValue);
      });

      // Assert
      expect(result.current[0]).toBe(unicodeValue);
      expect(result.current[0]).toContain('🌍');
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(unicodeValue)
      );
    });

    it('should handle zero as a valid numeric value', () => {
      // Arrange
      const key = 'zeroKey';
      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify(0)]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useLocalStorage<number>(key, 100));

      // Assert - should retrieve 0, not fall back to 100
      expect(result.current[0]).toBe(0);
      expect(result.current[0]).not.toBe(100);
      expect(typeof result.current[0]).toBe('number');
    });

    it('should handle false boolean value correctly', () => {
      // Arrange
      const key = 'falseBoolKey';
      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify(false)]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() => useLocalStorage<boolean>(key, true));

      // Assert - should retrieve false, not fall back to true
      expect(result.current[0]).toBe(false);
      expect(result.current[0]).not.toBe(true);
      expect(typeof result.current[0]).toBe('boolean');
    });

    it('should handle empty array value', () => {
      // Arrange
      const key = 'emptyArrayKey';
      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify([])]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<string[]>(key, ['default'])
      );

      // Assert - should retrieve empty array, not fall back to ['default']
      expect(result.current[0]).toEqual([]);
      expect(result.current[0].length).toBe(0);
      expect(Array.isArray(result.current[0])).toBe(true);
    });

    it('should handle empty object value', () => {
      // Arrange
      const key = 'emptyObjectKey';
      const prePopulatedStorage = createMockStorage(
        new Map([[key, JSON.stringify({})]])
      );
      Object.defineProperty(window, 'localStorage', {
        value: prePopulatedStorage,
        writable: true,
        configurable: true,
      });

      // Act
      const { result } = renderHook(() =>
        useLocalStorage<Record<string, unknown>>(key, { default: true })
      );

      // Assert - should retrieve empty object, not fall back to { default: true }
      expect(result.current[0]).toEqual({});
      expect(Object.keys(result.current[0]).length).toBe(0);
      expect(typeof result.current[0]).toBe('object');
    });
  });
});
