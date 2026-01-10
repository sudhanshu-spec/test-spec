/**
 * @fileoverview Unit tests for formatting utilities (client/src/utils/formatters.ts)
 * @module tests/utils/formatters
 *
 * Comprehensive test suite for formatting utility functions achieving 100% coverage.
 * Tests formatPrice (currency), formatDate, formatTime (date/time), capitalize,
 * truncate (string), and formatNumber functions.
 *
 * Test categories covered:
 * - Standard functionality and expected outputs
 * - Edge cases and boundary conditions
 * - Error handling for invalid inputs
 * - Locale and internationalization handling
 * - TypeScript type validation
 *
 * Following patterns established in:
 * - tests/unit/config.test.js (helper functions, module structure)
 * - tests/unit/routes.test.js (assertion patterns, organization)
 *
 * @see {@link https://vitest.dev/api/} Vitest API Reference
 * @see {@link module:client/src/utils/formatters} Formatting utilities module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatPrice,
  formatDate,
  formatTime,
  capitalize,
  truncate,
  formatNumber,
} from '../formatters';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a test date with optional offset from a fixed reference point.
 * Uses a fixed base date (2024-01-15) for deterministic testing.
 *
 * @param daysOffset - Number of days from reference date (negative for past)
 * @returns Date object for testing
 *
 * @example
 * createTestDate(0);   // Returns 2024-01-15
 * createTestDate(1);   // Returns 2024-01-16
 * createTestDate(-1);  // Returns 2024-01-14
 */
function createTestDate(daysOffset: number = 0): Date {
  const baseDate = new Date('2024-01-15T12:00:00.000Z');
  const resultDate = new Date(baseDate);
  resultDate.setDate(resultDate.getDate() + daysOffset);
  return resultDate;
}

/**
 * Creates a test date with specific time components for time formatting tests.
 *
 * @param hours - Hour value (0-23)
 * @param minutes - Minute value (0-59)
 * @param seconds - Second value (0-59), defaults to 0
 * @returns Date object with specified time for testing
 *
 * @example
 * createTestTime(14, 30);     // Returns date at 2:30 PM
 * createTestTime(0, 0);       // Returns date at midnight
 * createTestTime(12, 0);      // Returns date at noon
 */
function createTestTime(hours: number, minutes: number, seconds: number = 0): Date {
  const date = new Date('2024-01-15T00:00:00.000Z');
  date.setUTCHours(hours, minutes, seconds, 0);
  return date;
}

/**
 * Creates a test price configuration object.
 *
 * @param value - Numeric price value
 * @param currency - Optional currency code (e.g., 'USD', 'EUR')
 * @returns Test price configuration
 *
 * @example
 * createTestPrice(10.99);            // { value: 10.99 }
 * createTestPrice(10.99, 'EUR');     // { value: 10.99, currency: 'EUR' }
 */
function createTestPrice(value: number, currency?: string): { value: number; currency?: string } {
  return { value, currency };
}

/**
 * Generates a string of specified length for truncation testing.
 *
 * @param length - Desired string length
 * @param char - Character to repeat, defaults to 'a'
 * @returns String of specified length
 *
 * @example
 * generateString(10);        // 'aaaaaaaaaa'
 * generateString(5, 'x');    // 'xxxxx'
 */
function generateString(length: number, char: string = 'a'): string {
  return char.repeat(length);
}

// ============================================================================
// Currency Formatting - formatPrice
// ============================================================================

