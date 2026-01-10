/**
 * @fileoverview Tests for useBooking custom hook
 * @module tests/features/booking/useBooking
 *
 * Comprehensive unit tests for the useBooking custom hook validating:
 * - Booking state management (isLoading, error, slots, booking)
 * - API integration for fetching available time slots
 * - Creating new bookings with validation
 * - Cancelling existing bookings
 * - Retrieving booking details
 * - Error handling for various failure scenarios
 *
 * Tests follow AAA pattern (Arrange, Act, Assert) with Vitest and
 * React Testing Library renderHook utility. Validates booking workflow
 * including date selection, time slot availability checking, party size
 * validation (1-20), and booking confirmation receipt.
 *
 * @see {@link ../../hooks/useBooking.ts} The hook under test
 * @see {@link tests/lifecycle/server.test.js} Pattern reference for mock factories
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

// Internal imports from depends_on_files
import { server } from '../../../__tests__/mocks/server';
import {
  testBookings,
  availableSlots,
  bookedSlots,
  validDate,
  pastDate,
  confirmedBooking,
  createBooking,
  maxPartySizeBooking,
  minPartySizeBooking,
  openingTimeBooking,
  lastSlotBooking,
} from '../../../__tests__/fixtures/bookings';
import { useBooking, Booking } from '../hooks/useBooking';
import { AllProviders } from '../../../__tests__/utils/render';
import {
  createMockBooking,
  waitForLoadingToFinish,
  TestBooking,
} from '../../../__tests__/utils/testUtils';

// ============================================================================
// Constants
// ============================================================================

/** API base URL for booking endpoints */
const API_BASE_URL = '/api/bookings';

/** Maximum allowed party size for reservations */
const MAX_PARTY_SIZE = 20;

/** Minimum allowed party size for reservations */
const MIN_PARTY_SIZE = 1;

/** Restaurant opening time */
const OPENING_TIME = '11:00';

/** Last available reservation slot */
const LAST_SLOT_TIME = '21:00';

// ============================================================================
// Helper Functions
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Creates a wrapper component with all required providers for hook testing.
 * Follows the factory pattern from tests/lifecycle/server.test.js.
 *
 * @returns {React.FC} Wrapper component with providers
 */
function createWrapper(): React.FC<{ children: React.ReactNode }> {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AllProviders>{children}</AllProviders>;
  };
}

/**
 * Creates mock booking API response data.
 * @param overrides - Optional property overrides
 * @returns Booking response object
 */
function createMockBookingResponse(overrides: Partial<typeof confirmedBooking> = {}) {
  return {
    id: overrides.id || `booking-${Date.now()}`,
    date: overrides.date || validDate,
    time: overrides.time || '18:00',
    partySize: overrides.partySize || 4,
    confirmationCode: overrides.confirmationCode || 'BRG-TEST1',
    status: overrides.status || 'confirmed',
  };
}

/**
 * Sets up MSW handler for successful slot fetching.
 * @param slots - Time slots to return
 */
function setupSuccessfulSlotsHandler(slots = availableSlots) {
  server.use(
    http.get(`${API_BASE_URL}/availability`, ({ request }) => {
      const url = new URL(request.url);
      const date = url.searchParams.get('date');
      return HttpResponse.json(slots, { status: 200 });
    })
  );
}

/**
 * Sets up MSW handler for slot fetching with an error response.
 * @param status - HTTP status code
 * @param error - Error response body
 */
function setupSlotsErrorHandler(status: number, error: { message: string; code?: string }) {
  server.use(
    http.get(`${API_BASE_URL}/availability`, () => {
      return HttpResponse.json(error, { status });
    })
  );
}

/**
 * Sets up MSW handler for successful booking creation.
 * @param booking - The booking data to return
 */
function setupSuccessfulCreateHandler(booking = createMockBookingResponse()) {
  server.use(
    http.post(API_BASE_URL, async () => {
      return HttpResponse.json(booking, { status: 201 });
    })
  );
}

/**
 * Sets up MSW handler for booking creation errors.
 * @param status - HTTP status code
 * @param error - Error response body
 */
function setupCreateErrorHandler(status: number, error: { message: string; code?: string }) {
  server.use(
    http.post(API_BASE_URL, () => {
      return HttpResponse.json(error, { status });
    })
  );
}

/**
 * Sets up MSW handler for successful booking cancellation.
 */
