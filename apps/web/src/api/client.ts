import type { ApiError, ApiResponse } from "@local-crm/shared";

const API_BASE = "http://localhost:4000";

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      },
      ...options
    }
  );

  if (!response.ok) {
    const errorBody = (await response.json()) as ApiError;
    throw new Error(errorBody.error ?? "Request failed");
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}
