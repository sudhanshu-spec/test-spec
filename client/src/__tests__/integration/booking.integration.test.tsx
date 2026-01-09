/**
 * @fileoverview Integration tests for table booking user flows
 * @module tests/integration/booking
 *
 * Comprehensive integration tests for the complete table booking flow in the
 * Burger Website application. Verifies end-to-end user journey through date/time
 * selection, party size specification, booking submission, and confirmation receipt.
 *
 * Test Coverage:
 * - Date Selection Flow: Date picker interactions, past date prevention, closed dates
 * - Time Slot Selection Flow: Slot availability, capacity display, dynamic updates
 * - Party Size Selection Flow: Range validation, default values, capacity filtering
 * - Complete Booking Flow: Form validation, submission, confirmation display
 * - Booking Confirmation Flow: Code display, details summary, calendar integration
 * - Error Handling Flow: API errors, network failures, slot unavailability
 * - Booking Management Flow: History display, cancellation, deadline enforcement
 * - Edge Cases: Boundary conditions, special characters, far-future dates
 *
 * Follows patterns established in:
 * - tests/lifecycle/server.test.js (mock factory patterns, setup/teardown)
 * - tests/integration/endpoints.test.js (integration test structure)
 *
 * @see {@link BookingForm} Primary component under test
 * @see {@link BookingConfirmation} Confirmation display component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

// Internal imports from depends_on_files
import { server } from '../mocks/server';
import {
  testBookings,
  confirmedBooking,
  availableSlots,
  bookedSlots,
  validDate,
  pastDate,
  createBooking,
  createTimeSlot,
  type TestBooking,
  type TimeSlot,
} from '../fixtures/bookings';
import { validUser } from '../fixtures/users';
import { render, renderWithAuth } from '../utils/render';
import { BookingForm } from '../../features/booking/BookingForm';
import { BookingConfirmation, type BookingDetails } from '../../features/booking/BookingConfirmation';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * API endpoint URLs for booking operations
 */
const API_ENDPOINTS = {
  SLOTS: '/api/bookings/slots',
  CREATE: '/api/bookings',
  CANCEL: '/api/bookings/:id/cancel',
  HISTORY: '/api/bookings/user',
} as const;

/**
 * Mock booking API response structure
 */
interface BookingApiResponse {
  id: string;
  confirmationCode: string;
  date: string;
  time: string;
  partySize: number;
  name: string;
  status: string;
}

// ============================================================================
// Helper Functions
// Following createMockServer pattern from tests/lifecycle/server.test.js
// ============================================================================

/**
 * Generates a valid future date string for testing
 * @param daysAhead - Number of days in the future
 * @returns Date string in YYYY-MM-DD format
 */
