import z from "zod";

export const idParamSchema = z.object({
    id: z.coerce.number().int().min(1, "ID must be a positive integer")
});

export const hotelIdParamSchema = z.object({
    hotelId: z.coerce.number().int().min(1, "Hotel ID must be a positive integer")
});

export const roomIdParamSchema = z.object({
    roomId: z.coerce.number().int().min(1, "Room ID must be a positive integer")
});
