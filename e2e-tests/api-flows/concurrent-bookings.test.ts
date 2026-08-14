import { describe, it, expect } from 'vitest';
import { POST, createUser } from './setup';

function futureDate(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString().split('T')[0];
}

describe('Concurrent Bookings', () => {
  it('10 users book same room/dates — only 1 succeeds', async () => {
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createUser()),
    );

    const checkIn = futureDate(40);
    const checkOut = futureDate(42);

    const results = await Promise.all(
      users.map(u =>
        POST('/api/v1/bookings/', {
          hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
          checkIn, checkOut, idempotencyKey: crypto.randomUUID(),
        }, u.token),
      ),
    );

    const ok = results.filter(r => r.status === 201);
    const fail = results.filter(r => r.status >= 400);
    expect(ok.length).toBe(1);
    expect(fail.length).toBe(9);
  }, 30_000);
});
