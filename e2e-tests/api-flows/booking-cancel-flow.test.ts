import { describe, it, expect } from 'vitest';
import { GET, POST, PATCH, createUser, wait } from './setup';

function futureDate(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString().split('T')[0];
}

describe('Booking Cancel Flow', () => {
  it('create → cancel before payment → verify CANCELLED', async () => {
    const user = await createUser();

    const createRes = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 150,
      checkIn: futureDate(14), checkOut: futureDate(16),
      idempotencyKey: crypto.randomUUID(),
    }, user.token);
    expect(createRes.status).toBe(201);
    const bookingId = createRes.data?.data?.bookingId || createRes.data?.data?.id;

    // Cancel
    const cancelRes = await PATCH(`/api/v1/bookings/cancel/${bookingId}`, undefined, user.token);
    expect(cancelRes.status).toBe(200);

    // Verify
    await wait(500);
    const getRes = await GET(`/api/v1/bookings/${bookingId}`, user.token);
    expect(getRes.status).toBe(200);
    expect(getRes.data?.data?.status).toBe('CANCELLED');
  });
});
