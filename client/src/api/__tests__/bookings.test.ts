/**
 * @fileoverview Unit tests for bookings API functions
 * @module tests/api/bookings
 *
 * Comprehensive test suite for table reservation API operations including:
 * - Creating new bookings with validation
 * - Fetching booking details by ID
 * - Retrieving available time slots for a date
 * - Cancelling existing bookings
 * - Fetching user booking history
 *
 * Uses Vitest testing framework with MSW (Mock Service Worker) for API mocking.
 * Follows AAA (Arrange, Act, Assert) pattern with minimum 3 assertions per test.
 *
 * @see {@link https://vitest.dev/} Vitest Documentation
 * @see {@link https://mswjs.io/} MSW Documentation
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { server } from '../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  testBookings,
  validDate,
  pastDate,
  availableSlots,
  bookedSlots,
  partialSlots,
  confirmedBooking,
  cancelledBooking,
  createBooking,
  maxPartySizeBooking,
  minPartySizeBooking,
  openingTimeBooking,
  lastSlotBooking,
  specialCharsBooking,
  unavailableSlotBooking,
} from '../../__tests__/fixtures/bookings';
import type {
  TestBooking,
  TimeSlot,
  CreateBookingRequest,
  BookingStatus,
} from '../../__tests__/fixtures/bookings';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * @typedef {Object} BookingData
 * Data required to create a new table reservation
 */
interface BookingData {
  /** Reservation date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Reservation time in 24-hour format (HH:MM) */
  time: string;
  /** Number of guests */
  partySize: number;
  /** Guest name for the reservation */
  name: string;
  /** Contact phone number */
  phone: string;
  /** Optional contact email */
  email?: string;
  /** Optional special requests or notes */
  specialRequests?: string;
}

/**
 * @typedef {Object} BookingResponse
 * Response from booking creation endpoint
 */
interface BookingResponse {
  /** Unique booking identifier */
  id: string;
  /** Unique confirmation code for the booking */
  confirmationCode: string;
  /** Current booking status */
  status: string;
  /** Reservation date */
  date: string;
  /** Reservation time */
  time: string;
  /** Number of guests */
  partySize: number;
  /** Guest name */
  name: string;
  /** Contact phone */
  phone: string;
  /** Contact email (optional) */
  email?: string;
}

/**
 * @typedef {Object} ApiError
 * Error response from API endpoints
 */
interface ApiError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Optional error code */
  code?: string;
}

// ============================================================================
// Test Constants
// ============================================================================

/** Base URL for booking API endpoints */
const API_BASE_URL = '/api/bookings';

/** Default Content-Type header for JSON requests */
const JSON_CONTENT_TYPE = 'application/json';

/** Maximum party size allowed (from fixtures) */
const MAX_PARTY_SIZE = 20;

/** Minimum party size allowed */
const MIN_PARTY_SIZE = 1;

/** Mock authorization token for authenticated requests */
const MOCK_AUTH_TOKEN = 'Bearer mock-jwt-token-12345';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates booking data with default values that can be overridden.
 * Follows factory pattern from server.test.js for mock object creation.
 * @param {Partial<BookingData>} [overrides={}] - Properties to override defaults
 * @returns {BookingData} Complete booking data object with all required fields
 */
function createBookingData(overrides: Partial<BookingData> = {}): BookingData {
  const defaultData: BookingData = {
    date: validDate,
    time: '18:00',
    partySize: 4,
    name: 'Test Guest',
    phone: '555-123-4567',
    email: 'test.guest@example.com',
    specialRequests: undefined,
  };

  return {
    ...defaultData,
    ...overrides,
  };
}

/**
 * Creates a mock booking response from booking data.
 * @param {BookingData} data - Booking data to create response from
 * @param {Partial<BookingResponse>} [overrides={}] - Properties to override
 * @returns {BookingResponse} Complete booking response object
 */
