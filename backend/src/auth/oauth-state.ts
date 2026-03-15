import { createHmac, timingSafeEqual } from 'node:crypto';
import type { OAuthStatePayload } from './types/oauth.types';

const STATE_SECRET = process.env.OAUTH_STATE_SECRET ?? process.env.JWT_SECRET ?? 'default-insecure-change-me';
const STATE_TTL_SECONDS = 600;

export interface SignedOAuthState {
  redirectUrl: string;
  nonce: string;
  expiresAt: number;
  signature: string;
}

function computeSignature(data: string): string {
  return createHmac('sha256', STATE_SECRET).update(data).digest('hex');
}

function createNonce(): string {
  return createHmac('sha256', STATE_SECRET)
    .update(`${Date.now()}-${Math.random().toString(36)}`)
    .digest('hex')
    .slice(0, 32);
}

export function generateOAuthNonce(): string {
  return createNonce();
}

export function encodeOAuthState(redirectUrl?: string, nonce?: string): string | undefined {
  if (!redirectUrl) {
    return undefined;
  }

  const validNonce = nonce ?? createNonce();
  const expiresAt = Date.now() + STATE_TTL_SECONDS * 1000;

  const payload: SignedOAuthState = {
    redirectUrl,
    nonce: validNonce,
    expiresAt,
    signature: '',
  };

  const payloadJson = JSON.stringify({
    redirectUrl: payload.redirectUrl,
    nonce: payload.nonce,
    expiresAt: payload.expiresAt,
  });

  payload.signature = computeSignature(payloadJson);

  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return encoded;
}

export function decodeOAuthState(state?: string): OAuthStatePayload | undefined {
  if (!state) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const payload: SignedOAuthState = JSON.parse(decoded);

    if (!payload.redirectUrl || !payload.nonce || !payload.expiresAt || !payload.signature) {
      return undefined;
    }

    if (payload.expiresAt < Date.now()) {
      return undefined;
    }

    const payloadJson = JSON.stringify({
      redirectUrl: payload.redirectUrl,
      nonce: payload.nonce,
      expiresAt: payload.expiresAt,
    });

    const expectedSignature = computeSignature(payloadJson);
    const signatureBuffer = Buffer.from(payload.signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return undefined;
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return undefined;
    }

    return {
      redirectUrl: payload.redirectUrl,
    };
  } catch (error) {
    return undefined;
  }
}

export function encodeOAuthStateWithNonce(redirectUrl: string, nonce: string): string {
  return encodeOAuthState(redirectUrl, nonce) ?? '';
}
