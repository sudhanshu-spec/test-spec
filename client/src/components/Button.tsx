/**
 * @fileoverview Reusable Button component with variants, loading state, and accessibility support
 * @module components/Button
 *
 * This component provides a standardized button implementation following
 * accessibility best practices with support for multiple visual variants,
 * loading states, and proper keyboard navigation.
 */

import React, { forwardRef, ButtonHTMLAttributes } from 'react';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Button visual variant options.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

/**
 * Props interface for the Button component.
 * @extends {Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>}
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Button content (text or elements) */
  children?: React.ReactNode;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** HTML button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Whether button is in loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the CSS class name for a button variant.
 * @param {ButtonVariant} variant - The button variant
 * @returns {string} The CSS class name for the variant
 */
function getVariantClassName(variant: ButtonVariant): string {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    outline: 'btn-outline',
  };
  return variantClasses[variant];
}

/**
 * Combines class names, filtering out falsy values.
 * @param {...(string | undefined | null | false)[]} classes - Class names to combine
 * @returns {string} Combined class string
 */
function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// Loading Spinner Component
// ============================================================================

/**
 * Loading spinner indicator for button loading state.
 */
function LoadingSpinner(): React.ReactElement {
  return (
    <span
      data-testid="loading-spinner"
      className="btn-spinner"
      aria-hidden="true"
    >
      <svg
        className="animate-spin"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>
  );
}

// ============================================================================
// Button Component
// ============================================================================

/**
 * Button component with support for variants, loading states, and accessibility.
 *
 * Features:
 * - Multiple visual variants (primary, secondary, danger, outline)
 * - Loading state with spinner indicator
 * - Disabled state with proper ARIA attributes
 * - Keyboard navigation support
 * - Ref forwarding for focus management
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button onClick={handleClick}>Click Me</Button>
 *
 * // Secondary variant
 * <Button variant="secondary" onClick={handleClick}>Secondary</Button>
 *
 * // Loading state
 * <Button loading onClick={handleSubmit}>Submit</Button>
 *
 * // Submit button in form
 * <Button type="submit">Submit Form</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      onClick,
      disabled = false,
      variant = 'primary',
      type = 'button',
      loading = false,
      className,
      ...restProps
    },
    ref
  ) {
    /**
     * Handles click events, preventing interaction when disabled or loading.
     * @param {React.MouseEvent<HTMLButtonElement>} event - The click event
     */
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
      if (disabled || loading) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    // Determine if button should be non-interactive
    const isDisabled = disabled || loading;

    // Build class names
    const buttonClassName = classNames(
      'btn',
      getVariantClassName(variant),
      loading && 'btn-loading',
      isDisabled && 'btn-disabled',
      className
    );

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassName}
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        aria-disabled={isDisabled ? 'true' : undefined}
        {...restProps}
      >
        {loading && <LoadingSpinner />}
        <span className={loading ? 'btn-text-hidden' : 'btn-text'}>
          {children}
        </span>
      </button>
    );
  }
);

// Set display name for React DevTools
Button.displayName = 'Button';

// Default export for convenience
export default Button;
