/**
 * @fileoverview Custom hook for booking state management and API integration
 * @module features/booking/hooks/useBooking
 * 
 * This hook provides comprehensive state management and API integration for table
 * booking functionality. It handles fetching available time slots, creating new
 * bookings, cancelling existing bookings, and retrieving booking details.
 */

import { useState, useCallback } from 'react';

/**
 * Represents a booking status value
 */
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show';

/**
 * Represents an available time slot for booking
 */
export interface TimeSlot {
  /** The time of the slot in HH:MM format */
  time: string;
  /** Whether the slot is available for booking */
  available: boolean;
  /** Number of remaining seats/tables available */
  remainingCapacity: number;
}

/**
 * Represents a completed booking record
 */
export interface Booking {
  /** Unique identifier for the booking */
  id: string;
  /** Date of the reservation in YYYY-MM-DD format */
  date: string;
  /** Time of the reservation in HH:MM format */
  time: string;
  /** Number of guests in the party */
  partySize: number;
  /** Unique confirmation code for customer reference */
  confirmationCode: string;
  /** Current status of the booking */
  status: BookingStatus;
}

/**
 * Data required to create a new booking
 */
export interface CreateBookingData {
  /** Date of the reservation in YYYY-MM-DD format */
  date: string;
  /** Time of the reservation in HH:MM format */
  time: string;
  /** Number of guests in the party */
  partySize: number;
  /** Guest name for the reservation */
  name: string;
  /** Contact phone number */
  phone: string;
  /** Optional email address for confirmation */
  email?: string;
  /** Optional special requests or notes */
  specialRequests?: string;
}

/**
 * State interface for the useBooking hook
 */
export interface UseBookingState {
  /** Indicates if an API operation is in progress */
  isLoading: boolean;
  /** Error message from the last failed operation, or null if no error */
  error: string | null;
  /** Array of available time slots for the selected date */
  slots: TimeSlot[];
  /** Current booking details, or null if no booking is selected */
  booking: Booking | null;
}

/**
 * Return type for the useBooking hook
 */
export interface UseBookingReturn extends UseBookingState {
  /** Fetches available time slots for a given date and optional party size */
  fetchAvailableSlots: (date: string, partySize?: number) => Promise<TimeSlot[]>;
  /** Creates a new booking with the provided data */
  createBooking: (data: CreateBookingData) => Promise<Booking>;
  /** Cancels an existing booking by ID */
  cancelBooking: (bookingId: string) => Promise<void>;
  /** Retrieves a booking by ID */
  getBooking: (bookingId: string) => Promise<Booking>;
  /** Clears the current error state */
  clearError: () => void;
  /** Resets the booking state to initial values */
  resetBooking: () => void;
}

/**
 * API base URL for booking endpoints
 * Uses environment variable or defaults to /api
 */
const API_BASE_URL = '/api';

/**
 * Performs an API request with standard error handling
 * 
 * @param endpoint - The API endpoint path
 * @param options - Fetch options for the request
 * @returns Promise resolving to the parsed JSON response
 * @throws Error with message from API or generic error message
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage: string;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `Request failed with status ${response.status}`;
    } catch {
      errorMessage = `Request failed with status ${response.status}`;
    }
    
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

/**
 * Custom React hook for booking state management and API integration.
 * 
 * Provides functions for fetching available time slots, creating bookings,
 * cancelling bookings, and managing booking-related state including loading
 * states, errors, and current booking data.
 * 
 * @returns {UseBookingReturn} Object containing state values and action functions
 * 
 * @example
 * ```tsx
 * function BookingForm() {
 *   const { 
 *     isLoading, 
 *     error, 
 *     slots, 
 *     booking,
 *     fetchAvailableSlots,
 *     createBooking,
 *     clearError 
 *   } = useBooking();
 * 
 *   useEffect(() => {
 *     fetchAvailableSlots('2024-03-15', 4);
 *   }, [fetchAvailableSlots]);
 * 
 *   const handleSubmit = async (data) => {
 *     const result = await createBooking(data);
 *     console.log('Booking confirmed:', result.confirmationCode);
 *   };
 * 
 *   return (
 *     // ... form implementation
 *   );
 * }
 * ```
 */
