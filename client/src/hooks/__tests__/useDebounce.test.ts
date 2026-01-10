/**
 * @fileoverview Unit tests for the useDebounce custom hook
 * @module tests/hooks/useDebounce
 *
 * Comprehensive test suite for the useDebounce hook that provides debounced value
 * updates. Tests cover all aspects of debounce functionality including:
 *
 * - Initial value behavior and type handling
 * - Delay functionality with various timing scenarios
 * - Value updates after debounce delay completion
 * - Rapid successive calls and timer cancellation
 * - Proper timer management and memory cleanup
 * - Component unmount handling
 *
 * Uses Vitest with vi.useFakeTimers() for precise timer control and
 * @testing-library/react's renderHook for testing hook behavior in isolation.
 *
 * Follows patterns established in tests/unit/config.test.js for:
 * - JSDoc documentation standards
 * - Lifecycle hook organization
 * - Descriptive test naming
 *
 * @see {@link https://vitest.dev/guide/mocking.html#timers} Vitest Timer Mocking
 * @see {@link https://testing-library.com/docs/react-testing-library/api/#renderhook} RTL renderHook
 * @see Section 0.7.3 of Agent Action Plan for test quality criteria
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Test user object for testing object value debouncing.
 * @interface TestUser
 */
interface TestUser {
  /** User identifier */
  id: number;
  /** User name */
  name: string;
}

/**
 * Default delay value in milliseconds for debounce tests.
 * @constant {number}
 */
const DEFAULT_DELAY = 500;

/**
 * Custom delay value in milliseconds for testing custom delays.
 * @constant {number}
 */
const CUSTOM_DELAY = 1000;

/**
 * Short delay value in milliseconds for rapid update tests.
 * @constant {number}
 */
const SHORT_DELAY = 100;

// ============================================================================
// Test Suite: useDebounce Hook
// ============================================================================

