import z from "zod";


export const hotelSchema = z.object({
    name : z.string().min(1, "Name is required"),
    address : z.string().min(1, "Address is required"),
    location : z.string().min(1, "Location is required"),
    rating : z.number().min(0, "Rating must be at least 0").max(5, "Rating cannot be more than 5").optional(),
    ratingCount : z.number().min(0, "Rating count must be at least 0").optional()
})