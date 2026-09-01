// Cliente HTTP para llamadas AUTENTICADAS desde componentes de cliente
// (carrito, checkout). Distinto de lib/api.ts (que corre en el servidor
// para SSR de catálogo público, sin token): este siempre corre en el
// navegador y siempre manda el ID token de Firebase.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiClientError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; idToken: string | null }): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.idToken ? { Authorization: `Bearer ${options.idToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(res.status, payload.error ?? 'Error en la solicitud', payload.details);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, idToken: string | null) => request<T>(path, { idToken }),
  post: <T>(path: string, body: unknown, idToken: string | null) => request<T>(path, { method: 'POST', body, idToken }),
  patch: <T>(path: string, body: unknown, idToken: string | null) => request<T>(path, { method: 'PATCH', body, idToken }),
};
