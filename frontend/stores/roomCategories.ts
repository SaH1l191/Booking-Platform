import { create } from "zustand";
import api from "@/lib/api";
import type { RoomCategory, RoomType } from "./types";

export interface CreateRoomCategoryPayload {
  roomType: RoomType;
  price: number;
  hotelId: number;
  roomCount: number;
}

export interface RoomCategoriesState {
  roomCategories: RoomCategory[];
  hotelRoomCategories: RoomCategory[];
  isLoading: boolean;
  error: string | null;

  fetchRoomCategories: () => Promise<void>;
  fetchRoomCategoriesByHotel: (hotelId: number) => Promise<void>;
  createRoomCategory: (payload: CreateRoomCategoryPayload) => Promise<RoomCategory>;
  updateRoomCategory: (id: number, payload: Partial<CreateRoomCategoryPayload>) => Promise<RoomCategory>;
  deleteRoomCategory: (id: number) => Promise<void>;
  clearError: () => void;
}

export const useRoomCategoriesStore = create<RoomCategoriesState>()((set, get) => ({
  roomCategories: [],
  hotelRoomCategories: [],
  isLoading: false,
  error: null,

  fetchRoomCategories: async () => {
    set({ error: null });
    try {
      const { data } = await api.get("/api/v1/roomCategories/");
      set({ roomCategories: Array.isArray(data) ? data : [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch room categories" });
    }
  },

  fetchRoomCategoriesByHotel: async (hotelId) => {
    set({ error: null });
    try {
      const { data } = await api.get("/api/v1/roomCategories/", { params: { hotelId } });
      set({ hotelRoomCategories: Array.isArray(data) ? data : [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch room categories" });
    }
  },

  createRoomCategory: async (payload) => {
    const { data } = await api.post("/api/v1/roomCategories/", payload);
    const cat = data as RoomCategory;
    set((state) => ({
      roomCategories: [...state.roomCategories, cat],
      hotelRoomCategories: [...state.hotelRoomCategories, cat],
    }));
    return cat;
  },

  updateRoomCategory: async (id, payload) => {
    const { data } = await api.put(`/api/v1/roomCategories/${id}`, payload);
    const updated = data as RoomCategory;
    set((state) => ({
      roomCategories: state.roomCategories.map((c) => (c.id === id ? updated : c)),
      hotelRoomCategories: state.hotelRoomCategories.map((c) => (c.id === id ? updated : c)),
    }));
    return updated;
  },

  deleteRoomCategory: async (id) => {
    await api.delete(`/api/v1/roomCategories/${id}`);
    set((state) => ({
      roomCategories: state.roomCategories.filter((c) => c.id !== id),
      hotelRoomCategories: state.hotelRoomCategories.filter((c) => c.id !== id),
    }));
  },

  clearError: () => set({ error: null }),
}));
