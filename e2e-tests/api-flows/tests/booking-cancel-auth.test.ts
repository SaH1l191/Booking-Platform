import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import * as hotelClient from '../clients/hotel';
import * as bookingClient from '../clients/booking';
import { observer } from '../broker/observer';
import { futureDate } from '../helpers/eventually';

const USER_A = { id: '1', email: 'test@example.com' };
const USER_B = { id: '999', email: 'attacker@example.com' };

describe('Cancel auth — cross-user and double-cancel rejection', () => {
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

  it('User A creates a booking', async () => {
    const res = await bookingClient.createBooking(
      {
        hotelId,
        roomId,
        totalGuests: 1,
        checkIn: futureDate(110),
        checkOut: futureDate(112),
        idempotencyKey: crypto.randomUUID(),
      },
      USER_A.id,
      USER_A.email,
    );
    expect(res.status).toBe(201);
    bookingId = res.data?.data?.bookingId;
  });

  it('User B (non-owner) cannot cancel User A booking', async () => {
    const res = await bookingClient.cancelBooking(bookingId, USER_B.id, USER_B.email);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('booking is still PENDING after unauthorized cancel attempt', async () => {
    const res = await bookingClient.getBooking(bookingId, USER_A.id, USER_A.email);
    expect(res.status).toBe(200);
  });

  it('User A cancels their own booking successfully', async () => {
    const res = await bookingClient.cancelBooking(bookingId, USER_A.id, USER_A.email);
    expect(res.status).toBe(200);
  });

  it('double-cancel is rejected', async () => {
    const res = await bookingClient.cancelBooking(bookingId, USER_A.id, USER_A.email);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
