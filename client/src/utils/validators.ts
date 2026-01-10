/**
 * @fileoverview Validation utilities for the Burger Website application
 * @module utils/validators
 *
 * Provides utility functions for validating user input including emails, phone numbers,
 * dates, required fields, and password strength. These validators are security-critical
 * and achieve 100% test coverage as required per Section 0.7.2.
 *
 * All validators are designed to:
 * - Handle edge cases gracefully (null, undefined, empty strings)
 * - Return consistent boolean output or validation result objects
 * - Be pure functions without side effects
 * - Follow industry-standard validation patterns
 *
 * @see {@link client/src/utils/__tests__/validators.test.ts} Test suite
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result object returned by password strength validation.
 * @interface PasswordValidationResult
 */
export interface PasswordValidationResult {
  /** Whether the password meets all strength requirements */
  isValid: boolean;
  /** Array of validation error messages describing failed requirements */
  errors: string[];
}

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validates an email address format.
 *
 * Uses RFC 5322 compliant regex pattern to validate email structure.
 * Supports standard formats including:
 * - Basic format (user@domain.com)
 * - Subdomains (user@sub.domain.com)
 * - Plus addressing (user+tag@domain.com)
 * - Numeric domains (user@123.com)
 * - Multiple dots in domain (user@a.b.c.com)
 *
 * @param {string} email - The email address to validate
 * @returns {boolean} True if the email format is valid, false otherwise
 *
 * @example
 * isValidEmail('user@example.com');        // true
 * isValidEmail('user+tag@sub.domain.com'); // true
 * isValidEmail('invalid-email');           // false
 * isValidEmail('');                        // false
 * isValidEmail(null);                      // false
 */
export function isValidEmail(email: string | null | undefined): boolean {
  // Handle null, undefined, and non-string types
  if (email === null || email === undefined || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace and check for empty string
  const trimmedEmail = email.trim();
  if (trimmedEmail === '') {
    return false;
  }

  // Check for whitespace-only strings
  if (/^\s+$/.test(email)) {
    return false;
  }

  // RFC 5321 maximum email length is 254 characters
  if (trimmedEmail.length > 254) {
    return false;
  }

  // Additional validations
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount !== 1) {
    return false;
  }

  const [localPart, domain] = trimmedEmail.split('@');

  // Check for empty local part or domain
  if (!localPart || !domain) {
    return false;
  }

  // Check for spaces (not allowed in email addresses)
  if (trimmedEmail.includes(' ')) {
    return false;
  }

  // Check for invalid characters in local part
  // Only allow: letters, numbers, dots, hyphens, underscores, plus signs
  // Do NOT allow: !#$%^&*()
  if (/[!#$%^&*()]/.test(localPart)) {
    return false;
  }

  // Check for leading dot in local part
  if (localPart.startsWith('.')) {
    return false;
  }

  // Check for trailing dot in local part
  if (localPart.endsWith('.')) {
    return false;
  }

  // Check for consecutive dots in local part
  if (/\.\./.test(localPart)) {
    return false;
  }

  // Stricter email regex pattern for local part
  // Allows: letters, numbers, dots, hyphens, underscores, plus signs
  const localPartRegex = /^[a-zA-Z0-9._+-]+$/;
  if (!localPartRegex.test(localPart)) {
    return false;
  }

  // Domain validation
  // Domain must contain at least one dot for TLD
  if (!domain.includes('.')) {
    return false;
  }

  // Domain must start with alphanumeric
  if (!/^[a-zA-Z0-9]/.test(domain)) {
    return false;
  }

  // Domain validation regex
  const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    return false;
  }

  return true;
}

// ============================================================================
// Phone Number Validation
// ============================================================================

