export type ExternalAuthProvider = 'google' | 'github';

export interface OAuthProfile {
  provider: ExternalAuthProvider;
  providerId: string;
  email?: string;
  name?: string;
  surname?: string;
  avatarUrl?: string;
}

export interface OAuthStatePayload {
  redirectUrl?: string;
}
