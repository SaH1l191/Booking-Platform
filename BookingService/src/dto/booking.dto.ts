export type CreateBookingDTO = {
    userId?: number;
    hotelId: number;
    totalGuests?: number;
    roomId: number;
    checkIn: Date;
    checkOut: Date;
    idempotencyKey?: string;
}

export type CheckAvailabilityDTO = {
    hotelId: number;
    roomId: number;
    checkIn: string;
    checkOut: string,
}