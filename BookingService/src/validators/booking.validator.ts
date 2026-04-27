



import {z} from 'zod';


export const createBookingSchema = z.object({
    userId : z.number({message : "User ID must be a number"}),
    hotelId : z.number({message : "Hotel ID must be a number"}),
    totalGuests : z.number({message : "Total guests must be a number"})
    .min(1, {message : "Total guests must be at least 1"}),
    bookingAmount : z.number({message : "Booking amount must be a number"}).min(1,{message : "Booking amount must be greater than 0"})
})