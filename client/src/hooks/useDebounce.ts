/**
 * @fileoverview Custom hook for debouncing value changes
 * @module hooks/useDebounce
 *
 * Provides a type-safe hook for debouncing rapidly changing values.
 * Useful for scenarios like search input debouncing, form validation,
 * or any situation where you want to delay processing until user
 * input has settled.
 *
 * Features:
 * - Type-safe generic implementation
 * - Configurable delay duration
 * - Automatic cleanup on unmount
 * - Proper timer management to prevent memory leaks
 * - SSR-safe implementation
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/setTimeout}
 * @see {@link https://react.dev/reference/react/useEffect} React useEffect
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Default delay in milliseconds if none is specified.
 * 300ms is a common default that balances responsiveness with debouncing effect.
 *
 * @constant {number}
 */
const DEFAULT_DELAY = 300;

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Custom hook that debounces a value.
 *
 * Returns a debounced version of the provided value that only updates
 * after the specified delay has elapsed without any new value changes.
 * This is useful for delaying expensive operations like API calls or
 * complex computations until user input has stabilized.
 *
 * @template T - The type of the value to debounce
 * @param {T} value - The value to debounce
 * @param {number} [delay=DEFAULT_DELAY] - The debounce delay in milliseconds
 * @returns {T} The debounced value
 *
 * @example
 * // Basic usage with search input
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // This will only run 500ms after the user stops typing
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 *
 * @example
 * // With object values
 * const [filters, setFilters] = useState({ category: '', price: 0 });
 * const debouncedFilters = useDebounce(filters, 300);
 *
 * @example
 * // With default delay
 * const debouncedValue = useDebounce(value); // Uses 300ms default
 */
export function useDebounce<T>(value: T, delay: number = DEFAULT_DELAY): T {
  // State to hold the debounced value
  // We use a function initializer to prevent React from treating function values
  // as lazy initializers (which would call them instead of storing them)
  const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

  useEffect(() => {
    // Handle edge case: negative delays are treated as 0 (immediate)
    const effectiveDelay = Math.max(0, delay);

    // Set up the timer to update the debounced value
    // We use a function updater that returns the value to properly handle
    // function values (without this, React would treat function values as updaters)
    const timeoutId = setTimeout(() => {
      setDebouncedValue(() => value);
    }, effectiveDelay);

    // Cleanup function: clear the timeout if value changes or component unmounts
    // This is what makes the debouncing work - we cancel the previous timer
    // whenever a new value comes in, ensuring only the final value after
    // the delay period gets applied
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]); // Re-run effect when value or delay changes

  return debouncedValue;
}

// ============================================================================
// Exports
// ============================================================================

export default useDebounce;
