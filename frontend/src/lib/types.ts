export interface ApiUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  status: string;
  data: {
    user: ApiUser;
    token: string;
  };
}

export interface RegisterPayload {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApiErrorShape {
  message?: string;
  error?: string;
  errors?: unknown;
  statusCode?: number;
}
