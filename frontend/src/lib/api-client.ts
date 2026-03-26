/**
 * Cliente HTTP centralizado para SISPARDT.
 * En client-side: obtiene el token de la sesión NextAuth.
 * En server-side: recibe el token como parámetro.
 */

// Client-side: URL relativa → el browser apunta a su propio origen, Next.js rewrite lo proxea a Traefik.
// Server-side: directo a Traefik dentro de Docker (no depende de APP_HOST).
const BASE_URL = typeof window !== "undefined" ? "" : "http://traefik:80";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(
      (body.message as string) ?? (body.error as string) ?? "Error del servidor"
    );
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }
    throw new ApiError(response.status, body);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestBlob(
  path: string,
  token?: string
): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { method: "GET", headers });

  if (!response.ok) {
    throw new ApiError(response.status, { error: response.statusText });
  }
  return response.blob();
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  getBlob: (path: string, token?: string) =>
    requestBlob(path, token),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),

  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      token,
    }),

  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE", token }),
};
