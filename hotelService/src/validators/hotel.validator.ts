import z from "zod";


export const hotelSchema = z.object({
    name : z.string().min(1, "Name is required"),
    address : z.string().min(1, "Address is required"),
    location : z.string().min(1, "Location is required"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    rating : z.number().min(0, "Rating must be at least 0").max(5, "Rating cannot be more than 5").optional(),
    ratingCount : z.number().min(0, "Rating count must be at least 0").optional()
})
 
export const updatehotelSchema = z.object({
    name : z.string().min(1, "Name is required").optional(),
    address : z.string().min(1, "Address is required").optional(),
    location : z.string().min(1, "Location is required").optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    rating : z.number().min(0, "Rating must be at least 0").max(5, "Rating cannot be more than 5").optional(),
    ratingCount : z.number().min(0, "Rating count must be at least 0").optional()
})

export const hotelQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    sortBy: z.string().optional().default('-createdAt'),
    search: z.string().optional(),
    location: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(0).optional().default(10), // default 10km
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
});