import type { OAuthStatePayload } from './types/oauth.types';

export function encodeOAuthState(payload: OAuthStatePayload) {
  if (!payload.redirectUrl) {
    return undefined;
  }

  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64');
}

export function decodeOAuthState(state?: string): OAuthStatePayload | undefined {
  if (!state) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8');
    return JSON.parse(decoded) as OAuthStatePayload;
  } catch (error) {
    return undefined;
  }
}