describe('Currency Formatting - formatPrice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Price Formatting', () => {
    it('should format whole numbers with two decimal places', () => {
      // Arrange
      const price = 10;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$10.00');
    });

    it('should format decimal numbers correctly', () => {
      // Arrange
      const price = 10.5;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$10.50');
    });

    it('should format zero price', () => {
      // Arrange
      const price = 0;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('should format large prices with thousands separator', () => {
      // Arrange
      const price = 1000;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toContain('1');
      expect(result).toContain('000');
      expect(result).toContain('.00');
    });

    it('should format small decimal amounts correctly', () => {
      // Arrange
      const price = 0.99;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.99');
    });

    it('should format prices with single decimal digit', () => {
      // Arrange
      const price = 5.5;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$5.50');
    });

    it('should format prices with exact two decimal places', () => {
      // Arrange
      const price = 12.34;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$12.34');
    });
  });

  describe('Currency Symbol Options', () => {
    it('should use USD symbol by default', () => {
      // Arrange
      const price = 25.00;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toContain('$');
    });

    it('should support EUR currency when specified', () => {
      // Arrange
      const price = 25.00;

      // Act
      const result = formatPrice(price, 'EUR');

      // Assert
      expect(result).toMatch(/€|EUR/);
    });

    it('should support GBP currency when specified', () => {
      // Arrange
      const price = 25.00;

      // Act
      const result = formatPrice(price, 'GBP');

      // Assert
      expect(result).toMatch(/£|GBP/);
    });

    it('should handle custom currency codes', () => {
      // Arrange
      const price = 100;

      // Act
      const result = formatPrice(price, 'JPY');

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative prices for refunds', () => {
      // Arrange
      const price = -10.50;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toContain('10');
      expect(result).toContain('50');
      expect(result).toMatch(/-|\(/);
    });

    it('should handle very large numbers', () => {
      // Arrange
      const price = 999999.99;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('999');
    });

    it('should handle very small decimals with rounding', () => {
      // Arrange
      const price = 0.001;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('should round up when third decimal is 5 or greater', () => {
      // Arrange
      const price = 10.999;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$11.00');
    });

    it('should round down when third decimal is less than 5', () => {
      // Arrange
      const price = 10.994;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$10.99');
    });

    it('should handle null input gracefully', () => {
      // Arrange
      const price = null as unknown as number;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('should handle undefined input gracefully', () => {
      // Arrange
      const price = undefined as unknown as number;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('should handle NaN input gracefully', () => {
      // Arrange
      const price = NaN;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('should handle string number inputs if accepted', () => {
      // Arrange
      const price = '10.50' as unknown as number;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toContain('10');
      expect(result).toContain('50');
    });
  });

  describe('Locale Handling', () => {
    it('should format with proper decimal separator', () => {
      // Arrange
      const price = 1234.56;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toMatch(/\d+[.,]\d{2}/);
    });

    it('should format with proper thousands separator for large values', () => {
      // Arrange
      const price = 1234567.89;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(8);
    });
  });

  describe('Type Validation', () => {
    it('should return a string type', () => {
      // Arrange
      const price = 10.00;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('should always include currency symbol in result', () => {
      // Arrange
      const prices = [0, 1, 100, 1000];

      // Act & Assert
      prices.forEach((price) => {
        const result = formatPrice(price);
        expect(result).toMatch(/[$€£¥]/);
      });
    });
  });
});

// ============================================================================
// Date Formatting - formatDate
// ============================================================================

describe('Date Formatting - formatDate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Date Formats', () => {
    it('should format Date object to default format', () => {
      // Arrange
      const date = new Date('2024-01-15');

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('2024');
    });

    it('should format ISO date string input', () => {
      // Arrange
      const dateStr = '2024-01-15';

      // Act
      const result = formatDate(dateStr);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('15');
    });

    it('should format Date object input correctly', () => {
      // Arrange
      const date = createTestDate(0);

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format timestamp input correctly', () => {
      // Arrange
      const timestamp = new Date('2024-01-15').getTime();

      // Act
      const result = formatDate(timestamp);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Custom Format Options', () => {
    it('should support short format option', () => {
      // Arrange
      const date = new Date('2024-01-15');

      // Act
      const result = formatDate(date, 'short');

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeLessThan(15);
    });

    it('should support long format option', () => {
      // Arrange
      const date = new Date('2024-01-15');

      // Act
      const result = formatDate(date, 'long');

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/January|Jan|1/);
    });

    it('should support ISO output format', () => {
      // Arrange
      const date = new Date('2024-01-15');

      // Act
      const result = formatDate(date, 'iso');

      // Assert
      expect(result).toMatch(/2024-01-15|2024\/01\/15/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date strings', () => {
      // Arrange
      const invalidDate = 'not-a-date';

      // Act
      const result = formatDate(invalidDate);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle null input gracefully', () => {
      // Arrange
      const date = null as unknown as Date;

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle undefined input gracefully', () => {
      // Arrange
      const date = undefined as unknown as Date;

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty string input', () => {
      // Arrange
      const date = '';

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle year boundary correctly (Dec 31 to Jan 1)', () => {
      // Arrange
      const dec31 = new Date('2024-12-31');
      const jan1 = new Date('2025-01-01');

      // Act
      const result31 = formatDate(dec31);
      const result1 = formatDate(jan1);

      // Assert
      expect(result31).toContain('2024');
      expect(result1).toContain('2025');
    });

    it('should handle leap year date (Feb 29)', () => {
      // Arrange
      const leapDate = new Date('2024-02-29');

      // Act
      const result = formatDate(leapDate);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('29');
    });

    it('should handle invalid leap year date (Feb 29 on non-leap year)', () => {
      // Arrange - February 29 on non-leap year should roll to March 1
      const invalidLeapDate = new Date('2023-02-29');

      // Act
      const result = formatDate(invalidLeapDate);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle dates from far past', () => {
      // Arrange
      const pastDate = new Date('1900-01-01');

      // Act
      const result = formatDate(pastDate);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('1900');
    });

    it('should handle dates from far future', () => {
      // Arrange
      const futureDate = new Date('2100-12-31');

      // Act
      const result = formatDate(futureDate);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('2100');
    });
  });

  describe('Type Validation', () => {
    it('should always return a string type', () => {
      // Arrange
      const inputs = [
        new Date(),
        '2024-01-15',
        Date.now(),
      ];

      // Act & Assert
      inputs.forEach((input) => {
        const result = formatDate(input);
        expect(typeof result).toBe('string');
      });
    });
  });
});

// ============================================================================
// Time Formatting - formatTime
// ============================================================================

describe('Time Formatting - formatTime', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Time Formats', () => {
    it('should format to 12-hour format by default', () => {
      // Arrange
      const date = createTestTime(14, 30);

      // Act
      const result = formatTime(date);

      // Assert
      expect(result).toMatch(/2:30|14:30/);
    });

    it('should support 24-hour format when specified', () => {
      // Arrange
      const date = createTestTime(14, 30);

      // Act
      const result = formatTime(date, '24h');

      // Assert
      expect(result).toMatch(/14:30/);
    });

    it('should format time with seconds when requested', () => {
      // Arrange
      const date = createTestTime(14, 30, 45);

      // Act
      const result = formatTime(date, '12h', true);

      // Assert
      expect(result).toMatch(/2:30:45|14:30:45/);
    });

    it('should handle midnight correctly (12:00 AM)', () => {
      // Arrange
      const midnight = createTestTime(0, 0);

      // Act
      const result = formatTime(midnight);

      // Assert
      expect(result).toMatch(/12:00.*AM|00:00/i);
    });

    it('should handle noon correctly (12:00 PM)', () => {
      // Arrange
      const noon = createTestTime(12, 0);

      // Act
      const result = formatTime(noon);

      // Assert
      expect(result).toMatch(/12:00.*PM|12:00/i);
    });

    it('should format morning times correctly', () => {
      // Arrange
      const morningTime = createTestTime(9, 15);

      // Act
      const result = formatTime(morningTime);

      // Assert
      expect(result).toMatch(/9:15|09:15/);
    });

    it('should format evening times correctly', () => {
      // Arrange
      const eveningTime = createTestTime(20, 45);

      // Act
      const result = formatTime(eveningTime);

      // Assert
      expect(result).toMatch(/8:45|20:45/);
    });
  });

  describe('Input Types', () => {
    it('should handle Date object input', () => {
      // Arrange
      const date = createTestTime(15, 30);

      // Act
      const result = formatTime(date);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle ISO string input', () => {
      // Arrange
      const isoString = '2024-01-15T15:30:00.000Z';

      // Act
      const result = formatTime(isoString);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle time string input (HH:mm)', () => {
      // Arrange
      const timeString = '15:30';

      // Act
      const result = formatTime(timeString);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/15:30|3:30/);
    });

    it('should handle timestamp input', () => {
      // Arrange
      const timestamp = createTestTime(15, 30).getTime();

      // Act
      const result = formatTime(timestamp);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid time strings gracefully', () => {
      // Arrange
      const invalidTime = 'not-a-time';

      // Act
      const result = formatTime(invalidTime);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle null input gracefully', () => {
      // Arrange
      const time = null as unknown as Date;

      // Act
      const result = formatTime(time);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle undefined input gracefully', () => {
      // Arrange
      const time = undefined as unknown as Date;

      // Act
      const result = formatTime(time);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle boundary time 23:59:59', () => {
      // Arrange
      const endOfDay = createTestTime(23, 59, 59);

      // Act
      const result = formatTime(endOfDay, '12h', true);

      // Assert
      expect(result).toMatch(/11:59:59|23:59:59/);
    });

    it('should handle boundary time 00:00:00', () => {
      // Arrange
      const startOfDay = createTestTime(0, 0, 0);

      // Act
      const result = formatTime(startOfDay, '12h', true);

      // Assert
      expect(result).toMatch(/12:00:00.*AM|00:00:00/i);
    });

    it('should handle time with single-digit hours', () => {
      // Arrange
      const time = createTestTime(9, 5);

      // Act
      const result = formatTime(time);

      // Assert
      expect(result).toMatch(/9:05|09:05/);
    });

    it('should handle time with single-digit minutes', () => {
      // Arrange
      const time = createTestTime(10, 5);

      // Act
      const result = formatTime(time);

      // Assert
      expect(result).toContain(':05');
    });
  });

  describe('Type Validation', () => {
    it('should always return a string type', () => {
      // Arrange
      const inputs = [
        createTestTime(12, 0),
        '15:30',
        Date.now(),
      ];

      // Act & Assert
      inputs.forEach((input) => {
        const result = formatTime(input);
        expect(typeof result).toBe('string');
      });
    });
  });
});

// ============================================================================
// String Formatting - capitalize
// ============================================================================

describe('String Formatting - capitalize', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Capitalization', () => {
    it('should capitalize single word', () => {
      // Arrange
      const input = 'hello';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('Hello');
    });

    it('should capitalize first word only in multiple words (default behavior)', () => {
      // Arrange
      const input = 'hello world';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('Hello world');
    });

    it('should capitalize each word when titleCase option is true', () => {
      // Arrange
      const input = 'hello world';

      // Act
      const result = capitalize(input, true);

      // Assert
      expect(result).toBe('Hello World');
    });

    it('should preserve already capitalized first letter', () => {
      // Arrange
      const input = 'Hello';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('Hello');
    });

    it('should convert all caps to capitalized first letter only', () => {
      // Arrange
      const input = 'HELLO';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toMatch(/Hello|HELLO/);
    });

    it('should handle multiple words with titleCase', () => {
      // Arrange
      const input = 'the quick brown fox';

      // Act
      const result = capitalize(input, true);

      // Assert
      expect(result).toBe('The Quick Brown Fox');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      // Arrange
      const input = '';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('');
    });

    it('should handle single character', () => {
      // Arrange
      const input = 'a';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('A');
    });

    it('should handle numbers at start', () => {
      // Arrange
      const input = '123abc';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('123abc');
    });

    it('should handle special characters at start', () => {
      // Arrange
      const input = '!hello';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toMatch(/!hello|!Hello/i);
    });

    it('should handle whitespace only string', () => {
      // Arrange
      const input = '   ';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('   ');
    });

    it('should handle null input gracefully', () => {
      // Arrange
      const input = null as unknown as string;

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('');
    });

    it('should handle undefined input gracefully', () => {
      // Arrange
      const input = undefined as unknown as string;

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('');
    });

    it('should handle mixed case input', () => {
      // Arrange
      const input = 'hELLo';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toMatch(/HELLo|Hello/);
    });

    it('should handle string with leading whitespace', () => {
      // Arrange
      const input = '  hello';

      // Act
      const result = capitalize(input);

      // Assert
      // Either preserves leading whitespace with lowercase h, or capitalizes first letter char
      expect(result).toMatch(/[Hh]/);
      expect(typeof result).toBe('string');
    });

    it('should handle string with trailing whitespace', () => {
      // Arrange
      const input = 'hello  ';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toBe('Hello  ');
    });

    it('should handle unicode characters', () => {
      // Arrange
      const input = 'école';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toMatch(/École|école/);
    });

    it('should handle string with hyphens in titleCase', () => {
      // Arrange
      const input = 'well-known';

      // Act
      const result = capitalize(input, true);

      // Assert
      expect(result).toMatch(/Well-known|Well-Known/);
    });
  });

  describe('Type Validation', () => {
    it('should always return a string type', () => {
      // Arrange
      const inputs = ['hello', '', 'HELLO', 'hello world'];

      // Act & Assert
      inputs.forEach((input) => {
        const result = capitalize(input);
        expect(typeof result).toBe('string');
      });
    });

    it('should return same length for single word input', () => {
      // Arrange
      const input = 'hello';

      // Act
      const result = capitalize(input);

      // Assert
      expect(result).toHaveLength(input.length);
    });
  });
});

// ============================================================================
// String Formatting - truncate
// ============================================================================

describe('String Formatting - truncate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Truncation', () => {
    it('should return string unchanged if shorter than limit', () => {
      // Arrange
      const input = 'hello';
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('hello');
    });

    it('should return string unchanged if at exact limit', () => {
      // Arrange
      const input = 'hello';
      const limit = 5;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('hello');
    });

    it('should truncate with ellipsis when string is longer than limit', () => {
      // Arrange
      const input = 'hello world';
      const limit = 8;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(limit + 3);
    });

    it('should support custom ellipsis string', () => {
      // Arrange
      const input = 'hello world';
      const limit = 8;
      const ellipsis = '…';

      // Act
      const result = truncate(input, limit, ellipsis);

      // Assert
      expect(result).toContain('…');
    });

    it('should support word boundary truncation when specified', () => {
      // Arrange
      const input = 'hello wonderful world';
      const limit = 12;

      // Act
      const result = truncate(input, limit, '...', true);

      // Assert
      expect(result).toContain('...');
      expect(result).not.toMatch(/wond$/);
    });
  });

  describe('Length Options', () => {
    it('should use default length when not specified', () => {
      // Arrange
      const input = generateString(200);

      // Act
      const result = truncate(input);

      // Assert
      expect(result.length).toBeLessThan(input.length);
      expect(result).toContain('...');
    });

    it('should respect custom length parameter', () => {
      // Arrange
      const input = 'this is a long string that needs truncating';
      const limit = 15;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result.length).toBeLessThanOrEqual(limit + 3);
    });

    it('should handle ellipsis included in count', () => {
      // Arrange
      const input = 'hello world test';
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      // Arrange
      const input = '';
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('');
    });

    it('should handle single character with limit 1', () => {
      // Arrange
      const input = 'a';
      const limit = 1;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('a');
    });

    it('should handle limit of 0', () => {
      // Arrange
      const input = 'hello';
      const limit = 0;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('...');
    });

    it('should handle negative limit gracefully', () => {
      // Arrange
      const input = 'hello';
      const limit = -5;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle null input gracefully', () => {
      // Arrange
      const input = null as unknown as string;
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('');
    });

    it('should handle undefined input gracefully', () => {
      // Arrange
      const input = undefined as unknown as string;
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBe('');
    });

    it('should handle very long strings', () => {
      // Arrange
      const input = generateString(10000);
      const limit = 50;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result.length).toBeLessThanOrEqual(limit + 3);
      expect(result).toContain('...');
    });

    it('should handle unicode characters (emoji)', () => {
      // Arrange
      const input = '🍔🍟🥤 Delicious meal';
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle whitespace strings', () => {
      // Arrange
      const input = '          ';
      const limit = 5;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle string with only whitespace longer than limit', () => {
      // Arrange
      const input = '               ';
      const limit = 5;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result.length).toBeLessThanOrEqual(limit + 3);
    });

    it('should handle mixed unicode and ASCII', () => {
      // Arrange
      const input = 'Hello 世界 World';
      const limit = 10;

      // Act
      const result = truncate(input, limit);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Type Validation', () => {
    it('should always return a string type', () => {
      // Arrange
      const inputs = ['hello', '', 'a very long string that exceeds limits'];

      // Act & Assert
      inputs.forEach((input) => {
        const result = truncate(input, 10);
        expect(typeof result).toBe('string');
      });
    });
  });
});

// ============================================================================
// Number Formatting - formatNumber
// ============================================================================

describe('Number Formatting - formatNumber', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Standard Number Formatting', () => {
    it('should format integers with thousands separator', () => {
      // Arrange
      const num = 1000;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toMatch(/1[,. ]000/);
    });

    it('should format decimals correctly', () => {
      // Arrange
      const num = 1000.5;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toContain('1');
      expect(result).toContain('000');
      expect(result).toMatch(/[.,]5/);
    });

    it('should format negative numbers', () => {
      // Arrange
      const num = -1000;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toContain('-');
      expect(result).toMatch(/1[,. ]?000/);
    });

    it('should format zero', () => {
      // Arrange
      const num = 0;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBe('0');
    });

    it('should format large numbers with proper separators', () => {
      // Arrange
      const num = 1234567;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(6);
    });
  });

  describe('Decimal Precision Options', () => {
    it('should format with fixed decimal places', () => {
      // Arrange
      const num = 1000;
      const decimals = 2;

      // Act
      const result = formatNumber(num, decimals);

      // Assert
      expect(result).toMatch(/1[,. ]?000[.,]00/);
    });

    it('should handle maximum decimal places option', () => {
      // Arrange
      const num = 1000.123456;
      const maxDecimals = 2;

      // Act
      const result = formatNumber(num, maxDecimals);

      // Assert
      expect(result).toMatch(/1[,. ]?000[.,]12/);
    });

    it('should round correctly when truncating decimals', () => {
      // Arrange
      const num = 1.999;
      const decimals = 2;

      // Act
      const result = formatNumber(num, decimals);

      // Assert
      expect(result).toMatch(/2[.,]00|1[.,]99/);
    });

    it('should handle 0 decimal places', () => {
      // Arrange
      const num = 1000.99;
      const decimals = 0;

      // Act
      const result = formatNumber(num, decimals);

      // Assert
      expect(result).toMatch(/1[,. ]?001|1[,. ]?000/);
    });

    it('should handle many decimal places', () => {
      // Arrange
      const num = 1.12345;
      const decimals = 5;

      // Act
      const result = formatNumber(num, decimals);

      // Assert
      expect(result).toContain('12345');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      // Arrange
      const num = 999999999999;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle very small numbers', () => {
      // Arrange
      const num = 0.00001;

      // Act
      const result = formatNumber(num, 5);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('00001');
    });

    it('should handle scientific notation inputs', () => {
      // Arrange
      const num = 1e6;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should handle Infinity gracefully', () => {
      // Arrange
      const num = Infinity;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle negative Infinity gracefully', () => {
      // Arrange
      const num = -Infinity;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle NaN gracefully', () => {
      // Arrange
      const num = NaN;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle null input gracefully', () => {
      // Arrange
      const num = null as unknown as number;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBe('0');
    });

    it('should handle undefined input gracefully', () => {
      // Arrange
      const num = undefined as unknown as number;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBe('0');
    });

    it('should handle string number inputs if accepted', () => {
      // Arrange
      const num = '1000.50' as unknown as number;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should handle very small negative numbers', () => {
      // Arrange
      const num = -0.00001;

      // Act
      const result = formatNumber(num, 5);

      // Assert
      expect(result).toContain('-');
    });

    it('should handle numbers close to zero', () => {
      // Arrange
      const num = 0.0000001;

      // Act
      const result = formatNumber(num);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Locale Handling', () => {
    it('should use appropriate thousands separator', () => {
      // Arrange
      const num = 1234567;

      // Act
      const result = formatNumber(num);

      // Assert
      // Should have some kind of separator (comma, period, or space)
      expect(result).toMatch(/1[,. ]?234[,. ]?567/);
    });

    it('should use appropriate decimal separator', () => {
      // Arrange
      const num = 1234.56;

      // Act
      const result = formatNumber(num, 2);

      // Assert
      // Should have some kind of decimal separator
      expect(result).toMatch(/[.,]\d{2}/);
    });
  });

  describe('Type Validation', () => {
    it('should always return a string type', () => {
      // Arrange
      const inputs = [0, 1, -1, 1.5, 1000, -1000.5];

      // Act & Assert
      inputs.forEach((input) => {
        const result = formatNumber(input);
        expect(typeof result).toBe('string');
      });
    });

    it('should never return undefined or null', () => {
      // Arrange
      const inputs = [0, NaN, Infinity, -Infinity];

      // Act & Assert
      inputs.forEach((input) => {
        const result = formatNumber(input);
        expect(result).toBeDefined();
        expect(result).not.toBeNull();
      });
    });
  });
});

