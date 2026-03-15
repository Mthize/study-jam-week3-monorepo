import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import type { OAuthProfile } from '../types/oauth.types';

const FALLBACK_CALLBACK = 'http://localhost:3000/auth/google/callback';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') ?? 'pending-google-client-id';
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'pending-google-client-secret';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') ?? FALLBACK_CALLBACK;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
      passReqToCallback: false,
    });

    if (!configService.get<string>('GOOGLE_CLIENT_ID')) {
      this.logger.warn('Google OAuth is not configured. Set GOOGLE_CLIENT_ID / SECRET / CALLBACK_URL.');
    }
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const email = profile.emails?.[0]?.value;
    const givenName = profile.name?.givenName ?? profile.displayName?.split(' ')[0] ?? 'Google';
    const familyName = profile.name?.familyName ?? profile.displayName?.split(' ').slice(1).join(' ');

    return {
      provider: 'google',
      providerId: profile.id,
      email: email?.toLowerCase(),
      name: givenName ?? 'Google',
      surname: familyName && familyName.length > 0 ? familyName : 'User',
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
