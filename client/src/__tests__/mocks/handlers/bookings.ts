/**
 * @fileoverview Bookings API mock handlers for MSW
 * @module tests/mocks/handlers/bookings
 * 
 * Provides MSW request handlers for table booking API endpoints including:
 * - Creating new reservations with validation
 * - Retrieving booking details by ID
 * - Fetching available time slots
 * - Canceling existing bookings
 * - Retrieving user booking history
 * 
 * All handlers follow MSW 2.7.0 patterns with http.get/post/delete and HttpResponse.
 * Uses booking fixtures from the fixtures directory for consistent test data.
 */

import { http, HttpResponse } from 'msw';

import {
  type BookingStatus,
  type TestBooking,
  type TimeSlot,
  type CreateBookingRequest,
  testBookings,
  availableSlots,
  bookedSlots,
  partialSlots,
  confirmedBooking,
  validDate,
  pastDate,
  closedDate,
  createBooking,
  generateConfirmationCode,
} from '../../fixtures/bookings';

// ============================================================================
// Constants
// ============================================================================

/** Base URL for booking API endpoints (wildcard matches any origin) */
const API_BASE_URL = '*/api/bookings';

/** Maximum allowed party size for reservations */
const MAX_PARTY_SIZE = 20;

/** Minimum allowed party size for reservations */
const MIN_PARTY_SIZE = 1;

/** Restaurant opening time (24-hour format) */
const OPENING_TIME = '11:00';

/** Last available reservation slot (24-hour format) */
const LAST_SLOT_TIME = '21:00';

/** Minimum hours before reservation for cancellation */
const CANCELLATION_DEADLINE_HOURS = 24;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Error response structure for validation and API errors
 */
interface ErrorResponse {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details (optional) */
  details?: Record<string, unknown>;
}

/**
 * Success response for booking creation
 */
interface CreateBookingResponse {
  /** The created booking object */
  booking: TestBooking;
  /** Success message */
  message: string;
}

/**
 * Response structure for available slots query
 */
interface SlotsResponse {
  /** Requested date */
  date: string;
  /** Array of available time slots */
  slots: TimeSlot[];
  /** Restaurant opening time */
  openingTime: string;
  /** Last available slot time */
  closingTime: string;
}

/**
 * Response structure for user booking history
 */
