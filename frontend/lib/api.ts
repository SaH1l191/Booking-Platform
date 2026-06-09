import axios from "axios";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

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

function setAuthTokens(accessToken: string, refreshToken: string) {
  const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
  stored.state = { ...stored.state, tokens: { accessToken, refreshToken } };
  localStorage.setItem("auth-storage", JSON.stringify(stored));
}

function clearAuth() {
  localStorage.removeItem("auth-storage");
  window.location.href = "/login";
}

api.interceptors.request.use((config) => {
  const auth = getAuthState();
  if (auth?.tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.error || error.response?.data?.message || "";

    if (status === 401 && !originalRequest._retry) {
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
        isRefreshing = false;
        toast.error("Session expired. Please login again.");
        clearAuth();
        return Promise.reject(new Error(message || "No refresh token"));
      }

      try {
        const { data } = await api.get("/users/refresh");
        const res = data.data || data;
        setAuthTokens(res.accessToken, res.refreshToken);
        processQueue(null, res.accessToken);
        originalRequest.headers.Authorization = `Bearer ${res.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        toast.error("Session expired. Please login again.");
        clearAuth();
        return Promise.reject(new Error(message || "Refresh failed"));
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
