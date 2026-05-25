import z from "zod";

export const roomCategorySchema = z.object({
  roomType: z.enum(["SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"]),
  price: z.number().min(0),
  hotelId: z.number().int().positive(),
  roomCount: z.number().int().min(0),
});

export const updateRoomCategorySchema = z.object({
  roomType: z.enum(["SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"]).optional(),
  price: z.number().min(0).optional(),
  hotelId: z.number().int().positive().optional(),
  roomCount: z.number().int().min(0).optional(),
});