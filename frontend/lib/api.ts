import axios from "axios";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

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

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const auth = getAuthState();

      if (auth?.tokens?.refreshToken) {
        try {
          const { data } = await api.post("/users/refresh");
          const res = data.data || data;
          setAuthTokens(res.accessToken, res.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.accessToken}`;
          return api(originalRequest);
        } catch {
          toast.error("Session expired. Please login again.");
          clearAuth();
        }
      } else {
        clearAuth();
      }
    }

    if (status === 403) {
      toast.error("You don't have permission for this action.");
    } else if (status === 404) {
      toast.error("Resource not found.");
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again later.");
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Request failed";

    return Promise.reject(new Error(message));
  }
);

export default api;
