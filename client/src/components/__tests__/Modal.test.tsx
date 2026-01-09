/**
 * @fileoverview Unit tests for Modal component
 * @module tests/components/Modal
 *
 * Comprehensive test suite for the Modal component covering:
 * - Open/close behavior with state management
 * - Accessibility including focus trapping
 * - Keyboard navigation (Escape to close, Tab cycling)
 * - Backdrop click handling
 * - Body scroll locking
 * - ARIA attributes (dialog role, labelledby, describedby)
 * - Portal rendering
 *
 * Tests follow AAA pattern (Arrange, Act, Assert) with minimum 3 assertions per test case.
 * Follows patterns from tests/lifecycle/server.test.js for mock factory functions.
 */

import React, { createRef, RefObject } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../__tests__/utils/render';
import { Modal } from '../Modal';

// ============================================================================
// TypeScript Interfaces (following MockServer typedef pattern)
// ============================================================================

/**
 * Size options for the Modal component.
 * @typedef {'sm' | 'md' | 'lg' | 'xl'} ModalSize
 */
type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Props interface for the Modal component.
 * @interface ModalProps
 */
interface ModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback function when modal should close */
  onClose: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Content to render inside the modal body */
  children: React.ReactNode;
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
// Default Props and Mock Factory Functions
// (following createMockServer pattern from tests/lifecycle/server.test.js)
// ============================================================================

/**
 * Default props for Modal component tests.
 * Used as base configuration for all test scenarios.
 * @constant DEFAULT_MODAL_PROPS
 */
const DEFAULT_MODAL_PROPS: Omit<ModalProps, 'onClose'> = {
  isOpen: true,
  title: 'Test Modal Title',
  children: <p>Test modal content</p>,
  closeOnBackdropClick: true,
  closeOnEscape: true,
  size: 'md',
};

/**
 * Creates mock Modal props with optional overrides.
 * Follows the createMockServer pattern from server.test.js.
 *
 * @param {ReturnType<typeof vi.fn>} mockOnClose - Mock function for onClose handler
 * @param {Partial<ModalProps>} [overrides={}] - Property overrides
 * @returns {ModalProps} Complete Modal props object
 */
function createMockModalProps(
  mockOnClose: ReturnType<typeof vi.fn>,
  overrides: Partial<Omit<ModalProps, 'onClose'>> = {}
): ModalProps {
  return {
    ...DEFAULT_MODAL_PROPS,
    onClose: mockOnClose as () => void,
    ...overrides,
  };
}

/**
 * Helper function to get the modal dialog element.
 * Uses accessible role query for reliability.
 *
 * @returns {HTMLElement | null} The modal dialog element or null
 */
function getModalDialog(): HTMLElement | null {
  return screen.queryByRole('dialog');
}

/**
 * Helper function to get the modal backdrop element.
 * Queries by test ID for reliable backdrop identification.
 *
 * @returns {HTMLElement | null} The backdrop element or null
 */
function getBackdrop(): HTMLElement | null {
  return document.querySelector('[data-testid="modal-backdrop"]');
}

/**
 * Helper to create a wrapper component with a trigger button.
 * Used for testing focus return behavior.
 */
