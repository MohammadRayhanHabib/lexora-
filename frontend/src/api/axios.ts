import axios, { type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/** Drop JSON content-type for FormData so the browser sets multipart boundary. */
function stripJsonContentTypeForFormData(config: InternalAxiosRequestConfig) {
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;
  if (!isFormData || !config.headers) return;

  const headers = config.headers as Record<string, unknown> & {
    set?: (k: string, v: unknown) => void;
    delete?: (k: string) => void;
  };

  if (typeof headers.set === "function") {
    headers.set("Content-Type", undefined);
    headers.set("content-type", undefined);
  }
  delete headers["Content-Type"];
  delete headers["content-type"];
}

/* ── Request interceptor: attach token + fingerprint ── */
api.interceptors.request.use((config) => {
  stripJsonContentTypeForFormData(config);

  const token = localStorage.getItem("lexora_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const fingerprint = localStorage.getItem("lexora_fp");
  if (fingerprint) {
    config.headers["X-Device-Fingerprint"] = fingerprint;
  }
  return config;
});

/* ── Response interceptor: handle auth errors ───────── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("lexora_token");
      toast.error("Session expired. Please log in again.");
      window.location.href = "/login";
    } else if (status === 429) {
      toast.error("Too many requests. Please try again later.");
    }
    return Promise.reject(error);
  },
);

export default api;
