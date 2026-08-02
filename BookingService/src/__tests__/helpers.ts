import { PrismaClient } from "@prisma/client";
import { redisClient } from "../config/redis.config";
import { holdKeys, bookedKeys } from "../utils/availabilityCache";

const prisma = new PrismaClient();

export function futureDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function futureDateStr(days: number): string {
  return futureDate(days).toISOString().split("T")[0];
}

export function makeBookingDTO(overrides: Record<string, any> = {}) {
  return {
    hotelId: 1,
    roomId: 10,
    totalGuests: 2,
    checkIn: futureDate(5),
    checkOut: futureDate(9),
    ...overrides,
  };
}

export async function createConfirmedBooking(overrides: Record<string, any> = {}) {
  const checkIn = overrides.checkIn || futureDate(10);
  const checkOut = overrides.checkOut || futureDate(14);
  return prisma.booking.create({
    data: {
      userId: overrides.userId ?? 99,
      userEmail: overrides.userEmail ?? "confirmed@example.com",
      hotelId: overrides.hotelId ?? 1,
      roomId: overrides.roomId ?? 10,
      totalGuests: overrides.totalGuests ?? 2,
      bookingAmount: overrides.bookingAmount ?? 20000,
      checkIn,
      checkOut,
      status: "CONFIRMED",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ...overrides,
    },
  });
}

export async function createPendingBooking(overrides: Record<string, any> = {}) {
  const checkIn = overrides.checkIn || futureDate(10);
  const checkOut = overrides.checkOut || futureDate(14);
  return prisma.booking.create({
    data: {
      userId: overrides.userId ?? 99,
      userEmail: overrides.userEmail ?? "pending@example.com",
      hotelId: overrides.hotelId ?? 1,
      roomId: overrides.roomId ?? 10,
      totalGuests: overrides.totalGuests ?? 2,
      bookingAmount: overrides.bookingAmount ?? 20000,
      checkIn,
      checkOut,
      status: "PENDING",
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
      ...overrides,
    },
  });
}

export async function expireBooking(bookingId: number) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
}

export async function getRedisHoldKeys(hotelId: number, roomId: number, checkIn: Date, checkOut: Date) {
  const keys = holdKeys(hotelId, roomId, checkIn, checkOut);
  if (keys.length === 0) return [];
  const results = await redisClient.mget(...keys);
  return results;
}

export async function getRedisBookedKeys(hotelId: number, roomId: number, checkIn: Date, checkOut: Date) {
  const keys = bookedKeys(hotelId, roomId, checkIn, checkOut);
  if (keys.length === 0) return [];
  const results = await redisClient.mget(...keys);
  return results;
}

export async function getRedisKeyTTL(key: string): Promise<number> {
  return redisClient.ttl(key);
}

export async function setRedisHoldKey(hotelId: number, roomId: number, date: string, bookingId: number, ttlSeconds: number) {
  const key = `hold:hotel:${hotelId}:room:${roomId}:date:${date}`;
  await redisClient.set(key, String(bookingId), "EX", ttlSeconds);
}

export async function setRedisBookedKey(hotelId: number, roomId: number, date: string, bookingId: number, ttlSeconds: number) {
  const key = `booked:hotel:${hotelId}:room:${roomId}:date:${date}`;
  await redisClient.set(key, String(bookingId), "EX", ttlSeconds);
}
