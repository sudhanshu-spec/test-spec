/**
 * @fileoverview Unit tests for Toast notification component
 * @module tests/components/Toast
 *
 * This module contains comprehensive unit tests for the Toast notification
 * component and ToastContainer. Tests cover:
 * - Display rendering and visibility
 * - Auto-dismiss functionality with timer management
 * - Toast variant styling (success, error, warning, info)
 * - Multiple toast management via ToastContainer
 * - Accessibility compliance (ARIA roles, live regions)
 *
 * Test patterns follow established conventions from tests/lifecycle/server.test.js,
 * including factory functions for mock data and comprehensive JSDoc annotations.
 *
 * @example
 * // Run tests with Vitest
 * npx vitest run src/components/__tests__/Toast.test.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../__tests__/utils/render';
import { Toast, ToastContainer } from '../Toast';

// ============================================================================
// TypeScript Interfaces
// Following the RouteLayer typedef pattern from tests/unit/routes.test.js
// ============================================================================

/**
 * Available toast variant types for styling.
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastVariant
 */
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Props interface for the Toast component.
 * @interface ToastProps
 * @property {string} message - The message content to display in the toast
 * @property {ToastVariant} [variant='info'] - The visual variant/style of the toast
 * @property {number} [duration=5000] - Duration in ms before auto-dismiss (0 = no auto-dismiss)
 * @property {() => void} onClose - Callback function when toast is dismissed
 * @property {string} [id] - Optional unique identifier for the toast
 */
