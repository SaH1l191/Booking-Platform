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
  selectedRoomCategory: RoomCategory | null;
  isLoading: boolean;
  error: string | null;

  fetchRoomCategories: () => Promise<void>;
  fetchRoomCategoriesByHotel: (hotelId: number) => Promise<void>;
  fetchRoomCategoryById: (id: number) => Promise<void>;
  createRoomCategory: (payload: CreateRoomCategoryPayload) => Promise<RoomCategory>;
  updateRoomCategory: (id: number, payload: Partial<CreateRoomCategoryPayload>) => Promise<void>;
  deleteRoomCategory: (id: number) => Promise<void>;
  clearSelectedRoomCategory: () => void;
  clearError: () => void;
}

export const useRoomCategoriesStore = create<RoomCategoriesState>()((set) => ({
  roomCategories: [],
  selectedRoomCategory: null,
  isLoading: false,
  error: null,

  fetchRoomCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/roomCategories/");
      set({ roomCategories: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch room categories" });
    }
  },

  fetchRoomCategoriesByHotel: async (hotelId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/roomCategories/", { params: { hotelId } });
      set({ roomCategories: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch room categories" });
    }
  },

  fetchRoomCategoryById: async (id) => {
    set({ isLoading: true, error: null, selectedRoomCategory: null });
    try {
      const { data } = await api.get(`/api/v1/roomCategories/${id}`);
      set({ selectedRoomCategory: data, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch room category" });
    }
  },

  createRoomCategory: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/v1/roomCategories/", payload);
      set((state) => ({ roomCategories: [...state.roomCategories, data], isLoading: false }));
      return data;
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to create room category" });
      throw err;
    }
  },

  updateRoomCategory: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put(`/api/v1/roomCategories/${id}`, payload);
      set((state) => ({
        roomCategories: state.roomCategories.map((rc) => (rc.id === id ? data : rc)),
        selectedRoomCategory: state.selectedRoomCategory?.id === id ? data : state.selectedRoomCategory,
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to update room category" });
      throw err;
    }
  },

  deleteRoomCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/roomCategories/${id}`);
      set((state) => ({
        roomCategories: state.roomCategories.filter((rc) => rc.id !== id),
        selectedRoomCategory: state.selectedRoomCategory?.id === id ? null : state.selectedRoomCategory,
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to delete room category" });
      throw err;
    }
  },

  clearSelectedRoomCategory: () => set({ selectedRoomCategory: null }),
  clearError: () => set({ error: null }),
}));
