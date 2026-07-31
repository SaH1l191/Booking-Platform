import { create } from "zustand";
import api from "@/lib/api";
import type { Hotel, Category, HotelsResponse } from "./types";

export interface HotelsState {
  hotels: Hotel[];
  categories: Category[];
  selectedHotel: Hotel | null;
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  minRating: number;
  minPrice: number | null;
  maxPrice: number | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  fetchHotels: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchHotelById: (id: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSortBy: (sortBy: string) => void;
  setMinRating: (rating: number) => void;
  setMinPrice: (price: number | null) => void;
  setMaxPrice: (price: number | null) => void;
  setCoordinates: (lat: number | null, lng: number | null, radius?: number) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  clearSelectedHotel: () => void;
  clearError: () => void;
}

export const useHotelsStore = create<HotelsState>()((set, get) => ({
  hotels: [],
  categories: [],
  selectedHotel: null,
  searchQuery: "",
  selectedCategory: "",
  sortBy: "-createdAt",
  minRating: 0,
  minPrice: null,
  maxPrice: null,
  latitude: null,
  longitude: null,
  radius: 10,
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
  isLoading: false,
  error: null,

  fetchHotels: async () => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      const params: Record<string, string> = {};
      if (state.searchQuery) params.search = state.searchQuery;
      if (state.selectedCategory) params.category = state.selectedCategory;
      if (state.sortBy) params.sortBy = state.sortBy;
      if (state.minRating > 0) params.minRating = String(state.minRating);
      if (state.minPrice != null) params.minPrice = String(state.minPrice);
      if (state.maxPrice != null) params.maxPrice = String(state.maxPrice);
      if (state.latitude != null && state.longitude != null) {
        params.latitude = String(state.latitude);
        params.longitude = String(state.longitude);
        params.radius = String(state.radius);
      }
      if (state.page > 1) params.page = String(state.page);
      if (state.limit !== 12) params.limit = String(state.limit);
      const { data } = await api.get("/api/v1/hotels/", { params });
      const res = data as HotelsResponse;
      set({
        hotels: res?.hotels || [],
        total: res?.total || 0,
        page: res?.page || 1,
        limit: res?.limit || 12,
        totalPages: res?.totalPages || 0,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch hotels" });
    }
  },

  fetchCategories: async () => {
    set({ error: null });
    try {
      const { data } = await api.get("/api/v1/categories/");
      set({ categories: data, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch categories" });
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

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSortBy: (sortBy) => set({ sortBy }),
  setMinRating: (rating) => set({ minRating: rating }),
  setMinPrice: (price) => set({ minPrice: price }),
  setMaxPrice: (price) => set({ maxPrice: price }),
  setCoordinates: (lat, lng, radius) => set({ latitude: lat, longitude: lng, radius: radius ?? 10 }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit }),
  clearSelectedHotel: () => set({ selectedHotel: null }),
  clearError: () => set({ error: null }),
}));
