/**
 * @fileoverview Tests for BookingConfirmation component
 * @module tests/features/booking/BookingConfirmation
 * 
 * This test suite provides comprehensive unit tests for the BookingConfirmation
 * component, covering confirmation display, status badges, copy functionality,
 * cancellation flow, and accessibility requirements.
 * 
 * Test categories covered:
 * - Rendering confirmation details (date, time, party size, guest info)
 * - Confirmation code display and copy functionality
 * - Booking status display for different states
 * - Success state messaging
 * - Cancellation flow with confirmation dialog
 * - Close/dismiss functionality
 * - Accessibility compliance
 * - Edge cases for various input scenarios
 * 
 * Following patterns established in:
 * - tests/lifecycle/server.test.js (mock factory patterns)
 * - tests/unit/config.test.js (describe/it structure, AAA pattern)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingConfirmation } from '../BookingConfirmation';
import {
  confirmedBooking,
  cancelledBooking,
  completedBooking,
  specialCharsBooking,
  createBooking,
  validDate,
  pastDate,
} from '../../../__tests__/fixtures/bookings';
import { customRender } from '../../../__tests__/utils/render';
import {
  createMockBooking,
  waitForLoadingToFinish,
} from '../../../__tests__/utils/testUtils';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props override type for createBookingConfirmationProps helper
 */
interface BookingConfirmationPropsOverrides {
  booking?: Parameters<typeof createBooking>[0];
  onCancel?: (bookingId: string) => void;
  onClose?: () => void;
  onModify?: (bookingId: string) => void;
}

// ============================================================================
// Helper Functions
// Following factory pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Creates BookingConfirmation props with sensible defaults.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js.
 * 
 * @param overrides - Optional props to override defaults
 * @returns Complete props object for BookingConfirmation
 */
function createBookingConfirmationProps(overrides: BookingConfirmationPropsOverrides = {}) {
  const defaultProps = {
    booking: confirmedBooking,
    onCancel: vi.fn(),
    onClose: vi.fn(),
    onModify: vi.fn(),
  };

  return {
    ...defaultProps,
    ...overrides,
    booking: overrides.booking
      ? createBooking(overrides.booking)
      : defaultProps.booking,
  };
}

/**
 * Custom render helper for BookingConfirmation component.
 * Wraps the component with necessary providers and returns render utilities.
 * 
 * @param booking - Booking data to display
 * @param options - Additional component props
 * @returns Render result with additional helpers
 */
function renderConfirmation(
  booking = confirmedBooking,
  options: Omit<BookingConfirmationPropsOverrides, 'booking'> = {}
) {
  const props = {
    booking,
    onCancel: options.onCancel || vi.fn(),
    onClose: options.onClose || vi.fn(),
    onModify: options.onModify,
  };

  return {
    ...customRender(<BookingConfirmation {...props} />),
    props,
  };
}

/**
 * Creates a booking near the cancellation deadline (within 24 hours).
 * Used for testing cancellation deadline validation.
 * 
 * @returns Booking object that is close to cancellation deadline
 */
