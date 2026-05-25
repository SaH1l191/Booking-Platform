import z from 'zod';

export const roomAvailabilitySchema = z.object({
  roomId: z.number().int().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
  bookingId: z.number().int().positive().optional().nullable(),
  status: z.enum(['available', 'booked']).optional(),
});

export const updateRoomAvailabilitySchema = z.object({
  roomId: z.number().int().positive().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }).optional(),
  bookingId: z.number().int().positive().optional().nullable(),
  status: z.enum(['available', 'booked']).optional(),
});