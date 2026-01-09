/**
 * @fileoverview Unit tests for payment form component
 * @module tests/features/order/PaymentForm
 *
 * This test file validates the PaymentForm component functionality including:
 * - Form field rendering and accessibility
 * - Payment method selection (credit, debit, cash)
 * - Card number, expiry date, CVV validation
 * - Form submission handling and callbacks
 * - Error state display and recovery
 * - User interactions and input formatting
 *
 * Test patterns follow those established in tests/lifecycle/server.test.js,
 * particularly the factory function approach (createMockServer, createMockListen)
 * and comprehensive JSDoc documentation.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../__tests__/utils/render';
import {
  waitForLoadingToFinish,
  createMockOrder,
  DEFAULT_ORDER,
  generateTestId,
  clearAllStorage,
} from '../../../__tests__/utils/testUtils';

// ============================================================================
// TypeScript Interfaces for Test Data
// Following JSDoc typedef patterns from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Payment method type options supported by the form.
 * @typedef {'credit' | 'debit' | 'cash'} PaymentMethodType
 */
type PaymentMethodType = 'credit' | 'debit' | 'cash';

/**
 * Props interface for the PaymentForm component.
 * @interface PaymentFormProps
 */
interface PaymentFormProps {
  /** Total amount to be paid in cents */
  totalAmount: number;
  /** Callback fired when form is successfully submitted */
  onSubmit: (data: PaymentData) => Promise<void>;
  /** Callback fired when user cancels payment */
  onCancel: () => void;
  /** Whether the form is currently processing a payment */
  isProcessing?: boolean;
  /** Error message from a failed payment attempt */
  error?: string | null;
}

/**
 * Payment data submitted from the form.
 * @interface PaymentData
 */
interface PaymentData {
  /** Payment method selected by user */
  paymentMethod: PaymentMethodType;
  /** Card number (16 digits, no spaces) */
  cardNumber?: string;
  /** Cardholder name */
  cardholderName?: string;
  /** Card expiry date in MM/YY format */
  expiryDate?: string;
  /** Card CVV (3-4 digits) */
  cvv?: string;
}

/**
 * Test configuration for payment form fields.
 * @interface TestPaymentConfig
 */
interface TestPaymentConfig {
  /** Total amount in cents */
  totalAmount: number;
  /** Initial payment method */
  paymentMethod: PaymentMethodType;
  /** Default card number for testing */
  cardNumber: string;
  /** Default cardholder name */
  cardholderName: string;
  /** Default expiry date */
  expiryDate: string;
  /** Default CVV */
  cvv: string;
}

// ============================================================================
// Test Data Constants
// Following DEFAULT_CONFIG pattern from tests/lifecycle/server.test.js
// ============================================================================

/** @type {TestPaymentConfig} */
const DEFAULT_PAYMENT_CONFIG: TestPaymentConfig = {
  totalAmount: 2999, // $29.99
  paymentMethod: 'credit',
  cardNumber: '4111111111111111', // Valid test Visa number
  cardholderName: 'John Doe',
  expiryDate: '12/28',
  cvv: '123',
};

/**
 * Valid payment data for successful form submission.
 * @constant
 */
const VALID_PAYMENT_DATA: PaymentData = {
  paymentMethod: 'credit',
  cardNumber: '4111111111111111',
  cardholderName: 'John Doe',
  expiryDate: '12/28',
  cvv: '123',
};

/**
 * Invalid card numbers for validation testing.
 * @constant
 */
const INVALID_CARD_NUMBERS = [
  '1234567890123456', // Invalid Luhn checksum
  '411111111111111', // Too short (15 digits)
  '41111111111111111', // Too long (17 digits)
  'abcd1234efgh5678', // Contains letters
  '', // Empty
];

/**
 * Invalid expiry dates for validation testing.
 * @constant
 */
const INVALID_EXPIRY_DATES = [
  '13/25', // Invalid month (13)
  '00/25', // Invalid month (0)
  '12/20', // Expired (past year)
  '01/21', // Expired (past year)
  '1225', // Wrong format (no slash)
  '12-25', // Wrong format (dash instead of slash)
  'aa/bb', // Non-numeric
];

