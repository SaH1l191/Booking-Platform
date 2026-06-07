import { create } from "zustand";
import api from "@/lib/api";
import type { Hotel, RoomCategory, RoomType } from "./types";

export interface HotelsState {
  hotels: Hotel[];
  selectedHotel: Hotel | null;
  roomCategories: RoomCategory[];
  searchQuery: string;
  selectedRoomType: RoomType | "ALL";
  isLoading: boolean;
  error: string | null;

  fetchHotels: () => Promise<void>;
  fetchHotelById: (id: number) => Promise<void>;
  fetchRoomCategories: (hotelId: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedRoomType: (type: RoomType | "ALL") => void;
  clearSelectedHotel: () => void;
  clearError: () => void;
}

export const useHotelsStore = create<HotelsState>()((set) => ({
  hotels: [],
  selectedHotel: null,
  roomCategories: [],
  searchQuery: "",
  selectedRoomType: "ALL",
  isLoading: false,
  error: null,

  fetchHotels: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/hotels/");
      console.log("data from hotelAPI",data)
      set({ hotels: data.hotels!, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch hotels" });
    }
  },

  fetchHotelById: async (id) => {
    set({ isLoading: true, error: null, selectedHotel: null });
    try {
      const { data } = await api.get(`/api/v1/hotels/${id}`);
      set({ selectedHotel: data, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch hotel" });
    }
  },

  fetchRoomCategories: async (hotelId) => {
    try {
      const { data } = await api.get("/api/v1/roomCategories/", { params: { hotelId } });
      set({ roomCategories: data });
    } catch {}
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedRoomType: (type) => set({ selectedRoomType: type }),
  clearSelectedHotel: () => set({ selectedHotel: null, roomCategories: [] }),
  clearError: () => set({ error: null }),
}));
