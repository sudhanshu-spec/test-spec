/**
 * @fileoverview Custom hook for synchronizing state with localStorage
 * @module hooks/useLocalStorage
 *
 * Provides a type-safe hook for persisting state to localStorage with automatic
 * JSON serialization/deserialization. Supports cross-tab synchronization via
 * storage events and graceful error handling for quota exceeded scenarios.
 *
 * Features:
 * - Type-safe generic implementation
 * - Automatic JSON serialization/deserialization
 * - Support for function initializers (lazy initialization)
 * - Cross-tab synchronization via storage events
 * - Graceful error handling (quota exceeded, access denied, invalid JSON)
 * - SSR-safe (checks for window availability)
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent}
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Type for the setValue function that can accept either a direct value
 * or an updater function (similar to useState).
 *
 * @template T - The type of the stored value
 */
type SetValue<T> = (value: T | ((prevValue: T) => T)) => void;

/**
 * Return type of the useLocalStorage hook.
 * Matches the React useState signature for familiarity.
 *
 * @template T - The type of the stored value
 */
type UseLocalStorageReturn<T> = [T, SetValue<T>];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely retrieves and parses a value from localStorage.
 *
 * @template T - The expected type of the stored value
 * @param {string} key - The localStorage key to read
 * @param {T | (() => T)} initialValue - Fallback value if key doesn't exist or on error
 * @returns {T} The parsed value from localStorage or the initial value
 */
function getStoredValue<T>(key: string, initialValue: T | (() => T)): T {
  // Handle SSR or environments without localStorage
  if (typeof window === 'undefined') {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }

  try {
    const item = window.localStorage.getItem(key);

    if (item === null) {
      // Key doesn't exist, return initial value
      return initialValue instanceof Function ? initialValue() : initialValue;
    }

    // Parse the JSON string
    return JSON.parse(item) as T;
  } catch (error) {
    // Handle parsing errors or storage access errors
    console.warn(
      `[useLocalStorage] Error reading localStorage key "${key}":`,
      error
    );
    return initialValue instanceof Function ? initialValue() : initialValue;
  }
}

/**
 * Safely stores a value in localStorage with JSON serialization.
 *
 * @template T - The type of the value to store
 * @param {string} key - The localStorage key to write
 * @param {T} value - The value to store
 * @returns {boolean} True if storage was successful, false otherwise
 */
function setStoredValue<T>(key: string, value: T): boolean {
  // Handle SSR or environments without localStorage
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Handle quota exceeded or access denied errors
    console.warn(
      `[useLocalStorage] Error setting localStorage key "${key}":`,
      error
    );
    return false;
  }
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Custom hook for synchronizing state with localStorage.
 *
 * Provides a useState-like API that automatically persists state to localStorage
 * and synchronizes across browser tabs via storage events.
 *
 * @template T - The type of the stored value
 * @param {string} key - The localStorage key to use
 * @param {T | (() => T)} initialValue - Initial value or lazy initializer function
 * @returns {UseLocalStorageReturn<T>} Tuple of [value, setValue]
 *
 * @example
 * // Basic usage with string
 * const [name, setName] = useLocalStorage('userName', 'Guest');
 *
 * @example
 * // With object type
 * interface User { id: string; name: string; }
 * const [user, setUser] = useLocalStorage<User>('currentUser', { id: '', name: '' });
 *
 * @example
 * // With lazy initializer
 * const [config, setConfig] = useLocalStorage('appConfig', () => computeDefaultConfig());
 *
 * @example
 * // With functional update
 * const [count, setCount] = useLocalStorage('counter', 0);
 * setCount(prev => prev + 1);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): UseLocalStorageReturn<T> {
  // Initialize state with value from localStorage or initial value
  const [storedValue, setStoredValue_] = useState<T>(() =>
    getStoredValue(key, initialValue)
  );

  /**
   * Memoized setter function that updates both state and localStorage.
   * Supports both direct values and updater functions.
   */
  const setValue: SetValue<T> = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      setStoredValue_((prevValue) => {
        // Handle functional updates
        const valueToStore =
          value instanceof Function ? value(prevValue) : value;

        // Persist to localStorage (fire-and-forget, don't block on errors)
        setStoredValue(key, valueToStore);

        return valueToStore;
      });
    },
    [key]
  );

  /**
   * Effect to listen for storage events from other tabs/windows.
   * Updates local state when the same key is modified elsewhere.
   */
  useEffect(() => {
    /**
     * Handler for storage events.
     * Only updates state if the event is for our key.
     *
     * @param {StorageEvent} event - The storage event from another tab
     */
    const handleStorageChange = (event: StorageEvent): void => {
      // Ignore events for other keys
      if (event.key !== key) {
        return;
      }

      // Handle key deletion (newValue is null)
      if (event.newValue === null) {
        // Reset to initial value when key is deleted
        setStoredValue_(() =>
          initialValue instanceof Function ? initialValue() : initialValue
        );
        return;
      }

      // Parse and update with new value
      try {
        const newValue = JSON.parse(event.newValue) as T;
        setStoredValue_(newValue);
      } catch (error) {
        console.warn(
          `[useLocalStorage] Error parsing storage event for key "${key}":`,
          error
        );
      }
    };

    // Add listener for cross-tab sync
    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on unmount or key change
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

// ============================================================================
// Exports
// ============================================================================

export default useLocalStorage;
