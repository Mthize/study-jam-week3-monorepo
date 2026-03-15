import type { AuthResponse, LoginPayload, RegisterPayload } from './types';

const DEFAULT_API_BASE = 'https://backend-305659654950.africa-south1.run.app';

const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = (envBase && envBase.trim())
  ? envBase.replace(/\/$/, '')
  : DEFAULT_API_BASE;

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
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