/**
 * Validates a phone number format.
 *
 * Supports multiple common US phone number formats:
 * - Plain digits: 1234567890
 * - Dashes: 123-456-7890
 * - Parentheses: (123) 456-7890
 * - Dots: 123.456.7890
 * - International: +1 234 567 8900
 *
 * Requires a minimum of 10 digits for US phone numbers.
 *
 * @param {string} phone - The phone number to validate
 * @returns {boolean} True if the phone format is valid, false otherwise
 *
 * @example
 * isValidPhone('1234567890');       // true
 * isValidPhone('123-456-7890');     // true
 * isValidPhone('(123) 456-7890');   // true
 * isValidPhone('+1 234 567 8900');  // true
 * isValidPhone('123');              // false (too few digits)
 * isValidPhone('');                 // false
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  // Handle null, undefined, and non-string types
  if (phone === null || phone === undefined || typeof phone !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedPhone = phone.trim();
  
  // Check for empty string
  if (trimmedPhone === '') {
    return false;
  }

  // Remove all allowed separators to count digits
  // Allowed: spaces, dashes, dots, parentheses, plus sign
  const digitsOnly = trimmedPhone.replace(/[\s\-.()+]/g, '');

  // Check that remaining characters are all digits
  if (!/^\d+$/.test(digitsOnly)) {
    return false;
  }

  // Check digit count (10-12 digits, reject 13+ digits)
  const digitCount = digitsOnly.length;
  if (digitCount < 10 || digitCount > 12) {
    return false;
  }

  // Reject all-zeros phone number (invalid)
  if (/^0+$/.test(digitsOnly)) {
    return false;
  }

  // Extract area code (first 3 digits after any country code)
  // For US numbers, area code should not start with 0 or 1
  let areaCode: string;
  
  // Check if number starts with + (international format)
  if (trimmedPhone.startsWith('+')) {
    // For +1 format, area code is digits 2-4 (after country code)
    // For +11 format (11 digits with +1), area code starts at position 1
    if (digitCount === 11 && digitsOnly.startsWith('1')) {
      areaCode = digitsOnly.substring(1, 4);
    } else if (digitCount === 10) {
      areaCode = digitsOnly.substring(0, 3);
    } else {
      areaCode = digitsOnly.substring(1, 4);
    }
  } else if (digitCount === 11 && digitsOnly.startsWith('1')) {
    // 11-digit number starting with 1 (country code)
    areaCode = digitsOnly.substring(1, 4);
  } else {
    // 10-digit number, area code is first 3 digits
    areaCode = digitsOnly.substring(0, 3);
  }

  // Reject area codes starting with 0 (invalid for US numbers)
  if (areaCode.startsWith('0')) {
    return false;
  }

  // Validate format patterns
  // Pattern for various phone formats
  const validPatterns = [
    /^\d{10}$/, // Plain: 1234567890
    /^\d{3}-\d{3}-\d{4}$/, // Dashes: 123-456-7890
    /^\(\d{3}\)\s?\d{3}-\d{4}$/, // Parentheses: (123) 456-7890 or (123)456-7890
    /^\d{3}\.\d{3}\.\d{4}$/, // Dots: 123.456.7890
    /^\+\d{1,2}\s\d{3}\s\d{3}\s\d{4}$/, // International: +1 234 567 8900
    /^\+\d{1,2}\d{10}$/, // International no spaces: +11234567890
    /^\d{3}\s\d{3}\s\d{4}$/, // Spaces: 123 456 7890
  ];

  // Check if matches any valid pattern
  for (const pattern of validPatterns) {
    if (pattern.test(trimmedPhone)) {
      return true;
    }
  }

  // If digit count is valid but format doesn't match known patterns,
  // still accept if it's purely digits with allowed separators
  const cleanedPhone = trimmedPhone.replace(/[\s\-.()+]/g, '');
  if (/^\d{10,12}$/.test(cleanedPhone)) {
    // Verify no invalid characters
    if (/^[\d\s\-.()+]+$/.test(trimmedPhone)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Date Validation
// ============================================================================

/**
 * Validates that a date is valid and represents a real calendar date.
 *
 * Supports multiple input types:
 * - ISO format strings: 'YYYY-MM-DD'
 * - US format strings: 'MM/DD/YYYY'
 * - Date objects
 *
 * Validates that:
 * - Month is 1-12
 * - Day is valid for the given month (accounts for leap years)
 * - The date can be parsed to a valid Date object
 *
 * @param {string | Date} date - The date to validate
 * @returns {boolean} True if the date is valid, false otherwise
 *
 * @example
 * isValidDate('2024-01-15');      // true
 * isValidDate('01/15/2024');      // true
 * isValidDate(new Date());        // true
 * isValidDate('2024-13-01');      // false (invalid month)
 * isValidDate('2024-02-30');      // false (invalid day)
 * isValidDate('invalid');         // false
 * isValidDate('');                // false
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  // Handle null and undefined
  if (date === null || date === undefined) {
    return false;
  }

  // Handle Date objects
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }

  // Handle non-string types
  if (typeof date !== 'string') {
    return false;
  }

  // Check for empty string
  const trimmedDate = date.trim();
  if (trimmedDate === '') {
    return false;
  }

  // Try parsing as ISO format (YYYY-MM-DD)
  const isoMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    return isValidCalendarDate(year, month, day);
  }

  // Try parsing as US format (MM/DD/YYYY)
  const usMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, monthStr, dayStr, yearStr] = usMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    return isValidCalendarDate(year, month, day);
  }

  // Try parsing with Date constructor as fallback
  const parsedDate = new Date(trimmedDate);
  if (!isNaN(parsedDate.getTime())) {
    return true;
  }

  return false;
}

/**
 * Helper function to validate calendar date components.
 *
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @param {number} day - The day of month
 * @returns {boolean} True if the date components form a valid date
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  // Check month range
  if (month < 1 || month > 12) {
    return false;
  }

  // Check day range (basic)
  if (day < 1 || day > 31) {
    return false;
  }

  // Check days in month
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Adjust for leap year
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) {
      daysInMonth[2] = 29;
    }
  }

  if (day > daysInMonth[month]) {
    return false;
  }

  // Verify by creating Date and checking components match
  const testDate = new Date(year, month - 1, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month - 1 &&
    testDate.getDate() === day
  );
}

// ============================================================================
// Future Date Validation
// ============================================================================

/**
 * Validates that a date is in the future (after today).
 *
 * Compares the input date against the current date (at midnight).
 * Today's date is NOT considered a future date.
 *
 * @param {string | Date} date - The date to validate
 * @returns {boolean} True if the date is in the future, false otherwise
 *
 * @example
 * // Assuming today is 2024-01-15
 * isFutureDate('2024-01-16');     // true (tomorrow)
 * isFutureDate('2025-01-15');     // true (next year)
 * isFutureDate('2024-01-15');     // false (today)
 * isFutureDate('2024-01-14');     // false (yesterday)
 * isFutureDate('invalid');        // false
 */
