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

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function getAuthState() {
  try {
    const stored = localStorage.getItem("auth-storage");
    return stored ? JSON.parse(stored).state : null;
  } catch {
    return null;
  }
}

async function setAuthTokens(accessToken: string, refreshToken: string) {
  try {
    const store = await getAuthStore();
    store.setState({ tokens: { accessToken, refreshToken } });
  } catch {
    const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    stored.state = { ...stored.state, tokens: { accessToken, refreshToken } };
    localStorage.setItem("auth-storage", JSON.stringify(stored));
  }
}

async function clearAuth() {
  try {
    const store = await getAuthStore();
    store.setState({ user: null, tokens: null, isAuthenticated: false });
  } catch {
    localStorage.removeItem("auth-storage");
  }
  window.location.href = "/login";
}

api.interceptors.request.use((config) => {
  if (config.url?.includes("/users/refresh")) {
    return config;
  }

  const auth = getAuthState();
  if (auth?.tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.tokens.accessToken}`;
  }
  return config;
});

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
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const auth = getAuthState();
      if (!auth?.tokens?.refreshToken) {
        // No refresh token means there was never a session to begin with —
        // this is an anonymous visitor hitting an endpoint that returned
        // 401, not an expired session. Forcibly redirecting them to /login
        // is wrong here: it was previously firing on the home page just
        // from an anonymous category/hotel fetch. Let the request fail and
        // let the calling store decide how to degrade (empty list, etc.)
        // rather than hijacking navigation.
        isRefreshing = false;
        processQueue(new Error("No refresh token"), null);
        return Promise.reject(new Error(message || "Unauthorized"));
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/users/refresh`, null, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${auth.tokens.refreshToken}`,
          },
        });

        const res = data.data || data;
        if (!res.accessToken || !res.refreshToken) {
          throw new Error("Invalid refresh response: missing tokens");
        }

        await setAuthTokens(res.accessToken, res.refreshToken);
        processQueue(null, res.accessToken);

        originalRequest.headers.Authorization = `Bearer ${res.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
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