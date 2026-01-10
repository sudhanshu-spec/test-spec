/**
 * @fileoverview Formatting utilities for the Burger Website application
 * @module utils/formatters
 *
 * Provides utility functions for formatting prices, dates, times, strings, and numbers
 * for display throughout the application.
 *
 * All formatters are designed to:
 * - Handle edge cases gracefully (null, undefined, NaN, Infinity)
 * - Return consistent string output
 * - Support internationalization where applicable
 * - Be pure functions without side effects
 *
 * @see {@link client/src/utils/__tests__/formatters.test.ts} Test suite
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported date format options.
 * @typedef {'short' | 'long' | 'iso'} DateFormat
 */
export type DateFormat = 'short' | 'long' | 'iso';

/**
 * Supported time format options.
 * @typedef {'12h' | '24h'} TimeFormat
 */
export type TimeFormat = '12h' | '24h';

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Formats a numeric price value as a currency string.
 *
 * Uses Intl.NumberFormat for locale-aware currency formatting with proper
 * symbols, decimal separators, and thousands grouping.
 *
 * @param {number} price - The price value to format
 * @param {string} [currency='USD'] - ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns {string} Formatted currency string (e.g., '$10.00', '€25.50')
 *
 * @example
 * formatPrice(10);           // '$10.00'
 * formatPrice(10.5);         // '$10.50'
 * formatPrice(10.999);       // '$11.00' (rounds up)
 * formatPrice(1000);         // '$1,000.00'
 * formatPrice(10, 'EUR');    // '€10.00'
 * formatPrice(null);         // '$0.00'
 * formatPrice(NaN);          // '$0.00'
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  // Handle null, undefined, and NaN
  const sanitizedPrice = (price === null || price === undefined || Number.isNaN(price))
    ? 0
    : Number(price);

  // Handle invalid number conversions (e.g., strings that can't be parsed)
  const finalPrice = Number.isNaN(sanitizedPrice) ? 0 : sanitizedPrice;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(finalPrice);
  } catch {
    // Fallback for unsupported currencies
    return `$${finalPrice.toFixed(2)}`;
  }
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Formats a date value as a human-readable string.
 *
 * Supports multiple input types (Date object, ISO string, timestamp) and
 * output formats (short, long, ISO).
 *
 * @param {Date | string | number} date - Date value to format
 * @param {DateFormat} [format='short'] - Output format:
 *   - 'short': MM/DD/YYYY (e.g., '01/15/2024')
 *   - 'long': Month DD, YYYY (e.g., 'January 15, 2024')
 *   - 'iso': YYYY-MM-DD (e.g., '2024-01-15')
 * @returns {string} Formatted date string
 *
 * @example
 * formatDate(new Date('2024-01-15'));           // '1/15/2024'
 * formatDate('2024-01-15');                     // '1/15/2024'
 * formatDate(1705276800000);                    // '1/15/2024' (timestamp)
 * formatDate(new Date('2024-01-15'), 'long');   // 'January 15, 2024'
 * formatDate(new Date('2024-01-15'), 'iso');    // '2024-01-15'
 * formatDate(null);                             // 'Invalid Date'
 */
export function formatDate(date: Date | string | number, format: DateFormat = 'short'): string {
  // Handle null/undefined
  if (date === null || date === undefined) {
    return 'Invalid Date';
  }

  // Convert to Date object
  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (typeof date === 'string') {
    // Handle empty string
    if (date.trim() === '') {
      return 'Invalid Date';
    }
    dateObj = new Date(date);
  } else {
    return 'Invalid Date';
  }

  // Check for invalid dates
  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  switch (format) {
    case 'long':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);

    case 'iso':
      return dateObj.toISOString().split('T')[0];

    case 'short':
    default:
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(dateObj);
  }
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Formats a time value as a human-readable string.
 *
 * Supports multiple input types (Date object, ISO string, time string, timestamp)
 * and 12-hour or 24-hour output formats.
 *
 * @param {Date | string | number} time - Time value to format
 * @param {TimeFormat} [format='12h'] - Output format:
 *   - '12h': 12-hour format with AM/PM (e.g., '2:30 PM')
 *   - '24h': 24-hour format (e.g., '14:30')
 * @param {boolean} [showSeconds=false] - Whether to include seconds
 * @returns {string} Formatted time string
 *
 * @example
 * formatTime(new Date('2024-01-15T14:30:00'));            // '2:30 PM'
 * formatTime(new Date('2024-01-15T14:30:00'), '24h');     // '14:30'
 * formatTime(new Date('2024-01-15T14:30:45'), '12h', true); // '2:30:45 PM'
 * formatTime('15:30');                                     // '3:30 PM'
 * formatTime(null);                                        // 'Invalid Time'
 */
