import type { ConfigService } from '@nestjs/config';

export type OAuthProviderKey = 'google' | 'github';

interface ProviderDefinition {
  label: string;
  requiredKeys: string[];
}

const PROVIDERS: Record<OAuthProviderKey, ProviderDefinition> = {
  google: {
    label: 'Google',
    requiredKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'],
  },
  github: {
    label: 'GitHub',
    requiredKeys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'],
  },
};

export interface OAuthProviderStatus {
  provider: OAuthProviderKey;
  label: string;
  enabled: boolean;
  missingKeys: string[];
}

function readValue(value?: string | null): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getOAuthProviderStatus(
  configService: ConfigService,
  provider: OAuthProviderKey,
): OAuthProviderStatus {
  const definition = PROVIDERS[provider];
  const missingKeys = definition.requiredKeys.filter(
    (key) => !readValue(configService.get<string>(key)),
  );

  return {
    provider,
    label: definition.label,
    enabled: missingKeys.length === 0,
    missingKeys,
  };
}

export function getOAuthProviderStatuses(configService: ConfigService) {
  return {
    google: getOAuthProviderStatus(configService, 'google'),
    github: getOAuthProviderStatus(configService, 'github'),
  };
}

export function isOAuthProviderEnabled(
  configService: ConfigService,
  provider: OAuthProviderKey,
) {
  return getOAuthProviderStatus(configService, provider).enabled;
}
