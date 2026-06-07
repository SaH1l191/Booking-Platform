import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import type { User } from "./types";

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: Number(payload.userId),
      username: payload.username || "",
      email: payload.email || "",
      createdAt: "",
      updatedAt: "",
    };
  } catch {
    return null;
  }
}

export interface AuthState {
  user: User | null;
  tokens: { accessToken: string; refreshToken: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signup: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post<AuthResponse>("/users/signup", { username, email, password });
          const user = data.user || decodeToken(data.accessToken);
          set({
            user,
            tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Signup failed";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post<AuthResponse>("/users/login", { email, password });
          const user = data.user || decodeToken(data.accessToken);
          set({
            user,
            tokens: { accessToken: data.accessToken, refreshToken: data.refreshToken },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.post("/users/logout");
        } catch {}
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
