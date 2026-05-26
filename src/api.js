import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000",
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
