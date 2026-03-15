import type {
  AuthResponse,
  LoginPayload,
  OAuthProvidersResponse,
  RegisterPayload,
} from './types';

const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const runtimeBase =
  typeof window !== 'undefined' ? window.__APP_CONFIG__?.API_BASE_URL : undefined;

function normalize(base?: string) {
  const trimmed = base?.trim();
  return trimmed ? trimmed.replace(/\/$/, '') : undefined;
}

const defaultBase = 'http://localhost:3000';

export const API_BASE_URL =
  normalize(envBase) ?? normalize(runtimeBase) ?? normalize(defaultBase);

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL or PUBLIC_API_BASE_URL.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = await parseResponse(response);
  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.message || 'Request failed';
    throw new Error(message);
  }
  return body as T;
}

export async function registerUser(payload: RegisterPayload) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exchangeOAuthCode(code: string) {
  return request<AuthResponse>('/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function fetchOAuthProviders() {
  return request<OAuthProvidersResponse>('/auth/providers', {
    method: 'GET',
  });
}