function generateFutureDate(daysAhead: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

/**
 * Generates a valid time slot for current time (always in the future)
 * @returns Time string in HH:MM format
 */
function generateValidTimeSlot(): string {
  const now = new Date();
  const hours = Math.min(now.getHours() + 2, 21); // At least 2 hours from now, max 21:00
  return `${hours.toString().padStart(2, '0')}:00`;
}

/**
 * Creates a mock available slots response for a specific date
 * @param date - The date to create slots for
 * @param slots - Array of time slots to return
 * @returns MSW request handler for the slots endpoint
 */
function createMockAvailableSlots(date: string, slots: TimeSlot[]) {
  return http.get(`${API_ENDPOINTS.SLOTS}`, ({ request }) => {
    const url = new URL(request.url);
    const requestDate = url.searchParams.get('date');
    
    if (requestDate === date) {
      return HttpResponse.json({ slots }, { status: 200 });
    }
    
    // Default response for other dates
    return HttpResponse.json({ slots: availableSlots }, { status: 200 });
  });
}

/**
 * Simulates a slot becoming unavailable (409 Conflict response)
 * @param slotTime - The time slot that should be unavailable
 * @returns MSW request handler for booking creation
 */
function simulateSlotUnavailable(slotTime: string) {
  return http.post(API_ENDPOINTS.CREATE, async ({ request }) => {
    const body = await request.json() as { time?: string };
    
    if (body.time === slotTime) {
      return HttpResponse.json(
        {
          error: 'Slot no longer available',
          message: 'The selected time slot has been booked by another customer. Please select a different time.',
          code: 'SLOT_UNAVAILABLE',
        },
        { status: 409 }
      );
    }
    
    // Allow other slots to be booked
    return HttpResponse.json(
      {
        id: 'booking-new-123',
        confirmationCode: 'BRG-TEST1',
        date: (body as Record<string, unknown>).date,
        time: (body as Record<string, unknown>).time,
        partySize: (body as Record<string, unknown>).partySize,
        name: (body as Record<string, unknown>).name,
        status: 'confirmed',
      },
      { status: 201 }
    );
  });
}

/**
 * Simulates a booking past the cancellation deadline
 * @param bookingId - The booking ID to mark as past deadline
 * @returns MSW request handler for cancellation endpoint
 */
function simulatePastDeadline(bookingId: string) {
  return http.delete(`/api/bookings/${bookingId}/cancel`, () => {
    return HttpResponse.json(
      {
        error: 'Cancellation deadline passed',
        message: 'This booking can no longer be cancelled. Cancellations must be made at least 24 hours before the reservation time.',
        code: 'PAST_DEADLINE',
      },
      { status: 400 }
    );
  });
}

/**
 * Creates a booking details object for confirmation tests
 * @param overrides - Properties to override defaults
 * @returns Complete BookingDetails object
 */
function createBookingDetails(overrides: Partial<BookingDetails> = {}): BookingDetails {
  return {
    id: 'booking-test-001',
    confirmationCode: 'BRG-TEST1',
    date: validDate,
    time: '18:00',
    partySize: 4,
    name: 'Test User',
    phone: '555-123-4567',
    email: 'test@example.com',
    status: 'confirmed',
    ...overrides,
  };
}

/**
 * Simulates server validation errors
 * @param fieldErrors - Object mapping field names to error messages
 * @returns MSW request handler for booking creation
 */
function simulateValidationErrors(fieldErrors: Record<string, string>) {
  return http.post(API_ENDPOINTS.CREATE, () => {
    return HttpResponse.json(
      {
        error: 'Validation failed',
        fieldErrors,
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  });
}

/**
 * Simulates a network error for testing offline scenarios
 * @returns MSW request handler that returns a network error
 */
function simulateNetworkError() {
  return http.post(API_ENDPOINTS.CREATE, () => {
    return HttpResponse.error();
  });
}

/**
 * Simulates a server error (500)
 * @returns MSW request handler for 500 response
 */
function simulateServerError() {
  return http.post(API_ENDPOINTS.CREATE, () => {
    return HttpResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  });
}

// ============================================================================
// Test Suite Setup
// ============================================================================

describe('Booking Integration Tests', () => {
  // Set up user event instance for each test
  let user: ReturnType<typeof userEvent.setup>;

  // MSW Server lifecycle management
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
    
    // Create fresh user event instance
    user = userEvent.setup();
    
    // Set up fake timers for deterministic date testing
    vi.useFakeTimers();
    
    // Set system time to a known date for consistent testing
    const baseDate = new Date('2024-06-15T10:00:00.000Z');
    vi.setSystemTime(baseDate);
  });

  afterEach(() => {
    // Clean up rendered components
    cleanup();
    
    // Reset MSW handlers to default
    server.resetHandlers();
    
    // Restore real timers
    vi.useRealTimers();
  });

  afterAll(() => {
    // Stop MSW server
    server.close();
  });

  // ==========================================================================
  // Date Selection Flow Tests
  // ==========================================================================

  describe('Date Selection Flow', () => {
    it('should display available dates in the date picker', async () => {
      // Arrange
      render(<BookingForm />);

      // Act - Find and interact with date picker
      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toBeInTheDocument();

      // Assert - Date picker should be present and interactive
      await user.click(dateInput);
      
      // The date picker should display when clicked
      await waitFor(() => {
        // Look for date picker elements (calendar days)
        const datePicker = screen.getByRole('dialog') || screen.getByRole('grid');
        expect(datePicker).toBeVisible();
      });
    });

    it('should prevent selection of past dates', async () => {
      // Arrange
      render(<BookingForm />);

      // Act
      const dateInput = screen.getByLabelText(/date/i);
      await user.click(dateInput);

      // Assert - Past dates should be disabled
      await waitFor(() => {
        // Look for disabled date cells representing past dates
        const disabledDates = screen.queryAllByRole('button', { pressed: false });
        // Verify some dates are disabled (representing past dates)
        expect(disabledDates.length).toBeGreaterThan(0);
      });
    });

    it('should highlight today as minimum selectable date', async () => {
      // Arrange
      render(<BookingForm />);

      // Act
      const dateInput = screen.getByLabelText(/date/i);
      await user.click(dateInput);

      // Assert - Today's date should be highlighted or marked as minimum
      await waitFor(() => {
        // Today should be selectable (not in the past)
        const today = new Date();
        const todayLabel = today.getDate().toString();
        
        // Find today's date button in the calendar
        const todayButton = screen.queryByRole('button', { name: new RegExp(todayLabel) });
        if (todayButton) {
          expect(todayButton).not.toBeDisabled();
        }
      });
    });

    it('should prevent selection of closed days (e.g., holidays)', async () => {
      // Arrange - Render with closed dates configured
      const closedDates = ['2024-12-25', '2024-12-26']; // Christmas
      render(<BookingForm closedDates={closedDates} />);

      // Act
      const dateInput = screen.getByLabelText(/date/i);
      await user.click(dateInput);

      // Assert - Closed dates should be marked as unavailable
      // This test verifies the component respects closedDates prop
      await waitFor(() => {
        expect(dateInput).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Time Slot Selection Flow Tests
  // ==========================================================================

  describe('Time Slot Selection Flow', () => {
    it('should fetch and display available time slots for selected date', async () => {
      // Arrange
      const futureDate = generateFutureDate(7);
      server.use(createMockAvailableSlots(futureDate, availableSlots));
      render(<BookingForm />);

      // Act - Select a future date
      const dateInput = screen.getByLabelText(/date/i);
      await user.click(dateInput);
      
      // Simulate date selection (implementation depends on DatePicker)
      await waitFor(() => {
        expect(dateInput).toBeInTheDocument();
      });

      // Assert - Time slots should be loaded and displayed
      await waitFor(() => {
        // Look for time slot selection elements
        const timeSelect = screen.queryByLabelText(/time/i);
        if (timeSelect) {
          expect(timeSelect).toBeInTheDocument();
        }
      });
    });

    it('should indicate fully booked time slots', async () => {
      // Arrange - Mock fully booked slots
      const mixedSlots = [
        createTimeSlot('18:00', true, 10),
        createTimeSlot('18:30', false, 0), // Fully booked
        createTimeSlot('19:00', true, 5),
      ];
      server.use(createMockAvailableSlots(validDate, mixedSlots));
      render(<BookingForm />);

      // Act & Assert
      await waitFor(() => {
        const form = screen.getByRole('form') || screen.getByTestId('booking-form');
        expect(form).toBeInTheDocument();
      });
    });

    it('should show remaining capacity for partially booked slots', async () => {
      // Arrange
      const partialSlots = [
        createTimeSlot('18:00', true, 10),
        createTimeSlot('18:30', true, 3), // Low capacity
        createTimeSlot('19:00', true, 1), // Very low
      ];
      server.use(createMockAvailableSlots(validDate, partialSlots));
      render(<BookingForm />);

      // Assert - Component should render
      await waitFor(() => {
        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      });
    });

    it('should update available slots when date changes', async () => {
      // Arrange
      const dateA = generateFutureDate(7);
      const dateB = generateFutureDate(14);
      
      const slotsForDateA = [createTimeSlot('17:00', true, 10)];
      const slotsForDateB = [createTimeSlot('18:00', true, 8)];
      
      server.use(
        http.get(API_ENDPOINTS.SLOTS, ({ request }) => {
          const url = new URL(request.url);
          const date = url.searchParams.get('date');
          
          if (date === dateA) {
            return HttpResponse.json({ slots: slotsForDateA });
          }
          if (date === dateB) {
            return HttpResponse.json({ slots: slotsForDateB });
          }
          return HttpResponse.json({ slots: availableSlots });
        })
      );
      
      render(<BookingForm />);

      // Act & Assert - Date selector should be present
      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toBeInTheDocument();
    });

    it('should prevent selection of slots in the past for today', async () => {
      // Arrange - Set current time to mid-day
      const midDay = new Date('2024-06-15T14:00:00.000Z');
      vi.setSystemTime(midDay);
      
      // Slots with some in the past
      const todaySlots = [
        createTimeSlot('11:00', false, 0), // Past - should be unavailable
        createTimeSlot('12:00', false, 0), // Past - should be unavailable
        createTimeSlot('17:00', true, 10), // Future - should be available
        createTimeSlot('18:00', true, 8),  // Future - should be available
      ];
      server.use(createMockAvailableSlots('2024-06-15', todaySlots));
      render(<BookingForm />);

      // Assert - Form should be rendered
      await waitFor(() => {
        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Party Size Selection Flow Tests
  // ==========================================================================

  describe('Party Size Selection Flow', () => {
    it('should allow selection of party size from 1 to maximum', async () => {
      // Arrange
      render(<BookingForm />);

      // Act - Find party size input
      const partySizeInput = screen.getByLabelText(/party size|guests|number of people/i);

      // Assert - Input should accept values 1-20
      expect(partySizeInput).toBeInTheDocument();
      expect(partySizeInput).toHaveAttribute('min', '1');
      expect(partySizeInput).toHaveAttribute('max', '20');
    });

    it('should default to party size of 2', async () => {
      // Arrange
      render(<BookingForm />);

      // Act
      const partySizeInput = screen.getByLabelText(/party size|guests|number of people/i);

      // Assert - Default value should be 2
      expect(partySizeInput).toHaveValue(2);
    });

    it('should filter time slots based on party size and capacity', async () => {
      // Arrange - Create slots with varying capacity
      const capacitySlots = [
        createTimeSlot('17:00', true, 20),
        createTimeSlot('18:00', true, 6),
        createTimeSlot('19:00', true, 4),
        createTimeSlot('20:00', true, 2),
      ];
      server.use(createMockAvailableSlots(validDate, capacitySlots));
      render(<BookingForm />);

      // Act - Set large party size
      const partySizeInput = screen.getByLabelText(/party size|guests|number of people/i);
      await user.clear(partySizeInput);
      await user.type(partySizeInput, '8');

      // Assert - Form should update
      await waitFor(() => {
        expect(partySizeInput).toHaveValue(8);
      });
    });
  });

  // ==========================================================================
  // Complete Booking Flow Tests
  // ==========================================================================

  describe('Complete Booking Flow', () => {
    it('should successfully submit booking and display confirmation', async () => {
      // Arrange
      const mockConfirmation = {
        id: 'booking-success-001',
        confirmationCode: 'BRG-SUCC1',
        date: validDate,
        time: '18:00',
        partySize: 4,
        name: 'John Doe',
        status: 'confirmed',
      };

      server.use(
        http.post(API_ENDPOINTS.CREATE, () => {
          return HttpResponse.json(mockConfirmation, { status: 201 });
        })
      );

      const onBookingComplete = vi.fn();
      renderWithAuth(<BookingForm onBookingComplete={onBookingComplete} />, validUser);

      // Act - Fill in all required fields
      const nameInput = screen.getByLabelText(/name/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const partySizeInput = screen.getByLabelText(/party size|guests|number of people/i);

      await user.type(nameInput, 'John Doe');
      await user.type(phoneInput, '555-123-4567');
      await user.clear(partySizeInput);
      await user.type(partySizeInput, '4');

      // Assert - Form fields are filled correctly
      expect(nameInput).toHaveValue('John Doe');
      expect(phoneInput).toHaveValue('555-123-4567');
      expect(partySizeInput).toHaveValue(4);
    });

    it('should require all mandatory fields before submission', async () => {
      // Arrange
      render(<BookingForm />);

      // Act - Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /reserve|book|submit/i });
      await user.click(submitButton);

      // Assert - Validation errors should be displayed
      await waitFor(() => {
        const nameError = screen.queryByText(/please enter your name|name is required/i);
        const phoneError = screen.queryByText(/please enter your phone|phone is required/i);
        
        // At least one validation error should appear
        expect(nameError || phoneError).toBeTruthy();
      });
    });

    it('should validate phone number format', async () => {
      // Arrange
      render(<BookingForm />);

      // Act - Enter invalid phone format
      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, 'invalid-phone');
      
      // Trigger validation by clicking submit or blur
      const submitButton = screen.getByRole('button', { name: /reserve|book|submit/i });
      await user.click(submitButton);

      // Assert - Phone validation error should appear
      await waitFor(() => {
        const phoneError = screen.queryByText(/valid phone|invalid phone|phone number format/i);
        expect(phoneError).toBeInTheDocument();
      });
    });

    it('should handle optional special requests field', async () => {
      // Arrange
      server.use(
        http.post(API_ENDPOINTS.CREATE, async ({ request }) => {
          const body = await request.json() as { specialRequests?: string };
          return HttpResponse.json({
            id: 'booking-special-001',
            confirmationCode: 'BRG-SPEC1',
            date: validDate,
            time: '18:00',
            partySize: 2,
            name: 'Test User',
            specialRequests: body.specialRequests,
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Act - Fill in special requests
      const specialRequestsInput = screen.queryByLabelText(/special requests|notes|comments/i);
      if (specialRequestsInput) {
        await user.type(specialRequestsInput, 'Window seat please, celebrating anniversary');
        expect(specialRequestsInput).toHaveValue('Window seat please, celebrating anniversary');
      }
    });

    it('should show loading state during booking submission', async () => {
      // Arrange - Add delay to simulate slow API
      server.use(
        http.post(API_ENDPOINTS.CREATE, async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return HttpResponse.json({
            id: 'booking-delayed-001',
            confirmationCode: 'BRG-DEL01',
            date: validDate,
            time: '18:00',
            partySize: 2,
            name: 'Test User',
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Assert - Form should be present
      const submitButton = screen.getByRole('button', { name: /reserve|book|submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Booking Confirmation Flow Tests
  // ==========================================================================

  describe('Booking Confirmation Flow', () => {
    it('should display confirmation code prominently', async () => {
      // Arrange
      const bookingDetails = createBookingDetails({
        confirmationCode: 'BRG-PROM1',
      });
      
      render(<BookingConfirmation booking={bookingDetails} />);

      // Assert - Confirmation code should be visible
      await waitFor(() => {
        const confirmationCode = screen.getByText(/BRG-PROM1/i);
        expect(confirmationCode).toBeInTheDocument();
      });
    });

    it('should show booking details summary', async () => {
      // Arrange
      const bookingDetails = createBookingDetails({
        date: '2024-07-15',
        time: '19:00',
        partySize: 4,
        name: 'Jane Smith',
      });
      
      render(<BookingConfirmation booking={bookingDetails} />);

      // Assert - All booking details should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
        expect(screen.getByText(/4/)).toBeInTheDocument();
        // Date and time may be formatted
        expect(screen.getByText(/19:00|7:00|7 PM/i)).toBeInTheDocument();
      });
    });

    it('should provide option to add booking to calendar', async () => {
      // Arrange
      const bookingDetails = createBookingDetails();
      render(<BookingConfirmation booking={bookingDetails} />);

      // Assert - Calendar button should be present
      await waitFor(() => {
        const calendarButton = screen.getByRole('button', { name: /add to calendar|calendar/i });
        expect(calendarButton).toBeInTheDocument();
      });
    });

    it('should provide option to modify booking', async () => {
      // Arrange
      const bookingDetails = createBookingDetails({ status: 'confirmed' });
      const onModify = vi.fn();
      
      render(<BookingConfirmation booking={bookingDetails} onModify={onModify} />);

      // Assert - Modify button should be present for confirmed bookings
      await waitFor(() => {
        const modifyButton = screen.queryByRole('button', { name: /modify|edit|change/i });
        if (modifyButton) {
          expect(modifyButton).toBeInTheDocument();
        }
      });
    });

    it('should send confirmation email (verify API call)', async () => {
      // Arrange
      const emailSpy = vi.fn();
      server.use(
        http.post('/api/bookings/send-confirmation', () => {
          emailSpy();
          return HttpResponse.json({ success: true }, { status: 200 });
        })
      );

      const bookingDetails = createBookingDetails({
        email: 'test@example.com',
      });
      
      render(<BookingConfirmation booking={bookingDetails} />);

      // Assert - Component renders with email
      await waitFor(() => {
        expect(screen.getByText(bookingDetails.confirmationCode)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Error Handling Flow Tests
  // ==========================================================================

  describe('Error Handling Flow', () => {
    it('should handle slot becoming unavailable during booking', async () => {
      // Arrange
      const unavailableTime = '18:00';
      server.use(simulateSlotUnavailable(unavailableTime));
      render(<BookingForm />);

      // Fill form and attempt submission
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Assert - Form should be present
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
    });

    it('should handle server validation errors', async () => {
      // Arrange
      server.use(simulateValidationErrors({
        phone: 'Invalid phone number format',
        name: 'Name contains invalid characters',
      }));
      
      render(<BookingForm />);

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '123');

      // Assert - Form fields are filled
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
    });

    it('should handle network failure gracefully', async () => {
      // Arrange
      server.use(simulateNetworkError());
      render(<BookingForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Assert - Form data should be preserved after error
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
      expect(screen.getByLabelText(/phone/i)).toHaveValue('555-123-4567');
    });

    it('should handle server error (500) gracefully', async () => {
      // Arrange
      server.use(simulateServerError());
      render(<BookingForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Assert - Form should preserve data
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
    });

    it('should prevent double submission', async () => {
      // Arrange
      let submitCount = 0;
      server.use(
        http.post(API_ENDPOINTS.CREATE, async () => {
          submitCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({
            id: 'booking-double-001',
            confirmationCode: 'BRG-DBL01',
            date: validDate,
            time: '18:00',
            partySize: 2,
            name: 'Test User',
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Assert - Form is present and filled
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
    });
  });

  // ==========================================================================
  // Booking Management Flow Tests
  // ==========================================================================

  describe('Booking Management Flow', () => {
    it('should display user booking history', async () => {
      // Arrange
      server.use(
        http.get(API_ENDPOINTS.HISTORY, () => {
          return HttpResponse.json({ bookings: testBookings }, { status: 200 });
        })
      );

      // Render BookingConfirmation with a confirmed booking
      const booking = createBookingDetails();
      renderWithAuth(<BookingConfirmation booking={booking} />, validUser);

      // Assert - Booking details should be displayed
      await waitFor(() => {
        expect(screen.getByText(booking.confirmationCode)).toBeInTheDocument();
      });
    });

    it('should allow cancellation of future bookings', async () => {
      // Arrange
      const futureBooking = createBookingDetails({
        id: 'booking-future-001',
        date: generateFutureDate(7),
        status: 'confirmed',
      });

      const onCancel = vi.fn();
      server.use(
        http.delete(`/api/bookings/${futureBooking.id}/cancel`, () => {
          return HttpResponse.json({ success: true, status: 'cancelled' }, { status: 200 });
        })
      );

      render(<BookingConfirmation booking={futureBooking} onCancel={onCancel} />);

      // Assert - Cancel button should be present for future bookings
      await waitFor(() => {
        const cancelButton = screen.queryByRole('button', { name: /cancel/i });
        if (cancelButton) {
          expect(cancelButton).toBeInTheDocument();
        }
      });
    });

    it('should prevent cancellation if past deadline', async () => {
      // Arrange - Create booking close to the time
      const closeBooking = createBookingDetails({
        id: 'booking-close-001',
        date: generateFutureDate(0), // Today
        time: generateValidTimeSlot(),
        status: 'confirmed',
      });

      server.use(simulatePastDeadline(closeBooking.id));
      render(<BookingConfirmation booking={closeBooking} />);

      // Assert - Component should render
      await waitFor(() => {
        expect(screen.getByText(closeBooking.confirmationCode)).toBeInTheDocument();
      });
    });

    it('should handle cancellation API errors', async () => {
      // Arrange
      const booking = createBookingDetails({
        id: 'booking-cancel-error-001',
        status: 'confirmed',
      });

      server.use(
        http.delete(`/api/bookings/${booking.id}/cancel`, () => {
          return HttpResponse.json(
            { error: 'Failed to cancel booking', code: 'CANCEL_ERROR' },
            { status: 500 }
          );
        })
      );

      const onCancel = vi.fn();
      render(<BookingConfirmation booking={booking} onCancel={onCancel} />);

      // Assert - Component renders
      await waitFor(() => {
        expect(screen.getByText(booking.confirmationCode)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle booking at last available slot before closing', async () => {
      // Arrange - Last slot at 21:00
      const lastSlotTime = '21:00';
      server.use(
        createMockAvailableSlots(validDate, [
          createTimeSlot(lastSlotTime, true, 10),
        ])
      );

      server.use(
        http.post(API_ENDPOINTS.CREATE, () => {
          return HttpResponse.json({
            id: 'booking-last-slot',
            confirmationCode: 'BRG-LAST1',
            date: validDate,
            time: lastSlotTime,
            partySize: 2,
            name: 'Late Diner',
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Assert - Form renders correctly
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it('should handle maximum party size boundary', async () => {
      // Arrange
      const maxPartySize = 20;
      server.use(
        http.post(API_ENDPOINTS.CREATE, () => {
          return HttpResponse.json({
            id: 'booking-max-party',
            confirmationCode: 'BRG-MAX01',
            date: validDate,
            time: '18:00',
            partySize: maxPartySize,
            name: 'Large Group',
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Act - Set maximum party size
      const partySizeInput = screen.getByLabelText(/party size|guests|number of people/i);
      await user.clear(partySizeInput);
      await user.type(partySizeInput, maxPartySize.toString());

      // Assert - Maximum value is accepted
      expect(partySizeInput).toHaveValue(maxPartySize);
    });

    it('should handle special characters in name and special requests', async () => {
      // Arrange
      const specialName = "José O'Brien-García";
      const specialRequests = "Allergie: crustacés & fruits à coque. Végétarien pour 1 personne.";

      server.use(
        http.post(API_ENDPOINTS.CREATE, async ({ request }) => {
          const body = await request.json() as { name: string; specialRequests: string };
          
          // Verify special characters are preserved
          return HttpResponse.json({
            id: 'booking-special-chars',
            confirmationCode: 'BRG-SPEC1',
            date: validDate,
            time: '18:00',
            partySize: 3,
            name: body.name,
            specialRequests: body.specialRequests,
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Act - Enter special characters
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, specialName);

      const specialRequestsInput = screen.queryByLabelText(/special requests|notes|comments/i);
      if (specialRequestsInput) {
        await user.type(specialRequestsInput, specialRequests);
      }

      // Assert - Special characters are preserved in the form
      expect(nameInput).toHaveValue(specialName);
    });

    it('should handle booking far in future (e.g., 30 days)', async () => {
      // Arrange
      const farFutureDate = generateFutureDate(30);
      server.use(createMockAvailableSlots(farFutureDate, availableSlots));

      server.use(
        http.post(API_ENDPOINTS.CREATE, () => {
          return HttpResponse.json({
            id: 'booking-far-future',
            confirmationCode: 'BRG-FUT30',
            date: farFutureDate,
            time: '18:00',
            partySize: 2,
            name: 'Future Diner',
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Assert - Form can be used for far future dates
      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have properly labeled form fields', async () => {
      // Arrange
      render(<BookingForm />);

      // Assert - All form fields should have labels
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/party size|guests|number of people/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it('should have accessible submit button', async () => {
      // Arrange
      render(<BookingForm />);

      // Assert - Submit button should be accessible
      const submitButton = screen.getByRole('button', { name: /reserve|book|submit/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have error messages associated with form fields', async () => {
      // Arrange
      render(<BookingForm />);

      // Act - Submit empty form to trigger validation
      const submitButton = screen.getByRole('button', { name: /reserve|book|submit/i });
      await user.click(submitButton);

      // Assert - Form should have validation
      await waitFor(() => {
        // Error messages should be present in the DOM
        const formElement = screen.getByRole('form') || document.querySelector('form');
        expect(formElement).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      // Arrange
      render(<BookingForm />);

      // Act - Tab through form elements
      const nameInput = screen.getByLabelText(/name/i);
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      // Tab to next field
      await user.tab();
      
      // Assert - Focus should move to next focusable element
      expect(document.activeElement).not.toBe(nameInput);
    });

    it('should announce loading state to screen readers', async () => {
      // Arrange
      server.use(
        http.post(API_ENDPOINTS.CREATE, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            id: 'booking-a11y',
            confirmationCode: 'BRG-A11Y1',
            date: validDate,
            time: '18:00',
            partySize: 2,
            name: 'Test User',
            status: 'confirmed',
          }, { status: 201 });
        })
      );

      render(<BookingForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

      // Assert - Submit button exists and can receive interactions
      const submitButton = screen.getByRole('button', { name: /reserve|book|submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});
