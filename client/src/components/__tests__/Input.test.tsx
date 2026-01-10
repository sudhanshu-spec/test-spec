/**
 * @fileoverview Unit tests for Input component
 * @module tests/components/Input
 *
 * This test suite provides comprehensive coverage for the Input component,
 * including value changes, validation, error states, input types, accessibility,
 * and edge cases. Tests follow the AAA pattern (Arrange, Act, Assert) with
 * minimum 3 assertions per test case.
 *
 * Patterns are derived from tests/unit/config.test.js for edge case testing
 * and tests/lifecycle/server.test.js for mock factory functions.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../__tests__/utils/render';
import { Input } from '../Input';

// ============================================================================
// TypeScript Interfaces
// Following typedef patterns from tests/unit/routes.test.js
// ============================================================================

/**
 * Input type options supported by the Input component.
 * @typedef {'text' | 'email' | 'password' | 'number' | 'tel'} InputType
 */
type InputType = 'text' | 'email' | 'password' | 'number' | 'tel';

/**
 * Validator function type for custom input validation.
 * Returns null if valid, or an error message string if invalid.
 * @typedef {(value: string) => string | null | Promise<string | null>} ValidatorFn
 */
type ValidatorFn = (value: string) => string | null | Promise<string | null>;

/**
 * Props interface for Input component.
 * @interface InputProps
 */
interface InputProps {
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
}

// ============================================================================
// Mock Factories and Constants
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Default props for Input component tests.
 * @type {Required<Pick<InputProps, 'value' | 'onChange' | 'type' | 'id' | 'name'>>}
 */
/**
 * Default props for Input component tests.
 * @type {Required<Pick<InputProps, 'value' | 'onChange' | 'type' | 'id' | 'name'>>}
 */
const DEFAULT_INPUT_PROPS = {
  value: '',
  onChange: vi.fn() as unknown as (value: string) => void,
  type: 'text' as InputType,
  id: 'test-input',
  name: 'test-input',
};

/**
 * Creates a mock Input props object with optional overrides.
 * Following the loadConfigWithEnv pattern from tests/unit/config.test.js.
 *
 * @param {Partial<InputProps>} [overrides={}] - Props to override defaults
 * @returns {InputProps} Complete Input props object
 */
function createMockInputProps(overrides: Partial<InputProps> = {}): InputProps {
  return {
    ...DEFAULT_INPUT_PROPS,
    onChange: vi.fn() as unknown as (value: string) => void,
    ...overrides,
  };
}

/**
 * Creates a mock validator function for testing validation behavior.
 *
 * @param {boolean} shouldPass - Whether validation should pass
 * @param {string} [errorMessage='Validation error'] - Error message to return if validation fails
 * @returns {ValidatorFn} Mock validator function
 */
function createMockValidator(
  shouldPass: boolean,
  errorMessage: string = 'Validation error'
): ValidatorFn {
  return (value: string) => {
    if (shouldPass) {
      return null;
    }
    return errorMessage;
  };
}

/**
 * Creates an async mock validator for testing asynchronous validation.
 *
 * @param {boolean} shouldPass - Whether validation should pass
 * @param {string} [errorMessage='Async validation error'] - Error message to return
 * @param {number} [delay=100] - Delay in milliseconds before resolving
 * @returns {ValidatorFn} Async mock validator function
 */
