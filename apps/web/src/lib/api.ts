export const TOKEN_KEY = "dms_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(TOKEN_KEY);
  if (saved) return saved;
  const legacy = sessionStorage.getItem(TOKEN_KEY);
  if (!legacy) return null;
  localStorage.setItem(TOKEN_KEY, legacy);
  sessionStorage.removeItem(TOKEN_KEY);
  return legacy;
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, ...request } = options;
  const headers = new Headers(request.headers);
  if (request.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth && !headers.has("Authorization")) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${path}`, {
    ...request,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new ApiError(data.message || "Request failed", response.status);
  }
  return data as T;
}
