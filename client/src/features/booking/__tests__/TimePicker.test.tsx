/**
 * @fileoverview Unit tests for the TimePicker component
 * @module tests/features/booking/TimePicker
 * 
 * Comprehensive test suite for the TimePicker component validating:
 * - Time slot rendering and display
 * - User selection interactions
 * - Availability and unavailability states
 * - Capacity indicators
 * - Accessibility compliance
 * - Edge cases and error handling
 * 
 * Following patterns established in tests/lifecycle/server.test.js:
 * - Factory functions for mock object creation
 * - JSDoc documentation standards
 * - beforeEach/afterEach lifecycle hooks
 * - Consistent AAA (Arrange, Act, Assert) test structure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimePicker } from '../TimePicker';
import {
  availableSlots,
  bookedSlots,
  partialSlots,
  createTimeSlot,
  TimeSlot,
} from '../../../__tests__/fixtures/bookings';
import { customRender } from '../../../__tests__/utils/render';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for TimePicker component testing
 * @interface TimePickerTestProps
 */
interface TimePickerTestProps {
  /** Array of time slots to display */
  slots: TimeSlot[];
  /** Callback function when a time is selected */
  onTimeSelect: (time: string) => void;
  /** Currently selected time */
  selectedTime?: string;
  /** Loading state flag */
  isLoading?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// ============================================================================
// Helper Functions
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Creates default TimePicker props with optional overrides.
 * Follows factory pattern from server.test.js for consistent test setup.
 * @param {Partial<TimePickerTestProps>} [overrides={}] - Properties to override defaults
 * @returns {TimePickerTestProps} Complete props object for TimePicker
 */
function createTimePickerProps(
  overrides: Partial<TimePickerTestProps> = {}
): TimePickerTestProps {
  return {
    slots: availableSlots,
    onTimeSelect: vi.fn(),
    selectedTime: undefined,
    isLoading: false,
    className: '',
    ...overrides,
  };
}

/**
 * Creates a mixed availability slots array for testing.
 * @returns {TimeSlot[]} Array with mixed available/unavailable slots
 */
function createMixedAvailabilitySlots(): TimeSlot[] {
  return [
    createTimeSlot('11:00', true, 50),
    createTimeSlot('11:30', false, 0),
    createTimeSlot('12:00', true, 25),
    createTimeSlot('12:30', false, 0),
    createTimeSlot('13:00', true, 10),
  ];
}

/**
 * Creates slots with varying capacity levels for capacity testing.
 * @returns {TimeSlot[]} Array with different capacity levels
 */
function createCapacityVariedSlots(): TimeSlot[] {
  return [
    createTimeSlot('17:00', true, 100), // Good availability
    createTimeSlot('17:30', true, 10),  // Medium availability
    createTimeSlot('18:00', true, 5),   // 5 seats available
    createTimeSlot('18:30', true, 2),   // Low - Only 2 seats
    createTimeSlot('19:00', true, 1),   // Low - Only 1 seat
    createTimeSlot('19:30', false, 0),  // Fully booked
  ];
}

// ============================================================================
// Test Suite
// ============================================================================

describe('TimePicker', () => {
  /** @type {ReturnType<typeof vi.fn>} */
  let mockOnTimeSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockOnTimeSelect = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should render list of time slots', () => {
      // Arrange
      const props = createTimePickerProps({ onTimeSelect: mockOnTimeSelect });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const buttons = screen.getAllByRole('option');
      expect(buttons).toHaveLength(availableSlots.length);
    });

