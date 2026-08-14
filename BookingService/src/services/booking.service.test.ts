import { describe, it, expect, afterEach, afterAll, vi } from "vitest";
import nock from "nock";
import { createBookingService, cancelBookingService, getBookingsByUserService } from "./booking.service";
import { expireStaleBookings } from "../repositories/booking.repository";
import { prisma } from "../lib/prisma";
import { redisClient } from "../config/redis.config";
import { truncateAll } from "../__tests__/setup";
import {
  makeBookingDTO,
  createConfirmedBooking,
  createPendingBooking,
  expireBooking,
  getRedisHoldKeys,
  getRedisBookedKeys,
  getRedisKeyTTL,
  setRedisHoldKey,
} from "../__tests__/helpers";

const HOTEL_SERVICE_URL = "http://localhost:3001";
const ROOM_PRICE = 5000;
const BOOKING_HOLD_MS = 15 * 60 * 1000;

function mockRoomPrice(hotelId: number, roomId: number, price: number) {
  nock(HOTEL_SERVICE_URL)
    .get(`/api/v1/rooms/${roomId}`)
    .reply(200, { data: { hotelId, roomCategory: { price } } });
}

afterEach(async () => {
  nock.cleanAll();
  await truncateAll();
});

afterAll(async () => {
  nock.cleanAll();
  await prisma.$disconnect();
  await redisClient.quit();
});

// ─── Creation ────────────────────────────────────────────────
describe("Creation — createBookingService", () => {
  it("creates a booking with PENDING status and 15-minute expiresAt", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const now = Date.now();

    const result = await createBookingService({
      createBookingDTO: makeBookingDTO(),
      userId: 1,
      userEmail: "test@example.com",
      idempotencyKey: "key-001",
    });

    expect(result.bookingId).toBeDefined();
    expect(result.duplicated).toBe(false);

    const expiresAt = new Date(result.expiresAt).getTime();
    const diff = expiresAt - now;
    expect(diff).toBeGreaterThan(BOOKING_HOLD_MS - 5000);
    expect(diff).toBeLessThan(BOOKING_HOLD_MS + 5000);

    const db = await prisma.booking.findUnique({ where: { id: result.bookingId } });
    expect(db).not.toBeNull();
    expect(db!.status).toBe("PENDING");
  });

  it("computes bookingAmount as pricePerNight × nights", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const checkIn = new Date("2026-09-01");
    const checkOut = new Date("2026-09-06");

    const result = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn, checkOut }),
      userId: 1,
      userEmail: "test@example.com",
    });

    const db = await prisma.booking.findUnique({ where: { id: result.bookingId } });
    expect(db!.bookingAmount).toBe(ROOM_PRICE * 5);
  });

  it("rejects when checkOut is before or equal to checkIn", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2026-09-10"),
          checkOut: new Date("2026-09-10"),
        }),
        userId: 1,
        userEmail: "test@example.com",
      })
    ).rejects.toThrow("Check-out date must be after check-in date");

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2026-09-15"),
          checkOut: new Date("2026-09-10"),
        }),
        userId: 1,
        userEmail: "test@example.com",
      })
    ).rejects.toThrow("Check-out date must be after check-in date");
  });

  it("returns the same booking when the same idempotencyKey is reused", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const key = "idem-replay-001";

    const first = await createBookingService({
      createBookingDTO: makeBookingDTO(),
      userId: 1,
      userEmail: "test@example.com",
      idempotencyKey: key,
    });

    const second = await createBookingService({
      createBookingDTO: makeBookingDTO(),
      userId: 1,
      userEmail: "test@example.com",
      idempotencyKey: key,
    });

    expect(second.bookingId).toBe(first.bookingId);
    expect(second.duplicated).toBe(true);
  });

  it("creates separate bookings for two different idempotencyKeys on same dates", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const first = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2026-09-20"), checkOut: new Date("2026-09-24") }),
      userId: 1,
      userEmail: "test@example.com",
      idempotencyKey: "key-A",
    });

    mockRoomPrice(1, 10, ROOM_PRICE);
    const second = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2026-09-24"), checkOut: new Date("2026-09-28") }),
      userId: 1,
      userEmail: "test@example.com",
      idempotencyKey: "key-B",
    });

    expect(first.bookingId).not.toBe(second.bookingId);
    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(false);

    const dbFirst = await prisma.idempotencykey.findUnique({ where: { key: "key-A" } });
    const dbSecond = await prisma.idempotencykey.findUnique({ where: { key: "key-B" } });
    expect(dbFirst!.bookingId).toBe(first.bookingId);
    expect(dbSecond!.bookingId).toBe(second.bookingId);
  });

  it("writes a BOOKING_CREATED row to the outbox in the same transaction", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);

    const result = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2026-10-01"), checkOut: new Date("2026-10-04") }),
      userId: 1,
      userEmail: "test@example.com",
      idempotencyKey: "outbox-key-001",
    });

    const outbox = await prisma.outbox.findFirst({
      where: { eventType: "BOOKING_CREATED" },
    });
    expect(outbox).not.toBeNull();
    expect(outbox!.payload).toMatchObject({
      bookingId: result.bookingId,
      hotelId: 1,
      roomId: 10,
      userEmail: "test@example.com",
    });
    expect(outbox!.published).toBe(false);
  });

  it("places Redis hold keys with TTL equal to expiresAt, not checkout", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const checkIn = new Date("2026-10-05");
    const checkOut = new Date("2026-10-09");

    const result = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn, checkOut }),
      userId: 1,
      userEmail: "test@example.com",
    });

    const holdKeys = ["hold:hotel:1:room:10:date:2026-10-05", "hold:hotel:1:room:10:date:2026-10-06", "hold:hotel:1:room:10:date:2026-10-07", "hold:hotel:1:room:10:date:2026-10-08"];
    for (const key of holdKeys) {
      const val = await redisClient.get(key);
      expect(val).toBe(String(result.bookingId));

      const ttl = await redisClient.ttl(key);
      expect(ttl).toBeGreaterThan(600);
      expect(ttl).toBeLessThanOrEqual(900);
    }
  });
});

