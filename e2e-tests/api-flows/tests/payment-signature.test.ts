import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as paymentClient from '../clients/payment';
import * as paymentDb from '../db/paymentDb';
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

describe('Payment signature verification — wrong HMAC is rejected', () => {
  let hotelId: number;
  let roomId: number;
  let bookingId: number;

  beforeAll(async () => {
    await observer.start();
    const hotels = await hotelClient.getAllHotels();
    hotelId = Number(hotels[0].id);
    const rooms = await hotelClient.getRoomsByHotel(hotelId);
    roomId = Number(rooms[0].id);

    const offset = 180 + (Date.now() % 10);
    const createRes = await bookingClient.createBooking(
      {
        hotelId,
        roomId,
        totalGuests: 1,
        checkIn: futureDate(offset),
        checkOut: futureDate(offset + 2),
        idempotencyKey: crypto.randomUUID(),
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );
    expect(createRes.status).toBe(201);
    bookingId = createRes.data?.data?.bookingId;

    await eventually(async () => {
      const payment = await paymentDb.getPaymentByBookingId(bookingId);
      return payment?.status === 'CREATED';
    }, { timeout: 20_000 });
  }, 30_000);

  afterAll(async () => {
    await observer.stop();
  });

  it('rejects verify with completely wrong signature', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);

    const res = await paymentClient.verifyPayment(
      {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: 'pay_fake_123',
        razorpay_signature: 'totally_wrong_signature',
        bookingId,
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects verify with swapped order/payment ID in HMAC', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    const fakePaymentId = 'pay_swapped_test';

    const wrongSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${fakePaymentId}|${payment.razorpay_order_id}`)
      .digest('hex');

    const res = await paymentClient.verifyPayment(
      {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: wrongSignature,
        bookingId,
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('payment is no longer CREATED after failed verification attempts', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    expect(payment.status).not.toBe('CREATED');
  });

  it('correct signature succeeds', async () => {
    const payment = await paymentDb.getPaymentByBookingId(bookingId);
    const fakePaymentId = 'pay_valid_sig_test';
    const correctSignature = computeHmac(payment.razorpay_order_id, fakePaymentId);

    const res = await paymentClient.verifyPayment(
      {
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: correctSignature,
        bookingId,
      },
      TEST_USER_ID,
      TEST_USER_EMAIL,
    );

    expect(res.status).toBe(200);

    await eventually(async () => {
      const p = await paymentDb.getPaymentByBookingId(bookingId);
      return p?.status === 'CAPTURED';
    }, { timeout: 10_000 });
  });
});
