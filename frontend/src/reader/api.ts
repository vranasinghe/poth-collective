import axios from "axios";
import { API_BASE_URL } from "../api/apiConfig";
export const readerGet = async (
  path: string,
  params: Record<string, any> = {},
  token?: string,
) =>
  (
    await axios.get(`${API_BASE_URL}/api/${path}`, {
      params,
      timeout: 15000,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  ).data;
export const errorMessage = (e: any) =>
  e?.response?.data?.message ||
  (e?.code === "ECONNABORTED"
    ? "The request timed out. Please try again."
    : "We couldn’t connect. Check your connection and try again.");
