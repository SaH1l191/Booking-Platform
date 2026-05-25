export type createRoomAvailabilityDto = {
  roomId: number;
  date: string; // ISO date string (YYYY-MM-DD)
  bookingId?: number | null;
  status?: 'available' | 'booked';
};