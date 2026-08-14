import { describe, it, expect } from 'vitest';
import { GET, POST, PATCH, createUser, wait } from './setup';

function futureDate(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString().split('T')[0];
}

describe('Booking Happy Path', () => {
  it('create → get → cancel flow', async () => {
    const user = await createUser();
    expect(user.token).toBeTruthy();

    // List hotels
    const hotels = await GET('/api/v1/hotels/', user.token);
    expect(hotels.status).toBe(200);

    // Create booking
    const createRes = await POST('/api/v1/bookings/', {
      hotelId: 1,
      roomId: 1,
      totalGuests: 2,
      bookingAmount: 200,
      checkIn: futureDate(7),
      checkOut: futureDate(9),
      idempotencyKey: crypto.randomUUID(),
    }, user.token);
    expect(createRes.status).toBe(201);

    const bookingId = createRes.data?.data?.bookingId || createRes.data?.data?.id;
    expect(bookingId).toBeDefined();

    // Get booking
    await wait(500);
    const getRes = await GET(`/api/v1/bookings/${bookingId}`, user.token);
    expect(getRes.status).toBe(200);

    // My bookings
    const meRes = await GET('/api/v1/bookings/me', user.token);
    expect(meRes.status).toBe(200);

    // Cancel
    const cancelRes = await PATCH(`/api/v1/bookings/cancel/${bookingId}`, undefined, user.token);
    expect(cancelRes.status).toBe(200);

    // Verify cancelled
    await wait(1000);
    const afterCancel = await GET(`/api/v1/bookings/${bookingId}`, user.token);
    expect(afterCancel.status).toBe(200);
    expect(afterCancel.data?.data?.status).toBe('CANCELLED');
  });

  it('idempotency key returns existing booking', async () => {
    const user = await createUser();
    const key = crypto.randomUUID();

    const res1 = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: futureDate(43), checkOut: futureDate(45),
      idempotencyKey: key,
    }, user.token);
    expect(res1.status).toBe(201);
    const id = res1.data?.data?.bookingId || res1.data?.data?.id;

    // Replay with same key
    const res2 = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: futureDate(43), checkOut: futureDate(45),
      idempotencyKey: key,
    }, user.token);
    expect(res2.status).toBe(200);
    expect(res2.data?.data?.bookingId).toBe(id);
  });

  it('double booking same room/dates fails', async () => {
    const user = await createUser();
    const checkIn = futureDate(25);
    const checkOut = futureDate(27);

    const res1 = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn, checkOut, idempotencyKey: crypto.randomUUID(),
    }, user.token);
    expect(res1.status).toBe(201);

    const res2 = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn, checkOut, idempotencyKey: crypto.randomUUID(),
    }, user.token);
    expect(res2.status).toBeGreaterThanOrEqual(400);
  });

  it('availability check works', async () => {
    const user = await createUser();
    const res = await GET(
      `/api/v1/bookings/availability?hotelId=1&roomId=1&checkIn=${futureDate(28)}&checkOut=${futureDate(30)}`,
      user.token,
    );
    expect(res.status).toBe(200);
  });

  it('rejects past check-in', async () => {
    const user = await createUser();
    const res = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: '2020-01-01', checkOut: '2020-01-05',
      idempotencyKey: crypto.randomUUID(),
    }, user.token);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects without auth', async () => {
    const res = await POST('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: futureDate(47), checkOut: futureDate(49),
      idempotencyKey: crypto.randomUUID(),
    });
    expect(res.status).toBe(401);
  });
});