interface UserBookingsResponse {
  /** Array of user's bookings */
  bookings: TestBooking[];
  /** Total number of bookings */
  total: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if a date string is in valid ISO format (YYYY-MM-DD).
 * @param {string} dateString - The date string to validate
 * @returns {boolean} True if valid ISO date format
 */
function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Checks if a date is in the past.
 * @param {string} dateString - The date string in ISO format
 * @returns {boolean} True if the date is before today
 */
function isDateInPast(dateString: string): boolean {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

/**
 * Checks if a time is within restaurant operating hours.
 * @param {string} time - The time in HH:MM format
 * @returns {boolean} True if time is within operating hours
 */
function isWithinOperatingHours(time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const [openHours, openMinutes] = OPENING_TIME.split(':').map(Number);
  const [closeHours, closeMinutes] = LAST_SLOT_TIME.split(':').map(Number);

  const timeInMinutes = hours * 60 + minutes;
  const openingInMinutes = openHours * 60 + openMinutes;
  const closingInMinutes = closeHours * 60 + closeMinutes;

  return timeInMinutes >= openingInMinutes && timeInMinutes <= closingInMinutes;
}

/**
 * Validates party size is within allowed limits.
 * @param {number} partySize - The number of guests
 * @returns {boolean} True if party size is valid
 */
function isValidPartySize(partySize: number): boolean {
  return partySize >= MIN_PARTY_SIZE && partySize <= MAX_PARTY_SIZE;
}

/**
 * Checks if a time slot is available for the given party size.
 * @param {string} time - The requested time
 * @param {number} partySize - The number of guests
 * @param {TimeSlot[]} slots - Available slots to check against
 * @returns {TimeSlot | undefined} The matching slot if found
 */
function findAvailableSlot(
  time: string,
  partySize: number,
  slots: TimeSlot[]
): TimeSlot | undefined {
  const slot = slots.find((s) => s.time === time);
  if (!slot) {
    return undefined;
  }
  if (!slot.available || slot.remainingCapacity < partySize) {
    return undefined;
  }
  return slot;
}

/**
 * Finds a booking by its ID.
 * @param {string} id - The booking ID to find
 * @returns {TestBooking | undefined} The booking if found
 */
function findBookingById(id: string): TestBooking | undefined {
  return testBookings.find((booking) => booking.id === id);
}

/**
 * Checks if the cancellation deadline has passed for a booking.
 * @param {string} date - The booking date
 * @param {string} time - The booking time
 * @returns {boolean} True if cancellation deadline has passed
 */
function isCancellationDeadlinePassed(date: string, time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const bookingDateTime = new Date(date);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const hoursUntilBooking =
    (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilBooking < CANCELLATION_DEADLINE_HOURS;
}

/**
 * Generates alternative time slots when requested slot is unavailable.
 * @param {string} requestedTime - The originally requested time
 * @param {TimeSlot[]} slots - All available slots
 * @returns {TimeSlot[]} Array of alternative available slots
 */
function getAlternativeSlots(
  requestedTime: string,
  slots: TimeSlot[]
): TimeSlot[] {
  const [requestedHours] = requestedTime.split(':').map(Number);

  return slots
    .filter((slot) => {
      if (!slot.available || slot.remainingCapacity === 0) {
        return false;
      }
      const [slotHours] = slot.time.split(':').map(Number);
      // Return slots within 2 hours of requested time
      return Math.abs(slotHours - requestedHours) <= 2;
    })
    .slice(0, 3); // Return up to 3 alternatives
}

/**
 * Checks if a given date is a closed holiday.
 * @param {string} dateString - The date string to check
 * @returns {boolean} True if the restaurant is closed on that date
 */
function isClosedDate(dateString: string): boolean {
  // Check against known closed dates
  if (dateString === closedDate) {
    return true;
  }

  // Check for Christmas Day pattern (December 25th)
  const date = new Date(dateString);
  return date.getMonth() === 11 && date.getDate() === 25;
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handler for POST /api/bookings - Create a new reservation.
 * 
 * Validates request data including:
 * - Date format and future date requirement
 * - Time within operating hours
 * - Party size within limits
 * - Slot availability
 * 
 * @returns {HttpResponse} Created booking or error response
 */
const createBookingHandler = http.post(
  API_BASE_URL,
  async ({ request }) => {
    const body = (await request.json()) as CreateBookingRequest;

    // Validate required fields (use explicit undefined/null checks for partySize since 0 is falsy but not missing)
    const missingFields: string[] = [];
    if (!body.date) missingFields.push('date');
    if (!body.time) missingFields.push('time');
    if (body.partySize === undefined || body.partySize === null) missingFields.push('partySize');
    if (!body.name) missingFields.push('name');
    if (!body.phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          details: {
            requiredFields: ['date', 'time', 'partySize', 'name', 'phone'],
            missingFields,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate date format
    if (!isValidDateFormat(body.date)) {
      return HttpResponse.json(
        {
          code: 'INVALID_DATE_FORMAT',
          message: 'Date must be in YYYY-MM-DD format',
          details: {
            providedDate: body.date,
            expectedFormat: 'YYYY-MM-DD',
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate date is not in the past
    if (isDateInPast(body.date)) {
      return HttpResponse.json(
        {
          code: 'PAST_DATE',
          message: 'Cannot create booking for a past date',
          details: {
            providedDate: body.date,
            minimumDate: validDate,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate restaurant is not closed on the requested date
    if (isClosedDate(body.date)) {
      return HttpResponse.json(
        {
          code: 'RESTAURANT_CLOSED',
          message: 'Restaurant is closed on the requested date',
          details: {
            requestedDate: body.date,
            reason: 'Holiday closure',
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate time is within operating hours
    if (!isWithinOperatingHours(body.time)) {
      return HttpResponse.json(
        {
          code: 'CLOSED_HOURS',
          message: `Booking time must be between ${OPENING_TIME} and ${LAST_SLOT_TIME}`,
          details: {
            providedTime: body.time,
            openingTime: OPENING_TIME,
            lastSlotTime: LAST_SLOT_TIME,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate party size
    if (!isValidPartySize(body.partySize)) {
      return HttpResponse.json(
        {
          code: 'INVALID_PARTY_SIZE',
          message: `Party size must be between ${MIN_PARTY_SIZE} and ${MAX_PARTY_SIZE} guests`,
          details: {
            providedSize: body.partySize,
            minimumSize: MIN_PARTY_SIZE,
            maximumSize: MAX_PARTY_SIZE,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Check slot availability
    const availableSlot = findAvailableSlot(body.time, body.partySize, availableSlots);

    if (!availableSlot) {
      const alternatives = getAlternativeSlots(body.time, availableSlots);
      return HttpResponse.json(
        {
          code: 'SLOT_UNAVAILABLE',
          message: 'The requested time slot is not available',
          details: {
            requestedTime: body.time,
            requestedPartySize: body.partySize,
            alternativeSlots: alternatives.map((s) => ({
              time: s.time,
              remainingCapacity: s.remainingCapacity,
            })),
          },
        } satisfies ErrorResponse,
        { status: 409 }
      );
    }

    // Create the booking
    const newBooking = createBooking({
      date: body.date,
      time: body.time,
      partySize: body.partySize,
      name: body.name,
      phone: body.phone,
      email: body.email,
      specialRequests: body.specialRequests,
      status: 'confirmed',
    });

    return HttpResponse.json(
      {
        booking: newBooking,
        message: 'Booking created successfully',
      } satisfies CreateBookingResponse,
      { status: 201 }
    );
  }
);

/**
 * Handler for GET /api/bookings/:id - Get booking details by ID.
 * 
 * Returns the booking object if found, or 404 if not found.
 * 
 * @returns {HttpResponse} Booking details or 404 error
 */
const getBookingHandler = http.get(
  `${API_BASE_URL}/:id`,
  ({ params }) => {
    const { id } = params as { id: string };

    // Special case: handle requests to /api/bookings/slots and /api/bookings/user
    // These should be handled by their specific handlers
    if (id === 'slots' || id === 'user') {
      return;
    }

    const booking = findBookingById(id);

    if (!booking) {
      return HttpResponse.json(
        {
          code: 'BOOKING_NOT_FOUND',
          message: `Booking with ID '${id}' not found`,
          details: {
            bookingId: id,
          },
        } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    return HttpResponse.json(booking, { status: 200 });
  }
);

/**
 * Handler for GET /api/bookings/slots - Get available time slots.
 * 
 * Supports query parameters:
 * - date: The date to check availability for (required)
 * - partySize: Filter slots by capacity (optional)
 * 
 * @returns {HttpResponse} Available slots or error response
 */
const getSlotsHandler = http.get(
  `${API_BASE_URL}/slots`,
  ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const partySizeParam = url.searchParams.get('partySize');

    // Validate date parameter
    if (!date) {
      return HttpResponse.json(
        {
          code: 'MISSING_DATE_PARAM',
          message: 'Date query parameter is required',
          details: {
            usage: 'GET /api/bookings/slots?date=YYYY-MM-DD&partySize=N',
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate date format
    if (!isValidDateFormat(date)) {
      return HttpResponse.json(
        {
          code: 'INVALID_DATE_FORMAT',
          message: 'Date must be in YYYY-MM-DD format',
          details: {
            providedDate: date,
            expectedFormat: 'YYYY-MM-DD',
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Check if date is in the past
    if (isDateInPast(date)) {
      return HttpResponse.json(
        {
          code: 'PAST_DATE',
          message: 'Cannot check availability for past dates',
          details: {
            providedDate: date,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Check if restaurant is closed
    if (isClosedDate(date)) {
      return HttpResponse.json(
        {
          date,
          slots: [],
          openingTime: OPENING_TIME,
          closingTime: LAST_SLOT_TIME,
        } satisfies SlotsResponse,
        { status: 200 }
      );
    }

    // Filter slots by party size if provided
    let filteredSlots = [...availableSlots];

    if (partySizeParam) {
      const partySize = parseInt(partySizeParam, 10);

      if (isNaN(partySize) || !isValidPartySize(partySize)) {
        return HttpResponse.json(
          {
            code: 'INVALID_PARTY_SIZE',
            message: `Party size must be a number between ${MIN_PARTY_SIZE} and ${MAX_PARTY_SIZE}`,
            details: {
              providedSize: partySizeParam,
              minimumSize: MIN_PARTY_SIZE,
              maximumSize: MAX_PARTY_SIZE,
            },
          } satisfies ErrorResponse,
          { status: 400 }
        );
      }

      filteredSlots = filteredSlots.filter(
        (slot) => slot.available && slot.remainingCapacity >= partySize
      );
    }

    return HttpResponse.json(
      {
        date,
        slots: filteredSlots,
        openingTime: OPENING_TIME,
        closingTime: LAST_SLOT_TIME,
      } satisfies SlotsResponse,
      { status: 200 }
    );
  }
);

/**
 * Handler for DELETE /api/bookings/:id - Cancel a booking.
 * 
 * Validates cancellation rules including:
 * - Booking must exist
 * - Booking must not already be cancelled
 * - Cancellation deadline must not have passed
 * 
 * @returns {HttpResponse} 204 No Content on success or error response
 */
const cancelBookingHandler = http.delete(
  `${API_BASE_URL}/:id`,
  ({ params }) => {
    const { id } = params as { id: string };

    const booking = findBookingById(id);

    if (!booking) {
      return HttpResponse.json(
        {
          code: 'BOOKING_NOT_FOUND',
          message: `Booking with ID '${id}' not found`,
          details: {
            bookingId: id,
          },
        } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return HttpResponse.json(
        {
          code: 'ALREADY_CANCELLED',
          message: 'This booking has already been cancelled',
          details: {
            bookingId: id,
            currentStatus: booking.status,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Check if booking is completed or no-show (cannot cancel)
    if (booking.status === 'completed' || booking.status === 'no-show') {
      return HttpResponse.json(
        {
          code: 'CANNOT_CANCEL',
          message: `Cannot cancel a booking with status '${booking.status}'`,
          details: {
            bookingId: id,
            currentStatus: booking.status,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Check cancellation deadline
    if (isCancellationDeadlinePassed(booking.date, booking.time)) {
      return HttpResponse.json(
        {
          code: 'CANCELLATION_DEADLINE_PASSED',
          message: `Bookings must be cancelled at least ${CANCELLATION_DEADLINE_HOURS} hours before the reservation time`,
          details: {
            bookingId: id,
            bookingDateTime: `${booking.date} ${booking.time}`,
            cancellationPolicy: `${CANCELLATION_DEADLINE_HOURS} hours notice required`,
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Return 204 No Content for successful cancellation
    return new HttpResponse(null, { status: 204 });
  }
);

/**
 * Handler for GET /api/bookings/user - Get user's booking history.
 * 
 * Requires authentication (checks for Authorization header).
 * Returns all bookings associated with the authenticated user.
 * 
 * @returns {HttpResponse} User's bookings or 401 error
 */
const getUserBookingsHandler = http.get(
  `${API_BASE_URL}/user`,
  ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    // Check for authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to access booking history',
          details: {
            hint: 'Include a valid Bearer token in the Authorization header',
          },
        } satisfies ErrorResponse,
        { status: 401 }
      );
    }

    // Extract user ID from token (simulated - in real app would decode JWT)
    // For testing purposes, we'll use 'user-001' as the default user
    const userId = 'user-001';

    // Filter bookings for the user
    const userBookings = testBookings.filter(
      (booking) => booking.userId === userId
    );

    return HttpResponse.json(
      {
        bookings: userBookings,
        total: userBookings.length,
      } satisfies UserBookingsResponse,
      { status: 200 }
    );
  }
);

// ============================================================================
// Exported Handler Array
// ============================================================================

/**
 * Array of all booking API mock handlers for MSW server setup.
 * 
 * Handlers are ordered with more specific routes first to ensure correct matching:
 * 1. getSlotsHandler (/api/bookings/slots) - specific route
 * 2. getUserBookingsHandler (/api/bookings/user) - specific route
 * 3. createBookingHandler (POST /api/bookings) - base route
 * 4. getBookingHandler (GET /api/bookings/:id) - parameterized route
 * 5. cancelBookingHandler (DELETE /api/bookings/:id) - parameterized route
 */
export const bookingsHandlers = [
  getSlotsHandler,
  getUserBookingsHandler,
  createBookingHandler,
  getBookingHandler,
  cancelBookingHandler,
];
