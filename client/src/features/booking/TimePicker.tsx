/**
 * @fileoverview Time slot picker component for booking time selection
 * @module features/booking/TimePicker
 * 
 * This component displays available time slots for table reservations,
 * allowing users to select from available booking times. Features include:
 * - Time slot list rendering with visual availability indicators
 * - Capacity display showing remaining seats
 * - Disabled state for fully booked slots
 * - Loading state for async slot fetching
 * - Empty state when no slots are available
 * - Comprehensive accessibility support with ARIA labels
 */

import React from 'react';

/**
 * Represents a single time slot for booking
 */
export interface TimeSlot {
  /** Time string in 24-hour format (e.g., "18:00" or "18:30") */
  time: string;
  /** Whether this time slot is available for booking */
  available: boolean;
  /** Number of remaining seats/capacity available at this time */
  remainingCapacity: number;
}

/**
 * Props interface for the TimePicker component
 */
export interface TimePickerProps {
  /** Array of available time slots to display */
  slots: TimeSlot[];
  /** Callback function called when a time slot is selected */
  onTimeSelect: (time: string) => void;
  /** Currently selected time (for highlighting) */
  selectedTime?: string;
  /** Whether the component is in a loading state (fetching slots) */
  isLoading?: boolean;
  /** CSS class name for custom styling */
  className?: string;
}

/**
 * Formats a 24-hour time string to 12-hour format with AM/PM
 * @param time - Time string in 24-hour format (e.g., "18:00")
 * @returns Formatted time string (e.g., "6:00 PM")
 */