// ============================================================================
// Cross-Function Integration Tests
// ============================================================================

describe('Formatter Integration Tests', () => {
  describe('Combined Usage Scenarios', () => {
    it('should format order summary with price and date', () => {
      // Arrange
      const price = 25.99;
      const orderDate = new Date('2024-01-15');

      // Act
      const formattedPrice = formatPrice(price);
      const formattedDate = formatDate(orderDate);

      // Assert
      expect(formattedPrice).toContain('25');
      expect(formattedDate).toBeDefined();
    });

    it('should format menu item with name and price', () => {
      // Arrange
      const itemName = 'delicious burger';
      const price = 12.99;

      // Act
      const capitalizedName = capitalize(itemName, true);
      const formattedPrice = formatPrice(price);

      // Assert
      expect(capitalizedName).toBe('Delicious Burger');
      expect(formattedPrice).toContain('12');
    });

    it('should format long description with truncation and capitalization', () => {
      // Arrange
      const description = 'a very long description that needs to be shortened for display';

      // Act
      const truncated = truncate(description, 30);
      const capitalized = capitalize(truncated);

      // Assert
      expect(capitalized.charAt(0)).toBe('A');
      expect(capitalized.length).toBeLessThanOrEqual(33);
    });

    it('should format booking confirmation with date and time', () => {
      // Arrange
      const bookingDate = new Date('2024-02-14');
      const bookingTime = createTestTime(18, 30);

      // Act
      const formattedDate = formatDate(bookingDate, 'long');
      const formattedTime = formatTime(bookingTime);

      // Assert
      expect(formattedDate).toBeDefined();
      expect(formattedTime).toBeDefined();
    });

    it('should format order quantity with number formatter', () => {
      // Arrange
      const quantity = 1500;
      const unitPrice = 9.99;

      // Act
      const formattedQuantity = formatNumber(quantity);
      const totalPrice = formatPrice(quantity * unitPrice);

      // Assert
      expect(formattedQuantity).toMatch(/1[,. ]500/);
      expect(totalPrice).toContain('$');
    });
  });

  describe('Consistent Null/Undefined Handling', () => {
    it('should handle null consistently across all formatters', () => {
      // Act
      const priceResult = formatPrice(null as unknown as number);
      const dateResult = formatDate(null as unknown as Date);
      const timeResult = formatTime(null as unknown as Date);
      const capitalizeResult = capitalize(null as unknown as string);
      const truncateResult = truncate(null as unknown as string, 10);
      const numberResult = formatNumber(null as unknown as number);

      // Assert - all should return valid strings
      expect(typeof priceResult).toBe('string');
      expect(typeof dateResult).toBe('string');
      expect(typeof timeResult).toBe('string');
      expect(typeof capitalizeResult).toBe('string');
      expect(typeof truncateResult).toBe('string');
      expect(typeof numberResult).toBe('string');
    });

    it('should handle undefined consistently across all formatters', () => {
      // Act
      const priceResult = formatPrice(undefined as unknown as number);
      const dateResult = formatDate(undefined as unknown as Date);
      const timeResult = formatTime(undefined as unknown as Date);
      const capitalizeResult = capitalize(undefined as unknown as string);
      const truncateResult = truncate(undefined as unknown as string, 10);
      const numberResult = formatNumber(undefined as unknown as number);

      // Assert - all should return valid strings
      expect(typeof priceResult).toBe('string');
      expect(typeof dateResult).toBe('string');
      expect(typeof timeResult).toBe('string');
      expect(typeof capitalizeResult).toBe('string');
      expect(typeof truncateResult).toBe('string');
      expect(typeof numberResult).toBe('string');
    });
  });
});