// ─── Conflict ────────────────────────────────────────────────
describe("Conflict — double booking / availability", () => {
  it("rejects when Redis hold key exists (fast-path Redis rejection)", async () => {
    await setRedisHoldKey(1, 10, "2026-11-01", 999, 900);
    mockRoomPrice(1, 10, ROOM_PRICE);

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2026-11-01"),
          checkOut: new Date("2026-11-03"),
        }),
        userId: 2,
        userEmail: "user2@example.com",
      })
    ).rejects.toThrow("Selected room is not available");
  });

  it("rejects when Redis is empty but a CONFIRMED DB row overlaps", async () => {
    await createConfirmedBooking({
      checkIn: new Date("2026-11-10"),
      checkOut: new Date("2026-11-14"),
    });
    mockRoomPrice(1, 10, ROOM_PRICE);

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2026-11-12"),
          checkOut: new Date("2026-11-15"),
        }),
        userId: 2,
        userEmail: "user2@example.com",
      })
    ).rejects.toThrow("Selected room is not available");
  });

  it("rejects when a PENDING booking exists and has not yet expired", async () => {
    const pending = await createPendingBooking({
      checkIn: new Date("2026-11-20"),
      checkOut: new Date("2026-11-24"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await setRedisHoldKey(1, 10, "2026-11-20", pending.id, 900);
    mockRoomPrice(1, 10, ROOM_PRICE);

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2026-11-22"),
          checkOut: new Date("2026-11-25"),
        }),
        userId: 2,
        userEmail: "user2@example.com",
      })
    ).rejects.toThrow("Selected room is not available");
  });

  it("allows a new booking after the prior PENDING booking expires", async () => {
    const pending = await createPendingBooking({
      checkIn: new Date("2026-12-01"),
      checkOut: new Date("2026-12-05"),
    });
    await expireBooking(pending.id);
    mockRoomPrice(1, 10, ROOM_PRICE);

    const result = await createBookingService({
      createBookingDTO: makeBookingDTO({
        checkIn: new Date("2026-12-02"),
        checkOut: new Date("2026-12-04"),
      }),
      userId: 2,
      userEmail: "user2@example.com",
    });

    expect(result.bookingId).toBeDefined();
    expect(result.duplicated).toBe(false);
  });

  it("two concurrent calls for same room — exactly one succeeds", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    mockRoomPrice(1, 10, ROOM_PRICE);

    const dto = makeBookingDTO({
      checkIn: new Date("2027-01-10"),
      checkOut: new Date("2027-01-14"),
    });

    const results = await Promise.allSettled([
      createBookingService({ createBookingDTO: dto, userId: 1, userEmail: "a@test.com" }),
      createBookingService({ createBookingDTO: dto, userId: 2, userEmail: "b@test.com" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  it("rejects a duplicate booking by the same user for the same dates", async () => {
    const pending = await createPendingBooking({
      userId: 5,
      checkIn: new Date("2027-02-01"),
      checkOut: new Date("2027-02-05"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await setRedisHoldKey(1, 10, "2027-02-01", pending.id, 900);
    mockRoomPrice(1, 10, ROOM_PRICE);

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2027-02-02"),
          checkOut: new Date("2027-02-04"),
        }),
        userId: 5,
        userEmail: "same@example.com",
      })
    ).rejects.toThrow("You already have a pending booking");
  });

  it("syncConflictToCache writes booked: keys for CONFIRMED conflicts", async () => {
    const confirmed = await createConfirmedBooking({
      checkIn: new Date("2027-03-01"),
      checkOut: new Date("2027-03-05"),
    });

    mockRoomPrice(1, 10, ROOM_PRICE);
    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2027-03-02"),
          checkOut: new Date("2027-03-04"),
        }),
        userId: 2,
        userEmail: "user2@example.com",
      })
    ).rejects.toThrow("Selected room is not available");

    const bookedVals = await getRedisBookedKeys(1, 10, new Date("2027-03-01"), new Date("2027-03-05"));
    expect(bookedVals.some((v) => v === String(confirmed.id))).toBe(true);

    const holdVals = await getRedisHoldKeys(1, 10, new Date("2027-03-01"), new Date("2027-03-05"));
    expect(holdVals.every((v) => v === null)).toBe(true);
  });

  it("releases the redlock even when the transaction throws", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);

    await expect(
      createBookingService({
        createBookingDTO: makeBookingDTO({
          checkIn: new Date("2027-04-01"),
          checkOut: new Date("2027-04-01"),
        }),
        userId: 1,
        userEmail: "test@example.com",
      })
    ).rejects.toThrow();

    const lockKeys = await redisClient.keys("redlock:lock:*");
    expect(lockKeys.length).toBe(0);
  });
});

