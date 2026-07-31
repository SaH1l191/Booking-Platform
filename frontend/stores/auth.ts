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
      roles: payload.roles || [],
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

  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      signup: async (username, email, password) => {
        set({ isLoading: true });
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
          set({ isLoading: false });
          throw err;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
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
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ user: null, tokens: null, isAuthenticated: false });
        await api.post("/users/logout");
      },
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
