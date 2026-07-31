import { create } from "zustand";
import api from "@/lib/api";
import type { Booking, BookingStatus, CreateBookingPayload } from "./types";

export interface BookingsState {
  bookings: Booking[];
  filterStatus: BookingStatus | "ALL";
  isLoading: boolean;
  error: string | null;

  fetchMyBookings: () => Promise<void>;
  fetchAllBookings: () => Promise<void>;
  createBooking: (payload: CreateBookingPayload) => Promise<Booking>;
  cancelBooking: (id: number) => Promise<void>;
  setFilterStatus: (status: BookingStatus | "ALL") => void;
}

export const useBookingsStore = create<BookingsState>()((set, get) => ({
  bookings: [],
  filterStatus: "ALL",
  isLoading: false,
  error: null,

  fetchMyBookings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/bookings/me");
      set({ bookings: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch bookings" });
    }
  },

  fetchAllBookings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/bookings");
      set({ bookings: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch all bookings" });
    }
  },

  createBooking: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/v1/bookings/", payload);
      const bookingId = data.bookingId || data.id;
      const userId = data.userId || 0;
      const newBooking: Booking = {
        id: bookingId,
        userId,
        hotelId: payload.hotelId,
        roomId: payload.roomId,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        // Server computes the real price from the room's category — this is
        // never the client's own estimate. `data.bookingAmount` is always
        // present in a real response; the payload doesn't carry this field
        // anymore at all (see CreateBookingPayload).
        bookingAmount: data.bookingAmount,
        status: "PENDING",
        totalGuests: payload.totalGuests,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({ bookings: [...state.bookings, newBooking], isLoading: false }));
      return newBooking;
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to create booking" });
      throw err;
    }
  },

  cancelBooking: async (id) => {
    const prev = get().bookings;
    set((state) => ({
      bookings: state.bookings.map((b) => b.id === id ? { ...b, status: "CANCELLED" as const } : b),
    }));
    try {
      await api.patch(`/api/v1/bookings/cancel/${id}`);
    } catch (err) {
      set({ bookings: prev, error: err instanceof Error ? err.message : "Failed to cancel booking" });
      throw err;
    }
  },

  setFilterStatus: (status) => set({ filterStatus: status }),
}));