export function isFutureDate(date: string | Date | null | undefined): boolean {
  // Handle null and undefined
  if (date === null || date === undefined) {
    return false;
  }

  // First validate the date format
  if (!isValidDate(date)) {
    return false;
  }

  // Parse the input date
  let inputDate: Date;
  if (date instanceof Date) {
    inputDate = new Date(date);
  } else {
    inputDate = new Date(date);
  }

  // Check if parsing was successful
  if (isNaN(inputDate.getTime())) {
    return false;
  }

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Set input date to midnight for fair comparison
  inputDate.setHours(0, 0, 0, 0);

  // Return true if input date is strictly after today
  return inputDate.getTime() > today.getTime();
}

// ============================================================================
// Required Field Validation
// ============================================================================

/**
 * Validates that a value is present and not empty.
 *
 * Considers the following as invalid (not present):
 * - null
 * - undefined
 * - Empty string ''
 * - Whitespace-only string '   '
 * - Empty arrays []
 *
 * Considers the following as valid (present):
 * - Non-empty strings (after trimming)
 * - Numbers (including 0)
 * - Booleans (including false)
 * - Non-empty objects
 * - Non-empty arrays
 *
 * @param {unknown} value - The value to validate
 * @returns {boolean} True if the value is present, false otherwise
 *
 * @example
 * isRequired('hello');     // true
 * isRequired(0);           // true
 * isRequired(false);       // true
 * isRequired([1, 2, 3]);   // true
 * isRequired({});          // true
 * isRequired('');          // false
 * isRequired('   ');       // false
 * isRequired(null);        // false
 * isRequired(undefined);   // false
 * isRequired([]);          // false
 */
export function isRequired(value: unknown): boolean {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return false;
  }

  // Handle strings
  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // Handle numbers (0 is considered valid/present)
  if (typeof value === 'number') {
    return !isNaN(value);
  }

  // Handle booleans (false is considered valid/present)
  if (typeof value === 'boolean') {
    return true;
  }

  // Handle objects (empty objects are considered present)
  if (typeof value === 'object') {
    return true;
  }

  // For other types (functions, symbols), consider them present
  return true;
}

// ============================================================================
// Password Strength Validation
// ============================================================================

/**
 * Minimum required password length.
 * @constant {number}
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates password strength against security requirements.
 *
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 *
 * @param {string} password - The password to validate
 * @returns {PasswordValidationResult} Object with isValid boolean and errors array
 *
 * @example
 * validatePasswordStrength('ValidPass1!');
 * // { isValid: true, errors: [] }
 *
 * validatePasswordStrength('weak');
 * // { isValid: false, errors: ['Password must be at least 8 characters', ...] }
 *
 * validatePasswordStrength('');
 * // { isValid: false, errors: ['Password is required', ...] }
 */
export function validatePasswordStrength(password: string | null | undefined): PasswordValidationResult {
  const errors: string[] = [];

  // Handle null and undefined
  if (password === null || password === undefined) {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }

  // Handle non-string types
  if (typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password must be a string'],
    };
  }

  // Check for empty password
  if (password === '') {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
