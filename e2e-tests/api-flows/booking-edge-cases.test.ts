import { describe, it, expect } from 'vitest';
import { POST, PATCH, createUser, wait } from './setup';

function futureDate(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString().split('T')[0];
}

describe('Booking Edge Cases', () => {
  it('cancel already cancelled booking — idempotent or error', async () => {
    const user = await createUser();

    const createRes = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: futureDate(35), checkOut: futureDate(37),
      idempotencyKey: crypto.randomUUID(),
    }, user.token);
    const bookingId = createRes.data?.data?.bookingId || createRes.data?.data?.id;

    // First cancel
    await PATCH(`/api/v1/bookings/cancel/${bookingId}`, undefined, user.token);
    await wait(500);

    // Second cancel — should be idempotent or 400
    const res2 = await PATCH(`/api/v1/bookings/cancel/${bookingId}`, undefined, user.token);
    expect([200, 400, 409]).toContain(res2.status);
  });
});
