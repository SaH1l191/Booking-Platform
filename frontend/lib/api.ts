import axios from "axios";
import { toast } from "sonner";
import type { StoreApi } from "zustand";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Lazy import to avoid circular dependency — stores import api, api needs stores
let authStore: StoreApi<any> | null = null;
async function getAuthStore() {
  if (!authStore) {
    const mod = await import("@/stores");
    authStore = mod.useAuthStore;
  }
  return authStore;
}

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

async function clearAuth() {
  try {
    const store = await getAuthStore();
    store.setState({ user: null, tokens: null, isAuthenticated: false });
  } catch {
    localStorage.removeItem("auth-storage");
  }
  window.location.href = "/login";
}

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body) {
      response.data = "data" in body ? body.data : body;
    }
    return response;
  },
  async (error) => {
    if (!error || !error.config) {
      const msg = error?.message || "Network error. Check your connection.";
      toast.error(msg);
      return Promise.reject(new Error(msg));
    }
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.error || error.response?.data?.message || "";

    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/users/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${BASE_URL}/users/refresh`, null, {
          withCredentials: true,
        });

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        toast.error("Session expired. Please login again.");
        clearAuth();
        return Promise.reject(
          refreshError instanceof Error ? refreshError : new Error("Refresh failed")
        );
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403) {
      toast.error("You don't have permission for this action.");
    } else if (status === 404) {
      toast.error("Resource not found.");
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again later.");
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Request failed";

    return Promise.reject(new Error(errorMessage));
  }
);

export default api;