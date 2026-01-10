/**
 * @fileoverview Reusable Input component with validation, error states, and accessibility features
 * @module components/Input
 *
 * This component provides a fully-featured form input with:
 * - Controlled input behavior with onChange callback
 * - Custom validation support (sync and async)
 * - Error state display with accessible announcements
 * - Multiple input types (text, email, password, number, tel)
 * - Full accessibility compliance (ARIA attributes, label association)
 * - Ref forwarding for programmatic focus control
 *
 * @example
 * // Basic usage
 * <Input
 *   value={value}
 *   onChange={setValue}
 *   label="Email"
 *   type="email"
 *   required
 * />
 *
 * @example
 * // With validation
 * <Input
 *   value={password}
 *   onChange={setPassword}
 *   label="Password"
 *   type="password"
 *   validate={(value) => value.length < 8 ? 'Password must be at least 8 characters' : null}
 * />
 */

import React, { forwardRef, useState, useCallback, useId, useEffect } from 'react';

// ============================================================================
// TypeScript Types and Interfaces
// ============================================================================

/**
 * Input type options supported by the Input component.
 * @typedef {'text' | 'email' | 'password' | 'number' | 'tel'} InputType
 */
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel';

/**
 * Validator function type for custom input validation.
 * Returns null if valid, or an error message string if invalid.
 * Can be synchronous or asynchronous.
 * @typedef {(value: string) => string | null | Promise<string | null>} ValidatorFn
 */
export type ValidatorFn = (value: string) => string | null | Promise<string | null>;

/**
 * Props interface for Input component.
 * @interface InputProps
 */
export interface InputProps {
  /** Current value of the input (controlled component) */
  value: string;
  /** Callback fired when the input value changes */
  onChange: (value: string) => void;
  /** Type of input field */
  type?: InputType;
  /** Label text displayed above the input */
  label?: string;
  /** External error message to display */
  error?: string;
  /** Placeholder text shown when input is empty */
  placeholder?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Name attribute for form submission */
  name?: string;
  /** ID attribute for label association */
  id?: string;
  /** Custom validation function */
  validate?: ValidatorFn;
  /** Whether to validate on change (default: false, validate on blur) */
  validateOnChange?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Autocomplete attribute value */
  autoComplete?: string;
  /** Aria label for inputs without visible labels */
  'aria-label'?: string;
}

// ============================================================================
// Input Component
// ============================================================================

/**
 * Input component with validation, error states, and accessibility features.
 * 
 * Implements a fully accessible form input with:
 * - Label association via htmlFor/id
 * - Error announcements via aria-live region
 * - Invalid state indication via aria-invalid
 * - Required field indication via aria-required
 * - Disabled state handling with aria-disabled
 *
 * @param {InputProps} props - Component props
 * @param {React.Ref<HTMLInputElement>} ref - Forwarded ref for the input element
 * @returns {React.ReactElement} Rendered Input component
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    value,
    onChange,
    type = 'text',
    label,
    error: externalError,
    placeholder,
    required = false,
    disabled = false,
    name,
    id: providedId,
    validate,
    validateOnChange = false,
    className = '',
    autoComplete,
    'aria-label': ariaLabel,
  },
  ref
): React.ReactElement {
  // Generate unique IDs for accessibility associations
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const errorId = `${inputId}-error`;

  // Internal validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Determine which error to display (external error takes priority)
  const displayError = externalError || validationError;
  const hasError = Boolean(displayError);

  /**
   * Runs validation on the current value.
   * Handles both sync and async validators.
   */
  const runValidation = useCallback(
    async (valueToValidate: string) => {
      if (!validate || disabled) {
        return;
      }

      try {
        const result = await Promise.resolve(validate(valueToValidate));
        // Only set validation error if there's no external error
        if (!externalError) {
          setValidationError(result);
        }
      } catch (err) {
        // Handle validation errors gracefully
        console.error('Validation error:', err);
        setValidationError('Validation failed');
      }
    },
    [validate, disabled, externalError]
  );

  /**
   * Handles input value changes.
   * Calls onChange callback and optionally runs validation.
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      onChange(newValue);

      if (validateOnChange) {
        runValidation(newValue);
      }
    },
    [onChange, validateOnChange, runValidation]
  );

  /**
   * Handles input blur event.
   * Triggers validation if validate prop is provided.
   */
  const handleBlur = useCallback(() => {
    if (!validateOnChange && validate && !disabled) {
      runValidation(value);
    }
  }, [validateOnChange, validate, disabled, runValidation, value]);

  // Clear validation error when external error is set
  useEffect(() => {
    if (externalError) {
      setValidationError(null);
    }
  }, [externalError]);

  // Clear validation error when error prop becomes undefined
  useEffect(() => {
    if (!externalError && !validationError) {
      setValidationError(null);
    }
  }, [externalError, validationError]);

  // Build class names for the input
  const inputClassNames = [
    'input',
    hasError && 'input-error',
    disabled && 'input-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="input-container">
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && (
            <span className="input-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input Element */}
      <input
        ref={ref}
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className={inputClassNames}
        aria-label={ariaLabel}
        aria-invalid={hasError ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        aria-describedby={hasError ? errorId : undefined}
      />

      {/* Error Message */}
      {hasError && (
        <div
          id={errorId}
          className="input-error-message"
          role="alert"
          aria-live="polite"
        >
          {displayError}
        </div>
      )}
    </div>
  );
});

// Set display name for debugging
Input.displayName = 'Input';

// Default export for convenience
export default Input;