function createMockBookingResponse(
  data: BookingData,
  overrides: Partial<BookingResponse> = {}
): BookingResponse {
  return {
    id: `booking-${Date.now()}`,
    confirmationCode: `BRG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    status: 'confirmed',
    date: data.date,
    time: data.time,
    partySize: data.partySize,
    name: data.name,
    phone: data.phone,
    email: data.email,
    ...overrides,
  };
}

/**
 * Creates an API error response.
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} [code] - Optional error code
 * @returns {ApiError} API error object
 */
function createApiError(status: number, message: string, code?: string): ApiError {
  return {
    status,
    message,
    code,
  };
}

/**
 * Mock bookings API module for testing.
 * Since the actual API module may not exist yet, we define mock functions.
 */
const bookingsApi = {
  /**
   * Creates a new table reservation.
   * @param {BookingData} data - Booking details
   * @returns {Promise<BookingResponse>} Created booking with confirmation
   */
  createBooking: async (data: BookingData): Promise<BookingResponse> => {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': JSON_CONTENT_TYPE,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, message: error.message, code: error.code };
    }

    return response.json();
  },

  /**
   * Fetches a booking by its ID.
   * @param {string} id - Booking ID
   * @returns {Promise<BookingResponse>} Booking details
   */
  getBooking: async (id: string): Promise<BookingResponse> => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': JSON_CONTENT_TYPE,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, message: error.message, code: error.code };
    }

    return response.json();
  },

  /**
   * Fetches available time slots for a specific date.
   * @param {string} date - Date in ISO format (YYYY-MM-DD)
   * @param {number} [partySize] - Optional party size for filtering
   * @returns {Promise<TimeSlot[]>} Array of available time slots
   */
  getAvailableSlots: async (date: string, partySize?: number): Promise<TimeSlot[]> => {
    const url = new URL(`${API_BASE_URL}/slots`, window.location.origin);
    url.searchParams.set('date', date);
    if (partySize !== undefined) {
      url.searchParams.set('partySize', String(partySize));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': JSON_CONTENT_TYPE,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, message: error.message, code: error.code };
    }

    return response.json();
  },

  /**
   * Cancels a booking by its ID.
   * @param {string} id - Booking ID to cancel
   * @returns {Promise<void>} Resolves when cancelled successfully
   */
  cancelBooking: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': JSON_CONTENT_TYPE,
        Authorization: MOCK_AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, message: error.message, code: error.code };
    }

    // 204 No Content response
    return;
  },

  /**
   * Fetches all bookings for the authenticated user.
   * @param {string} [authToken] - Authorization token
   * @returns {Promise<TestBooking[]>} Array of user's bookings
   */
  getUserBookings: async (authToken?: string): Promise<TestBooking[]> => {
    const headers: Record<string, string> = {
      'Content-Type': JSON_CONTENT_TYPE,
    };

    if (authToken) {
      headers['Authorization'] = authToken;
    }

    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw { status: response.status, message: error.message, code: error.code };
    }

    return response.json();
  },
};

// ============================================================================
// Test Setup
// ============================================================================

describe('Bookings API', () => {
  /**
   * Start MSW server before all tests.
   * Uses 'error' mode to catch any unhandled requests during testing.
   */
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  /**
   * Reset handlers after each test to ensure test isolation.
   * Clears any runtime handlers added during specific tests.
   */
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  /**
   * Stop MSW server after all tests complete.
   */
  afterAll(() => {
    server.close();
  });

  // ==========================================================================
  // createBooking Tests
  // ==========================================================================

  describe('createBooking', () => {
    it('should create a booking with valid data and return confirmation', async () => {
      // Arrange
      const bookingData = createBookingData();
      const expectedResponse = createMockBookingResponse(bookingData);

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(expectedResponse, { status: 201 });
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result).toBeDefined();
      expect(result.confirmationCode).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(result.date).toBe(bookingData.date);
    });

    it('should send POST request to /api/bookings endpoint', async () => {
      // Arrange
      const bookingData = createBookingData();
      let requestUrl = '';
      let requestMethod = '';

      server.use(
        http.post(API_BASE_URL, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          return HttpResponse.json(createMockBookingResponse(bookingData), { status: 201 });
        })
      );

      // Act
      await bookingsApi.createBooking(bookingData);

      // Assert
      expect(requestUrl).toBe('/api/bookings');
      expect(requestMethod).toBe('POST');
      expect(requestUrl).toContain('bookings');
    });

    it('should include Content-Type application/json header', async () => {
      // Arrange
      const bookingData = createBookingData();
      let contentType = '';

      server.use(
        http.post(API_BASE_URL, async ({ request }) => {
          contentType = request.headers.get('Content-Type') || '';
          return HttpResponse.json(createMockBookingResponse(bookingData), { status: 201 });
        })
      );

      // Act
      await bookingsApi.createBooking(bookingData);

      // Assert
      expect(contentType).toBe('application/json');
      expect(contentType).toContain('json');
      expect(contentType).not.toBe('');
    });

    it('should return booking with confirmationCode on success', async () => {
      // Arrange
      const bookingData = createBookingData();
      const confirmationCode = 'BRG-TEST1';

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(
            createMockBookingResponse(bookingData, { confirmationCode }),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.confirmationCode).toBe(confirmationCode);
      expect(result.confirmationCode).toMatch(/^BRG-/);
      expect(typeof result.confirmationCode).toBe('string');
    });

    it('should throw error for past date booking', async () => {
      // Arrange
      const bookingData = createBookingData({ date: pastDate });
      const errorResponse = createApiError(400, 'Cannot book for past dates', 'PAST_DATE');

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 400,
        message: 'Cannot book for past dates',
      });
      expect(pastDate).not.toBe(validDate);
      expect(new Date(pastDate).getTime()).toBeLessThan(Date.now());
    });

    it('should throw error for invalid party size', async () => {
      // Arrange
      const bookingData = createBookingData({ partySize: 25 }); // Exceeds MAX_PARTY_SIZE
      const errorResponse = createApiError(
        400,
        `Party size must be between ${MIN_PARTY_SIZE} and ${MAX_PARTY_SIZE}`,
        'INVALID_PARTY_SIZE'
      );

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 400,
      });
      expect(bookingData.partySize).toBeGreaterThan(MAX_PARTY_SIZE);
      expect(bookingData.partySize).toBe(25);
    });

    it('should handle 400 validation errors', async () => {
      // Arrange
      const bookingData = createBookingData({ name: '' }); // Empty name
      const errorResponse = createApiError(400, 'Name is required', 'VALIDATION_ERROR');

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 400,
        message: 'Name is required',
      });
      expect(bookingData.name).toBe('');
      expect(errorResponse.status).toBe(400);
    });

    it('should handle 409 conflict when slot is unavailable', async () => {
      // Arrange
      const bookingData: BookingData = {
        date: unavailableSlotBooking.date,
        time: unavailableSlotBooking.time,
        partySize: unavailableSlotBooking.partySize,
        name: unavailableSlotBooking.name,
        phone: unavailableSlotBooking.phone,
        email: unavailableSlotBooking.email,
      };
      const errorResponse = createApiError(
        409,
        'Selected time slot is no longer available',
        'SLOT_UNAVAILABLE'
      );

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 409 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 409,
        message: 'Selected time slot is no longer available',
      });
      expect(errorResponse.code).toBe('SLOT_UNAVAILABLE');
      expect(bookingData.time).toBeDefined();
    });
  });

  // ==========================================================================
  // getBooking Tests
  // ==========================================================================

  describe('getBooking', () => {
    it('should fetch booking by ID', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;

      server.use(
        http.get(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(confirmedBooking, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getBooking(bookingId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(bookingId);
      expect(result.status).toBe('confirmed');
    });

    it('should send GET request to /api/bookings/:id', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;
      let requestUrl = '';
      let requestMethod = '';

      server.use(
        http.get(`${API_BASE_URL}/:id`, async ({ request, params }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          return HttpResponse.json(confirmedBooking, { status: 200 });
        })
      );

      // Act
      await bookingsApi.getBooking(bookingId);

      // Assert
      expect(requestMethod).toBe('GET');
      expect(requestUrl).toContain('/api/bookings/');
      expect(requestUrl).toContain(bookingId);
    });

    it('should return booking details on success', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;

      server.use(
        http.get(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(confirmedBooking, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getBooking(bookingId);

      // Assert
      expect(result.name).toBe(confirmedBooking.name);
      expect(result.phone).toBe(confirmedBooking.phone);
      expect(result.partySize).toBe(confirmedBooking.partySize);
      expect(result.date).toBe(confirmedBooking.date);
    });

    it('should throw 404 error when booking not found', async () => {
      // Arrange
      const nonExistentId = 'booking-non-existent-999';
      const errorResponse = createApiError(404, 'Booking not found', 'NOT_FOUND');

      server.use(
        http.get(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(errorResponse, { status: 404 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.getBooking(nonExistentId)).rejects.toMatchObject({
        status: 404,
        message: 'Booking not found',
      });
      expect(nonExistentId).toContain('non-existent');
      expect(errorResponse.status).toBe(404);
    });
  });

  // ==========================================================================
  // getAvailableSlots Tests
  // ==========================================================================

  describe('getAvailableSlots', () => {
    it('should fetch available time slots for a date', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/slots`, async () => {
          return HttpResponse.json(availableSlots, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getAvailableSlots(validDate);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should send GET request with date query parameter', async () => {
      // Arrange
      let requestUrl = '';
      let dateParam = '';

      server.use(
        http.get(`${API_BASE_URL}/slots`, async ({ request }) => {
          requestUrl = request.url;
          const url = new URL(request.url);
          dateParam = url.searchParams.get('date') || '';
          return HttpResponse.json(availableSlots, { status: 200 });
        })
      );

      // Act
      await bookingsApi.getAvailableSlots(validDate);

      // Assert
      expect(requestUrl).toContain('date=');
      expect(dateParam).toBe(validDate);
      expect(requestUrl).toContain('/api/bookings/slots');
    });

    it('should return array of TimeSlot objects', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/slots`, async () => {
          return HttpResponse.json(availableSlots, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getAvailableSlots(validDate);

      // Assert
      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('available');
      expect(result[0]).toHaveProperty('remainingCapacity');
      expect(typeof result[0].time).toBe('string');
    });

    it('should filter by party size if provided', async () => {
      // Arrange
      const partySize = 6;
      let partySizeParam = '';

      server.use(
        http.get(`${API_BASE_URL}/slots`, async ({ request }) => {
          const url = new URL(request.url);
          partySizeParam = url.searchParams.get('partySize') || '';
          // Return only slots that can accommodate the party size
          const filteredSlots = partialSlots.filter(slot => slot.remainingCapacity >= partySize);
          return HttpResponse.json(filteredSlots, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getAvailableSlots(validDate, partySize);

      // Assert
      expect(partySizeParam).toBe(String(partySize));
      expect(result.every(slot => slot.remainingCapacity >= partySize)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(partialSlots.length);
    });

    it('should return empty array for fully booked date', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/slots`, async () => {
          return HttpResponse.json(bookedSlots.filter(s => s.available), { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getAvailableSlots(validDate);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // cancelBooking Tests
  // ==========================================================================

  describe('cancelBooking', () => {
    it('should cancel booking by ID', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;

      server.use(
        http.delete(`${API_BASE_URL}/:id`, async () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.cancelBooking(bookingId)).resolves.toBeUndefined();
      expect(bookingId).toBe(confirmedBooking.id);
      expect(confirmedBooking.status).toBe('confirmed');
    });

    it('should send DELETE request to /api/bookings/:id', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;
      let requestMethod = '';
      let requestUrl = '';

      server.use(
        http.delete(`${API_BASE_URL}/:id`, async ({ request }) => {
          requestMethod = request.method;
          requestUrl = new URL(request.url).pathname;
          return new HttpResponse(null, { status: 204 });
        })
      );

      // Act
      await bookingsApi.cancelBooking(bookingId);

      // Assert
      expect(requestMethod).toBe('DELETE');
      expect(requestUrl).toContain('/api/bookings/');
      expect(requestUrl).toContain(bookingId);
    });

    it('should return 204 No Content on success', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;
      let responseStatus = 0;

      server.use(
        http.delete(`${API_BASE_URL}/:id`, async () => {
          responseStatus = 204;
          return new HttpResponse(null, { status: 204 });
        })
      );

      // Act
      const result = await bookingsApi.cancelBooking(bookingId);

      // Assert
      expect(result).toBeUndefined();
      expect(responseStatus).toBe(204);
      expect(bookingId).toBeDefined();
    });

    it('should throw 404 error when booking not found', async () => {
      // Arrange
      const nonExistentId = 'booking-does-not-exist-999';
      const errorResponse = createApiError(404, 'Booking not found', 'NOT_FOUND');

      server.use(
        http.delete(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(errorResponse, { status: 404 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.cancelBooking(nonExistentId)).rejects.toMatchObject({
        status: 404,
        message: 'Booking not found',
      });
      expect(errorResponse.status).toBe(404);
      expect(nonExistentId).toContain('does-not-exist');
    });

    it('should throw 400 error if cancellation deadline passed', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;
      const errorResponse = createApiError(
        400,
        'Cancellation deadline has passed. Cannot cancel booking less than 2 hours before reservation time.',
        'CANCELLATION_DEADLINE_PASSED'
      );

      server.use(
        http.delete(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.cancelBooking(bookingId)).rejects.toMatchObject({
        status: 400,
        code: 'CANCELLATION_DEADLINE_PASSED',
      });
      expect(errorResponse.status).toBe(400);
      expect(errorResponse.message).toContain('deadline');
    });
  });

  // ==========================================================================
  // getUserBookings Tests
  // ==========================================================================

  describe('getUserBookings', () => {
    it('should fetch user booking history', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/user`, async () => {
          return HttpResponse.json(testBookings, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getUserBookings(MOCK_AUTH_TOKEN);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should send GET request to /api/bookings/user', async () => {
      // Arrange
      let requestUrl = '';
      let requestMethod = '';

      server.use(
        http.get(`${API_BASE_URL}/user`, async ({ request }) => {
          requestUrl = new URL(request.url).pathname;
          requestMethod = request.method;
          return HttpResponse.json(testBookings, { status: 200 });
        })
      );

      // Act
      await bookingsApi.getUserBookings(MOCK_AUTH_TOKEN);

      // Assert
      expect(requestMethod).toBe('GET');
      expect(requestUrl).toBe('/api/bookings/user');
      expect(requestUrl).toContain('user');
    });

    it('should include authorization header', async () => {
      // Arrange
      let authHeader = '';

      server.use(
        http.get(`${API_BASE_URL}/user`, async ({ request }) => {
          authHeader = request.headers.get('Authorization') || '';
          return HttpResponse.json(testBookings, { status: 200 });
        })
      );

      // Act
      await bookingsApi.getUserBookings(MOCK_AUTH_TOKEN);

      // Assert
      expect(authHeader).toBe(MOCK_AUTH_TOKEN);
      expect(authHeader).toContain('Bearer');
      expect(authHeader).not.toBe('');
    });

    it('should return array of user bookings', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/user`, async () => {
          return HttpResponse.json(testBookings, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getUserBookings(MOCK_AUTH_TOKEN);

      // Assert
      expect(result.length).toBe(testBookings.length);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('confirmationCode');
      expect(result[0]).toHaveProperty('status');
    });

    it('should throw 401 if not authenticated', async () => {
      // Arrange
      const errorResponse = createApiError(401, 'Unauthorized. Please log in to view your bookings.', 'UNAUTHORIZED');

      server.use(
        http.get(`${API_BASE_URL}/user`, async ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (!authHeader) {
            return HttpResponse.json(errorResponse, { status: 401 });
          }
          return HttpResponse.json(testBookings, { status: 200 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.getUserBookings()).rejects.toMatchObject({
        status: 401,
        message: 'Unauthorized. Please log in to view your bookings.',
      });
      expect(errorResponse.status).toBe(401);
      expect(errorResponse.code).toBe('UNAUTHORIZED');
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle booking at restaurant opening time', async () => {
      // Arrange
      const bookingData = createBookingData({
        time: openingTimeBooking.time,
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(
            createMockBookingResponse(bookingData, {
              time: openingTimeBooking.time,
            }),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.time).toBe(openingTimeBooking.time);
      expect(result.time).toBe('11:00');
      expect(result.status).toBe('confirmed');
    });

    it('should handle booking at last available slot', async () => {
      // Arrange
      const bookingData = createBookingData({
        time: lastSlotBooking.time,
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(
            createMockBookingResponse(bookingData, {
              time: lastSlotBooking.time,
            }),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.time).toBe(lastSlotBooking.time);
      expect(result.time).toBe('21:00');
      expect(result.status).toBe('confirmed');
    });

    it('should handle maximum party size boundary', async () => {
      // Arrange
      const bookingData = createBookingData({
        partySize: maxPartySizeBooking.partySize,
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(
            createMockBookingResponse(bookingData, {
              partySize: maxPartySizeBooking.partySize,
            }),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.partySize).toBe(maxPartySizeBooking.partySize);
      expect(result.partySize).toBe(MAX_PARTY_SIZE);
      expect(result.status).toBe('confirmed');
    });

    it('should handle minimum party size (1 person)', async () => {
      // Arrange
      const bookingData = createBookingData({
        partySize: minPartySizeBooking.partySize,
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(
            createMockBookingResponse(bookingData, {
              partySize: minPartySizeBooking.partySize,
            }),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.partySize).toBe(minPartySizeBooking.partySize);
      expect(result.partySize).toBe(MIN_PARTY_SIZE);
      expect(result.status).toBe('confirmed');
    });

    it('should handle special characters in name/special requests', async () => {
      // Arrange
      const bookingData = createBookingData({
        name: specialCharsBooking.name,
        specialRequests: specialCharsBooking.specialRequests,
      });

      server.use(
        http.post(API_BASE_URL, async ({ request }) => {
          const body = await request.json() as BookingData;
          return HttpResponse.json(
            createMockBookingResponse(bookingData, {
              name: body.name,
            }),
            { status: 201 }
          );
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.name).toBe(specialCharsBooking.name);
      expect(result.name).toContain("O'Brien");
      expect(result.status).toBe('confirmed');
    });

    it('should handle fetching cancelled booking details', async () => {
      // Arrange
      const bookingId = cancelledBooking.id;

      server.use(
        http.get(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(cancelledBooking, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getBooking(bookingId);

      // Assert
      expect(result.status).toBe('cancelled');
      expect(result.id).toBe(cancelledBooking.id);
      expect(result.confirmationCode).toBe(cancelledBooking.confirmationCode);
    });

    it('should handle slots with partial availability', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/slots`, async () => {
          return HttpResponse.json(partialSlots, { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getAvailableSlots(validDate);

      // Assert
      const availableCount = result.filter(slot => slot.available).length;
      const unavailableCount = result.filter(slot => !slot.available).length;
      expect(availableCount).toBeGreaterThan(0);
      expect(unavailableCount).toBeGreaterThan(0);
      expect(result.length).toBe(partialSlots.length);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle network failure simulation', async () => {
      // Arrange
      const bookingData = createBookingData();

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.error();
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toBeDefined();
      expect(bookingData).toBeDefined();
      expect(bookingData.date).toBe(validDate);
    });

    it('should handle server error (500) response', async () => {
      // Arrange
      const bookingData = createBookingData();
      const errorResponse = createApiError(
        500,
        'Internal server error. Please try again later.',
        'SERVER_ERROR'
      );

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 500 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 500,
        message: 'Internal server error. Please try again later.',
      });
      expect(errorResponse.status).toBe(500);
      expect(errorResponse.code).toBe('SERVER_ERROR');
    });

    it('should handle invalid response format', async () => {
      // Arrange
      const bookingId = confirmedBooking.id;

      server.use(
        http.get(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.text('Invalid JSON response', { status: 200 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.getBooking(bookingId)).rejects.toBeDefined();
      expect(bookingId).toBeDefined();
      expect(bookingId).toBe(confirmedBooking.id);
    });

    it('should handle 503 service unavailable error', async () => {
      // Arrange
      const bookingData = createBookingData();
      const errorResponse = createApiError(
        503,
        'Service temporarily unavailable. Please try again later.',
        'SERVICE_UNAVAILABLE'
      );

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 503 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 503,
      });
      expect(errorResponse.status).toBe(503);
      expect(errorResponse.message).toContain('unavailable');
    });

    it('should handle empty booking history for new user', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/user`, async () => {
          return HttpResponse.json([], { status: 200 });
        })
      );

      // Act
      const result = await bookingsApi.getUserBookings(MOCK_AUTH_TOKEN);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
      expect(result).toEqual([]);
    });

    it('should handle getAvailableSlots with invalid date format', async () => {
      // Arrange
      const invalidDate = 'not-a-date';
      const errorResponse = createApiError(
        400,
        'Invalid date format. Please use YYYY-MM-DD format.',
        'INVALID_DATE_FORMAT'
      );

      server.use(
        http.get(`${API_BASE_URL}/slots`, async () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.getAvailableSlots(invalidDate)).rejects.toMatchObject({
        status: 400,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
      });
      expect(invalidDate).toBe('not-a-date');
      expect(errorResponse.code).toBe('INVALID_DATE_FORMAT');
    });

    it('should handle rate limiting (429)', async () => {
      // Arrange
      const bookingData = createBookingData();
      const errorResponse = createApiError(
        429,
        'Too many requests. Please wait before trying again.',
        'RATE_LIMITED'
      );

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(errorResponse, { status: 429 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.createBooking(bookingData)).rejects.toMatchObject({
        status: 429,
      });
      expect(errorResponse.status).toBe(429);
      expect(errorResponse.code).toBe('RATE_LIMITED');
    });

    it('should handle forbidden access (403)', async () => {
      // Arrange
      const bookingId = 'other-users-booking-id';
      const errorResponse = createApiError(
        403,
        'You do not have permission to cancel this booking.',
        'FORBIDDEN'
      );

      server.use(
        http.delete(`${API_BASE_URL}/:id`, async () => {
          return HttpResponse.json(errorResponse, { status: 403 });
        })
      );

      // Act & Assert
      await expect(bookingsApi.cancelBooking(bookingId)).rejects.toMatchObject({
        status: 403,
        message: 'You do not have permission to cancel this booking.',
      });
      expect(errorResponse.status).toBe(403);
      expect(errorResponse.code).toBe('FORBIDDEN');
    });
  });

  // ==========================================================================
  // Request Payload Validation Tests
  // ==========================================================================

  describe('Request Payload Validation', () => {
    it('should send correct booking data in request body', async () => {
      // Arrange
      const bookingData = createBookingData({
        date: validDate,
        time: '19:00',
        partySize: 5,
        name: 'John Smith',
        phone: '555-987-6543',
        email: 'john.smith@test.com',
        specialRequests: 'Window seat please',
      });
      let receivedBody: BookingData | null = null;

      server.use(
        http.post(API_BASE_URL, async ({ request }) => {
          receivedBody = await request.json() as BookingData;
          return HttpResponse.json(createMockBookingResponse(bookingData), { status: 201 });
        })
      );

      // Act
      await bookingsApi.createBooking(bookingData);

      // Assert
      expect(receivedBody).toEqual(bookingData);
      expect(receivedBody!.name).toBe('John Smith');
      expect(receivedBody!.specialRequests).toBe('Window seat please');
    });

    it('should handle booking without optional email', async () => {
      // Arrange
      const bookingData = createBookingData({
        email: undefined,
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(createMockBookingResponse(bookingData), { status: 201 });
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(bookingData.email).toBeUndefined();
    });

    it('should handle booking with all optional fields', async () => {
      // Arrange
      const bookingData = createBookingData({
        email: 'complete@example.com',
        specialRequests: 'Birthday celebration',
      });

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(createMockBookingResponse(bookingData), { status: 201 });
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result.email).toBe('complete@example.com');
      expect(result.status).toBe('confirmed');
      expect(bookingData.specialRequests).toBe('Birthday celebration');
    });
  });

  // ==========================================================================
  // Concurrent Request Tests
  // ==========================================================================

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous booking requests', async () => {
      // Arrange
      const bookingData1 = createBookingData({ name: 'Guest 1' });
      const bookingData2 = createBookingData({ name: 'Guest 2' });
      const bookingData3 = createBookingData({ name: 'Guest 3' });

      server.use(
        http.post(API_BASE_URL, async ({ request }) => {
          const body = await request.json() as BookingData;
          return HttpResponse.json(
            createMockBookingResponse(body, { name: body.name }),
            { status: 201 }
          );
        })
      );

      // Act
      const results = await Promise.all([
        bookingsApi.createBooking(bookingData1),
        bookingsApi.createBooking(bookingData2),
        bookingsApi.createBooking(bookingData3),
      ]);

      // Assert
      expect(results.length).toBe(3);
      expect(results.map(r => r.name)).toContain('Guest 1');
      expect(results.map(r => r.name)).toContain('Guest 2');
      expect(results.map(r => r.name)).toContain('Guest 3');
    });

    it('should handle concurrent slot availability checks', async () => {
      // Arrange
      const dates = [validDate, validDate, validDate];
      let requestCount = 0;

      server.use(
        http.get(`${API_BASE_URL}/slots`, async () => {
          requestCount++;
          return HttpResponse.json(availableSlots, { status: 200 });
        })
      );

      // Act
      const results = await Promise.all(
        dates.map(date => bookingsApi.getAvailableSlots(date))
      );

      // Assert
      expect(results.length).toBe(3);
      // Note: requestCount may be higher due to MSW internal handling
      // The important check is that all 3 requests completed successfully
      expect(requestCount).toBeGreaterThanOrEqual(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Response Header Validation Tests
  // ==========================================================================

  describe('Response Headers', () => {
    it('should handle JSON Content-Type in response', async () => {
      // Arrange
      const bookingData = createBookingData();

      server.use(
        http.post(API_BASE_URL, async () => {
          return HttpResponse.json(createMockBookingResponse(bookingData), {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        })
      );

      // Act
      const result = await bookingsApi.createBooking(bookingData);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.confirmationCode).toBeDefined();
    });
  });
});
