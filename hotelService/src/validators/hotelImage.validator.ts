import z from "zod";

export const hotelImageSchema = z.object({
    url: z.string().url("Must be a valid URL").max(500),
    altText: z.string().max(255).optional(),
    displayOrder: z.number().int().min(0).optional().default(0),
});

export const updateHotelImageSchema = z.object({
    url: z.string().url("Must be a valid URL").max(500).optional(),
    altText: z.string().max(255).optional(),
    displayOrder: z.number().int().min(0).optional(),
});
