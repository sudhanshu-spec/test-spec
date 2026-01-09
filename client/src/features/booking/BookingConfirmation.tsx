/**
 * @fileoverview Booking confirmation display component
 * @module features/booking/BookingConfirmation
 * 
 * This component displays booking confirmation details after a successful reservation.
 * It provides the user with their confirmation code, booking summary, and action buttons
 * for managing their reservation including copy to clipboard, add to calendar,
 * modify booking, and cancel reservation functionality.
 */

import React, { useState, useCallback } from 'react';

/**
 * Booking status type representing the current state of a reservation
 */
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show';

/**
 * Interface representing complete booking details for display
 */
export interface BookingDetails {
  /** Unique identifier for the booking */
  id: string;
  /** Human-readable confirmation code for reference */
  confirmationCode: string;
  /** Booking date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Booking time in HH:MM format */
  time: string;
  /** Number of guests for the reservation */
  partySize: number;
  /** Name of the person who made the booking */
  name: string;
  /** Contact phone number */
  phone: string;
  /** Optional contact email address */
  email?: string;
  /** Optional special requests or notes */
  specialRequests?: string;
  /** Current status of the booking */
  status: BookingStatus;
}

/**
 * Props interface for the BookingConfirmation component
 */
export interface BookingConfirmationProps {
  /** The booking details to display */
  booking: BookingDetails;
  /** Optional callback when user requests to cancel the booking */
  onCancel?: (bookingId: string) => void;
  /** Optional callback when user closes the confirmation view */
  onClose?: () => void;
  /** Optional callback when user requests to modify the booking */
  onModify?: (bookingId: string) => void;
}

/**
 * Configuration for cancellation deadline (hours before booking time)
 */
const CANCELLATION_DEADLINE_HOURS = 24;

/**
 * Returns the appropriate CSS class for the booking status badge
 * @param status - The current booking status
 * @returns CSS class name string for styling the status badge
 */
const getStatusBadgeClass = (status: BookingStatus): string => {
  const statusClasses: Record<BookingStatus, string> = {
    confirmed: 'booking-status--confirmed',
    cancelled: 'booking-status--cancelled',
    completed: 'booking-status--completed',
    'no-show': 'booking-status--no-show',
  };
  return `booking-status ${statusClasses[status]}`;
};

/**
 * Returns human-readable label for booking status
 * @param status - The current booking status
 * @returns Formatted status label
 */
const getStatusLabel = (status: BookingStatus): string => {
  const statusLabels: Record<BookingStatus, string> = {
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    'no-show': 'No Show',
  };
  return statusLabels[status];
};

/**
 * Formats a date string for display
 * @param dateString - Date in ISO format (YYYY-MM-DD)
 * @returns Formatted date string for user display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formats a time string for display
 * @param timeString - Time in HH:MM format
 * @returns Formatted time string for user display
 */
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Checks if cancellation is allowed based on deadline
 * @param date - Booking date in ISO format
 * @param time - Booking time in HH:MM format
 * @returns boolean indicating if cancellation is still allowed
 */
const isCancellationAllowed = (date: string, time: string): boolean => {
  const [hours, minutes] = time.split(':').map(Number);
  const bookingDateTime = new Date(date);
  bookingDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const deadlineTime = new Date(bookingDateTime.getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000);
  
  return now < deadlineTime;
};

/**
 * Generates an ICS calendar file content for the booking
 * @param booking - The booking details
 * @returns ICS file content as string
 */
const generateCalendarContent = (booking: BookingDetails): string => {
  const [hours, minutes] = booking.time.split(':').map(Number);
  const startDate = new Date(booking.date);
  startDate.setHours(hours, minutes, 0, 0);
  
  // Assume 2-hour reservation duration
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Burger Restaurant//Booking System//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@burger-restaurant.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:Restaurant Reservation - ${booking.partySize} guests`,
    `DESCRIPTION:Confirmation Code: ${booking.confirmationCode}\\nName: ${booking.name}\\nParty Size: ${booking.partySize}${booking.specialRequests ? `\\nSpecial Requests: ${booking.specialRequests}` : ''}`,
    'LOCATION:Burger Restaurant',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  
  return icsContent;
};

