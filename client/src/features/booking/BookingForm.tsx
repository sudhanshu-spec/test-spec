/**
 * @fileoverview Table booking form component for restaurant reservations
 * @module features/booking/BookingForm
 * 
 * This component provides a comprehensive table booking form for restaurant
 * reservations. It orchestrates date/time selection, party size input,
 * guest information collection, and form submission with validation.
 * 
 * Features:
 * - Date selection via integrated DatePicker component
 * - Time slot selection via integrated TimePicker component
 * - Party size input with validation (1-20 guests)
 * - Guest information fields (name, phone, email)
 * - Special requests textarea
 * - Comprehensive form validation
 * - Loading state during submission
 * - Error display for validation and API errors
 * - Success callback with booking confirmation
 * - Accessibility support with ARIA labels
 */

import React, { useState, FormEvent } from 'react';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import type { TimeSlot } from './TimePicker';

/**
 * Booking confirmation data returned after successful submission
 */
export interface BookingConfirmation {
  /** Unique confirmation code for the booking */
  confirmationCode: string;
  /** Date of the reservation (YYYY-MM-DD format) */
  date: string;
  /** Time of the reservation (HH:MM format) */
  time: string;
  /** Number of guests */
  partySize: number;
  /** Name of the guest who made the booking */
  name: string;
}

/**
 * Form data structure for booking submissions
 */
export interface BookingFormData {
  /** Selected date in YYYY-MM-DD format */
  date: string;
  /** Selected time slot in HH:MM format */
  time: string;
  /** Number of guests (1-20) */
  partySize: number;
  /** Guest name (required) */
  name: string;
  /** Guest phone number (required) */
  phone: string;
  /** Guest email address (optional) */
  email?: string;
  /** Special requests or notes (optional) */
  specialRequests?: string;
}

/**
 * Props interface for the BookingForm component
 */
export interface BookingFormProps {
  /** Callback function called when booking is successfully completed */
  onBookingComplete?: (booking: BookingConfirmation) => void;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Optional minimum date for booking (defaults to today) */
  minDate?: Date;
  /** Optional maximum date for booking */
  maxDate?: Date;
  /** Optional array of closed dates (YYYY-MM-DD format) */
  closedDates?: string[];
}

/**
 * Form validation errors interface
 */
interface FormErrors {
  date?: string;
  time?: string;
  partySize?: string;
  name?: string;
  phone?: string;
  email?: string;
  general?: string;
}

/**
 * Minimum party size allowed
 */
const MIN_PARTY_SIZE = 1;

/**
 * Maximum party size allowed
 */
const MAX_PARTY_SIZE = 20;

/**
 * Phone number validation regex - accepts various formats
 * Supports: (123) 456-7890, 123-456-7890, 1234567890, +1234567890
 */
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Generates a random confirmation code
 * @returns 8-character alphanumeric confirmation code
 */
const generateConfirmationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Simulates fetching available time slots for a given date
 * In production, this would call the actual API
 * @param date - The selected date
 * @returns Promise resolving to array of time slots
 */
const fetchTimeSlots = async (date: string): Promise<TimeSlot[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate sample time slots for demonstration
  // In production, this would be an actual API call
  const slots: TimeSlot[] = [
    { time: '11:00', available: true, remainingCapacity: 10 },
    { time: '11:30', available: true, remainingCapacity: 8 },
    { time: '12:00', available: true, remainingCapacity: 5 },
    { time: '12:30', available: true, remainingCapacity: 3 },
    { time: '13:00', available: true, remainingCapacity: 12 },
    { time: '13:30', available: false, remainingCapacity: 0 },
    { time: '17:00', available: true, remainingCapacity: 15 },
    { time: '17:30', available: true, remainingCapacity: 10 },
    { time: '18:00', available: true, remainingCapacity: 4 },
    { time: '18:30', available: true, remainingCapacity: 2 },
    { time: '19:00', available: true, remainingCapacity: 8 },
    { time: '19:30', available: true, remainingCapacity: 6 },
    { time: '20:00', available: true, remainingCapacity: 10 },
    { time: '20:30', available: false, remainingCapacity: 0 },
    { time: '21:00', available: true, remainingCapacity: 12 },
  ];
  
  return slots;
};

