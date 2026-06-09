import { create } from "zustand";
import api from "@/lib/api";
import type { Review } from "./types";

export interface ReviewsState {
  reviews: Review[];
  hotelReviews: Review[];
  averageRating: number;
  totalReviews: number;
  isLoading: boolean;
  error: string | null;

  fetchReviewsByHotelId: (hotelId: number) => Promise<void>;
  createReview: (payload: { user_id: number; booking_id: number; hotel_id: number; comment: string; rating: number }) => Promise<void>;
  clearReviews: () => void;
}

export const useReviewsStore = create<ReviewsState>()((set) => ({
  reviews: [],
  hotelReviews: [],
  averageRating: 0,
  totalReviews: 0,
  isLoading: false,
  error: null,

  fetchReviewsByHotelId: async (hotelId: number) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/api/v1/reviews/hotel`, { params: { hotel_id: hotelId } });
      const reviews = Array.isArray(data) ? data : [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / totalReviews
        : 0;
      set({ hotelReviews: reviews, averageRating: Math.round(averageRating * 10) / 10, totalReviews, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch reviews" });
    }
  },

  createReview: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/reviews/", payload);
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to create review" });
      throw err;
    }
  },

  clearReviews: () => set({ hotelReviews: [], averageRating: 0, totalReviews: 0 }),
}));
