import { describe, it, expect } from 'vitest';
import { POST, createUser } from './setup';

function futureDate(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString().split('T')[0];
}

describe('Payment Failure', () => {
  it('verify rejects invalid signature', async () => {
    const user = await createUser();

    // Create booking first
    const bookRes = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: futureDate(10), checkOut: futureDate(12),
      idempotencyKey: crypto.randomUUID(),
    }, user.token);
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.data?.data?.bookingId || bookRes.data?.data?.id;

    // Create payment order
    const orderRes = await POST('/api/v1/payments/create-order', {
      bookingId, amount: 100,
    }, user.token);
    expect(orderRes.status).toBe(200);

    // Verify with fake signature → should fail
    const verifyRes = await POST('/api/v1/payments/verify', {
      razorpay_order_id: 'fake_order',
      razorpay_payment_id: 'fake_payment',
      razorpay_signature: 'fake_sig',
      bookingId,
    }, user.token);
    expect(verifyRes.status).toBeGreaterThanOrEqual(400);
  });
});
