import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as reviewClient from '../clients/review';
import * as paymentClient from '../clients/payment';
import * as bookingDb from '../db/bookingDb';
import * as paymentDb from '../db/paymentDb';
import * as reviewDb from '../db/reviewDb';
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

describe('Review eligibility — stay completed unlocks a review', () => {
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

  it('books and confirms a stay (payment captured)', async () => {
    const createRes = await bookingClient.createBooking(
      {
        hotelId, roomId, totalGuests: 1,
        checkIn: futureDate(5), checkOut: futureDate(7),
        idempotencyKey: crypto.randomUUID(),
      },
      TEST_USER_ID, TEST_USER_EMAIL,
    );
    expect(createRes.status).toBe(201);
    bookingId = createRes.data?.data?.bookingId;

    const payment = await eventually(async () => {
      const p = await paymentDb.getPaymentByBookingId(bookingId);
      return p?.status === 'CREATED' ? p : false;
    }, { timeout: 15_000 });

    const fakePaymentId = 'pay_test_review_flow';
    const signature = computeHmac(payment.razorpay_order_id, fakePaymentId);
    const verifyRes = await paymentClient.verifyPayment(
      { razorpay_order_id: payment.razorpay_order_id, razorpay_payment_id: fakePaymentId, razorpay_signature: signature, bookingId },
      TEST_USER_ID, TEST_USER_EMAIL,
    );
    expect(verifyRes.status).toBe(200);

    await eventually(async () => {
      const booking = await bookingDb.getBooking(bookingId);
      return booking?.status === 'CONFIRMED';
    }, { timeout: 10_000 });
  });

  it('review creation is rejected before the stay completes', async () => {
    const res = await reviewClient.createReview(
      {
        user_id: Number(TEST_USER_ID), booking_id: bookingId, hotel_id: hotelId,
        comment: 'Trying early', rating: 5,
      },
      TEST_USER_ID, TEST_USER_EMAIL,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    const eligibility = await reviewDb.getEligibility(bookingId);
    expect(eligibility).toBeNull();
  });

  it('backdating checkOut and listing bookings triggers BOOKING_STAY_COMPLETED', async () => {
    await bookingDb.backdateCheckOut(bookingId, futureDate(-1));

    const listRes = await bookingClient.listMyBookings(TEST_USER_ID, TEST_USER_EMAIL);
    expect(listRes.status).toBe(200);

    await eventually(async () => {
      const row = await reviewDb.getEligibility(bookingId);
      return row !== null ? row : false;
    }, { timeout: 10_000 });

    const eligibility = await reviewDb.getEligibility(bookingId);
    expect(eligibility.eligible).toBe(1);
    expect(eligibility.hotel_id).toBe(hotelId);
  });

  it('calling the bookings list again does not emit BOOKING_STAY_COMPLETED twice', async () => {
    await bookingClient.listMyBookings(TEST_USER_ID, TEST_USER_EMAIL);
    await bookingClient.listMyBookings(TEST_USER_ID, TEST_USER_EMAIL);

    const count = await reviewDb.countEligibilityRows(bookingId);
    expect(count).toBe(1);

    const events = observer.eventsFor(bookingId).filter((e) => e.eventType === 'BOOKING_STAY_COMPLETED');
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('review creation now succeeds', async () => {
    const res = await reviewClient.createReview(
      {
        user_id: Number(TEST_USER_ID), booking_id: bookingId, hotel_id: hotelId,
        comment: 'Great stay after all', rating: 5,
      },
      TEST_USER_ID, TEST_USER_EMAIL,
    );
    expect(res.status).toBe(201);
  });

  it('a second review for the same booking is rejected (409 or 500)', async () => {
    const res = await reviewClient.createReview(
      {
        user_id: Number(TEST_USER_ID), booking_id: bookingId, hotel_id: hotelId,
        comment: 'Trying to review twice', rating: 3,
      },
      TEST_USER_ID, TEST_USER_EMAIL,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