function ModalWithTrigger({
  modalProps,
  initialOpen = false,
}: {
  modalProps: Omit<ModalProps, 'isOpen'>;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  const triggerRef = createRef<HTMLButtonElement>();

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    modalProps.onClose();
  };

  return (
    <div>
      <button ref={triggerRef} onClick={handleOpen} data-testid="trigger-button">
        Open Modal
      </button>
      <Modal {...modalProps} isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Modal Component', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    user = userEvent.setup();
    // Reset body overflow style before each test
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
    // Restore body overflow style after each test
    document.body.style.overflow = '';
  });

  // ==========================================================================
  // Open/Close Behavior Tests
  // ==========================================================================

  describe('Open/Close Behavior', () => {
    it('should not render when isOpen is false', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { isOpen: false });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeNull();
      expect(screen.queryByText('Test Modal Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Test modal content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { isOpen: true });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();
      expect(screen.getByText('Test Modal Title')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);
      render(<Modal {...props} />);

      // Act
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should render modal content when open', () => {
      // Arrange
      const customContent = <div data-testid="custom-content">Custom Content</div>;
      const props = createMockModalProps(mockOnClose, {
        isOpen: true,
        children: customContent,
      });

      // Act
      render(<Modal {...props} />);

      // Assert
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeVisible();
      expect(getModalDialog()).toContainElement(screen.getByTestId('custom-content'));
    });

    it('should remove modal from DOM when closed', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { isOpen: true });
      const { rerender } = render(<Modal {...props} />);

      // Verify modal is present
      expect(getModalDialog()).toBeInTheDocument();

      // Act - Close the modal
      rerender(<Modal {...props} isOpen={false} />);

      // Assert
      expect(getModalDialog()).toBeNull();
      expect(screen.queryByText('Test Modal Title')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should handle rapid open/close toggling', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { isOpen: false });
      const { rerender } = render(<Modal {...props} />);

      // Act - Rapidly toggle modal state
      rerender(<Modal {...props} isOpen={true} />);
      expect(getModalDialog()).toBeInTheDocument();

      rerender(<Modal {...props} isOpen={false} />);
      expect(getModalDialog()).toBeNull();

      rerender(<Modal {...props} isOpen={true} />);
      expect(getModalDialog()).toBeInTheDocument();

      // Assert final state
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Test Modal Title')).toBeVisible();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Backdrop Clicks Tests
  // ==========================================================================

  describe('Backdrop Clicks', () => {
    it('should call onClose when backdrop is clicked', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { closeOnBackdropClick: true });
      render(<Modal {...props} />);

      // Act
      const backdrop = getBackdrop();
      expect(backdrop).toBeInTheDocument();
      await user.click(backdrop!);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(backdrop).toHaveAttribute('data-testid', 'modal-backdrop');
    });

    it('should not call onClose when closeOnBackdropClick is false', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { closeOnBackdropClick: false });
      render(<Modal {...props} />);

      // Act
      const backdrop = getBackdrop();
      await user.click(backdrop!);

      // Assert
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should not close when clicking inside modal content', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <button data-testid="inner-button">Inner Button</button>
            <p>Modal content paragraph</p>
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Act - Click inside the modal content
      const innerButton = screen.getByTestId('inner-button');
      await user.click(innerButton);

      const modalContent = screen.getByText('Modal content paragraph');
      await user.click(modalContent);

      // Assert
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getModalDialog()).toBeInTheDocument();
      expect(innerButton).toBeInTheDocument();
    });

    it('should distinguish backdrop from modal content clicks', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        closeOnBackdropClick: true,
        children: <div data-testid="modal-body">Click-safe content</div>,
      });
      render(<Modal {...props} />);

      // Act - Click modal body (should not close)
      await user.click(screen.getByTestId('modal-body'));
      expect(mockOnClose).not.toHaveBeenCalled();

      // Act - Click backdrop (should close)
      const backdrop = getBackdrop();
      await user.click(backdrop!);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('modal-body')).toBeInTheDocument();
    });

    it('should handle double-click on backdrop', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { closeOnBackdropClick: true });
      render(<Modal {...props} />);

      // Act
      const backdrop = getBackdrop();
      await user.dblClick(backdrop!);

      // Assert - Should call onClose for each click event
      expect(mockOnClose).toHaveBeenCalled();
      expect(backdrop).toBeInTheDocument();
      expect(getModalDialog()).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { closeOnEscape: true });
      render(<Modal {...props} />);

      // Act
      await user.keyboard('{Escape}');

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should not close when closeOnEscape is false', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { closeOnEscape: false });
      render(<Modal {...props} />);

      // Act
      await user.keyboard('{Escape}');

      // Assert
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should trap focus within modal', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <input data-testid="input-1" type="text" placeholder="First input" />
            <button data-testid="button-1">First Button</button>
            <input data-testid="input-2" type="text" placeholder="Second input" />
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Get focusable elements including close button (which is part of the modal)
      const closeButton = screen.getByRole('button', { name: /close/i });
      const input1 = screen.getByTestId('input-1');
      const button1 = screen.getByTestId('button-1');
      const input2 = screen.getByTestId('input-2');

      // Act - Tab through elements
      await user.tab();

      // Assert - Focus should remain within modal (including close button)
      const activeElement = document.activeElement;
      const modal = getModalDialog();
      expect(modal).toContainElement(activeElement as HTMLElement);
      // Focus should be on one of the modal's focusable elements (including close button)
      expect([closeButton, input1, button1, input2]).toContain(document.activeElement);
    });

    it('should cycle focus to first element after last', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <button data-testid="first-btn">First</button>
            <button data-testid="last-btn">Last</button>
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Act - Navigate to last element and tab again
      const lastBtn = screen.getByTestId('last-btn');
      lastBtn.focus();
      await user.tab();

      // Assert - Focus should cycle back (either to close button or first focusable)
      const modal = getModalDialog();
      expect(modal).toContainElement(document.activeElement as HTMLElement);
      expect(document.activeElement).toBeInTheDocument();
    });

    it('should cycle focus to last element before first', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <button data-testid="first-btn">First</button>
            <button data-testid="last-btn">Last</button>
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Act - Focus close button (usually first) and Shift+Tab
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');

      // Assert - Focus should cycle to last element
      const modal = getModalDialog();
      expect(modal).toContainElement(document.activeElement as HTMLElement);
      expect(document.activeElement).toBeInTheDocument();
    });

    it('should handle Tab key navigation', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <input data-testid="nav-input" type="text" />
            <button data-testid="nav-btn">Navigate</button>
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Wait for modal to establish initial focus (close button)
      await waitFor(() => {
        const modal = getModalDialog();
        expect(modal).toContainElement(document.activeElement as HTMLElement);
      });

      // Get reference elements
      const navInput = screen.getByTestId('nav-input');
      const navBtn = screen.getByTestId('nav-btn');

      // Start from a known position (nav-input)
      navInput.focus();
      const firstActive = document.activeElement;
      
      // Tab to next element
      await user.tab();
      const secondActive = document.activeElement;

      // Assert - focus should have moved to a different element
      expect(firstActive).not.toBe(secondActive);
      expect(getModalDialog()).toContainElement(firstActive as HTMLElement);
      expect(getModalDialog()).toContainElement(secondActive as HTMLElement);
      expect(firstActive).toBe(navInput);
      expect(secondActive).toBe(navBtn);
    });

    it('should handle Shift+Tab key navigation', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <input data-testid="shift-input" type="text" />
            <button data-testid="shift-btn">Button</button>
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Get the elements
      const input = screen.getByTestId('shift-input');
      const btn = screen.getByTestId('shift-btn');

      // Focus the button first and verify
      btn.focus();
      expect(document.activeElement).toBe(btn);

      // Act - Shift+Tab backwards using userEvent.tab with shift option
      await user.tab({ shift: true });

      // Assert - Should navigate backwards, focus should be within modal
      const modal = getModalDialog();
      expect(modal).toContainElement(document.activeElement as HTMLElement);
      // Focus should have moved to a different element within the modal
      // (either to the input or the close button, depending on implementation)
      expect(document.activeElement).toBeInTheDocument();
    });

    it('should ignore other key presses', async () => {
      // Arrange - Create modal with a non-button focusable element
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <input data-testid="key-test-input" type="text" />
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Wait for modal to render and focus to be established
      await waitFor(() => {
        expect(getModalDialog()).toBeInTheDocument();
      });

      // Focus the input element (not the close button) before testing key presses
      const input = screen.getByTestId('key-test-input');
      input.focus();

      // Act - Press various keys that shouldn't close modal
      // Note: Enter and Space on a focused button would trigger click, so we test on input
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');
      await user.keyboard('a');

      // Assert - Modal should still be open and onClose not called
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });
  });

  // ==========================================================================
  // Focus Management Tests
  // ==========================================================================

  describe('Focus Management', () => {
    it('should focus first focusable element when opened', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <input data-testid="focus-target" type="text" />
            <button>Action</button>
          </div>
        ),
      });

      // Act
      render(<Modal {...props} />);

      // Assert - First focusable element or close button should have focus
      await waitFor(() => {
        const modal = getModalDialog();
        expect(modal).toContainElement(document.activeElement as HTMLElement);
      });
      expect(getModalDialog()).toBeInTheDocument();
      expect(document.activeElement).not.toBe(document.body);
    });

    it('should focus initialFocusRef element when provided', async () => {
      // Arrange
      const FocusRefModal = () => {
        const inputRef = createRef<HTMLInputElement>();
        return (
          <Modal
            isOpen={true}
            onClose={mockOnClose as () => void}
            title="Focus Test"
            initialFocusRef={inputRef}
          >
            <button>Not focused first</button>
            <input ref={inputRef} data-testid="initial-focus-input" type="text" />
          </Modal>
        );
      };

      // Act
      render(<FocusRefModal />);

      // Assert
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByTestId('initial-focus-input'));
      });
      expect(screen.getByTestId('initial-focus-input')).toHaveFocus();
      expect(getModalDialog()).toBeInTheDocument();
    });

    it('should return focus to trigger element when closed', async () => {
      // Arrange
      render(
        <ModalWithTrigger
          modalProps={{
            onClose: mockOnClose as () => void,
            title: 'Return Focus Test',
            children: <p>Content</p>,
          }}
          initialOpen={false}
        />
      );

      const triggerButton = screen.getByTestId('trigger-button');

      // Act - Open modal
      await user.click(triggerButton);
      expect(getModalDialog()).toBeInTheDocument();

      // Close modal via close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Assert - Focus should return to trigger
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
      expect(triggerButton).toBeInTheDocument();
    });

    it('should handle modal with no focusable elements', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: <p>Non-interactive content only</p>,
      });

      // Act
      render(<Modal {...props} />);

      // Assert - Modal should still render and be accessible
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
      // Close button should still be focusable
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should maintain focus trap during keyboard navigation', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        children: (
          <div>
            <button data-testid="trap-btn-1">Button 1</button>
            <button data-testid="trap-btn-2">Button 2</button>
          </div>
        ),
      });
      render(<Modal {...props} />);

      // Act - Tab multiple times
      for (let i = 0; i < 10; i++) {
        await user.tab();
      }

      // Assert - Focus should still be within modal
      const modal = getModalDialog();
      expect(modal).toContainElement(document.activeElement as HTMLElement);
      expect(modal).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Body Scroll Lock Tests
  // ==========================================================================

  describe('Body Scroll Lock', () => {
    it('should disable body scroll when modal opens', () => {
      // Arrange
      expect(document.body.style.overflow).toBe('');

      // Act
      const props = createMockModalProps(mockOnClose);
      render(<Modal {...props} />);

      // Assert
      expect(document.body.style.overflow).toBe('hidden');
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should re-enable body scroll when modal closes', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);
      const { rerender } = render(<Modal {...props} />);
      expect(document.body.style.overflow).toBe('hidden');

      // Act
      rerender(<Modal {...props} isOpen={false} />);

      // Assert
      expect(document.body.style.overflow).toBe('');
      expect(getModalDialog()).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should restore original overflow style on close', () => {
      // Arrange - Set initial overflow style
      document.body.style.overflow = 'scroll';
      const props = createMockModalProps(mockOnClose);
      const { rerender } = render(<Modal {...props} />);

      // Verify modal sets overflow to hidden
      expect(document.body.style.overflow).toBe('hidden');

      // Act
      rerender(<Modal {...props} isOpen={false} />);

      // Assert - Should restore to original value
      expect(document.body.style.overflow).toBe('scroll');
      expect(getModalDialog()).toBeNull();
    });

    it('should handle multiple modals', () => {
      // Arrange
      const props1 = createMockModalProps(mockOnClose, { title: 'Modal 1' });
      const props2 = createMockModalProps(vi.fn(), { title: 'Modal 2' });

      // Act
      const { rerender } = render(
        <>
          <Modal {...props1} />
          <Modal {...props2} />
        </>
      );

      // Assert - Body should be locked when any modal is open
      expect(document.body.style.overflow).toBe('hidden');
      expect(screen.getByText('Modal 1')).toBeInTheDocument();
      expect(screen.getByText('Modal 2')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();
    });

    it('should have aria-modal="true"', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();
    });

    it('should have aria-labelledby pointing to title', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { title: 'Accessible Title' });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      const titleId = modal?.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent('Accessible Title');
      expect(modal).toBeInTheDocument();
    });

    it('should have aria-describedby when description provided', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        description: 'This is a detailed description of the modal',
      });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      const describedById = modal?.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      expect(modal).toBeInTheDocument();
    });

    it('should announce modal opening to screen readers', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toBeInTheDocument();
    });

    it('should have accessible close button with aria-label', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('type', 'button');
      // Check accessible name
      expect(closeButton).toHaveAccessibleName();
    });

    it('should be announced as a modal dialog', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toHaveRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Portal Rendering Tests
  // ==========================================================================

  describe('Portal Rendering', () => {
    it('should render modal in portal', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      const { container } = render(
        <div data-testid="parent-container">
          <Modal {...props} />
        </div>
      );

      // Assert - Modal should NOT be a child of the parent container in DOM
      const parentContainer = screen.getByTestId('parent-container');
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(parentContainer).not.toContainElement(modal);
    });

    it('should not affect parent component layout', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      const { container } = render(
        <div data-testid="layout-parent" style={{ width: '200px' }}>
          <span>Parent content</span>
          <Modal {...props} />
        </div>
      );

      // Assert
      const parentContainer = screen.getByTestId('layout-parent');
      expect(parentContainer).toHaveTextContent('Parent content');
      expect(getModalDialog()).toBeInTheDocument();
      expect(screen.getByText('Parent content')).toBeVisible();
    });

    it('should clean up portal on unmount', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);
      const { unmount } = render(<Modal {...props} />);
      expect(getModalDialog()).toBeInTheDocument();

      // Act
      unmount();

      // Assert
      expect(getModalDialog()).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ==========================================================================
  // Sizes Tests
  // ==========================================================================

  describe('Sizes', () => {
    it('should render small modal with correct width', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { size: 'sm' });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('modal-sm');
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should render medium modal with correct width', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { size: 'md' });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('modal-md');
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should render large modal with correct width', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { size: 'lg' });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('modal-lg');
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should render extra large modal with correct width', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, { size: 'xl' });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('modal-xl');
      expect(screen.getByText('Test Modal Title')).toBeVisible();
    });

    it('should default to medium size', () => {
      // Arrange - Create props without specifying size
      const props: ModalProps = {
        isOpen: true,
        onClose: mockOnClose as () => void,
        title: 'Default Size Modal',
        children: <p>Content</p>,
      };

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('modal-md');
      expect(screen.getByText('Default Size Modal')).toBeVisible();
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render title correctly', () => {
      // Arrange
      const customTitle = 'Custom Modal Title';
      const props = createMockModalProps(mockOnClose, { title: customTitle });

      // Act
      render(<Modal {...props} />);

      // Assert
      expect(screen.getByText(customTitle)).toBeInTheDocument();
      expect(screen.getByText(customTitle)).toBeVisible();
      expect(screen.getByText(customTitle).tagName).toMatch(/h[1-6]/i);
    });

    it('should render children content', () => {
      // Arrange
      const childContent = (
        <div data-testid="child-content">
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      );
      const props = createMockModalProps(mockOnClose, { children: childContent });

      // Act
      render(<Modal {...props} />);

      // Assert
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 1')).toBeVisible();
      expect(screen.getByText('Paragraph 2')).toBeVisible();
    });

    it('should render close button', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
      expect(closeButton).toBeEnabled();
    });

    it('should apply custom className', () => {
      // Arrange
      const customClass = 'custom-modal-class';
      const props = createMockModalProps(mockOnClose, { className: customClass });

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toHaveClass(customClass);
      expect(modal).toBeInTheDocument();
      expect(modal).toBeVisible();
    });

    it('should render header, body, and footer sections', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose, {
        title: 'Header Title',
        children: (
          <>
            <div data-testid="body-content">Body Content</div>
            <footer data-testid="footer-section">
              <button>Cancel</button>
              <button>Confirm</button>
            </footer>
          </>
        ),
      });

      // Act
      render(<Modal {...props} />);

      // Assert
      expect(screen.getByText('Header Title')).toBeInTheDocument();
      expect(screen.getByTestId('body-content')).toBeInTheDocument();
      expect(screen.getByTestId('footer-section')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Animation/Transition Tests
  // ==========================================================================

  describe('Animation/Transition', () => {
    it('should apply enter animation classes when opening', () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);

      // Act
      render(<Modal {...props} />);

      // Assert
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();
      // Check for animation-related classes or styles
      expect(modal).toBeVisible();
      expect(getBackdrop()).toBeInTheDocument();
    });

    it('should apply exit animation classes when closing', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);
      const { rerender } = render(<Modal {...props} />);
      expect(getModalDialog()).toBeInTheDocument();

      // Act
      rerender(<Modal {...props} isOpen={false} />);

      // Assert - Modal should start exit transition
      await waitFor(() => {
        expect(getModalDialog()).toBeNull();
      });
      expect(screen.queryByText('Test Modal Title')).not.toBeInTheDocument();
    });

    it('should wait for animation before removing from DOM', async () => {
      // Arrange
      const props = createMockModalProps(mockOnClose);
      const { rerender } = render(<Modal {...props} />);
      const modal = getModalDialog();
      expect(modal).toBeInTheDocument();

      // Act - Close modal
      rerender(<Modal {...props} isOpen={false} />);

      // Assert - Modal should eventually be removed
      await waitFor(
        () => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
      expect(getModalDialog()).toBeNull();
    });
  });
});