// ─── Expiry ──────────────────────────────────────────────────
describe("Expiry", () => {
  it("expireStaleBookings flips PENDING rows past expiresAt to EXPIRED", async () => {
    const pending = await createPendingBooking({
      checkIn: new Date("2027-05-01"),
      checkOut: new Date("2027-05-05"),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expireStaleBookings();

    const db = await prisma.booking.findUnique({ where: { id: pending.id } });
    expect(db!.status).toBe("EXPIRED");
  });

  it("expireStaleBookings leaves CONFIRMED and CANCELLED untouched", async () => {
    const confirmed = await createConfirmedBooking({
      checkIn: new Date("2027-05-10"),
      checkOut: new Date("2027-05-14"),
      expiresAt: new Date(Date.now() - 1000),
    });
    const cancelled = await prisma.booking.create({
      data: {
        userId: 99,
        userEmail: "cancelled@example.com",
        hotelId: 1,
        roomId: 10,
        totalGuests: 2,
        bookingAmount: 20000,
        checkIn: new Date("2027-05-10"),
        checkOut: new Date("2027-05-14"),
        status: "CANCELLED",
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expireStaleBookings();

    const c1 = await prisma.booking.findUnique({ where: { id: confirmed.id } });
    const c2 = await prisma.booking.findUnique({ where: { id: cancelled.id } });
    expect(c1!.status).toBe("CONFIRMED");
    expect(c2!.status).toBe("CANCELLED");
  });

  it("room becomes bookable again after Redis hold key expires", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const checkIn = new Date("2027-06-01");
    const checkOut = new Date("2027-06-04");

    const first = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn, checkOut }),
      userId: 1,
      userEmail: "test@example.com",
    });

    const holdKeyNames = ["hold:hotel:1:room:10:date:2027-06-01", "hold:hotel:1:room:10:date:2027-06-02", "hold:hotel:1:room:10:date:2027-06-03"];
    await redisClient.del(...holdKeyNames);

    await expireBooking(first.bookingId);

    mockRoomPrice(1, 10, ROOM_PRICE);
    const result = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn, checkOut }),
      userId: 2,
      userEmail: "user2@example.com",
    });

    expect(result.bookingId).toBeDefined();
  });
});