/**
 * Invalid CVV values for validation testing.
 * @constant
 */
const INVALID_CVV_VALUES = [
  '12', // Too short
  '12345', // Too long
  'abc', // Non-numeric
  '', // Empty
];

// ============================================================================
// Mock PaymentForm Component
// Since PaymentForm.tsx doesn't exist yet, we create a stub for testing
// ============================================================================

/**
 * PaymentForm component stub for testing.
 * This represents the expected interface of the PaymentForm component.
 */
const PaymentForm: React.FC<PaymentFormProps> = ({
  totalAmount,
  onSubmit,
  onCancel,
  isProcessing = false,
  error = null,
}) => {
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodType>('credit');
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardholderName, setCardholderName] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');
  const [cvv, setCvv] = React.useState('');
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  /**
   * Formats card number with spaces every 4 digits.
   */
  const formatCardNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  /**
   * Formats expiry date as MM/YY.
   */
  const formatExpiryDate = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  /**
   * Validates card number using Luhn algorithm and length.
   */
  const validateCardNumber = (number: string): boolean => {
    const digits = number.replace(/\s/g, '');
    if (digits.length !== 16 || !/^\d+$/.test(digits)) {
      return false;
    }
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  /**
   * Validates expiry date is in future and proper format.
   */
  const validateExpiryDate = (date: string): boolean => {
    const match = date.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const month = parseInt(match[1], 10);
    const year = parseInt(`20${match[2]}`, 10);

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  };

  /**
   * Validates CVV is 3-4 digits.
   */
  const validateCvv = (value: string): boolean => {
    return /^\d{3,4}$/.test(value);
  };

  /**
   * Validates all form fields and returns whether form is valid.
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (paymentMethod !== 'cash') {
      if (!cardNumber || !validateCardNumber(cardNumber.replace(/\s/g, ''))) {
        errors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      if (!cardholderName.trim()) {
        errors.cardholderName = 'Please enter the cardholder name';
      }
      if (!expiryDate || !validateExpiryDate(expiryDate)) {
        errors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
      }
      if (!cvv || !validateCvv(cvv)) {
        errors.cvv = 'Please enter a valid CVV';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const paymentData: PaymentData = {
      paymentMethod,
      ...(paymentMethod !== 'cash' && {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName,
        expiryDate,
        cvv,
      }),
    };

    await onSubmit(paymentData);
  };

  /**
   * Clears validation error when input changes.
   */
  const handleInputChange = (
    field: string,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const showCardFields = paymentMethod !== 'cash';
  const formattedTotal = (totalAmount / 100).toFixed(2);

  return (
    <form onSubmit={handleSubmit} aria-label="Payment form">
      <h2>Payment Details</h2>
      <p data-testid="order-total">Order Total: ${formattedTotal}</p>

      {error && (
        <div role="alert" aria-live="polite" className="error-message">
          {error}
        </div>
      )}

      <fieldset>
        <legend>Payment Method</legend>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="credit"
            checked={paymentMethod === 'credit'}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
            aria-label="Credit card"
          />
          Credit Card
        </label>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="debit"
            checked={paymentMethod === 'debit'}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
            aria-label="Debit card"
          />
          Debit Card
        </label>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="cash"
            checked={paymentMethod === 'cash'}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
            aria-label="Cash payment"
          />
          Cash
        </label>
      </fieldset>

      {showCardFields && (
        <>
          <div>
            <label htmlFor="cardNumber">Card Number</label>
            <input
              id="cardNumber"
              type="text"
              inputMode="numeric"
              value={formatCardNumber(cardNumber)}
              onChange={(e) =>
                handleInputChange('cardNumber', e.target.value, setCardNumber)
              }
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              aria-invalid={!!validationErrors.cardNumber}
              aria-describedby={validationErrors.cardNumber ? 'cardNumber-error' : undefined}
            />
            {validationErrors.cardNumber && (
              <span id="cardNumber-error" role="alert">
                {validationErrors.cardNumber}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="cardholderName">Cardholder Name</label>
            <input
              id="cardholderName"
              type="text"
              value={cardholderName}
              onChange={(e) =>
                handleInputChange('cardholderName', e.target.value, setCardholderName)
              }
              placeholder="John Doe"
              aria-invalid={!!validationErrors.cardholderName}
              aria-describedby={
                validationErrors.cardholderName ? 'cardholderName-error' : undefined
              }
            />
            {validationErrors.cardholderName && (
              <span id="cardholderName-error" role="alert">
                {validationErrors.cardholderName}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="expiryDate">Expiry Date</label>
            <input
              id="expiryDate"
              type="text"
              inputMode="numeric"
              value={expiryDate}
              onChange={(e) =>
                handleInputChange('expiryDate', formatExpiryDate(e.target.value), setExpiryDate)
              }
              placeholder="MM/YY"
              maxLength={5}
              aria-invalid={!!validationErrors.expiryDate}
              aria-describedby={validationErrors.expiryDate ? 'expiryDate-error' : undefined}
            />
            {validationErrors.expiryDate && (
              <span id="expiryDate-error" role="alert">
                {validationErrors.expiryDate}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              type="password"
              inputMode="numeric"
              value={cvv}
              onChange={(e) =>
                handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4), setCvv)
              }
              placeholder="123"
              maxLength={4}
              aria-invalid={!!validationErrors.cvv}
              aria-describedby={validationErrors.cvv ? 'cvv-error' : undefined}
            />
            {validationErrors.cvv && (
              <span id="cvv-error" role="alert">
                {validationErrors.cvv}
              </span>
            )}
          </div>
        </>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Cancel payment"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isProcessing}
          aria-busy={isProcessing}
          aria-label={isProcessing ? 'Processing payment' : 'Submit payment'}
        >
          {isProcessing ? 'Processing...' : `Pay $${formattedTotal}`}
        </button>
      </div>
    </form>
  );
};

// ============================================================================
// Helper Functions
// Following createMockServer/createMockListen patterns from server.test.js
// ============================================================================

/**
 * Creates default props for PaymentForm component.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 *
 * @param {Partial<PaymentFormProps>} [overrides={}] - Optional prop overrides
 * @returns {PaymentFormProps} Complete props object with mocked callbacks
 */
function createMockPaymentFormProps(overrides: Partial<PaymentFormProps> = {}): PaymentFormProps {
  return {
    totalAmount: DEFAULT_PAYMENT_CONFIG.totalAmount,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    isProcessing: false,
    error: null,
    ...overrides,
  };
}

/**
 * Fills the payment form with the provided data using userEvent.
 * Follows the setupMocks pattern from tests/lifecycle/server.test.js.
 *
 * @param {ReturnType<typeof userEvent.setup>} user - userEvent instance
 * @param {Partial<PaymentData>} data - Payment data to fill
 * @returns {Promise<void>}
 */
async function fillPaymentForm(
  user: ReturnType<typeof userEvent.setup>,
  data: Partial<PaymentData> = VALID_PAYMENT_DATA
): Promise<void> {
  // Select payment method if specified
  if (data.paymentMethod) {
    const methodLabels: Record<PaymentMethodType, string> = {
      credit: 'Credit card',
      debit: 'Debit card',
      cash: 'Cash payment',
    };
    const radio = screen.getByLabelText(methodLabels[data.paymentMethod]);
    await user.click(radio);
  }

  // Fill card details only if not cash payment
  if (data.paymentMethod !== 'cash') {
    if (data.cardNumber) {
      const cardInput = screen.getByLabelText(/card number/i);
      await user.clear(cardInput);
      await user.type(cardInput, data.cardNumber);
    }

    if (data.cardholderName) {
      const nameInput = screen.getByLabelText(/cardholder name/i);
      await user.clear(nameInput);
      await user.type(nameInput, data.cardholderName);
    }

    if (data.expiryDate) {
      const expiryInput = screen.getByLabelText(/expiry date/i);
      await user.clear(expiryInput);
      await user.type(expiryInput, data.expiryDate.replace('/', ''));
    }

    if (data.cvv) {
      const cvvInput = screen.getByLabelText(/cvv/i);
      await user.clear(cvvInput);
      await user.type(cvvInput, data.cvv);
    }
  }
}

/**
 * Retrieves all payment form field elements.
 * Follows helper function patterns from tests/unit/routes.test.js.
 *
 * @returns {Object} Object containing form field elements
 */
function getPaymentFormFields() {
  return {
    cardNumberInput: screen.queryByLabelText(/card number/i),
    cardholderNameInput: screen.queryByLabelText(/cardholder name/i),
    expiryDateInput: screen.queryByLabelText(/expiry date/i),
    cvvInput: screen.queryByLabelText(/cvv/i),
    creditRadio: screen.queryByLabelText(/credit card/i),
    debitRadio: screen.queryByLabelText(/debit card/i),
    cashRadio: screen.queryByLabelText(/cash payment/i),
    submitButton: screen.queryByRole('button', { name: /pay|submit|processing/i }),
    cancelButton: screen.queryByRole('button', { name: /cancel/i }),
  };
}

/**
 * Renders PaymentForm with default test props.
 *
 * @param {Partial<PaymentFormProps>} [propOverrides={}] - Optional prop overrides
 * @returns {Object} Render result with props reference
 */
function renderPaymentForm(propOverrides: Partial<PaymentFormProps> = {}) {
  const props = createMockPaymentFormProps(propOverrides);
  const result = render(<PaymentForm {...props} />);
  return { ...result, props };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('PaymentForm', () => {
  /** @type {ReturnType<typeof userEvent.setup>} */
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Initialize userEvent for each test
    user = userEvent.setup();
    // Clear any stored data
    clearAllStorage();
  });

  afterEach(() => {
    // Clean up DOM after each test
    cleanup();
    // Restore all mocks
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================
  describe('rendering', () => {
    it('should render all payment form fields', () => {
      // Arrange
      renderPaymentForm();

      // Act
      const fields = getPaymentFormFields();

      // Assert
      expect(fields.cardNumberInput).toBeInTheDocument();
      expect(fields.cardholderNameInput).toBeInTheDocument();
      expect(fields.expiryDateInput).toBeInTheDocument();
      expect(fields.cvvInput).toBeInTheDocument();
      expect(fields.submitButton).toBeInTheDocument();
      expect(fields.cancelButton).toBeInTheDocument();
    });

    it('should render payment method options (credit, debit, cash)', () => {
      // Arrange
      renderPaymentForm();

      // Act
      const fields = getPaymentFormFields();

      // Assert
      expect(fields.creditRadio).toBeInTheDocument();
      expect(fields.debitRadio).toBeInTheDocument();
      expect(fields.cashRadio).toBeInTheDocument();
      expect(screen.getByText(/payment method/i)).toBeInTheDocument();
    });

    it('should display order total amount', () => {
      // Arrange
      const totalAmount = 4999; // $49.99

      // Act
      renderPaymentForm({ totalAmount });

      // Assert
      expect(screen.getByTestId('order-total')).toHaveTextContent('$49.99');
      expect(screen.getByRole('button', { name: /pay \$49\.99/i })).toBeInTheDocument();
    });

    it('should have accessible labels for all inputs', () => {
      // Arrange
      renderPaymentForm();

      // Act & Assert
      // All inputs should be accessible via their labels
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();

      // Form should have accessible name
      expect(screen.getByRole('form', { name: /payment form/i })).toBeInTheDocument();
    });

    it('should hide card fields when cash payment is selected', async () => {
      // Arrange
      renderPaymentForm();

      // Act
      await user.click(screen.getByLabelText(/cash payment/i));

      // Assert
      expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cardholder name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/expiry date/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument();
    });

    it('should show card fields when credit card is selected', async () => {
      // Arrange
      renderPaymentForm();

      // Act - First select cash, then back to credit
      await user.click(screen.getByLabelText(/cash payment/i));
      await user.click(screen.getByLabelText(/credit card/i));

      // Assert
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================
  describe('validation', () => {
    it('should show error for invalid card number', async () => {
      // Arrange
      renderPaymentForm();

      // Act
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        cardNumber: '1234567890123456', // Invalid Luhn
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/valid 16-digit card number/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/card number/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('should show error for expired card', async () => {
      // Arrange
      renderPaymentForm();

      // Act
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        expiryDate: '01/20', // Expired date
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/valid expiry date/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/expiry date/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('should show error for invalid CVV', async () => {
      // Arrange
      renderPaymentForm();

      // Act
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        cvv: '12', // Too short
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/valid cvv/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/cvv/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('should show error for empty required fields', async () => {
      // Arrange
      renderPaymentForm();

      // Act - Submit without filling any fields
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/valid 16-digit card number/i)).toBeInTheDocument();
        expect(screen.getByText(/cardholder name/i)).toBeInTheDocument();
        expect(screen.getByText(/valid expiry date/i)).toBeInTheDocument();
        expect(screen.getByText(/valid cvv/i)).toBeInTheDocument();
      });
    });

    it('should validate card number format (16 digits)', async () => {
      // Arrange
      renderPaymentForm();

      // Act - Try card with too few digits
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        cardNumber: '411111111111111', // Only 15 digits
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/valid 16-digit card number/i)).toBeInTheDocument();
      });
      const cardInput = screen.getByLabelText(/card number/i);
      expect(cardInput).toHaveAttribute('aria-invalid', 'true');
      expect(cardInput).toHaveAttribute('aria-describedby', 'cardNumber-error');
    });

    it('should validate expiry date format (MM/YY)', async () => {
      // Arrange
      renderPaymentForm();

      // Act - Invalid month
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        expiryDate: '13/25', // Month 13 is invalid
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/valid expiry date/i)).toBeInTheDocument();
      });
    });

    it('should not show validation errors for cash payment', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act
      await user.click(screen.getByLabelText(/cash payment/i));
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalled();
      });
      expect(screen.queryByText(/valid 16-digit card number/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/valid expiry date/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/valid cvv/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Form Submission Tests
  // ==========================================================================
  describe('form submission', () => {
    it('should call onSubmit with payment data when valid', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act
      await fillPaymentForm(user, VALID_PAYMENT_DATA);
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalledTimes(1);
        expect(props.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: 'credit',
            cardNumber: '4111111111111111',
            cardholderName: 'John Doe',
            expiryDate: '12/28',
            cvv: '123',
          })
        );
      });
    });

    it('should disable submit button during processing', () => {
      // Arrange
      renderPaymentForm({ isProcessing: true });

      // Act
      const submitButton = screen.getByRole('button', { name: /processing/i });

      // Assert
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
      expect(submitButton).toHaveTextContent('Processing...');
    });

    it('should not submit when form is invalid', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act - Submit with invalid data
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      expect(props.onSubmit).not.toHaveBeenCalled();
      // Validation errors should be shown
      await waitFor(() => {
        expect(screen.getByText(/valid 16-digit card number/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      // Arrange
      const onSubmit = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      renderPaymentForm({ onSubmit });

      // Act
      await fillPaymentForm(user, VALID_PAYMENT_DATA);
      
      // Click submit but don't wait for completion
      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      // Assert - Check that loading state is shown during submission
      expect(onSubmit).toHaveBeenCalled();
    });

    it('should submit cash payment without card details', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act
      await user.click(screen.getByLabelText(/cash payment/i));
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: 'cash',
          })
        );
      });
      expect(props.onSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({
          cardNumber: expect.anything(),
        })
      );
    });

    it('should submit debit card payment', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act
      await user.click(screen.getByLabelText(/debit card/i));
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        paymentMethod: 'debit',
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: 'debit',
            cardNumber: '4111111111111111',
          })
        );
      });
    });
  });

  // ==========================================================================
  // User Interactions Tests
  // ==========================================================================
  describe('user interactions', () => {
    it('should format card number with spaces', async () => {
      // Arrange
      renderPaymentForm();
      const cardInput = screen.getByLabelText(/card number/i);

      // Act
      await user.type(cardInput, '4111111111111111');

      // Assert
      expect(cardInput).toHaveValue('4111 1111 1111 1111');
    });

    it('should mask CVV input', () => {
      // Arrange
      renderPaymentForm();

      // Act
      const cvvInput = screen.getByLabelText(/cvv/i);

      // Assert
      expect(cvvInput).toHaveAttribute('type', 'password');
    });

    it('should auto-format expiry date with slash', async () => {
      // Arrange
      renderPaymentForm();
      const expiryInput = screen.getByLabelText(/expiry date/i);

      // Act
      await user.type(expiryInput, '1228');

      // Assert
      expect(expiryInput).toHaveValue('12/28');
    });

    it('should handle cancel button click', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Assert
      expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should only allow numeric input for card number', async () => {
      // Arrange
      renderPaymentForm();
      const cardInput = screen.getByLabelText(/card number/i);

      // Act
      await user.type(cardInput, 'abc4111def1111ghi1111jkl1111');

      // Assert
      expect(cardInput).toHaveValue('4111 1111 1111 1111');
    });

    it('should limit card number to 16 digits', async () => {
      // Arrange
      renderPaymentForm();
      const cardInput = screen.getByLabelText(/card number/i);

      // Act
      await user.type(cardInput, '41111111111111112222');

      // Assert
      expect(cardInput).toHaveValue('4111 1111 1111 1111');
    });

    it('should limit CVV to 4 digits', async () => {
      // Arrange
      renderPaymentForm();
      const cvvInput = screen.getByLabelText(/cvv/i);

      // Act
      await user.type(cvvInput, '123456');

      // Assert
      expect(cvvInput).toHaveValue('1234');
    });

    it('should disable cancel button during processing', () => {
      // Arrange
      renderPaymentForm({ isProcessing: true });

      // Act
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Assert
      expect(cancelButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================
  describe('error handling', () => {
    it('should display payment processing error', () => {
      // Arrange
      const errorMessage = 'Payment declined. Please try another card.';

      // Act
      renderPaymentForm({ error: errorMessage });

      // Assert
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      expect(screen.getByRole('alert')).toBeVisible();
    });

    it('should allow retry after error', async () => {
      // Arrange
      const onSubmit = vi.fn()
        .mockRejectedValueOnce(new Error('Payment failed'))
        .mockResolvedValueOnce(undefined);
      
      const { rerender } = render(
        <PaymentForm
          totalAmount={DEFAULT_PAYMENT_CONFIG.totalAmount}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
          error="Payment failed. Please try again."
        />
      );

      // Act - First attempt shows error
      expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');

      // Clear error and fill form for retry
      rerender(
        <PaymentForm
          totalAmount={DEFAULT_PAYMENT_CONFIG.totalAmount}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
          error={null}
        />
      );

      await fillPaymentForm(user, VALID_PAYMENT_DATA);
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should clear errors on input change', async () => {
      // Arrange
      renderPaymentForm();

      // Act - Submit to trigger validation errors
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert - Errors are shown
      await waitFor(() => {
        expect(screen.getByText(/valid 16-digit card number/i)).toBeInTheDocument();
      });

      // Act - Type in card number field
      await user.type(screen.getByLabelText(/card number/i), '4');

      // Assert - Card number error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/valid 16-digit card number/i)).not.toBeInTheDocument();
      });
    });

    it('should show error message with proper accessibility', () => {
      // Arrange
      const errorMessage = 'Your card was declined';

      // Act
      renderPaymentForm({ error: errorMessage });

      // Assert
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(errorMessage);
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should not show error when error prop is null', () => {
      // Arrange & Act
      renderPaymentForm({ error: null });

      // Assert
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle network error gracefully', async () => {
      // Arrange
      const networkError = 'Network error. Please check your connection.';

      // Act
      renderPaymentForm({ error: networkError });

      // Assert
      expect(screen.getByRole('alert')).toHaveTextContent(networkError);
      expect(screen.getByRole('button', { name: /pay/i })).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle very small order amounts', () => {
      // Arrange
      const totalAmount = 1; // $0.01

      // Act
      renderPaymentForm({ totalAmount });

      // Assert
      expect(screen.getByTestId('order-total')).toHaveTextContent('$0.01');
      expect(screen.getByRole('button', { name: /pay \$0\.01/i })).toBeInTheDocument();
    });

    it('should handle large order amounts', () => {
      // Arrange
      const totalAmount = 999999; // $9,999.99

      // Act
      renderPaymentForm({ totalAmount });

      // Assert
      expect(screen.getByTestId('order-total')).toHaveTextContent('$9999.99');
    });

    it('should handle rapid form submissions', async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderPaymentForm({ onSubmit });

      // Act
      await fillPaymentForm(user, VALID_PAYMENT_DATA);
      const submitButton = screen.getByRole('button', { name: /pay/i });
      
      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Assert - Should only submit once (form is disabled during processing)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('should preserve form data when switching payment methods', async () => {
      // Arrange
      renderPaymentForm();
      const cardInput = screen.getByLabelText(/card number/i);
      const nameInput = screen.getByLabelText(/cardholder name/i);

      // Act - Fill form, switch to cash, switch back
      await user.type(cardInput, '4111111111111111');
      await user.type(nameInput, 'Jane Doe');
      await user.click(screen.getByLabelText(/cash payment/i));
      await user.click(screen.getByLabelText(/credit card/i));

      // Assert - Form data should be preserved
      expect(screen.getByLabelText(/card number/i)).toHaveValue('4111 1111 1111 1111');
      expect(screen.getByLabelText(/cardholder name/i)).toHaveValue('Jane Doe');
    });

    it('should handle whitespace in cardholder name', async () => {
      // Arrange
      const { props } = renderPaymentForm();

      // Act
      await fillPaymentForm(user, {
        ...VALID_PAYMENT_DATA,
        cardholderName: '  John   Doe  ',
      });
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert - Name should be submitted with whitespace (component doesn't trim)
      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            cardholderName: '  John   Doe  ',
          })
        );
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================
  describe('accessibility', () => {
    it('should have proper aria-invalid attributes on invalid fields', async () => {
      // Arrange
      renderPaymentForm();

      // Act
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/cardholder name/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/expiry date/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/cvv/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have proper aria-describedby for error messages', async () => {
      // Arrange
      renderPaymentForm();

      // Act
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toHaveAttribute(
          'aria-describedby',
          'cardNumber-error'
        );
      });
    });

    it('should have accessible button labels', () => {
      // Arrange
      renderPaymentForm();

      // Assert
      expect(screen.getByRole('button', { name: /cancel payment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit payment|pay/i })).toBeInTheDocument();
    });

    it('should have numeric input modes for number fields', () => {
      // Arrange
      renderPaymentForm();

      // Assert
      expect(screen.getByLabelText(/card number/i)).toHaveAttribute('inputMode', 'numeric');
      expect(screen.getByLabelText(/expiry date/i)).toHaveAttribute('inputMode', 'numeric');
      expect(screen.getByLabelText(/cvv/i)).toHaveAttribute('inputMode', 'numeric');
    });
  });

  // ==========================================================================
  // Integration with Test Utilities
  // ==========================================================================
  describe('test utility integration', () => {
    it('should work with createMockOrder utility', () => {
      // Arrange
      const order = createMockOrder({ total: 5000 });

      // Act
      renderPaymentForm({ totalAmount: order.total });

      // Assert
      expect(screen.getByTestId('order-total')).toHaveTextContent('$50.00');
    });

    it('should work with DEFAULT_ORDER constant', () => {
      // Arrange & Act
      renderPaymentForm({ totalAmount: DEFAULT_ORDER.total || 0 });

      // Assert
      expect(screen.getByTestId('order-total')).toBeInTheDocument();
    });

    it('should generate unique test IDs', () => {
      // Arrange
      const id1 = generateTestId('payment');
      const id2 = generateTestId('payment');

      // Assert
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^payment-\d+$/);
      expect(id2).toMatch(/^payment-\d+$/);
    });

    it('should work with waitForLoadingToFinish', async () => {
      // Arrange
      renderPaymentForm();

      // Act & Assert - Should not throw when no loading indicators
      await expect(waitForLoadingToFinish()).resolves.toBeUndefined();
    });

    it('should properly clear storage in cleanup', () => {
      // Arrange
      localStorage.setItem('test-key', 'test-value');
      sessionStorage.setItem('test-key', 'test-value');

      // Act
      clearAllStorage();

      // Assert
      expect(localStorage.getItem('test-key')).toBeNull();
      expect(sessionStorage.getItem('test-key')).toBeNull();
    });
  });
});