/**
 * BookingConfirmation Component
 * 
 * Displays booking confirmation details after a successful reservation.
 * Provides functionality to:
 * - View confirmation code and booking details
 * - Copy confirmation code to clipboard
 * - Add booking to calendar
 * - Modify booking (if status allows)
 * - Cancel booking (within cancellation deadline)
 * 
 * @param props - Component properties
 * @returns JSX element displaying the booking confirmation
 * 
 * @example
 * ```tsx
 * <BookingConfirmation
 *   booking={{
 *     id: '123',
 *     confirmationCode: 'BK-ABC123',
 *     date: '2024-03-15',
 *     time: '19:00',
 *     partySize: 4,
 *     name: 'John Doe',
 *     phone: '555-1234',
 *     status: 'confirmed'
 *   }}
 *   onCancel={(id) => console.log('Cancel booking:', id)}
 *   onClose={() => console.log('Close confirmation')}
 * />
 * ```
 */
export function BookingConfirmation({
  booking,
  onCancel,
  onClose,
  onModify,
}: BookingConfirmationProps): React.ReactElement {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  /**
   * Handles copying the confirmation code to clipboard
   */
  const handleCopyConfirmationCode = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(booking.confirmationCode);
      setCopySuccess(true);
      // Reset copy success message after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = booking.confirmationCode;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackError) {
        console.error('Failed to copy confirmation code:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  }, [booking.confirmationCode]);
  
  /**
   * Handles adding the booking to the user's calendar
   */
  const handleAddToCalendar = useCallback((): void => {
    try {
      setCalendarError(null);
      const icsContent = generateCalendarContent(booking);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `reservation-${booking.confirmationCode}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Failed to generate calendar file:', error);
      setCalendarError('Failed to generate calendar file. Please try again.');
    }
  }, [booking]);
  
  /**
   * Handles the cancel booking action with confirmation dialog
   */
  const handleCancelClick = useCallback((): void => {
    setShowCancelDialog(true);
  }, []);
  
  /**
   * Confirms the cancellation and calls the onCancel callback
   */
  const handleConfirmCancel = useCallback((): void => {
    setShowCancelDialog(false);
    if (onCancel) {
      onCancel(booking.id);
    }
  }, [booking.id, onCancel]);
  
  /**
   * Dismisses the cancel confirmation dialog
   */
  const handleDismissCancel = useCallback((): void => {
    setShowCancelDialog(false);
  }, []);
  
  /**
   * Handles the modify booking action
   */
  const handleModifyClick = useCallback((): void => {
    if (onModify) {
      onModify(booking.id);
    }
  }, [booking.id, onModify]);
  
  // Determine if modifications/cancellations are allowed based on status
  const canModify = booking.status === 'confirmed';
  const canCancel = booking.status === 'confirmed' && isCancellationAllowed(booking.date, booking.time);
  const cancellationDeadlinePassed = booking.status === 'confirmed' && !isCancellationAllowed(booking.date, booking.time);
  
  return (
    <div className="booking-confirmation" role="region" aria-labelledby="booking-confirmation-title">
      {/* Header Section */}
      <div className="booking-confirmation__header">
        <h2 id="booking-confirmation-title" className="booking-confirmation__title">
          {booking.status === 'confirmed' ? 'Booking Confirmed!' : 'Booking Details'}
        </h2>
        {onClose && (
          <button
            type="button"
            className="booking-confirmation__close-btn"
            onClick={onClose}
            aria-label="Close confirmation"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Confirmation Code Section */}
      <div className="booking-confirmation__code-section">
        <span className="booking-confirmation__code-label">Confirmation Code</span>
        <div className="booking-confirmation__code-container">
          <span className="booking-confirmation__code" data-testid="confirmation-code">
            {booking.confirmationCode}
          </span>
          <button
            type="button"
            className="booking-confirmation__copy-btn"
            onClick={handleCopyConfirmationCode}
            aria-label="Copy confirmation code to clipboard"
          >
            {copySuccess ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="booking-confirmation__status-section">
        <span
          className={getStatusBadgeClass(booking.status)}
          role="status"
          aria-label={`Booking status: ${getStatusLabel(booking.status)}`}
        >
          {getStatusLabel(booking.status)}
        </span>
      </div>
      
      {/* Booking Details Summary */}
      <div className="booking-confirmation__details" data-testid="booking-details">
        <dl className="booking-confirmation__details-list">
          <div className="booking-confirmation__detail-item">
            <dt className="booking-confirmation__detail-label">Date</dt>
            <dd className="booking-confirmation__detail-value" data-testid="booking-date">
              {formatDate(booking.date)}
            </dd>
          </div>
          
          <div className="booking-confirmation__detail-item">
            <dt className="booking-confirmation__detail-label">Time</dt>
            <dd className="booking-confirmation__detail-value" data-testid="booking-time">
              {formatTime(booking.time)}
            </dd>
          </div>
          
          <div className="booking-confirmation__detail-item">
            <dt className="booking-confirmation__detail-label">Party Size</dt>
            <dd className="booking-confirmation__detail-value" data-testid="booking-party-size">
              {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}
            </dd>
          </div>
          
          <div className="booking-confirmation__detail-item">
            <dt className="booking-confirmation__detail-label">Name</dt>
            <dd className="booking-confirmation__detail-value" data-testid="booking-name">
              {booking.name}
            </dd>
          </div>
          
          <div className="booking-confirmation__detail-item">
            <dt className="booking-confirmation__detail-label">Phone</dt>
            <dd className="booking-confirmation__detail-value" data-testid="booking-phone">
              {booking.phone}
            </dd>
          </div>
          
          {booking.email && (
            <div className="booking-confirmation__detail-item">
              <dt className="booking-confirmation__detail-label">Email</dt>
              <dd className="booking-confirmation__detail-value" data-testid="booking-email">
                {booking.email}
              </dd>
            </div>
          )}
          
          {booking.specialRequests && (
            <div className="booking-confirmation__detail-item booking-confirmation__detail-item--full-width">
              <dt className="booking-confirmation__detail-label">Special Requests</dt>
              <dd className="booking-confirmation__detail-value" data-testid="booking-special-requests">
                {booking.specialRequests}
              </dd>
            </div>
          )}
        </dl>
      </div>
      
      {/* Calendar Error Display */}
      {calendarError && (
        <div className="booking-confirmation__error" role="alert">
          {calendarError}
        </div>
      )}
      
      {/* Cancellation Deadline Warning */}
      {cancellationDeadlinePassed && (
        <div className="booking-confirmation__warning" role="alert">
          The cancellation deadline has passed. Bookings must be cancelled at least {CANCELLATION_DEADLINE_HOURS} hours before the reservation time.
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="booking-confirmation__actions">
        <button
          type="button"
          className="booking-confirmation__action-btn booking-confirmation__action-btn--calendar"
          onClick={handleAddToCalendar}
          aria-label="Add booking to calendar"
        >
          📅 Add to Calendar
        </button>
        
        {canModify && onModify && (
          <button
            type="button"
            className="booking-confirmation__action-btn booking-confirmation__action-btn--modify"
            onClick={handleModifyClick}
            aria-label="Modify booking"
          >
            ✏️ Modify Booking
          </button>
        )}
        
        {onCancel && (
          <button
            type="button"
            className="booking-confirmation__action-btn booking-confirmation__action-btn--cancel"
            onClick={handleCancelClick}
            disabled={!canCancel}
            aria-label={canCancel ? 'Cancel booking' : 'Cancellation not available'}
            title={!canCancel ? `Cancellation deadline has passed` : undefined}
          >
            ❌ Cancel Booking
          </button>
        )}
      </div>
      
      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div
          className="booking-confirmation__dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className="booking-confirmation__dialog">
            <h3 id="cancel-dialog-title" className="booking-confirmation__dialog-title">
              Cancel Booking?
            </h3>
            <p className="booking-confirmation__dialog-message">
              Are you sure you want to cancel your reservation for {formatDate(booking.date)} at {formatTime(booking.time)}?
              This action cannot be undone.
            </p>
            <div className="booking-confirmation__dialog-actions">
              <button
                type="button"
                className="booking-confirmation__dialog-btn booking-confirmation__dialog-btn--secondary"
                onClick={handleDismissCancel}
                aria-label="Keep booking"
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="booking-confirmation__dialog-btn booking-confirmation__dialog-btn--danger"
                onClick={handleConfirmCancel}
                aria-label="Confirm cancellation"
              >
                Yes, Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export types for external use
export type { BookingConfirmationProps, BookingDetails, BookingStatus };
