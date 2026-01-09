/**
 * @fileoverview Date picker component for booking date selection
 * @module features/booking/DatePicker
 * 
 * This component provides a calendar interface for selecting reservation dates
 * in the table booking system. It supports:
 * - Month/year navigation
 * - Past date prevention
 * - Closed date detection
 * - Accessibility features for keyboard navigation and screen readers
 */

import React, { useState } from 'react';

/**
 * Props interface for the DatePicker component
 */
export interface DatePickerProps {
  /** Callback function called when a date is selected */
  onDateSelect: (date: Date) => void;
  /** Minimum selectable date (defaults to today) */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Array of date strings (YYYY-MM-DD format) representing closed/unavailable dates */
  closedDates?: string[];
  /** Currently selected date */
  selectedDate?: Date;
  /** CSS class name for custom styling */
  className?: string;
}

/**
 * Days of the week header labels
 */
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Month names for display
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a Date object to YYYY-MM-DD string format
 * @param date - The date to format
 * @returns Formatted date string
 */
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Checks if two dates represent the same calendar day
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns True if dates are the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Gets the start of day for a given date (midnight)
 * @param date - The date to normalize
 * @returns New date set to midnight
 */
const getStartOfDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Gets the number of days in a given month
 * @param year - The year
 * @param month - The month (0-indexed)
 * @returns Number of days in the month
 */
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Gets the day of the week (0-6, Sunday-Saturday) for the first day of a month
 * @param year - The year
 * @param month - The month (0-indexed)
 * @returns Day of week for the first day
 */
const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/**
 * DatePicker component for booking date selection
 * 
 * Renders a calendar interface allowing users to select future dates
 * while preventing selection of past dates and closed days.
 * Includes comprehensive accessibility features for keyboard navigation
 * and screen reader support.
 * 
 * @example
 * ```tsx
 * <DatePicker
 *   onDateSelect={(date) => console.log('Selected:', date)}
 *   closedDates={['2024-12-25', '2024-12-26']}
 *   minDate={new Date()}
 * />
 * ```
 */
