import { create } from "zustand";
import api from "@/lib/api";
import type { Hotel, RoomCategory, RoomType, Category } from "./types";

export interface HotelsState {
  hotels: Hotel[];
  categories: Category[];
  selectedHotel: Hotel | null;
  roomCategories: RoomCategory[];
  searchQuery: string;
  selectedRoomType: RoomType | "ALL";
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;

  fetchHotels: (category?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchHotelById: (id: number) => Promise<void>;
  fetchRoomCategories: (hotelId: number) => Promise<void>;
  toggleLike: (hotelId: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedRoomType: (type: RoomType | "ALL") => void;
  setSelectedCategory: (category: string) => void;
  clearSelectedHotel: () => void;
  clearError: () => void;
}

export const useHotelsStore = create<HotelsState>()((set, get) => ({
  hotels: [],
  categories: [],
  selectedHotel: null,
  roomCategories: [],
  searchQuery: "",
  selectedRoomType: "ALL",
  selectedCategory: "",
  isLoading: false,
  error: null,

  fetchHotels: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string> = {};
      const activeCategory = category || get().selectedCategory;
      if (activeCategory) params.category = activeCategory;
      const { data } = await api.get("/api/v1/hotels/", { params });
      set({ hotels: data.hotels!, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch hotels" });
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await api.get("/api/v1/categories/");
      set({ categories: data });
    } catch {}
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

  toggleLike: async (hotelId: number) => {
    try {
      const { data } = await api.post(`/api/v1/likes/${hotelId}`);
      const { liked } = data;

      set((state) => ({
        hotels: state.hotels.map((h) =>
          h.id === hotelId
            ? { ...h, isLiked: liked, likeCount: liked ? h.likeCount + 1 : h.likeCount - 1 }
            : h
        ),
        selectedHotel:
          state.selectedHotel?.id === hotelId
            ? { ...state.selectedHotel, isLiked: liked, likeCount: liked ? state.selectedHotel.likeCount + 1 : state.selectedHotel.likeCount - 1 }
            : state.selectedHotel,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to toggle like" });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedRoomType: (type) => set({ selectedRoomType: type }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  clearSelectedHotel: () => set({ selectedHotel: null, roomCategories: [] }),
  clearError: () => set({ error: null }),
}));