function createBookingNearDeadline() {
  // Create a date that is less than 24 hours from now
  const date = new Date();
  date.setHours(date.getHours() + 12); // 12 hours from now
  
  return createBooking({
    id: 'booking-near-deadline',
    date: date.toISOString().split('T')[0],
    time: `${date.getHours().toString().padStart(2, '0')}:00`,
    status: 'confirmed',
    confirmationCode: 'BRG-DEAD1',
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('BookingConfirmation', () => {
  const mockOnCancel = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnModify = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock clipboard API using Object.defineProperty since navigator.clipboard is getter-only
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Rendering Confirmation Details Tests
  // ==========================================================================

  describe('rendering confirmation details', () => {
    it('should display booking date in readable format', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert - Check that date is formatted as readable text
      const dateElement = screen.getByTestId('booking-date');
      expect(dateElement).toBeInTheDocument();
      // The date should be formatted by formatDate function
      expect(dateElement.textContent).toBeTruthy();
    });

    it('should display booking time in 12-hour format', () => {
      // Arrange
      const booking = createBooking({
        time: '18:00',
      });
      renderConfirmation(booking);

      // Assert - Check that time is displayed
      const timeElement = screen.getByTestId('booking-time');
      expect(timeElement).toBeInTheDocument();
      // 18:00 should be formatted as "6:00 PM"
      expect(timeElement.textContent).toMatch(/6:00\s*PM/i);
    });

    it('should display morning time correctly', () => {
      // Arrange
      const booking = createBooking({
        time: '09:30',
      });
      renderConfirmation(booking);

      // Assert
      const timeElement = screen.getByTestId('booking-time');
      expect(timeElement.textContent).toMatch(/9:30\s*AM/i);
    });

    it('should display party size with appropriate label', () => {
      // Arrange
      renderConfirmation(confirmedBooking); // partySize: 4

      // Assert
      const partySizeElement = screen.getByTestId('booking-party-size');
      expect(partySizeElement).toBeInTheDocument();
      expect(partySizeElement.textContent).toContain('4');
      expect(partySizeElement.textContent).toContain('guests');
    });

    it('should display singular label for party size of 1', () => {
      // Arrange
      const singleGuestBooking = createBooking({
        partySize: 1,
      });
      renderConfirmation(singleGuestBooking);

      // Assert
      const partySizeElement = screen.getByTestId('booking-party-size');
      expect(partySizeElement.textContent).toContain('1');
      expect(partySizeElement.textContent).toContain('guest');
      expect(partySizeElement.textContent).not.toContain('guests');
    });

    it('should display guest name', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const nameElement = screen.getByTestId('booking-name');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement.textContent).toBe(confirmedBooking.name);
    });

    it('should display contact phone number', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const phoneElement = screen.getByTestId('booking-phone');
      expect(phoneElement).toBeInTheDocument();
      expect(phoneElement.textContent).toBe(confirmedBooking.phone);
    });

    it('should display email when provided', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const emailElement = screen.getByTestId('booking-email');
      expect(emailElement).toBeInTheDocument();
      expect(emailElement.textContent).toBe(confirmedBooking.email);
    });

    it('should not display email section when not provided', () => {
      // Arrange
      const bookingWithoutEmail = createBooking({
        email: undefined,
      });
      renderConfirmation(bookingWithoutEmail);

      // Assert
      expect(screen.queryByTestId('booking-email')).not.toBeInTheDocument();
    });

    it('should display special requests if provided', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const specialRequestsElement = screen.getByTestId('booking-special-requests');
      expect(specialRequestsElement).toBeInTheDocument();
      expect(specialRequestsElement.textContent).toBe(confirmedBooking.specialRequests);
    });

    it('should not display special requests section when not provided', () => {
      // Arrange
      renderConfirmation(cancelledBooking); // Has no special requests

      // Assert
      expect(screen.queryByTestId('booking-special-requests')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Confirmation Code Tests
  // ==========================================================================

  describe('confirmation code', () => {
    it('should prominently display confirmation code', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const codeElement = screen.getByTestId('confirmation-code');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement.textContent).toBe(confirmedBooking.confirmationCode);
    });

    it('should have confirmation label', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      expect(screen.getByText(/confirmation code/i)).toBeInTheDocument();
    });

    it('should provide copy to clipboard functionality', async () => {
      // Arrange - set up clipboard mock before rendering
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      renderConfirmation(confirmedBooking);

      // Act - use fireEvent for simpler async behavior
      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);

      // Assert - wait for the async clipboard write to complete
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(confirmedBooking.confirmationCode);
      });
    });

    it('should show success feedback after copying', async () => {
      // Arrange
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      renderConfirmation(confirmedBooking);
      const user = userEvent.setup();

      // Act
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Assert - Check for "Copied!" feedback
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });

    it('should reset copy success message after timeout', async () => {
      // Arrange - set up clipboard mock
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      
      // Use fake timers from the start
      vi.useFakeTimers();
      
      renderConfirmation(confirmedBooking);

      // Act - click copy button with act wrapper
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await act(async () => {
        fireEvent.click(copyButton);
        // Allow the promise to resolve
        await vi.advanceTimersByTimeAsync(0);
      });

      // Assert - Initially shows copied
      expect(screen.getByText(/copied/i)).toBeInTheDocument();

      // Advance timer past the 2000ms reset with act wrapper
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });

      // Should revert to "Copy" text
      expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Booking Status Display Tests
  // ==========================================================================

  describe('booking status display', () => {
    it('should show confirmed status badge', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.textContent).toBe('Confirmed');
    });

    it('should show cancelled status with appropriate display', () => {
      // Arrange
      renderConfirmation(cancelledBooking);

      // Assert
      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.textContent).toBe('Cancelled');
      expect(statusBadge.className).toContain('cancelled');
    });

    it('should show completed status for past bookings', () => {
      // Arrange
      renderConfirmation(completedBooking);

      // Assert
      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.textContent).toBe('Completed');
      expect(statusBadge.className).toContain('completed');
    });

    it('should have appropriate ARIA label for status', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toHaveAttribute('aria-label', expect.stringContaining('Confirmed'));
    });
  });

  // ==========================================================================
  // Success State Tests
  // ==========================================================================

  describe('success state', () => {
    it('should display success message for confirmed booking', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
    });

    it('should display booking details title for non-confirmed bookings', () => {
      // Arrange
      renderConfirmation(cancelledBooking);

      // Assert
      expect(screen.getByText(/booking details/i)).toBeInTheDocument();
    });

    it('should have appropriate heading hierarchy', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Cancellation Flow Tests
  // ==========================================================================

  describe('cancellation flow', () => {
    it('should display cancel booking button for confirmed booking', () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Assert
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should show confirmation dialog before cancelling', async () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Act - use fireEvent wrapped in act for proper state update handling
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Assert - Dialog should appear immediately after act
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/cancel booking\?/i)).toBeInTheDocument();
    });

    it('should emit onCancel callback when cancel is confirmed', async () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Act - Open dialog with act wrapper
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Act - Confirm cancellation (button has aria-label="Confirm cancellation")
      const confirmButton = screen.getByRole('button', { name: /confirm cancellation/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // Assert - callback should be called
      expect(mockOnCancel).toHaveBeenCalledWith(confirmedBooking.id);
    });

    it('should close dialog when user chooses to keep booking', async () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Act - Open dialog with act wrapper
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Act - Choose to keep booking with act wrapper
      const keepButton = screen.getByRole('button', { name: /keep booking/i });
      await act(async () => {
        fireEvent.click(keepButton);
      });

      // Assert - Dialog should close, onCancel should not be called
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should not show cancel button when onCancel is not provided', () => {
      // Arrange
      customRender(<BookingConfirmation booking={confirmedBooking} />);

      // Assert
      expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
    });

    it('should disable cancel button if cancellation deadline passed', () => {
      // Arrange
      const nearDeadlineBooking = createBookingNearDeadline();
      renderConfirmation(nearDeadlineBooking, { onCancel: mockOnCancel });

      // Assert
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should show warning message when cancellation deadline has passed', () => {
      // Arrange
      const nearDeadlineBooking = createBookingNearDeadline();
      renderConfirmation(nearDeadlineBooking, { onCancel: mockOnCancel });

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/cancellation deadline/i)).toBeInTheDocument();
    });

    it('should hide cancel button for cancelled bookings', () => {
      // Arrange - For cancelled bookings, cancel should be disabled or hidden
      renderConfirmation(cancelledBooking, { onCancel: mockOnCancel });

      // Assert - The cancel button should be disabled for cancelled status
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Close/Dismiss Functionality Tests
  // ==========================================================================

  describe('close/dismiss functionality', () => {
    it('should display close button when onClose is provided', () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onClose: mockOnClose });

      // Assert
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should emit onClose callback when dismissed', () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onClose: mockOnClose });

      // Act - use fireEvent for simpler sync behavior
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Assert - callback is called synchronously
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not display close button when onClose is not provided', () => {
      // Arrange
      customRender(<BookingConfirmation booking={confirmedBooking} />);

      // Assert
      expect(screen.queryByRole('button', { name: /close confirmation/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have region role with proper labeling', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const region = screen.getByRole('region');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-labelledby', 'booking-confirmation-title');
    });

    it('should have ARIA labels for important information', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const statusBadge = screen.getByRole('status');
      expect(statusBadge).toHaveAttribute('aria-label');
    });

    it('should have accessible copy button', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const copyButton = screen.getByRole('button', { name: /copy confirmation code/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should have accessible cancel button', () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Assert
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should have modal dialog with proper ARIA attributes', async () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Act - with act wrapper
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Assert - dialog should be visible immediately
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'cancel-dialog-title');
    });

    it('should use description list for booking details', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const detailsList = document.querySelector('dl');
      expect(detailsList).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle missing optional fields gracefully', () => {
      // Arrange
      const minimalBooking = createBooking({
        email: undefined,
        specialRequests: undefined,
      });

      // Act & Assert - Should not throw
      expect(() => renderConfirmation(minimalBooking)).not.toThrow();
    });

    it('should handle very long confirmation codes', () => {
      // Arrange
      const longCodeBooking = createBooking({
        confirmationCode: 'BRG-VERYLONGCONFIRMATIONCODE12345',
      });
      renderConfirmation(longCodeBooking);

      // Assert
      const codeElement = screen.getByTestId('confirmation-code');
      expect(codeElement.textContent).toBe('BRG-VERYLONGCONFIRMATIONCODE12345');
    });

    it('should handle special characters in guest name', () => {
      // Arrange
      renderConfirmation(specialCharsBooking);

      // Assert
      const nameElement = screen.getByTestId('booking-name');
      expect(nameElement.textContent).toBe(specialCharsBooking.name);
    });

    it('should handle special characters in special requests', () => {
      // Arrange
      renderConfirmation(specialCharsBooking);

      // Assert
      const specialRequestsElement = screen.getByTestId('booking-special-requests');
      expect(specialRequestsElement.textContent).toBe(specialCharsBooking.specialRequests);
    });

    it('should handle maximum party size', () => {
      // Arrange
      const largePartyBooking = createBooking({
        partySize: 20,
      });
      renderConfirmation(largePartyBooking);

      // Assert
      const partySizeElement = screen.getByTestId('booking-party-size');
      expect(partySizeElement.textContent).toContain('20');
      expect(partySizeElement.textContent).toContain('guests');
    });

    it('should handle booking with past date (completed status)', () => {
      // Arrange & Act
      renderConfirmation(completedBooking);

      // Assert
      expect(screen.getByTestId('booking-date')).toBeInTheDocument();
      expect(screen.getByRole('status').textContent).toBe('Completed');
    });

    it('should handle clipboard API failure gracefully', async () => {
      // Arrange
      const writeText = vi.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      
      // Mock document.execCommand as fallback
      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;
      
      renderConfirmation(confirmedBooking);

      // Act - click and allow full async resolution
      const copyButton = screen.getByRole('button', { name: /copy/i });
      
      // Use act with a small delay to allow the promise rejection and fallback to process
      await act(async () => {
        fireEvent.click(copyButton);
        // Allow multiple microtask cycles for the rejection and fallback
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Assert - Should have attempted clipboard API
      expect(writeText).toHaveBeenCalled();
      
      // The fallback (execCommand) should have shown "Copied" or the UI updated
      // Check that the copy attempt was made - success feedback may vary based on implementation
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle no-show status', () => {
      // Arrange
      const noShowBooking = createBooking({
        status: 'no-show',
      });
      renderConfirmation(noShowBooking);

      // Assert
      const statusBadge = screen.getByRole('status');
      expect(statusBadge.textContent).toBe('No Show');
    });
  });

  // ==========================================================================
  // Add to Calendar Tests
  // ==========================================================================

  describe('add to calendar', () => {
    it('should display add to calendar button', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert (button has aria-label="Add booking to calendar")
      const calendarButton = screen.getByRole('button', { name: /add.*calendar/i });
      expect(calendarButton).toBeInTheDocument();
    });

    it('should have accessible label for calendar button', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      const calendarButton = screen.getByRole('button', { name: /add.*calendar/i });
      expect(calendarButton).toHaveAttribute('aria-label', 'Add booking to calendar');
    });
  });

  // ==========================================================================
  // Modify Booking Tests
  // ==========================================================================

  describe('modify booking', () => {
    it('should display modify button when onModify is provided and booking is confirmed', () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onModify: mockOnModify });

      // Assert
      const modifyButton = screen.getByRole('button', { name: /modify booking/i });
      expect(modifyButton).toBeInTheDocument();
    });

    it('should emit onModify callback when modify is clicked', () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onModify: mockOnModify });

      // Act - use fireEvent for simpler sync handling
      const modifyButton = screen.getByRole('button', { name: /modify booking/i });
      fireEvent.click(modifyButton);

      // Assert - callback is called synchronously
      expect(mockOnModify).toHaveBeenCalledWith(confirmedBooking.id);
    });

    it('should not show modify button for cancelled bookings', () => {
      // Arrange
      renderConfirmation(cancelledBooking, { onModify: mockOnModify });

      // Assert
      expect(screen.queryByRole('button', { name: /modify booking/i })).not.toBeInTheDocument();
    });

    it('should not show modify button for completed bookings', () => {
      // Arrange
      renderConfirmation(completedBooking, { onModify: mockOnModify });

      // Assert
      expect(screen.queryByRole('button', { name: /modify booking/i })).not.toBeInTheDocument();
    });

    it('should not show modify button when onModify is not provided', () => {
      // Arrange
      renderConfirmation(confirmedBooking);

      // Assert
      expect(screen.queryByRole('button', { name: /modify booking/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Cancellation Dialog Details Tests
  // ==========================================================================

  describe('cancellation dialog details', () => {
    it('should display booking details in cancellation confirmation', async () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Act - use fireEvent with act wrapper
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Assert - Dialog should show date and time of the booking being cancelled
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it('should display warning about action being irreversible', async () => {
      // Arrange
      renderConfirmation(confirmedBooking, { onCancel: mockOnCancel });

      // Act - use fireEvent with act wrapper
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Assert - check warning in dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });
});