const DatePicker: React.FC<DatePickerProps> = ({
  onDateSelect,
  minDate,
  maxDate,
  closedDates = [],
  selectedDate,
  className = ''
}) => {
  // Get today's date normalized to midnight
  const today = getStartOfDay(new Date());
  
  // Effective minimum date is the later of provided minDate or today
  const effectiveMinDate = minDate ? getStartOfDay(minDate) : today;
  if (effectiveMinDate < today) {
    effectiveMinDate.setTime(today.getTime());
  }

  // State for the currently displayed month/year
  const [displayMonth, setDisplayMonth] = useState<number>(
    selectedDate?.getMonth() ?? today.getMonth()
  );
  const [displayYear, setDisplayYear] = useState<number>(
    selectedDate?.getFullYear() ?? today.getFullYear()
  );

  // Internal state for selected date (controlled by parent if selectedDate prop is provided)
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(
    selectedDate || null
  );

  // Use provided selectedDate or internal state
  const currentSelectedDate = selectedDate ?? internalSelectedDate;

  /**
   * Checks if a given date is disabled (past, closed, or out of range)
   * @param date - The date to check
   * @returns True if the date should be disabled
   */
  const isDateDisabled = (date: Date): boolean => {
    const normalizedDate = getStartOfDay(date);
    
    // Check if date is before minimum date
    if (normalizedDate < effectiveMinDate) {
      return true;
    }

    // Check if date is after maximum date
    if (maxDate && normalizedDate > getStartOfDay(maxDate)) {
      return true;
    }

    // Check if date is in the closed dates list
    const dateString = formatDateToString(date);
    if (closedDates.includes(dateString)) {
      return true;
    }

    return false;
  };

  /**
   * Checks if the date is today
   * @param date - The date to check
   * @returns True if the date is today
   */
  const isToday = (date: Date): boolean => {
    return isSameDay(date, today);
  };

  /**
   * Checks if the date is currently selected
   * @param date - The date to check
   * @returns True if the date is selected
   */
  const isSelected = (date: Date): boolean => {
    return currentSelectedDate ? isSameDay(date, currentSelectedDate) : false;
  };

  /**
   * Handles date selection when user clicks on a date cell
   * @param date - The selected date
   */
  const handleDateClick = (date: Date): void => {
    if (isDateDisabled(date)) {
      return;
    }

    setInternalSelectedDate(date);
    onDateSelect(date);
  };

  /**
   * Navigates to the previous month
   */
  const handlePreviousMonth = (): void => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  /**
   * Navigates to the next month
   */
  const handleNextMonth = (): void => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  /**
   * Checks if the previous month button should be disabled
   * @returns True if navigation to previous month should be disabled
   */
  const isPreviousMonthDisabled = (): boolean => {
    const firstDayOfDisplayedMonth = new Date(displayYear, displayMonth, 1);
    return firstDayOfDisplayedMonth <= effectiveMinDate;
  };

  /**
   * Checks if the next month button should be disabled
   * @returns True if navigation to next month should be disabled
   */
  const isNextMonthDisabled = (): boolean => {
    if (!maxDate) {
      return false;
    }
    const lastDayOfDisplayedMonth = new Date(displayYear, displayMonth + 1, 0);
    return lastDayOfDisplayedMonth >= getStartOfDay(maxDate);
  };

  /**
   * Handles keyboard navigation within the calendar
   * @param event - Keyboard event
   * @param date - The date associated with the focused cell
   */
  const handleKeyDown = (event: React.KeyboardEvent, date: Date): void => {
    let newDate: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        newDate = new Date(date);
        newDate.setDate(date.getDate() - 1);
        break;
      case 'ArrowRight':
        newDate = new Date(date);
        newDate.setDate(date.getDate() + 1);
        break;
      case 'ArrowUp':
        newDate = new Date(date);
        newDate.setDate(date.getDate() - 7);
        break;
      case 'ArrowDown':
        newDate = new Date(date);
        newDate.setDate(date.getDate() + 7);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleDateClick(date);
        return;
      default:
        return;
    }

    if (newDate && !isDateDisabled(newDate)) {
      event.preventDefault();
      // Update display month/year if navigating to different month
      if (newDate.getMonth() !== displayMonth || newDate.getFullYear() !== displayYear) {
        setDisplayMonth(newDate.getMonth());
        setDisplayYear(newDate.getFullYear());
      }
      handleDateClick(newDate);
    }
  };

  /**
   * Generates the calendar grid cells for the current display month
   * @returns Array of date cells to render
   */
  const generateCalendarCells = (): (Date | null)[] => {
    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDayOfMonth = getFirstDayOfMonth(displayYear, displayMonth);
    const cells: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(null);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(displayYear, displayMonth, day));
    }

    return cells;
  };

  /**
   * Gets the appropriate CSS classes for a date cell
   * @param date - The date for the cell
   * @returns CSS class string
   */
  const getDateCellClasses = (date: Date): string => {
    const classes = ['date-picker-cell'];

    if (isDateDisabled(date)) {
      classes.push('date-picker-cell--disabled');
    } else {
      classes.push('date-picker-cell--enabled');
    }

    if (isToday(date)) {
      classes.push('date-picker-cell--today');
    }

    if (isSelected(date)) {
      classes.push('date-picker-cell--selected');
    }

    return classes.join(' ');
  };

  /**
   * Gets the ARIA label for a date cell
   * @param date - The date for the cell
   * @returns ARIA label string
   */
  const getDateAriaLabel = (date: Date): string => {
    const dateString = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const labels = [dateString];

    if (isToday(date)) {
      labels.push('Today');
    }

    if (isSelected(date)) {
      labels.push('Selected');
    }

    if (isDateDisabled(date)) {
      if (closedDates.includes(formatDateToString(date))) {
        labels.push('Restaurant closed');
      } else {
        labels.push('Unavailable');
      }
    }

    return labels.join(', ');
  };

  const calendarCells = generateCalendarCells();

  return (
    <div 
      className={`date-picker ${className}`.trim()}
      role="application"
      aria-label="Date picker calendar"
    >
      {/* Calendar Header with Month/Year and Navigation */}
      <div className="date-picker-header">
        <button
          type="button"
          className="date-picker-nav-button date-picker-nav-button--prev"
          onClick={handlePreviousMonth}
          disabled={isPreviousMonthDisabled()}
          aria-label={`Go to previous month, ${MONTH_NAMES[(displayMonth + 11) % 12]} ${displayMonth === 0 ? displayYear - 1 : displayYear}`}
        >
          <span aria-hidden="true">&lt;</span>
        </button>

        <div 
          className="date-picker-month-year"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="date-picker-month">{MONTH_NAMES[displayMonth]}</span>
          <span className="date-picker-year">{displayYear}</span>
        </div>

        <button
          type="button"
          className="date-picker-nav-button date-picker-nav-button--next"
          onClick={handleNextMonth}
          disabled={isNextMonthDisabled()}
          aria-label={`Go to next month, ${MONTH_NAMES[(displayMonth + 1) % 12]} ${displayMonth === 11 ? displayYear + 1 : displayYear}`}
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div 
        className="date-picker-calendar"
        role="grid"
        aria-label={`Calendar for ${MONTH_NAMES[displayMonth]} ${displayYear}`}
      >
        {/* Days of Week Header Row */}
        <div className="date-picker-weekdays" role="row">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="date-picker-weekday"
              role="columnheader"
              aria-label={day}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Date Cells */}
        <div className="date-picker-dates" role="rowgroup">
          {/* Group cells into weeks for proper grid semantics */}
          {Array.from({ length: Math.ceil(calendarCells.length / 7) }, (_, weekIndex) => (
            <div key={weekIndex} className="date-picker-week" role="row">
              {calendarCells.slice(weekIndex * 7, (weekIndex + 1) * 7).map((date, cellIndex) => {
                const key = date ? formatDateToString(date) : `empty-${weekIndex}-${cellIndex}`;
                
                if (!date) {
                  return (
                    <div
                      key={key}
                      className="date-picker-cell date-picker-cell--empty"
                      role="gridcell"
                      aria-hidden="true"
                    />
                  );
                }

                const disabled = isDateDisabled(date);
                const selected = isSelected(date);

                return (
                  <button
                    key={key}
                    type="button"
                    className={getDateCellClasses(date)}
                    role="gridcell"
                    aria-label={getDateAriaLabel(date)}
                    aria-selected={selected}
                    aria-disabled={disabled}
                    disabled={disabled}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => handleDateClick(date)}
                    onKeyDown={(e) => handleKeyDown(e, date)}
                  >
                    <span className="date-picker-cell-content">
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility Instructions (visually hidden but available to screen readers) */}
      <div className="sr-only" aria-live="polite">
        Use arrow keys to navigate dates. Press Enter or Space to select a date.
      </div>
    </div>
  );
};

export { DatePicker };
export type { DatePickerProps };