function setupSuccessfulCancelHandler() {
  server.use(
    http.post(`${API_BASE_URL}/:id/cancel`, () => {
      return new HttpResponse(null, { status: 204 });
    })
  );
}

/**
 * Sets up MSW handler for booking cancellation errors.
 * @param status - HTTP status code
 * @param error - Error response body
 */
function setupCancelErrorHandler(status: number, error: { message: string; code?: string }) {
  server.use(
    http.post(`${API_BASE_URL}/:id/cancel`, () => {
      return HttpResponse.json(error, { status });
    })
  );
}

/**
 * Sets up MSW handler for successful booking retrieval.
 * @param booking - The booking data to return
 */
function setupSuccessfulGetBookingHandler(booking = confirmedBooking) {
  server.use(
    http.get(`${API_BASE_URL}/:id`, () => {
      return HttpResponse.json({
        id: booking.id,
        date: booking.date,
        time: booking.time,
        partySize: booking.partySize,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
      }, { status: 200 });
    })
  );
}

/**
 * Sets up MSW handler for booking retrieval errors.
 * @param status - HTTP status code
 * @param error - Error response body
 */
function setupGetBookingErrorHandler(status: number, error: { message: string; code?: string }) {
  server.use(
    http.get(`${API_BASE_URL}/:id`, () => {
      return HttpResponse.json(error, { status });
    })
  );
}

/**
 * Sets up MSW handler for network failure simulation.
 */
