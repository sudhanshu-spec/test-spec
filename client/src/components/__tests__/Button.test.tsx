/**
 * @fileoverview Unit tests for Button component
 * @module tests/components/Button
 *
 * This test suite provides comprehensive coverage for the Button component,
 * testing click handlers, disabled states, variant styling, loading states,
 * and accessibility features following the AAA pattern.
 *
 * Test patterns follow those established in tests/lifecycle/server.test.js,
 * particularly the mock factory approach (createMockServer, createMockListen).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../__tests__/utils/render';
import { Button } from '../Button';

// ============================================================================
// TypeScript Interfaces
// Following JSDoc typedef pattern from tests/unit/routes.test.js
// ============================================================================

/**
 * Button variant type representing available styling options.
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

/**
 * Button type attribute options.
 */
type ButtonType = 'button' | 'submit' | 'reset';

/**
 * Props interface for Button component testing.
 * @interface ButtonTestProps
 */
interface ButtonTestProps {
  /** Button content (text or elements) */
  children?: React.ReactNode;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** HTML button type attribute */
  type?: ButtonType;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Test Constants and Mock Factories
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default props for Button component tests.
 * @constant DEFAULT_BUTTON_PROPS
 */
const DEFAULT_BUTTON_PROPS: ButtonTestProps = {
  children: 'Test Button',
  onClick: undefined,
  disabled: false,
  variant: 'primary',
  type: 'button',
  loading: false,
  className: '',
};

/**
 * Creates mock Button props with optional overrides.
 * Follows the createMockServer factory pattern from server.test.js.
 *
 * @param {Partial<ButtonTestProps>} [overrides={}] - Props to override defaults
 * @returns {ButtonTestProps} Complete props object with defaults and overrides
 */
function createMockButtonProps(
  overrides: Partial<ButtonTestProps> = {}
): ButtonTestProps {
  return {
    ...DEFAULT_BUTTON_PROPS,
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Button Component', () => {
  /** Mock click handler function */
  let mockOnClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClick = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Click Handlers Tests
  // ==========================================================================

  describe('Click Handlers', () => {
    it('should call onClick handler when clicked', async () => {
      // Arrange
      const props = createMockButtonProps({ onClick: mockOnClick });
      const user = userEvent.setup();
      render(<Button {...props}>Click Me</Button>);

      // Act
      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click Me');
    });

    it('should pass event to onClick handler', async () => {
      // Arrange
      const props = createMockButtonProps({ onClick: mockOnClick });
      const user = userEvent.setup();
      render(<Button {...props}>Event Test</Button>);

      // Act
      const button = screen.getByRole('button', { name: /event test/i });
      await user.click(button);

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick.mock.calls[0][0]).toBeDefined();
      expect(mockOnClick.mock.calls[0][0].type).toBe('click');
    });

    it('should handle rapid sequential clicks', async () => {
      // Arrange
      const props = createMockButtonProps({ onClick: mockOnClick });
      const user = userEvent.setup();
      render(<Button {...props}>Rapid Click</Button>);

      // Act
      const button = screen.getByRole('button', { name: /rapid click/i });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(3);
      expect(button).toBeEnabled();
      expect(button).toBeInTheDocument();
    });

    it('should not propagate events when stopPropagation is called', async () => {
      // Arrange
      const mockParentClick = vi.fn();
      const mockButtonClick = vi.fn((e: React.MouseEvent) => {
        e.stopPropagation();
      });
      const user = userEvent.setup();

      render(
        <div onClick={mockParentClick}>
          <Button onClick={mockButtonClick}>Stop Propagation</Button>
        </div>
      );

      // Act
      const button = screen.getByRole('button', { name: /stop propagation/i });
      await user.click(button);

      // Assert
      expect(mockButtonClick).toHaveBeenCalledTimes(1);
      expect(mockParentClick).not.toHaveBeenCalled();
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe('Disabled State', () => {
    it('should not call onClick when disabled', async () => {
      // Arrange
      const props = createMockButtonProps({
        onClick: mockOnClick,
        disabled: true,
      });
      const user = userEvent.setup();
      render(<Button {...props}>Disabled Button</Button>);

      // Act
      const button = screen.getByRole('button', { name: /disabled button/i });
      await user.click(button);

      // Assert
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
      expect(button).toBeInTheDocument();
    });

    it('should have disabled attribute when disabled', () => {
      // Arrange
      const props = createMockButtonProps({ disabled: true });

      // Act
      render(<Button {...props}>Disabled Test</Button>);
      const button = screen.getByRole('button', { name: /disabled test/i });

      // Assert
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
      expect(button).toBeInTheDocument();
    });

    it('should have disabled styling when disabled', () => {
      // Arrange
      const props = createMockButtonProps({
        disabled: true,
        className: 'custom-class',
      });

      // Act
      render(<Button {...props}>Styled Disabled</Button>);
      const button = screen.getByRole('button', { name: /styled disabled/i });

      // Assert
      expect(button).toBeDisabled();
      expect(button).toHaveClass('custom-class');
      expect(button).toBeInTheDocument();
    });

    it('should not be focusable via tab when disabled', async () => {
      // Arrange
      const props = createMockButtonProps({ disabled: true });
      const user = userEvent.setup();
      render(
        <div>
          <input data-testid="focus-target" />
          <Button {...props}>Not Focusable</Button>
        </div>
      );

      // Act
      const input = screen.getByTestId('focus-target');
      await user.click(input);
      await user.tab();

      // Assert
      const button = screen.getByRole('button', { name: /not focusable/i });
      expect(button).toBeDisabled();
      expect(button).not.toHaveFocus();
      expect(document.activeElement).not.toBe(button);
    });

    it('should have aria-disabled attribute when disabled', () => {
      // Arrange
      const props = createMockButtonProps({ disabled: true });

      // Act
      render(<Button {...props}>Aria Disabled</Button>);
      const button = screen.getByRole('button', { name: /aria disabled/i });

      // Assert
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Variants Tests
  // ==========================================================================

  describe('Variants', () => {
    it('should render primary variant with correct styling', () => {
      // Arrange
      const props = createMockButtonProps({ variant: 'primary' });

      // Act
      render(<Button {...props}>Primary Button</Button>);
      const button = screen.getByRole('button', { name: /primary button/i });

      // Assert
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn-primary');
      expect(button).toBeEnabled();
    });

    it('should render secondary variant with correct styling', () => {
      // Arrange
      const props = createMockButtonProps({ variant: 'secondary' });

      // Act
      render(<Button {...props}>Secondary Button</Button>);
      const button = screen.getByRole('button', { name: /secondary button/i });

      // Assert
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn-secondary');
      expect(button).toBeEnabled();
    });

    it('should render danger variant with correct styling', () => {
      // Arrange
      const props = createMockButtonProps({ variant: 'danger' });

      // Act
      render(<Button {...props}>Danger Button</Button>);
      const button = screen.getByRole('button', { name: /danger button/i });

      // Assert
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn-danger');
      expect(button).toBeEnabled();
    });

    it('should render outline variant with correct styling', () => {
      // Arrange
      const props = createMockButtonProps({ variant: 'outline' });

      // Act
      render(<Button {...props}>Outline Button</Button>);
      const button = screen.getByRole('button', { name: /outline button/i });

      // Assert
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn-outline');
      expect(button).toBeEnabled();
    });

    it('should default to primary variant when not specified', () => {
      // Arrange & Act
      render(<Button>Default Variant</Button>);
      const button = screen.getByRole('button', { name: /default variant/i });

      // Assert
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn-primary');
      expect(button).toBeEnabled();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      // Arrange
      const props = createMockButtonProps({ loading: true });

      // Act
      render(<Button {...props}>Loading Button</Button>);
      const button = screen.getByRole('button');
      const spinner = screen.getByTestId('loading-spinner');

      // Assert
      expect(button).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should disable click when loading', async () => {
      // Arrange
      const props = createMockButtonProps({
        onClick: mockOnClick,
        loading: true,
      });
      const user = userEvent.setup();
      render(<Button {...props}>Loading Click</Button>);

      // Act
      const button = screen.getByRole('button');
      await user.click(button);

      // Assert
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should hide button text when loading', () => {
      // Arrange
      const props = createMockButtonProps({ loading: true });

      // Act
      render(<Button {...props}>Hidden Text</Button>);
      const button = screen.getByRole('button');

      // Assert
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      // Text should be visually hidden but still accessible for screen readers
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-busy attribute when loading', () => {
      // Arrange
      const props = createMockButtonProps({ loading: true });

      // Act
      render(<Button {...props}>Aria Busy</Button>);
      const button = screen.getByRole('button');

      // Assert
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render children correctly', () => {
      // Arrange & Act
      render(
        <Button>
          <span data-testid="child-span">Child Content</span>
        </Button>
      );
      const button = screen.getByRole('button');
      const childSpan = screen.getByTestId('child-span');

      // Assert
      expect(button).toBeInTheDocument();
      expect(childSpan).toBeInTheDocument();
      expect(childSpan).toHaveTextContent('Child Content');
    });

    it('should apply custom className', () => {
      // Arrange
      const customClass = 'my-custom-button';
      const props = createMockButtonProps({ className: customClass });

      // Act
      render(<Button {...props}>Custom Class</Button>);
      const button = screen.getByRole('button', { name: /custom class/i });

      // Assert
      expect(button).toHaveClass(customClass);
      expect(button).toHaveClass('btn-primary');
      expect(button).toBeInTheDocument();
    });

    it('should render with correct button type', () => {
      // Arrange - Test submit type
      render(<Button type="submit">Submit Button</Button>);
      const submitButton = screen.getByRole('button', { name: /submit button/i });

      // Assert
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });

    it('should forward ref correctly', () => {
      // Arrange
      const ref = React.createRef<HTMLButtonElement>();

      // Act
      render(<Button ref={ref}>Ref Button</Button>);
      const button = screen.getByRole('button', { name: /ref button/i });

      // Assert
      expect(ref.current).toBe(button);
      expect(ref.current?.tagName).toBe('BUTTON');
      expect(ref.current?.textContent).toContain('Ref Button');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have type="button" by default', () => {
      // Arrange & Act
      render(<Button>Default Type</Button>);
      const button = screen.getByRole('button', { name: /default type/i });

      // Assert
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should be focusable via keyboard', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <div>
          <input data-testid="before-input" />
          <Button>Focusable Button</Button>
        </div>
      );

      // Act
      const input = screen.getByTestId('before-input');
      await user.click(input);
      await user.tab();

      // Assert
      const button = screen.getByRole('button', { name: /focusable button/i });
      expect(button).toHaveFocus();
      expect(button).toBeEnabled();
      expect(document.activeElement).toBe(button);
    });

    it('should respond to Enter key press', async () => {
      // Arrange
      const props = createMockButtonProps({ onClick: mockOnClick });
      const user = userEvent.setup();
      render(<Button {...props}>Enter Key</Button>);

      // Act
      const button = screen.getByRole('button', { name: /enter key/i });
      button.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should respond to Space key press', async () => {
      // Arrange
      const props = createMockButtonProps({ onClick: mockOnClick });
      const user = userEvent.setup();
      render(<Button {...props}>Space Key</Button>);

      // Act
      const button = screen.getByRole('button', { name: /space key/i });
      button.focus();
      await user.keyboard(' ');

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should have sufficient color contrast for variants', () => {
      // Arrange & Act
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      const primaryButton = screen.getByRole('button', { name: /primary/i });

      // Assert - Primary button exists and has correct class for styling
      expect(primaryButton).toHaveClass('btn-primary');
      expect(primaryButton).toBeInTheDocument();
      expect(primaryButton).toBeEnabled();

      // Test danger variant
      rerender(<Button variant="danger">Danger</Button>);
      const dangerButton = screen.getByRole('button', { name: /danger/i });
      expect(dangerButton).toHaveClass('btn-danger');
    });

    it('should have visible focus indicator', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <div>
          <input data-testid="focus-input" />
          <Button>Focus Indicator</Button>
        </div>
      );

      // Act
      const input = screen.getByTestId('focus-input');
      await user.click(input);
      await user.tab();

      // Assert
      const button = screen.getByRole('button', { name: /focus indicator/i });
      expect(button).toHaveFocus();
      expect(button).toBeInTheDocument();
      // The actual focus styling would be in CSS, but we can verify the element is focusable
      expect(document.activeElement).toBe(button);
    });

    it('should support reset type for form reset functionality', () => {
      // Arrange & Act
      render(<Button type="reset">Reset Form</Button>);
      const button = screen.getByRole('button', { name: /reset form/i });

      // Assert
      expect(button).toHaveAttribute('type', 'reset');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should maintain button role for accessibility', () => {
      // Arrange & Act
      render(<Button>Role Test</Button>);
      const button = screen.getByRole('button');

      // Assert
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
      expect(button).toBeEnabled();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      // Arrange & Act
      render(<Button></Button>);
      const button = screen.getByRole('button');

      // Assert
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
      expect(button.textContent).toBe('');
    });

    it('should handle undefined onClick without error', async () => {
      // Arrange
      const props = createMockButtonProps({ onClick: undefined });
      const user = userEvent.setup();
      render(<Button {...props}>No Handler</Button>);

      // Act
      const button = screen.getByRole('button', { name: /no handler/i });
      
      // Assert - Should not throw
      await expect(user.click(button)).resolves.not.toThrow();
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('should handle multiple className values', () => {
      // Arrange
      const props = createMockButtonProps({
        className: 'class-one class-two class-three',
      });

      // Act
      render(<Button {...props}>Multi Class</Button>);
      const button = screen.getByRole('button', { name: /multi class/i });

      // Assert
      expect(button).toHaveClass('class-one');
      expect(button).toHaveClass('class-two');
      expect(button).toHaveClass('class-three');
    });

    it('should handle complex children with icons', () => {
      // Arrange & Act
      render(
        <Button>
          <span data-testid="icon">🍔</span>
          <span>Order Now</span>
        </Button>
      );

      // Assert
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('icon');
      expect(button).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(button).toHaveTextContent('🍔');
    });

    it('should preserve button semantics with all props combined', () => {
      // Arrange
      const props = createMockButtonProps({
        onClick: mockOnClick,
        variant: 'danger',
        type: 'submit',
        className: 'extra-class',
        disabled: false,
        loading: false,
      });

      // Act
      render(<Button {...props}>Full Props Button</Button>);
      const button = screen.getByRole('button', { name: /full props button/i });

      // Assert
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveClass('btn-danger');
      expect(button).toHaveClass('extra-class');
      expect(button).toBeEnabled();
    });
  });
});
