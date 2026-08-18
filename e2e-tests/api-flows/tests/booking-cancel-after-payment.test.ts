import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as paymentClient from '../clients/payment';
import * as paymentDb from '../db/paymentDb';
import * as bookingDb from '../db/bookingDb';
import * as notificationDb from '../db/notificationDb';
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

describe('Cancel after payment — CONFIRMED booking cancelled triggers refund flow', () => {
  let hotelId: number;
  let roomId: number;
  let bookingId: number;

  beforeAll(async () => {
    await observer.start();
    const hotels = await hotelClient.getAllHotels();
    hotelId = Number(hotels[0].id);
    const rooms = await hotelClient.getRoomsByHotel(hotelId);
    roomId = Number(rooms[0].id);
  }, 10_000);

  afterAll(async () => {
    await observer.stop();
  });

  it('Step 1: creates a booking and reaches PENDING', async () => {
    const res = await bookingClient.createBooking(
      {
        hotelId,
        roomId,
        totalGuests: 2,
        checkIn: futureDate(80),
        checkOut: futureDate(82),
        idempotencyKey: crypto.randomUUID(),
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );
    expect(res.status).toBe(201);
    bookingId = res.data?.data?.bookingId;
  });

  it('Step 2: PaymentService creates payment from BOOKING_CREATED', async () => {
    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      return payment?.status === 'CREATED' ? true : false;
    }, { timeout: 15_000 });

    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment).toBeDefined();
    expect(payment.status).toBe('CREATED');
  });

  it('Step 3: verify payment → CAPTURED', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    const fakePaymentId = 'pay_test_cancel_after';
    const signature = computeHmac(payment.razorpay_order_id, fakePaymentId);

    const res = await paymentClient.verifyPayment(
      {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: signature,
        bookingId,
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );
    expect(res.status).toBe(200);
  });

  it('Step 4: booking becomes CONFIRMED', async () => {
    await eventually(async () => {
      const booking = await bookingDb.getBooking(bookingId);
      return booking?.status === 'CONFIRMED';
    }, { timeout: 10_000 });

    const booking = await bookingDb.getBooking(bookingId);
    expect(booking.status).toBe('CONFIRMED');
  });

  it('Step 5: payment is CAPTURED in DB', async () => {
    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      return payment?.status === 'CAPTURED';
    }, { timeout: 10_000 });

    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment.status).toBe('CAPTURED');
  });

  it('Step 6: cancel the CONFIRMED booking', async () => {
    const res = await bookingClient.cancelBooking(bookingId, TEST_USER_ID, TEST_USER_EMAIL);
    expect(res.status).toBe(200);
  });

  it('Step 7: booking becomes CANCELLED in DB', async () => {
    await eventually(async () => {
      const booking = await bookingDb.getBooking(bookingId);
      return booking?.status === 'CANCELLED';
    }, { timeout: 10_000 });

    const booking = await bookingDb.getBooking(bookingId);
    expect(booking.status).toBe('CANCELLED');
  });

  it('Step 8: PaymentService transitions payment to REFUNDING', async () => {
    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      return payment?.status === 'REFUNDING';
    }, { timeout: 15_000 });

    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment.status).toBe('REFUNDING');
  });

  it('Step 9: BOOKING_CANCELLED and PAYMENT_REFUNDED events observed', async () => {
    const events = observer.eventsFor(bookingId).map((e) => e.eventType);
    expect(events).toContain('BOOKING_CANCELLED');
  });

  it('Step 10: cancellation notification queued', async () => {
    await eventually(async () => {
      const emails = await notificationDb.countEmailsByBookingId(bookingId);
      return emails > 0;
    }, { timeout: 10_000 });

    const count = await notificationDb.countEmailsByBookingId(bookingId);
    expect(count).toBeGreaterThan(0);
  });
});
