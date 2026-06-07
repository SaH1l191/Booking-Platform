export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Booking {
  id: number;
  userId: number;
  hotelId: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  bookingAmount: number;
  status: BookingStatus;
  totalGuests: number;
  createdAt: string;
  updatedAt: string;
}

export type RoomType = "SINGLE" | "DOUBLE" | "FAMILY" | "DELUXE" | "SUITE";

export interface Hotel {
  id: number;
  name: string;
  address: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  rooms?: Room[];
  roomCategories?: RoomCategory[];
}

export interface Room {
  id: number;
  roomCategoryId: number | null;
  hotelId: number;
  roomNo: number;
  bookingId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomCategory {
  id: number;
  roomType: RoomType;
  price: number;
  hotelId: number;
  roomCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  hotelId: number;
  roomId: number;
  totalGuests: number;
  bookingAmount: number;
  checkIn: string;
  checkOut: string;
}
