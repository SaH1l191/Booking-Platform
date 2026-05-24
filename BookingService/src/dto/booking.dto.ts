export type CreateBookingDTO = {
    userId: number;
    hotelId: number;
    totalGuests: number;
    bookingAmount: number;
    roomId: number;
    checkIn: Date;
    checkOut: Date;
}