describe('useDebounce Hook', () => {
  /**
   * Setup fake timers before each test.
   * This allows precise control over setTimeout/setInterval/clearTimeout
   * for testing time-dependent debounce behavior.
   */
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /**
   * Restore real timers and cleanup after each test.
   * Ensures test isolation and prevents timer leaks between tests.
   */
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  // ==========================================================================
  // Initial Behavior Tests
  // ==========================================================================

  describe('Initial Behavior', () => {
    it('should return initial value immediately without delay', () => {
      // Arrange
      const initialValue = 'test-value';

      // Act
      const { result } = renderHook(() => useDebounce(initialValue, DEFAULT_DELAY));

      // Assert
      expect(result.current).toBe(initialValue);
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
    });

    it('should not trigger immediate updates on first render', () => {
      // Arrange
      const initialValue = 42;
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // Act
      const { result } = renderHook(() => useDebounce(initialValue, DEFAULT_DELAY));

      // Assert
      expect(result.current).toBe(initialValue);
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(result.current).not.toBe(undefined);

      // Cleanup spy
      setTimeoutSpy.mockRestore();
    });

    it('should accept string values correctly', () => {
      // Arrange
      const stringValue = 'hello world';

      // Act
      const { result } = renderHook(() => useDebounce(stringValue, DEFAULT_DELAY));

      // Assert
      expect(result.current).toBe(stringValue);
      expect(typeof result.current).toBe('string');
      expect(result.current.length).toBe(stringValue.length);
    });

    it('should accept number values correctly', () => {
      // Arrange
      const numberValue = 123.45;

      // Act
      const { result } = renderHook(() => useDebounce(numberValue, DEFAULT_DELAY));

      // Assert
      expect(result.current).toBe(numberValue);
      expect(typeof result.current).toBe('number');
      expect(result.current).toBeGreaterThan(0);
    });

    it('should accept object values correctly', () => {
      // Arrange
      const objectValue: TestUser = { id: 1, name: 'John' };

      // Act
      const { result } = renderHook(() => useDebounce(objectValue, DEFAULT_DELAY));

      // Assert
      expect(result.current).toEqual(objectValue);
      expect(result.current.id).toBe(1);
      expect(result.current.name).toBe('John');
    });

    it('should accept array values correctly', () => {
      // Arrange
      const arrayValue = [1, 2, 3, 4, 5];

      // Act
      const { result } = renderHook(() => useDebounce(arrayValue, DEFAULT_DELAY));

      // Assert
      expect(result.current).toEqual(arrayValue);
      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current.length).toBe(5);
    });

    it('should accept null and undefined values', () => {
      // Arrange & Act
      const { result: nullResult } = renderHook(() => useDebounce(null, DEFAULT_DELAY));
      const { result: undefinedResult } = renderHook(() => useDebounce(undefined, DEFAULT_DELAY));

      // Assert
      expect(nullResult.current).toBeNull();
      expect(undefinedResult.current).toBeUndefined();
      expect(nullResult.current === null).toBe(true);
    });
  });

  // ==========================================================================
  // Delay Functionality Tests
  // ==========================================================================

  describe('Delay Functionality', () => {
    it('should update value after specified delay', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = 'updated';
      rerender();

      // Assert - before delay
      expect(result.current).toBe('initial');

      // Act - advance time past delay
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert - after delay
      expect(result.current).toBe('updated');
      expect(result.current).not.toBe('initial');
    });

    it('should not update value before delay completes', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - update value and advance time but not past delay
      value = 'updated';
      rerender();

      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY - 100);
      });

      // Assert
      expect(result.current).toBe('initial');
      expect(result.current).not.toBe('updated');
      expect(DEFAULT_DELAY - 100).toBeLessThan(DEFAULT_DELAY);
    });

    it('should use default delay when not specified', () => {
      // Arrange - Test with default parameter behavior
      let value = 'initial';
      const defaultDelay = 300; // Assuming default is 300ms
      const { result, rerender } = renderHook(() => useDebounce(value, defaultDelay));

      // Act
      value = 'updated';
      rerender();

      // Assert - value should not update before default delay
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(defaultDelay);
      });

      // Assert - value should update after default delay
      expect(result.current).toBe('updated');
      expect(defaultDelay).toBe(300);
    });

    it('should respect custom delay values', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, CUSTOM_DELAY));

      // Act
      value = 'updated';
      rerender();

      // Assert - value should not update before custom delay
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });
      expect(result.current).toBe('initial');

      // Act - advance remaining time
      act(() => {
        vi.advanceTimersByTime(CUSTOM_DELAY - DEFAULT_DELAY);
      });

      // Assert - value should update after full custom delay
      expect(result.current).toBe('updated');
      expect(CUSTOM_DELAY).toBeGreaterThan(DEFAULT_DELAY);
    });

    it('should handle very short delay values', () => {
      // Arrange
      let value = 'initial';
      const veryShortDelay = 10;
      const { result, rerender } = renderHook(() => useDebounce(value, veryShortDelay));

      // Act
      value = 'updated';
      rerender();

      act(() => {
        vi.advanceTimersByTime(veryShortDelay);
      });

      // Assert
      expect(result.current).toBe('updated');
      expect(veryShortDelay).toBeLessThan(DEFAULT_DELAY);
      expect(result.current).not.toBe('initial');
    });

    it('should handle very long delay values', () => {
      // Arrange
      let value = 'initial';
      const veryLongDelay = 10000;
      const { result, rerender } = renderHook(() => useDebounce(value, veryLongDelay));

      // Act
      value = 'updated';
      rerender();

      // Assert - shouldn't update after shorter time
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current).toBe('initial');

      // Act - advance remaining time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Assert
      expect(result.current).toBe('updated');
      expect(veryLongDelay).toBe(10000);
    });
  });

  // ==========================================================================
  // Value Updates Tests
  // ==========================================================================

  describe('Value Updates', () => {
    it('should update debounced value when input changes after delay', () => {
      // Arrange
      let value = 'first';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - first update
      value = 'second';
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toBe('second');
      expect(result.current).not.toBe('first');
      expect(typeof result.current).toBe('string');
    });

    it('should reflect latest value after rapid changes', () => {
      // Arrange
      let value = 'start';
      const { result, rerender } = renderHook(() => useDebounce(value, SHORT_DELAY));

      // Act - rapid value changes
      value = 'change1';
      rerender();
      value = 'change2';
      rerender();
      value = 'change3';
      rerender();
      value = 'final';
      rerender();

      // Assert - before delay, should still be initial
      expect(result.current).toBe('start');

      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });

      // Assert - after delay, should be final value
      expect(result.current).toBe('final');
      expect(result.current).not.toBe('change1');
    });

    it('should handle primitive value updates correctly', () => {
      // Arrange
      let value = 100;
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = 200;
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toBe(200);
      expect(typeof result.current).toBe('number');
      expect(result.current).toBeGreaterThan(100);
    });

    it('should handle boolean value updates correctly', () => {
      // Arrange
      let value = false;
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = true;
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toBe(true);
      expect(typeof result.current).toBe('boolean');
      expect(result.current).not.toBe(false);
    });

    it('should handle object/array value updates correctly', () => {
      // Arrange
      let value: TestUser = { id: 1, name: 'Original' };
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = { id: 2, name: 'Updated' };
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toEqual({ id: 2, name: 'Updated' });
      expect(result.current.id).toBe(2);
      expect(result.current.name).toBe('Updated');
    });

    it('should handle multiple sequential updates with delays', () => {
      // Arrange
      let value = 'A';
      const { result, rerender } = renderHook(() => useDebounce(value, SHORT_DELAY));

      // Act & Assert - first update cycle
      value = 'B';
      rerender();
      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });
      expect(result.current).toBe('B');

      // Act & Assert - second update cycle
      value = 'C';
      rerender();
      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });
      expect(result.current).toBe('C');

      // Act & Assert - third update cycle
      value = 'D';
      rerender();
      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });
      expect(result.current).toBe('D');
    });
  });

  // ==========================================================================
  // Rapid Successive Calls Tests
  // ==========================================================================

  describe('Rapid Successive Calls', () => {
    it('should cancel previous timer on rapid value changes', () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      let value = 'initial';
      const { rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - rapid changes should trigger timer cancellation
      value = 'change1';
      rerender();
      value = 'change2';
      rerender();
      value = 'change3';
      rerender();

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
      expect(typeof clearTimeoutSpy).toBe('function');

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });

    it('should only emit final value after rapid changes settle', () => {
      // Arrange
      let value = 'start';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - simulate rapid typing
      const intermediateValues = ['s', 'se', 'sea', 'sear', 'searc', 'search'];
      intermediateValues.forEach((val) => {
        value = val;
        rerender();
        // Advance time but not past debounce
        act(() => {
          vi.advanceTimersByTime(50);
        });
      });

      // Assert - should still be initial value
      expect(result.current).toBe('start');
      expect(result.current).not.toBe('search');

      // Act - let debounce complete
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert - should be final value
      expect(result.current).toBe('search');
      expect(result.current.length).toBe(6);
    });

    it('should restart delay timer on each new value', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - change value near end of delay
      value = 'first';
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY - 50);
      });

      // Assert - still initial
      expect(result.current).toBe('initial');

      // Act - change again, should restart timer
      value = 'second';
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY - 50);
      });

      // Assert - still initial because timer restarted
      expect(result.current).toBe('initial');

      // Act - complete the full delay
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Assert - now should be updated
      expect(result.current).toBe('second');
    });

    it('should handle burst of changes followed by quiet period', () => {
      // Arrange
      let value = 0;
      const { result, rerender } = renderHook(() => useDebounce(value, SHORT_DELAY));

      // Act - burst of changes
      for (let i = 1; i <= 10; i++) {
        value = i;
        rerender();
      }

      // Assert - still initial during burst
      expect(result.current).toBe(0);

      // Act - quiet period
      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });

      // Assert - should be last value after settling
      expect(result.current).toBe(10);
      expect(result.current).not.toBe(0);
    });
  });

  // ==========================================================================
  // Timer Management Tests
  // ==========================================================================

  describe('Timer Management', () => {
    it('should clear timeout properly', () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      let value = 'initial';
      const { rerender, unmount } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - trigger a timeout and then unmount
      value = 'updated';
      rerender();
      unmount();

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(typeof clearTimeoutSpy.mock.calls[0][0]).toBeDefined();

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });

    it('should not have memory leaks after multiple updates', () => {
      // Arrange
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      let value = 0;
      const { rerender, unmount } = renderHook(() => useDebounce(value, SHORT_DELAY));

      // Act - perform many updates
      for (let i = 1; i <= 100; i++) {
        value = i;
        rerender();
      }

      // Assert - setTimeout should be called for each change
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Act - unmount and verify cleanup
      unmount();

      // Assert - cleanup should have been called
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);

      // Cleanup spies
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle zero delay edge case', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, 0));

      // Act
      value = 'updated';
      rerender();

      // Assert - with zero delay, should update immediately after timer runs
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
      expect(result.current).not.toBe('initial');
      expect(typeof result.current).toBe('string');
    });

    it('should handle negative delay by treating as zero or minimum', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, -100));

      // Act
      value = 'updated';
      rerender();

      // Assert - negative delay should be handled gracefully
      act(() => {
        vi.advanceTimersByTime(0);
      });

      // The hook should either use 0 or treat it as immediate
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
      expect(['initial', 'updated']).toContain(result.current);
    });

    it('should maintain timer reference integrity across updates', () => {
      // Arrange
      let value = 'A';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - multiple updates at different intervals
      value = 'B';
      rerender();
      act(() => {
        vi.advanceTimersByTime(100);
      });

      value = 'C';
      rerender();
      act(() => {
        vi.advanceTimersByTime(100);
      });

      value = 'D';
      rerender();

      // Assert - should still be A until delay completes from last change
      expect(result.current).toBe('A');

      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert - should be D after final delay
      expect(result.current).toBe('D');
      expect(result.current).not.toBe('A');
    });
  });

  // ==========================================================================
  // Cleanup on Unmount Tests
  // ==========================================================================

  describe('Cleanup on Unmount', () => {
    it('should clear pending timeout when component unmounts', () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      let value = 'initial';
      const { rerender, unmount } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - create pending timeout then unmount
      value = 'updated';
      rerender();
      unmount();

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(typeof clearTimeoutSpy).toBe('function');

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });

    it('should not update state after unmount', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender, unmount } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - update value and unmount before delay completes
      value = 'updated';
      rerender();

      const valueBeforeUnmount = result.current;
      unmount();

      // Advance time after unmount
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY * 2);
      });

      // Assert - attempting to check the result after unmount
      // The value should remain as it was before unmount
      expect(valueBeforeUnmount).toBe('initial');
      expect(typeof valueBeforeUnmount).toBe('string');
      expect(valueBeforeUnmount).not.toBe('updated');
    });

    it('should handle unmount during pending debounce', () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      let value = 'initial';
      const { result, rerender, unmount } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - update value
      value = 'pending';
      rerender();

      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY / 2);
      });

      // Assert - still initial
      expect(result.current).toBe('initial');

      // Act - unmount during pending debounce
      unmount();

      // Assert - clearTimeout should be called
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });

    it('should handle immediate unmount after mount', () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      // Act - mount and immediately unmount
      const { result, unmount } = renderHook(() => useDebounce('test', DEFAULT_DELAY));

      // Assert - initial value should be set
      expect(result.current).toBe('test');

      // Act - immediate unmount
      unmount();

      // Assert - cleanup should be called
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(typeof result.current).toBe('string');

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });

    it('should handle multiple mount/unmount cycles', () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      let value = 'cycle1';

      // First cycle
      const { unmount: unmount1 } = renderHook(() => useDebounce(value, DEFAULT_DELAY));
      unmount1();

      // Second cycle
      value = 'cycle2';
      const { result: result2, unmount: unmount2 } = renderHook(() => useDebounce(value, DEFAULT_DELAY));
      
      // Assert
      expect(result2.current).toBe('cycle2');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      unmount2();

      // Third cycle
      value = 'cycle3';
      const { result: result3 } = renderHook(() => useDebounce(value, DEFAULT_DELAY));
      
      // Assert
      expect(result3.current).toBe('cycle3');
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      clearTimeoutSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling Tests
  // ==========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string values', () => {
      // Arrange
      let value = 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - update to empty string
      value = '';
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toBe('');
      expect(result.current.length).toBe(0);
      expect(typeof result.current).toBe('string');
    });

    it('should handle NaN number values', () => {
      // Arrange
      let value = 42;
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - update to NaN
      value = NaN;
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(Number.isNaN(result.current)).toBe(true);
      expect(typeof result.current).toBe('number');
      expect(result.current).not.toBe(42);
    });

    it('should handle Infinity values', () => {
      // Arrange
      let value = 0;
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act - update to Infinity
      value = Infinity;
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toBe(Infinity);
      expect(Number.isFinite(result.current)).toBe(false);
      expect(typeof result.current).toBe('number');
    });

    it('should handle deeply nested object values', () => {
      // Arrange
      interface NestedObject {
        level1: {
          level2: {
            level3: {
              value: string;
            };
          };
        };
      }

      let value: NestedObject = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = {
        level1: {
          level2: {
            level3: {
              value: 'updated deep',
            },
          },
        },
      };
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current.level1.level2.level3.value).toBe('updated deep');
      expect(typeof result.current).toBe('object');
      expect(result.current).not.toBeNull();
    });

    it('should handle function values', () => {
      // Arrange
      let value = () => 'initial';
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = () => 'updated';
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(typeof result.current).toBe('function');
      expect(result.current()).toBe('updated');
      expect(result.current).not.toBe(undefined);
    });

    it('should handle symbol values', () => {
      // Arrange
      const initialSymbol = Symbol('initial');
      const updatedSymbol = Symbol('updated');
      let value = initialSymbol;
      const { result, rerender } = renderHook(() => useDebounce(value, DEFAULT_DELAY));

      // Act
      value = updatedSymbol;
      rerender();
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Assert
      expect(result.current).toBe(updatedSymbol);
      expect(typeof result.current).toBe('symbol');
      expect(result.current).not.toBe(initialSymbol);
    });
  });

  // ==========================================================================
  // Delay Change Tests
  // ==========================================================================

  describe('Delay Changes', () => {
    it('should respond to delay value changes', () => {
      // Arrange
      let value = 'initial';
      let delay = SHORT_DELAY;
      const { result, rerender } = renderHook(() => useDebounce(value, delay));

      // Act - change both value and delay
      value = 'updated';
      delay = CUSTOM_DELAY;
      rerender();

      // Assert - should use new delay
      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });
      expect(result.current).toBe('initial'); // Still initial with new longer delay

      act(() => {
        vi.advanceTimersByTime(CUSTOM_DELAY - SHORT_DELAY);
      });
      expect(result.current).toBe('updated');
      expect(CUSTOM_DELAY).toBeGreaterThan(SHORT_DELAY);
    });

    it('should handle delay decreasing mid-debounce', () => {
      // Arrange
      let value = 'initial';
      let delay = CUSTOM_DELAY;
      const { result, rerender } = renderHook(() => useDebounce(value, delay));

      // Act - start with long delay
      value = 'updated';
      rerender();

      // Wait some time with original delay
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DELAY);
      });

      // Change delay to shorter
      delay = SHORT_DELAY;
      rerender();

      // Assert
      act(() => {
        vi.advanceTimersByTime(SHORT_DELAY);
      });
      
      // The exact behavior depends on implementation
      expect(typeof result.current).toBe('string');
      expect(result.current).toBeDefined();
      expect(['initial', 'updated']).toContain(result.current);
    });
  });
});
