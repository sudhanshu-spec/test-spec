/**
 * @fileoverview Modal component with accessibility and focus management
 * @module components/Modal
 *
 * A reusable Modal dialog component that supports:
 * - Accessible dialog pattern with proper ARIA attributes
 * - Focus trapping within the modal
 * - Keyboard navigation (Escape to close, Tab cycling)
 * - Backdrop click to close
 * - Body scroll locking when open
 * - Portal rendering to document.body
 * - Multiple size variants
 * - Animation/transition support
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Confirm Action"
 *   size="md"
 * >
 *   <p>Are you sure you want to proceed?</p>
 *   <Button onClick={handleConfirm}>Confirm</Button>
 * </Modal>
 * ```
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useId,
  RefObject,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Types
// ============================================================================

/**
 * Size options for the Modal component.
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Props for the Modal component.
 */
export interface ModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback function when modal should close */
  onClose: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Content to render inside the modal body */
  children: ReactNode;
  /** Whether clicking the backdrop should close the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape should close the modal (default: true) */
  closeOnEscape?: boolean;
  /** Size variant for the modal (default: 'md') */
  size?: ModalSize;
  /** Ref to element that should receive focus when modal opens */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Optional description for aria-describedby */
  description?: string;
  /** Optional custom className */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Size class mappings for modal widths.
 */
const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
};

/**
 * Focusable element selectors for focus trap.
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ============================================================================
// Modal Component
// ============================================================================

/**
 * Modal dialog component with accessibility and focus management.
 *
 * @param props - Modal component props
 * @returns Modal component or null if not open
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  size = 'md',
  initialFocusRef,
  description,
  className = '',
}: ModalProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const previousOverflow = useRef<string>('');

  // Generate unique IDs for accessibility
  const titleId = useId();
  const descriptionId = useId();

  /**
   * Get all focusable elements within the modal.
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
  }, []);

  /**
   * Handle keyboard events for accessibility.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Handle Escape key
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onClose();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab: If focus is on first element, move to last
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: If focus is on last element, move to first
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, closeOnEscape, onClose, getFocusableElements]
  );

  /**
   * Handle backdrop click.
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking directly on backdrop
      if (event.target === event.currentTarget && closeOnBackdropClick) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  /**
   * Handle modal content click to stop propagation.
   */
  const handleContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Stop propagation to prevent backdrop click handler from firing
      event.stopPropagation();
    },
    []
  );

  // Effect: Lock body scroll and manage focus when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store current active element and overflow style
      previousActiveElement.current = document.activeElement;
      previousOverflow.current = document.body.style.overflow;

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Focus management: Focus initial ref or first focusable element
      const setInitialFocus = () => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else {
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      };

      // Delay focus to allow modal to render
      requestAnimationFrame(setInitialFocus);

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        // Restore body scroll
        document.body.style.overflow = previousOverflow.current;

        // Return focus to previously active element
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }

        // Remove keyboard event listener
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = previousOverflow.current;
    }
  }, [isOpen, initialFocusRef, getFocusableElements, handleKeyDown]);

  // Don't render if modal is not open
  if (!isOpen) {
    return null;
  }

  // Modal content
  const modalContent = (
    <div
      data-testid="modal-backdrop"
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`modal ${SIZE_CLASSES[size]} ${className}`.trim()}
        onClick={handleContentClick}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2
            id={titleId}
            className="modal-title"
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close-button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '1.5rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            padding: '16px',
          }}
        >
          {description && (
            <p id={descriptionId} className="sr-only">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
}

export default Modal;
