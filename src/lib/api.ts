const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "kareon:token";
const TENANT_KEY = "kareon:activeTenantId";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Clínica ativa (tenant) — isola agenda e dados no backend */
export function getActiveClinicId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const clinicId = getActiveClinicId();
  if (clinicId) headers["X-Clinic-Id"] = clinicId;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      data.error || res.statusText || "Erro na requisição",
      res.status,
      data.code
    );
  }
  return data as T;
}

export const setupApi = {
  status: () => api<{ configured: boolean }>("/setup/status"),
  test: (body: Record<string, unknown>) =>
    api<{ ok: boolean }>("/setup/test", { method: "POST", json: body }),
  configure: (body: Record<string, unknown>) =>
    api<{ ok: boolean; adminEmail: string; defaultPasswordHint: string | null }>(
      "/setup/configure",
      { method: "POST", json: body }
    ),
};

export const authApi = {
  login: (email: string, password: string) =>
    api<{
      token: string;
      user: { id: string; email: string };
      profile: any;
      gestorClinicIds: string[];
    }>("/auth/login", { method: "POST", json: { email, password } }),
  register: (email: string, password: string, nome: string, telefone?: string) =>
    api<{
      token: string;
      user: { id: string; email: string };
      profile: any;
      gestorClinicIds: string[];
    }>("/auth/register", {
      method: "POST",
      json: { email, password, nome, telefone },
    }),
  me: () =>
    api<{ user: any; profile: any; gestorClinicIds: string[] }>("/auth/me"),
  changePassword: (currentPassword: string | null, newPassword: string) =>
    api("/auth/change-password", {
      method: "POST",
      json: { currentPassword, newPassword },
    }),
  verifyPassword: (password: string) =>
    api("/auth/verify-password", { method: "POST", json: { password } }),
};