/**
 * Simulates creating a booking via API
 * In production, this would call the actual API
 * @param data - The booking form data
 * @returns Promise resolving to booking confirmation
 */
const createBooking = async (data: BookingFormData): Promise<BookingConfirmation> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In production, this would be an actual API call
  // For now, return a simulated confirmation
  return {
    confirmationCode: generateConfirmationCode(),
    date: data.date,
    time: data.time,
    partySize: data.partySize,
    name: data.name,
  };
};

/**
 * BookingForm component for table reservation
 * 
 * Provides a complete booking form with date/time selection, party size input,
 * guest information collection, and form validation. Includes loading states
 * and error handling.
 * 
 * @example
 * ```tsx
 * <BookingForm
 *   onBookingComplete={(booking) => {
 *     console.log('Booking confirmed:', booking.confirmationCode);
 *   }}
 *   minDate={new Date()}
 *   closedDates={['2024-12-25', '2024-12-26']}
 * />
 * ```
 */
const BookingForm: React.FC<BookingFormProps> = ({
  onBookingComplete,
  className = '',
  minDate,
  maxDate,
  closedDates = [],
}) => {
  // Form field states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(2);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');
  
  // UI states
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  /**
   * Handles date selection from DatePicker component
   * Fetches available time slots for the selected date
   * @param date - The selected date
   */
  const handleDateSelect = async (date: Date): Promise<void> => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time selection when date changes
    setErrors(prev => ({ ...prev, date: undefined, time: undefined }));
    
    // Fetch available time slots for the selected date
    const dateString = formatDateToString(date);
    setIsLoadingSlots(true);
    
    try {
      const slots = await fetchTimeSlots(dateString);
      setTimeSlots(slots);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: 'Failed to load available time slots. Please try again.',
      }));
      setTimeSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  /**
   * Handles time slot selection from TimePicker component
   * @param time - The selected time slot
   */
  const handleTimeSelect = (time: string): void => {
    setSelectedTime(time);
    setErrors(prev => ({ ...prev, time: undefined }));
  };

  /**
   * Handles party size input change with validation
   * @param event - The input change event
   */
  const handlePartySizeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(event.target.value, 10);
    
    if (isNaN(value)) {
      setPartySize(MIN_PARTY_SIZE);
    } else if (value < MIN_PARTY_SIZE) {
      setPartySize(MIN_PARTY_SIZE);
    } else if (value > MAX_PARTY_SIZE) {
      setPartySize(MAX_PARTY_SIZE);
    } else {
      setPartySize(value);
    }
    
    setErrors(prev => ({ ...prev, partySize: undefined }));
  };

  /**
   * Handles name input change
   * @param event - The input change event
   */
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
    setErrors(prev => ({ ...prev, name: undefined }));
  };

  /**
   * Handles phone input change
   * @param event - The input change event
   */
  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setPhone(event.target.value);
    setErrors(prev => ({ ...prev, phone: undefined }));
  };

  /**
   * Handles email input change
   * @param event - The input change event
   */
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.target.value);
    setErrors(prev => ({ ...prev, email: undefined }));
  };

  /**
   * Handles special requests textarea change
   * @param event - The textarea change event
   */
  const handleSpecialRequestsChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setSpecialRequests(event.target.value);
  };

  /**
   * Validates the entire form and returns validation errors
   * @returns Object containing validation errors, empty if valid
   */
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Validate date
    if (!selectedDate) {
      newErrors.date = 'Please select a date for your reservation.';
    }

    // Validate time
    if (!selectedTime) {
      newErrors.time = 'Please select a time slot for your reservation.';
    }

    // Validate party size
    if (partySize < MIN_PARTY_SIZE || partySize > MAX_PARTY_SIZE) {
      newErrors.partySize = `Party size must be between ${MIN_PARTY_SIZE} and ${MAX_PARTY_SIZE} guests.`;
    }

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Please enter your name.';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long.';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Name must be less than 100 characters.';
    }

    // Validate phone
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      newErrors.phone = 'Please enter your phone number.';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      newErrors.phone = 'Please enter a valid phone number.';
    }

    // Validate email (optional but must be valid if provided)
    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    return newErrors;
  };

  /**
   * Handles form submission
   * Validates form, makes API call, and handles response
   * @param event - The form submit event
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    
    // Clear previous errors
    setErrors({});
    setSubmitSuccess(false);

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Prepare booking data
    const bookingData: BookingFormData = {
      date: selectedDate ? formatDateToString(selectedDate) : '',
      time: selectedTime,
      partySize,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      specialRequests: specialRequests.trim() || undefined,
    };

    // Submit booking
    setIsSubmitting(true);

    try {
      const confirmation = await createBooking(bookingData);
      setSubmitSuccess(true);
      
      // Call the onBookingComplete callback if provided
      if (onBookingComplete) {
        onBookingComplete(confirmation);
      }
      
      // Reset form after successful submission
      setSelectedDate(null);
      setSelectedTime('');
      setPartySize(2);
      setName('');
      setPhone('');
      setEmail('');
      setSpecialRequests('');
      setTimeSlots([]);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.';
      
      setErrors({
        general: `Failed to create booking: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Checks if the form can be submitted
   * @returns True if all required fields are filled
   */
  const canSubmit = (): boolean => {
    return (
      selectedDate !== null &&
      selectedTime !== '' &&
      partySize >= MIN_PARTY_SIZE &&
      partySize <= MAX_PARTY_SIZE &&
      name.trim().length >= 2 &&
      PHONE_REGEX.test(phone.trim()) &&
      !isSubmitting &&
      !isLoadingSlots
    );
  };

  /**
   * Formats selected date for display
   * @returns Formatted date string or placeholder
   */
  const getFormattedSelectedDate = (): string => {
    if (!selectedDate) {
      return 'No date selected';
    }
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={`booking-form-container ${className}`.trim()}>
      <form 
        className="booking-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Table booking form"
      >
        <h2 className="booking-form__title">Reserve a Table</h2>
        
        {/* General error message */}
        {errors.general && (
          <div 
            className="booking-form__error booking-form__error--general"
            role="alert"
            aria-live="assertive"
          >
            <span className="booking-form__error-icon" aria-hidden="true">⚠️</span>
            {errors.general}
          </div>
        )}

        {/* Success message */}
        {submitSuccess && (
          <div 
            className="booking-form__success"
            role="status"
            aria-live="polite"
          >
            <span className="booking-form__success-icon" aria-hidden="true">✓</span>
            Your reservation has been submitted successfully!
          </div>
        )}

        {/* Date Selection Section */}
        <fieldset className="booking-form__section">
          <legend className="booking-form__section-title">
            Select Date
          </legend>
          
          <DatePicker
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate || undefined}
            minDate={minDate}
            maxDate={maxDate}
            closedDates={closedDates}
            className="booking-form__date-picker"
          />
          
          {selectedDate && (
            <p className="booking-form__selection-info" aria-live="polite">
              Selected: {getFormattedSelectedDate()}
            </p>
          )}
          
          {errors.date && (
            <span className="booking-form__field-error" role="alert">
              {errors.date}
            </span>
          )}
        </fieldset>

        {/* Time Selection Section */}
        <fieldset className="booking-form__section">
          <legend className="booking-form__section-title">
            Select Time
          </legend>
          
          {selectedDate ? (
            <TimePicker
              slots={timeSlots}
              onTimeSelect={handleTimeSelect}
              selectedTime={selectedTime}
              isLoading={isLoadingSlots}
              className="booking-form__time-picker"
            />
          ) : (
            <p className="booking-form__hint">
              Please select a date first to see available time slots.
            </p>
          )}
          
          {errors.time && (
            <span className="booking-form__field-error" role="alert">
              {errors.time}
            </span>
          )}
        </fieldset>

        {/* Party Size Section */}
        <fieldset className="booking-form__section">
          <legend className="booking-form__section-title">
            Party Size
          </legend>
          
          <div className="booking-form__field">
            <label 
              htmlFor="party-size"
              className="booking-form__label"
            >
              Number of guests
            </label>
            <input
              type="number"
              id="party-size"
              name="partySize"
              className={`booking-form__input booking-form__input--number ${
                errors.partySize ? 'booking-form__input--error' : ''
              }`}
              value={partySize}
              onChange={handlePartySizeChange}
              min={MIN_PARTY_SIZE}
              max={MAX_PARTY_SIZE}
              required
              aria-describedby="party-size-hint party-size-error"
              aria-invalid={errors.partySize ? 'true' : 'false'}
            />
            <span id="party-size-hint" className="booking-form__hint">
              {MIN_PARTY_SIZE} to {MAX_PARTY_SIZE} guests
            </span>
            {errors.partySize && (
              <span 
                id="party-size-error"
                className="booking-form__field-error" 
                role="alert"
              >
                {errors.partySize}
              </span>
            )}
          </div>
        </fieldset>

        {/* Guest Information Section */}
        <fieldset className="booking-form__section">
          <legend className="booking-form__section-title">
            Guest Information
          </legend>
          
          {/* Name Field */}
          <div className="booking-form__field">
            <label 
              htmlFor="guest-name"
              className="booking-form__label"
            >
              Name <span className="booking-form__required">*</span>
            </label>
            <input
              type="text"
              id="guest-name"
              name="name"
              className={`booking-form__input ${
                errors.name ? 'booking-form__input--error' : ''
              }`}
              value={name}
              onChange={handleNameChange}
              required
              autoComplete="name"
              placeholder="Enter your full name"
              aria-describedby="name-error"
              aria-invalid={errors.name ? 'true' : 'false'}
              maxLength={100}
            />
            {errors.name && (
              <span 
                id="name-error"
                className="booking-form__field-error" 
                role="alert"
              >
                {errors.name}
              </span>
            )}
          </div>
          
          {/* Phone Field */}
          <div className="booking-form__field">
            <label 
              htmlFor="guest-phone"
              className="booking-form__label"
            >
              Phone <span className="booking-form__required">*</span>
            </label>
            <input
              type="tel"
              id="guest-phone"
              name="phone"
              className={`booking-form__input ${
                errors.phone ? 'booking-form__input--error' : ''
              }`}
              value={phone}
              onChange={handlePhoneChange}
              required
              autoComplete="tel"
              placeholder="(123) 456-7890"
              aria-describedby="phone-hint phone-error"
              aria-invalid={errors.phone ? 'true' : 'false'}
            />
            <span id="phone-hint" className="booking-form__hint">
              We'll contact you if we need to reach you about your reservation.
            </span>
            {errors.phone && (
              <span 
                id="phone-error"
                className="booking-form__field-error" 
                role="alert"
              >
                {errors.phone}
              </span>
            )}
          </div>
          
          {/* Email Field (Optional) */}
          <div className="booking-form__field">
            <label 
              htmlFor="guest-email"
              className="booking-form__label"
            >
              Email <span className="booking-form__optional">(optional)</span>
            </label>
            <input
              type="email"
              id="guest-email"
              name="email"
              className={`booking-form__input ${
                errors.email ? 'booking-form__input--error' : ''
              }`}
              value={email}
              onChange={handleEmailChange}
              autoComplete="email"
              placeholder="your@email.com"
              aria-describedby="email-hint email-error"
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            <span id="email-hint" className="booking-form__hint">
              We'll send your confirmation to this email.
            </span>
            {errors.email && (
              <span 
                id="email-error"
                className="booking-form__field-error" 
                role="alert"
              >
                {errors.email}
              </span>
            )}
          </div>
        </fieldset>

        {/* Special Requests Section */}
        <fieldset className="booking-form__section">
          <legend className="booking-form__section-title">
            Special Requests
          </legend>
          
          <div className="booking-form__field">
            <label 
              htmlFor="special-requests"
              className="booking-form__label"
            >
              Additional notes <span className="booking-form__optional">(optional)</span>
            </label>
            <textarea
              id="special-requests"
              name="specialRequests"
              className="booking-form__textarea"
              value={specialRequests}
              onChange={handleSpecialRequestsChange}
              rows={4}
              placeholder="Any special dietary requirements, celebrations, or seating preferences..."
              aria-describedby="special-requests-hint"
              maxLength={500}
            />
            <span id="special-requests-hint" className="booking-form__hint">
              Let us know about any allergies, dietary restrictions, or special occasions.
            </span>
          </div>
        </fieldset>

        {/* Submit Button */}
        <div className="booking-form__actions">
          <button
            type="submit"
            className={`booking-form__submit ${
              isSubmitting ? 'booking-form__submit--loading' : ''
            }`}
            disabled={!canSubmit()}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="booking-form__spinner" aria-hidden="true"></span>
                <span>Submitting...</span>
              </>
            ) : (
              'Complete Reservation'
            )}
          </button>
        </div>

        {/* Form Summary for Screen Readers */}
        <div className="sr-only" aria-live="polite">
          {selectedDate && selectedTime && (
            <span>
              Booking for {partySize} {partySize === 1 ? 'guest' : 'guests'} on{' '}
              {getFormattedSelectedDate()} at {selectedTime}
            </span>
          )}
        </div>
      </form>

      {/* Component Styles */}
      <style>{`
        .booking-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }

        .booking-form {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }

        .booking-form__title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 1.5rem;
          text-align: center;
        }

        .booking-form__section {
          border: none;
          padding: 0;
          margin: 0 0 1.5rem;
        }

        .booking-form__section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .booking-form__field {
          margin-bottom: 1rem;
        }

        .booking-form__label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #444;
          margin-bottom: 0.5rem;
        }

        .booking-form__required {
          color: #d32f2f;
        }

        .booking-form__optional {
          color: #666;
          font-weight: 400;
          font-size: 0.8rem;
        }

        .booking-form__input,
        .booking-form__textarea {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 6px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .booking-form__input:focus,
        .booking-form__textarea:focus {
          outline: none;
          border-color: #4a90d9;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.2);
        }

        .booking-form__input--error {
          border-color: #d32f2f;
        }

        .booking-form__input--error:focus {
          box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.2);
        }

        .booking-form__input--number {
          width: 120px;
          text-align: center;
        }

        .booking-form__textarea {
          resize: vertical;
          min-height: 100px;
        }

        .booking-form__hint {
          display: block;
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .booking-form__field-error {
          display: block;
          font-size: 0.8rem;
          color: #d32f2f;
          margin-top: 0.25rem;
        }

        .booking-form__error,
        .booking-form__success {
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .booking-form__error {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          color: #991b1b;
        }

        .booking-form__success {
          background-color: #f0fdf4;
          border: 1px solid #dcfce7;
          color: #166534;
        }

        .booking-form__error-icon,
        .booking-form__success-icon {
          font-size: 1.25rem;
        }

        .booking-form__selection-info {
          font-size: 0.875rem;
          color: #4a90d9;
          font-weight: 500;
          margin-top: 0.75rem;
          padding: 0.5rem;
          background-color: #e6f0fa;
          border-radius: 4px;
        }

        .booking-form__actions {
          margin-top: 2rem;
        }

        .booking-form__submit {
          width: 100%;
          padding: 1rem 2rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #ffffff;
          background-color: #4a90d9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .booking-form__submit:hover:not(:disabled) {
          background-color: #3a7bc8;
        }

        .booking-form__submit:active:not(:disabled) {
          transform: scale(0.98);
        }

        .booking-form__submit:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .booking-form__submit--loading {
          background-color: #6b7280;
        }

        .booking-form__spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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
          .booking-form-container {
            padding: 0.5rem;
          }

          .booking-form {
            padding: 1.5rem;
          }

          .booking-form__title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export { BookingForm };
export type { BookingFormProps, BookingFormData, BookingConfirmation };
