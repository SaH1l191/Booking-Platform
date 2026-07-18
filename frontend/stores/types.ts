export type UserRole = "customer" | "hotel_manager" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  roles: UserRole[];
  avatar?: string;
  bio?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

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

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HotelImage {
  id: number;
  hotelId: number;
  url: string;
  altText: string | null;
  displayOrder: number;
  createdAt: string;
}

export interface Hotel {
  id: number;
  name: string;
  address: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  ratingCount: number;
  amenities: string[];
  distance?: number | null;
  categories: Category[];
  images: HotelImage[];
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
  idempotencyKey?: string;
}

export interface Review {
  id: number;
  user_id: number;
  booking_id: number;
  hotel_id: number;
  comment: string;
  rating: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_synced: boolean;
}
