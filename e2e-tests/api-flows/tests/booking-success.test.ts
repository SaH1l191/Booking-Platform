import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as paymentClient from '../clients/payment';
import * as bookingDb from '../db/bookingDb';
import * as paymentDb from '../db/paymentDb';
import * as notificationDb from '../db/notificationDb';
import { observer } from '../broker/observer';
import { eventually, futureDate } from '../helpers/eventually';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'zFWTWhWSFXfVUZpNdx6KoyhW';

function computeHmac(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

const TEST_USER_ID = '1';
const TEST_USER_EMAIL = 'test@example.com';

describe('Successful booking flow — full lifecycle', () => {
  let hotelId: number;
  let roomId: number;
  let bookingId: number;
  let paymentId: number;

  beforeAll(async () => {
    await observer.start();
  }, 10_000);

  afterAll(async () => {
    await observer.stop();
  });

  it('Step 1: find a hotel with rooms', async () => {
    const hotels = await hotelClient.getAllHotels();
    expect(hotels.length).toBeGreaterThan(0);

    hotelId = Number(hotels[0].id);
    expect(hotelId).toBeDefined();
    expect(hotelId).toBeGreaterThan(0);

    const rooms = await hotelClient.getRoomsByHotel(hotelId);
    expect(rooms.length).toBeGreaterThan(0);
    roomId = Number(rooms[0].id);
    expect(roomId).toBeGreaterThan(0);
  });

  it('Step 2: check availability', async () => {
    const checkIn = futureDate(30);
    const checkOut = futureDate(32);

    const res = await bookingClient.checkAvailability(
      { hotelId, roomId, checkIn, checkOut },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );
    expect(res.status).toBe(200);
  });

  it('Step 3: create booking → PENDING', async () => {
    const checkIn = futureDate(30);
    const checkOut = futureDate(32);
    const idempotencyKey = crypto.randomUUID();

    const res = await bookingClient.createBooking(
      {
        hotelId,
        roomId,
        totalGuests: 2,
        checkIn,
        checkOut,
        idempotencyKey,
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );

    expect(res.status).toBe(201);
    bookingId = res.data?.data?.bookingId || res.data?.data?.id;
    expect(bookingId).toBeDefined();
  });

  it('Step 4: DB confirms PENDING', async () => {
    const booking = await bookingDb.getBooking(bookingId);
    expect(booking).toBeDefined();
    expect(booking.status).toBe('PENDING');
    expect(booking.hotelId).toBe(hotelId);
  });

  it('Step 5: outbox has BOOKING_CREATED', async () => {
    await eventually(async () => {
      const count = await bookingDb.getOutboxCount('BOOKING_CREATED', bookingId);
      return count > 0;
    }, { timeout: 10_000 });

    const outboxEvent = await bookingDb.getOutboxEvent('BOOKING_CREATED', bookingId);
    expect(outboxEvent).toBeDefined();
    expect(outboxEvent.eventType).toBe('BOOKING_CREATED');
  });

  it('Step 6: PaymentService creates payment from BOOKING_CREATED', async () => {
    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      if (!payment) return false;
      paymentId = payment.id;
      return payment.status === 'CREATED';
    }, { timeout: 15_000 });

    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment).toBeDefined();
    expect(payment.status).toBe('CREATED');
    expect(payment.amount).toBeGreaterThan(0);
  });

  it('Step 7: verify payment → CAPTURED', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment).toBeDefined();

    const fakePaymentId = 'pay_test_success_123';
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

  it('Step 8: DB confirms payment CAPTURED', async () => {
    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      return payment?.status === 'CAPTURED';
    }, { timeout: 10_000 });

    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment.status).toBe('CAPTURED');
  });

  it('Step 9: DB confirms booking CONFIRMED', async () => {
    await eventually(async () => {
      const booking = await bookingDb.getBooking(bookingId);
      return booking?.status === 'CONFIRMED';
    }, { timeout: 10_000 });

    const booking = await bookingDb.getBooking(bookingId);
    expect(booking.status).toBe('CONFIRMED');
  });

  it('Step 10: notification email queued in outbox', async () => {
    await eventually(async () => {
      const email = await notificationDb.getEmailByBookingId(bookingId);
      return email !== null;
    }, { timeout: 10_000 });

    const email = await notificationDb.getEmailByBookingId(bookingId);
    expect(email).toBeDefined();
    expect(email.template_id).toBe('payment-confirmation');
    expect(email.to_email).toBeTruthy();
    expect(email.subject).toContain('Payment Confirmed');
  });

  it('Step 11: events observed in correct order', async () => {
    const events = observer.eventsFor(bookingId);
    const eventTypes = events.map((e) => e.eventType);

    expect(eventTypes).toContain('BOOKING_CREATED');
    expect(eventTypes).toContain('PAYMENT_CAPTURED');

    // Verify ordering: BOOKING_CREATED before PAYMENT_CAPTURED
    const createdIdx = eventTypes.indexOf('BOOKING_CREATED');
    const capturedIdx = eventTypes.indexOf('PAYMENT_CAPTURED');
    expect(createdIdx).toBeLessThan(capturedIdx);
  });
});