// ─── Cancellation ────────────────────────────────────────────
describe("Cancellation — cancelBookingService", () => {
  it("successfully cancels a PENDING booking and inserts outbox event", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const created = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2027-07-01"), checkOut: new Date("2027-07-04") }),
      userId: 1,
      userEmail: "cancel@example.com",
    });

    const cancelled = await cancelBookingService(created.bookingId, 1, "cancel@example.com");
    expect(cancelled.status).toBe("CANCELLED");

    const outbox = await prisma.outbox.findFirst({
      where: { eventType: "BOOKING_CANCELLED" },
    });
    expect(outbox).not.toBeNull();
    expect(outbox!.payload).toMatchObject({
      bookingId: created.bookingId,
      status: "CANCELLED",
    });
  });

  it("releases Redis hold/booked keys on cancel", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const checkIn = new Date("2027-07-10");
    const checkOut = new Date("2027-07-14");
    const created = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn, checkOut }),
      userId: 1,
      userEmail: "cancel@example.com",
    });

    const keysBefore = await redisClient.keys("hold:hotel:1:room:10:*");
    expect(keysBefore.length).toBeGreaterThan(0);

    await cancelBookingService(created.bookingId, 1, "cancel@example.com");

    const keysAfter = await redisClient.keys("hold:hotel:1:room:10:*");
    expect(keysAfter.length).toBe(0);
  });

  it("rejects cancellation by a user who doesn't own the booking", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const created = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2027-07-20"), checkOut: new Date("2027-07-24") }),
      userId: 1,
      userEmail: "owner@example.com",
    });

    await expect(
      cancelBookingService(created.bookingId, 999, "attacker@example.com")
    ).rejects.toThrow("You are not authorized");
  });

  it("rejects cancelling an already-CANCELLED booking", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const created = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2027-08-01"), checkOut: new Date("2027-08-04") }),
      userId: 1,
      userEmail: "test@example.com",
    });

    await cancelBookingService(created.bookingId, 1, "test@example.com");

    await expect(
      cancelBookingService(created.bookingId, 1, "test@example.com")
    ).rejects.toThrow("Booking is already cancelled");
  });

  it("rejects cancelling an EXPIRED booking", async () => {
    mockRoomPrice(1, 10, ROOM_PRICE);
    const created = await createBookingService({
      createBookingDTO: makeBookingDTO({ checkIn: new Date("2027-08-10"), checkOut: new Date("2027-08-14") }),
      userId: 1,
      userEmail: "test@example.com",
    });

    await prisma.booking.update({
      where: { id: created.bookingId },
      data: { status: "EXPIRED" },
    });

    await expect(
      cancelBookingService(created.bookingId, 1, "test@example.com")
    ).rejects.toThrow("Booking has expired");
  });
});

// ─── Event-driven — stay-completed emission ───────────────────
describe("Event-driven — stay-completed emission", () => {
  it("emits BOOKING_STAY_COMPLETED exactly once for a booking whose checkOut has passed", async () => {
    const booking = await createConfirmedBooking({
      userId: 10,
      checkIn: new Date("2025-01-01"),
      checkOut: new Date("2025-01-05"),
    });

    await getBookingsByUserService(10);

    const outboxRows = await prisma.outbox.findMany({
      where: { eventType: "BOOKING_STAY_COMPLETED" },
    });
    expect(outboxRows.length).toBe(1);
    expect(outboxRows[0].payload).toMatchObject({
      bookingId: booking.id,
      userId: 10,
    });

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated!.stayCompletedEmittedAt).not.toBeNull();
  });

  it("calling getBookingsByUserService twice does NOT emit a second BOOKING_STAY_COMPLETED", async () => {
    await createConfirmedBooking({
      userId: 20,
      checkIn: new Date("2025-02-01"),
      checkOut: new Date("2025-02-05"),
    });

    await getBookingsByUserService(20);
    await getBookingsByUserService(20);

    const count = await prisma.outbox.count({
      where: { eventType: "BOOKING_STAY_COMPLETED" },
    });
    expect(count).toBe(1);
  });

  it("two concurrent getBookingsByUserService calls race — only one outbox row is created", async () => {
    await createConfirmedBooking({
      userId: 30,
      checkIn: new Date("2025-03-01"),
      checkOut: new Date("2025-03-05"),
    });

    await Promise.allSettled([
      getBookingsByUserService(30),
      getBookingsByUserService(30),
    ]);

    const count = await prisma.outbox.count({
      where: { eventType: "BOOKING_STAY_COMPLETED" },
    });
    expect(count).toBe(1);
  });
});
