import type { Redis } from "ioredis";

// Redis availability cache: one key per (hotel, room, date), 
// as  a shared key means any booking's write
// can overwrite the TTL for every other booking's dates on that key (that
// was the original bug). Per-date keys mean a key only ever belongs to the
// one booking that created it, so there's nothing for a second booking to
// clobber.


// new key 
// one key per hotel room date ,never a shared set 
// hold : {}  => auto expires  after 15 minutes 
// booked : {} => payment_confiremd -> expires at checkout 


export function getDatesInRange(checkIn: Date | string, checkOut: Date | string): string[] {
    const dates: string[] = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
    }
    return dates
}


export function holdKey(hotelId: number, roomId: number, date: string): string {
    return `hold:hotel:${hotelId}:room:${roomId}:date:${date}`;
}
export function bookedKey(hotelId: number, roomId: number, date: string): string {
    return `booked:hotel:${hotelId}:room:${roomId}:date:${date}`;
}

export function holdKeys(hotelId: number, roomId: number, checkIn: Date | string, checkOut: Date | string): string[] {
    return getDatesInRange(checkIn, checkOut).map((date) => holdKey(hotelId, roomId, date));
}

export function bookedKeys(hotelId: number, roomId: number, checkIn: Date | string, checkOut: Date | string): string[] {
    return getDatesInRange(checkIn, checkOut).map((date) => bookedKey(hotelId, roomId, date));
}



export async function anyDateOccupied(redisClient: Redis, hotelId: number, roomId: number, checkIn: Date | string, checkOut: Date | string): Promise<boolean> {
    const dates = getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) return false;
    const keys = [
        ...dates.map((d) => holdKey(hotelId, roomId, d)),
        ...dates.map((d) => bookedKey(hotelId, roomId, d)),
    ];
    const occupiedCount = await redisClient.exists(...keys);
    return occupiedCount > 0;
}


export async function releaseDates(redisClient: Redis, hotelId: number, roomId: number, checkIn: Date | string, checkOut: Date | string): Promise<void> {
    const dates = getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) return;
    const keys = [
        ...dates.map((d) => holdKey(hotelId, roomId, d)),
        ...dates.map((d) => bookedKey(hotelId, roomId, d)),
    ];
    await redisClient.del(...keys);
}


export async function confirmHold(redisClient: Redis, hotelId: number, roomId: number, bookingId: number, checkIn: Date | string, checkOut: Date | string): Promise<void> {
    const dates = getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) return;
    const checkoutTimestamp = Math.floor(new Date(checkOut).getTime() / 1000);
    const pipeline = redisClient.pipeline();
    for (const date of dates) {
        pipeline.del(holdKey(hotelId, roomId, date));
        pipeline.set(bookedKey(hotelId, roomId, date), String(bookingId), "EXAT", checkoutTimestamp);
    }
    await pipeline.exec();
}



export async function placeHold(redisClient: Redis, hotelId: number, roomId: number, bookingId: number, checkIn: Date | string, checkOut: Date | string, expiresAt: Date): Promise<void> {
    const dates = getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) return;
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    const pipeline = redisClient.pipeline();
    for (const date of dates) {
        pipeline.set(holdKey(hotelId, roomId, date), String(bookingId), "EX", ttlSeconds);
    }
    await pipeline.exec();
}



//when redis find fails , db finds and sync redis with db
export async function syncConflictToCache(
    redisClient: Redis,
    hotelId: number,
    roomId: number,
    checkIn: Date | string,
    checkOut: Date | string,
    conflict: { id: number; status: string; checkOut: Date | string; expiresAt: Date | string }
): Promise<void> {
    const dates = getDatesInRange(checkIn, checkOut);
    if (dates.length === 0) return;
    const pipeline = redisClient.pipeline();
    if (conflict.status === "CONFIRMED") {
        const expireAt = Math.floor(new Date(conflict.checkOut).getTime() / 1000);
        for (const date of dates) {
            pipeline.set(bookedKey(hotelId, roomId, date), String(conflict.id), "EXAT", expireAt);
        }
    } else {
        const expireAt = Math.floor(new Date(conflict.expiresAt).getTime() / 1000);
        for (const date of dates) {
            pipeline.set(holdKey(hotelId, roomId, date), String(conflict.id), "EXAT", expireAt);
        }
    }
    await pipeline.exec();
}