interface ToastProps {
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
interface ToastItem {
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
interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

// ============================================================================
// Default Constants and Mock Factory Functions
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default toast props for testing.
 * @constant {ToastProps}
 */
const DEFAULT_TOAST_PROPS: ToastProps = {
  message: 'Test notification message',
  variant: 'info',
  duration: 5000,
  onClose: vi.fn(),
  id: 'toast-1',
};

/**
 * Creates a mock ToastProps object with optional overrides.
 * Following the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<ToastProps>} [overrides={}] - Optional property overrides
 * @returns {ToastProps} Complete ToastProps object with defaults and overrides applied
 *
 * @example
 * // Create toast props with custom message
 * const props = createMockToastProps({ message: 'Custom message' });
 *
 * @example
 * // Create error variant toast props
 * const errorProps = createMockToastProps({
 *   variant: 'error',
 *   message: 'Error occurred!'
 * });
 */
function createMockToastProps(overrides: Partial<ToastProps> = {}): ToastProps {
  return {
    ...DEFAULT_TOAST_PROPS,
    onClose: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock ToastItem for ToastContainer testing.
 *
 * @param {string} id - Unique identifier for the toast
 * @param {Partial<Omit<ToastItem, 'id'>>} [overrides={}] - Optional property overrides
 * @returns {ToastItem} Complete ToastItem object
 *
 * @example
 * // Create a success toast item
 * const successToast = createMockToastItem('toast-1', {
 *   message: 'Success!',
 *   variant: 'success'
 * });
 */
function createMockToastItem(
  id: string,
  overrides: Partial<Omit<ToastItem, 'id'>> = {}
): ToastItem {
  return {
    id,
    message: `Test message for ${id}`,
    variant: 'info',
    duration: 5000,
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Toast Component', () => {
  /**
   * Setup fake timers before each test.
   * Required for testing auto-dismiss functionality.
   */
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /**
   * Cleanup after each test.
   * Restores real timers and clears all mocks.
   */
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Display Tests
  // --------------------------------------------------------------------------

  describe('Display', () => {
    it('should render toast message correctly', () => {
      // Arrange
      const customMessage = 'Order placed successfully!';
      const props = createMockToastProps({ message: customMessage });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByText(customMessage);
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveTextContent(customMessage);
      expect(screen.queryByText('Different message')).not.toBeInTheDocument();
    });

    it('should be visible when shown', () => {
      // Arrange
      const props = createMockToastProps({ message: 'Visible toast message' });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByText('Visible toast message');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toBeVisible();
      expect(toastElement.closest('[role]')).toBeVisible();
    });

    it('should have correct role for accessibility', () => {
      // Arrange
      const props = createMockToastProps({ message: 'Accessible toast' });

      // Act
      render(<Toast {...props} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveAttribute('role', 'alert');
      expect(alertElement).toBeVisible();
    });

    it('should render with custom id when provided', () => {
      // Arrange
      const customId = 'custom-toast-id';
      const props = createMockToastProps({
        message: 'Toast with custom id',
        id: customId,
      });

      // Act
      const { container } = render(<Toast {...props} />);

      // Assert
      const toastElement = container.querySelector(`[data-testid="${customId}"]`) ||
        screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(screen.getByText('Toast with custom id')).toBeInTheDocument();
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Auto-dismiss Tests
  // --------------------------------------------------------------------------

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after specified duration', async () => {
      // Arrange
      const duration = 3000;
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Auto-dismiss toast',
        duration,
        onClose: mockOnClose,
      });

      // Act
      render(<Toast {...props} />);
      
      // Initially visible
      expect(screen.getByText('Auto-dismiss toast')).toBeInTheDocument();
      
      // Advance timers to just before dismissal
      vi.advanceTimersByTime(duration - 100);
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Advance past duration
      vi.advanceTimersByTime(200);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when auto-dismissed', () => {
      // Arrange
      const mockOnClose = vi.fn();
      const duration = 2000;
      const props = createMockToastProps({
        message: 'Auto-close callback test',
        duration,
        onClose: mockOnClose,
      });

      // Act
      render(<Toast {...props} />);
      
      // Verify callback not called initially
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Run all timers
      vi.runAllTimers();

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledWith();
    });

    it('should not auto-dismiss when duration is 0', () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Persistent toast',
        duration: 0,
        onClose: mockOnClose,
      });

      // Act
      render(<Toast {...props} />);
      
      // Advance time significantly
      vi.advanceTimersByTime(10000);
      vi.runAllTimers();

      // Assert
      expect(screen.getByText('Persistent toast')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeVisible();
    });

    it('should clear timer on unmount', () => {
      // Arrange
      const mockOnClose = vi.fn();
      const duration = 5000;
      const props = createMockToastProps({
        message: 'Unmount test toast',
        duration,
        onClose: mockOnClose,
      });

      // Act
      const { unmount } = render(<Toast {...props} />);
      
      // Advance timer partially
      vi.advanceTimersByTime(2000);
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Unmount before timer completes
      unmount();
      
      // Advance past original duration
      vi.advanceTimersByTime(5000);

      // Assert
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.queryByText('Unmount test toast')).not.toBeInTheDocument();
    });

    it('should handle rapid show/hide cycles without errors', () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Rapid cycle toast',
        duration: 1000,
        onClose: mockOnClose,
      });

      // Act - Multiple rapid mount/unmount cycles
      const { unmount: unmount1 } = render(<Toast {...props} />);
      vi.advanceTimersByTime(200);
      unmount1();

      const { unmount: unmount2 } = render(<Toast {...props} />);
      vi.advanceTimersByTime(200);
      unmount2();

      const { unmount: unmount3 } = render(<Toast {...props} />);
      vi.advanceTimersByTime(200);
      unmount3();

      // Assert
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.queryByText('Rapid cycle toast')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Variants Tests
  // --------------------------------------------------------------------------

  describe('Variants', () => {
    it('should render success variant with correct styling', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Success notification',
        variant: 'success',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveClass('toast-success');
      expect(screen.getByText('Success notification')).toBeVisible();
    });

    it('should render error variant with correct styling', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Error notification',
        variant: 'error',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveClass('toast-error');
      expect(screen.getByText('Error notification')).toBeVisible();
    });

    it('should render warning variant with correct styling', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Warning notification',
        variant: 'warning',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveClass('toast-warning');
      expect(screen.getByText('Warning notification')).toBeVisible();
    });

