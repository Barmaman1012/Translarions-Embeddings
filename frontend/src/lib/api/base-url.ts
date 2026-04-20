const FALLBACK_API_BASE_URL = "http://localhost:8000";

export function getApiBaseUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

