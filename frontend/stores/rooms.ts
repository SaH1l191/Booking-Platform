import { create } from "zustand";
import api from "@/lib/api";
import type { Room } from "./types";

export interface RoomsState {
  rooms: Room[];
  isLoading: boolean;
  error: string | null;

  fetchRoomsByHotel: (hotelId: number) => Promise<void>;
}

export const useRoomsStore = create<RoomsState>()((set) => ({
  rooms: [],
  isLoading: false,
  error: null,

  fetchRoomsByHotel: async (hotelId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/api/v1/rooms/hotel/${hotelId}`);
      set({ rooms: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch rooms" });
    }
  },
}));