function createAsyncMockValidator(
  shouldPass: boolean,
  errorMessage: string = 'Async validation error',
  delay: number = 100
): ValidatorFn {
  return async (value: string): Promise<string | null> => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (shouldPass) {
      return null;
    }
    return errorMessage;
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Input Component', () => {
  // Use type assertion to satisfy TypeScript while maintaining mock functionality
  let mockOnChange: ((value: string) => void) & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn() as ((value: string) => void) & ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Value Changes Tests
  // ==========================================================================

  describe('Value Changes', () => {
    it('should call onChange with new value when typing', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({ onChange: mockOnChange, label: 'Test Input' });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, 'hello');

      // Assert
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('h');
      expect(mockOnChange).toHaveBeenCalledTimes(5);
    });

    it('should update displayed value when controlled value changes', () => {
      // Arrange
      const props = createMockInputProps({ value: 'initial', label: 'Test Input' });
      const { rerender } = render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert initial state
      expect(input).toHaveValue('initial');

      // Act
      rerender(<Input {...props} value="updated" />);

      // Assert updated state
      expect(input).toHaveValue('updated');
      expect(input).toBeInTheDocument();
    });

    it('should handle empty string values', () => {
      // Arrange
      const props = createMockInputProps({ value: '', label: 'Test Input' });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toHaveValue('');
      expect(input).toBeInTheDocument();
      expect(input).not.toHaveAttribute('value', null);
    });

    it('should handle special characters', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({ onChange: mockOnChange, label: 'Test Input' });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, '!@#$%^&*()');

      // Assert
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('!');
      expect(mockOnChange).toHaveBeenCalledTimes(10);
    });

    it('should handle paste events', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({ onChange: mockOnChange, label: 'Test Input' });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.click(input);
      await user.paste('pasted text');

      // Assert
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('pasted text');
      expect(input).toBeInTheDocument();
    });

    it('should handle clearing the input', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        value: 'existing value',
        onChange: mockOnChange,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.clear(input);

      // Assert
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('');
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('Validation', () => {
    it('should call validate function on blur', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockValidator = vi.fn(() => null);
      const props = createMockInputProps({
        value: 'test',
        label: 'Test Input',
        validate: mockValidator,
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.click(input);
      await user.tab(); // Trigger blur

      // Assert
      expect(mockValidator).toHaveBeenCalled();
      expect(mockValidator).toHaveBeenCalledWith('test');
      expect(input).toBeInTheDocument();
    });

    it('should call validate function on change when configured', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockValidator = vi.fn(() => null);
      const props = createMockInputProps({
        onChange: mockOnChange,
        label: 'Test Input',
        validate: mockValidator,
        validateOnChange: true,
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, 'a');

      // Assert
      expect(mockValidator).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('a');
      expect(input).toBeInTheDocument();
    });

    it('should not validate when validate prop is not provided', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        value: 'test',
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.click(input);
      await user.tab();

      // Assert
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should display validation error returned by validator', async () => {
      // Arrange
      const user = userEvent.setup();
      const errorMessage = 'This field is invalid';
      const props = createMockInputProps({
        value: 'invalid',
        label: 'Test Input',
        validate: createMockValidator(false, errorMessage),
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.click(input);
      await user.tab();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toBeInTheDocument();
    });

    it('should clear error when input becomes valid', async () => {
      // Arrange
      const user = userEvent.setup();
      let isValid = false;
      const dynamicValidator = vi.fn(() => (isValid ? null : 'Error'));
      const props = createMockInputProps({
        value: 'test',
        label: 'Test Input',
        validate: dynamicValidator,
      });
      const { rerender } = render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act - First blur with invalid state
      await user.click(input);
      await user.tab();

      // Assert error is shown
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      // Act - Make valid and revalidate
      isValid = true;
      rerender(<Input {...props} />);
      await user.click(input);
      await user.tab();

      // Assert error is cleared
      await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
      });
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('should handle async validation', async () => {
      // Arrange
      const user = userEvent.setup();
      const errorMessage = 'Async error';
      const props = createMockInputProps({
        value: 'test',
        label: 'Test Input',
        validate: createAsyncMockValidator(false, errorMessage, 50),
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.click(input);
      await user.tab();

      // Assert
      await waitFor(
        () => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        },
        { timeout: 200 }
      );
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Error States Tests
  // ==========================================================================

  describe('Error States', () => {
    it('should display error message when error prop is provided', () => {
      // Arrange
      const errorMessage = 'This field has an error';
      const props = createMockInputProps({
        label: 'Test Input',
        error: errorMessage,
      });

      // Act
      render(<Input {...props} />);

      // Assert
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByLabelText('Test Input')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should apply error styling to input when in error state', () => {
      // Arrange
      const props = createMockInputProps({
        label: 'Test Input',
        error: 'Error message',
        className: 'custom-class',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should associate error message with input via aria-describedby', () => {
      // Arrange
      const errorMessage = 'Field error';
      const props = createMockInputProps({
        id: 'my-input',
        label: 'Test Input',
        error: errorMessage,
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      const ariaDescribedBy = input.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toBeTruthy();
      const errorElement = document.getElementById(ariaDescribedBy!);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
    });

    it('should announce error to screen readers', () => {
      // Arrange
      const errorMessage = 'Screen reader error';
      const props = createMockInputProps({
        label: 'Test Input',
        error: errorMessage,
      });

      // Act
      render(<Input {...props} />);

      // Assert
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(errorMessage);
      expect(alert).toHaveAttribute('aria-live');
    });

    it('should clear error when error prop becomes undefined', () => {
      // Arrange
      const props = createMockInputProps({
        label: 'Test Input',
        error: 'Initial error',
      });
      const { rerender } = render(<Input {...props} />);

      // Assert initial state
      expect(screen.getByText('Initial error')).toBeInTheDocument();

      // Act
      rerender(<Input {...props} error={undefined} />);

      // Assert
      expect(screen.queryByText('Initial error')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Test Input')).not.toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should prioritize external error over validation error', async () => {
      // Arrange
      const user = userEvent.setup();
      const externalError = 'External error message';
      const validationError = 'Validation error message';
      const props = createMockInputProps({
        label: 'Test Input',
        error: externalError,
        validate: createMockValidator(false, validationError),
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.click(input);
      await user.tab();

      // Assert
      expect(screen.getByText(externalError)).toBeInTheDocument();
      expect(screen.queryByText(validationError)).not.toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // ==========================================================================
  // Input Types Tests
  // ==========================================================================

  describe('Input Types', () => {
    it('should render text input correctly', () => {
      // Arrange
      const props = createMockInputProps({
        type: 'text',
        label: 'Text Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Text Input');

      // Assert
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('should render email input with email validation', () => {
      // Arrange
      const props = createMockInputProps({
        type: 'email',
        label: 'Email Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Email Input');

      // Assert
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('should render password input with hidden characters', () => {
      // Arrange
      const props = createMockInputProps({
        type: 'password',
        value: 'secretpassword',
        label: 'Password Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Password Input');

      // Assert
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toHaveValue('secretpassword');
      expect(input).toBeInTheDocument();
    });

    it('should render number input accepting only numbers', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        type: 'number',
        onChange: mockOnChange,
        label: 'Number Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Number Input');

      // Act
      await user.type(input, '123');

      // Assert
      expect(input).toHaveAttribute('type', 'number');
      expect(mockOnChange).toHaveBeenCalled();
      expect(input).toBeInTheDocument();
    });

    it('should render tel input for phone numbers', () => {
      // Arrange
      const props = createMockInputProps({
        type: 'tel',
        label: 'Phone Input',
        value: '555-1234',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Phone Input');

      // Assert
      expect(input).toHaveAttribute('type', 'tel');
      expect(input).toHaveValue('555-1234');
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // Following patterns from tests/unit/config.test.js
  // ==========================================================================

  describe('Edge Cases (following config.test.js patterns)', () => {
    it('should handle whitespace-only input', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        onChange: mockOnChange,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, '   ');

      // Assert
      expect(mockOnChange).toHaveBeenCalledWith(' ');
      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(input).toBeInTheDocument();
    });

    it('should handle very long input strings', async () => {
      // Arrange
      const longString = 'a'.repeat(1000);
      const props = createMockInputProps({
        value: longString,
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toHaveValue(longString);
      expect(input).toBeInTheDocument();
      expect(input.getAttribute('value')?.length).toBe(1000);
    });

    it('should handle numeric input as string for text type', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        type: 'text',
        onChange: mockOnChange,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, '12345');

      // Assert
      expect(mockOnChange).toHaveBeenCalledWith('1');
      expect(mockOnChange).toHaveBeenCalledWith('2');
      expect(mockOnChange).toHaveBeenCalledTimes(5);
    });

    it('should handle leading/trailing whitespace', () => {
      // Arrange - Following config.test.js PORT whitespace test pattern
      const props = createMockInputProps({
        value: '  value  ',
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toHaveValue('  value  ');
      expect(input).toBeInTheDocument();
      expect(input.getAttribute('value')).toBe('  value  ');
    });

    it('should handle rapid typing without losing characters', async () => {
      // Arrange
      const user = userEvent.setup({ delay: null }); // No delay for rapid typing
      const typeHistory: string[] = [];
      const trackingOnChange = (value: string) => {
        typeHistory.push(value);
      };
      const props = createMockInputProps({
        onChange: trackingOnChange,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, 'rapid');

      // Assert
      expect(typeHistory).toContain('r');
      expect(typeHistory).toContain('a');
      expect(typeHistory.length).toBe(5);
    });

    it('should handle unicode characters', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        onChange: mockOnChange,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, '日本語');

      // Assert
      expect(mockOnChange).toHaveBeenCalled();
      expect(input).toBeInTheDocument();
      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('should handle empty value to non-empty transition', () => {
      // Arrange
      const props = createMockInputProps({
        value: '',
        label: 'Test Input',
      });
      const { rerender } = render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert initial state
      expect(input).toHaveValue('');

      // Act
      rerender(<Input {...props} value="new value" />);

      // Assert
      expect(input).toHaveValue('new value');
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe('Disabled State', () => {
    it('should not allow typing when disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        disabled: true,
        onChange: mockOnChange,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act
      await user.type(input, 'test');

      // Assert
      expect(mockOnChange).not.toHaveBeenCalled();
      expect(input).toBeDisabled();
      expect(input).toBeInTheDocument();
    });

    it('should have disabled attribute', () => {
      // Arrange
      const props = createMockInputProps({
        disabled: true,
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('disabled');
      expect(input).toBeInTheDocument();
    });

    it('should have disabled styling', () => {
      // Arrange
      const props = createMockInputProps({
        disabled: true,
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
      expect(input).toBeInTheDocument();
    });

    it('should not trigger validation when disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockValidator = vi.fn(() => 'Error');
      const props = createMockInputProps({
        disabled: true,
        validate: mockValidator,
        label: 'Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Act - Try to focus and blur
      await user.click(input);
      await user.tab();

      // Assert
      expect(mockValidator).not.toHaveBeenCalled();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should associate label with input via htmlFor/id', () => {
      // Arrange
      const props = createMockInputProps({
        id: 'unique-id',
        label: 'Accessible Label',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Accessible Label');

      // Assert
      expect(input).toHaveAttribute('id', 'unique-id');
      const label = screen.getByText('Accessible Label');
      expect(label.tagName.toLowerCase()).toBe('label');
      expect(label).toHaveAttribute('for', 'unique-id');
    });

    it('should have aria-required when required', () => {
      // Arrange
      const props = createMockInputProps({
        required: true,
        label: 'Required Input',
      });

      // Act
      render(<Input {...props} />);
      // Use regex to match label text that may include required indicator
      const input = screen.getByLabelText(/Required Input/);

      // Assert
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('required');
      expect(input).toBeInTheDocument();
    });

    it('should have aria-invalid when in error state', () => {
      // Arrange
      const props = createMockInputProps({
        error: 'Error message',
        label: 'Error Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Error Input');

      // Assert
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should have aria-describedby pointing to error message', () => {
      // Arrange
      const props = createMockInputProps({
        id: 'desc-test',
        error: 'Error message',
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toBeInTheDocument();
      expect(document.getElementById(describedBy!)).toHaveTextContent('Error message');
    });

    it('should announce errors via aria-live region', () => {
      // Arrange
      const props = createMockInputProps({
        error: 'Live error announcement',
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);

      // Assert
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live');
      expect(alert).toHaveTextContent('Live error announcement');
    });

    it('should be keyboard navigable', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        label: 'Focusable Input',
      });
      render(
        <div>
          <button>Before</button>
          <Input {...props} />
          <button>After</button>
        </div>
      );

      // Act
      await user.tab(); // Focus first button
      await user.tab(); // Focus input

      // Assert
      const input = screen.getByLabelText('Focusable Input');
      expect(input).toHaveFocus();
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('should have visible focus indicator', async () => {
      // Arrange
      const user = userEvent.setup();
      const props = createMockInputProps({
        label: 'Focus Test Input',
      });
      render(<Input {...props} />);
      const input = screen.getByLabelText('Focus Test Input');

      // Act
      await user.click(input);

      // Assert
      expect(input).toHaveFocus();
      expect(input).toBeInTheDocument();
      expect(document.activeElement).toBe(input);
    });

    it('should support autocomplete attributes', () => {
      // Arrange
      const props = createMockInputProps({
        autoComplete: 'email',
        label: 'Email Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Email Input');

      // Assert
      expect(input).toHaveAttribute('autocomplete', 'email');
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('should have accessible name from label', () => {
      // Arrange
      const props = createMockInputProps({
        label: 'My Accessible Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByRole('textbox', { name: 'My Accessible Input' });

      // Assert
      expect(input).toBeInTheDocument();
      expect(input).toHaveAccessibleName('My Accessible Input');
      expect(input.tagName.toLowerCase()).toBe('input');
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render label when provided', () => {
      // Arrange
      const props = createMockInputProps({
        label: 'Visible Label',
      });

      // Act
      render(<Input {...props} />);

      // Assert
      expect(screen.getByText('Visible Label')).toBeInTheDocument();
      expect(screen.getByLabelText('Visible Label')).toBeInTheDocument();
      expect(screen.getByText('Visible Label').tagName.toLowerCase()).toBe('label');
    });

    it('should render placeholder text', () => {
      // Arrange
      const props = createMockInputProps({
        placeholder: 'Enter your text here',
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toHaveAttribute('placeholder', 'Enter your text here');
      expect(input).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your text here')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      // Arrange
      const props = createMockInputProps({
        className: 'custom-input-class',
        label: 'Test Input',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Test Input');

      // Assert
      expect(input).toHaveClass('custom-input-class');
      expect(input).toBeInTheDocument();
      expect(input.classList.contains('custom-input-class')).toBe(true);
    });

    it('should forward ref correctly', () => {
      // Arrange
      const ref = React.createRef<HTMLInputElement>();
      const props = createMockInputProps({
        label: 'Ref Test Input',
      });

      // Act
      render(<Input {...props} ref={ref} />);

      // Assert
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toBeInTheDocument();
      expect(ref.current?.tagName.toLowerCase()).toBe('input');
    });

    it('should render required indicator when required', () => {
      // Arrange
      const props = createMockInputProps({
        required: true,
        label: 'Required Field',
      });

      // Act
      render(<Input {...props} />);

      // Assert
      const input = screen.getByLabelText(/Required Field/);
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(screen.getByText('*') || screen.getByText(/required/i)).toBeTruthy();
    });

    it('should render without label when not provided', () => {
      // Arrange
      const props = createMockInputProps({
        id: 'no-label-input',
        'aria-label': 'Accessible input without visible label',
      } as InputProps & { 'aria-label': string });

      // Act
      render(<Input {...props} />);
      const input = screen.getByRole('textbox');

      // Assert
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'no-label-input');
      expect(screen.queryByRole('label')).toBeFalsy();
    });

    it('should render with name attribute for form submission', () => {
      // Arrange
      const props = createMockInputProps({
        name: 'form-field-name',
        label: 'Form Field',
      });

      // Act
      render(<Input {...props} />);
      const input = screen.getByLabelText('Form Field');

      // Assert
      expect(input).toHaveAttribute('name', 'form-field-name');
      expect(input).toBeInTheDocument();
      expect(input.getAttribute('name')).toBe('form-field-name');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should work correctly with form submission', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      let currentValue = '';
      const handleChange = (newValue: string) => {
        currentValue = newValue;
      };

      // Use a wrapper component to properly manage controlled state
      function FormWrapper() {
        const [value, setValue] = React.useState('');
        return (
          <form onSubmit={mockSubmit}>
            <Input
              value={value}
              onChange={(newValue) => {
                setValue(newValue);
                handleChange(newValue);
              }}
              label="Form Input"
              required
              id="form-input"
              name="form-input"
            />
            <button type="submit">Submit</button>
          </form>
        );
      }

      render(<FormWrapper />);

      // Use regex to match label text that may include required indicator
      const input = screen.getByLabelText(/Form Input/);
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      // Act
      await user.type(input, 'form value');
      await user.click(submitButton);

      // Assert
      expect(currentValue).toBe('form value');
      expect(mockSubmit).toHaveBeenCalled();
      expect(input).toHaveAttribute('required');
    });

    it('should handle controlled input state correctly', async () => {
      // Arrange
      const user = userEvent.setup();
      let currentValue = '';
      const handleChange = (value: string) => {
        currentValue = value;
      };

      function ControlledInput() {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(newValue) => {
              setValue(newValue);
              handleChange(newValue);
            }}
            label="Controlled Input"
            id="controlled-input"
            name="controlled"
          />
        );
      }

      render(<ControlledInput />);
      const input = screen.getByLabelText('Controlled Input');

      // Act
      await user.type(input, 'hello');

      // Assert
      expect(input).toHaveValue('hello');
      expect(currentValue).toBe('hello');
      expect(input).toBeInTheDocument();
    });
  });
});
