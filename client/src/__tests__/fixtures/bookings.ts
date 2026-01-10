/**
 * @fileoverview Booking test fixtures for table reservation testing
 * @module tests/fixtures/bookings
 * 
 * Provides consistent, typed test data for table reservation testing including:
 * - TestBooking interface and booking collections
 * - Time slot availability data
 * - Date-related fixtures for validation testing
 * - Helper functions for creating custom test bookings
 * - Edge case and error scenario data
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Booking status enumeration representing all possible states of a reservation
 */
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show';

/**
 * Complete booking object with all reservation details
 */
export interface TestBooking {
  /** Unique booking identifier */
  id: string;
  /** Reservation date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Reservation time in 24-hour format (HH:MM) */
  time: string;
  /** Number of guests */
  partySize: number;
  /** ID of the user who made the booking */
  userId: string;
  /** Guest name for the reservation */
  name: string;
  /** Contact phone number */
  phone: string;
  /** Optional contact email */
  email?: string;
  /** Current booking status */
  status: BookingStatus;
  /** Unique confirmation code for the booking */
  confirmationCode: string;
  /** Optional special requests or notes */
  specialRequests?: string;
}

/**
 * Time slot availability information
 */
export interface TimeSlot {
  /** Time in 24-hour format (HH:MM) */
  time: string;
  /** Whether the slot is available for booking */
  available: boolean;
  /** Number of remaining seats available */
  remainingCapacity: number;
}

/**
 * Request payload for creating a new booking
 */
export interface CreateBookingRequest {
  /** Desired date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Desired time in 24-hour format (HH:MM) */
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

// ============================================================================
// Constants
// ============================================================================

/** Maximum party size allowed for reservations */
const MAX_PARTY_SIZE = 20;

/** Minimum party size allowed for reservations */
const MIN_PARTY_SIZE = 1;

/** Restaurant opening time */
const OPENING_TIME = '11:00';

/** Last available reservation slot */
const LAST_SLOT_TIME = '21:00';

/** Maximum restaurant capacity */
const MAX_CAPACITY = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique confirmation code for bookings.
 * Creates a 8-character alphanumeric code in format: BRG-XXXXX
 * @returns {string} Unique confirmation code
 */
export function generateConfirmationCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BRG-';
  for (let i = 0; i < 5; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

/**
 * Creates a test booking with default values that can be overridden.
 * Follows factory pattern from server.test.js for mock object creation.
 * @param {Partial<TestBooking>} [overrides={}] - Properties to override defaults
 * @returns {TestBooking} Complete booking object with all required fields
 */
export function createBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  const defaultBooking: TestBooking = {
    id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: validDate,
    time: '18:00',
    partySize: 4,
    userId: 'user-001',
    name: 'John Doe',
    phone: '555-123-4567',
    email: 'john.doe@example.com',
    status: 'confirmed',
    confirmationCode: generateConfirmationCode(),
    specialRequests: undefined,
  };

  return {
    ...defaultBooking,
    ...overrides,
  };
}

/**
 * Creates a time slot with default availability settings.
 * @param {string} time - Time in 24-hour format (HH:MM)
 * @param {boolean} [available=true] - Whether the slot is available
 * @param {number} [remainingCapacity] - Optional remaining capacity override
 * @returns {TimeSlot} Time slot object
 */
export function createTimeSlot(
  time: string,
  available: boolean = true,
  remainingCapacity?: number
): TimeSlot {
  return {
    time,
    available,
    remainingCapacity: remainingCapacity ?? (available ? MAX_CAPACITY : 0),
  };
}

// ============================================================================
// Date Fixtures
// ============================================================================

/**
 * Valid future date for successful booking scenarios.
 * Set to 30 days in the future to ensure it's always valid.
 */
export const validDate: string = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
})();

/**
 * Past date for validation error testing.
 * Should trigger date validation errors.
 */
export const pastDate: string = (() => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
})();

/**
 * Closed date representing a holiday when restaurant is closed.
 * Used for testing booking rejection on closed days.
 */
export const closedDate: string = (() => {
  // Christmas Day as a common closed date
  const year = new Date().getFullYear() + 1;
  return `${year}-12-25`;
})();

// ============================================================================
// Booking Status Collection
// ============================================================================

/**
 * Array of all possible booking statuses for iteration and validation.
 */
export const bookingStatuses: BookingStatus[] = [
  'confirmed',
  'cancelled',
  'completed',
  'no-show',
];

// ============================================================================
// Time Slot Fixtures
// ============================================================================

/**
 * Collection of available time slots for successful booking scenarios.
 * Represents typical available dinner reservation times.
 */
