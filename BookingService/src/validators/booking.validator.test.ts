import { describe, it, expect } from 'vitest';
import { createBookingSchema, checkAvailabilitySchema, bookingIdParamSchema } from './booking.validator';

describe('Booking Schema — createBookingSchema', () => {
  const validBooking = {
    hotelId: 1,
    roomId: 10,
    totalGuests: 2,
    checkIn: '2026-09-01',
    checkOut: '2026-09-05',
  };

  it('accepts valid booking data', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('accepts optional idempotencyKey as UUID', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects check-in date in the past', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      checkIn: '2020-01-01',
      checkOut: '2020-01-05',
    });
    expect(result.success).toBe(false);
  });

  it('rejects check-out before or equal to check-in', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      checkIn: '2026-09-05',
      checkOut: '2026-09-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects check-out equal to check-in', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      checkIn: '2026-09-05',
      checkOut: '2026-09-05',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing hotelId', () => {
    const { hotelId, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer hotelId', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      hotelId: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero totalGuests', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      totalGuests: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID idempotencyKey', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      idempotencyKey: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      checkIn: '09-01-2026',
    });
    expect(result.success).toBe(false);
  });
});

describe('Booking Schema — checkAvailabilitySchema', () => {
  it('accepts valid availability query', () => {
    const result = checkAvailabilitySchema.safeParse({
      hotelId: 1,
      roomId: 10,
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing roomId', () => {
    const result = checkAvailabilitySchema.safeParse({
      hotelId: 1,
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
    });
    expect(result.success).toBe(false);
  });
});

describe('Booking Schema — bookingIdParamSchema', () => {
  it('accepts valid integer id', () => {
    const result = bookingIdParamSchema.safeParse({ id: '42' });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric id', () => {
    const result = bookingIdParamSchema.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });
});