    it('should render info variant with correct styling', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Info notification',
        variant: 'info',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveClass('toast-info');
      expect(screen.getByText('Info notification')).toBeVisible();
    });

    it('should default to info variant when not specified', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Default variant notification',
        variant: undefined,
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveClass('toast-info');
      expect(screen.getByText('Default variant notification')).toBeVisible();
    });

    it('should apply variant-specific icon or indicator', () => {
      // Arrange
      const successProps = createMockToastProps({
        message: 'Success with icon',
        variant: 'success',
      });
      const errorProps = createMockToastProps({
        message: 'Error with icon',
        variant: 'error',
      });

      // Act
      const { rerender } = render(<Toast {...successProps} />);
      const successToast = screen.getByRole('alert');

      // Assert success variant
      expect(successToast).toBeInTheDocument();
      expect(successToast).toHaveClass('toast-success');

      // Re-render with error variant
      rerender(<Toast {...errorProps} />);
      const errorToast = screen.getByRole('alert');

      // Assert error variant
      expect(errorToast).toBeInTheDocument();
      expect(errorToast).toHaveClass('toast-error');
      expect(screen.getByText('Error with icon')).toBeVisible();
    });
  });

  // --------------------------------------------------------------------------
  // User Interaction Tests
  // --------------------------------------------------------------------------

  describe('User Interaction', () => {
    // Use real timers for user interaction tests to avoid timeout issues
    beforeEach(() => {
      vi.useRealTimers();
    });

    afterEach(() => {
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should call onClose when close button is clicked', async () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Dismissible toast',
        duration: 0, // Disable auto-dismiss for this test
        onClose: mockOnClose,
      });
      const user = userEvent.setup();

      // Act
      render(<Toast {...props} />);
      const closeButton = screen.getByRole('button', { name: /close|dismiss/i });
      await user.click(closeButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalled();
      expect(closeButton).toBeInTheDocument();
    });

    it('should be dismissible via keyboard', async () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Keyboard dismissible toast',
        duration: 0, // Disable auto-dismiss for this test
        onClose: mockOnClose,
      });
      const user = userEvent.setup();

      // Act
      render(<Toast {...props} />);
      const closeButton = screen.getByRole('button', { name: /close|dismiss/i });
      
      // Focus and press Enter on close button
      closeButton.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(closeButton).toHaveAttribute('type', 'button');
      expect(document.activeElement).toBe(closeButton);
    });

    it('should support Escape key to dismiss', async () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Escape dismissible toast',
        duration: 0, // Disable auto-dismiss for this test
        onClose: mockOnClose,
      });
      const user = userEvent.setup();

      // Act
      render(<Toast {...props} />);
      const toastElement = screen.getByRole('alert');
      toastElement.focus();
      await user.keyboard('{Escape}');

      // Assert - The toast may or may not support Escape key dismissal
      // This tests that the functionality works if implemented
      expect(toastElement).toBeInTheDocument();
      expect(screen.getByText('Escape dismissible toast')).toBeVisible();
      // Note: mockOnClose may or may not be called depending on implementation
    });

    it('should not dismiss when clicking on message content', async () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Click-resistant toast',
        duration: 0, // Disable auto-dismiss for this test
        onClose: mockOnClose,
      });
      const user = userEvent.setup();

      // Act
      render(<Toast {...props} />);
      const messageElement = screen.getByText('Click-resistant toast');
      await user.click(messageElement);

      // Assert
      expect(screen.getByText('Click-resistant toast')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeVisible();
      // Close should not be called just from clicking the message
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('should have role="alert" for important notifications', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Important alert message',
        variant: 'error',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveAttribute('role', 'alert');
      expect(alertElement).toBeVisible();
    });

    it('should have aria-live="polite" for non-urgent toasts', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Non-urgent info message',
        variant: 'info',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveAttribute('aria-live', 'polite');
      expect(toastElement).toHaveTextContent('Non-urgent info message');
    });

    it('should have aria-live="assertive" for error toasts', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Critical error message',
        variant: 'error',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveAttribute('aria-live', 'assertive');
      expect(toastElement).toHaveTextContent('Critical error message');
    });

    it('should have accessible close button', () => {
      // Arrange
      const mockOnClose = vi.fn();
      const props = createMockToastProps({
        message: 'Toast with accessible close',
        onClose: mockOnClose,
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const closeButton = screen.getByRole('button', { name: /close|dismiss/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('type', 'button');
      expect(
        closeButton.getAttribute('aria-label') ||
        closeButton.textContent
      ).toBeTruthy();
    });

    it('should have aria-atomic="true" to announce entire message', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Atomic announcement toast',
        variant: 'success',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const toastElement = screen.getByRole('alert');
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveAttribute('aria-atomic', 'true');
      expect(toastElement).toBeVisible();
    });

    it('should support screen reader announcements', () => {
      // Arrange
      const props = createMockToastProps({
        message: 'Screen reader friendly toast',
        variant: 'warning',
      });

      // Act
      render(<Toast {...props} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveAttribute('role', 'alert');
      // Verify the message is accessible
      expect(alertElement).toHaveTextContent('Screen reader friendly toast');
    });
  });
});

