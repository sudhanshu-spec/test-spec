/**
 * @fileoverview Tests for DatePicker component
 * @module tests/features/booking/DatePicker
 * 
 * Comprehensive unit tests for the DatePicker component validating:
 * - Calendar rendering and display
 * - Date selection functionality
 * - Past date rejection
 * - Closed date handling
 * - Month navigation
 * - Keyboard accessibility
 * - Screen reader support via ARIA attributes
 * 
 * Tests follow AAA (Arrange, Act, Assert) pattern and use Vitest with
 * @testing-library/react for DOM assertions and @testing-library/user-event
 * for realistic user interactions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DatePicker } from '../DatePicker';
import { validDate, pastDate, closedDate } from '../../../__tests__/fixtures/bookings';
import { customRender } from '../../../__tests__/utils/render';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props interface for DatePicker component testing
 */
interface DatePickerTestProps {
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  closedDates?: string[];
  selectedDate?: Date;
  className?: string;
}

// ============================================================================
// Helper Functions
// Following the factory function pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Creates DatePicker props with default values that can be overridden.
 * Follows the createMockServer pattern from tests/lifecycle/server.test.js
 * @param overrides - Properties to override defaults
 * @returns Complete props object for DatePicker
 */
function createDatePickerProps(
  overrides: Partial<DatePickerTestProps> = {}
): DatePickerTestProps {
  return {
    onDateSelect: vi.fn(),
    ...overrides,
  };
}

/**
 * Custom render function for DatePicker with common setup.
 * @param props - Props to pass to DatePicker
 * @returns Render result with additional utilities
 */
function renderDatePicker(props: Partial<DatePickerTestProps> = {}) {
  const defaultProps = createDatePickerProps(props);
  return {
    ...render(<DatePicker {...defaultProps} />),
    props: defaultProps,
  };
}

/**
 * Formats a date to YYYY-MM-DD string format (matching component's internal format)
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets a date button by its day number in the current month view
 * @param day - Day number to find
 * @returns Button element for that day
 */
