import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import * as bookingDb from '../db/bookingDb';
import { observer } from '../broker/observer';
import { futureDate } from '../helpers/eventually';

const USER_A = { id: '1', email: 'test@example.com' };
const USER_B = { id: '2', email: 'racer-b@example.com' };

describe('Concurrent booking — two users racing for the same room/dates', () => {
  let hotelId: number;
  let roomId: number;
  let checkIn: string;
  let checkOut: string;

  beforeAll(async () => {
    await observer.start();
    const hotels = await hotelClient.getAllHotels();
    hotelId = Number(hotels[0].id);
    const rooms = await hotelClient.getRoomsByHotel(hotelId);
    roomId = Number(rooms[0].id);
    const offset = 100 + (Date.now() % 50);
    checkIn = futureDate(offset);
    checkOut = futureDate(offset + 2);
  }, 10_000);

  afterAll(async () => {
    await observer.stop();
  });

  it('exactly one of two simultaneous requests for the same room/dates succeeds', async () => {
    const payloadFor = (userId: string) => ({
      hotelId, roomId, totalGuests: 1,
      checkIn, checkOut,
      idempotencyKey: crypto.randomUUID(),
    });

    const [resA, resB] = await Promise.all([
      bookingClient.createBooking(payloadFor(USER_A.id), USER_A.id, USER_A.email),
      bookingClient.createBooking(payloadFor(USER_B.id), USER_B.id, USER_B.email),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const winner = resA.status === 201 ? resA : resB;
    const bookingId = winner.data?.data?.bookingId || winner.data?.data?.id;
    expect(bookingId).toBeDefined();

    const booking = await bookingDb.getBooking(bookingId);
    expect(booking.status).toBe('PENDING');
    expect(booking.roomId).toBe(roomId);
  });

  it('a third request for the same room/dates after the first is also rejected', async () => {
    const res = await bookingClient.createBooking(
      { hotelId, roomId, totalGuests: 1, checkIn, checkOut, idempotencyKey: crypto.randomUUID() },
      '3', 'racer-c@example.com',
    );
    expect(res.status).toBe(400);
  });

  it('a booking for an overlapping (not identical) date range is also rejected', async () => {
    const shiftedCheckIn = new Date(new Date(checkIn).getTime() + 86_400_000).toISOString().split('T')[0];
    const shiftedCheckOut = new Date(new Date(checkOut).getTime() + 86_400_000).toISOString().split('T')[0];

    const res = await bookingClient.createBooking(
      {
        hotelId, roomId, totalGuests: 1,
        checkIn: shiftedCheckIn, checkOut: shiftedCheckOut,
        idempotencyKey: crypto.randomUUID(),
      },
      '4', 'racer-d@example.com',
    );
    expect(res.status).toBe(400);
  });

  it('a booking for the same room on non-overlapping dates succeeds', async () => {
    const laterCheckIn = futureDate(200);
    const laterCheckOut = futureDate(202);

    const res = await bookingClient.createBooking(
      {
        hotelId, roomId, totalGuests: 1,
        checkIn: laterCheckIn, checkOut: laterCheckOut,
        idempotencyKey: crypto.randomUUID(),
      },
      '5', 'racer-e@example.com',
    );
    expect(res.status).toBe(201);
  });
});
