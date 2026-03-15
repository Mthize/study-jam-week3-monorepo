import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import type { OAuthProfile } from '../types/oauth.types';

const FALLBACK_CALLBACK = 'http://localhost:3000/auth/github/callback';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GitHubStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID') ?? 'pending-github-client-id';
    const clientSecret =
      configService.get<string>('GITHUB_CLIENT_SECRET') ?? 'pending-github-client-secret';
    const callbackURL = configService.get<string>('GITHUB_CALLBACK_URL') ?? FALLBACK_CALLBACK;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email'],
      passReqToCallback: false,
    });

    if (!configService.get<string>('GITHUB_CLIENT_ID')) {
      this.logger.warn('GitHub OAuth is not configured. Set GITHUB_CLIENT_ID / SECRET / CALLBACK_URL.');
    }
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const primaryEmailEntry = profile.emails?.find((email) => (email as { primary?: boolean }).primary);
    const primaryEmail = primaryEmailEntry?.value ?? profile.emails?.[0]?.value;
    const displayName = profile.displayName ?? profile.username ?? '';
    const [firstName, ...rest] = displayName.split(' ').filter(Boolean);

    return {
      provider: 'github',
      providerId: profile.id,
      email: primaryEmail?.toLowerCase(),
      name: profile.name?.givenName ?? firstName ?? 'GitHub',
      surname: profile.name?.familyName ?? (rest.length > 0 ? rest.join(' ') : 'User'),
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