function getDateButton(day: number): HTMLElement | null {
  const buttons = screen.getAllByRole('gridcell');
  for (const button of buttons) {
    if (button.textContent === String(day) && button.tagName === 'BUTTON') {
      return button;
    }
  }
  return null;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('DatePicker', () => {
  const mockOnDateSelect = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock current date for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should render calendar component', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      expect(screen.getByRole('application', { name: /date picker calendar/i })).toBeInTheDocument();
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should display current month by default', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - January 2024 should be displayed (based on mocked date)
      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should show navigation controls for months', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      expect(screen.getByRole('button', { name: /go to previous month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to next month/i })).toBeInTheDocument();
    });

    it("should mark today's date visually", () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Day 15 should have today class
      const todayButton = getDateButton(15);
      expect(todayButton).toBeInTheDocument();
      expect(todayButton).toHaveClass('date-picker-cell--today');
    });

    it('should render day of week headers', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('should render all days of the current month', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - January has 31 days, but we need to count only button gridcells
      const dateButtons = screen.getAllByRole('gridcell').filter(
        (cell) => cell.tagName === 'BUTTON'
      );
      expect(dateButtons.length).toBe(31); // January has 31 days
    });

    it('should apply custom className when provided', () => {
      // Arrange & Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          className="custom-datepicker"
        />
      );

      // Assert
      const container = screen.getByRole('application', { name: /date picker calendar/i });
      expect(container).toHaveClass('custom-datepicker');
    });
  });

  // ==========================================================================
  // Date Selection Tests
  // ==========================================================================

  describe('date selection', () => {
    it('should allow selecting a future date', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Select January 20th (future date)
      const futureDate = getDateButton(20);
      expect(futureDate).not.toBeNull();
      fireEvent.click(futureDate!);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      expect(mockOnDateSelect).toHaveBeenCalledWith(expect.any(Date));
      
      // Verify the date is correct
      const selectedDate = mockOnDateSelect.mock.calls[0][0] as Date;
      expect(selectedDate.getDate()).toBe(20);
      expect(selectedDate.getMonth()).toBe(0); // January
      expect(selectedDate.getFullYear()).toBe(2024);
    });

    it('should emit selected date to parent via callback', () => {
      // Arrange
      const onDateSelect = vi.fn();
      render(<DatePicker onDateSelect={onDateSelect} />);

      // Act
      const dateButton = getDateButton(25);
      fireEvent.click(dateButton!);

      // Assert
      expect(onDateSelect).toHaveBeenCalledWith(expect.any(Date));
      const selectedDate = onDateSelect.mock.calls[0][0] as Date;
      expect(selectedDate.getDate()).toBe(25);
    });

    it('should highlight selected date', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const dateButton = getDateButton(20);
      fireEvent.click(dateButton!);

      // Assert
      expect(dateButton).toHaveClass('date-picker-cell--selected');
    });

    it('should support keyboard navigation with Enter key', () => {
      // Arrange
      const selectedDate = new Date('2024-01-20');
      render(
        <DatePicker 
          onDateSelect={mockOnDateSelect} 
          selectedDate={selectedDate}
        />
      );

      // Act - Focus on a date and press Enter
      const dateButton = getDateButton(20);
      dateButton?.focus();
      fireEvent.keyDown(dateButton!, { key: 'Enter', code: 'Enter' });

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
    });

    it('should support keyboard navigation with Space key', () => {
      // Arrange
      const selectedDate = new Date('2024-01-20');
      render(
        <DatePicker 
          onDateSelect={mockOnDateSelect} 
          selectedDate={selectedDate}
        />
      );

      // Act - Focus on a date and press Space
      const dateButton = getDateButton(20);
      dateButton?.focus();
      fireEvent.keyDown(dateButton!, { key: ' ', code: 'Space' });

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
    });

    it('should show pre-selected date when selectedDate prop is provided', () => {
      // Arrange
      const selectedDate = new Date('2024-01-20');

      // Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          selectedDate={selectedDate}
        />
      );

      // Assert
      const dateButton = getDateButton(20);
      expect(dateButton).toHaveClass('date-picker-cell--selected');
      expect(dateButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should update selection when clicking different dates', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Select first date
      const firstDate = getDateButton(20);
      fireEvent.click(firstDate!);

      // Select second date
      const secondDate = getDateButton(25);
      fireEvent.click(secondDate!);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalledTimes(2);
      expect(firstDate).not.toHaveClass('date-picker-cell--selected');
      expect(secondDate).toHaveClass('date-picker-cell--selected');
    });
  });

  // ==========================================================================
  // Past Date Validation Tests
  // ==========================================================================

  describe('past date validation', () => {
    it('should disable past dates', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Day 14 is in the past (today is 15th)
      const pastDateButton = getDateButton(14);
      expect(pastDateButton).toBeDisabled();
      expect(pastDateButton).toHaveClass('date-picker-cell--disabled');
    });

    it('should not emit date selection for past dates', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Try to click a past date
      const pastDateButton = getDateButton(10);
      // Click event should be ignored on disabled buttons
      fireEvent.click(pastDateButton!);

      // Assert
      expect(mockOnDateSelect).not.toHaveBeenCalled();
    });

    it('should display visual indicator for disabled dates', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      const pastDateButton = getDateButton(10);
      expect(pastDateButton).toHaveClass('date-picker-cell--disabled');
      expect(pastDateButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show unavailable label in ARIA for past dates', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      const pastDateButton = getDateButton(10);
      expect(pastDateButton).toHaveAttribute('aria-label', expect.stringContaining('Unavailable'));
    });

    it('should allow selecting today', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Click today (15th)
      const todayButton = getDateButton(15);
      fireEvent.click(todayButton!);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
      const selectedDate = mockOnDateSelect.mock.calls[0][0] as Date;
      expect(selectedDate.getDate()).toBe(15);
    });

    it('should respect custom minDate prop', () => {
      // Arrange - Set minDate to January 20th
      const minDate = new Date('2024-01-20');

      // Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          minDate={minDate}
        />
      );

      // Assert - Days 15-19 should be disabled even though they're after "today"
      expect(getDateButton(19)).toBeDisabled();
      expect(getDateButton(20)).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Closed Dates Handling Tests
  // ==========================================================================

  describe('closed dates handling', () => {
    it('should mark restaurant closed dates as unavailable', () => {
      // Arrange - Use the closedDate fixture
      const closedDates = [closedDate]; // Christmas next year

      // Set system time to December of the year from the fixture
      const closedDateYear = closedDate.split('-')[0];
      vi.setSystemTime(new Date(`${closedDateYear}-12-20T12:00:00`));

      // Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={closedDates}
        />
      );

      // Assert - Christmas (25th) should be disabled
      const christmasButton = getDateButton(25);
      expect(christmasButton).toBeDisabled();
      expect(christmasButton).toHaveClass('date-picker-cell--disabled');
    });

    it('should not allow selection of closed dates', () => {
      // Arrange - Extract year from the closedDate fixture (calculated at import time)
      const closedDateYear = closedDate.split('-')[0];
      vi.setSystemTime(new Date(`${closedDateYear}-12-20T12:00:00`));
      
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={[closedDate]}
        />
      );

      // Act - Try to click closed date
      const closedDateButton = getDateButton(25);
      fireEvent.click(closedDateButton!);

      // Assert
      expect(mockOnDateSelect).not.toHaveBeenCalled();
    });

    it('should display closed date indicator in ARIA label', () => {
      // Arrange - Extract year from the closedDate fixture (calculated at import time)
      const closedDateYear = closedDate.split('-')[0];
      vi.setSystemTime(new Date(`${closedDateYear}-12-20T12:00:00`));

      // Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={[closedDate]}
        />
      );

      // Assert
      const closedDateButton = getDateButton(25);
      expect(closedDateButton).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Restaurant closed')
      );
    });

    it('should handle multiple closed dates', () => {
      // Arrange
      vi.setSystemTime(new Date('2024-01-10T12:00:00'));
      const multipleClosed = ['2024-01-15', '2024-01-20', '2024-01-25'];

      // Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={multipleClosed}
        />
      );

      // Assert
      expect(getDateButton(15)).toBeDisabled();
      expect(getDateButton(20)).toBeDisabled();
      expect(getDateButton(25)).toBeDisabled();
      // Day 16 should still be available
      expect(getDateButton(16)).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Month Navigation Tests
  // ==========================================================================

  describe('month navigation', () => {
    it('should navigate to next month on forward click', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      fireEvent.click(nextButton);

      // Assert
      expect(screen.getByText('February')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should navigate to previous month on back click when allowed', () => {
      // Arrange - Navigate forward first, then back
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Navigate forward to February first
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      fireEvent.click(nextButton);
      expect(screen.getByText('February')).toBeInTheDocument();

      // Act - Now navigate back to January (current month, which is allowed)
      const prevButton = screen.getByRole('button', { name: /go to previous month/i });
      fireEvent.click(prevButton);

      // Assert - Should be back to January
      expect(screen.getByText('January')).toBeInTheDocument();
    });

    it('should not navigate to past months from current month', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Previous month button should be disabled
      const prevButton = screen.getByRole('button', { name: /go to previous month/i });
      expect(prevButton).toBeDisabled();
    });

    it('should allow navigation up to maxDate month', () => {
      // Arrange - Set maxDate to March
      const maxDate = new Date('2024-03-31');
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          maxDate={maxDate}
        />
      );

      // Act - Navigate to February
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      fireEvent.click(nextButton);
      expect(screen.getByText('February')).toBeInTheDocument();

      // Navigate to March
      fireEvent.click(nextButton);
      expect(screen.getByText('March')).toBeInTheDocument();

      // Next button should be disabled at maxDate month
      expect(nextButton).toBeDisabled();
    });

    it('should handle year transition when navigating forward', () => {
      // Arrange - Start in December
      vi.setSystemTime(new Date('2024-12-15T12:00:00'));
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      fireEvent.click(nextButton);

      // Assert
      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('2025')).toBeInTheDocument();
    });

    it('should handle year transition when navigating forward', () => {
      // Arrange - Start in December 2024, navigate forward to January 2025
      vi.setSystemTime(new Date('2024-12-15T12:00:00'));
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
        />
      );

      // Act - Navigate forward to January
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      fireEvent.click(nextButton);

      // Assert - Should show January 2025
      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('2025')).toBeInTheDocument();
    });

    it('should update ARIA label for month navigation buttons', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      const nextButton = screen.getByRole('button', { name: /go to next month, February 2024/i });
      expect(nextButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper ARIA labels for calendar', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      const calendar = screen.getByRole('application');
      expect(calendar).toHaveAttribute('aria-label', 'Date picker calendar');

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', expect.stringContaining('Calendar for January 2024'));
    });

    it('should support screen reader announcements for date changes', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Month/year display should have aria-live
      const monthYearDisplay = screen.getByText('January').parentElement;
      expect(monthYearDisplay).toHaveAttribute('aria-live', 'polite');
    });

    it('should have keyboard-accessible date cells', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Focus on a date button element
      const dateButton = getDateButton(20);
      dateButton?.focus();

      // Assert - A focusable element should receive focus
      const activeElement = document.activeElement;
      expect(activeElement?.tagName).toBe('BUTTON');
    });

    it('should indicate selected state via aria-selected', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const dateButton = getDateButton(20);
      fireEvent.click(dateButton!);

      // Assert
      expect(dateButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should indicate disabled state via aria-disabled', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      const pastDateButton = getDateButton(10);
      expect(pastDateButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have descriptive ARIA labels for each date cell', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Check today's date has proper label
      const todayButton = getDateButton(15);
      expect(todayButton).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Monday, January 15, 2024')
      );
      expect(todayButton).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Today')
      );
    });

    it('should have proper role attributes for grid structure', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('columnheader').length).toBe(7); // Days of week
    });

    it('should have screen reader instructions', () => {
      // Arrange & Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Check for sr-only instructions
      const instructions = screen.getByText(/Use arrow keys to navigate dates/i);
      expect(instructions).toBeInTheDocument();
    });

    it('should support keyboard arrow navigation', () => {
      // Arrange
      const selectedDate = new Date('2024-01-15');
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          selectedDate={selectedDate}
        />
      );

      // Act - Focus on selected date and navigate using keyboard
      const todayButton = getDateButton(15);
      todayButton?.focus();
      fireEvent.keyDown(todayButton!, { key: 'ArrowRight', code: 'ArrowRight' });

      // Assert - Should move to next day and select it
      expect(mockOnDateSelect).toHaveBeenCalled();
      const selectedDateResult = mockOnDateSelect.mock.calls[0][0] as Date;
      expect(selectedDateResult.getDate()).toBe(16);
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle month boundary date selection', () => {
      // Arrange - Navigate to last day of January
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const lastDayButton = getDateButton(31);
      fireEvent.click(lastDayButton!);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
      const selectedDate = mockOnDateSelect.mock.calls[0][0] as Date;
      expect(selectedDate.getDate()).toBe(31);
      expect(selectedDate.getMonth()).toBe(0); // January
    });

    it('should handle February correctly (non-leap year)', () => {
      // Arrange - Navigate to February 2025 (non-leap year)
      vi.setSystemTime(new Date('2025-02-15T12:00:00'));
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - February should have 28 days
      const dateButtons = screen.getAllByRole('gridcell').filter(
        (cell) => cell.tagName === 'BUTTON'
      );
      expect(dateButtons.length).toBe(28);
    });

    it('should handle leap year February correctly', () => {
      // Arrange - Navigate to February 2024 (leap year)
      vi.setSystemTime(new Date('2024-02-15T12:00:00'));
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - February should have 29 days
      const dateButtons = screen.getAllByRole('gridcell').filter(
        (cell) => cell.tagName === 'BUTTON'
      );
      expect(dateButtons.length).toBe(29);
    });

    it('should handle empty closedDates array', () => {
      // Arrange & Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={[]}
        />
      );

      // Assert - Future dates should be selectable
      const futureDate = getDateButton(20);
      expect(futureDate).not.toBeDisabled();
    });

    it('should handle undefined maxDate (no upper limit)', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Navigate many months forward
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      for (let i = 0; i < 12; i++) {
        fireEvent.click(nextButton);
      }

      // Assert - Should still be able to navigate
      expect(nextButton).not.toBeDisabled();
    });

    it('should handle dates crossing into next year', () => {
      // Arrange - Start in December
      vi.setSystemTime(new Date('2024-12-15T12:00:00'));
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Navigate to January next year and select a date
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      fireEvent.click(nextButton);
      
      const dateButton = getDateButton(10);
      fireEvent.click(dateButton!);

      // Assert
      const selectedDate = mockOnDateSelect.mock.calls[0][0] as Date;
      expect(selectedDate.getFullYear()).toBe(2025);
      expect(selectedDate.getMonth()).toBe(0); // January
    });

    it('should handle controlled vs uncontrolled mode', () => {
      // Arrange - Controlled mode with selectedDate prop
      const selectedDate = new Date('2024-01-20');
      const { rerender } = render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          selectedDate={selectedDate}
        />
      );

      // Assert initial selection
      expect(getDateButton(20)).toHaveClass('date-picker-cell--selected');

      // Act - Update selectedDate prop
      const newSelectedDate = new Date('2024-01-25');
      rerender(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          selectedDate={newSelectedDate}
        />
      );

      // Assert - Selection should follow prop
      expect(getDateButton(25)).toHaveClass('date-picker-cell--selected');
    });

    it('should handle invalid date in closedDates gracefully', () => {
      // Arrange & Act - Include invalid date format
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={['invalid-date', '2024-01-20', '']}
        />
      );

      // Assert - Valid closed date should still work
      expect(getDateButton(20)).toBeDisabled();
      // Component should not crash
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Performance Boundary Tests
  // ==========================================================================

  describe('performance boundaries', () => {
    it('should render calendar within acceptable time', () => {
      // Arrange
      const startTime = performance.now();

      // Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - Render should complete quickly (< 100ms)
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid month navigation', () => {
      // Arrange
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act - Rapidly click next month button
      const nextButton = screen.getByRole('button', { name: /go to next month/i });
      for (let i = 0; i < 10; i++) {
        fireEvent.click(nextButton);
      }

      // Assert - Should be at November 2024
      expect(screen.getByText('November')).toBeInTheDocument();
    });

    it('should handle many closed dates', () => {
      // Arrange - Create 30 closed dates
      const manyClosed: string[] = [];
      for (let i = 1; i <= 30; i++) {
        const day = String(i).padStart(2, '0');
        manyClosed.push(`2024-02-${day}`);
      }

      vi.setSystemTime(new Date('2024-02-01T12:00:00'));

      // Act
      const startTime = performance.now();
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={manyClosed}
        />
      );
      const endTime = performance.now();

      // Assert - Should still render quickly
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100);

      // All days in February should be disabled
      const dateButtons = screen.getAllByRole('gridcell').filter(
        (cell) => cell.tagName === 'BUTTON'
      );
      dateButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  // ==========================================================================
  // Integration with Fixtures Tests
  // ==========================================================================

  describe('integration with fixtures', () => {
    it('should work with validDate fixture', () => {
      // Arrange - validDate is 30 days in the future
      const validDateObj = new Date(validDate);
      vi.setSystemTime(new Date(validDateObj.getFullYear(), validDateObj.getMonth(), 1));
      
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const dateButton = getDateButton(validDateObj.getDate());
      fireEvent.click(dateButton!);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
    });

    it('should reject pastDate fixture', () => {
      // Arrange - pastDate is 7 days in the past
      const pastDateObj = new Date(pastDate);
      
      // Act
      render(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert - The past date should be in a past month
      // Since pastDate is 7 days ago, if we're on Jan 15, it would be Jan 8
      // which should be disabled
      const todayMinus7 = new Date('2024-01-08');
      const dateButton = getDateButton(todayMinus7.getDate());
      expect(dateButton).toBeDisabled();
    });

    it('should handle closedDate fixture', () => {
      // Arrange - closedDate is Christmas of next year (computed at import time with real date)
      // Extract the year from the actual closedDate fixture value
      const closedDateYear = closedDate.split('-')[0];
      vi.setSystemTime(new Date(`${closedDateYear}-12-20T12:00:00`));
      
      // Act
      render(
        <DatePicker
          onDateSelect={mockOnDateSelect}
          closedDates={[closedDate]}
        />
      );

      // Assert
      const christmasButton = getDateButton(25);
      expect(christmasButton).toBeDisabled();
      expect(christmasButton).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Restaurant closed')
      );
    });
  });

  // ==========================================================================
  // Custom Render Utility Tests
  // ==========================================================================

  describe('with customRender utility', () => {
    it('should render correctly with provider context', () => {
      // Arrange & Act
      customRender(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Assert
      expect(screen.getByRole('application', { name: /date picker calendar/i })).toBeInTheDocument();
    });

    it('should function correctly within provider tree', () => {
      // Arrange
      customRender(<DatePicker onDateSelect={mockOnDateSelect} />);

      // Act
      const dateButton = getDateButton(20);
      fireEvent.click(dateButton!);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
    });
  });
});