export function formatTime(
  time: Date | string | number,
  format: TimeFormat = '12h',
  showSeconds: boolean = false
): string {
  // Handle null/undefined
  if (time === null || time === undefined) {
    return 'Invalid Time';
  }

  // Convert to Date object
  let dateObj: Date;
  if (time instanceof Date) {
    dateObj = time;
  } else if (typeof time === 'number') {
    dateObj = new Date(time);
  } else if (typeof time === 'string') {
    // Handle time-only strings (HH:mm or HH:mm:ss)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {
      const [hours, minutes, seconds = '0'] = time.split(':');
      dateObj = new Date();
      dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10), 0);
    } else {
      dateObj = new Date(time);
    }
  } else {
    return 'Invalid Time';
  }

  // Check for invalid dates
  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid Time';
  }

  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  };

  if (showSeconds) {
    options.second = '2-digit';
  }

  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

// ============================================================================
// String Formatting - Capitalize
// ============================================================================

/**
 * Capitalizes the first letter of a string or each word (title case).
 *
 * @param {string} input - String to capitalize
 * @param {boolean} [titleCase=false] - If true, capitalize each word
 * @returns {string} Capitalized string
 *
 * @example
 * capitalize('hello');              // 'Hello'
 * capitalize('hello world');        // 'Hello world'
 * capitalize('hello world', true);  // 'Hello World'
 * capitalize('HELLO');              // 'HELLO' (preserves existing case)
 * capitalize('');                   // ''
 * capitalize(null);                 // ''
 */
export function capitalize(input: string, titleCase: boolean = false): string {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return '';
  }

  // Ensure input is a string
  const str = String(input);

  // Handle empty string
  if (str.length === 0) {
    return '';
  }

  if (titleCase) {
    // Title case: capitalize first letter of each word
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Simple capitalize: only capitalize the first character
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// String Formatting - Truncate
// ============================================================================

/**
 * Truncates a string to a specified length, adding an ellipsis if truncated.
 *
 * @param {string} input - String to truncate
 * @param {number} [limit=100] - Maximum length before truncation
 * @param {string} [ellipsis='...'] - String to append when truncated
 * @param {boolean} [wordBoundary=false] - If true, truncate at word boundary
 * @returns {string} Truncated string
 *
 * @example
 * truncate('hello', 10);                    // 'hello'
 * truncate('hello world', 8);               // 'hello...'
 * truncate('hello world', 8, '…');          // 'hello…'
 * truncate('hello wonderful world', 12, '...', true); // 'hello...'
 * truncate('');                             // ''
 * truncate(null, 10);                       // ''
 */
export function truncate(
  input: string,
  limit: number = 100,
  ellipsis: string = '...',
  wordBoundary: boolean = false
): string {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return '';
  }

  // Ensure input is a string
  const str = String(input);

  // Handle empty string
  if (str.length === 0) {
    return '';
  }

  // Handle negative or zero limit
  if (limit <= 0) {
    return ellipsis;
  }

  // If string is within limit, return unchanged
  if (str.length <= limit) {
    return str;
  }

  // Truncate the string
  let truncated = str.slice(0, limit);

  // If word boundary is requested, find last space
  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }
  }

  return truncated.trim() + ellipsis;
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Formats a number with locale-aware thousand separators and decimal places.
 *
 * @param {number} num - Number to format
 * @param {number} [decimals] - Number of decimal places (optional)
 * @returns {string} Formatted number string
 *
 * @example
 * formatNumber(1000);           // '1,000'
 * formatNumber(1000.5);         // '1,000.5'
 * formatNumber(-1000);          // '-1,000'
 * formatNumber(0);              // '0'
 * formatNumber(1000, 2);        // '1,000.00'
 * formatNumber(1000.123456, 2); // '1,000.12'
 * formatNumber(NaN);            // '0'
 * formatNumber(null);           // '0'
 */
export function formatNumber(num: number, decimals?: number): string {
  // Handle null, undefined
  if (num === null || num === undefined) {
    return '0';
  }

  // Convert to number (handles string inputs)
  const numValue = Number(num);

  // Handle NaN
  if (Number.isNaN(numValue)) {
    return '0';
  }

  // Handle Infinity
  if (!Number.isFinite(numValue)) {
    return numValue > 0 ? '∞' : '-∞';
  }

  // Format options
  const options: Intl.NumberFormatOptions = {};

  if (typeof decimals === 'number') {
    options.minimumFractionDigits = decimals;
    options.maximumFractionDigits = decimals;
  }

  return new Intl.NumberFormat('en-US', options).format(numValue);
}