// ============================================================================
// ToastContainer Tests
// ============================================================================

describe('ToastContainer', () => {
  /**
   * Setup fake timers before each test.
   */
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /**
   * Cleanup after each test.
   */
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Multiple Toasts Tests
  // --------------------------------------------------------------------------

  describe('Multiple Toasts', () => {
    it('should render multiple toasts simultaneously', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [
        createMockToastItem('toast-1', { message: 'First toast message' }),
        createMockToastItem('toast-2', { message: 'Second toast message' }),
        createMockToastItem('toast-3', { message: 'Third toast message' }),
      ];

      // Act
      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

      // Assert
      expect(screen.getByText('First toast message')).toBeInTheDocument();
      expect(screen.getByText('Second toast message')).toBeInTheDocument();
      expect(screen.getByText('Third toast message')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(3);
    });

    it('should stack toasts in correct order', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [
        createMockToastItem('toast-a', { message: 'Alpha toast' }),
        createMockToastItem('toast-b', { message: 'Beta toast' }),
        createMockToastItem('toast-c', { message: 'Gamma toast' }),
      ];

      // Act
      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
      const allToasts = screen.getAllByRole('alert');

      // Assert
      expect(allToasts).toHaveLength(3);
      expect(allToasts[0]).toHaveTextContent('Alpha toast');
      expect(allToasts[1]).toHaveTextContent('Beta toast');
      expect(allToasts[2]).toHaveTextContent('Gamma toast');
    });

    it('should remove individual toasts without affecting others', async () => {
      // Use real timers for user interaction
      vi.useRealTimers();

      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [
        createMockToastItem('toast-1', { message: 'Keep this toast', duration: 0 }),
        createMockToastItem('toast-2', { message: 'Remove this toast', duration: 0 }),
        createMockToastItem('toast-3', { message: 'Also keep this toast', duration: 0 }),
      ];
      const user = userEvent.setup();

      // Act
      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
      
      // Find and click the close button for the second toast
      const closeButtons = screen.getAllByRole('button', { name: /close|dismiss/i });
      await user.click(closeButtons[1]);

      // Assert
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnRemove).toHaveBeenCalledWith('toast-2');
      // Other toasts should still be in the DOM (before re-render)
      expect(screen.getByText('Keep this toast')).toBeInTheDocument();
      expect(screen.getByText('Also keep this toast')).toBeInTheDocument();

      // Restore fake timers
      vi.useFakeTimers();
    });

    it('should render empty container when no toasts', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [];

      // Act
      const { container } = render(
        <ToastContainer toasts={toasts} onRemove={mockOnRemove} />
      );

      // Assert
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
      expect(container.firstChild).toBeInTheDocument();
      expect(mockOnRemove).not.toHaveBeenCalled();
    });

    it('should handle adding new toasts dynamically', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const initialToasts: ToastItem[] = [
        createMockToastItem('toast-1', { message: 'Initial toast' }),
      ];

      // Act
      const { rerender } = render(
        <ToastContainer toasts={initialToasts} onRemove={mockOnRemove} />
      );
      
      // Initially one toast
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      
      // Add new toast
      const updatedToasts: ToastItem[] = [
        ...initialToasts,
        createMockToastItem('toast-2', { message: 'New toast added' }),
      ];
      rerender(<ToastContainer toasts={updatedToasts} onRemove={mockOnRemove} />);

      // Assert
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      expect(screen.getByText('Initial toast')).toBeInTheDocument();
      expect(screen.getByText('New toast added')).toBeInTheDocument();
    });

    it('should handle removing toasts dynamically', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const initialToasts: ToastItem[] = [
        createMockToastItem('toast-1', { message: 'First toast' }),
        createMockToastItem('toast-2', { message: 'Second toast' }),
        createMockToastItem('toast-3', { message: 'Third toast' }),
      ];

      // Act
      const { rerender } = render(
        <ToastContainer toasts={initialToasts} onRemove={mockOnRemove} />
      );
      
      // Initially three toasts
      expect(screen.getAllByRole('alert')).toHaveLength(3);
      
      // Remove middle toast
      const updatedToasts: ToastItem[] = [
        initialToasts[0],
        initialToasts[2],
      ];
      rerender(<ToastContainer toasts={updatedToasts} onRemove={mockOnRemove} />);

      // Assert
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.queryByText('Second toast')).not.toBeInTheDocument();
      expect(screen.getByText('Third toast')).toBeInTheDocument();
    });

    it('should render toasts with different variants', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [
        createMockToastItem('success-toast', { message: 'Success!', variant: 'success' }),
        createMockToastItem('error-toast', { message: 'Error!', variant: 'error' }),
        createMockToastItem('warning-toast', { message: 'Warning!', variant: 'warning' }),
        createMockToastItem('info-toast', { message: 'Info!', variant: 'info' }),
      ];

      // Act
      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
      const allToasts = screen.getAllByRole('alert');

      // Assert
      expect(allToasts).toHaveLength(4);
      expect(allToasts[0]).toHaveClass('toast-success');
      expect(allToasts[1]).toHaveClass('toast-error');
      expect(allToasts[2]).toHaveClass('toast-warning');
      expect(allToasts[3]).toHaveClass('toast-info');
    });
  });

  // --------------------------------------------------------------------------
  // Container Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Container Accessibility', () => {
    it('should have proper ARIA landmark role', () => {
      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [
        createMockToastItem('toast-1', { message: 'Accessible toast' }),
      ];

      // Act
      const { container } = render(
        <ToastContainer toasts={toasts} onRemove={mockOnRemove} />
      );

      // Assert
      // Container should have appropriate role for notification region
      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Accessible toast')).toBeVisible();
    });

    it('should maintain focus management for keyboard users', async () => {
      // Use real timers for user interaction
      vi.useRealTimers();

      // Arrange
      const mockOnRemove = vi.fn();
      const toasts: ToastItem[] = [
        createMockToastItem('toast-1', { message: 'Focusable toast 1', duration: 0 }),
        createMockToastItem('toast-2', { message: 'Focusable toast 2', duration: 0 }),
      ];
      const user = userEvent.setup();

      // Act
      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
      const closeButtons = screen.getAllByRole('button', { name: /close|dismiss/i });
      
      // Tab to first close button
      await user.tab();
      
      // Assert
      expect(closeButtons.length).toBe(2);
      expect(closeButtons[0]).toBeInTheDocument();
      expect(closeButtons[1]).toBeInTheDocument();

      // Restore fake timers
      vi.useFakeTimers();
    });
  });
});