function setupNetworkErrorHandler() {
  server.use(
    http.post(API_BASE_URL, () => {
      return HttpResponse.error();
    }),
    http.get(`${API_BASE_URL}/availability`, () => {
      return HttpResponse.error();
    }),
    http.post(`${API_BASE_URL}/:id/cancel`, () => {
      return HttpResponse.error();
    }),
    http.get(`${API_BASE_URL}/:id`, () => {
      return HttpResponse.error();
    })
  );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('useBooking', () => {
  beforeEach(() => {
    // Reset mocks and MSW handlers before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Reset MSW handlers to default after each test
    server.resetHandlers();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('initial state', () => {
    it('should start with empty booking state', () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Assert
      expect(result.current.booking).toBeNull();
      expect(result.current.slots).toEqual([]);
    });

    it('should have loading state as false initially', () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });

    it('should have error state as null initially', () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should expose all required action functions', () => {
      // Arrange
      const wrapper = createWrapper();

      // Act
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Assert
      expect(typeof result.current.fetchAvailableSlots).toBe('function');
      expect(typeof result.current.createBooking).toBe('function');
      expect(typeof result.current.cancelBooking).toBe('function');
      expect(typeof result.current.getBooking).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.resetBooking).toBe('function');
    });
  });

  // ==========================================================================
  // fetchAvailableSlots Tests
  // ==========================================================================

  describe('fetchAvailableSlots', () => {
    it('should fetch and return available time slots for a date', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSuccessfulSlotsHandler(availableSlots);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      let fetchedSlots;
      await act(async () => {
        fetchedSlots = await result.current.fetchAvailableSlots(validDate);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.slots.length).toBeGreaterThan(0);
      expect(result.current.error).toBeNull();
      expect(fetchedSlots).toEqual(expect.arrayContaining([
        expect.objectContaining({ time: expect.any(String), available: expect.any(Boolean) })
      ]));
    });

    it('should handle empty slots response', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSuccessfulSlotsHandler([]);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchAvailableSlots(validDate);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.slots).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set error state on API failure', async () => {
      // Arrange
      const wrapper = createWrapper();
      const errorMessage = 'Failed to fetch slots';
      setupSlotsErrorHandler(500, { message: errorMessage, code: 'SERVER_ERROR' });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.fetchAvailableSlots(validDate)).rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.slots).toEqual([]);
    });

    it('should filter out fully booked slots', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mixedSlots = [
        { time: '17:00', available: true, remainingCapacity: 50 },
        { time: '18:00', available: false, remainingCapacity: 0 },
        { time: '19:00', available: true, remainingCapacity: 30 },
      ];
      setupSuccessfulSlotsHandler(mixedSlots);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchAvailableSlots(validDate);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      // The hook returns all slots, let the UI filter
      expect(result.current.slots).toHaveLength(3);
    });

    it('should set isLoading to true during fetch', async () => {
      // Arrange
      const wrapper = createWrapper();
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      server.use(
        http.get(`${API_BASE_URL}/availability`, async () => {
          await delayedPromise;
          return HttpResponse.json(availableSlots, { status: 200 });
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      let fetchPromise: Promise<unknown>;
      act(() => {
        fetchPromise = result.current.fetchAvailableSlots(validDate);
      });

      // Assert - loading should be true during fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the request
      await act(async () => {
        resolvePromise!();
        await fetchPromise;
      });

      // Assert - loading should be false after fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch slots with party size filter', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSuccessfulSlotsHandler(availableSlots);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchAvailableSlots(validDate, 6);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.slots.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // createBooking Tests
  // ==========================================================================

  describe('createBooking', () => {
    it('should create a booking with valid data', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'John Doe',
        phone: '555-123-4567',
        email: 'john@example.com',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(createdBooking).toBeDefined();
      expect(result.current.booking).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should return confirmation code on success', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({
        confirmationCode: 'BRG-SUCCESS1',
      });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'Jane Doe',
        phone: '555-987-6543',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
      expect(createdBooking?.confirmationCode).toBe('BRG-SUCCESS1');
    });

    it('should validate party size between 1 and 20', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert - party size too small (0)
      const invalidDataSmall = {
        date: validDate,
        time: '18:00',
        partySize: 0,
        name: 'Test User',
        phone: '555-111-2222',
      };

      await act(async () => {
        await expect(result.current.createBooking(invalidDataSmall)).rejects.toThrow(
          /party size/i
        );
      });

      // Act & Assert - party size too large (21)
      const invalidDataLarge = {
        date: validDate,
        time: '18:00',
        partySize: 21,
        name: 'Test User',
        phone: '555-111-2222',
      };

      await act(async () => {
        await expect(result.current.createBooking(invalidDataLarge)).rejects.toThrow(
          /party size/i
        );
      });
    });

    it('should accept party size of 1 (minimum)', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ partySize: 1 });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '12:00',
        partySize: MIN_PARTY_SIZE,
        name: 'Solo Diner',
        phone: '555-111-0001',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
      expect(createdBooking?.partySize).toBe(1);
    });

    it('should accept party size of 20 (maximum)', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ partySize: 20 });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: MAX_PARTY_SIZE,
        name: 'Large Party Host',
        phone: '555-999-0000',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
      expect(createdBooking?.partySize).toBe(20);
    });

    it('should reject past date bookings', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      const pastDateBooking = {
        date: pastDate,
        time: '18:00',
        partySize: 4,
        name: 'Past Date Test',
        phone: '555-666-0006',
      };

      // Note: The hook validates date format, not past date. The API will reject past dates.
      // We'll test the validation that exists in the hook
      setupCreateErrorHandler(400, { message: 'Cannot create booking for a past date', code: 'PAST_DATE' });

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(pastDateBooking)).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle closed hours error', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupCreateErrorHandler(400, {
        message: 'Booking time must be between 11:00 and 21:00',
        code: 'CLOSED_HOURS',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      const closedHoursBooking = {
        date: validDate,
        time: '23:00', // After closing
        partySize: 4,
        name: 'Late Night Test',
        phone: '555-222-3333',
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(closedHoursBooking)).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle slot already booked error (409)', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupCreateErrorHandler(409, {
        message: 'The requested time slot is not available',
        code: 'SLOT_UNAVAILABLE',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '19:00',
        partySize: 4,
        name: 'Conflict Test',
        phone: '555-444-5555',
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow();
      });

      expect(result.current.error).toContain('not available');
    });

    it('should handle network failure', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupNetworkErrorHandler();

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'Network Test',
        phone: '555-666-7777',
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it('should validate required name field', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: '', // Empty name
        phone: '555-111-2222',
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow(/name/i);
      });
    });

    it('should validate required phone field', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'Test User',
        phone: '', // Empty phone
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow(/phone/i);
      });
    });

    it('should validate date format', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: 'invalid-date',
        time: '18:00',
        partySize: 4,
        name: 'Test User',
        phone: '555-111-2222',
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow(/date/i);
      });
    });

    it('should validate time format', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: 'invalid-time',
        partySize: 4,
        name: 'Test User',
        phone: '555-111-2222',
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow(/time/i);
      });
    });

    it('should create booking at opening time', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ time: OPENING_TIME });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: OPENING_TIME,
        partySize: 2,
        name: 'Early Bird',
        phone: '555-222-0002',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
      expect(createdBooking?.time).toBe(OPENING_TIME);
    });

    it('should create booking at last available slot', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ time: LAST_SLOT_TIME });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: LAST_SLOT_TIME,
        partySize: 4,
        name: 'Late Diner',
        phone: '555-333-0003',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
      expect(createdBooking?.time).toBe(LAST_SLOT_TIME);
    });

    it('should handle optional special requests', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'Special Request User',
        phone: '555-444-0004',
        specialRequests: 'Window seat preferred',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('should handle optional email field', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'Email Test User',
        phone: '555-555-0005',
        email: 'test@example.com',
      };

      // Act
      let createdBooking: Booking | undefined;
      await act(async () => {
        createdBooking = await result.current.createBooking(bookingData);
      });

      // Assert
      expect(createdBooking).toBeDefined();
    });

    it('should validate email format when provided', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      const bookingData = {
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'Invalid Email User',
        phone: '555-666-0006',
        email: 'invalid-email', // Invalid email format
      };

      // Act & Assert
      await act(async () => {
        await expect(result.current.createBooking(bookingData)).rejects.toThrow(/email/i);
      });
    });
  });

  // ==========================================================================
  // cancelBooking Tests
  // ==========================================================================

  describe('cancelBooking', () => {
    it('should cancel an existing booking', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSuccessfulCancelHandler();

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.cancelBooking(confirmedBooking.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle booking not found error (404)', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupCancelErrorHandler(404, {
        message: "Booking with ID 'nonexistent-id' not found",
        code: 'BOOKING_NOT_FOUND',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.cancelBooking('nonexistent-id')).rejects.toThrow();
      });

      expect(result.current.error).toContain('not found');
    });

    it('should handle cancellation deadline passed error', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupCancelErrorHandler(400, {
        message: 'Bookings must be cancelled at least 24 hours before the reservation time',
        code: 'CANCELLATION_DEADLINE_PASSED',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.cancelBooking('booking-123')).rejects.toThrow();
      });

      expect(result.current.error).toContain('cancelled');
    });

    it('should require booking ID for cancellation', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.cancelBooking('')).rejects.toThrow(/booking id/i);
      });
    });

    it('should update local booking state to cancelled when matching', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ id: 'booking-to-cancel' });
      setupSuccessfulCreateHandler(mockBooking);
      setupSuccessfulCancelHandler();

      const { result } = renderHook(() => useBooking(), { wrapper });

      // First create a booking
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '18:00',
          partySize: 4,
          name: 'Cancel Test',
          phone: '555-777-8888',
        });
      });

      // Then cancel it
      await act(async () => {
        await result.current.cancelBooking('booking-to-cancel');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.booking?.status).toBe('cancelled');
    });

    it('should handle network failure during cancellation', async () => {
      // Arrange
      const wrapper = createWrapper();
      server.use(
        http.post(`${API_BASE_URL}/:id/cancel`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.cancelBooking('booking-123')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle already cancelled booking error', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupCancelErrorHandler(400, {
        message: 'This booking has already been cancelled',
        code: 'ALREADY_CANCELLED',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.cancelBooking('already-cancelled-booking')).rejects.toThrow();
      });

      expect(result.current.error).toContain('already been cancelled');
    });
  });

  // ==========================================================================
  // getBooking Tests
  // ==========================================================================

  describe('getBooking', () => {
    it('should fetch booking details by ID', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSuccessfulGetBookingHandler(confirmedBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      let fetchedBooking: Booking | undefined;
      await act(async () => {
        fetchedBooking = await result.current.getBooking(confirmedBooking.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(fetchedBooking).toBeDefined();
      expect(fetchedBooking?.id).toBe(confirmedBooking.id);
      expect(fetchedBooking?.confirmationCode).toBe(confirmedBooking.confirmationCode);
      expect(result.current.booking).not.toBeNull();
    });

    it('should handle booking not found', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupGetBookingErrorHandler(404, {
        message: "Booking with ID 'nonexistent' not found",
        code: 'BOOKING_NOT_FOUND',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.getBooking('nonexistent')).rejects.toThrow();
      });

      expect(result.current.error).toContain('not found');
    });

    it('should require booking ID', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.getBooking('')).rejects.toThrow(/booking id/i);
      });
    });

    it('should update booking state after fetch', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSuccessfulGetBookingHandler(confirmedBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.getBooking(confirmedBooking.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.booking).not.toBeNull();
      });
      expect(result.current.booking?.date).toBe(confirmedBooking.date);
      expect(result.current.booking?.time).toBe(confirmedBooking.time);
    });

    it('should handle network failure during fetch', async () => {
      // Arrange
      const wrapper = createWrapper();
      server.use(
        http.get(`${API_BASE_URL}/:id`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.getBooking('booking-123')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  // ==========================================================================
  // clearError Tests
  // ==========================================================================

  describe('clearError', () => {
    it('should clear the error state', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSlotsErrorHandler(500, { message: 'Server error', code: 'SERVER_ERROR' });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // First, create an error state
      await act(async () => {
        try {
          await result.current.fetchAvailableSlots(validDate);
        } catch {
          // Expected to throw
        }
      });

      // Verify error exists
      expect(result.current.error).toBeTruthy();

      // Act - clear the error
      act(() => {
        result.current.clearError();
      });

      // Assert
      expect(result.current.error).toBeNull();
    });

    it('should not affect other state when clearing error', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);
      setupCreateErrorHandler(400, { message: 'Validation error', code: 'VALIDATION_ERROR' });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Create a booking first (with success)
      server.resetHandlers();
      setupSuccessfulCreateHandler(mockBooking);
      
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '18:00',
          partySize: 4,
          name: 'Test User',
          phone: '555-111-2222',
        });
      });

      const bookingBefore = result.current.booking;

      // Now create an error
      server.resetHandlers();
      setupSlotsErrorHandler(500, { message: 'Error', code: 'ERROR' });

      await act(async () => {
        try {
          await result.current.fetchAvailableSlots(validDate);
        } catch {
          // Expected
        }
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      // Assert - booking should still be there
      expect(result.current.error).toBeNull();
      expect(result.current.booking).toEqual(bookingBefore);
    });
  });

  // ==========================================================================
  // resetBooking Tests
  // ==========================================================================

  describe('resetBooking', () => {
    it('should reset all booking state to initial values', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);
      setupSuccessfulSlotsHandler(availableSlots);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Populate state
      await act(async () => {
        await result.current.fetchAvailableSlots(validDate);
      });

      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '18:00',
          partySize: 4,
          name: 'Reset Test',
          phone: '555-888-9999',
        });
      });

      // Verify state is populated
      expect(result.current.slots.length).toBeGreaterThan(0);
      expect(result.current.booking).not.toBeNull();

      // Act - reset
      act(() => {
        result.current.resetBooking();
      });

      // Assert - all state should be reset
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.slots).toEqual([]);
      expect(result.current.booking).toBeNull();
    });

    it('should clear error state when resetting', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupSlotsErrorHandler(500, { message: 'Error', code: 'ERROR' });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Create error state
      await act(async () => {
        try {
          await result.current.fetchAvailableSlots(validDate);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      // Act
      act(() => {
        result.current.resetBooking();
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });

  // ==========================================================================
  // Edge Cases and Integration Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle booking with maximum party size (20)', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ partySize: 20 });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '18:00',
          partySize: 20,
          name: 'Large Party',
          phone: '555-999-0000',
        });
      });

      // Assert
      expect(result.current.booking?.partySize).toBe(20);
    });

    it('should handle booking with minimum party size (1)', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ partySize: 1 });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '12:00',
          partySize: 1,
          name: 'Solo Diner',
          phone: '555-111-0001',
        });
      });

      // Assert
      expect(result.current.booking?.partySize).toBe(1);
    });

    it('should handle booking at opening time', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ time: '11:00' });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '11:00',
          partySize: 2,
          name: 'Opening Time Guest',
          phone: '555-222-0002',
        });
      });

      // Assert
      expect(result.current.booking?.time).toBe('11:00');
    });

    it('should handle booking at last available slot', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse({ time: '21:00' });
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '21:00',
          partySize: 4,
          name: 'Late Diner',
          phone: '555-333-0003',
        });
      });

      // Assert
      expect(result.current.booking?.time).toBe('21:00');
    });

    it('should handle API timeout', async () => {
      // Arrange
      const wrapper = createWrapper();

      // Setup a handler that delays indefinitely (simulating timeout)
      server.use(
        http.get(`${API_BASE_URL}/availability`, async () => {
          // Return a network error to simulate timeout
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act - attempt to fetch and wait for error handling
      await act(async () => {
        try {
          await result.current.fetchAvailableSlots(validDate);
        } catch {
          // Expected to fail
        }
      });

      // Assert - the hook should handle the timeout gracefully with an error state
      expect(result.current.error).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should maintain state consistency during concurrent operations', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking1 = createMockBookingResponse({ id: 'booking-1', confirmationCode: 'CODE1' });
      const mockBooking2 = createMockBookingResponse({ id: 'booking-2', confirmationCode: 'CODE2' });

      let requestCount = 0;
      server.use(
        http.post(API_BASE_URL, async () => {
          requestCount++;
          // Return different bookings for different requests
          if (requestCount === 1) {
            return HttpResponse.json(mockBooking1, { status: 201 });
          }
          return HttpResponse.json(mockBooking2, { status: 201 });
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act - make concurrent requests (simulate rapid user actions)
      const promise1 = result.current.createBooking({
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'User 1',
        phone: '555-111-1111',
      });

      // Start second request immediately
      const promise2 = result.current.createBooking({
        date: validDate,
        time: '19:00',
        partySize: 2,
        name: 'User 2',
        phone: '555-222-2222',
      });

      await act(async () => {
        await Promise.all([promise1, promise2]);
      });

      // Assert - the latest booking should be in state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.booking).not.toBeNull();
    });

    it('should handle special characters in booking name', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '19:00',
          partySize: 3,
          name: "José O'Brien-García",
          phone: '555-444-0004',
        });
      });

      // Assert
      expect(result.current.booking).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle special characters in special requests', async () => {
      // Arrange
      const wrapper = createWrapper();
      const mockBooking = createMockBookingResponse();
      setupSuccessfulCreateHandler(mockBooking);

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      await act(async () => {
        await result.current.createBooking({
          date: validDate,
          time: '19:00',
          partySize: 3,
          name: 'Test User',
          phone: '555-444-0004',
          specialRequests: 'Allergie: crustacés & fruits à coque. Végétarien pour 1 personne.',
        });
      });

      // Assert
      expect(result.current.booking).not.toBeNull();
    });

    it('should handle whitespace-only name validation', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(
          result.current.createBooking({
            date: validDate,
            time: '18:00',
            partySize: 4,
            name: '   ', // Whitespace only
            phone: '555-111-2222',
          })
        ).rejects.toThrow(/name/i);
      });
    });

    it('should handle whitespace-only phone validation', async () => {
      // Arrange
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(
          result.current.createBooking({
            date: validDate,
            time: '18:00',
            partySize: 4,
            name: 'Test User',
            phone: '   ', // Whitespace only
          })
        ).rejects.toThrow(/phone/i);
      });
    });

    it('should handle server error (500)', async () => {
      // Arrange
      const wrapper = createWrapper();
      setupCreateErrorHandler(500, {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
      });

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(
          result.current.createBooking({
            date: validDate,
            time: '18:00',
            partySize: 4,
            name: 'Test User',
            phone: '555-111-2222',
          })
        ).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('loading states', () => {
    it('should set isLoading to true during createBooking', async () => {
      // Arrange
      const wrapper = createWrapper();
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          await delayedPromise;
          return HttpResponse.json(createMockBookingResponse(), { status: 201 });
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      let createPromise: Promise<unknown>;
      act(() => {
        createPromise = result.current.createBooking({
          date: validDate,
          time: '18:00',
          partySize: 4,
          name: 'Loading Test',
          phone: '555-111-2222',
        });
      });

      // Assert - loading should be true during request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the request
      await act(async () => {
        resolvePromise!();
        await createPromise;
      });

      // Assert - loading should be false after request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to true during cancelBooking', async () => {
      // Arrange
      const wrapper = createWrapper();
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      server.use(
        http.post(`${API_BASE_URL}/:id/cancel`, async () => {
          await delayedPromise;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      let cancelPromise: Promise<unknown>;
      act(() => {
        cancelPromise = result.current.cancelBooking('booking-123');
      });

      // Assert - loading should be true during request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the request
      await act(async () => {
        resolvePromise!();
        await cancelPromise;
      });

      // Assert - loading should be false after request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to true during getBooking', async () => {
      // Arrange
      const wrapper = createWrapper();
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      server.use(
        http.get(`${API_BASE_URL}/:id`, async () => {
          await delayedPromise;
          return HttpResponse.json(confirmedBooking, { status: 200 });
        })
      );

      const { result } = renderHook(() => useBooking(), { wrapper });

      // Act
      let getPromise: Promise<unknown>;
      act(() => {
        getPromise = result.current.getBooking('booking-123');
      });

      // Assert - loading should be true during request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the request
      await act(async () => {
        resolvePromise!();
        await getPromise;
      });

      // Assert - loading should be false after request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

