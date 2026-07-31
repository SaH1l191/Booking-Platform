import { create } from "zustand";
import api from "@/lib/api";
import type { Category } from "./types";

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  icon?: string;
}

export interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  fetchCategories: () => Promise<void>;
  createCategory: (payload: CreateCategoryPayload) => Promise<Category>;
  updateCategory: (id: number, payload: Partial<CreateCategoryPayload>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  clearError: () => void;
}

export const useCategoriesStore = create<CategoriesState>()((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/categories/");
      set({ categories: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch categories", isLoading: false });
    }
  },

  createCategory: async (payload) => {
    const { data } = await api.post("/api/v1/categories/", payload);
    const cat = data as Category;
    set((state) => ({ categories: [...state.categories, cat] }));
    return cat;
  },

  updateCategory: async (id, payload) => {
    const { data } = await api.put(`/api/v1/categories/${id}`, payload);
    const updated = data as Category;
    set((state) => ({ categories: state.categories.map((c) => (c.id === id ? updated : c)) }));
    return updated;
  },

  deleteCategory: async (id) => {
    await api.delete(`/api/v1/categories/${id}`);
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
  },

  clearError: () => set({ error: null }),
}));