export const availableSlots: TimeSlot[] = [
  createTimeSlot('11:00', true, 100),
  createTimeSlot('11:30', true, 80),
  createTimeSlot('12:00', true, 60),
  createTimeSlot('12:30', true, 70),
  createTimeSlot('13:00', true, 90),
  createTimeSlot('17:00', true, 100),
  createTimeSlot('17:30', true, 85),
  createTimeSlot('18:00', true, 50),
  createTimeSlot('18:30', true, 45),
  createTimeSlot('19:00', true, 40),
  createTimeSlot('19:30', true, 55),
  createTimeSlot('20:00', true, 65),
  createTimeSlot('20:30', true, 75),
  createTimeSlot('21:00', true, 80),
];

/**
 * Collection of fully booked time slots for unavailability testing.
 * All slots have zero remaining capacity.
 */
export const bookedSlots: TimeSlot[] = [
  createTimeSlot('18:00', false, 0),
  createTimeSlot('18:30', false, 0),
  createTimeSlot('19:00', false, 0),
  createTimeSlot('19:30', false, 0),
  createTimeSlot('20:00', false, 0),
];

/**
 * Collection of partially available slots with varying capacity.
 * Used for testing capacity validation and boundary conditions.
 */
export const partialSlots: TimeSlot[] = [
  createTimeSlot('17:00', true, 50),
  createTimeSlot('17:30', true, 25),
  createTimeSlot('18:00', true, 10),
  createTimeSlot('18:30', true, 5),
  createTimeSlot('19:00', true, 2),
  createTimeSlot('19:30', false, 0),
  createTimeSlot('20:00', true, 15),
  createTimeSlot('20:30', true, 30),
];

// ============================================================================
// Individual Booking Fixtures by Status
// ============================================================================

/**
 * Confirmed booking for successful reservation scenarios.
 */
export const confirmedBooking: TestBooking = {
  id: 'booking-confirmed-001',
  date: validDate,
  time: '18:00',
  partySize: 4,
  userId: 'user-001',
  name: 'Alice Johnson',
  phone: '555-111-2222',
  email: 'alice.johnson@example.com',
  status: 'confirmed',
  confirmationCode: 'BRG-CONF1',
  specialRequests: 'Window seat preferred',
};

/**
 * Cancelled booking for cancellation flow testing.
 */
export const cancelledBooking: TestBooking = {
  id: 'booking-cancelled-001',
  date: validDate,
  time: '19:00',
  partySize: 2,
  userId: 'user-002',
  name: 'Bob Smith',
  phone: '555-333-4444',
  email: 'bob.smith@example.com',
  status: 'cancelled',
  confirmationCode: 'BRG-CANC1',
  specialRequests: undefined,
};

/**
 * Completed booking for history and past reservation testing.
 */
export const completedBooking: TestBooking = {
  id: 'booking-completed-001',
  date: pastDate,
  time: '20:00',
  partySize: 6,
  userId: 'user-003',
  name: 'Carol Davis',
  phone: '555-555-6666',
  email: 'carol.davis@example.com',
  status: 'completed',
  confirmationCode: 'BRG-COMP1',
  specialRequests: 'Birthday celebration - please bring cake',
};

/**
 * No-show booking for missed reservation testing.
 */
export const noShowBooking: TestBooking = {
  id: 'booking-noshow-001',
  date: pastDate,
  time: '19:30',
  partySize: 3,
  userId: 'user-004',
  name: 'David Wilson',
  phone: '555-777-8888',
  email: 'david.wilson@example.com',
  status: 'no-show',
  confirmationCode: 'BRG-NOSH1',
  specialRequests: undefined,
};

// ============================================================================
// Edge Case Booking Fixtures
// ============================================================================

/**
 * Booking with maximum allowed party size (20 guests).
 * Tests upper boundary of party size validation.
 */
export const maxPartySizeBooking: TestBooking = {
  id: 'booking-max-party-001',
  date: validDate,
  time: '18:00',
  partySize: MAX_PARTY_SIZE,
  userId: 'user-005',
  name: 'Large Party Host',
  phone: '555-999-0000',
  email: 'large.party@example.com',
  status: 'confirmed',
  confirmationCode: 'BRG-MAXP1',
  specialRequests: 'Large group - need extended table arrangement',
};

/**
 * Booking with minimum party size (1 guest).
 * Tests lower boundary of party size validation.
 */
export const minPartySizeBooking: TestBooking = {
  id: 'booking-min-party-001',
  date: validDate,
  time: '12:00',
  partySize: MIN_PARTY_SIZE,
  userId: 'user-006',
  name: 'Solo Diner',
  phone: '555-111-0001',
  email: 'solo.diner@example.com',
  status: 'confirmed',
  confirmationCode: 'BRG-MINP1',
  specialRequests: 'Bar seating is fine',
};

