import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as paymentClient from '../clients/payment';
import * as paymentDb from '../db/paymentDb';
import * as bookingDb from '../db/bookingDb';
import { observer } from '../broker/observer';
import { eventually, futureDate } from '../helpers/eventually';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'zFWTWhWSFXfVUZpNdx6KoyhW';
const TEST_USER_ID = '1';
const TEST_USER_EMAIL = 'test@example.com';

function computeHmac(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function findRoom() {
  const hotels = await hotelClient.getAllHotels();
  const hotelId = Number(hotels[0].id);
  const rooms = await hotelClient.getRoomsByHotel(hotelId);
  return { hotelId, roomId: Number(rooms[0].id) };
}

describe('Idempotency — duplicate HTTP requests', () => {
  it('sequential resubmission of the same idempotency key returns the same booking', async () => {
    const { hotelId, roomId } = await findRoom();
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      hotelId, roomId, totalGuests: 2,
      checkIn: futureDate(90), checkOut: futureDate(92),
      idempotencyKey,
    };

    const first = await bookingClient.createBooking(payload, TEST_USER_ID, TEST_USER_EMAIL);
    expect(first.status).toBe(201);
    expect(first.data?.data?.duplicated).toBe(false);
    const bookingId = first.data?.data?.bookingId;

    const second = await bookingClient.createBooking(payload, TEST_USER_ID, TEST_USER_EMAIL);
    expect(second.status).toBe(200);
    expect(second.data?.data?.duplicated).toBe(true);
    expect(second.data?.data?.bookingId).toBe(bookingId);

    const rows = await bookingDb.getOutboxCount('BOOKING_CREATED', bookingId);
    expect(rows).toBe(1);
  });

  it('truly concurrent resubmission of the same idempotency key still yields one booking', async () => {
    const { hotelId, roomId } = await findRoom();
    const idempotencyKey = crypto.randomUUID();
    const offset = 160 + (Date.now() % 10);
    const payload = {
      hotelId, roomId, totalGuests: 2,
      checkIn: futureDate(offset), checkOut: futureDate(offset + 2),
      idempotencyKey,
    };

    const [a, b] = await Promise.all([
      bookingClient.createBooking(payload, TEST_USER_ID, TEST_USER_EMAIL),
      bookingClient.createBooking(payload, TEST_USER_ID, TEST_USER_EMAIL),
    ]);

    const bookingIds = [a, b].map((r) => r.data?.data?.bookingId).filter(Boolean);
    const uniqueIds = new Set(bookingIds);
    expect(uniqueIds.size).toBe(1);

    const statuses = [a.status, b.status].sort();
    // Under true concurrency, the Redlock serializes both requests.
    // Valid outcomes: [201, 400] (one wins), [200, 201] (idempotency + create),
    // or [400, 400] (both lose the race to Redis/DB conflict check).
    // The ONLY invalid outcome is [201, 201] — two bookings for the same room/dates.
    expect(statuses.filter(s => s === 201).length).toBeLessThanOrEqual(1);
  });
});

describe('Idempotency — duplicate event delivery', () => {
  let hotelId: number;
  let roomId: number;
  let bookingId: number;

  beforeAll(async () => {
    await observer.start();
    ({ hotelId, roomId } = await findRoom());
  }, 10_000);

  afterAll(async () => {
    await observer.stop();
  });

  it('creates a booking and reaches a CREATED payment', async () => {
    const offset = 170 + (Date.now() % 10);
    const res = await bookingClient.createBooking(
      {
        hotelId, roomId, totalGuests: 2,
        checkIn: futureDate(offset), checkOut: futureDate(offset + 2),
        idempotencyKey: crypto.randomUUID(),
      },
      TEST_USER_ID, TEST_USER_EMAIL,
    );
    expect(res.status).toBe(201);
    bookingId = res.data?.data?.bookingId;

    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      return payment?.status === 'CREATED';
    }, { timeout: 20_000 });
  });

  it('sending the same /payments/verify capture twice only captures once', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment).toBeDefined();
    const fakePaymentId = 'pay_test_idem_dup';
    const signature = computeHmac(payment.razorpay_order_id, fakePaymentId);

    const verifyPayload = {
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: signature,
      bookingId,
    };

    const first = await paymentClient.verifyPayment(verifyPayload, TEST_USER_ID, TEST_USER_EMAIL);
    expect(first.status).toBe(200);

    await eventually(async () => {
      const p = await paymentDb.getPaymentByBookingId(bookingId);
      return p?.status === 'CAPTURED';
    }, { timeout: 10_000 });

    const second = await paymentClient.verifyPayment(verifyPayload, TEST_USER_ID, TEST_USER_EMAIL);
    expect(second.status).toBe(200);

    const count = await paymentDb.countPaymentsByBooking(bookingId);
    expect(count).toBe(1);

    await eventually(async () => {
      const booking = await bookingDb.getBooking(bookingId);
      return booking?.status === 'CONFIRMED';
    }, { timeout: 10_000 });

    const booking = await bookingDb.getBooking(bookingId);
    expect(booking.status).toBe('CONFIRMED');
  });
});