const formatTimeTo12Hour = (time: string): string => {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  
  if (isNaN(hour)) {
    return time;
  }
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}:${minute} ${period}`;
};

/**
 * Returns appropriate capacity label based on remaining capacity
 * @param capacity - Number of remaining seats
 * @returns Human-readable capacity description
 */
const getCapacityLabel = (capacity: number): string => {
  if (capacity <= 0) {
    return 'Fully booked';
  }
  if (capacity <= 2) {
    return `Only ${capacity} ${capacity === 1 ? 'seat' : 'seats'} left`;
  }
  if (capacity <= 5) {
    return `${capacity} seats available`;
  }
  return 'Good availability';
};

/**
 * Returns capacity indicator color class based on remaining capacity
 * @param capacity - Number of remaining seats
 * @param available - Whether the slot is available
 * @returns CSS class name for capacity styling
 */
const getCapacityColorClass = (capacity: number, available: boolean): string => {
  if (!available || capacity <= 0) {
    return 'time-picker__capacity--unavailable';
  }
  if (capacity <= 2) {
    return 'time-picker__capacity--low';
  }
  if (capacity <= 5) {
    return 'time-picker__capacity--medium';
  }
  return 'time-picker__capacity--high';
};

/**
 * TimePicker component for booking time selection
 * 
 * Displays available time slots for a selected date with capacity indicators.
 * Marks fully booked slots as unavailable and allows users to select
 * an available time slot. Includes comprehensive accessibility features.
 * 
 * @example
 * ```tsx
 * <TimePicker
 *   slots={[
 *     { time: '18:00', available: true, remainingCapacity: 10 },
 *     { time: '18:30', available: true, remainingCapacity: 3 },
 *     { time: '19:00', available: false, remainingCapacity: 0 }
 *   ]}
 *   onTimeSelect={(time) => console.log('Selected:', time)}
 *   selectedTime="18:00"
 * />
 * ```
 */
const TimePicker: React.FC<TimePickerProps> = ({
  slots,
  onTimeSelect,
  selectedTime,
  isLoading = false,
  className = ''
}) => {
  /**
   * Handles time slot button click
   * Only triggers selection for available slots
   * @param slot - The clicked time slot
   */
  const handleSlotClick = (slot: TimeSlot): void => {
    if (!slot.available) {
      return;
    }
    onTimeSelect(slot.time);
  };

  /**
   * Handles keyboard interaction for slot selection
   * Supports Enter and Space key activation
   * @param event - The keyboard event
   * @param slot - The time slot being interacted with
   */
  const handleSlotKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    slot: TimeSlot
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSlotClick(slot);
    }
  };

  /**
   * Determines if a slot is currently selected
   * @param slotTime - The time string to check
   * @returns True if the slot is selected
   */
  const isSlotSelected = (slotTime: string): boolean => {
    return selectedTime === slotTime;
  };

  /**
   * Generates CSS class names for a slot button
   * @param slot - The time slot
   * @returns Combined CSS class string
   */
  const getSlotButtonClasses = (slot: TimeSlot): string => {
    const classes = ['time-picker__slot'];
    
    if (isSlotSelected(slot.time)) {
      classes.push('time-picker__slot--selected');
    }
    
    if (!slot.available) {
      classes.push('time-picker__slot--unavailable');
    } else if (slot.remainingCapacity <= 2) {
      classes.push('time-picker__slot--limited');
    }
    
    return classes.join(' ');
  };

  /**
   * Generates ARIA label for a slot button
   * @param slot - The time slot
   * @returns Descriptive ARIA label
   */
  const getSlotAriaLabel = (slot: TimeSlot): string => {
    const formattedTime = formatTimeTo12Hour(slot.time);
    const capacityInfo = getCapacityLabel(slot.remainingCapacity);
    const selectionStatus = isSlotSelected(slot.time) ? ', currently selected' : '';
    const availabilityStatus = !slot.available ? ', unavailable' : '';
    
    return `${formattedTime}, ${capacityInfo}${selectionStatus}${availabilityStatus}`;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div 
        className={`time-picker time-picker--loading ${className}`.trim()}
        role="status"
        aria-label="Loading available time slots"
        aria-live="polite"
      >
        <div className="time-picker__loading-indicator">
          <span className="time-picker__spinner" aria-hidden="true"></span>
          <span className="time-picker__loading-text">
            Loading available times...
          </span>
        </div>
      </div>
    );
  }

  // Render empty state when no slots are available
  if (!slots || slots.length === 0) {
    return (
      <div 
        className={`time-picker time-picker--empty ${className}`.trim()}
        role="status"
        aria-live="polite"
      >
        <div className="time-picker__empty-state">
          <span className="time-picker__empty-icon" aria-hidden="true">
            🕐
          </span>
          <p className="time-picker__empty-message">
            No time slots available for this date.
          </p>
          <p className="time-picker__empty-hint">
            Please select a different date or contact us for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Count available slots for summary
  const availableCount = slots.filter(slot => slot.available).length;
  const totalCount = slots.length;

  return (
    <div 
      className={`time-picker ${className}`.trim()}
      role="group"
      aria-labelledby="time-picker-label"
    >
      <div className="time-picker__header">
        <span id="time-picker-label" className="time-picker__label">
          Select a time
        </span>
        <span className="time-picker__availability-summary" aria-live="polite">
          {availableCount} of {totalCount} {totalCount === 1 ? 'slot' : 'slots'} available
        </span>
      </div>
      
      <div 
        className="time-picker__grid"
        role="listbox"
        aria-label="Available time slots"
        aria-activedescendant={selectedTime ? `time-slot-${selectedTime}` : undefined}
      >
        {slots.map((slot) => (
          <button
            key={slot.time}
            id={`time-slot-${slot.time}`}
            type="button"
            className={getSlotButtonClasses(slot)}
            onClick={() => handleSlotClick(slot)}
            onKeyDown={(e) => handleSlotKeyDown(e, slot)}
            disabled={!slot.available}
            aria-label={getSlotAriaLabel(slot)}
            aria-selected={isSlotSelected(slot.time)}
            aria-disabled={!slot.available}
            role="option"
            tabIndex={slot.available ? 0 : -1}
          >
            <span className="time-picker__slot-time">
              {formatTimeTo12Hour(slot.time)}
            </span>
            <span 
              className={`time-picker__slot-capacity ${getCapacityColorClass(
                slot.remainingCapacity, 
                slot.available
              )}`}
              aria-hidden="true"
            >
              {getCapacityLabel(slot.remainingCapacity)}
            </span>
            {isSlotSelected(slot.time) && (
              <span className="time-picker__selected-indicator" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedTime && (
        <div className="time-picker__selection-info" aria-live="polite">
          <span className="time-picker__selection-label">Selected time:</span>
          <span className="time-picker__selection-value">
            {formatTimeTo12Hour(selectedTime)}
          </span>
        </div>
      )}

      {/* Screen reader announcements for dynamic updates */}
      <div className="sr-only" role="status" aria-live="assertive">
        {selectedTime && `Selected time: ${formatTimeTo12Hour(selectedTime)}`}
      </div>
    </div>
  );
};

// Component styles (inline for portability, can be extracted to CSS module)
const styles = `
  .time-picker {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    border-radius: 8px;
    background-color: #fff;
  }

  .time-picker__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .time-picker__label {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
  }

  .time-picker__availability-summary {
    font-size: 0.875rem;
    color: #666;
  }

  .time-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .time-picker__slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    min-height: 70px;
  }

  .time-picker__slot:hover:not(:disabled) {
    border-color: #4a90d9;
    background-color: #f0f7ff;
  }

  .time-picker__slot:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.3);
    border-color: #4a90d9;
  }

  .time-picker__slot--selected {
    border-color: #4a90d9;
    background-color: #e6f0fa;
  }

  .time-picker__slot--unavailable {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
    border-color: #ddd;
  }

  .time-picker__slot--limited {
    border-color: #f5a623;
  }

  .time-picker__slot-time {
    font-size: 1.125rem;
    font-weight: 600;
    color: #333;
  }

  .time-picker__slot-capacity {
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }

  .time-picker__capacity--high {
    color: #2e7d32;
  }

  .time-picker__capacity--medium {
    color: #f57c00;
  }

  .time-picker__capacity--low {
    color: #d32f2f;
    font-weight: 600;
  }

  .time-picker__capacity--unavailable {
    color: #9e9e9e;
  }

  .time-picker__selected-indicator {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: #4a90d9;
    font-weight: bold;
  }

  .time-picker__selection-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #e6f0fa;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .time-picker__selection-label {
    color: #666;
  }

  .time-picker__selection-value {
    font-weight: 600;
    color: #4a90d9;
  }

  .time-picker--loading,
  .time-picker--empty {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .time-picker__loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .time-picker__spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top-color: #4a90d9;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .time-picker__loading-text {
    color: #666;
    font-size: 0.875rem;
  }

  .time-picker__empty-state {
    text-align: center;
    padding: 2rem;
  }

  .time-picker__empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .time-picker__empty-message {
    font-size: 1rem;
    color: #333;
    margin: 0 0 0.5rem;
  }

  .time-picker__empty-hint {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 480px) {
    .time-picker__grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .time-picker__header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

export { TimePicker };
