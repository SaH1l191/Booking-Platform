export type CreateBookingDTO = {
    userId?: number;
    hotelId: number;
    totalGuests?: number;
    roomId: number;
    checkIn: string;
    checkOut: string;
    idempotencyKey?: string;
}

export type CheckAvailabilityDTO = {
    hotelId: number;
    roomId: number;
    checkIn: string;
    checkOut: string,
}