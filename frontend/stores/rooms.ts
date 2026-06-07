import { create } from "zustand";
import api from "@/lib/api";
import type { Room } from "./types";

export interface CreateRoomPayload {
  roomNo: number;
  roomCategoryId: number;
  hotelId: number;
}

export interface RoomsState {
  rooms: Room[];
  selectedRoom: Room | null;
  isLoading: boolean;
  error: string | null;

  fetchRooms: () => Promise<void>;
  fetchRoomsByHotel: (hotelId: number) => Promise<void>;
  fetchRoomById: (id: number) => Promise<void>;
  createRoom: (payload: CreateRoomPayload) => Promise<Room>;
  updateRoom: (id: number, payload: Partial<CreateRoomPayload>) => Promise<void>;
  deleteRoom: (id: number) => Promise<void>;
  clearSelectedRoom: () => void;
  clearError: () => void;
}

export const useRoomsStore = create<RoomsState>()((set) => ({
  rooms: [],
  selectedRoom: null,
  isLoading: false,
  error: null,

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/v1/rooms/");
      set({ rooms: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch rooms" });
    }
  },

  fetchRoomsByHotel: async (hotelId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/api/v1/rooms/hotel/${hotelId}`);
      set({ rooms: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch rooms" });
    }
  },

  fetchRoomById: async (id) => {
    set({ isLoading: true, error: null, selectedRoom: null });
    try {
      const { data } = await api.get(`/api/v1/rooms/${id}`);
      set({ selectedRoom: data, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to fetch room" });
    }
  },

  createRoom: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/v1/rooms/", payload);
      set((state) => ({ rooms: [...state.rooms, data], isLoading: false }));
      return data;
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to create room" });
      throw err;
    }
  },

  updateRoom: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put(`/api/v1/rooms/${id}`, payload);
      set((state) => ({
        rooms: state.rooms.map((r) => (r.id === id ? data : r)),
        selectedRoom: state.selectedRoom?.id === id ? data : state.selectedRoom,
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to update room" });
      throw err;
    }
  },

  deleteRoom: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/rooms/${id}`);
      set((state) => ({
        rooms: state.rooms.filter((r) => r.id !== id),
        selectedRoom: state.selectedRoom?.id === id ? null : state.selectedRoom,
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to delete room" });
      throw err;
    }
  },

  clearSelectedRoom: () => set({ selectedRoom: null }),
  clearError: () => set({ error: null }),
}));
