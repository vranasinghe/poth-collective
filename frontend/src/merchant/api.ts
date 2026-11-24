import axios from "axios";
import { Platform } from "react-native";
import { API_BASE_URL } from "../api/apiConfig";
export { readerGet as merchantGet, errorMessage } from "../reader/api";
export async function merchantUpload(
  path: string,
  method: "POST" | "PUT",
  body: FormData,
  token: string,
  progress?: (percent: number) => void,
) {
  const url = `${API_BASE_URL}/api/${path}`;
  if (Platform.OS === "web") {
    const result = await axios.request({
      url,
      method,
      data: body,
      timeout: 60000,
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: (event) => {
        if (event.total && progress)
          progress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return result.data;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body,
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw { response: { status: response.status, data } };
    return data;
  } finally {
    clearTimeout(timer);
  }
}