/**
 * Booking at restaurant opening time.
 * Tests earliest available time slot.
 */
export const openingTimeBooking: TestBooking = {
  id: 'booking-opening-001',
  date: validDate,
  time: OPENING_TIME,
  partySize: 2,
  userId: 'user-007',
  name: 'Early Bird',
  phone: '555-222-0002',
  email: 'early.bird@example.com',
  status: 'confirmed',
  confirmationCode: 'BRG-OPEN1',
  specialRequests: 'Prefer quiet corner',
};

/**
 * Booking at last available slot before closing.
 * Tests latest available time slot.
 */
export const lastSlotBooking: TestBooking = {
  id: 'booking-last-slot-001',
  date: validDate,
  time: LAST_SLOT_TIME,
  partySize: 4,
  userId: 'user-008',
  name: 'Late Diner',
  phone: '555-333-0003',
  email: 'late.diner@example.com',
  status: 'confirmed',
  confirmationCode: 'BRG-LAST1',
  specialRequests: undefined,
};

/**
 * Booking with special characters in name and special requests.
 * Tests handling of unicode and special character input.
 */
export const specialCharsBooking: TestBooking = {
  id: 'booking-special-chars-001',
  date: validDate,
  time: '19:00',
  partySize: 3,
  userId: 'user-009',
  name: "José O'Brien-García",
  phone: '555-444-0004',
  email: 'jose.obrien@example.com',
  status: 'confirmed',
  confirmationCode: 'BRG-SPEC1',
  specialRequests: 'Allergie: crustacés & fruits à coque. Végétarien pour 1 personne.',
};

// ============================================================================
// Error Scenario Fixtures
// ============================================================================

/**
 * Booking attempt for an unavailable (fully booked) time slot.
 * Used for testing unavailability error handling.
 */
export const unavailableSlotBooking: CreateBookingRequest = {
  date: validDate,
  time: '19:00',
  partySize: 4,
  name: 'Unavailable Test',
  phone: '555-555-0005',
  email: 'unavailable.test@example.com',
  specialRequests: undefined,
};

/**
 * Booking attempt for a past date.
 * Used for testing date validation error handling.
 */
export const pastDateBooking: CreateBookingRequest = {
  date: pastDate,
  time: '18:00',
  partySize: 2,
  name: 'Past Date Test',
  phone: '555-666-0006',
  email: 'past.date@example.com',
  specialRequests: undefined,
};

/**
 * Booking attempt with party size exceeding maximum limit.
 * Used for testing party size validation error handling.
 */
export const invalidPartySizeBooking: CreateBookingRequest = {
  date: validDate,
  time: '18:00',
  partySize: MAX_PARTY_SIZE + 5, // 25 guests, exceeding limit
  name: 'Invalid Party Size Test',
  phone: '555-777-0007',
  email: 'invalid.party@example.com',
  specialRequests: 'Need space for 25 people',
};

// ============================================================================
// Booking Collections
// ============================================================================

/**
 * Main collection of test bookings with varied statuses.
 * Provides comprehensive test data for booking list displays and filtering.
 */
export const testBookings: TestBooking[] = [
  confirmedBooking,
  cancelledBooking,
  completedBooking,
  noShowBooking,
  maxPartySizeBooking,
  minPartySizeBooking,
  openingTimeBooking,
  lastSlotBooking,
  specialCharsBooking,
  // Additional bookings for comprehensive testing
  createBooking({
    id: 'booking-extra-001',
    date: validDate,
    time: '13:00',
    partySize: 5,
    userId: 'user-010',
    name: 'Lunch Reservation',
    phone: '555-888-0008',
    email: 'lunch@example.com',
    status: 'confirmed',
    confirmationCode: 'BRG-LUN01',
  }),
  createBooking({
    id: 'booking-extra-002',
    date: validDate,
    time: '17:30',
    partySize: 8,
    userId: 'user-011',
    name: 'Business Dinner',
    phone: '555-999-0009',
    email: 'business@example.com',
    status: 'confirmed',
    confirmationCode: 'BRG-BUS01',
    specialRequests: 'Need projector setup',
  }),
  createBooking({
    id: 'booking-extra-003',
    date: validDate,
    time: '20:30',
    partySize: 2,
    userId: 'user-012',
    name: 'Anniversary Dinner',
    phone: '555-000-1111',
    email: 'anniversary@example.com',
    status: 'confirmed',
    confirmationCode: 'BRG-ANN01',
    specialRequests: 'Please prepare flowers and champagne',
  }),
];