    it('should display time in readable 12-hour format (e.g., 12:00 PM)', () => {
      // Arrange
      const slots = [createTimeSlot('12:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    });

    it('should display AM times correctly', () => {
      // Arrange
      const slots = [createTimeSlot('09:30', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('9:30 AM')).toBeInTheDocument();
    });

    it('should display PM times correctly for afternoon slots', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('6:00 PM')).toBeInTheDocument();
    });

    it('should display midnight as 12:00 AM', () => {
      // Arrange
      const slots = [createTimeSlot('00:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('12:00 AM')).toBeInTheDocument();
    });

    it('should show availability indicator for each slot', () => {
      // Arrange
      const mixedSlots = createMixedAvailabilitySlots();
      const props = createTimePickerProps({
        slots: mixedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const availableButtons = screen.getAllByRole('option').filter(
        (btn) => btn.getAttribute('aria-disabled') === 'false'
      );
      const unavailableButtons = screen.getAllByRole('option').filter(
        (btn) => btn.getAttribute('aria-disabled') === 'true'
      );

      expect(availableButtons.length).toBe(3);
      expect(unavailableButtons.length).toBe(2);
    });

    it('should display remaining capacity when applicable', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 2)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Only 2 seats left')).toBeInTheDocument();
    });

    it('should display "Good availability" for high capacity slots', () => {
      // Arrange
      const slots = [createTimeSlot('17:00', true, 100)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Good availability')).toBeInTheDocument();
    });

    it('should render loading state when slots are being fetched', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: [],
        isLoading: true,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Loading available times...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Loading available time slots'
      );
    });

    it('should render empty state when no slots available', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: [],
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(
        screen.getByText('No time slots available for this date.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Please select a different date or contact us for assistance.')
      ).toBeInTheDocument();
    });

    it('should display availability summary showing available vs total slots', () => {
      // Arrange
      const mixedSlots = createMixedAvailabilitySlots();
      const props = createTimePickerProps({
        slots: mixedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('3 of 5 slots available')).toBeInTheDocument();
    });

    it('should display "Select a time" label', () => {
      // Arrange
      const props = createTimePickerProps({ onTimeSelect: mockOnTimeSelect });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Select a time')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      // Arrange
      const props = createTimePickerProps({
        onTimeSelect: mockOnTimeSelect,
        className: 'custom-picker-class',
      });

      // Act
      const { container } = render(<TimePicker {...props} />);

      // Assert
      expect(container.querySelector('.custom-picker-class')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Slot Selection Tests
  // ==========================================================================

  describe('slot selection', () => {
    it('should allow selecting an available time slot', async () => {
      // Arrange
      const props = createTimePickerProps({ onTimeSelect: mockOnTimeSelect });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act
      const timeSlot = screen.getByRole('option', { name: /12:00 PM/i });
      await user.click(timeSlot);

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledWith('12:00');
    });

    it('should emit selected time via callback with correct time format', async () => {
      // Arrange
      const slots = [
        createTimeSlot('18:30', true, 50),
        createTimeSlot('19:00', true, 40),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act
      const slot = screen.getByRole('option', { name: /6:30 PM/i });
      await user.click(slot);

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledTimes(1);
      expect(mockOnTimeSelect).toHaveBeenCalledWith('18:30');
    });

    it('should highlight selected time slot visually', () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
      ];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:00',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const selectedSlot = screen.getByRole('option', { name: /6:00 PM/i });
      expect(selectedSlot).toHaveAttribute('aria-selected', 'true');
      expect(selectedSlot.className).toContain('time-picker__slot--selected');
    });

    it('should show checkmark indicator on selected slot', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:00',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should display selected time in selection info section', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:00',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Selected time:')).toBeInTheDocument();
      // The selection info should show formatted time
      const selectionInfo = screen.getByText('6:00 PM');
      expect(selectionInfo).toBeInTheDocument();
    });

    it('should update selection when different slot is clicked', async () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
        createTimeSlot('19:00', true, 30),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act
      const firstSlot = screen.getByRole('option', { name: /6:00 PM/i });
      await user.click(firstSlot);

      const secondSlot = screen.getByRole('option', { name: /6:30 PM/i });
      await user.click(secondSlot);

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledTimes(2);
      expect(mockOnTimeSelect).toHaveBeenNthCalledWith(1, '18:00');
      expect(mockOnTimeSelect).toHaveBeenNthCalledWith(2, '18:30');
    });

    it('should only have one slot with aria-selected true at a time', () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
        createTimeSlot('19:00', true, 30),
      ];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:30',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const allSlots = screen.getAllByRole('option');
      const selectedSlots = allSlots.filter(
        (slot) => slot.getAttribute('aria-selected') === 'true'
      );
      expect(selectedSlots).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Unavailable Slots Tests
  // ==========================================================================

  describe('unavailable slots', () => {
    it('should visually mark unavailable slots with unavailable class', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      slots.forEach((slot) => {
        expect(slot.className).toContain('time-picker__slot--unavailable');
      });
    });

    it('should disable interaction with fully booked slots', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      slots.forEach((slot) => {
        expect(slot).toBeDisabled();
      });
    });

    it('should not emit callback for unavailable slots', async () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act
      const bookedSlot = screen.getByRole('option', { name: /6:00 PM/i });
      await user.click(bookedSlot);

      // Assert
      expect(mockOnTimeSelect).not.toHaveBeenCalled();
    });

    it('should show "Fully booked" label for unavailable slots', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const fullyBookedLabels = screen.getAllByText('Fully booked');
      expect(fullyBookedLabels.length).toBe(bookedSlots.length);
    });

    it('should set aria-disabled to true for unavailable slots', () => {
      // Arrange
      const mixedSlots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', false, 0),
      ];
      const props = createTimePickerProps({
        slots: mixedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const unavailableSlot = screen.getByRole('option', { name: /6:30 PM/i });
      expect(unavailableSlot).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have reduced opacity on unavailable slots via CSS class', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      slots.forEach((slot) => {
        expect(slot.className).toContain('time-picker__slot--unavailable');
      });
    });

    it('should have tabIndex -1 for unavailable slots', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      slots.forEach((slot) => {
        expect(slot).toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  // ==========================================================================
  // Closed Hours Handling Tests
  // ==========================================================================

  describe('closed hours handling', () => {
    it('should not display slots during closed hours (when empty array passed)', () => {
      // Arrange - closed hours would result in empty slots array from API
      const closedHoursSlots: TimeSlot[] = [];
      const props = createTimePickerProps({
        slots: closedHoursSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      expect(screen.getByText('No time slots available for this date.')).toBeInTheDocument();
    });

    it('should indicate restaurant hours in the UI when no slots available', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: [],
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(
        screen.getByText('Please select a different date or contact us for assistance.')
      ).toBeInTheDocument();
    });

    it('should handle transition across meal periods (lunch and dinner slots)', () => {
      // Arrange - typical lunch (11-14) and dinner (17-21) slots with gap
      const mealPeriodSlots = [
        createTimeSlot('11:00', true, 50),
        createTimeSlot('12:00', true, 40),
        createTimeSlot('13:00', true, 30),
        createTimeSlot('17:00', true, 60),
        createTimeSlot('18:00', true, 45),
        createTimeSlot('19:00', true, 35),
      ];
      const props = createTimePickerProps({
        slots: mealPeriodSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert - verify both lunch and dinner periods are rendered
      expect(screen.getByText('11:00 AM')).toBeInTheDocument();
      expect(screen.getByText('1:00 PM')).toBeInTheDocument();
      expect(screen.getByText('5:00 PM')).toBeInTheDocument();
      expect(screen.getByText('7:00 PM')).toBeInTheDocument();

      // Verify slot count
      const slots = screen.getAllByRole('option');
      expect(slots).toHaveLength(6);
    });

    it('should correctly display only available operating hours', () => {
      // Arrange - only evening slots available
      const eveningOnlySlots = [
        createTimeSlot('17:00', true, 50),
        createTimeSlot('18:00', true, 40),
        createTimeSlot('19:00', true, 30),
      ];
      const props = createTimePickerProps({
        slots: eveningOnlySlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      expect(slots).toHaveLength(3);
      expect(screen.getByText('3 of 3 slots available')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Capacity Indicators Tests
  // ==========================================================================

  describe('capacity indicators', () => {
    it('should show remaining capacity for partial slots', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: partialSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Only 2 seats left')).toBeInTheDocument();
      expect(screen.getByText('5 seats available')).toBeInTheDocument();
    });

    it('should display "Only 1 seat left" for single remaining capacity', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 1)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Only 1 seat left')).toBeInTheDocument();
    });

    it('should display "Only 2 seats left" for two remaining capacity', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 2)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Only 2 seats left')).toBeInTheDocument();
    });

    it('should display "X seats available" for medium capacity (3-5)', () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 3),
        createTimeSlot('18:30', true, 4),
        createTimeSlot('19:00', true, 5),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('3 seats available')).toBeInTheDocument();
      expect(screen.getByText('4 seats available')).toBeInTheDocument();
      expect(screen.getByText('5 seats available')).toBeInTheDocument();
    });

    it('should display "Good availability" for high capacity (>5)', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Good availability')).toBeInTheDocument();
    });

    it('should apply limited class for low capacity slots', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 2)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slot = screen.getByRole('option');
      expect(slot.className).toContain('time-picker__slot--limited');
    });

    it('should apply appropriate capacity color class based on remaining capacity', () => {
      // Arrange
      const capacitySlots = createCapacityVariedSlots();
      const props = createTimePickerProps({
        slots: capacitySlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      const { container } = render(<TimePicker {...props} />);

      // Assert - check for capacity color classes
      expect(
        container.querySelector('.time-picker__capacity--high')
      ).toBeInTheDocument();
      expect(
        container.querySelector('.time-picker__capacity--low')
      ).toBeInTheDocument();
      expect(
        container.querySelector('.time-picker__capacity--unavailable')
      ).toBeInTheDocument();
    });

    it('should show "Fully booked" when remaining capacity is zero', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', false, 0)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByText('Fully booked')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper ARIA labels for time slots', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slot = screen.getByRole('option');
      const ariaLabel = slot.getAttribute('aria-label');
      expect(ariaLabel).toContain('6:00 PM');
      expect(ariaLabel).toContain('Good availability');
    });

    it('should include availability status in ARIA label for unavailable slots', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', false, 0)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slot = screen.getByRole('option');
      const ariaLabel = slot.getAttribute('aria-label');
      expect(ariaLabel).toContain('unavailable');
    });

    it('should indicate available/unavailable state via aria-disabled', () => {
      // Arrange
      const mixedSlots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', false, 0),
      ];
      const props = createTimePickerProps({
        slots: mixedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const availableSlot = screen.getByRole('option', { name: /6:00 PM/i });
      const unavailableSlot = screen.getByRole('option', { name: /6:30 PM/i });

      expect(availableSlot).toHaveAttribute('aria-disabled', 'false');
      expect(unavailableSlot).toHaveAttribute('aria-disabled', 'true');
    });

    it('should support keyboard navigation between slots with Tab', async () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act - tab to first slot
      await user.tab();

      // Assert
      const firstSlot = screen.getByRole('option', { name: /6:00 PM/i });
      expect(firstSlot).toHaveFocus();
    });

    it('should skip unavailable slots during keyboard navigation', async () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', false, 0), // unavailable - should skip
        createTimeSlot('19:00', true, 30),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act - tab to first slot, then tab again
      await user.tab();
      await user.tab();

      // Assert - should skip unavailable slot (tabIndex=-1)
      const thirdSlot = screen.getByRole('option', { name: /7:00 PM/i });
      expect(thirdSlot).toHaveFocus();
    });

    it('should select slot when Enter key is pressed', async () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act
      await user.tab();
      await user.keyboard('{Enter}');

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledWith('18:00');
    });

    it('should select slot when Space key is pressed', async () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act
      await user.tab();
      await user.keyboard(' ');

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledWith('18:00');
    });

    it('should announce time slot selection to screen readers via aria-live', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:00',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      const { container } = render(<TimePicker {...props} />);

      // Assert
      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toContain('6:00 PM');
    });

    it('should have role="listbox" on the time slot container', () => {
      // Arrange
      const props = createTimePickerProps({ onTimeSelect: mockOnTimeSelect });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have role="option" on each time slot button', () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
    });

    it('should set aria-activedescendant to selected slot id', () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
      ];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:00',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-activedescendant', 'time-slot-18:00');
    });

    it('should indicate selection status in aria-label', () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        selectedTime: '18:00',
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slot = screen.getByRole('option');
      const ariaLabel = slot.getAttribute('aria-label');
      expect(ariaLabel).toContain('currently selected');
    });

    it('should have aria-label on loading state container', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: [],
        isLoading: true,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const loadingContainer = screen.getByRole('status');
      expect(loadingContainer).toHaveAttribute(
        'aria-label',
        'Loading available time slots'
      );
    });

    it('should have group role on main container', () => {
      // Arrange
      const props = createTimePickerProps({ onTimeSelect: mockOnTimeSelect });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty slots array gracefully', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: [],
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle single available slot', () => {
      // Arrange
      const singleSlot = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots: singleSlot,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getAllByRole('option')).toHaveLength(1);
      expect(screen.getByText('1 of 1 slot available')).toBeInTheDocument();
    });

    it('should handle all slots booked scenario', () => {
      // Arrange
      const props = createTimePickerProps({
        slots: bookedSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      expect(slots.length).toBe(bookedSlots.length);
      expect(screen.getByText('0 of 5 slots available')).toBeInTheDocument();

      // All should be disabled
      slots.forEach((slot) => {
        expect(slot).toBeDisabled();
      });
    });

    it('should handle undefined selectedTime prop', () => {
      // Arrange
      const props = createTimePickerProps({
        onTimeSelect: mockOnTimeSelect,
        selectedTime: undefined,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      slots.forEach((slot) => {
        expect(slot).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should handle invalid time string in slot gracefully', () => {
      // Arrange - edge case: malformed time string
      const invalidSlots = [
        { time: 'invalid', available: true, remainingCapacity: 50 },
      ];
      const props = createTimePickerProps({
        slots: invalidSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act - should not throw
      expect(() => render(<TimePicker {...props} />)).not.toThrow();

      // Assert - displays original string if parsing fails
      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('should handle slots with negative capacity', () => {
      // Arrange
      const negativeCapacitySlots = [
        createTimeSlot('18:00', false, -5),
      ];
      const props = createTimePickerProps({
        slots: negativeCapacitySlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert - should show "Fully booked" for any non-positive capacity
      expect(screen.getByText('Fully booked')).toBeInTheDocument();
    });

    it('should handle rapid consecutive selections', async () => {
      // Arrange
      const slots = [
        createTimeSlot('18:00', true, 50),
        createTimeSlot('18:30', true, 40),
        createTimeSlot('19:00', true, 30),
      ];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();
      render(<TimePicker {...props} />);

      // Act - rapid clicks
      const slot1 = screen.getByRole('option', { name: /6:00 PM/i });
      const slot2 = screen.getByRole('option', { name: /6:30 PM/i });
      const slot3 = screen.getByRole('option', { name: /7:00 PM/i });

      await user.click(slot1);
      await user.click(slot2);
      await user.click(slot3);

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle zero capacity available slot correctly', () => {
      // Arrange - slot marked available but 0 capacity (edge case)
      const edgeCaseSlot = [
        { time: '18:00', available: true, remainingCapacity: 0 },
      ];
      const props = createTimePickerProps({
        slots: edgeCaseSlot,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert - should show "Fully booked" label
      expect(screen.getByText('Fully booked')).toBeInTheDocument();
    });

    it('should handle very large slot arrays', () => {
      // Arrange - 50 slots (stress test)
      const manySlots: TimeSlot[] = [];
      for (let hour = 8; hour < 22; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          manySlots.push(createTimeSlot(time, true, 50));
          if (manySlots.length >= 50) break;
        }
        if (manySlots.length >= 50) break;
      }

      const props = createTimePickerProps({
        slots: manySlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      const slots = screen.getAllByRole('option');
      expect(slots.length).toBeGreaterThanOrEqual(28); // Should render all slots
    });

    it('should not show selection info when no time is selected', () => {
      // Arrange
      const props = createTimePickerProps({
        onTimeSelect: mockOnTimeSelect,
        selectedTime: undefined,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.queryByText('Selected time:')).not.toBeInTheDocument();
    });

    it('should handle slots with special characters in time gracefully', () => {
      // Arrange
      const specialSlots = [
        { time: '18:00', available: true, remainingCapacity: 50 },
      ];
      const props = createTimePickerProps({
        slots: specialSlots,
        onTimeSelect: mockOnTimeSelect,
      });

      // Act
      render(<TimePicker {...props} />);

      // Assert
      expect(screen.getByRole('option')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration with Custom Render (Provider Context)
  // ==========================================================================

  describe('integration with providers', () => {
    it('should render correctly when wrapped with customRender', () => {
      // Arrange
      const props = createTimePickerProps({ onTimeSelect: mockOnTimeSelect });

      // Act
      customRender(<TimePicker {...props} />);

      // Assert
      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
    });

    it('should function correctly with provider context via customRender', async () => {
      // Arrange
      const slots = [createTimeSlot('18:00', true, 50)];
      const props = createTimePickerProps({
        slots,
        onTimeSelect: mockOnTimeSelect,
      });
      const user = userEvent.setup();

      // Act
      customRender(<TimePicker {...props} />);
      const slot = screen.getByRole('option', { name: /6:00 PM/i });
      await user.click(slot);

      // Assert
      expect(mockOnTimeSelect).toHaveBeenCalledWith('18:00');
    });
  });
});
