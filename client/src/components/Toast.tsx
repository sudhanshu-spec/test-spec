/**
 * @fileoverview Toast notification component with auto-dismiss and accessibility support
 * @module components/Toast
 *
 * This module provides Toast and ToastContainer components for displaying
 * transient notifications to users. Supports multiple variants (success, error,
 * warning, info), auto-dismiss functionality, and comprehensive accessibility
 * features including ARIA live regions.
 *
 * Features:
 * - Auto-dismiss with configurable duration
 * - Multiple visual variants for different message types
 * - Proper ARIA attributes for screen reader announcements
 * - Keyboard dismissal support
 * - Support for multiple simultaneous toasts via ToastContainer
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Available toast variant types for styling.
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastVariant
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Props interface for the Toast component.
 * @interface ToastProps
 * @property {string} message - The message content to display in the toast
 * @property {ToastVariant} [variant='info'] - The visual variant/style of the toast
 * @property {number} [duration=5000] - Duration in ms before auto-dismiss (0 = no auto-dismiss)
 * @property {() => void} onClose - Callback function when toast is dismissed
 * @property {string} [id] - Optional unique identifier for the toast
 */
export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: () => void;
  id?: string;
}

/**
 * Props interface for a toast item in the ToastContainer.
 * @interface ToastItem
 * @property {string} id - Unique identifier for the toast
 * @property {string} message - The message content to display
 * @property {ToastVariant} [variant] - The visual variant/style of the toast
 * @property {number} [duration] - Duration in ms before auto-dismiss
 */
export interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

/**
 * Props interface for the ToastContainer component.
 * @interface ToastContainerProps
 * @property {ToastItem[]} toasts - Array of toast items to display
 * @property {(id: string) => void} onRemove - Callback to remove a toast by id
 */
export interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the CSS class name for a toast variant.
 * @param {ToastVariant} variant - The toast variant
 * @returns {string} The CSS class name for the variant
 */
function getVariantClassName(variant: ToastVariant): string {
  const variantClasses: Record<ToastVariant, string> = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info',
  };
  return variantClasses[variant] || 'toast-info';
}

/**
 * Gets the aria-live value based on toast variant.
 * Error toasts use 'assertive' for immediate announcement,
 * other variants use 'polite' for non-disruptive announcement.
 * @param {ToastVariant} variant - The toast variant
 * @returns {'assertive' | 'polite'} The aria-live value
 */
function getAriaLive(variant: ToastVariant): 'assertive' | 'polite' {
  return variant === 'error' ? 'assertive' : 'polite';
}

/**
 * Gets the icon component for a toast variant.
 * @param {ToastVariant} variant - The toast variant
 * @returns {string} The icon character or emoji
 */
function getVariantIcon(variant: ToastVariant): string {
  const icons: Record<ToastVariant, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
  return icons[variant] || icons.info;
}

// ============================================================================
// Toast Component
// ============================================================================

/**
 * Toast notification component for displaying transient messages.
 *
 * Supports auto-dismiss functionality, multiple visual variants, and
 * comprehensive accessibility features including ARIA live regions.
 *
 * @component
 * @param {ToastProps} props - Component props
 * @returns {React.ReactElement} The rendered toast component
 *
 * @example
 * // Basic success toast
 * <Toast
 *   message="Order placed successfully!"
 *   variant="success"
 *   onClose={() => console.log('Closed')}
 * />
 *
 * @example
 * // Error toast without auto-dismiss
 * <Toast
 *   message="Payment failed"
 *   variant="error"
 *   duration={0}
 *   onClose={handleClose}
 * />
 */
export function Toast({
  message,
  variant = 'info',
  duration = 5000,
  onClose,
  id,
}: ToastProps): React.ReactElement {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  /**
   * Handles dismissing the toast.
   * Clears any existing timer and calls the onClose callback.
   */
  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  }, [onClose]);

  /**
   * Handles keyboard events for accessibility.
   * Supports Escape key to dismiss the toast.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    },
    [handleDismiss]
  );

  // Set up auto-dismiss timer
  useEffect(() => {
    // Only set timer if duration is greater than 0
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, duration);
    }

    // Cleanup timer on unmount or duration change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, onClose]);

  const variantClass = getVariantClassName(variant);
  const ariaLive = getAriaLive(variant);
  const icon = getVariantIcon(variant);

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live={ariaLive}
      aria-atomic="true"
      data-testid={id}
      className={`toast ${variantClass}`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        backgroundColor: 'white',
      }}
    >
      <span
        className="toast-icon"
        aria-hidden="true"
        style={{ marginRight: '12px', fontSize: '18px' }}
      >
        {icon}
      </span>
      <span className="toast-message" style={{ flex: 1 }}>
        {message}
      </span>
      <button
        type="button"
        aria-label="Close notification"
        onClick={handleDismiss}
        className="toast-close-button"
        style={{
          marginLeft: '12px',
          padding: '4px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ============================================================================
// ToastContainer Component
// ============================================================================

/**
 * Container component for managing multiple Toast notifications.
 *
 * Renders a stack of Toast components and manages their removal.
 * Toasts are displayed in the order they appear in the toasts array.
 *
 * @component
 * @param {ToastContainerProps} props - Component props
 * @returns {React.ReactElement} The rendered toast container
 *
 * @example
 * // Basic usage with state management
 * function App() {
 *   const [toasts, setToasts] = useState<ToastItem[]>([]);
 *
 *   const addToast = (message: string, variant: ToastVariant) => {
 *     setToasts(prev => [...prev, { id: Date.now().toString(), message, variant }]);
 *   };
 *
 *   const removeToast = (id: string) => {
 *     setToasts(prev => prev.filter(t => t.id !== id));
 *   };
 *
 *   return <ToastContainer toasts={toasts} onRemove={removeToast} />;
 * }
 */
export function ToastContainer({
  toasts,
  onRemove,
}: ToastContainerProps): React.ReactElement {
  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '400px',
        width: '100%',
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant || 'info'}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

// Default export for convenience
export default Toast;