export function useBooking(): UseBookingReturn {
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);

  /**
   * Fetches available time slots for a specific date
   * 
   * @param date - Date to check availability for (YYYY-MM-DD format)
   * @param partySize - Optional party size to filter available slots
   * @returns Promise resolving to array of available time slots
   * @throws Error if the API request fails
   */
  const fetchAvailableSlots = useCallback(
    async (date: string, partySize?: number): Promise<TimeSlot[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams({ date });
        if (partySize !== undefined && partySize > 0) {
          params.append('partySize', partySize.toString());
        }

        const fetchedSlots = await apiRequest<TimeSlot[]>(
          `/bookings/availability?${params.toString()}`
        );

        // Validate and sanitize the response
        const validatedSlots = Array.isArray(fetchedSlots)
          ? fetchedSlots.map((slot) => ({
              time: String(slot.time || ''),
              available: Boolean(slot.available),
              remainingCapacity: Number(slot.remainingCapacity) || 0,
            }))
          : [];

        setSlots(validatedSlots);
        return validatedSlots;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch available time slots';
        setError(errorMessage);
        setSlots([]);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Creates a new booking with the provided reservation data
   * 
   * @param data - Booking data including date, time, party size, and guest info
   * @returns Promise resolving to the created booking record
   * @throws Error if validation fails or the API request fails
   */
  const createBooking = useCallback(
    async (data: CreateBookingData): Promise<Booking> => {
      // Validate required fields before making API call
      if (!data.date || !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
      }

      if (!data.time || !data.time.match(/^\d{2}:\d{2}$/)) {
        throw new Error('Invalid time format. Please use HH:MM format.');
      }

      if (!data.partySize || data.partySize < 1 || data.partySize > 20) {
        throw new Error('Party size must be between 1 and 20 guests.');
      }

      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Guest name is required.');
      }

      if (!data.phone || data.phone.trim().length === 0) {
        throw new Error('Phone number is required.');
      }

      // Basic phone validation - allows various formats
      const phoneRegex = /^[\d\s\-+()]{7,20}$/;
      if (!phoneRegex.test(data.phone)) {
        throw new Error('Please enter a valid phone number.');
      }

      // Email validation if provided
      if (data.email && data.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          throw new Error('Please enter a valid email address.');
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const createdBooking = await apiRequest<Booking>('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            date: data.date,
            time: data.time,
            partySize: data.partySize,
            name: data.name.trim(),
            phone: data.phone.trim(),
            email: data.email?.trim() || undefined,
            specialRequests: data.specialRequests?.trim() || undefined,
          }),
        });

        // Validate and sanitize the response
        const validatedBooking: Booking = {
          id: String(createdBooking.id || ''),
          date: String(createdBooking.date || ''),
          time: String(createdBooking.time || ''),
          partySize: Number(createdBooking.partySize) || data.partySize,
          confirmationCode: String(createdBooking.confirmationCode || ''),
          status: validateBookingStatus(createdBooking.status) || 'confirmed',
        };

        setBooking(validatedBooking);
        return validatedBooking;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create booking';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Cancels an existing booking
   * 
   * @param bookingId - ID of the booking to cancel
   * @returns Promise resolving when cancellation is complete
   * @throws Error if the booking cannot be found or cancelled
   */
  const cancelBooking = useCallback(
    async (bookingId: string): Promise<void> => {
      if (!bookingId || bookingId.trim().length === 0) {
        throw new Error('Booking ID is required for cancellation.');
      }

      setIsLoading(true);
      setError(null);

      try {
        await apiRequest<void>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
          method: 'POST',
        });

        // Update local booking state if it matches the cancelled booking
        setBooking((currentBooking) => {
          if (currentBooking && currentBooking.id === bookingId) {
            return {
              ...currentBooking,
              status: 'cancelled' as BookingStatus,
            };
          }
          return currentBooking;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to cancel booking';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Retrieves a booking by its ID
   * 
   * @param bookingId - ID of the booking to retrieve
   * @returns Promise resolving to the booking record
   * @throws Error if the booking cannot be found
   */
  const getBooking = useCallback(
    async (bookingId: string): Promise<Booking> => {
      if (!bookingId || bookingId.trim().length === 0) {
        throw new Error('Booking ID is required.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const fetchedBooking = await apiRequest<Booking>(
          `/bookings/${encodeURIComponent(bookingId)}`
        );

        // Validate and sanitize the response
        const validatedBooking: Booking = {
          id: String(fetchedBooking.id || ''),
          date: String(fetchedBooking.date || ''),
          time: String(fetchedBooking.time || ''),
          partySize: Number(fetchedBooking.partySize) || 0,
          confirmationCode: String(fetchedBooking.confirmationCode || ''),
          status: validateBookingStatus(fetchedBooking.status) || 'confirmed',
        };

        setBooking(validatedBooking);
        return validatedBooking;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to retrieve booking';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clears the current error state
   * Useful for dismissing error messages after user acknowledgment
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Resets the booking state to initial values
   * Clears all state including slots, booking, error, and loading
   */
  const resetBooking = useCallback((): void => {
    setIsLoading(false);
    setError(null);
    setSlots([]);
    setBooking(null);
  }, []);

  return {
    // State values
    isLoading,
    error,
    slots,
    booking,
    // Action functions
    fetchAvailableSlots,
    createBooking,
    cancelBooking,
    getBooking,
    clearError,
    resetBooking,
  };
}

/**
 * Validates and returns a valid BookingStatus value
 * 
 * @param status - Status value to validate
 * @returns Valid BookingStatus or undefined if invalid
 */
function validateBookingStatus(status: unknown): BookingStatus | undefined {
  const validStatuses: BookingStatus[] = ['confirmed', 'cancelled', 'completed', 'no-show'];
  
  if (typeof status === 'string' && validStatuses.includes(status as BookingStatus)) {
    return status as BookingStatus;
  }
  
  return undefined;
}

// Re-export types for convenience when importing from this module
// Note: Primary exports are inline with interface/type/function declarations above
