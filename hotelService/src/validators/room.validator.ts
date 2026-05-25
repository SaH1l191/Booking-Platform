import z from "zod";

export const roomSchema = z.object({
  roomNo: z.number().int().positive(), 
  roomCategoryId: z.number().int().positive(),
  hotelId: z.number().int().positive(),
});

export const updateRoomSchema = z.object({
  roomNo: z.number().int().positive().optional(),
  roomCategoryId: z.number().int().positive().optional(),
  hotelId: z.number().int().positive().optional(),
});