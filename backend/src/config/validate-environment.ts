type ProviderConfig = {
  label: string;
  keys: string[];
};

const providerConfigs: ProviderConfig[] = [
  {
    label: 'Google OAuth',
    keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'],
  },
  {
    label: 'GitHub OAuth',
    keys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'],
  },
];

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateEnvironment(env: NodeJS.ProcessEnv): string[] {
  const missing: string[] = [];

  if (!hasValue(env.JWT_SECRET)) {
    missing.push('JWT_SECRET');
  }

  if (!hasValue(env.FRONTEND_URL)) {
    missing.push('FRONTEND_URL');
  }

  if (!hasValue(env.OAUTH_STATE_SECRET) && !hasValue(env.JWT_SECRET)) {
    missing.push('OAUTH_STATE_SECRET');
  }

  for (const provider of providerConfigs) {
    const configured = provider.keys.every((key) => hasValue(env[key]));
    const partiallyConfigured = provider.keys.some((key) => hasValue(env[key]));

    if (partiallyConfigured && !configured) {
      const missingKeys = provider.keys.filter((key) => !hasValue(env[key]));
      missing.push(...missingKeys);
    }
  }

  return Array.from(new Set(missing));
}

export function isProviderConfigured(
  env: NodeJS.ProcessEnv,
  provider: 'google' | 'github',
): boolean {
  const config =
    provider === 'google'
      ? ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL']
      : ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'];

  return config.every((key) => hasValue(env[key]));
}
