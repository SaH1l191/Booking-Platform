import { create } from "zustand";
import api from "@/lib/api";
import type { Room } from "./types";

export interface RoomsState {
  rooms: Room[];
  isLoading: boolean;

  fetchRoomsByHotel: (hotelId: number) => Promise<void>;
}

export const useRoomsStore = create<RoomsState>()((set) => ({
  rooms: [],
  isLoading: false,

  fetchRoomsByHotel: async (hotelId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/api/v1/rooms/hotel/${hotelId}`);
      set({ rooms: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },
}));
