const base = (
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function request<T>(
  path: string,
  token = "",
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event("leira:expired"));
    throw new ApiError(
      Array.isArray(result?.message)
        ? result.message.join(". ")
        : result?.message || "Something went wrong. Please try again.",
      response.status,
    );
  }
  return result?.data as T;
}
