import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as paymentDb from '../db/paymentDb';
import * as bookingDb from '../db/bookingDb';
import { eventually, futureDate } from '../helpers/eventually';

const TEST_USER_ID = '1';
const TEST_USER_EMAIL = 'test@example.com';

describe('Cancel during payment window — PENDING booking cancelled before payment', () => {
  let hotelId: number;
  let roomId: number;
  let bookingId: number;

  beforeAll(async () => {
    const hotels = await hotelClient.getAllHotels();
    hotelId = Number(hotels[0].id);
    const rooms = await hotelClient.getRoomsByHotel(hotelId);
    roomId = Number(rooms[0].id);
  }, 10_000);

  it('creates a PENDING booking', async () => {
    const res = await bookingClient.createBooking(
      {
        hotelId,
        roomId,
        totalGuests: 2,
        checkIn: futureDate(70),
        checkOut: futureDate(72),
        idempotencyKey: crypto.randomUUID(),
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );
    expect(res.status).toBe(201);
    bookingId = res.data?.data?.bookingId;
    expect(bookingId).toBeDefined();
  });

  it('booking is PENDING in DB', async () => {
    const booking = await bookingDb.getBooking(bookingId);
    expect(booking).toBeDefined();
    expect(booking.status).toBe('PENDING');
  });

  it('cancels the booking before payment', async () => {
    const res = await bookingClient.cancelBooking(bookingId, TEST_USER_ID, TEST_USER_EMAIL);
    expect(res.status).toBe(200);
  });

  it('DB confirms CANCELLED', async () => {
    const booking = await bookingDb.getBooking(bookingId);
    expect(booking.status).toBe('CANCELLED');
  });

  it('outbox has BOOKING_CANCELLED', async () => {
    await eventually(async () => {
      const count = await bookingDb.getOutboxCount('BOOKING_CANCELLED', bookingId);
      return count > 0;
    }, { timeout: 10_000 });

    const outbox = await bookingDb.getOutboxEvent('BOOKING_CANCELLED', bookingId);
    expect(outbox).toBeDefined();
  });

  it('no payment was ever created for this booking', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment).toBeNull();
  });

  it('BOOKING_CANCELLED event exists in outbox', async () => {
    await eventually(async () => {
      const count = await bookingDb.getOutboxCount('BOOKING_CANCELLED', bookingId);
      return count > 0;
    }, { timeout: 10_000 });

    const outbox = await bookingDb.getOutboxEvent('BOOKING_CANCELLED', bookingId);
    expect(outbox).toBeDefined();
  });
});
